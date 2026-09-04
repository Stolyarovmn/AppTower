export function createPanelStateStore({
  coordinator,
  openWindows,
  collapsedWindows,
  persistOpen,
  persistCollapsed,
  broadcastRail,
  clearWindowResources = () => {},
  now = () => Date.now()
}) {
  if (!coordinator) throw new TypeError("coordinator is required");
  if (!(openWindows instanceof Set) || !(collapsedWindows instanceof Set)) {
    throw new TypeError("panel state sets are required");
  }

  const closedAt = new Map();

  async function open(windowId, {authoritative = false} = {}) {
    return coordinator.panel(windowId, "open", async () => {
      if (authoritative) {
        closedAt.delete(windowId);
        const collapsedChanged = collapsedWindows.delete(windowId);
        if (collapsedChanged) await persistCollapsed();
      } else if (collapsedWindows.has(windowId)) {
        return {changed:false, reason:"collapsed"};
      }

      const changed = !openWindows.has(windowId);
      openWindows.add(windowId);
      if (changed) await persistOpen();
      await broadcastRail(windowId, false);
      return {changed, open:true, collapsed:false};
    });
  }

  async function close(windowId, {collapsed = true} = {}) {
    return coordinator.panel(windowId, "close", async () => {
      closedAt.set(windowId, now());
      const openChanged = openWindows.delete(windowId);
      const collapsedChanged = collapsed
        ? !collapsedWindows.has(windowId)
        : collapsedWindows.delete(windowId);

      if (collapsed) collapsedWindows.add(windowId);
      await clearWindowResources(windowId);
      if (openChanged) await persistOpen();
      if (collapsedChanged) await persistCollapsed();
      await broadcastRail(windowId, true);
      return {changed:openChanged || collapsedChanged, open:false, collapsed};
    });
  }

  async function removeWindow(windowId) {
    return coordinator.panel(windowId, "remove-window", async () => {
      const openChanged = openWindows.delete(windowId);
      const collapsedChanged = collapsedWindows.delete(windowId);
      closedAt.delete(windowId);
      await clearWindowResources(windowId);
      if (openChanged) await persistOpen();
      if (collapsedChanged) await persistCollapsed();
      return {changed:openChanged || collapsedChanged};
    });
  }

  function lastClosedAt(windowId) {
    return Number(closedAt.get(windowId) || 0);
  }

  return {open, close, removeWindow, lastClosedAt};
}
