import {createMutationCoordinator} from "./mutation-coordinator.js";

export function createBackgroundStateCoordinator({onEvent = null} = {}) {
  const emitLane = lane => event => {
    try { onEvent?.({...event,lane}); } catch {}
  };
  // Panel lifecycle is intentionally isolated from durable data writes. A
  // browser-owned Side Panel API can stall during open/close transitions; it
  // must never head-of-line block shortcut/workspace persistence. Workspace
  // and storage operations still share one FIFO lane so durable reads/writes
  // cannot interleave.
  const panelQueue = createMutationCoordinator({onEvent:emitLane("panel")});
  const dataQueue = createMutationCoordinator({onEvent:emitLane("data")});

  const label = (scope, action) => `${scope}:${action}`;

  return {
    panel(windowId, action, operation) {
      const id = Number(windowId);
      if (!Number.isInteger(id)) {
        return Promise.reject(new TypeError("panel windowId must be an integer"));
      }
      return panelQueue.enqueue(label(`panel:${id}`, action), operation);
    },

    workspace(windowId, action, operation) {
      const id = Number(windowId);
      const scope = Number.isInteger(id) ? `workspace:${id}` : "workspace:global";
      return dataQueue.enqueue(label(scope, action), operation);
    },

    workspaceRead(windowId, action, reader) {
      const id = Number(windowId);
      const scope = Number.isInteger(id) ? `workspace:${id}` : "workspace:global";
      return dataQueue.enqueueRead(label(scope, action), reader);
    },

    storage(action, operation) {
      return dataQueue.enqueue(label("storage", action), operation);
    },

    async whenIdle() {
      await Promise.all([panelQueue.whenIdle(),dataQueue.whenIdle()]);
    },

    snapshot() {
      return {panel:panelQueue.snapshot(),data:dataQueue.snapshot()};
    }
  };
}
