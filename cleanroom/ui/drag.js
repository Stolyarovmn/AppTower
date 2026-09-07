export function installDrag(list, drop, onError) {
  let drag = null,
    ghost = null;
  list.addEventListener('dragstart', (e) => e.preventDefault());
  list.addEventListener('pointerdown', (e) => {
    const node = e.target.closest('[data-id]');
    if (!node || e.button !== 0) return;
    drag = {
      id: node.dataset.id,
      node,
      x: e.clientX,
      y: e.clientY,
      at: Date.now(),
      kind: e.pointerType,
      active: false,
    };
  });
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!drag) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
        if (drag.kind !== 'mouse' && Date.now() - drag.at < 300) {
          drag = null;
          return;
        }
        drag.active = true;
        ghost = drag.node.cloneNode(true);
        ghost.className = 'drag-preview';
        ghost.style.pointerEvents = 'none';
        document.body.append(ghost);
      }
      e.preventDefault();
      ghost.style.left = `${Math.max(0, e.clientX - 48)}px`;
      ghost.style.top = `${e.clientY - 20}px`;
      const target = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest('[data-id]');
      document.body.style.cursor =
        target && target.dataset.id !== drag.id ? 'grabbing' : 'not-allowed';
      const r = list.getBoundingClientRect();
      if (e.clientY < r.top + 30) list.scrollTop -= 12;
      if (e.clientY > r.bottom - 30) list.scrollTop += 12;
    },
    { passive: false },
  );
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    ghost?.remove();
    ghost = null;
    document.body.style.cursor = '';
    if (!current.active) return;
    current.node.dataset.suppressClick = 'true';
    setTimeout(() => delete current.node.dataset.suppressClick, 100);
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest('[data-id]');
    if (!target || target.dataset.id === current.id) return;
    const r = target.getBoundingClientRect(),
      fraction = (e.clientY - r.top) / r.height;
    Promise.resolve(
      drop(
        current.id,
        target.dataset.id,
        fraction < 0.25 ? 'before' : fraction > 0.75 ? 'after' : 'inside',
      ),
    ).catch(onError);
  });
  window.addEventListener('pointercancel', () => {
    drag = null;
    ghost?.remove();
    ghost = null;
    document.body.style.cursor = '';
  });
}
