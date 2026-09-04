export function createPanelStateStore({
  coordinator,
  openWindows,
  collapsedWindows,
  persistOpen,
  persistCollapsed,
  broadcastRail,
  clearWindowResources = () => {},
  cancelPendingDisconnect = () => {},
  now = () => Date.now()
}) {
  if (!coordinator) throw new TypeError("coordinator is required");
  if (!(openWindows instanceof Set) || !(collapsedWindows instanceof Set)) {
    throw new TypeError("panel state sets are required");
  }

  const closedAt = new Map();

  async function open(windowId, {authoritative = false} = {}) {
    return coordinator.panel(windowId, "open", async () => {
      let collapsedChanged = false;
      if (authoritative) {
        closedAt.delete(windowId);
        collapsedChanged = collapsedWindows.delete(windowId);
      } else if (collapsedWindows.has(windowId)) {
        return {changed:false, reason:"collapsed"};
      }

      await cancelPendingDisconnect(windowId);
      const changed = !openWindows.has(windowId);
      openWindows.add(windowId);

      // Visibility is the user-facing state and must not wait for session
      // persistence. In Edge a slow storage write here used to leave the
      // injected rail visible beside an already-open native Side Panel.
      await broadcastRail(windowId, false);

      if (collapsedChanged) await persistCollapsed();
      if (changed) await persistOpen();
      return {changed, open:true, collapsed:false};
    });
  }

  async function close(windowId, {collapsed = true} = {}) {
    return coordinator.panel(windowId, "close", async () => {
      closedAt.set(windowId, now());
      await cancelPendingDisconnect(windowId);
      const openChanged = openWindows.delete(windowId);
      const collapsedChanged = collapsed
        ? !collapsedWindows.has(windowId)
        : collapsedWindows.delete(windowId);

      if (collapsed) collapsedWindows.add(windowId);

      // Handoff to the collapsed rail before any persistence/cleanup awaits.
      // The native Side Panel may already be gone by the time this mutation is
      // processed; delaying this broadcast makes Collapse look like Close.
      await broadcastRail(windowId, true);

      await clearWindowResources(windowId);
      if (openChanged) await persistOpen();
      if (collapsedChanged) await persistCollapsed();
      return {changed:openChanged || collapsedChanged, open:false, collapsed};
    });
  }

  async function removeWindow(windowId) {
    return coordinator.panel(windowId, "remove-window", async () => {
      await cancelPendingDisconnect(windowId);
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
