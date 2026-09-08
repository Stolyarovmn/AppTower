import { icon, shortcutIcon } from './icons.js';
import { button } from './client.js';
export function form(title, fields, submit = 'Сохранить', options = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog'),
      f = document.createElement('form'),
      h = document.createElement('h2');
    f.method = 'dialog';
    h.textContent = title;
    f.append(h);
    const controls = {};
    for (const field of fields) {
      const label = document.createElement('label');
      label.textContent = field.label;
      let input;
      if (field.options) {
        input = document.createElement('select');
        for (const [value, name] of field.options) {
          const o = document.createElement('option');
          o.value = value;
          o.textContent = name;
          input.append(o);
        }
      } else {
        input = document.createElement('input');
        input.type = field.type || 'text';
      }
      input.value = field.value ?? '';
      input.required = !!field.required;
      if (field.type === 'color') {
        const palette = document.createElement('div'); palette.className = 'palette';
        for (const color of ['#b8c7df','#c5bddb','#d8b8c4','#debfae','#dfd2ad','#bfd2b8','#b4cecc','#c7cbd1']) {
          const swatch = button('', () => { input.value = color; input.dispatchEvent(new input.ownerDocument.defaultView.Event('input')); });
          swatch.style.backgroundColor = color; swatch.setAttribute('aria-label', color);
          const update = () => swatch.setAttribute('aria-pressed', String(input.value.toLowerCase() === color));
          input.addEventListener('input', update); update(); palette.append(swatch);
        }
        input.title = 'Другой цвет'; input.setAttribute('aria-label', 'Другой цвет'); input.className = 'custom-color';
        palette.append(input); label.append(palette);
      } else label.append(input);
      f.append(label);
      controls[field.name] = input;
      if (field.change)
        input.onchange = () => field.change(input.value, controls);
    }
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    if (options.clear) {
      const clear = button('', () => { for (const name of options.clear) if (controls[name]) controls[name].value = ''; controls.url?.focus(); });
      clear.className = 'dialog-clear'; clear.title = 'Очистить форму'; clear.setAttribute('aria-label', clear.title); clear.innerHTML = icon('broom'); f.querySelector('h2').after(clear);
    }
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'primary';
    save.textContent = submit;
    actions.append(save);
    f.append(actions);
    dialog.append(f);
    document.body.append(dialog);
    let result = null;
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!f.reportValidity()) return;
      result = Object.fromEntries(
        Object.entries(controls).map(([k, v]) => [k, v.value]),
      );
      dialog.close();
    };
    dialog.onclose = () => {
      dialog.remove();
      resolve(result);
    };
    present(dialog);
  });
}
export function menu(title, actions, anchor) {
  const dialog = document.createElement('dialog');
  const wrap = document.createElement('div');
  wrap.className = 'menu-content';
  const h = document.createElement('h2');
  h.textContent = title;
  wrap.append(h);
  for (const [label, run, options = {}] of actions) {
    const b = button(label, async () => { dialog.close(); await run(); });
    if (options.entity) b.prepend(shortcutIcon(options.entity));
    if (options.icon) b.insertAdjacentHTML('afterbegin', icon(options.icon));
    if (options.selected !== undefined) {
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(options.selected));
      if (options.selected) b.insertAdjacentHTML('beforeend', icon('check'));
    }
    if (options.danger) b.classList.add('danger');
    wrap.append(b);
  }

  dialog.append(wrap);
  document.body.append(dialog);
  dialog.onclose = () => dialog.remove();
  present(dialog);
  if (anchor) {
    dialog.classList.add('context-menu');
    const a = anchor.getBoundingClientRect(), r = dialog.getBoundingClientRect();
    const left = a.left >= r.width + 8 ? a.left - r.width - 6 : a.right + 6;
    dialog.style.left = `${Math.max(8, Math.min(left, innerWidth - r.width - 8))}px`;
    dialog.style.top = `${Math.max(8, Math.min(a.top, innerHeight - r.height - 8))}px`;

    const resized = () => dialog.close();
    window.addEventListener('resize', resized);
    dialog.addEventListener('close', () => window.removeEventListener('resize', resized), {once:true});
  }
}

export function chooseCombination() {
  return new Promise(resolve => {
    const d = document.createElement('dialog'), wrap = document.createElement('div');
    wrap.className = 'template-order';
    const h = document.createElement('h2'); h.textContent = 'Как объединить сайты?';
    const p = document.createElement('p'); p.textContent = 'Шаблон открывает два сайта одновременно. Группа хранит ярлыки вместе.';
    wrap.append(h);
    const choices = document.createElement('div'); choices.className = 'combination-choices'; wrap.append(choices);
    let result = null;
    for (const [kind, label] of [['template', 'Шаблон'], ['group', 'Группа']]) {
      const b = button(label, () => { result = kind; d.close(); });
      b.className = 'combination-choice'; b.textContent = '';
      const heading = document.createElement('strong'); heading.textContent = label;
      const description = document.createElement('span'); description.textContent = kind === 'template' ? 'Два сайта одновременно, сверху и снизу' : 'Ярлыки вместе, с именем и цветом';
      b.innerHTML = icon(kind); b.append(heading, description); choices.append(b);
    }
    d.append(wrap); document.body.append(d);
    d.onclose = () => { d.remove(); resolve(result); }; present(d);
  });
}
export function templateOrder(top, bottom, overlap = 50) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'), wrap = document.createElement('div');
    wrap.className = 'template-order';
    const h = document.createElement('h2'); h.textContent = 'Порядок сайтов в шаблоне';
    const p = document.createElement('p'); p.textContent = 'Передний значок открывается сверху, задний — снизу.';
    const preview = document.createElement('div'); preview.className = 'preview';
    const rows = document.createElement('div'); let reverse = false, result = null;
    const render = () => {
      const pair = reverse ? [bottom, top] : [top, bottom];
      preview.replaceChildren(shortcutIcon({type:'template',top:pair[0],bottom:pair[1]}, overlap));
      rows.replaceChildren(...pair.map((site,i) => { const r = document.createElement('div'); r.className = 'site-row'; r.append(shortcutIcon(site), document.createTextNode(`${i ? 'Снизу' : 'Сверху'}: ${site.title || site.url}`)); return r; }));
    };
    const swap = button('Поменять местами', () => { reverse = !reverse; render(); });
    swap.insertAdjacentHTML('afterbegin', icon('swap'));
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    actions.append(button('Сохранить', () => { result = {reverse}; d.close(); }));
    wrap.append(h,p,preview,rows,swap,actions); d.append(wrap); document.body.append(d); render();
    d.onclose = () => { d.remove(); resolve(result); }; present(d);
  });
}

// One dismissal and focus policy for all transient surfaces.
export function present(dialog) {
  if (dialog.dataset.dismissBound) { dialog.showModal(); return; }
  dialog.dataset.dismissBound = "true";
  const trigger = document.activeElement;
  const close = dialog.querySelector('.dialog-close') || document.createElement('button'); close.type = 'button';
  close.className = 'dialog-close'; close.setAttribute('aria-label', 'Закрыть'); close.title = 'Закрыть'; close.innerHTML = icon('close');
  close.onclick = () => dialog.close(); dialog.append(close);
  let outside = false, pointerClose = false;
  const isOutside = e => { const r = dialog.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  dialog.addEventListener('pointerdown', e => { pointerClose = true; outside = e.target === dialog && isOutside(e); });
  dialog.addEventListener('pointerup', e => { if (outside && e.target === dialog && isOutside(e)) dialog.close(); outside = false; });
  dialog.addEventListener('close', () => { if (pointerClose && document.activeElement === trigger) trigger?.blur(); }, {once:true});
  dialog.showModal();
}
