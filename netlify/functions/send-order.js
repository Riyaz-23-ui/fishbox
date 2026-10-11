/* Receives an order from the website and delivers it to the shop's WhatsApp
   using the WhatsApp Business Cloud API. The access token stays on the server. */
const GRAPH = 'https://graph.facebook.com/v21.0';

exports.handler = async (event) => {
  const env = process.env;
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowed = env.ALLOWED_ORIGIN || '';          // e.g. https://yourshop.com  (empty = same-site only requests)
  const cors = {
    'Access-Control-Allow-Origin': allowed || origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  const reply = (code, obj) => ({ statusCode: code, headers: cors, body: JSON.stringify(obj) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });
  if (allowed && origin && origin !== allowed) return reply(403, { ok: false, error: 'Origin not allowed' });

  const { WA_TOKEN, WA_PHONE_NUMBER_ID, ADMIN_WA_NUMBER, WA_TEMPLATE_NAME, WA_TEMPLATE_LANG } = env;
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID || !ADMIN_WA_NUMBER) return reply(500, { ok: false, error: 'Server not configured' });

  if ((event.body || '').length > 8000) return reply(413, { ok: false, error: 'Too large' });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, error: 'Bad JSON' }); }

  if (b.hp) return reply(200, { ok: true });          // honeypot: bots fill this, silently ignore
  const message = String(b.message || '');
  const valid = /^[A-Za-z0-9]{2,8}-\d{6}-\d{4}$/.test(String(b.orderId || '')) &&
    /^[6-9]\d{9}$/.test(String(b.phone || '')) &&
    message.length >= 30 && message.length <= 3500 && message.includes(b.orderId);
  if (!valid) return reply(400, { ok: false, error: 'Invalid order' });

  const to = String(ADMIN_WA_NUMBER).replace(/\D/g, '');
  const payload = WA_TEMPLATE_NAME
    ? { messaging_product: 'whatsapp', to, type: 'template', template: {
        name: WA_TEMPLATE_NAME, language: { code: WA_TEMPLATE_LANG || 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text',
          // template parameters cannot contain new lines
          text: message.replace(/\s*\n\s*/g, ' | ').replace(/ {2,}/g, ' ').slice(0, 1000) }] }] } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } };

  try {
    const res = await fetch(`${GRAPH}/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { console.error('WhatsApp API error', res.status, await res.text()); return reply(502, { ok: false, error: 'WhatsApp send failed' }); }
    return reply(200, { ok: true });
  } catch (e) {
    console.error(e); return reply(502, { ok: false, error: 'WhatsApp send failed' });
  }
};
