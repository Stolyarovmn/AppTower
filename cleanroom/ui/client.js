import { KEY } from '../core/model.js';
export async function send(message) {
  const r = await chrome.runtime.sendMessage(message);
  if (!r?.ok) throw Error(r?.error || 'Нет ответа AppTower');
  return r;
}
export const read = async () => (await send({ type: 'APP_GET' })).state;
export const mutate = async (action) => {
  const r = await send({ type: 'APP_MUTATE', action });
  if (r.warning) alert(r.warning);
  return r.state;
};
export function subscribe(fn) {
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === 'local' && c[KEY]?.newValue) fn(c[KEY].newValue);
  });
}
export function applyTheme(settings) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty(
    '--accent',
    settings.accent || 'AccentColor',
  );
}
export function download(name, value) {
  const href = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export function button(label, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () =>
    Promise.resolve()
      .then(action)
      .catch((e) => alert(e.message)),
  );
  return b;
}
