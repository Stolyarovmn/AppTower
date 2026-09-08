import '../icon-data.js';
import '../entity-icons.js';
const paths = globalThis.__atv2IconPaths;
export function icon(name) {
  return `<svg viewBox="0 0 20 20" aria-hidden="true">${paths[name] || paths.group}</svg>`;
}
export function iconButton(label, name, run) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rail-button';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.innerHTML = icon(name);
  b.onclick = run;
  return b;
}
export const shortcutIcon = globalThis.__atv2ShortcutIcon;
