export function createPanelLifecycleController({
  panelStateStore,
  panelPorts,
  disconnectTimers = new Map(),
  hasNativePanelClosedEvent = false,
  now = () => Date.now(),
  setTimer = (fn, delay) => setTimeout(fn, delay),
  clearTimer = handle => clearTimeout(handle),
  disconnectDelayMs = 900,
  reconnectCooldownMs = 1200
}) {
  if (!panelStateStore) throw new TypeError("panelStateStore is required");
  if (!(panelPorts instanceof Map)) throw new TypeError("panelPorts map is required");
  if (!(disconnectTimers instanceof Map)) throw new TypeError("disconnectTimers map is required");

  function cancelPendingDisconnect(windowId) {
    const pending = disconnectTimers.get(windowId);
    if (!pending) return false;
    clearTimer(pending);
    disconnectTimers.delete(windowId);
    return true;
  }

  async function connected(windowId) {
    if (!Number.isInteger(Number(windowId))) return {changed:false, reason:"invalid-window"};
    cancelPendingDisconnect(windowId);

    if (hasNativePanelClosedEvent) {
      const closedAgo = now() - panelStateStore.lastClosedAt(windowId);
      if (closedAgo <= reconnectCooldownMs) {
        return {changed:false, reason:"close-cooldown"};
      }
      return panelStateStore.open(windowId,{authoritative:true});
    }

    return panelStateStore.open(windowId);
  }

  function disconnected(windowId) {
    if (!Number.isInteger(Number(windowId))) return false;
    if (hasNativePanelClosedEvent) return false;

    cancelPendingDisconnect(windowId);
    const timer = setTimer(() => {
      disconnectTimers.delete(windowId);
      if (!panelPorts.get(windowId)?.size) {
        void panelStateStore.close(windowId,{collapsed:true});
      }
    }, disconnectDelayMs);
    disconnectTimers.set(windowId,timer);
    return true;
  }

  function removed(windowId) {
    cancelPendingDisconnect(windowId);
    return panelStateStore.removeWindow(windowId);
  }

  return {
    connected,
    disconnected,
    removed,
    cancelPendingDisconnect,
    disconnectTimers
  };
}
