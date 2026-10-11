/* Shared-rates logic. Kept separate from Netlify so it can be tested. */
import { createHash, timingSafeEqual } from 'node:crypto';

const sha = s => createHash('sha256').update(String(s)).digest();
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function handle(req, store, env, opts = {}) {
  const allowed = env.ALLOWED_ORIGIN || '';
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (req.method === 'GET') {                       // public: customers read today's rates
    const rates = await store.get('rates', { type: 'json' });
    return out({ ok: true, rates: rates || null });
  }
  if (req.method !== 'POST') return out({ ok: false, error: 'Method not allowed' }, 405);

  const pw = env.ADMIN_PASSWORD || '';
  if (pw.length < 8) return out({ ok: false, error: 'Admin password not configured on the server' }, 500);
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const good = timingSafeEqual(sha(given), sha(pw));
  if (!good) { await sleep(opts.failDelay ?? 800); return out({ ok: false, error: 'Wrong password' }, 401); }

  let b; try { b = await req.json(); } catch (e) { return out({ ok: false, error: 'Bad request' }, 400); }
  if (b.verify) return out({ ok: true });

  const src = b.products && typeof b.products === 'object' ? b.products : null;
  if (!src || Object.keys(src).length > 150) return out({ ok: false, error: 'No products' }, 400);
  const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const products = {}; let customCount = 0;
  for (const [id, v] of Object.entries(src)) {
    const price = Math.round(Number(v && v.price) * 100) / 100;
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || !(price >= 1 && price <= 100000) || typeof v.available !== 'boolean')
      return out({ ok: false, error: `Invalid value for ${id}` }, 400);
    products[id] = { price, available: v.available };
    if (v.img) {                                      // photo uploaded through /api/img
      if (!/^[a-f0-9-]{36}$/.test(String(v.img))) return out({ ok: false, error: `Invalid photo for ${id}` }, 400);
      products[id].img = v.img;
    }
    if (v.custom) {                                   // a fish added from the admin panel
      const name = clean(v.name, 60);
      if (!/^c-[a-z0-9]{4,20}$/.test(id) || !name || !/^[a-z0-9_-]{1,30}$/.test(String(v.category)) ||
          !['fish', 'prawn', 'crab', 'squid'].includes(v.kind) || !/^#[0-9A-Fa-f]{6}$/.test(String(v.color || '')))
        return out({ ok: false, error: `Invalid new fish ${id}` }, 400);
      Object.assign(products[id], { custom: true, name, tamil: clean(v.tamil, 60), category: v.category,
        kind: v.kind, color: v.color, note: clean(v.note, 120) });
      if (++customCount > 60) return out({ ok: false, error: 'Too many added fish' }, 400);
    }
  }
  const deleted = Array.isArray(b.deleted) ? b.deleted.filter(d => /^[A-Za-z0-9_-]{1,40}$/.test(String(d))).slice(0, 150) : [];
  const message = String(b.message || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 120);
  const rates = { updatedAt: new Date().toISOString(), message, products, deleted };
  await store.setJSON('rates', rates);
  return out({ ok: true, rates });
}
