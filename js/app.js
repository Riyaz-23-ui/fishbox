/* Fresh fish shop — cart, validation and WhatsApp ordering.
   Everything editable lives in js/config.js. */
(() => {
  'use strict';
  const C = window.SHOP_CONFIG;
  if (!C) { console.error('config.js not loaded'); return; }

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => C.currency + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const kg = n => (Math.round(n * 100) / 100) + ' kg';
  const getProduct = id => C.products.find(p => p.id === id);
  const getPath = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
  const waNumber = String(C.shop.whatsappNumber).replace(/\D/g, '');
  const waUrl = text => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  const Q = C.qty;
  const clampQty = q => Math.min(Q.max, Math.max(Q.min, Math.round(q / Q.step) * Q.step));

  /* ---------- illustrations (used when no photo is set) ---------- */
  function art(kind, color) {
    const c = color || '#0B6FA4';
    const shapes = {
      fish: `<path d="M18 52C38 18 92 16 124 52 92 88 38 86 18 52Z" fill="${c}"/><path d="M120 52L152 28V76Z" fill="${c}" opacity=".8"/><path d="M62 24C72 6 94 8 100 28Z" fill="${c}" opacity=".65"/><path d="M60 80C70 94 88 94 96 78Z" fill="${c}" opacity=".6"/><path d="M70 36C78 48 78 58 70 70" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="42" cy="48" r="5" fill="#fff"/><circle cx="41" cy="48" r="2.4" fill="#0B2A3C"/>`,
      prawn: `<path d="M38 78C14 56 34 18 80 20 124 22 134 58 106 78" stroke="${c}" stroke-width="17" fill="none" stroke-linecap="round"/><path d="M104 78l26 6-8-24z" fill="${c}" opacity=".8"/><path d="M52 24 36 10M60 22 52 6" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M62 28c-3 10-3 22 0 32M84 28c-3 10-3 22 0 32M104 36c-2 8-2 16 2 26" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="46" cy="36" r="4" fill="#fff"/><circle cx="46" cy="36" r="2" fill="#0B2A3C"/>`,
      crab: `<ellipse cx="80" cy="60" rx="42" ry="27" fill="${c}"/><circle cx="26" cy="30" r="13" fill="${c}"/><circle cx="134" cy="30" r="13" fill="${c}"/><path d="M40 50L28 38M120 50L132 38" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M42 68L14 76M44 78L20 92M118 68l28 8M116 78l24 14" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="68" cy="46" r="5" fill="#fff"/><circle cx="92" cy="46" r="5" fill="#fff"/><circle cx="68" cy="46" r="2.2" fill="#0B2A3C"/><circle cx="92" cy="46" r="2.2" fill="#0B2A3C"/>`,
      squid: `<path d="M80 6C104 24 106 52 80 66 54 52 56 24 80 6Z" fill="${c}"/><path d="M62 34L46 46 62 54ZM98 34l16 12-16 8Z" fill="${c}" opacity=".7"/><path d="M62 66c-6 14-14 18-20 26M71 68c-2 12-6 20-8 28M80 68v28M89 68c2 12 6 20 8 28M98 66c6 14 14 18 20 26" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="70" cy="50" r="4" fill="#fff"/><circle cx="90" cy="50" r="4" fill="#fff"/><circle cx="70" cy="50" r="2" fill="#0B2A3C"/><circle cx="90" cy="50" r="2" fill="#0B2A3C"/>`
    };
    return `<svg viewBox="0 0 160 100" aria-hidden="true" focusable="false">${(shapes[kind] || shapes.fish).replace(/2\.200/g, '2.2')}</svg>`;
  }

  /* ---------- state ---------- */
  const STORE_KEY = 'fishshop-cart-v1';
  let cart = {};      // { productId: kg }
  let filter = 'all';
  let query = '';
  let last = { msg: '', url: '' };
  let live = false, ratesInfo = null;   // live = prices come from the admin panel
  try { cart = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(id => { if (!getProduct(id)) delete cart[id]; });
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } };

  /* ---------- config binding ---------- */
  $$('[data-cfg]').forEach(el => { el.textContent = getPath(el.dataset.cfg) ?? ''; });
  const links = {
    wa: waUrl('Hello, I would like to order fish.'),
    tel: 'tel:' + C.shop.phoneTel,
    maps: C.shop.mapsUrl,
    mail: 'mailto:' + C.shop.email
  };
  $$('[data-link]').forEach(el => { el.href = links[el.dataset.link] || '#'; });
  const hoursEl = $('#hours');
  if (hoursEl) hoursEl.innerHTML = C.shop.hours.map(([d, t]) => `<div><dt>${esc(d)}</dt><dd>${esc(t)}</dd></div>`).join('');
  const D = C.delivery;
  const dText = $('#deliveryText');
  if (dText) dText.textContent = `Home delivery charge: ${money(D.fee)}` +
    (D.freeAbove ? `, free for orders of ${money(D.freeAbove)} or more` : '') +
    `. Store pickup: ${D.pickupFee ? money(D.pickupFee) : 'no charge'}.` +
    (D.minOrder ? ` Minimum order: ${money(D.minOrder)}.` : '');
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
  const hero = $('.hero');
  if (hero && C.heroImage) hero.style.setProperty('--hero-img', `url("${C.heroImage.replace(/"/g, '')}")`);
  const heroArt = $('#heroArt'); if (heroArt) heroArt.innerHTML = art('fish', '#7FE0DA');
  const aboutArt = $('#aboutArt');
  if (aboutArt) { if (C.aboutImage) aboutArt.style.backgroundImage = `url("${C.aboutImage.replace(/"/g, '')}")`; else aboutArt.innerHTML = art('fish', '#ffffff'); }
  const emptyArt = $('#emptyArt'); if (emptyArt) emptyArt.innerHTML = art('fish', '#9CCBD6');

  /* ---------- categories & filter chips ---------- */
  const catGrid = $('#catGrid');
  if (catGrid) catGrid.innerHTML = C.categories.map(c =>
    `<button class="cat" type="button" data-cat="${esc(c.id)}"><span class="ico">${art(c.kind, c.color)}</span><strong>${esc(c.name)}</strong><span class="ta" lang="ta">${esc(c.tamil)}</span></button>`).join('');

  const chips = $('#chips');
  const renderChips = () => {
    if (!chips) return;
    chips.innerHTML = [{ id: 'all', name: 'All' }, ...C.categories].map(c =>
      `<button class="chip" type="button" data-cat="${esc(c.id)}" aria-pressed="${filter === c.id}">${esc(c.name)}</button>`).join('');
  };

  /* ---------- products ---------- */
  const grid = $('#productGrid');
  const matches = p => {
    const inCat = filter === 'all' || p.category === filter || (filter === 'cleaned' && p.cleaningAvailable);
    const q = query.trim().toLowerCase();
    return inCat && (!q || [p.name, p.tamil, p.note].join(' ').toLowerCase().includes(q));
  };
  function renderProducts() {
    const list = C.products.filter(matches);
    grid.innerHTML = list.map(p => {
      const media = (p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" data-fallback="${esc(p.kind)}|${esc(p.color)}">` : '') + art(p.kind, p.color);
      return `<article class="card" data-id="${esc(p.id)}" data-qty="${Q.min}">
        <div class="card-media">${media}<span class="badge ${p.available ? 'ok' : 'out'}">${p.available ? 'Available' : 'Sold out'}</span></div>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p class="ta" lang="ta">${esc(p.tamil)}</p>
          <p class="note">${esc(p.note)}</p>
          <p class="price"><strong>${money(p.price)}</strong><span>per kg</span><small>${live ? "today's rate" : 'demo price'}</small></p>
          <div class="buy">
            <div class="stepper" role="group" aria-label="Quantity in kg for ${esc(p.name)}">
              <button type="button" data-act="dec" aria-label="Decrease quantity" ${p.available ? '' : 'disabled'}>−</button>
              <output aria-live="polite">${kg(Q.min)}</output>
              <button type="button" data-act="inc" aria-label="Increase quantity" ${p.available ? '' : 'disabled'}>+</button>
            </div>
            <button class="btn primary" type="button" data-act="add" ${p.available ? '' : 'disabled'}>${p.available ? 'Add to cart' : 'Unavailable'}</button>
          </div>
        </div></article>`;
    }).join('');
    $('#noResults').hidden = list.length > 0;
    $('#resultCount').textContent = `${list.length} product${list.length === 1 ? '' : 's'} shown`;
  }
  // If a photo fails to load, the built-in illustration underneath is shown instead.
  grid.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

  grid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const card = btn.closest('.card'); const p = getProduct(card.dataset.id);
    let q = parseFloat(card.dataset.qty);
    if (btn.dataset.act === 'add') {
      if (!p.available) return;
      cart[p.id] = clampQty((cart[p.id] || 0) + q);
      save(); renderCart(); toast(`${p.name} added to cart`);
      return;
    }
    q = clampQty(q + (btn.dataset.act === 'inc' ? Q.step : -Q.step));
    card.dataset.qty = q; $('output', card).textContent = kg(q);
  });

  const setFilter = id => { filter = id; renderChips(); renderProducts(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    setFilter(b.dataset.cat);
    if (b.classList.contains('cat')) $('#shop').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- search ---------- */
  const q = $('#q');
  if (q) {
    q.addEventListener('input', () => { query = q.value; renderProducts(); });
    $('#searchForm').addEventListener('submit', e => { e.preventDefault(); $('#shop').scrollIntoView({ behavior: 'smooth' }); });
  }

  /* ---------- cart ---------- */
  const mode = () => ($('input[name="mode"]:checked') || {}).value || 'delivery';
  function totals() {
    const items = Object.entries(cart).map(([id, qty]) => ({ p: getProduct(id), qty })).filter(i => i.p);
    const subtotal = items.reduce((s, i) => s + i.p.price * i.qty, 0);
    let fee = 0, free = false;
    if (mode() === 'pickup') fee = D.pickupFee;
    else if (D.freeAbove && subtotal >= D.freeAbove) { fee = 0; free = true; }
    else fee = D.fee;
    return { items, subtotal, fee, free, total: subtotal + fee };
  }
  function renderCart() {
    const t = totals();
    const n = t.items.length;
    const has = n > 0;
    $('#emptyCart').hidden = has; $('#cartFilled').hidden = !has; $('#formPanel').hidden = !has;
    $('#lines').innerHTML = t.items.map(({ p, qty }) => `<li class="line" data-id="${esc(p.id)}">
        <div class="thumb">${art(p.kind, p.color)}${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}</div>
        <div class="info"><strong>${esc(p.name)}</strong><span>${money(p.price)} per kg${live ? '' : ' (demo price)'}</span>${p.available ? '' : '<span class="bad"> Marked unavailable by shop</span>'}</div>
        <div class="stepper" role="group" aria-label="Quantity for ${esc(p.name)}">
          <button type="button" data-act="dec" aria-label="Decrease quantity of ${esc(p.name)}" ${qty <= Q.min ? 'disabled' : ''}>−</button>
          <output>${kg(qty)}</output>
          <button type="button" data-act="inc" aria-label="Increase quantity of ${esc(p.name)}" ${qty >= Q.max ? 'disabled' : ''}>+</button>
        </div>
        <div class="lt">${money(p.price * qty)}</div>
        <button class="rm" type="button" data-act="rm" aria-label="Remove ${esc(p.name)} from cart">✕</button>
      </li>`).join('');
    $('#subtotal').textContent = money(t.subtotal);
    $('#deliveryLabel').textContent = mode() === 'pickup' ? 'Store pickup' : 'Delivery charge';
    $('#deliveryFee').textContent = t.fee === 0 ? 'Free' : money(t.fee);
    $('#grandTotal').textContent = money(t.total);

    const fh = $('#freeHint');
    if (mode() === 'delivery' && D.freeAbove && t.subtotal < D.freeAbove && has) { fh.hidden = false; fh.textContent = `Add ${money(D.freeAbove - t.subtotal)} more for free delivery.`; }
    else fh.hidden = true;
    const mh = $('#minHint');
    if (has && D.minOrder && t.subtotal < D.minOrder) { mh.hidden = false; mh.textContent = `Minimum order is ${money(D.minOrder)}. Add ${money(D.minOrder - t.subtotal)} more to place your order.`; }
    else mh.hidden = true;

    // header + mobile bar
    const cc = $('#cartCount'); if (cc) cc.textContent = n;
    const cl = $('#cartLink'); if (cl) cl.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`);
    $('#barText').textContent = `View cart · ${n} item${n === 1 ? '' : 's'}`;
    $('#barTotal').textContent = money(t.total);
    updateBar();
  }
  $('#lines').addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);
  $('#lines').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const id = btn.closest('.line').dataset.id;
    if (btn.dataset.act === 'rm') delete cart[id];
    else cart[id] = clampQty(cart[id] + (btn.dataset.act === 'inc' ? Q.step : -Q.step));
    save(); renderCart();
    const next = $(`.line[data-id="${id}"] [data-act="${btn.dataset.act}"]`); if (next && !next.disabled) next.focus();
  });
  $('#clearCart').addEventListener('click', () => { cart = {}; save(); hideResult(); renderCart(); });

  /* mobile cart bar: hide while the cart section is on screen */
  let cartVisible = false;
  const updateBar = () => { $('#cartBar').hidden = !(Object.keys(cart).length && !cartVisible); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { cartVisible = es[0].isIntersecting; updateBar(); }).observe($('#cart'));

  /* ---------- checkout form ---------- */
  const form = $('#checkoutForm');
  $('#f-time').innerHTML = `<option value="">Select a time</option>` + D.timeSlots.map(s => `<option>${esc(s)}</option>`).join('');

  function onMode() {
    const pickup = mode() === 'pickup';
    $('#deliveryFields').hidden = pickup;
    $('#timeLabel').innerHTML = (pickup ? 'Preferred pickup time' : 'Preferred delivery time') + ' <b aria-hidden="true">*</b>';
    clearErrors(); renderCart();
  }
  $$('input[name="mode"]').forEach(r => r.addEventListener('change', onMode));

  const fields = ['name', 'phone', 'address', 'area', 'pin', 'time'];
  const el = id => $('#f-' + id);
  function setErr(id, msg) {
    const e = $('#err-' + id), f = el(id);
    if (!e || !f) return;
    e.hidden = !msg; e.textContent = msg || '';
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function clearErrors() { fields.forEach(f => setErr(f, '')); const fe = $('#err-form'); fe.hidden = true; }
  fields.forEach(id => el(id).addEventListener('input', () => setErr(id, '')));

  const cleanPhone = v => String(v).replace(/[\s\-()]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '');

  function validate() {
    const pickup = mode() === 'pickup';
    const errs = {};
    const v = id => el(id).value.trim();
    if (v('name').length < 2) errs.name = 'Enter your name.';
    if (!/^[6-9]\d{9}$/.test(cleanPhone(v('phone')))) errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!pickup) {
      if (v('address').length < 8) errs.address = 'Enter your full delivery address (house number, street, landmark).';
      if (!v('area')) errs.area = 'Enter your area.';
      if (!/^\d{6}$/.test(v('pin'))) errs.pin = 'Enter a 6-digit pincode.';
      else if (D.servedPincodes.length && !D.servedPincodes.includes(v('pin'))) errs.pin = 'Sorry, we do not deliver to this pincode yet. Choose store pickup or ask the shop on WhatsApp.';
    }
    if (!v('time')) errs.time = pickup ? 'Choose a pickup time.' : 'Choose a delivery time.';
    fields.forEach(id => setErr(id, errs[id] || ''));
    return errs;
  }

  function orderId() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${C.shop.orderPrefix}-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function buildMessage(id) {
    const t = totals(); const pickup = mode() === 'pickup';
    const v = k => el(k).value.trim();
    const lines = t.items.map((i, n) => `${n + 1}. ${i.p.name} - ${kg(i.qty)} x ${money(i.p.price)}/kg = ${money(i.p.price * i.qty)}`);
    const addr = pickup ? 'Store pickup (no delivery address)' : `${v('address')}, ${v('area')} - ${v('pin')}`;
    return [
      `*New order request - ${C.shop.name}*`,
      `Order ID: ${id}`,
      '',
      '*Items*',
      ...lines,
      '',
      `Subtotal: ${money(t.subtotal)}`,
      `${pickup ? 'Store pickup' : 'Delivery fee'}: ${t.fee === 0 ? 'Free' : money(t.fee)}`,
      `*Estimated total: ${money(t.total)}*`,
      live ? `(Rates as updated by the shop on ${fmtDate(ratesInfo.updatedAt)}. Final amount to be confirmed after weighing.)` : '(Prices as shown on the website. Final amount to be confirmed after weighing.)',
      '',
      '*Customer details*',
      `Name: ${v('name')}`,
      `Phone: ${cleanPhone(v('phone'))}`,
      `Option: ${pickup ? 'Store pickup' : 'Home delivery'}`,
      `Address: ${addr}`,
      `${pickup ? 'Pickup' : 'Delivery'} time: ${v('time')}`,
      `Cleaning: ${$('input[name="cleaning"]:checked').value}`,
      `Instructions: ${v('notes') || 'None'}`,
      '',
      'Please confirm availability, final amount and time. Thank you!'
    ].join('\n');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideResult();
    const t = totals();
    const fe = $('#err-form');
    const errs = validate();
    let formErr = '';
    if (!t.items.length) formErr = 'Your cart is empty. Add at least one item.';
    else if (D.minOrder && t.subtotal < D.minOrder) formErr = `Minimum order is ${money(D.minOrder)}.`;
    else if (t.items.some(i => !i.p.available)) formErr = 'Remove items marked unavailable from your cart, or ask the shop on WhatsApp.';
    fe.hidden = !formErr; fe.textContent = formErr;
    const firstBad = fields.find(id => errs[id]);
    if (firstBad) { el(firstBad).focus(); return; }
    if (formErr) { fe.scrollIntoView({ block: 'center' }); return; }

    const id = orderId();
    last = { id, msg: buildMessage(id) };
    last.url = waUrl(last.msg);
    const A = C.automation || { mode: 'off' };

    if (A.mode === 'off') {                      // plain WhatsApp link: customer presses Send
      const w = window.open(last.url, '_blank');
      if (w) { try { w.opener = null; } catch (err) { /* ignore */ } }
      else window.location.href = last.url;      // popup blocked: open in the same tab
      showResult('manual');
      return;
    }

    setBusy(true);
    try {
      if (A.mode === 'demo') { await new Promise(r => setTimeout(r, 900)); showResult('demo'); }
      else { await sendToServer(A); showResult('sent'); }
    } catch (err) {
      console.warn('Automatic send failed:', err);
      showResult('fallback');
    } finally { setBusy(false); }
  });

  function setBusy(b) {
    const btn = $('#submitBtn');
    btn.disabled = b; btn.classList.toggle('busy', b);
    $('span', btn).textContent = b ? 'Sending your order…' : 'Place Order on WhatsApp';
  }
  async function sendToServer(A) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(A.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ orderId: last.id, message: last.msg, phone: cleanPhone(el('phone').value), hp: $('#f-hp').value })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
    } finally { clearTimeout(to); }
  }

  const result = $('#waResult');
  function showResult(kind) {
    const phone = cleanPhone(el('phone').value);
    const copy = {
      sent: ['Order request sent to the shop.', `Your order request ${last.id} was sent to the shop on WhatsApp. It is not confirmed yet. The shop will message you on ${phone} to confirm availability, the final amount and the time.`, 'Message the shop on WhatsApp'],
      demo: ['Preview: your order would be sent now.', `Order ${last.id} is shown below as the shop would receive it. Nothing was actually sent.`, 'Open WhatsApp (preview only)'],
      fallback: ['We could not send it automatically. Please send it on WhatsApp.', `Tap the button, then press Send in WhatsApp. Your order ${last.id} is not placed until the shop receives that message and replies to confirm.`, 'Send order on WhatsApp'],
      manual: ['Almost done. Send the message in WhatsApp.', `WhatsApp should have opened with your order ${last.id}. Tap Send there. The shop will reply to confirm availability, the final amount and the delivery time.`, 'Open WhatsApp again']
    }[kind];
    $('#resTitle').textContent = copy[0]; $('#resText').textContent = copy[1];
    $('#resOpen').textContent = copy[2]; $('#resOpen').href = last.url;
    $('#resDemo').hidden = kind !== 'demo';
    $('#resPreviewWrap').hidden = kind !== 'demo'; $('#resPreview').textContent = last.msg;
    result.hidden = false; result.focus();
  }
  function hideResult() { result.hidden = true; }
  $('#resCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(last.msg); toast('Order message copied'); }
    catch (e) { toast('Could not copy. Use "Open WhatsApp again".'); }
  });
  $('#resNew').addEventListener('click', () => { cart = {}; save(); form.reset(); onMode(); hideResult(); renderCart(); window.scrollTo({ top: $('#shop').offsetTop - 90, behavior: 'smooth' }); });

  /* ---------- nav + toast ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });
  }
  let tt;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- daily rates (set in admin.html) ---------- */
  const fmtDate = iso => { try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  const noticeEl = $('#rateNotice'), noticeDemo = noticeEl ? noticeEl.innerHTML : '';
  const imgUrl = id => (C.rates && typeof C.rates.imageUrl === 'function') ? C.rates.imageUrl(id) : ((C.rates && C.rates.imageEndpoint) || '/api/img') + '/' + id;
  const baseProducts = JSON.parse(JSON.stringify(C.products));
  function applyRates(r) {
    if (!r || !r.products) return;
    const del = new Set(r.deleted || []);
    const list = baseProducts.filter(p => !del.has(p.id)).map(p => Object.assign({}, p));
    list.forEach(p => {
      const u = r.products[p.id]; if (!u) return;
      if (Number.isFinite(u.price) && u.price > 0) p.price = u.price;
      if (typeof u.available === 'boolean') p.available = u.available;
      if (u.img) p.image = imgUrl(u.img);
    });
    Object.keys(r.products).forEach(id => {            // fish added from the admin panel
      const u = r.products[id];
      if (u && u.custom && u.name && !list.some(p => p.id === id)) list.push({ id, name: u.name, tamil: u.tamil || '', category: u.category,
        price: u.price, available: u.available !== false, cleaningAvailable: true, note: u.note || '', image: u.img ? imgUrl(u.img) : '', color: u.color || '#0B6FA4', kind: u.kind || 'fish' });
    });
    C.products = list;
    Object.keys(cart).forEach(id => { if (!getProduct(id)) delete cart[id]; });
    save();
    live = true; ratesInfo = { updatedAt: r.updatedAt, message: r.message || '' };
    if (noticeEl) {
      noticeEl.innerHTML = `<strong>Today's rates</strong>${ratesInfo.updatedAt ? ' (updated ' + esc(fmtDate(ratesInfo.updatedAt)) + ')' : ''}. ` +
        (ratesInfo.message ? esc(ratesInfo.message.replace(/[.!]+$/, '')) + '. ' : '') +
        'Prices are per kg and can change during the day. Availability is set by the shop and confirmed on WhatsApp.';
    }
    const pn = $('#priceNote'); if (pn) pn.textContent = 'Rates are updated daily by the shop.';
    renderProducts(); renderCart();
  }
  window.ShopApp = { applyRates };
  if (C.rates && C.rates.endpoint) {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 6000);
    fetch(C.rates.endpoint, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(d => { if (d && d.ok && d.rates) applyRates(d.rates); })
      .catch(() => { /* keep config prices (demo) */ }).finally(() => clearTimeout(tm));
  }

  /* ---------- init ---------- */
  renderChips(); renderProducts(); onMode();
})();
