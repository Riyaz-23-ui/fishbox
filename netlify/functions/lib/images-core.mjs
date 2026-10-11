/* Fish photo storage. GET /api/img/<id> is public; POST /api/img needs the admin password. */
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';

const sha = s => createHash('sha256').update(String(s)).digest();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_BYTES = 700 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function sniff(b) {                                   // trust the file bytes, not the header
  if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}

export async function handle(req, store, env, opts = {}) {
  const allowed = env.ALLOWED_ORIGIN || '';
  const cors = allowed ? { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } : {};
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (req.method === 'GET') {
    const id = new URL(req.url).pathname.split('/').filter(Boolean).pop() || '';
    if (!UUID.test(id)) return json({ ok: false, error: 'Not found' }, 404);
    const r = await store.getWithMetadata(id, { type: 'arrayBuffer' });
    if (!r) return json({ ok: false, error: 'Not found' }, 404);
    return new Response(r.data, { status: 200, headers: { 'Content-Type': (r.metadata && r.metadata.type) || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', ...cors } });
  }
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const pw = env.ADMIN_PASSWORD || '';
  if (pw.length < 8) return json({ ok: false, error: 'Admin password not configured on the server' }, 500);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!timingSafeEqual(sha(given), sha(pw))) { await sleep(opts.failDelay ?? 800); return json({ ok: false, error: 'Wrong password' }, 401); }

  const buf = await req.arrayBuffer();
  if (buf.byteLength < 100 || buf.byteLength > MAX_BYTES) return json({ ok: false, error: 'Photo must be under 700 KB' }, 413);
  const type = sniff(new Uint8Array(buf));
  if (!type) return json({ ok: false, error: 'Only JPG, PNG or WebP photos' }, 415);
  const id = randomUUID();
  await store.set(id, buf, { metadata: { type } });
  return json({ ok: true, id });
}
