import { supabase } from './supabase';
import type { ProjectProposal, Profile } from '../types/nhs';
import { createInAppNotification, createBulkInAppNotifications } from './notificationService';
import { generateProjectEmailTemplate, sendProjectEmail } from './emailService';

/**
 * Dispatches notifications and emails when a project proposal is submitted for Stage 1 Leadership Review
 */
export async function notifyProjectSubmitted(
  project: {
    id: string;
    project_title: string;
    creator_id: string;
    creator_name: string;
    creator_email: string;
    co_leader_emails?: string[];
    advisor_name?: string | null;
    event_date?: string | null;
    location?: string | null;
    volunteers_needed?: number;
  }
): Promise<{ success: boolean; emailSent: boolean; reviewersNotified: number; gmailComposeUrl?: string }> {
  try {
    // 1. Fetch active Leadership profiles for in-app bell notifications
    const { data: leadershipMembers } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'leadership')
      .eq('is_restricted', false);

    const leaderList = leadershipMembers || [];

    // 2. In-App Notifications for Chapter Leadership officers
    const reviewerNotifications = leaderList.map(r => ({
      userId: r.id,
      projectId: project.id,
      type: 'project_submitted' as const,
      title: 'New Project Proposal for Review',
      message: `"${project.project_title}" was submitted by ${project.creator_name} and is waiting for Stage 1 Leadership Review.`,
      linkTab: 'review',
    }));

    // In-App Notification for Creator
    const creatorNotification = {
      userId: project.creator_id,
      projectId: project.id,
      type: 'project_submitted' as const,
      title: 'Proposal Submitted for Review',
      message: `Your project "${project.project_title}" has been submitted for Stage 1 Leadership Review.`,
      linkTab: 'projects',
    };

    await createBulkInAppNotifications([...reviewerNotifications, creatorNotification]);

    // 3. In-App Notification for Co-Leaders (if any)
    if (project.co_leader_emails && project.co_leader_emails.length > 0) {
      const { data: coLeaderProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('email', project.co_leader_emails);

      if (coLeaderProfiles && coLeaderProfiles.length > 0) {
        const coLeaderNotifications = coLeaderProfiles.map(cl => ({
          userId: cl.id,
          projectId: project.id,
          type: 'project_submitted' as const,
          title: 'Co-Led Project Submitted',
          message: `Project "${project.project_title}" has been submitted by ${project.creator_name} for Stage 1 Leadership Review.`,
          linkTab: 'projects',
        }));
        await createBulkInAppNotifications(coLeaderNotifications);
      }
    }

    // 4. Automated Email EXCLUSIVELY to nhs@cas.ac.ma
    const leadershipEmailContent = generateProjectEmailTemplate({
      type: 'project_submitted',
      projectTitle: project.project_title,
      creatorName: project.creator_name,
      creatorEmail: project.creator_email,
      coLeaderEmails: project.co_leader_emails,
      eventDate: project.event_date,
      location: project.location,
      volunteersNeeded: project.volunteers_needed,
      recipientName: 'CAS NHS Chapter Leadership',
      isReviewerNotification: true,
    });

    const sendRes = await sendProjectEmail({
      recipient: { email: 'nhs@cas.ac.ma', name: 'CAS NHS Chapter Leadership' },
      type: 'project_submitted',
      projectId: project.id,
      projectTitle: project.project_title,
      subject: leadershipEmailContent.subject,
      htmlBody: leadershipEmailContent.htmlBody,
      plainTextBody: leadershipEmailContent.plainText,
    });

    // 5. Automated Confirmation Email to Creator
    const creatorEmailContent = generateProjectEmailTemplate({
      type: 'project_submitted',
      projectTitle: project.project_title,
      creatorName: project.creator_name,
      creatorEmail: project.creator_email,
      coLeaderEmails: project.co_leader_emails,
      eventDate: project.event_date,
      location: project.location,
      volunteersNeeded: project.volunteers_needed,
      recipientName: project.creator_name,
      isReviewerNotification: false,
    });

    await sendProjectEmail({
      recipient: { email: project.creator_email, name: project.creator_name },
      type: 'project_submitted',
      projectId: project.id,
      projectTitle: project.project_title,
      subject: creatorEmailContent.subject,
      htmlBody: creatorEmailContent.htmlBody,
      plainTextBody: creatorEmailContent.plainText,
    });

    return {
      success: true,
      emailSent: sendRes.success,
      reviewersNotified: 1,
      gmailComposeUrl: sendRes.gmailComposeUrl,
    };
  } catch (err) {
    console.error('Error in notifyProjectSubmitted:', err);
    return { success: false, emailSent: false, reviewersNotified: 0 };
  }
}

/**
 * Dispatches notifications and emails when Stage 1 Leadership review decision is recorded
 */
export async function notifyStage1Decision(
  project: ProjectProposal,
  decision: 'approved' | 'rejected',
  reviewer: Profile,
  notes?: string
): Promise<{ success: boolean; supervisorEmailSent: boolean; gmailUrl?: string }> {
  try {
    const isApproved = decision === 'approved';
    const type: 'stage1_approved' | 'project_rejected' = isApproved ? 'stage1_approved' : 'project_rejected';

    // 1. In-App Notification to Creator
    await createInAppNotification({
      userId: project.creator_id,
      projectId: project.id,
      type,
      title: isApproved ? 'Stage 1 Leadership Approved' : 'Revisions Requested (Stage 1)',
      message: isApproved
        ? `"${project.project_title}" passed Stage 1 Leadership Review and is now pending Faculty Supervisor sign-off.`
        : `Revisions requested for "${project.project_title}": ${notes || 'See review notes in chapter portal.'}`,
      linkTab: 'projects',
    });

    // 2. In-App Notifications for Co-Leaders
    if (project.co_leader_emails && project.co_leader_emails.length > 0) {
      const { data: coLeaderProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', project.co_leader_emails);

      if (coLeaderProfiles && coLeaderProfiles.length > 0) {
        const coLeaderNotifications = coLeaderProfiles.map(cl => ({
          userId: cl.id,
          projectId: project.id,
          type,
          title: isApproved ? 'Stage 1 Leadership Approved' : 'Revisions Requested (Stage 1)',
          message: isApproved
            ? `"${project.project_title}" passed Stage 1 Leadership Review and is now pending Faculty Supervisor sign-off.`
            : `Revisions requested for "${project.project_title}": ${notes || 'See review notes in chapter portal.'}`,
          linkTab: 'projects',
        }));
        await createBulkInAppNotifications(coLeaderNotifications);
      }
    }

    let supervisorGmailUrl: string | undefined;
    let supervisorEmailSent = false;

    // 3. If Approved, notify Faculty Supervisor for Stage 2
    if (isApproved) {
      const { data: supervisors } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'supervisor')
        .eq('is_restricted', false);

      const supervisorList = (supervisors && supervisors.length > 0)
        ? supervisors
        : [{ id: 'supervisor-fallback', email: 'lhayes@cas.ac.ma', full_name: 'Laura Hayes' }];

      const supervisorNotifications = supervisorList.map(s => ({
        userId: s.id,
        projectId: project.id,
        type: 'stage1_approved' as const,
        title: 'Stage 2 Authorization Required',
        message: `"${project.project_title}" was approved by Leadership and awaits your Stage 2 final authorization.`,
        linkTab: 'review',
      }));
      await createBulkInAppNotifications(supervisorNotifications);

      // Send email to supervisor
      for (const sup of supervisorList) {
        const supEmail = generateProjectEmailTemplate({
          type: 'stage1_approved',
          projectTitle: project.project_title,
          creatorName: project.creator_name,
          creatorEmail: project.creator_email,
          coLeaderEmails: project.co_leader_emails,
          eventDate: project.event_date,
          location: project.location,
          volunteersNeeded: project.volunteers_needed,
          reviewerName: reviewer.full_name,
          reviewerRole: 'Chapter Leadership',
          reviewerNotes: notes,
          recipientName: sup.full_name || 'Faculty Advisor',
          isReviewerNotification: true,
        });

        const supSendRes = await sendProjectEmail({
          recipient: { email: sup.email, name: sup.full_name },
          type: 'stage1_approved',
          projectId: project.id,
          projectTitle: project.project_title,
          subject: supEmail.subject,
          htmlBody: supEmail.htmlBody,
          plainTextBody: supEmail.plainText,
        });

        if (supSendRes.success) {
          supervisorEmailSent = true;
        }

        if (supSendRes.gmailComposeUrl) {
          supervisorGmailUrl = supSendRes.gmailComposeUrl;
        }
      }
    }

    // 4. Send Email to Creator
    const creatorEmail = generateProjectEmailTemplate({
      type,
      projectTitle: project.project_title,
      creatorName: project.creator_name,
      creatorEmail: project.creator_email,
      coLeaderEmails: project.co_leader_emails,
      eventDate: project.event_date,
      location: project.location,
      volunteersNeeded: project.volunteers_needed,
      reviewerName: reviewer.full_name,
      reviewerRole: 'Chapter Leadership',
      reviewerNotes: notes,
      recipientName: project.creator_name,
      isReviewerNotification: false,
    });

    const sendRes = await sendProjectEmail({
      recipient: { email: project.creator_email, name: project.creator_name },
      type,
      projectId: project.id,
      projectTitle: project.project_title,
      subject: creatorEmail.subject,
      htmlBody: creatorEmail.htmlBody,
      plainTextBody: creatorEmail.plainText,
    });

    // Also send to co-leaders
    if (project.co_leader_emails) {
      for (const clEmail of project.co_leader_emails) {
        await sendProjectEmail({
          recipient: { email: clEmail },
          type,
          projectId: project.id,
          projectTitle: project.project_title,
          subject: creatorEmail.subject,
          htmlBody: creatorEmail.htmlBody,
          plainTextBody: creatorEmail.plainText,
        });
      }
    }

    return {
      success: true,
      supervisorEmailSent,
      gmailUrl: supervisorGmailUrl || sendRes.gmailComposeUrl,
    };
  } catch (err) {
    console.error('Error in notifyStage1Decision:', err);
    return { success: false, supervisorEmailSent: false };
  }
}

/**
 * Dispatches notifications and emails when Stage 2 Faculty Supervisor decision is recorded
 */
export async function notifyStage2Decision(
  project: ProjectProposal,
  decision: 'approved' | 'rejected',
  supervisor: Profile,
  notes?: string
): Promise<{ success: boolean; gmailUrl?: string }> {
  try {
    const isApproved = decision === 'approved';
    const type: 'stage2_approved' | 'project_rejected' = isApproved ? 'stage2_approved' : 'project_rejected';

    // 1. In-App Notification to Creator
    await createInAppNotification({
      userId: project.creator_id,
      projectId: project.id,
      type,
      title: isApproved ? '🎉 Project Officially Approved!' : 'Notice: Proposal Not Approved',
      message: isApproved
        ? `"${project.project_title}" has received final authorization from Faculty Supervisor ${supervisor.full_name}. You may now recruit volunteers!`
        : `Faculty Supervisor review for "${project.project_title}": ${notes || 'See review notes on chapter portal.'}`,
      linkTab: 'projects',
    });

    // 2. In-App Notifications for Co-Leaders
    if (project.co_leader_emails && project.co_leader_emails.length > 0) {
      const { data: coLeaderProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', project.co_leader_emails);

      if (coLeaderProfiles && coLeaderProfiles.length > 0) {
        const coLeaderNotifications = coLeaderProfiles.map(cl => ({
          userId: cl.id,
          projectId: project.id,
          type,
          title: isApproved ? '🎉 Project Officially Approved!' : 'Notice: Proposal Not Approved',
          message: isApproved
            ? `"${project.project_title}" has received final authorization from Faculty Supervisor ${supervisor.full_name}. You may now recruit volunteers!`
            : `Faculty Supervisor review for "${project.project_title}": ${notes || 'See review notes on chapter portal.'}`,
          linkTab: 'projects',
        }));
        await createBulkInAppNotifications(coLeaderNotifications);
      }
    }

    // 3. Send Email to Creator
    const creatorEmail = generateProjectEmailTemplate({
      type,
      projectTitle: project.project_title,
      creatorName: project.creator_name,
      creatorEmail: project.creator_email,
      coLeaderEmails: project.co_leader_emails,
      eventDate: project.event_date,
      location: project.location,
      volunteersNeeded: project.volunteers_needed,
      reviewerName: supervisor.full_name,
      reviewerRole: 'Faculty Advisor',
      reviewerNotes: notes,
      recipientName: project.creator_name,
      isReviewerNotification: false,
    });

    const sendRes = await sendProjectEmail({
      recipient: { email: project.creator_email, name: project.creator_name },
      type,
      projectId: project.id,
      projectTitle: project.project_title,
      subject: creatorEmail.subject,
      htmlBody: creatorEmail.htmlBody,
      plainTextBody: creatorEmail.plainText,
    });

    // Also send to co-leaders
    if (project.co_leader_emails) {
      for (const clEmail of project.co_leader_emails) {
        await sendProjectEmail({
          recipient: { email: clEmail },
          type,
          projectId: project.id,
          projectTitle: project.project_title,
          subject: creatorEmail.subject,
          htmlBody: creatorEmail.htmlBody,
          plainTextBody: creatorEmail.plainText,
        });
      }
    }

    return { success: true, gmailUrl: sendRes.gmailComposeUrl };
  } catch (err) {
    console.error('Error in notifyStage2Decision:', err);
    return { success: false };
  }
}
