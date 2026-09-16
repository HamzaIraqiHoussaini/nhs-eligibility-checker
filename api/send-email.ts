// api/send-email.ts
// Vercel Serverless Function to securely dispatch emails using server-side RESEND_API_KEY.
// This ensures RESEND_API_KEY is never exposed to the client browser bundle.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Server-side environment variable
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'RESEND_API_KEY environment variable is not configured on server.',
    });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { to, subject, html, text, fromName } = body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: to, subject, html',
      });
    }

    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName || 'CAS NHS Portal'} <onboarding@resend.dev>`,
        to: recipients,
        subject,
        html,
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || `Resend dispatch failed with status ${response.status}`,
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id,
    });
  } catch (err: any) {
    console.error('Server error in /api/send-email:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error',
    });
  }
}
