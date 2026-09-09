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
      img.onload = () => { n.style.background = 'transparent'; for (const child of [...n.childNodes]) if (child.nodeType === 3) child.remove(); };
      img.onerror = () => { n.style.background = '';  img.remove(); n.textContent = (x.title || '?').slice(0, 2).toUpperCase(); };
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
    const n = tile(item); n.style.backgroundColor = item.color || '#b8c7df'; el.append(n);
  } else el.append(tile(item));
  return el;
}
;
