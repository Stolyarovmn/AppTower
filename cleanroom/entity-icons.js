globalThis.__atv2ShortcutIcon = function shortcutIcon(item, overlap = 50) {
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
  } else if (item.type === 'group') {
    el.classList.add('group-icon');
    el.style.color = item.color || '#648bd8';
    el.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${globalThis.__atv2IconPaths.group}</svg>`;
  } else el.append(tile(item));
  return el;
}
;
