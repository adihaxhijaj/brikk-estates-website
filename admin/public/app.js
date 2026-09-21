// Brikk Estates admin — vanilla JS, no build step.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const SITE = 'https://www.brikkestates.com';
const MAX_EDGE = 2000;

const state = { user: null, meta: null, listings: [], filter: 'all', editing: null, photos: [], publish: null };

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'X-Brikk-Admin': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && path !== '/api/login') { showLogin(); throw new Error('Please log in.'); }
  if (!res.ok) throw new Error((data.problems ?? ['Something went wrong.']).join('\n'));
  return data;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 4000);
}

const el = (tag, props = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function showLogin() {
  $('#view-app').hidden = true;
  $('#view-login').hidden = false;
  $('#login-form [name=name]').focus();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  $('#login-error').textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: { name: f.elements.name.value, password: f.elements.password.value } });
    f.elements.password.value = '';
    await start();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

async function start() {
  const s = await api('/api/session');
  state.user = s.user;
  $('#user-name').textContent = s.user;
  state.meta = await api('/api/meta');
  fillMeta();
  $('#view-login').hidden = true;
  $('#view-app').hidden = false;
  pollPublish();
  route();
}

// ---------------------------------------------------------------------------
// Routing: #/  #/new  #/edit/B398
// ---------------------------------------------------------------------------
window.addEventListener('hashchange', () => { if (state.user) route(); });
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const edit = /^\/edit\/(B\d{3})$/.exec(h);
  if (h === '/new') return openEditor(null);
  if (edit) return openEditor(edit[1]);
  return openList();
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
const money = (n) => (n === null || n === undefined ? null : `${new Intl.NumberFormat('de-DE').format(n)} €`);
const typeLabel = (t) => state.meta.types.find((x) => x.value === t)?.label ?? t;
const STATUS_LABEL = { available: 'Available', reserved: 'Reserved', unconfirmed: 'Not confirmed', sold: 'Sold', rented: 'Rented' };

async function openList() {
  $('#view-edit').hidden = true;
  $('#view-list').hidden = false;
  document.title = 'Listings · Brikk Admin';
  try {
    state.listings = (await api('/api/listings')).listings;
    renderList();
  } catch (err) {
    $('#rows').replaceChildren(el('li', { class: 'empty' }, err.message));
  }
}

function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const items = state.listings.filter((l) => {
    const off = l.hidden || l.status === 'sold' || l.status === 'rented';
    if (state.filter === 'admin' && l.source !== 'admin') return false;
    if (state.filter === 'hidden' && !off) return false;
    if (!q) return true;
    return [l.ref, l.titleSq, l.city].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  $('#list-count').textContent = `${items.length} of ${state.listings.length} listings`;
  if (!items.length) return $('#rows').replaceChildren(el('li', { class: 'empty' }, 'No listings match.'));
  $('#rows').replaceChildren(...items.map(rowView));
}

function rowView(l) {
  const title = l.titleSq ?? `${typeLabel(l.type)} · ${l.deal === 'sale' ? 'for sale' : 'for rent'}${l.city ? ` · ${l.city}` : ''}`;
  const price = l.deal === 'rent' ? (l.rentMonthly !== null ? `${money(l.rentMonthly)}/month` : 'Price on request') : money(l.price) ?? 'Price on request';
  const off = l.hidden || l.status === 'sold' || l.status === 'rented';

  const status = el('select', { class: 'control', 'aria-label': `Status of ${l.ref}` },
    state.meta.statuses.map((s) => el('option', { value: s, selected: s === l.status }, STATUS_LABEL[s])));
  status.addEventListener('change', () => changeStatus(l, { status: status.value }));

  const hideBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, l.hidden ? 'Show on site' : 'Hide');
  hideBtn.addEventListener('click', () => changeStatus(l, { hidden: !l.hidden }));

  return el('li', { class: 'row' },
    l.cover ? el('img', { class: 'row__img', src: l.cover, alt: '', loading: 'lazy' }) : el('div', { class: 'row__img' }),
    el('div', {},
      el('p', { class: 'row__title' }, title),
      el('p', { class: 'row__meta' }, `${l.ref} · ${price} · ${l.postedAt}${l.createdBy ? ` · by ${l.createdBy}` : ''}`),
      el('div', { class: 'row__tags' },
        l.source === 'admin' ? el('span', { class: 'tag' }, 'Added here') : el('span', { class: 'tag tag--off' }, 'Instagram'),
        l.notOnSiteYet && el('span', { class: 'tag tag--warn' }, 'Not on website yet'),
        l.hidden && el('span', { class: 'tag tag--off' }, 'Hidden'),
        !l.hidden && off && el('span', { class: 'tag tag--off' }, 'Not shown (sold/rented)'),
      ),
    ),
    el('div', { class: 'row__actions' },
      status,
      hideBtn,
      l.source === 'admin' && el('a', { class: 'btn btn--ghost btn--sm', href: `#/edit/${l.ref}` }, 'Edit'),
      l.slugSq && !off && el('a', { class: 'btn btn--ghost btn--sm', href: `${SITE}/prona/${l.slugSq}/`, target: '_blank', rel: 'noopener' }, 'View ↗'),
    ),
  );
}

async function changeStatus(l, change) {
  try {
    await api(`/api/listings/${l.ref}/status`, { method: 'POST', body: change });
    Object.assign(l, change);
    renderList();
    toast(`${l.ref} updated. Publishing…`);
    pollPublish(true);
  } catch (err) {
    toast(err.message);
    renderList();
  }
}

$('#search').addEventListener('input', renderList);
$$('.segmented button').forEach((b) => b.addEventListener('click', () => {
  state.filter = b.dataset.filter;
  $$('.segmented button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderList();
}));

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
function fillMeta() {
  const m = state.meta;
  $('#f-type').replaceChildren(...m.types.map((t) => el('option', { value: t.value }, `${t.label} (${t.labelSq})`)));
  $('#city-list').replaceChildren(...m.cities.map((c) => el('option', { value: c.value })));
  $('#features').replaceChildren(...m.features.map((f) => el('label', {}, el('input', { type: 'checkbox', name: 'features', value: f.value }), ` ${f.label}`)));
}

function updateHoods() {
  const city = $('#view-edit [name=city]').value.trim();
  const hoods = state.meta.neighbourhoods.filter((n) => !city || n.city === city);
  $('#hood-list').replaceChildren(...hoods.map((n) => el('option', { value: n.value })));
}

function syncConditional() {
  const f = $('#view-edit');
  const deal = f.querySelector('[name=deal]:checked').value;
  $$('[data-deal]', f).forEach((n) => (n.hidden = n.dataset.deal !== deal));
  $$('[data-newbuild]', f).forEach((n) => (n.hidden = !f.elements.isNewBuild.checked));
}

const FIELDS = ['ref', 'type', 'status', 'city', 'neighbourhood', 'street', 'complex', 'price', 'pricePerM2', 'rentMonthly', 'deposit', 'areaNet', 'plotAres', 'floor', 'totalFloors', 'bedrooms', 'bathrooms', 'completion', 'completionEn', 'descriptionSq', 'descriptionEn', 'titleSq', 'titleEn'];
const CHECKS = ['balcony', 'storage', 'isNewBuild'];

async function openEditor(ref) {
  const f = $('#view-edit');
  $('#view-list').hidden = true;
  f.hidden = false;
  f.reset();
  $('#save-error').textContent = '';
  $('#photo-error').textContent = '';
  state.photos = [];
  state.editing = ref;
  window.scrollTo(0, 0);

  let data = { ref: state.meta.nextRef, deal: 'sale', type: 'apartment', status: 'available', features: [], photos: [] };
  if (ref) {
    try {
      data = (await api(`/api/listings/${ref}`)).listing;
    } catch (err) {
      toast(err.message);
      location.hash = '#/';
      return;
    }
  } else {
    state.meta = await api('/api/meta'); // fresh next ref
    data.ref = state.meta.nextRef;
  }

  document.title = `${ref ? `Edit ${ref}` : 'New listing'} · Brikk Admin`;
  $('#edit-title').textContent = ref ? `Edit ${ref}` : 'New listing';
  $('#remove-btn').hidden = !ref;
  f.elements.ref.readOnly = Boolean(ref);
  for (const k of FIELDS) if (f.elements[k]) f.elements[k].value = data[k] ?? '';
  for (const k of CHECKS) f.elements[k].checked = data[k] === true;
  f.querySelector(`[name=deal][value=${data.deal}]`).checked = true;
  $$('[name=features]', f).forEach((c) => (c.checked = data.features.includes(c.value)));
  state.photos = data.photos.map((p) => ({ id: p.file, file: p.file, kind: p.kind, url: `/api/photos/${data.ref}/${p.file}` }));
  renderPhotos();
  updateHoods();
  syncConditional();
}

$('#view-edit').addEventListener('change', (e) => {
  if (['deal', 'isNewBuild'].includes(e.target.name)) syncConditional();
  if (e.target.name === 'city') updateHoods();
});
$('#view-edit [name=city]').addEventListener('input', updateHoods);

// --- Photos ---
function renderPhotos() {
  const kinds = state.meta.imageKinds;
  $('#photos').replaceChildren(...state.photos.map((p, i) => {
    if (p.busy) return el('li', { class: 'photo' }, el('div', { class: 'photo--busy' }, 'Preparing…'));
    const kind = el('select', { class: 'control', 'aria-label': `What photo ${i + 1} shows` }, kinds.map((k) => el('option', { value: k.value, selected: k.value === p.kind }, k.label)));
    kind.addEventListener('change', () => (p.kind = kind.value));
    const li = el('li', { class: 'photo', draggable: 'true', dataset: { index: i } },
      el('img', { src: p.url, alt: `Photo ${i + 1}` }),
      i === 0 && el('span', { class: 'photo__cover' }, 'Cover'),
      el('div', { class: 'photo__bar' },
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move earlier', disabled: i === 0, onclick: () => movePhoto(i, i - 1) }, '←'),
        kind,
        el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move later', disabled: i === state.photos.length - 1, onclick: () => movePhoto(i, i + 1) }, '→'),
        el('button', { type: 'button', class: 'icon-btn icon-btn--danger', 'aria-label': 'Remove photo', onclick: () => { state.photos.splice(i, 1); renderPhotos(); } }, '✕'),
      ),
    );
    return li;
  }));
}

function movePhoto(from, to) {
  if (to < 0 || to >= state.photos.length) return;
  const [p] = state.photos.splice(from, 1);
  state.photos.splice(to, 0, p);
  renderPhotos();
}

let dragFrom = null;
$('#photos').addEventListener('dragstart', (e) => {
  const li = e.target.closest('.photo');
  if (!li) return;
  dragFrom = Number(li.dataset.index);
  li.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
});
$('#photos').addEventListener('dragover', (e) => {
  if (dragFrom === null) return;
  e.preventDefault();
  $$('.photo.is-target').forEach((n) => n.classList.remove('is-target'));
  e.target.closest('.photo')?.classList.add('is-target');
});
$('#photos').addEventListener('drop', (e) => {
  if (dragFrom === null) return;
  e.preventDefault();
  const li = e.target.closest('.photo');
  if (li) movePhoto(dragFrom, Number(li.dataset.index));
  dragFrom = null;
});
$('#photos').addEventListener('dragend', () => { dragFrom = null; renderPhotos(); });

async function resizeToJpeg(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`“${file.name}” can't be opened in this browser. Save it as JPG and try again.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.86);
}

async function addFiles(files) {
  $('#photo-error').textContent = '';
  const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  const errors = [];
  const placeholders = list.map(() => ({ busy: true }));
  state.photos.push(...placeholders);
  renderPhotos();
  for (const [i, file] of list.entries()) {
    const slot = placeholders[i];
    try {
      const data = await resizeToJpeg(file);
      Object.assign(slot, { busy: false, id: crypto.randomUUID(), data, url: data, kind: 'other' });
    } catch (err) {
      errors.push(err.message);
      state.photos.splice(state.photos.indexOf(slot), 1);
    }
    renderPhotos();
  }
  if (errors.length) $('#photo-error').textContent = errors.join('\n');
}

$('#photo-input').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
const drop = $('#drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { if (dragFrom === null) { e.preventDefault(); drop.classList.add('is-over'); } }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('is-over')));
drop.addEventListener('drop', (e) => { if (dragFrom === null) { e.preventDefault(); addFiles(e.dataTransfer.files); } });

// --- Save ---
$('#view-edit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const problems = [];
  if (!/^B\d{3}$/i.test(f.elements.ref.value.trim())) problems.push('Ref must look like B398.');
  if (!state.photos.length) problems.push('Add at least one photo.');
  if (state.photos.some((p) => p.busy)) problems.push('Wait until all photos are ready.');
  if (!f.elements.descriptionSq.value.trim()) problems.push('Write the Albanian description.');
  if (problems.length) { $('#save-error').textContent = problems.join('\n'); return; }

  const listing = { deal: f.querySelector('[name=deal]:checked').value, features: $$('[name=features]:checked', f).map((c) => c.value) };
  for (const k of FIELDS) listing[k] = f.elements[k].value;
  for (const k of CHECKS) listing[k] = f.elements[k].checked ? true : null;
  listing.ref = listing.ref.trim().toUpperCase();
  listing.photos = state.photos.map((p) => (p.data ? { data: p.data, kind: p.kind } : { file: p.file, kind: p.kind }));

  const btn = $('#save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  $('#save-error').textContent = '';
  try {
    await api('/api/listings', { method: 'POST', body: { isNew: !state.editing, listing } });
    toast(`${listing.ref} saved. Publishing to the website…`);
    location.hash = '#/';
    pollPublish(true);
  } catch (err) {
    $('#save-error').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save & publish';
  }
});

$('#remove-btn').addEventListener('click', async () => {
  const ref = state.editing;
  if (!ref || !confirm(`Remove ${ref} from the website?\n\nIt is moved to data/manual-deleted on the office computer, so it can be restored.`)) return;
  try {
    await api(`/api/listings/${ref}`, { method: 'DELETE' });
    toast(`${ref} removed. Publishing…`);
    location.hash = '#/';
    pollPublish(true);
  } catch (err) {
    $('#save-error').textContent = err.message;
  }
});

// ---------------------------------------------------------------------------
// Publishing status
// ---------------------------------------------------------------------------
async function pollPublish(soon = false) {
  clearTimeout(pollPublish.timer);
  if (soon) { pollPublish.timer = setTimeout(pollPublish, 800); return; }
  try {
    const j = await api('/api/publish');
    const wasRunning = state.publish?.running;
    state.publish = j;
    renderPublish();
    if (wasRunning && !j.running) {
      toast(j.ok ? 'The website is updated.' : 'Publishing failed. Click the status at the top for details.');
      if (!$('#view-list').hidden) openList();
    }
    pollPublish.timer = setTimeout(pollPublish, j.running ? 2000 : 15000);
  } catch {
    pollPublish.timer = setTimeout(pollPublish, 15000);
  }
}

function renderPublish() {
  const j = state.publish;
  const pill = $('#publish-pill');
  let text = 'Website is up to date';
  let s = 'idle';
  if (j.running) { s = 'running'; text = `${j.step || 'Publishing'}…`; }
  else if (j.ok === false) { s = 'failed'; text = 'Publishing failed'; }
  else if (j.finishedAt) text = `Published ${new Date(j.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  pill.dataset.state = s;
  $('#publish-text').textContent = text;

  $('#publish-detail').textContent = j.running
    ? `Step: ${j.step}. Started ${new Date(j.startedAt).toLocaleTimeString()}${j.pending ? '. Another update is queued after this one.' : ''}. This usually takes 2–3 minutes.`
    : j.ok === false ? `Error: ${j.error}` : j.finishedAt ? `Last published ${new Date(j.finishedAt).toLocaleString()}.` : 'Nothing published since the admin app started.';
  const log = $('#publish-log');
  const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
  log.textContent = j.log.join('\n') || '—';
  if (atBottom) log.scrollTop = log.scrollHeight;
  $('#retry-btn').hidden = j.running || j.ok !== false;
}

$('#publish-pill').addEventListener('click', () => $('#publish-dialog').showModal());
$('#publish-dialog [data-close]').addEventListener('click', () => $('#publish-dialog').close());
$('#retry-btn').addEventListener('click', async () => {
  await api('/api/publish', { method: 'POST' }).catch((e) => toast(e.message));
  pollPublish(true);
});

// Warn before closing mid-edit with unsaved new photos.
window.addEventListener('beforeunload', (e) => {
  if (!$('#view-edit').hidden && state.photos.some((p) => p.data)) e.preventDefault();
});

// Boot
api('/api/session').then(start).catch(() => showLogin());
