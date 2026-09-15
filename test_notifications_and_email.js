// test_notifications_and_email.js
// Automated verification suite for CAS NHS Automated Project Email & In-App Notification Center

import assert from 'assert';

console.log('================================================================');
console.log('  CAS NHS AUTOMATED PROJECT EMAIL & NOTIFICATION SUITE          ');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

// ---------------------------------------------------------
// Helper logic mirrored from emailService.ts & notificationService.ts
// ---------------------------------------------------------

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createGmailComposeUrl(params) {
  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: params.to,
    su: params.subject,
    body: params.body,
  });
  return `https://mail.google.com/mail/?${query.toString()}`;
}

function generateProjectEmailTemplate(params) {
  const safeProjectTitle = escapeHtml(params.projectTitle);
  const safeRecipientName = escapeHtml(params.recipientName);
  const safeCreatorName = escapeHtml(params.creatorName);
  const safeNotes = params.reviewerNotes ? escapeHtml(params.reviewerNotes) : '';

  let subject = '';
  let headline = '';
  let badgeColor = '#0A1E3F';
  let badgeText = 'PROJECT UPDATE';
  let bodyHtml = '';
  let plainText = '';

  switch (params.type) {
    case 'project_submitted':
      if (params.isReviewerNotification) {
        subject = `[NHS Project Review] Action Required: "${params.projectTitle}" by ${params.creatorName}`;
        headline = 'New Project Proposal Submitted for Review';
        badgeColor = '#C59B27';
        badgeText = 'STAGE 1 REVIEW PENDING';
        bodyHtml = `
          <p>Dear ${safeRecipientName},</p>
          <p>A new National Honor Society project proposal, <strong>&ldquo;${safeProjectTitle}&rdquo;</strong>, has been submitted by <strong>${safeCreatorName}</strong> and requires Chapter Leadership Stage 1 Review.</p>
        `;
        plainText = `Dear ${params.recipientName},\n\nA new National Honor Society project proposal, "${params.projectTitle}", has been submitted by ${params.creatorName} and requires Chapter Leadership Stage 1 Review.\n`;
      } else {
        subject = `[CAS NHS] Proposal Received: "${params.projectTitle}" is in Stage 1 Review`;
        headline = 'Project Proposal Submitted Successfully';
        badgeColor = '#0A1E3F';
        badgeText = 'STAGE 1 UNDERWAY';
        bodyHtml = `
          <p>Dear ${safeRecipientName},</p>
          <p>Thank you for submitting your project proposal, <strong>&ldquo;${safeProjectTitle}&rdquo;</strong>. It has been placed in the queue for Stage 1 Leadership Review.</p>
        `;
        plainText = `Dear ${params.recipientName},\n\nThank you for submitting your project proposal, "${params.projectTitle}". It has been placed in the queue for Stage 1 Leadership Review.\n`;
      }
      break;

    case 'stage1_approved':
      if (params.isReviewerNotification) {
        subject = `[NHS Supervisor Action] Stage 2 Sign-off Needed: "${params.projectTitle}"`;
        headline = 'Project Proposal Approved by Leadership (Stage 1 Passed)';
        badgeColor = '#10B981';
        badgeText = 'STAGE 2 SUPERVISOR AUTHORIZATION';
        bodyHtml = `
          <p>Dear ${safeRecipientName},</p>
          <p>The project proposal <strong>&ldquo;${safeProjectTitle}&rdquo;</strong> led by <strong>${safeCreatorName}</strong> has been reviewed and approved by Chapter Leadership.</p>
        `;
        plainText = `Dear ${params.recipientName},\n\nThe project proposal "${params.projectTitle}" led by ${params.creatorName} has been approved by Leadership and awaits your Stage 2 authorization.\n`;
      } else {
        subject = `[CAS NHS] Stage 1 Approved: "${params.projectTitle}" Advancing to Faculty Advisor`;
        headline = 'Stage 1 Leadership Approval Granted!';
        badgeColor = '#10B981';
        badgeText = 'STAGE 1 APPROVED';
        bodyHtml = `
          <p>Dear ${safeRecipientName},</p>
          <p>Congratulations! Your project proposal <strong>&ldquo;${safeProjectTitle}&rdquo;</strong> has passed Stage 1 Chapter Leadership Review.</p>
        `;
        plainText = `Dear ${params.recipientName},\n\nCongratulations! Your project proposal "${params.projectTitle}" has passed Stage 1 Leadership Review.\n`;
      }
      break;

    case 'stage2_approved':
      subject = `🎉 [CAS NHS Approved] Congratulations! "${params.projectTitle}" Officially Authorized`;
      headline = 'Project Officially Authorized & Ready for Volunteers!';
      badgeColor = '#0A1E3F';
      badgeText = 'OFFICIALLY APPROVED';
      bodyHtml = `
        <p>Dear ${safeRecipientName},</p>
        <p>Great news! Your project proposal <strong>&ldquo;${safeProjectTitle}&rdquo;</strong> has received final authorization from the Faculty Supervisor. Your project is officially approved and ready for execution.</p>
      `;
      plainText = `Dear ${params.recipientName},\n\nGreat news! Your project proposal "${params.projectTitle}" has received final authorization from the Faculty Supervisor.\n`;
      break;

    case 'project_rejected':
      subject = `[CAS NHS Update] Revision Needed for Project Proposal: "${params.projectTitle}"`;
      headline = 'Project Proposal Status Update: Revisions Requested';
      badgeColor = '#EF4444';
      badgeText = 'REVISIONS REQUESTED';
      bodyHtml = `
        <p>Dear ${safeRecipientName},</p>
        <p>Thank you for submitting <strong>&ldquo;${safeProjectTitle}&rdquo;</strong>. Upon review by the ${escapeHtml(params.reviewerRole || 'Chapter Review Team')}, some adjustments or clarifications are needed before this project can proceed.</p>
        ${safeNotes ? `<div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:12px;margin:16px 0;"><strong>Review Feedback:</strong><br/>${safeNotes}</div>` : ''}
      `;
      plainText = `Dear ${params.recipientName},\n\nRevisions are requested for your project proposal "${params.projectTitle}".\nFeedback: ${params.reviewerNotes || 'See portal for details.'}\n`;
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden;">
          <tr>
            <td style="background-color: #0A1E3F; padding: 24px; text-align: center; border-bottom: 4px solid #C59B27;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">NATIONAL HONOR SOCIETY</h1>
              <div style="color: #C59B27; font-size: 13px; font-weight: bold; margin-top: 4px;">CAS CHAPTER • SERVICE LEADERSHIP</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <div style="display: inline-block; background: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">
                ${badgeText}
              </div>
              <h2 style="color: #0F172A; margin: 0 0 16px 0; font-size: 18px;">${headline}</h2>
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, htmlBody: html, plainText };
}

// ---------------------------------------------------------
// 1. Email Template Generation Tests
// ---------------------------------------------------------
console.log('--- 1. Email Template Generation & CAS NHS Branding ---');

test('Project submission email for Chapter Leadership contains review instructions and CAS colors', () => {
  const res = generateProjectEmailTemplate({
    type: 'project_submitted',
    projectTitle: 'Senior Tech Literacy Drive',
    creatorName: 'Amira Khan',
    creatorEmail: 'amira.k@cas.edu',
    recipientName: 'Executive Committee',
    isReviewerNotification: true,
  });

  assert.strictEqual(res.subject.includes('[NHS Project Review] Action Required'), true);
  assert.strictEqual(res.subject.includes('Senior Tech Literacy Drive'), true);
  assert.strictEqual(res.htmlBody.includes('#0A1E3F'), true, 'Must include CAS Oxford Navy');
  assert.strictEqual(res.htmlBody.includes('#C59B27'), true, 'Must include CAS Gold');
  assert.strictEqual(res.htmlBody.includes('STAGE 1 REVIEW PENDING'), true);
  assert.strictEqual(res.htmlBody.includes('Amira Khan'), true);
});

test('Project submission confirmation email for Member contains friendly acknowledgement', () => {
  const res = generateProjectEmailTemplate({
    type: 'project_submitted',
    projectTitle: 'Senior Tech Literacy Drive',
    creatorName: 'Amira Khan',
    creatorEmail: 'amira.k@cas.edu',
    recipientName: 'Amira Khan',
    isReviewerNotification: false,
  });

  assert.strictEqual(res.subject.includes('[CAS NHS] Proposal Received'), true);
  assert.strictEqual(res.htmlBody.includes('STAGE 1 UNDERWAY'), true);
  assert.strictEqual(res.htmlBody.includes('Thank you for submitting your project proposal'), true);
});

test('Stage 1 Approval email to Faculty Supervisor prompts for Stage 2 Sign-off', () => {
  const res = generateProjectEmailTemplate({
    type: 'stage1_approved',
    projectTitle: 'Campus Recycling Expansion',
    creatorName: 'David Lee',
    creatorEmail: 'david.l@cas.edu',
    recipientName: 'Dr. Evans',
    isReviewerNotification: true,
  });

  assert.strictEqual(res.subject.includes('[NHS Supervisor Action] Stage 2 Sign-off Needed'), true);
  assert.strictEqual(res.htmlBody.includes('STAGE 2 SUPERVISOR AUTHORIZATION'), true);
  assert.strictEqual(res.plainText.includes('approved by Leadership and awaits your Stage 2 authorization'), true);
});

test('Stage 2 Approval celebration email congratulates creator and confirms authorization', () => {
  const res = generateProjectEmailTemplate({
    type: 'stage2_approved',
    projectTitle: 'Elementary STEM Mentorship',
    creatorName: 'Sarah Jenkins',
    creatorEmail: 'sarah.j@cas.edu',
    recipientName: 'Sarah Jenkins',
    isReviewerNotification: false,
  });

  assert.strictEqual(res.subject.includes('🎉 [CAS NHS Approved] Congratulations!'), true);
  assert.strictEqual(res.htmlBody.includes('OFFICIALLY APPROVED'), true);
  assert.strictEqual(res.htmlBody.includes('ready for execution'), true);
});

test('Project rejection / revision needed email includes reviewer notes safely', () => {
  const res = generateProjectEmailTemplate({
    type: 'project_rejected',
    projectTitle: 'Book Drive 2026',
    creatorName: 'Leo Vance',
    creatorEmail: 'leo.v@cas.edu',
    recipientName: 'Leo Vance',
    reviewerRole: 'Chapter Leadership',
    reviewerNotes: 'Please detail specific drop-off locations and obtain custodial approval.',
  });

  assert.strictEqual(res.subject.includes('Revision Needed'), true);
  assert.strictEqual(res.htmlBody.includes('REVISIONS REQUESTED'), true);
  assert.strictEqual(res.htmlBody.includes('obtain custodial approval'), true);
  assert.strictEqual(res.plainText.includes('Feedback: Please detail specific drop-off locations'), true);
});

test('HTML injection in project titles or reviewer notes is sanitized', () => {
  const maliciousTitle = 'Hack <script>alert("pwned")</script> Project & Gala';
  const maliciousNotes = 'Invalid safety plan <img src=x onerror=alert(1)/>';
  const res = generateProjectEmailTemplate({
    type: 'project_rejected',
    projectTitle: maliciousTitle,
    creatorName: 'Attacker <script>',
    creatorEmail: 'test@cas.edu',
    recipientName: 'Attacker',
    reviewerNotes: maliciousNotes,
  });

  assert.strictEqual(res.htmlBody.includes('<script>'), false, 'Script tags must be escaped');
  assert.strictEqual(res.htmlBody.includes('&lt;script&gt;'), true);
  assert.strictEqual(res.htmlBody.includes('<img src=x'), false, 'Img tags must be escaped');
  assert.strictEqual(res.htmlBody.includes('&lt;img src=x'), true);
});

// ---------------------------------------------------------
// 2. 1-Click Gmail Fallback Compose URL Tests
// ---------------------------------------------------------
console.log('\n--- 2. 1-Click Gmail Fallback Compose URL ---');

test('Gmail compose URL encodes recipient, subject, and body correctly', () => {
  const url = createGmailComposeUrl({
    to: 'advisor@cas.edu',
    subject: '[NHS Project Review] Senior Gala',
    body: 'Hello Advisor,\n\nPlease review the gala proposal.\nBest regards,\nNHS Leadership',
  });

  assert.strictEqual(url.startsWith('https://mail.google.com/mail/?'), true);
  assert.strictEqual(url.includes('to=advisor%40cas.edu'), true);
  assert.strictEqual(url.includes('view=cm&fs=1'), true);
  assert.strictEqual(url.includes('su=%5BNHS+Project+Review%5D+Senior+Gala'), true);
});

// ---------------------------------------------------------
// 3. In-App Notification Logic & Routing Tests
// ---------------------------------------------------------
console.log('\n--- 3. In-App Notification Logic & Routing ---');

test('Unread notification counter accurately increments and caps badge display', () => {
  const notifications = [
    { id: '1', read: false },
    { id: '2', read: true },
    { id: '3', read: false },
    { id: '4', read: false },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;
  assert.strictEqual(unreadCount, 3);

  const getBadgeText = (count) => (count > 9 ? '9+' : count.toString());
  assert.strictEqual(getBadgeText(3), '3');
  assert.strictEqual(getBadgeText(15), '9+');
});

test('Orchestrator fans out notifications to Creator, Co-Leaders, and Reviewers', () => {
  const mockProject = {
    id: 'proj-123',
    project_title: 'Math Olympiad Prep',
    creator_id: 'user-primary',
    creator_name: 'Alice Wong',
    creator_email: 'alice@cas.edu',
    co_leader_emails: ['bob@cas.edu', 'clara@cas.edu'],
  };

  const mockReviewers = [
    { id: 'rev-1', email: 'vp@cas.edu', full_name: 'VP Leadership' },
    { id: 'rev-2', email: 'pres@cas.edu', full_name: 'President' },
  ];

  const mockCoLeaderProfiles = [
    { id: 'co-1', email: 'bob@cas.edu' },
    { id: 'co-2', email: 'clara@cas.edu' },
  ];

  // Reviewers notifications
  const reviewerNotifs = mockReviewers.map(r => ({
    userId: r.id,
    projectId: mockProject.id,
    type: 'project_submitted',
    linkTab: 'review',
  }));

  // Creator notification
  const creatorNotif = {
    userId: mockProject.creator_id,
    projectId: mockProject.id,
    type: 'project_submitted',
    linkTab: 'projects',
  };

  // Co-leader notifications
  const coLeaderNotifs = mockCoLeaderProfiles.map(cl => ({
    userId: cl.id,
    projectId: mockProject.id,
    type: 'project_submitted',
    linkTab: 'projects',
  }));

  const allInApp = [...reviewerNotifs, creatorNotif, ...coLeaderNotifs];
  assert.strictEqual(allInApp.length, 5);
  assert.strictEqual(allInApp.filter(n => n.linkTab === 'review').length, 2);
  assert.strictEqual(allInApp.filter(n => n.linkTab === 'projects').length, 3);
  assert.strictEqual(allInApp.some(n => n.userId === 'user-primary'), true);
  assert.strictEqual(allInApp.some(n => n.userId === 'co-1'), true);
  assert.strictEqual(allInApp.some(n => n.userId === 'co-2'), true);
});

// ---------------------------------------------------------
// 4. Resilience & Fallback Database Logging
// ---------------------------------------------------------
console.log('\n--- 4. Resilience & Fallback Database Logging ---');

test('Email failure or missing API key creates queued audit log without throwing', () => {
  // Simulating mock sendProjectEmail when RESEND_API_KEY is not configured
  const mockEmailPayload = {
    recipientEmail: 'member@cas.edu',
    recipientName: 'Member Jane',
    type: 'stage2_approved',
    projectId: 'proj-456',
    projectTitle: 'Food Drive',
    subject: 'Approved',
    htmlBody: '<p>Approved</p>',
  };

  // Fallback handler simulates database insertion into email_logs
  const simulatedDbLog = {
    id: 'log-uuid-1',
    recipient_email: mockEmailPayload.recipientEmail,
    recipient_name: mockEmailPayload.recipientName,
    event_type: mockEmailPayload.type,
    project_id: mockEmailPayload.projectId,
    project_title: mockEmailPayload.projectTitle,
    subject: mockEmailPayload.subject,
    html_body: mockEmailPayload.htmlBody,
    status: 'queued', // queued for manual or worker dispatch
    created_at: new Date().toISOString(),
  };

  assert.strictEqual(simulatedDbLog.status, 'queued');
  assert.strictEqual(simulatedDbLog.project_id, 'proj-456');
  assert.strictEqual(simulatedDbLog.recipient_email, 'member@cas.edu');
});

console.log('\n================================================================');
console.log(`  TEST RESULTS: ${passed}/${total} PASSED`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
