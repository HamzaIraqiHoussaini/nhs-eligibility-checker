import { supabase } from './supabase';
import type { NotificationType, EmailStatus } from '../types/nhs';

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
      subject = `🎉 [CAS NHS] Project Approved: "${params.projectTitle}"`;
      headline = 'Your Project Is Officially Approved!';
      badgeColor = '#065F46';
      badgeBg = '#ECFDF5';
      badgeText = 'OFFICIALLY APPROVED';
      primaryMessage = `Congratulations! <strong>"${params.projectTitle}"</strong> has received final authorization from Chapter Faculty Supervisor <strong>${params.reviewerName || 'Laura Hayes'}</strong>.`;
      nextStepsText = 'Your project is now officially registered on the CAS NHS Project Hub. You may begin recruiting chapter volunteers and proceed with project execution.';
      ctaLink = projectsLink;
      ctaText = 'Manage Project & Volunteers';
      break;

    case 'project_rejected':
      subject = `[CAS NHS Notice] Action Required on Proposal: "${params.projectTitle}"`;
      headline = 'Revisions Requested for Project Proposal';
      badgeColor = '#991B1B';
      badgeBg = '#FEF2F2';
      badgeText = 'REVISION REQUIRED';
      primaryMessage = `A review decision was recorded for <strong>"${params.projectTitle}"</strong> indicating that adjustments or additional details are needed before it can proceed.`;
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

  const resendApiKey = typeof import.meta !== 'undefined' ? import.meta.env.VITE_RESEND_API_KEY : '';
  let status: EmailStatus = 'queued';
  let errorMessage: string | null = null;

  // 1. If Resend API Key is available, dispatch directly via Resend API
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CAS NHS Chapter <onboarding@resend.dev>', // or custom verified domain
          to: [params.recipient.email],
          subject: params.subject,
          html: params.htmlBody,
          text: params.plainTextBody,
        }),
      });

      if (res.ok) {
        status = 'sent';
      } else {
        const data = await res.json();
        errorMessage = data.message || `Resend HTTP error ${res.status}`;
        status = 'failed';
        console.warn('Resend email dispatch error:', errorMessage);
      }
    } catch (apiErr: any) {
      errorMessage = apiErr?.message || 'Network error calling Resend API';
      status = 'failed';
      console.warn('Resend network error:', errorMessage);
    }
  } else {
    // Simulated / queued for audit in Supabase
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
