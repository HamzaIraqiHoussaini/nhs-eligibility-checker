import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'dev-api-send-email',
        configureServer(server) {
          server.middlewares.use('/api/send-email', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const webhookUrl = process.env.GMAIL_WEBHOOK_URL || env.GMAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyq9C5WptAXNH-asi4IwfUOA1c4A3QbTonaDI7a0oDVneGeyjb9x6ocgq8yy8zckQhV/exec';
                const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;

                if (!webhookUrl && !apiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    error: 'Neither GMAIL_WEBHOOK_URL nor RESEND_API_KEY is configured on server / .env'
                  }));
                  return;
                }

                const body = JSON.parse(bodyStr || '{}');
                const { to, subject, html, text, fromName } = body;

                if (!to || !subject || !html) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    error: 'Missing required parameters: to, subject, html'
                  }));
                  return;
                }

                const recipients = Array.isArray(to) ? to : [to];

                // 1. Google Workspace Webhook
                if (webhookUrl) {
                  try {
                    const scriptRes = await fetch(webhookUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
                    try { parsed = JSON.parse(textOutput); } catch {}

                    if (scriptRes.ok && (parsed.success || textOutput.includes('success'))) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true, provider: 'google_workspace_native' }));
                      return;
                    }
                  } catch (webhookErr) {
                    console.warn('Vite dev webhook dispatch error:', webhookErr);
                  }
                }

                // 2. Resend fallback
                if (apiKey) {
                  const resendRes = await fetch('https://api.resend.com/emails', {
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

                  const data: any = await resendRes.json().catch(() => ({}));
                  res.statusCode = resendRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: resendRes.ok,
                    id: data.id,
                    error: resendRes.ok ? undefined : (data.message || `Resend error ${resendRes.status}`),
                    details: data
                  }));
                  return;
                }

                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Failed to deliver email' }));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
              }
            });
          });
        }
      }
    ],
  }
})

