// Accessible lightbox for listing galleries (native <dialog>: focus trap, Escape and top layer come from the platform).
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((root) => {
  const dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]');
  const data = root.querySelector<HTMLScriptElement>('[data-images]');
  if (!dialog || !data || typeof dialog.showModal !== 'function') return;
  const images: { src: string; w: number; h: number; alt: string }[] = JSON.parse(data.textContent || '[]');
  const img = dialog.querySelector<HTMLImageElement>('[data-img]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-caption]')!;
  const counter = dialog.querySelector<HTMLElement>('[data-counter]')!;
  const counterTpl = dialog.querySelector<HTMLTemplateElement>('[data-counter-template]')!.innerHTML;
  const prev = dialog.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-next]')!;
  const allBtn = root.querySelector<HTMLButtonElement>('[data-open-gallery]');
  let index = 0;
  let opener: HTMLElement | null = null;

  document.documentElement.classList.add('js-gallery');
  if (allBtn) allBtn.hidden = false;
  if (images.length < 2) { prev.hidden = true; next.hidden = true; }

  const show = (i: number) => {
    index = (i + images.length) % images.length;
    const it = images[index];
    img.src = it.src;
    img.width = it.w;
    img.height = it.h;
    img.alt = it.alt;
    caption.textContent = it.alt;
    counter.textContent = `${index + 1} / ${images.length}`;
    counter.setAttribute('aria-label', counterTpl.replace('111', String(index + 1)).replace('222', String(images.length)));
    // Preload neighbours for smooth navigation
    [index + 1, index - 1].forEach((j) => { const n = images[(j + images.length) % images.length]; if (n) new Image().src = n.src; });
  };
  const open = (i: number, from: HTMLElement) => {
    opener = from;
    show(i);
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('[data-close]')!.focus();
  };

  root.querySelectorAll<HTMLAnchorElement>('[data-index]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); open(Number(a.dataset.index), a); });
  });
  allBtn?.addEventListener('click', () => open(0, allBtn));
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { opener?.focus(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });

  // Swipe
  let x0: number | null = null, y0 = 0;
  const stage = dialog.querySelector<HTMLElement>('[data-stage]')!;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(index + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { x0 = null; });
  // Click on the dark area outside the image closes
  stage.addEventListener('click', (e) => { if (e.target === stage) dialog.close(); });
});
