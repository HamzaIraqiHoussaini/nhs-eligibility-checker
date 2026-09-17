// api/send-email.ts
// Vercel Serverless Function to securely dispatch emails using server-side RESEND_API_KEY.
// This ensures RESEND_API_KEY is never exposed to the client browser bundle.

export default async function handler(req: any, res: any) {
  // Enable CORS for all environments (production, preview deployments, and localhost)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Server-side environment variables (Google Workspace Webhook as primary, Resend as fallback)
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyq9C5WptAXNH-asi4IwfUOA1c4A3QbTonaDI7a0oDVneGeyjb9x6ocgq8yy8zckQhV/exec';
  const apiKey = process.env.RESEND_API_KEY;

  if (!webhookUrl && !apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Neither GMAIL_WEBHOOK_URL nor RESEND_API_KEY is configured on server.',
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

    // 1. Primary: Native CAS Google Workspace Webhook (100% deliverability from nhs@cas.ac.ma)
    if (webhookUrl) {
      try {
        const scriptRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            to: recipients.join(','),
            subject,
            html,
            text: text || '',
          }),
          redirect: 'follow',
        });

        const textOutput = await scriptRes.text();
        let parsed: any = {};
        try {
          parsed = JSON.parse(textOutput);
        } catch {
          // Response may be text or HTML confirmation
        }

        if (scriptRes.ok && (parsed.success || textOutput.includes('success'))) {
          return res.status(200).json({
            success: true,
            provider: 'google_workspace_native',
          });
        }
        console.warn('Google Apps Script response not OK, attempting fallback:', textOutput.slice(0, 200));
      } catch (webhookErr) {
        console.warn('Google Apps Script webhook failed, attempting fallback:', webhookErr);
      }
    }

    // 2. Secondary Fallback: Resend API
    if (apiKey) {
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

      if (response.ok) {
        return res.status(200).json({
          success: true,
          id: data.id,
          provider: 'resend',
        });
      }

      return res.status(response.status).json({
        success: false,
        error: data.message || `Resend dispatch failed with status ${response.status}`,
        details: data,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to deliver email through available email services.',
    });
  } catch (err: any) {
    console.error('Server error in /api/send-email:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error',
    });
  }
}
