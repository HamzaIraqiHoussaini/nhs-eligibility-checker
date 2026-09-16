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
                const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
                if (!apiKey) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    error: 'RESEND_API_KEY environment variable is not configured on server / .env'
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

