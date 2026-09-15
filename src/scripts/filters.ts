// Client-side filtering and sorting of the server-rendered property list.
// State lives in the URL query string; back/forward restore it. Without JS the full list is shown.

type Item = { el: HTMLElement; d: DOMStringMap; index: number };
const NUM = ['pmin', 'pmax', 'amin', 'amax'] as const;

export function initFilters(root: Document = document) {
  const list = root.querySelector<HTMLElement>('[data-results]');
  const form = root.querySelector<HTMLFormElement>('[data-filters-form]');
  const panel = root.querySelector<HTMLElement>('[data-filters-panel]');
  const bar = root.querySelector<HTMLElement>('[data-filters-bar]');
  if (!list || !form || !panel || !bar) return;

  const openBtn = bar.querySelector<HTMLButtonElement>('[data-filters-open]')!;
  const closeBtn = panel.querySelector<HTMLButtonElement>('[data-filters-close]')!;
  const applyBtn = panel.querySelector<HTMLButtonElement>('[data-filters-apply]')!;
  const sortSel = bar.querySelector<HTMLSelectElement>('[data-sort]')!;
  const countEl = root.querySelector<HTMLElement>('[data-count]');
  const emptyEl = root.querySelector<HTMLElement>('[data-empty]');
  const activeBadge = bar.querySelector<HTMLElement>('[data-active-count]');
  const clearEmpty = root.querySelector<HTMLButtonElement>('[data-clear-empty]');
  const items: Item[] = [...list.querySelectorAll<HTMLElement>(':scope > li')].map((el, index) => ({ el, d: el.dataset, index }));
  const desktop = window.matchMedia('(min-width: 62rem)');
  const countTemplate = countEl?.dataset.template ?? '';
  const countOne = countEl?.dataset.one ?? '';
  const applyTemplate = applyBtn.dataset.labelTemplate ?? '';
  const applyOne = applyBtn.dataset.labelOne ?? '';

  bar.hidden = false;
  panel.hidden = !desktop.matches;

  const fields = () => ({
    deal: val('deal'), cat: val('cat'), city: val('city'), hood: val('hood'),
    pmin: num('pmin'), pmax: num('pmax'), amin: num('amin'), amax: num('amax'),
    beds: num('beds'), furnished: checked('furnished'), new: checked('new'),
  });
  type State = ReturnType<typeof fields>;
  function el(name: string) { return form!.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null; }
  function val(name: string) { return (el(name)?.value ?? '').trim(); }
  function num(name: string) { const v = val(name); return v === '' || Number.isNaN(Number(v)) ? null : Number(v); }
  function checked(name: string) { return (el(name) as HTMLInputElement | null)?.checked ?? false; }

  function matches(d: DOMStringMap, s: State, skip?: keyof State) {
    const n = (k: string) => (d[k] === undefined || d[k] === '' ? null : Number(d[k]));
    if (skip !== 'deal' && s.deal && d.deal !== s.deal) return false;
    if (skip !== 'cat' && s.cat && d.cat !== s.cat) return false;
    if (skip !== 'city' && s.city && d.city !== s.city) return false;
    if (skip !== 'hood' && s.hood && d.hood !== s.hood) return false;
    const price = n('price'), area = n('area'), beds = n('beds');
    if (s.pmin !== null && (price === null || price < s.pmin)) return false;
    if (s.pmax !== null && (price === null || price > s.pmax)) return false;
    if (s.amin !== null && (area === null || area < s.amin)) return false;
    if (s.amax !== null && (area === null || area > s.amax)) return false;
    if (skip !== 'beds' && s.beds !== null && (beds === null || beds < s.beds)) return false;
    if (s.furnished && d.furnished !== '1') return false;
    if (s.new && d.new !== '1') return false;
    return true;
  }

  function sortItems(mode: string) {
    const n = (it: Item, k: string) => (it.d[k] ? Number(it.d[k]) : null);
    const sorted = [...items].sort((a, b) => {
      if (mode === 'price-asc' || mode === 'price-desc') {
        const pa = n(a, 'price'), pb = n(b, 'price');
        if (pa === null && pb === null) return a.index - b.index;
        if (pa === null) return 1; // price on request after priced listings
        if (pb === null) return -1;
        return mode === 'price-asc' ? pa - pb : pb - pa;
      }
      if (mode === 'size') {
        const sa = n(a, 'area'), sb = n(b, 'area');
        if (sa === null && sb === null) return a.index - b.index;
        if (sa === null) return 1;
        if (sb === null) return -1;
        return sb - sa;
      }
      return a.index - b.index;
    });
    sorted.forEach((it) => list!.appendChild(it.el));
  }

  function updateFacets(s: State) {
    for (const name of ['deal', 'cat', 'city', 'hood', 'beds'] as const) {
      const select = el(name) as HTMLSelectElement | null;
      if (!select) continue;
      for (const opt of [...select.options]) {
        if (!opt.value) continue;
        const trial = { ...s, [name]: name === 'beds' ? Number(opt.value) : opt.value } as State;
        let ok = items.some((it) => matches(it.d, trial));
        if (name === 'hood' && s.city && opt.dataset.city && opt.dataset.city !== s.city) ok = false;
        const keep = ok || opt.selected;
        opt.hidden = !keep;
        opt.disabled = !keep;
      }
    }
  }

  function render(push: boolean) {
    const s = fields();
    let shown = 0;
    for (const it of items) {
      const ok = matches(it.d, s);
      it.el.hidden = !ok;
      if (ok) shown++;
    }
    sortItems(sortSel.value);
    updateFacets(s);
    if (countEl) countEl.textContent = shown === 1 ? countOne : countTemplate.replace('999999', String(shown));
    applyBtn.textContent = shown === 1 ? applyOne : applyTemplate.replace('999999', String(shown));
    if (emptyEl) emptyEl.hidden = shown > 0;
    const active = Object.entries(s).filter(([, v]) => v !== '' && v !== null && v !== false).length;
    if (activeBadge) { activeBadge.hidden = active === 0; activeBadge.textContent = String(active); }

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(s)) {
      if (v === '' || v === null || v === false) continue;
      params.set(k, v === true ? '1' : String(v));
    }
    if (sortSel.value) params.set('sort', sortSel.value);
    const qs = params.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) {
      if (push) history.pushState({ filters: qs }, '', url);
      else history.replaceState({ filters: qs }, '', url);
    }
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    for (const c of [...form!.elements] as HTMLInputElement[]) {
      if (c.type === 'checkbox') c.checked = false;
      else if (c.tagName === 'SELECT' || c.tagName === 'INPUT') c.value = '';
    }
    for (const [k, v] of p) {
      if (k === 'sort') continue;
      const input = el(k);
      if (!input) continue;
      if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = v === '1';
      else if (input instanceof HTMLSelectElement) {
        if ([...input.options].some((o) => o.value === v)) input.value = v;
      } else input.value = NUM.includes(k as (typeof NUM)[number]) && Number.isNaN(Number(v)) ? '' : v;
    }
    const sort = p.get('sort') ?? '';
    sortSel.value = [...sortSel.options].some((o) => o.value === sort) ? sort : '';
  }

  // ---- mobile sheet ----
  let backdrop: HTMLDivElement | null = null;
  let lastFocus: HTMLElement | null = null;
  function openSheet() {
    lastFocus = document.activeElement as HTMLElement;
    panel!.hidden = false;
    panel!.setAttribute('role', 'dialog');
    panel!.setAttribute('aria-modal', 'true');
    openBtn.setAttribute('aria-expanded', 'true');
    backdrop = document.createElement('div');
    backdrop.className = 'filters-backdrop';
    backdrop.addEventListener('click', () => closeSheet());
    document.body.appendChild(backdrop);
    document.documentElement.style.overflow = 'hidden';
    panel!.querySelector<HTMLElement>('select, input, button')?.focus();
  }
  function closeSheet(restore = true) {
    if (desktop.matches) return;
    panel!.hidden = true;
    panel!.setAttribute('role', 'region');
    panel!.removeAttribute('aria-modal');
    openBtn.setAttribute('aria-expanded', 'false');
    backdrop?.remove();
    backdrop = null;
    document.documentElement.style.overflow = '';
    if (restore) (lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : openBtn).focus();
  }
  openBtn.addEventListener('click', openSheet);
  closeBtn.addEventListener('click', () => closeSheet());
  panel.addEventListener('keydown', (e) => {
    if (desktop.matches || panel.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key === 'Tab') {
      const f = [...panel.querySelectorAll<HTMLElement>('button, select, input, [href]')].filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  desktop.addEventListener('change', () => {
    backdrop?.remove(); backdrop = null; document.documentElement.style.overflow = '';
    panel.hidden = !desktop.matches;
    panel.setAttribute('role', 'region'); panel.removeAttribute('aria-modal');
    openBtn.setAttribute('aria-expanded', 'false');
  });

  // ---- events ----
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLSelectElement && t.name === 'city') {
      const hood = el('hood') as HTMLSelectElement | null;
      const sel = hood?.selectedOptions[0];
      if (hood && sel?.dataset.city && t.value && sel.dataset.city !== t.value) hood.value = '';
    }
    render(true);
  });
  sortSel.addEventListener('change', () => render(true));
  form.addEventListener('submit', (e) => { e.preventDefault(); render(true); closeSheet(); });
  form.addEventListener('reset', () => setTimeout(() => { sortSel.value = ''; render(true); }, 0));
  // The clear button lives in the empty state, which disappears once results return: move focus to the page heading.
  clearEmpty?.addEventListener('click', () => { window.setTimeout(() => document.querySelector<HTMLElement>('h1')?.focus(), 20); });
  window.addEventListener('popstate', () => { readUrl(); render(false); });

  readUrl();
  render(false);
}

initFilters();
