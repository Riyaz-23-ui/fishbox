/* Admin panel: update daily rates, add fish, delete fish. Used by admin.html. */
(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const toDataUrl = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob); });
  const loadBitmap = async file => {
    if (window.createImageBitmap) return createImageBitmap(file);
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; });
  };
  /* shrink a photo in the browser (max 900 px, WebP/JPEG) so pages load fast */
  async function resizeImage(file, max = 900) {
    const bmp = await loadBitmap(file);
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const toBlob = (t, q) => new Promise(r => c.toBlob(r, t, q));
    let blob = await toBlob('image/webp', 0.82);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.85);
    return blob;
  }

  function realApi(endpoint, imageEndpoint) {
    const call = async (method, pw, body) => {
      const res = await fetch(endpoint, { method, cache: 'no-store',
        headers: Object.assign({ 'Content-Type': 'application/json' }, pw ? { Authorization: 'Bearer ' + pw } : {}),
        body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw { code: 401 };
      if (!res.ok || !data.ok) throw { code: res.status, message: data.error };
      return data;
    };
    return {
      load: async () => (await call('GET')).rates,
      verify: pw => call('POST', pw, { verify: true }),
      save: async (payload, pw) => (await call('POST', pw, payload)).rates,
      uploadImage: async (blob, pw) => {
        const res = await fetch(imageEndpoint || '/api/img', { method: 'POST', headers: { 'Content-Type': blob.type, Authorization: 'Bearer ' + pw }, body: blob });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw { code: 401 };
        if (!res.ok || !data.ok) throw { code: res.status, message: data.error };
        return data;
      }
    };
  }

  function mount(root, opts) {
    const C = opts.config, api = opts.api;
    const baseProducts = JSON.parse(JSON.stringify(C.products));   // the fish listed in config.js
    const imageUrl = opts.imageUrl || (id => ((C.rates && C.rates.imageEndpoint) || '/api/img') + '/' + id);
    const resize = opts.resize || resizeImage;
    let fileTarget = null, newPhoto = null, photoMsg = '';
    let pw = '', meta = null, items = [], message = '';
    try { pw = sessionStorage.getItem('fish-admin-pw') || ''; } catch (e) { /* ignore */ }
    const $ = s => root.querySelector(s);
    const fmt = iso => { try { return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

    /* ---- build the working list from the saved rates ---- */
    function buildItems() {
      const r = (meta && meta.products) || {}, del = new Set((meta && meta.deleted) || []);
      items = baseProducts.map(p => {
        const v = r[p.id];
        const it = { id: p.id, name: p.name, tamil: p.tamil, category: p.category, kind: p.kind, color: p.color, note: p.note,
          price: v ? v.price : p.price, available: v ? v.available : p.available, custom: false, removed: del.has(p.id), isNew: false,
          img: (v && v.img) || '', preview: '', cfgImage: p.image || '' };
        it.orig = { price: it.price, available: it.available, removed: it.removed, img: it.img };
        return it;
      });
      Object.keys(r).forEach(id => {
        const v = r[id]; if (!v.custom) return;
        const it = { id, name: v.name, tamil: v.tamil || '', category: v.category, kind: v.kind, color: v.color, note: v.note || '',
          price: v.price, available: v.available, custom: true, removed: false, isNew: false, img: v.img || '', preview: '', cfgImage: '' };
        it.orig = { price: it.price, available: it.available, removed: false, img: it.img };
        items.push(it);
      });
      message = (meta && meta.message) || '';
    }

    /* ---- login ---- */
    function loginView(msg) {
      root.innerHTML = `<section class="adm-card">
        <h2>Shop admin</h2>
        ${opts.note ? `<p class="demo-banner">${opts.note}</p>` : ''}
        <p>Enter the admin password to update fish rates, add fish or delete fish.</p>
        <form id="admLogin" novalidate>
          <div class="field"><label for="admPw">Admin password</label>
          <input id="admPw" type="password" autocomplete="current-password" required></div>
          <p class="err" id="admErr" role="alert" ${msg ? '' : 'hidden'}>${esc(msg || '')}</p>
          <button class="btn primary full" type="submit">Sign in</button>
        </form></section>`;
      $('#admLogin').addEventListener('submit', async e => {
        e.preventDefault();
        const v = $('#admPw').value; if (!v) return;
        const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Checking…';
        try { await api.verify(v); pw = v; try { sessionStorage.setItem('fish-admin-pw', pw); } catch (x) { /* ignore */ } start(); }
        catch (err) { loginView(err && err.code === 401 ? 'Wrong password. Try again.' : 'Could not reach the server. ' + (err && err.message ? err.message : 'Check your connection and setup.')); }
      });
      const i = $('#admPw'); if (i) i.focus();
    }

    /* ---- main panel ---- */
    function panelView(okMsg) {
      root.innerHTML = `<section class="adm-card">
        <div class="adm-top"><h2>Fish and rates</h2><button class="link-btn" type="button" id="admOut">Sign out</button></div>
        ${opts.note ? `<p class="demo-banner">${opts.note}</p>` : ''}
        <p class="fine" id="admMeta"></p>

        <div class="field"><label for="admMsg">Message for customers <span class="opt">(optional)</span></label>
          <input id="admMsg" type="text" maxlength="120" placeholder="e.g. Fresh seer fish arrived this morning" value="${esc(message)}"></div>

        <details class="adm-add" id="admAddBox">
          <summary>+ Add a new fish</summary>
          <div class="adm-addform">
            <div class="field"><label for="nf-name">Fish name <b aria-hidden="true">*</b></label>
              <input id="nf-name" type="text" maxlength="60" placeholder="e.g. Red Snapper (Sankara)"></div>
            <div class="field"><label for="nf-tamil">Tamil name <span class="opt">(optional)</span></label>
              <input id="nf-tamil" type="text" maxlength="60" placeholder="e.g. சங்கரா" lang="ta"></div>
            <div class="two">
              <div class="field"><label for="nf-cat">Category</label>
                <select id="nf-cat">${C.categories.filter(c => c.id !== 'cleaned').map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
              <div class="field"><label for="nf-price">Price per kg (${esc(C.currency)}) <b aria-hidden="true">*</b></label>
                <input id="nf-price" type="number" inputmode="decimal" min="1" max="100000" step="1"></div>
            </div>
            <div class="field"><label for="nf-note">Short note <span class="opt">(optional)</span></label>
              <input id="nf-note" type="text" maxlength="120" placeholder="e.g. Good for fry and curry"></div>
            <div class="field"><label>Photo <span class="opt">(optional)</span></label>
              <div class="adm-photo-add"><span class="adm-thumb" id="nf-thumb"></span>
              <button class="btn ghost sm" type="button" id="nf-photo">Choose photo</button>
              <button class="link-btn" type="button" id="nf-photo-x" hidden>Remove</button></div></div>
            <label class="adm-av"><input id="nf-av" type="checkbox" checked><span>Available today</span></label>
            <p class="err" id="nf-err" role="alert" hidden></p>
            <button class="btn primary" type="button" id="nf-add">Add to list</button>
          </div>
        </details>

        <div class="adm-tools">
          <button class="btn ghost" type="button" data-bulk="1">Mark all available</button>
          <button class="btn ghost" type="button" data-bulk="0">Mark all sold out</button>
          <button class="btn ghost" type="button" id="admUndo">Undo changes</button>
        </div>
        <input type="file" id="admFile" accept="image/*" class="sr" tabindex="-1" aria-hidden="true">
        <p class="err" id="admPhotoErr" role="alert" ${photoMsg ? '' : 'hidden'}>${esc(photoMsg)}</p>
        <ul class="adm-list" id="admList"></ul>
        <p class="err block" id="admErr" role="alert" hidden></p>
        <p class="hint" id="admOk" role="status" ${okMsg ? '' : 'hidden'}>${esc(okMsg || '')}</p>
        <button class="btn primary lg full" type="button" id="admSave">Save changes</button>
        <p class="fine">Nothing changes for customers until you press Save. Deleted fish can be brought back with Restore.</p>
      </section>`;
      paintMeta(); renderList();
      $('#admOut').addEventListener('click', () => { pw = ''; try { sessionStorage.removeItem('fish-admin-pw'); } catch (e) { /* ignore */ } loginView(); });
      $('#admUndo').addEventListener('click', () => { buildItems(); panelView(); });
      root.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', () => {
        sync(); items.forEach(i => { if (!i.removed) i.available = b.dataset.bulk === '1'; }); renderList();
      }));
      $('#admList').addEventListener('input', markDirty);
      $('#admList').addEventListener('change', markDirty);
      $('#admList').addEventListener('click', e => {
        const b = e.target.closest('[data-do]'); if (!b) return;
        sync(); const id = b.closest('.adm-row').dataset.id; const i = items.findIndex(x => x.id === id);
        if (b.dataset.do === 'photo') { pickPhoto(id); return; }
        if (b.dataset.do === 'nophoto') { items[i].img = ''; items[i].preview = ''; renderList(); return; }
        if (b.dataset.do === 'del') { if (items[i].isNew) items.splice(i, 1); else items[i].removed = true; }
        else items[i].removed = false;
        renderList();
      });
      $('#nf-add').addEventListener('click', addFish);
      $('#nf-photo').addEventListener('click', () => pickPhoto('__new'));
      $('#nf-photo-x').addEventListener('click', () => { newPhoto = null; paintNewPhoto(); });
      $('#admFile').addEventListener('change', onFile);
      paintNewPhoto();
      $('#admSave').addEventListener('click', save);
    }

    function paintMeta() {
      $('#admMeta').textContent = meta && meta.updatedAt ? 'Last saved: ' + fmt(meta.updatedAt) : 'No rates saved yet. Customers currently see the demo prices.';
    }

    function renderList() {
      $('#admList').innerHTML = items.map(i => i.removed ? `
        <li class="adm-row removed" data-id="${esc(i.id)}">
          <div class="adm-name"><strong>${esc(i.name)}</strong><span>Will be deleted when you save</span></div>
          <button class="btn ghost sm" type="button" data-do="restore" aria-label="Restore ${esc(i.name)}">Restore</button>
        </li>` : `
        <li class="adm-row" data-id="${esc(i.id)}">
          <span class="adm-thumb">${thumb(i)}</span>
          <div class="adm-name"><strong>${esc(i.name)} ${i.isNew ? '<em class="tag">New</em>' : ''}</strong><span lang="ta">${esc(i.tamil)}</span></div>
          <label class="adm-price"><span class="sr">Price per kg for ${esc(i.name)}</span><span aria-hidden="true">${esc(C.currency)}</span>
            <input type="number" inputmode="decimal" min="1" max="100000" step="1" value="${i.price}"><span class="unit" aria-hidden="true">/kg</span></label>
          <label class="adm-av"><input type="checkbox" ${i.available ? 'checked' : ''}><span>Available</span></label>
          <button class="adm-del" type="button" data-do="del" aria-label="Delete ${esc(i.name)}">Delete</button>
          <div class="adm-photo">
            ${i.uploading ? '<span class="fine">Uploading photo…</span>' : `<button class="btn ghost sm" type="button" data-do="photo" aria-label="${(i.preview || i.img || i.cfgImage) ? 'Change' : 'Add'} photo for ${esc(i.name)}">${(i.preview || i.img || i.cfgImage) ? 'Change photo' : 'Add photo'}</button>
            ${(i.preview || i.img) ? `<button class="link-btn" type="button" data-do="nophoto" aria-label="Remove photo of ${esc(i.name)}">Remove photo</button>` : ''}`}
          </div>
        </li>`).join('') || '<li class="fine">No fish in the list. Add a fish above.</li>';
      markDirty();
    }
    function thumb(i) {
      const src = i.preview || (i.img ? imageUrl(i.img) : '') || i.cfgImage;
      return src ? `<img src="${esc(src)}" alt="">` : `<span class="adm-ph" aria-hidden="true">${esc((i.name || '?').trim().charAt(0).toUpperCase())}</span>`;
    }
    function paintNewPhoto() {
      const t = $('#nf-thumb'); if (!t) return;
      t.innerHTML = newPhoto ? `<img src="${esc(newPhoto.preview)}" alt="Selected photo">` : '<span class="adm-ph" aria-hidden="true">?</span>';
      $('#nf-photo').textContent = newPhoto ? 'Change photo' : 'Choose photo'; $('#nf-photo-x').hidden = !newPhoto;
    }
    /* ---- photos: choose, shrink, upload ---- */
    function pickPhoto(target) { fileTarget = target; const f = $('#admFile'); f.value = ''; f.click(); }
    async function onFile(e) {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const err = $('#admPhotoErr'); err.hidden = true;
      if (!/^image\//.test(file.type) || file.size > 20 * 1024 * 1024) { err.hidden = false; err.textContent = 'Choose a photo (JPG, PNG or WebP) under 20 MB.'; return; }
      sync(); const target = fileTarget; const it = items.find(x => x.id === target);
      if (it) { it.uploading = true; renderList(); } else { $('#nf-photo').disabled = true; $('#nf-photo').textContent = 'Uploading…'; }
      try {
        const blob = await resize(file);
        const [up, preview] = await Promise.all([api.uploadImage(blob, pw), toDataUrl(blob)]);
        if (target === '__new') newPhoto = { id: up.id, preview };
        else if (it) { it.img = up.id; it.preview = preview; }
      } catch (x) {
        if (x && x.code === 401) { loginView('Session expired. Sign in again.'); return; }
        err.hidden = false; err.textContent = 'Could not upload the photo. ' + (x && x.message ? x.message : 'Try a smaller photo or check your connection.');
      }
      if (it) { it.uploading = false; renderList(); } else { $('#nf-photo').disabled = false; paintNewPhoto(); }
    }
    function sync() {                                  // copy typed values from the page into items
      message = ($('#admMsg') || {}).value || '';
      root.querySelectorAll('.adm-row:not(.removed)').forEach(r => {
        const it = items.find(x => x.id === r.dataset.id); if (!it) return;
        const pr = parseFloat(r.querySelector('input[type=number]').value);
        it.price = isNaN(pr) ? it.price : pr; it.available = r.querySelector('input[type=checkbox]').checked;
      });
    }
    function markDirty() {
      root.querySelectorAll('.adm-row:not(.removed)').forEach(r => {
        const it = items.find(x => x.id === r.dataset.id); if (!it) return;
        const pr = parseFloat(r.querySelector('input[type=number]').value), av = r.querySelector('input[type=checkbox]').checked;
        r.classList.toggle('dirty', it.isNew || pr !== it.orig.price || av !== it.orig.available || (it.img || '') !== (it.orig.img || ''));
        r.classList.toggle('off', !av);
      });
    }

    /* ---- add a fish ---- */
    function addFish() {
      sync();
      const err = $('#nf-err'); err.hidden = true;
      const name = $('#nf-name').value.replace(/\s+/g, ' ').trim(), price = parseFloat($('#nf-price').value);
      if (!name) { err.hidden = false; err.textContent = 'Enter the fish name.'; $('#nf-name').focus(); return; }
      if (!(price >= 1 && price <= 100000)) { err.hidden = false; err.textContent = 'Enter a price between 1 and 100000.'; $('#nf-price').focus(); return; }
      if (items.some(i => !i.removed && i.name.toLowerCase() === name.toLowerCase())) { err.hidden = false; err.textContent = 'A fish with this name is already in the list.'; return; }
      const cat = C.categories.find(c => c.id === $('#nf-cat').value) || C.categories[0];
      const rid = Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, 'x');
      items.push({ id: 'c-' + rid + Date.now().toString(36).slice(-3), name, tamil: $('#nf-tamil').value.trim(), category: cat.id, kind: cat.kind, color: cat.color,
        note: $('#nf-note').value.trim(), price, available: $('#nf-av').checked, custom: true, removed: false, isNew: true,
        img: newPhoto ? newPhoto.id : '', preview: newPhoto ? newPhoto.preview : '', cfgImage: '', orig: { price: -1, available: null, removed: false, img: '' } });
      newPhoto = null; paintNewPhoto();
      ['name', 'tamil', 'price', 'note'].forEach(k => { $('#nf-' + k).value = ''; });
      renderList();
      const ok = $('#admOk'); ok.hidden = false; ok.textContent = `"${name}" added to the list below. Press Save changes to show it to customers.`;
      const rows = root.querySelectorAll('.adm-row'); rows[rows.length - 1].scrollIntoView({ block: 'center' });
    }

    /* ---- save ---- */
    async function save() {
      sync();
      const err = $('#admErr'), btn = $('#admSave');
      err.hidden = true; $('#admOk').hidden = true;
      const products = {}, deleted = []; let bad = null, added = 0, removedCount = 0;
      items.forEach(i => {
        if (i.removed) { if (!i.custom) deleted.push(i.id); removedCount++; return; }
        if (!(i.price >= 1 && i.price <= 100000)) { bad = bad || i; return; }
        products[i.id] = { price: i.price, available: i.available };
        if (i.img) products[i.id].img = i.img;
        if (i.custom) { Object.assign(products[i.id], { custom: true, name: i.name, tamil: i.tamil, category: i.category, kind: i.kind, color: i.color, note: i.note }); if (i.isNew) added++; }
      });
      if (bad) { err.hidden = false; err.textContent = `Enter a price between 1 and 100000 for ${bad.name}.`; return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        meta = await api.save({ products, deleted, message: message.trim() }, pw);
        buildItems();
        panelView('Saved. Customers now see these changes.' + (added ? ` ${added} fish added.` : '') + (removedCount ? ` ${removedCount} fish deleted.` : ''));
      } catch (e) {
        if (e && e.code === 401) { loginView('Session expired. Sign in again.'); return; }
        err.hidden = false; err.textContent = 'Could not save. ' + (e && e.message ? e.message : 'Check your connection and try again.');
        btn.disabled = false; btn.textContent = 'Save changes';
      }
    }

    async function start() {
      root.innerHTML = '<p class="adm-card">Loading…</p>';
      try { meta = (await api.load()) || null; } catch (e) { meta = null; }
      buildItems(); panelView();
    }

    if (pw) api.verify(pw).then(start).catch(() => loginView()); else loginView();
  }

  window.AdminPanel = { mount, realApi, resizeImage };
})();
