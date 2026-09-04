import {createMutationCoordinator} from "./mutation-coordinator.js";

// Keep serialization local to the state that can actually conflict. A single
// process-wide FIFO is unsafe in an MV3 extension: one browser API promise that
// never settles can otherwise freeze every shortcut save, panel transition and
// workspace command in every browser window.
export function createBackgroundStateCoordinator({onEvent = null} = {}) {
  const windowQueues = new Map();
  const storageQueues = new Map();
  const globalWorkspaceQueue = createMutationCoordinator({onEvent});

  const label = (scope, action) => `${scope}:${action}`;

  function queueForWindow(windowId) {
    const id = Number(windowId);
    if (!Number.isInteger(id)) return null;
    let queue = windowQueues.get(id);
    if (!queue) {
      queue = createMutationCoordinator({onEvent});
      windowQueues.set(id, queue);
    }
    return queue;
  }

  // Storage work is split by conflict domain. Bootstrap/browser-repair work
  // must never sit in front of a user click. Sync operations still serialize
  // with each other, settings with settings, and pending panel actions with
  // pending panel actions.
  function storageLane(action) {
    const name = String(action || "storage");
    if (name.startsWith("initialize-")) return "bootstrap";
    if (name === "pending-panel-action") return "panel-action";
    if (name.includes("sync")) return "sync";
    if (name.includes("site-settings") || name.includes("notification-setting")) return "settings";
    return "default";
  }

  function queueForStorage(action) {
    const lane = storageLane(action);
    let queue = storageQueues.get(lane);
    if (!queue) {
      queue = createMutationCoordinator({onEvent});
      storageQueues.set(lane, queue);
    }
    return {lane,queue};
  }

  return {
    panel(windowId, action, operation) {
      const id = Number(windowId);
      const queue = queueForWindow(id);
      if (!queue) {
        return Promise.reject(new TypeError("panel windowId must be an integer"));
      }
      return queue.enqueue(label(`panel:${id}`, action), operation);
    },

    workspace(windowId, action, operation) {
      const id = Number(windowId);
      const queue = queueForWindow(id);
      if (queue) return queue.enqueue(label(`workspace:${id}`, action), operation);
      return globalWorkspaceQueue.enqueue(label("workspace:global", action), operation);
    },

    workspaceRead(windowId, action, reader) {
      const id = Number(windowId);
      const queue = queueForWindow(id);
      if (queue) return queue.enqueueRead(label(`workspace:${id}`, action), reader);
      return globalWorkspaceQueue.enqueueRead(label("workspace:global", action), reader);
    },

    storage(action, operation) {
      const {lane,queue} = queueForStorage(action);
      return queue.enqueue(label(`storage:${lane}`, action), operation);
    },

    async whenIdle() {
      const queues = [globalWorkspaceQueue,...windowQueues.values(),...storageQueues.values()];
      await Promise.all(queues.map(queue => queue.whenIdle()));
    },

    snapshot() {
      const windows = Object.fromEntries(
        [...windowQueues.entries()].map(([id,queue]) => [id,queue.snapshot()])
      );
      const storage = Object.fromEntries(
        [...storageQueues.entries()].map(([lane,queue]) => [lane,queue.snapshot()])
      );
      return {
        windows,
        storage,
        globalWorkspace:globalWorkspaceQueue.snapshot(),
        pending:[
          globalWorkspaceQueue,
          ...windowQueues.values(),
          ...storageQueues.values()
        ].reduce((sum,queue) => sum + queue.snapshot().pending,0)
      };
    }
  };
}
