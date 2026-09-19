import { supabase } from './supabase';
import type { NotificationType, EmailStatus, UserRole } from '../types/nhs';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface ProjectEmailContentParams {
  type: NotificationType;
  projectTitle: string;
  creatorName: string;
  creatorEmail: string;
  coLeaderEmails?: string[];
  eventDate?: string | null;
  location?: string | null;
  volunteersNeeded?: number;
  reviewerName?: string;
  reviewerRole?: string;
  reviewerNotes?: string | null;
  portalUrl?: string;
}

export interface SendProjectEmailParams {
  recipient: EmailRecipient;
  type: NotificationType;
  projectId?: string | null;
  projectTitle: string;
  subject: string;
  htmlBody: string;
  plainTextBody: string;
}

/**
 * Builds a direct 1-click Gmail Compose link with pre-filled To, Subject, and Body
 */
export function createGmailComposeUrl(to: string, subject: string, bodyText: string): string {
  const cleanTo = encodeURIComponent(to);
  const cleanSubject = encodeURIComponent(subject);
  const cleanBody = encodeURIComponent(bodyText);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${cleanTo}&su=${cleanSubject}&body=${cleanBody}`;
}

/**
 * Generates an official CAS NHS branded HTML email
 */
export function generateProjectEmailTemplate(params: ProjectEmailContentParams & { recipientName: string; isReviewerNotification?: boolean }): {
  subject: string;
  htmlBody: string;
  plainText: string;
} {
  const portalUrl = params.portalUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://nhs.cas.ac.ma');
  const reviewLink = `${portalUrl}/review`;
  const projectsLink = `${portalUrl}/projects`;

  let subject = '';
  let headline = '';
  let badgeColor = '#0A1E3F';
  let badgeBg = '#EFF6FF';
  let badgeText = '';
  let primaryMessage = '';
  let nextStepsText = '';
  let ctaLink = projectsLink;
  let ctaText = 'Open Chapter Portal';

  switch (params.type) {
    case 'project_submitted':
      if (params.isReviewerNotification) {
        subject = `[CAS NHS Review Request] New Project Proposal: "${params.projectTitle}"`;
        headline = 'New Project Proposal Submitted for Review';
        badgeColor = '#92400E';
        badgeBg = '#FEF3C7';
        badgeText = 'STAGE 1 REVIEW REQUIRED';
        primaryMessage = `A new chapter service project titled <strong>"${params.projectTitle}"</strong> was submitted by <strong>${params.creatorName}</strong> (${params.creatorEmail}) and is awaiting Stage 1 Leadership Review.`;
        nextStepsText = 'Please open the Two-Stage Review Desk on the portal to inspect project objectives, verify feasibility, and cast your leadership recommendation.';
        ctaLink = reviewLink;
        ctaText = 'Review Project Proposal';
      } else {
        subject = `[CAS NHS] Proposal Received: "${params.projectTitle}"`;
        headline = 'Your Project Proposal Has Been Submitted';
        badgeColor = '#0A1E3F';
        badgeBg = '#EFF6FF';
        badgeText = 'PENDING LEADERSHIP REVIEW';
        primaryMessage = `Your chapter project proposal <strong>"${params.projectTitle}"</strong> has been successfully received by the Casablanca American School NHS Chapter.`;
        nextStepsText = 'Your proposal is currently undergoing Stage 1 Leadership Review. You will receive an automated notification as soon as a review decision is recorded.';
        ctaLink = projectsLink;
        ctaText = 'View Project Status';
      }
      break;

    case 'stage1_approved':
      if (params.isReviewerNotification) {
        subject = `[CAS NHS Supervisor Action Required] Stage 2 Sign-off: "${params.projectTitle}"`;
        headline = 'Stage 2 Supervisor Authorization Required';
        badgeColor = '#0A1E3F';
        badgeBg = '#EFF6FF';
        badgeText = 'FACULTY SUPERVISOR SIGN-OFF';
        primaryMessage = `Project proposal <strong>"${params.projectTitle}"</strong> (led by ${params.creatorName}) has passed Stage 1 Leadership Review and requires your final Faculty Council authorization.`;
        nextStepsText = 'Please review the project details, logistics, and any leadership comments on the Two-Stage Review Desk.';
        ctaLink = reviewLink;
        ctaText = 'Authorize Project (Stage 2)';
      } else {
        subject = `[CAS NHS Update] Stage 1 Approved: "${params.projectTitle}"`;
        headline = 'Stage 1 Leadership Review Approved';
        badgeColor = '#065F46';
        badgeBg = '#ECFDF5';
        badgeText = 'STAGE 1 APPROVED';
        primaryMessage = `Great news! Chapter Leadership has reviewed and approved <strong>"${params.projectTitle}"</strong>.`;
        nextStepsText = 'The proposal has now advanced to Stage 2 for final authorization by the Faculty Supervisor. You will be notified when final sign-off is complete.';
        ctaLink = projectsLink;
        ctaText = 'View Proposal Progress';
      }
      break;

    case 'stage2_approved':
      if (params.isReviewerNotification) {
        subject = `[CAS NHS Administrator Review Required] Stage 3 Final Sign-off: "${params.projectTitle}"`;
        headline = 'Stage 3 Administrator Final Review Required';
        badgeColor = '#4338CA';
        badgeBg = '#EEF2FF';
        badgeText = 'ADMINISTRATIVE FINAL CHECK';
        primaryMessage = `Project proposal <strong>"${params.projectTitle}"</strong> (led by ${params.creatorName}) has passed Faculty Supervisor review and is now awaiting your final Level 3 Administrative authorization.`;
        nextStepsText = 'Please open the Chapter Review Desk to inspect proposal details, confirm compliance, and issue the final chapter approval.';
        ctaLink = reviewLink;
        ctaText = 'Perform Final Review (Stage 3)';
      } else {
        subject = `[CAS NHS Update] Supervisor Approved • Advanced to Stage 3: "${params.projectTitle}"`;
        headline = 'Faculty Supervisor Has Approved Your Proposal';
        badgeColor = '#0284C7';
        badgeBg = '#E0F2FE';
        badgeText = 'STAGE 2 APPROVED • PENDING STAGE 3';
        primaryMessage = `Great news! Chapter Faculty Supervisor <strong>${params.reviewerName || 'Laura Hayes'}</strong> has reviewed and approved <strong>"${params.projectTitle}"</strong>.`;
        nextStepsText = 'The proposal has now reached Stage 3 for final check by the Chapter Administrator. You may continue refining your proposal until final administrator approval is recorded.';
        ctaLink = projectsLink;
        ctaText = 'View Proposal Progress';
      }
      break;

    case 'stage3_approved':
      subject = `🎉 [CAS NHS] Project Officially Approved: "${params.projectTitle}"`;
      headline = 'Your Project Is Officially Approved!';
      badgeColor = '#065F46';
      badgeBg = '#ECFDF5';
      badgeText = 'OFFICIALLY APPROVED (STAGE 3)';
      primaryMessage = `Congratulations! <strong>"${params.projectTitle}"</strong> has received final authorization from Chapter Administrator <strong>${params.reviewerName || 'Administrator'}</strong>.`;
      nextStepsText = 'Your project is now officially registered on the CAS NHS Project Hub and locked for execution. You may begin recruiting chapter volunteers and proceed with preparations.';
      ctaLink = projectsLink;
      ctaText = 'Manage Project & Volunteers';
      break;

    case 'project_rejected':
      subject = `[CAS NHS Notice] Action Required on Proposal: "${params.projectTitle}"`;
      headline = 'Revisions Requested for Project Proposal';
      badgeColor = '#991B1B';
      badgeBg = '#FEF2F2';
      badgeText = 'REVISION REQUIRED';
      primaryMessage = `A review decision was recorded for <strong>"${params.projectTitle}"</strong> by <strong>${params.reviewerName || 'Reviewer'} (${params.reviewerRole || 'Reviewer'})</strong> indicating that adjustments or additional details are needed before it can proceed.`;
      nextStepsText = 'Please review the feedback notes below, update your proposal accordingly on the portal, and resubmit for chapter review.';
      ctaLink = projectsLink;
      ctaText = 'Edit & Resubmit Proposal';
      break;

    default:
      subject = `[CAS NHS Notification] Update on "${params.projectTitle}"`;
      headline = 'CAS NHS Project Notification';
      badgeText = 'PORTAL NOTIFICATION';
      primaryMessage = `There is an update regarding chapter project <strong>"${params.projectTitle}"</strong>.`;
      nextStepsText = 'Please sign in to the Casablanca American School NHS Portal for details.';
      break;
  }

  const notesHtml = params.reviewerNotes
    ? `
    <div style="margin: 20px 0; padding: 14px 18px; background-color: #F8FAFC; border-left: 4px solid var(--color-gold, #C59B27); border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; margin-bottom: 6px;">
        Reviewer Feedback & Notes (${params.reviewerRole || 'Reviewer'}):
      </div>
      <div style="font-size: 14px; color: #1E293B; line-height: 1.5; font-style: italic;">
        "${params.reviewerNotes}"
      </div>
    </div>
    `
    : '';

  const detailsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B; width: 35%;">Project Title</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #0A1E3F;">${params.projectTitle}</td>
      </tr>
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Project Leader</td>
        <td style="padding: 10px 14px; color: #1E293B;">${params.creatorName} (${params.creatorEmail})</td>
      </tr>
      ${params.coLeaderEmails && params.coLeaderEmails.length > 0 ? `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Co-Leaders</td>
        <td style="padding: 10px 14px; color: #1E293B;">${params.coLeaderEmails.join(', ')}</td>
      </tr>` : ''}
      ${params.eventDate ? `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Event Date</td>
        <td style="padding: 10px 14px; color: #1E293B;">${params.eventDate}</td>
      </tr>` : ''}
      ${params.location ? `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Location</td>
        <td style="padding: 10px 14px; color: #1E293B;">${params.location}</td>
      </tr>` : ''}
      ${params.volunteersNeeded ? `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #64748B;">Volunteers Needed</td>
        <td style="padding: 10px 14px; color: #1E293B;">${params.volunteersNeeded} chapter member(s)</td>
      </tr>` : ''}
    </table>
  `;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0A1E3F; padding: 24px 30px; text-align: left; border-bottom: 3px solid #C59B27;">
              <div style="color: #C59B27; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;">
                Casablanca American School
              </div>
              <div style="color: #FFFFFF; font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: -0.01em;">
                National Honor Society Chapter
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Status Badge -->
              <div style="display: inline-block; padding: 4px 10px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 3px; margin-bottom: 14px;">
                ${badgeText}
              </div>

              <!-- Title -->
              <h1 style="font-family: Georgia, serif; font-size: 22px; color: #0A1E3F; margin: 0 0 16px 0; line-height: 1.3;">
                ${headline}
              </h1>

              <!-- Greeting & Primary Message -->
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Dear <strong>${params.recipientName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                ${primaryMessage}
              </p>

              <!-- Project Summary Table -->
              ${detailsHtml}

              <!-- Reviewer Feedback (if any) -->
              ${notesHtml}

              <!-- Next Steps Instruction -->
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 20px 0;">
                ${nextStepsText}
              </p>

              <!-- Primary CTA Button -->
              <div style="margin: 28px 0 20px 0; text-align: center;">
                <a href="${ctaLink}" target="_blank" style="display: inline-block; background-color: #0A1E3F; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 4px; box-shadow: 0 2px 4px rgba(10,30,63,0.2);">
                  ${ctaText} &rarr;
                </a>
              </div>

              <div style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 14px;">
                Direct Link: <a href="${ctaLink}" style="color: #0A1E3F; word-break: break-all;">${ctaLink}</a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 30px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 11px; color: #64748B; margin: 0 0 4px 0;">
                Casablanca American School • Route de la Mecque, Casablanca, Morocco
              </p>
              <p style="font-size: 11px; color: #94A3B8; margin: 0;">
                This automated chapter notification was dispatched by the CAS NHS Portal Telemetry Engine.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const plainText = `
CASABLANCA AMERICAN SCHOOL - NATIONAL HONOR SOCIETY
====================================================
${headline.toUpperCase()}
Status: ${badgeText}

Dear ${params.recipientName},

${primaryMessage.replace(/<[^>]+>/g, '')}

PROJECT DETAILS:
- Title: ${params.projectTitle}
- Leader: ${params.creatorName} (${params.creatorEmail})
${params.coLeaderEmails?.length ? `- Co-Leaders: ${params.coLeaderEmails.join(', ')}\n` : ''}${params.eventDate ? `- Event Date: ${params.eventDate}\n` : ''}${params.location ? `- Location: ${params.location}\n` : ''}${params.volunteersNeeded ? `- Volunteers Needed: ${params.volunteersNeeded}\n` : ''}
${params.reviewerNotes ? `\nREVIEWER FEEDBACK (${params.reviewerRole || 'Reviewer'}):\n"${params.reviewerNotes}"\n` : ''}
NEXT STEPS:
${nextStepsText}

ACCESS PORTAL:
${ctaLink}

---
Casablanca American School National Honor Society Chapter Portal
  `.trim();

  return { subject, htmlBody, plainText };
}

/**
 * Dispatches an automated email:
 * 1. Checks Resend API key (or Supabase Edge Function)
 * 2. Records an entry into `public.email_logs`
 * 3. Returns status and 1-click pre-filled Gmail compose fallback URL
 */
export async function sendProjectEmail(params: SendProjectEmailParams): Promise<{
  success: boolean;
  status: EmailStatus;
  gmailComposeUrl: string;
  error?: string;
}> {
  const gmailUrl = createGmailComposeUrl(
    params.recipient.email,
    params.subject,
    params.plainTextBody
  );

  let status: EmailStatus = 'queued';
  let errorMessage: string | null = null;

  // 1. Secure dispatch: Call serverless endpoint /api/send-email so RESEND_API_KEY remains strictly server-side
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.recipient.email,
        fromName: 'CAS NHS Chapter',
        subject: params.subject,
        html: params.htmlBody,
        text: params.plainTextBody,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      status = 'sent';
    } else {
      errorMessage = data.error || `Email dispatch notice (status ${res.status})`;
      status = (res.status === 404 || res.status === 500) ? 'simulated' : 'failed';
      console.warn('Email dispatch warning:', errorMessage);
    }
  } catch (apiErr: any) {
    errorMessage = apiErr?.message || 'Network error calling /api/send-email';
    status = 'simulated';
  }

  // 2. Record in public.email_logs
  try {
    await supabase.from('email_logs').insert({
      recipient_email: params.recipient.email,
      recipient_name: params.recipient.name || params.recipient.email.split('@')[0],
      event_type: params.type,
      project_id: params.projectId || null,
      project_title: params.projectTitle,
      subject: params.subject,
      html_body: params.htmlBody,
      status: status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (dbErr) {
    console.warn('Failed recording into email_logs:', dbErr);
  }

  return {
    success: status === 'sent' || status === 'simulated',
    status,
    gmailComposeUrl: gmailUrl,
    error: errorMessage || undefined,
  };
}

export interface MemberWelcomeEmailParams {
  fullName: string;
  email: string;
  role: UserRole;
  code: string;
  isReset?: boolean;
  customNotes?: string;
  portalUrl?: string;
}

export interface SendMemberWelcomeEmailParams {
  recipientEmail: string;
  recipientName: string;
  role: UserRole;
  code: string;
  isReset?: boolean;
  customNotes?: string;
}

export function generateMemberWelcomeEmailTemplate(params: MemberWelcomeEmailParams): {
  subject: string;
  htmlBody: string;
  plainText: string;
} {
  const portalUrl = params.portalUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://casnhs.vercel.app');
  const isReset = Boolean(params.isReset);

  // Role-specific configuration matrix
  let roleLabel: string;
  let badgeText: string;
  let roleBadgeBg: string;
  let roleBadgeColor: string;
  let roleBadgeBorder: string;
  let subject: string;
  let headline: string;
  let leadText: string;
  let scopeCardTitle: string;
  let scopeCardBg: string;
  let scopeCardBorder: string;
  let scopeCardTitleColor: string;
  let scopeCardItems: string[];
  let signInDestination: string;
  let ctaButtonText: string;
  let ctaButtonBg: string;

  if (params.role === 'administrator') {
    roleLabel = 'Executive Chapter Administrator';
    badgeText = 'EXECUTIVE CHAPTER ADMINISTRATOR';
    roleBadgeBg = '#EEF2FF';
    roleBadgeColor = '#4338CA';
    roleBadgeBorder = '#C7D2FE';
    subject = isReset
      ? `[CAS NHS Security] Your Executive Administrator Access Code Has Been Reset`
      : `CAS NHS Chapter • Executive Administrator Access Credentials`;
    headline = isReset
      ? `Your Administrator Access Code Has Been Reset`
      : `Executive Chapter Administration Access`;
    leadText = isReset
      ? `A new one-time access code has been provisioned for your Casablanca American School National Honor Society Administrator account.`
      : `You have been officially appointed as a <strong>Chapter Administrator</strong> for the Casablanca American School National Honor Society, granting you Level 3 Executive Project Authorization authority.`;
    scopeCardTitle = 'Executive Administration & Authorization Scope';
    scopeCardBg = '#EEF2FF';
    scopeCardBorder = '#C7D2FE';
    scopeCardTitleColor = '#4338CA';
    scopeCardItems = [
      '<strong>Level 3 Final Project Authorization:</strong> Review student service initiatives that have passed Stage 1 Leadership vetting and Stage 2 Faculty Advisor sign-off before school-wide execution.',
      '<strong>Executive Review Desk:</strong> Grant final authorization, request administrative revisions, or provide executive counsel directly from the portal.',
      '<strong>School Policy & Safety Alignment:</strong> Ensure chapter initiatives comply with Casablanca American School administration standards and community safety guidelines.',
    ];
    signInDestination = 'You will be routed directly to the <strong>Final Project Reviews</strong> queue.';
    ctaButtonText = 'Access Chapter Administration Desk →';
    ctaButtonBg = '#4338CA';
  } else if (params.role === 'supervisor') {
    roleLabel = 'Faculty Advisor & Chapter Supervisor';
    badgeText = 'CHAPTER ADVISOR & FACULTY SUPERVISOR';
    roleBadgeBg = '#F0F9FF';
    roleBadgeColor = '#0369A1';
    roleBadgeBorder = '#BAE6FD';
    subject = isReset
      ? `[CAS NHS Security] Your Faculty Supervisor Access Code Has Been Reset`
      : `CAS NHS Chapter • Faculty Sponsor & Supervisor Credentials`;
    headline = isReset
      ? `Your Faculty Supervisor Access Code Has Been Reset`
      : `Faculty Sponsor & Chapter Supervisor Onboarding`;
    leadText = isReset
      ? `A new one-time access code has been provisioned for your Casablanca American School National Honor Society Faculty Supervisor account.`
      : `You have been registered as the official <strong>Faculty Advisor & Chapter Supervisor</strong> for the Casablanca American School National Honor Society chapter.`;
    scopeCardTitle = 'Faculty Advisory & Oversight Scope';
    scopeCardBg = '#F0F9FF';
    scopeCardBorder = '#BAE6FD';
    scopeCardTitleColor = '#0369A1';
    scopeCardItems = [
      '<strong>Stage 2 Faculty Sign-Off:</strong> Review proposals pre-vetted by student leadership to confirm faculty sponsorship, safety, and campus logistics.',
      '<strong>Proposal Review Desk:</strong> Advance authorized initiatives to Level 3 Chapter Administration for final school sign-off.',
      '<strong>Constitutional Governance:</strong> Supervise student chapter officers and ensure all activities align with NHS national standards.',
    ];
    signInDestination = 'You will be routed directly to the <strong>Proposal Review Desk</strong>.';
    ctaButtonText = 'Access Faculty Review Desk →';
    ctaButtonBg = '#0284C7';
  } else if (params.role === 'leadership') {
    roleLabel = 'Chapter Officer (Student Leadership)';
    badgeText = 'CHAPTER OFFICER (STUDENT LEADERSHIP)';
    roleBadgeBg = '#FEF3C7';
    roleBadgeColor = '#92400E';
    roleBadgeBorder = '#FDE68A';
    subject = isReset
      ? `[CAS NHS Security] Your Chapter Leadership Access Code Has Been Reset`
      : `CAS NHS Chapter • Leadership Core Appointment & Credentials`;
    headline = isReset
      ? `Your Leadership Access Code Has Been Reset`
      : `Chapter Leadership Core Appointment`;
    leadText = isReset
      ? `A new one-time access code has been provisioned for your Casablanca American School National Honor Society Leadership account.`
      : `Congratulations on your appointment to the <strong>Executive Leadership Core</strong> of the Casablanca American School National Honor Society.`;
    scopeCardTitle = 'Leadership Responsibilities & Governance';
    scopeCardBg = '#FEF3C7';
    scopeCardBorder = '#FDE68A';
    scopeCardTitleColor = '#92400E';
    scopeCardItems = [
      '<strong>Stage 1 Proposal Vetting:</strong> Review member community service proposals for feasibility and merit before escalating to Faculty Advisors.',
      '<strong>Governance Desk Access:</strong> Oversee chapter attendance, member roster, treasury ledger, and access codes.',
      '<strong>Core Leadership Standing:</strong> Executive officers are granted chapter leadership standing and manage chapter initiatives.',
    ];
    signInDestination = 'You will have full access to the <strong>Governance Desk</strong> and Chapter Management tools.';
    ctaButtonText = 'Open Leadership Governance Desk →';
    ctaButtonBg = '#0A1E3F';
  } else {
    // Default: Member (Student)
    roleLabel = 'Active Chapter Member';
    badgeText = 'ACTIVE CHAPTER MEMBER';
    roleBadgeBg = '#ECFDF5';
    roleBadgeColor = '#065F46';
    roleBadgeBorder = '#A7F3D0';
    subject = isReset
      ? `[CAS NHS Security] Your Chapter Portal Access Code Has Been Reset`
      : `Welcome to Casablanca American School NHS Chapter • Your Access Credentials`;
    headline = isReset
      ? `Your Access Code Has Been Reset`
      : `Welcome to the CAS National Honor Society`;
    leadText = isReset
      ? `A new one-time access code has been provisioned for your Casablanca American School National Honor Society account.`
      : `You have been officially granted access to the Casablanca American School National Honor Society Portal as an <strong>Active Chapter Member</strong>.`;
    scopeCardTitle = 'Chapter Member Portal Features';
    scopeCardBg = '#ECFDF5';
    scopeCardBorder = '#A7F3D0';
    scopeCardTitleColor = '#065F46';
    scopeCardItems = [
      '<strong>Service Initiatives:</strong> Submit community service proposals and participate as student volunteers in approved initiatives.',
      '<strong>Attendance & Standing:</strong> Track your semester meeting attendance, service hours, and chapter good standing.',
      '<strong>Constitution & Policies:</strong> Review CAS NHS bylaws, induction requirements, and chapter rules.',
    ];
    signInDestination = 'Navigate to your Member Dashboard to view upcoming meetings and active service projects.';
    ctaButtonText = 'Sign In to Member Portal →';
    ctaButtonBg = '#0A1E3F';
  }

  const customNotesHtml = params.customNotes?.trim()
    ? `
    <div style="margin: 20px 0; padding: 14px 18px; background-color: #F8FAFC; border-left: 4px solid #C59B27; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; margin-bottom: 6px;">
        Note from Chapter Leadership:
      </div>
      <div style="font-size: 14px; color: #1E293B; line-height: 1.5; font-style: italic;">
        "${params.customNotes.trim()}"
      </div>
    </div>
    `
    : '';

  const scopeItemsHtml = scopeCardItems
    .map((item) => `<li style="margin-bottom: 6px;">${item}</li>`)
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0A1E3F; padding: 24px 30px; text-align: left; border-bottom: 3px solid #C59B27;">
              <div style="color: #C59B27; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;">
                Casablanca American School
              </div>
              <div style="color: #FFFFFF; font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: -0.01em;">
                National Honor Society Chapter
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Role Badge -->
              <div style="display: inline-block; padding: 4px 10px; background-color: ${roleBadgeBg}; color: ${roleBadgeColor}; border: 1px solid ${roleBadgeBorder}; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 3px; margin-bottom: 14px;">
                ${badgeText}
              </div>

              <!-- Title -->
              <h1 style="font-family: Georgia, serif; font-size: 22px; color: #0A1E3F; margin: 0 0 16px 0; line-height: 1.3;">
                ${headline}
              </h1>

              <!-- Greeting -->
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Dear <strong>${params.fullName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                ${leadText}
              </p>

              ${customNotesHtml}

              <!-- Role Scope & Responsibilities Box -->
              <div style="margin: 20px 0; padding: 16px 18px; background-color: ${scopeCardBg}; border: 1px solid ${scopeCardBorder}; border-left: 4px solid ${roleBadgeColor}; border-radius: 6px;">
                <div style="color: ${scopeCardTitleColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
                  ${scopeCardTitle}
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;">
                  ${scopeItemsHtml}
                </ul>
              </div>

              <!-- Credentials Box -->
              <div style="margin: 24px 0; padding: 20px; background-color: #0F172A; border: 2px solid #C59B27; border-radius: 6px; text-align: center;">
                <div style="color: #C59B27; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                  Your One-Time Access Passcode
                </div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 20px; font-weight: 700; color: #38BDF8; letter-spacing: 0.08em; word-break: break-all; padding: 8px 12px; background-color: #1E293B; border-radius: 4px; display: inline-block; border: 1px solid #334155;">
                  ${params.code}
                </div>
                <div style="color: #94A3B8; font-size: 12px; margin-top: 8px;">
                  Associated Email: <strong style="color: #F8FAFC;">${params.email}</strong>
                </div>
              </div>

              <!-- Steps Guide -->
              <div style="margin: 24px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
                <div style="font-size: 13px; font-weight: 700; color: #0A1E3F; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
                  How to Sign In
                </div>
                <ol style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; color: #475569;">
                  <li>Open the chapter portal: <a href="${portalUrl}" target="_blank" style="color: #0A1E3F; font-weight: 600;">${portalUrl}</a></li>
                  <li>Click <strong>"Member Portal"</strong> and enter your CAS email: <strong>${params.email}</strong></li>
                  <li>Paste your one-time passcode into the password field.</li>
                  <li>${signInDestination}</li>
                  <li>Once logged in, you can personalize your passcode at any time via <strong>"Change Code"</strong> in the top header.</li>
                </ol>
              </div>

              <!-- Primary CTA Button -->
              <div style="margin: 28px 0 20px 0; text-align: center;">
                <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: ${ctaButtonBg}; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 4px; box-shadow: 0 2px 4px rgba(10,30,63,0.2);">
                  ${ctaButtonText}
                </a>
              </div>

              <!-- Security Notice -->
              <div style="padding: 12px 16px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 4px; font-size: 12px; color: #92400E; line-height: 1.5;">
                <strong>Security Reminder:</strong> Please keep this passcode confidential. If you suspect unauthorized access, reset your passcode immediately or reach out to chapter leadership at <a href="mailto:nhs@cas.ac.ma" style="color: #92400E; font-weight: 600;">nhs@cas.ac.ma</a>.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 30px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 11px; color: #64748B; margin: 0 0 4px 0;">
                Casablanca American School • Route de la Mecque, Casablanca, Morocco
              </p>
              <p style="font-size: 11px; color: #94A3B8; margin: 0;">
                CAS National Honor Society Chapter Automated Identity & Access System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const plainText = `
CASABLANCA AMERICAN SCHOOL - NATIONAL HONOR SOCIETY
====================================================
${headline.toUpperCase()}
Role: ${roleLabel}

Dear ${params.fullName},

${leadText.replace(/<[^>]+>/g, '')}
${params.customNotes ? `\nNote from Leadership:\n"${params.customNotes}"\n` : ''}
YOUR ACCESS CREDENTIALS:
- Email: ${params.email}
- One-Time Passcode: ${params.code}

ROLE SCOPE & RESPONSIBILITIES:
${scopeCardItems.map((item) => `* ${item.replace(/<[^>]+>/g, '')}`).join('\n')}

SIGN IN STEPS:
1. Open the portal: ${portalUrl}
2. Click "Member Portal" and enter your CAS email: ${params.email}
3. Enter your one-time passcode above as your password.
4. ${signInDestination.replace(/<[^>]+>/g, '')}
5. Once signed in, you can update your passcode at any time via "Change Code" in the top header.

Direct Portal Link: ${portalUrl}

Security Notice: Please keep this passcode confidential. Contact nhs@cas.ac.ma if you need assistance.

---
Casablanca American School National Honor Society Chapter
  `.trim();

  return { subject, htmlBody, plainText };
}

export async function sendMemberWelcomeEmail(params: SendMemberWelcomeEmailParams): Promise<{
  success: boolean;
  status: EmailStatus;
  gmailComposeUrl: string;
  error?: string;
}> {
  const template = generateMemberWelcomeEmailTemplate({
    fullName: params.recipientName,
    email: params.recipientEmail,
    role: params.role,
    code: params.code,
    isReset: params.isReset,
    customNotes: params.customNotes,
  });

  const gmailUrl = createGmailComposeUrl(
    params.recipientEmail,
    template.subject,
    template.plainText
  );

  let status: EmailStatus = 'queued';
  let errorMessage: string | null = null;

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.recipientEmail,
        fromName: 'CAS NHS Chapter',
        subject: template.subject,
        html: template.htmlBody,
        text: template.plainText,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      status = 'sent';
    } else {
      errorMessage = data.error || `Email dispatch notice (status ${res.status})`;
      status = (res.status === 404 || res.status === 500) ? 'simulated' : 'failed';
      console.warn('Member welcome email warning:', errorMessage);
    }
  } catch (apiErr: any) {
    errorMessage = apiErr?.message || 'Network error calling /api/send-email';
    status = 'simulated';
  }

  // Record into public.email_logs
  try {
    await supabase.from('email_logs').insert({
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      event_type: 'member_welcome',
      project_title: 'Member Portal Access Credentials',
      subject: template.subject,
      html_body: template.htmlBody,
      status: status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (dbErr) {
    console.warn('Failed recording member_welcome into email_logs:', dbErr);
  }

  return {
    success: status === 'sent' || status === 'simulated',
    status,
    gmailComposeUrl: gmailUrl,
    error: errorMessage || undefined,
  };
}
