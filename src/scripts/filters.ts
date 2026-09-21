/**
 * Client-side filtering for the property index pages.
 *
 * Progressive enhancement: the server already rendered every card for this category. This module
 * only hides, reorders and counts them. If it never runs, the page is still a complete,
 * usable listing page and the filter form falls back to a plain GET submit.
 */

interface Strings {
  results: (n: number) => string;
  apply: (n: number) => string;
}

type Card = {
  el: HTMLElement;
  deal: string;
  category: string;
  city: string;
  hood: string;
  /** Sale price or monthly rent in EUR; null when on request. */
  price: number | null;
  /** Net area in m², land converted at 1 are = 100 m²; null when unstated. */
  size: number | null;
  beds: number | null;
  furnished: boolean;
  isNew: boolean;
  posted: string;
};

const num = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v));

export function initFilters(strings: Strings) {
  const formEl = document.querySelector<HTMLFormElement>('[data-filters]');
  const listEl = document.querySelector<HTMLElement>('[data-listing-grid]');
  const countEl = document.querySelector<HTMLElement>('[data-result-count]');
  const empty = document.querySelector<HTMLElement>('[data-empty]');
  const applyBtn = document.querySelector<HTMLElement>('[data-filters-apply]');
  if (!formEl || !listEl) return;
  const form = formEl;
  const list = listEl;

  const cards: Card[] = [...list.querySelectorAll<HTMLElement>('[data-ref]')].map((el) => ({
    el,
    deal: el.dataset.deal ?? '',
    category: el.dataset.category ?? '',
    city: el.dataset.city ?? '',
    hood: el.dataset.hood ?? '',
    price: num(el.dataset.price),
    size: num(el.dataset.size),
    beds: num(el.dataset.beds),
    furnished: el.dataset.furnished === '1',
    isNew: el.dataset.new === '1',
    posted: el.dataset.posted ?? '',
  }));

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

  /** Query string -> controls. Only keys this form actually has are applied. */
  function readUrl() {
    const q = new URLSearchParams(location.search);
    for (const [key, value] of q) {
      const el = field(key);
      if (!el) continue;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = value === '1';
      else el.value = value;
    }
  }

  /** Controls -> query string, omitting empty values so shared links stay short. */
  function writeUrl(replace = false) {
    const q = new URLSearchParams();
    for (const el of [...form.elements] as (HTMLInputElement | HTMLSelectElement)[]) {
      if (!el.name) continue;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        if (el.checked) q.set(el.name, '1');
      } else if (el.value) {
        q.set(el.name, el.value);
      }
    }
    const url = q.toString() ? `${location.pathname}?${q}` : location.pathname;
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
  }

  function apply(updateUrl: 'push' | 'replace' | 'none' = 'push') {
    const deal = field('deal')?.value ?? '';
    const category = field('category')?.value ?? '';
    const city = field('city')?.value ?? '';
    const hood = field('hood')?.value ?? '';
    const pmin = num(field('pmin')?.value);
    const pmax = num(field('pmax')?.value);
    const smin = num(field('smin')?.value);
    const smax = num(field('smax')?.value);
    const beds = num(field('beds')?.value);
    const furnished = (field('furnished') as HTMLInputElement | null)?.checked ?? false;
    const isNew = (field('new') as HTMLInputElement | null)?.checked ?? false;
    const sort = field('sort')?.value ?? 'newest';

    let shown = 0;
    for (const c of cards) {
      const ok =
        (!deal || c.deal === deal) &&
        (!category || c.category === category) &&
        (!city || c.city === city) &&
        (!hood || c.hood === hood) &&
        // A price filter can only include listings that state a price.
        (pmin === null || (c.price !== null && c.price >= pmin)) &&
        (pmax === null || (c.price !== null && c.price <= pmax)) &&
        (smin === null || (c.size !== null && c.size >= smin)) &&
        (smax === null || (c.size !== null && c.size <= smax)) &&
        (beds === null || (c.beds !== null && c.beds >= beds)) &&
        (!furnished || c.furnished) &&
        (!isNew || c.isNew);

      c.el.hidden = !ok;
      if (ok) shown++;
    }

    const visible = cards.filter((c) => !c.el.hidden);
    const byPrice = (dir: 1 | -1) => (a: Card, b: Card) => {
      // Listings without a price always sort after priced ones, in both directions.
      if (a.price === null && b.price === null) return b.posted.localeCompare(a.posted);
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return (a.price - b.price) * dir;
    };
    const sorters: Record<string, (a: Card, b: Card) => number> = {
      newest: (a, b) => b.posted.localeCompare(a.posted),
      'price-asc': byPrice(1),
      'price-desc': byPrice(-1),
      size: (a, b) => (b.size ?? -1) - (a.size ?? -1) || b.posted.localeCompare(a.posted),
    };
    visible.sort(sorters[sort] ?? sorters.newest);
    for (const c of visible) list.append(c.el);

    if (countEl) countEl.textContent = strings.results(shown);
    if (applyBtn) applyBtn.textContent = strings.apply(shown);
    if (empty) empty.hidden = shown > 0;

    if (updateUrl !== 'none') writeUrl(updateUrl === 'replace');
  }

  form.addEventListener('input', () => apply('replace'));
  form.addEventListener('change', () => apply('replace'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    apply('push');
    closeSheet();
  });

  // Both of them: one in the filter footer, one in the empty-results block.
  for (const clear of document.querySelectorAll('[data-filters-clear]')) {
    clear.addEventListener('click', () => {
      form.reset();
      for (const el of [...form.elements] as HTMLInputElement[]) {
        if (el.type === 'checkbox') el.checked = false;
        else if (el.tagName === 'INPUT') el.value = '';
        else if (el.tagName === 'SELECT') (el as unknown as HTMLSelectElement).selectedIndex = 0;
      }
      apply('push');
    });
  }

  // ---- Mobile filter sheet ----
  const openBtn = document.querySelector<HTMLButtonElement>('[data-filters-open]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-filters-close]');

  function openSheet() {
    form.classList.add('is-open');
    openBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }
  function closeSheet() {
    if (!form.classList.contains('is-open')) return;
    form.classList.remove('is-open');
    openBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    openBtn?.focus();
  }

  openBtn?.addEventListener('click', openSheet);
  closeBtn?.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });

  // Back/forward through filter states, which are pushed as query strings.
  window.addEventListener('popstate', () => {
    for (const el of [...form.elements] as HTMLInputElement[]) {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'INPUT') el.value = '';
      else if (el.tagName === 'SELECT') (el as unknown as HTMLSelectElement).selectedIndex = 0;
    }
    readUrl();
    apply('none');
  });

  readUrl();
  apply('none');
}

