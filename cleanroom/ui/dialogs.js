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
export function menu(title, actions) {
  const dialog = document.createElement('dialog');
  const wrap = document.createElement('div');
  wrap.className = 'menu-content';
  const h = document.createElement('h2');
  h.textContent = title;
  wrap.append(h);
  for (const [label, run] of actions)
    wrap.append(
      button(label, async () => {
        dialog.close();
        await run();
      }),
    );
  wrap.append(button('Закрыть', () => dialog.close()));
  dialog.append(wrap);
  document.body.append(dialog);
  dialog.onclose = () => dialog.remove();
  dialog.showModal();
}
