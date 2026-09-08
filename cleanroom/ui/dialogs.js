import { icon, shortcutIcon } from './icons.js';
import { button } from './client.js';
export function form(title, fields, submit = 'Сохранить') {
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
      label.append(input);
      f.append(label);
      controls[field.name] = input;
      if (field.change)
        input.onchange = () => field.change(input.value, controls);
    }
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const cancel = button('Отмена', () => dialog.close());
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'primary';
    save.textContent = submit;
    actions.append(cancel, save);
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
    dialog.showModal();
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
    if (options.icon) b.insertAdjacentHTML('afterbegin', icon(options.icon));
    if (options.selected !== undefined) {
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(options.selected));
      if (options.selected) b.insertAdjacentHTML('beforeend', icon('check'));
    }
    if (options.danger) b.classList.add('danger');
    wrap.append(b);
  }
  if (!anchor) wrap.append(button('Закрыть', () => dialog.close()));
  dialog.append(wrap);
  document.body.append(dialog);
  dialog.onclose = () => dialog.remove();
  dialog.showModal();
  if (anchor) {
    dialog.classList.add('context-menu');
    const a = anchor.getBoundingClientRect(), r = dialog.getBoundingClientRect();
    const left = a.left >= r.width + 8 ? a.left - r.width - 6 : a.right + 6;
    dialog.style.left = `${Math.max(8, Math.min(left, innerWidth - r.width - 8))}px`;
    dialog.style.top = `${Math.max(8, Math.min(a.top, innerHeight - r.height - 8))}px`;
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
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
    wrap.append(h, p);
    let result = null;
    for (const [kind, label] of [['template', 'Шаблон'], ['group', 'Группа']]) {
      const b = button(label, () => { result = kind; d.close(); });
      b.insertAdjacentHTML('afterbegin', icon(kind)); wrap.append(b);
    }
    wrap.append(button('Отмена', () => d.close())); d.append(wrap); document.body.append(d);
    d.onclose = () => { d.remove(); resolve(result); }; d.showModal();
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
    actions.append(button('Отмена', () => d.close()), button('Сохранить', () => { result = {reverse}; d.close(); }));
    wrap.append(h,p,preview,rows,swap,actions); d.append(wrap); document.body.append(d); render();
    d.onclose = () => { d.remove(); resolve(result); }; d.showModal();
  });
}
