// Copy-to-clipboard and Web Share buttons with honest aria-live feedback.
async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

function announce(btn: HTMLElement, message: string) {
  const id = btn.dataset.status;
  const region = id ? document.getElementById(id) : null;
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => { region.textContent = message; }, 30);
  window.setTimeout(() => { if (region.textContent === message) region.textContent = ''; }, 6000);
}

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    try {
      await copyText(btn.dataset.copy!);
      announce(btn, btn.dataset.ok!);
    } catch {
      announce(btn, btn.dataset.fail!);
    }
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => {
  const url = btn.dataset.url || location.href;
  const title = btn.dataset.title || document.title;
  const canShare = typeof navigator.share === 'function';
  const label = btn.querySelector<HTMLElement>('[data-label]');
  if (!canShare && label) label.textContent = btn.dataset.copyLabel || label.textContent;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    if (canShare) {
      try { await navigator.share({ title, url }); } catch { /* dismissed by the user */ }
      return;
    }
    try {
      await copyText(url);
      announce(btn, btn.dataset.ok!);
    } catch {
      announce(btn, btn.dataset.fail!);
    }
  });
});
