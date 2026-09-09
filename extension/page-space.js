(() => {
  if (window.top !== window || globalThis.__atv2PageSpace) return;
  const WIDTH = 48,
    saved = new Map();
  let active = false,
    scheduled = false;
  const observer = new MutationObserver(() => schedule());
  const remember = (node, property, value) => {
    let props = saved.get(node);
    if (!props) {
      props = new Map();
      saved.set(node, props);
    }
    if (!props.has(property))
      props.set(property, {
        value: node.style.getPropertyValue(property),
        priority: node.style.getPropertyPriority(property),
      });
    node.style.setProperty(property, value, 'important');
  };
  function restore() {
    for (const [node, props] of saved)
      for (const [key, old] of props) {
        if (old.value) node.style.setProperty(key, old.value, old.priority);
        else node.style.removeProperty(key);
      }
    saved.clear();
  }
  function viewportFixed(node) {
    for (
      let p = node.parentElement;
      p && p !== document.documentElement;
      p = p.parentElement
    ) {
      const s = getComputedStyle(p);
      if (
        s.position === 'fixed' ||
        s.transform !== 'none' ||
        s.filter !== 'none' ||
        s.perspective !== 'none' ||
        /paint|layout|strict|content/.test(s.contain)
      )
        return false;
    }
    return true;
  }
  function apply() {
    if (!active || !document.documentElement) return;
    observer.disconnect();
    restore();
    const fixed = [...document.querySelectorAll('body *')].filter(
      (node) =>
        getComputedStyle(node).position === 'fixed' && viewportFixed(node),
    );
    const measured = fixed.map((node) => ({
      node,
      rect: node.getBoundingClientRect(),
      style: getComputedStyle(node),
    }));
    const wide = [...document.querySelectorAll('body *')].filter(node => {
      const s = getComputedStyle(node), r = node.getBoundingClientRect();
      return s.position !== 'fixed' && r.width >= innerWidth - 1 && r.width <= innerWidth + 1;
    });
    remember(document.documentElement, 'min-width', '0');
    remember(document.documentElement, 'box-sizing', 'border-box');
    remember(document.documentElement, 'width', `calc(100% - ${WIDTH}px)`);
    remember(document.documentElement, 'max-width', `calc(100% - ${WIDTH}px)`);
    if (document.body) {
      remember(document.body, 'width', '100%');
      remember(document.body, 'min-width', '0');
      remember(document.body, 'max-width', '100%');
      remember(document.body, 'box-sizing', 'border-box');
    }
    // Viewport-unit app shells do not shrink when only html is resized.
    for (const node of wide) {
      remember(node, 'min-width', '0');
      remember(node, 'max-width', `calc(100vw - ${WIDTH}px)`);
      remember(node, 'box-sizing', 'border-box');
    }
    for (const { node, rect, style } of measured) {
      if (rect.right <= innerWidth - WIDTH || rect.width === 0) continue;
      // Wide fixed headers keep their left edge; small right-pinned controls shift left.
      if (rect.width > innerWidth / 2) {
        remember(
          node,
          'max-width',
          `${Math.max(0, innerWidth - WIDTH - rect.left)}px`,
        );
        if (style.right !== 'auto')
          remember(
            node,
            'right',
            `${(parseFloat(style.right) || 0) + WIDTH}px`,
          );
      } else if (style.right !== 'auto')
        remember(node, 'right', `${(parseFloat(style.right) || 0) + WIDTH}px`);
      else remember(node, 'left', `${Math.max(0, rect.left - WIDTH)}px`);
    }
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }
  function schedule() {
    if (!active || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }
  globalThis.__atv2PageSpace = {
    setVisible(value) {
      if (active === value) return;
      active = value;
      if (active) apply();
      else {
        observer.disconnect();
        restore();
      }
    },
    width: WIDTH,
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('pagehide', () =>
    globalThis.__atv2PageSpace.setVisible(false),
  );
})();
