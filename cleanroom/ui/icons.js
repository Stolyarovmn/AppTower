import '../icon-data.js';
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
export function shortcutIcon(item, overlap = 50) {
  const el = document.createElement('span');
  el.className = 'entity-icon';
  function tile(x) {
    const n = document.createElement('span');
    n.className = 'tile';
    n.textContent = (x.title || '?').slice(0, 2).toUpperCase();
    if (x.url) {
      const img = document.createElement('img');
      const href = new URL(chrome.runtime.getURL('/_favicon/'));
      href.searchParams.set('pageUrl', x.url);
      href.searchParams.set('size', '32');
      img.src = href.href;
      img.draggable = false;
      img.onerror = () => img.remove();
      n.append(img);
    }
    return n;
  }
  if (item.type === 'template') {
    el.classList.add('template-icon');
    el.style.setProperty('--offset', 18 * (1 - overlap / 100) + 'px');
    el.append(tile(item.bottom), tile(item.top));
  } else el.append(tile(item));
  return el;
}
