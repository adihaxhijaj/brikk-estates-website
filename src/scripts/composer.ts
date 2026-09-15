// Owner composer: validates, then opens WhatsApp or the email app with a pre-formatted message.
// It never stores or transmits data itself and never claims anything was sent.
document.querySelectorAll<HTMLFormElement>('[data-composer]').forEach((form) => {
  form.hidden = false; // the composer needs JS; without it the page's direct contact links remain
  const ds = form.dataset;
  const labels = JSON.parse(ds.labels || '{}') as Record<string, string>;
  const errorsBox = form.querySelector<HTMLElement>('[data-errors]')!;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  let channel: 'whatsapp' | 'email' = 'whatsapp';

  form.querySelectorAll<HTMLButtonElement>('[data-send]').forEach((b) => b.addEventListener('click', () => { channel = b.dataset.send as 'whatsapp' | 'email'; }));

  const value = (name: string) => ((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '').trim();
  const labelFor = (input: HTMLElement) => (form.querySelector(`label[for="${input.id}"]`)?.childNodes[0]?.textContent ?? '').trim();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    const problems: { input: HTMLInputElement; message: string }[] = [];
    form.querySelectorAll<HTMLInputElement>('[required]').forEach((input) => {
      const err = document.getElementById(`${input.id}-err`);
      let message = '';
      if (!input.value.trim()) message = ds.errRequired!.replace('{label}', labelFor(input));
      else if (input.name === 'phone' && input.value.replace(/\D/g, '').length < 8) message = ds.errPhone!;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (err) { err.textContent = message; err.hidden = !message; }
      if (message) problems.push({ input, message });
    });

    const list = errorsBox.querySelector('ul')!;
    list.innerHTML = '';
    if (problems.length) {
      problems.forEach((p) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${p.input.id}`;
        a.textContent = p.message;
        a.addEventListener('click', (ev) => { ev.preventDefault(); p.input.focus(); });
        li.appendChild(a);
        list.appendChild(li);
      });
      errorsBox.hidden = false;
      errorsBox.focus();
      return;
    }
    errorsBox.hidden = true;

    const deal = (form.querySelector<HTMLInputElement>('input[name="deal"]:checked')?.value) ?? '';
    const lines = [
      ds.title!,
      '',
      `${labels.deal}: ${deal}`,
      `${labels.type}: ${value('type')}`,
      `${labels.city}: ${value('city')}`,
      value('neighbourhood') && `${labels.neighbourhood}: ${value('neighbourhood')}`,
      value('size') && `${labels.size}: ${value('size')}`,
      value('price') && `${labels.price}: ${value('price')}`,
      `${labels.name}: ${value('name')}`,
      `${labels.phone}: ${value('phone')}`,
      value('note') && `${labels.note}: ${value('note')}`,
    ].filter((l): l is string => typeof l === 'string' && l !== '');
    const message = [lines[0], '', ...lines.slice(1)].join('\n');

    const href = channel === 'whatsapp'
      ? `${ds.wa}?text=${encodeURIComponent(message)}`
      : `mailto:${ds.email}?subject=${encodeURIComponent(ds.subject!)}&body=${encodeURIComponent(message)}`;
    if (channel === 'whatsapp') window.open(href, '_blank', 'noopener');
    else window.location.href = href;
    status.textContent = ds.opened!;
  });
});
