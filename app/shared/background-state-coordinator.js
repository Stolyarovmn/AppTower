import {createMutationCoordinator} from "./mutation-coordinator.js";

// Serialize only operations that can really conflict. A process-wide FIFO (or
// even a single queue per window) makes availability depend on the slowest
// browser/storage promise. Panel lifecycle and workspace persistence touch
// different state families, so they deliberately use separate lanes.
export function createBackgroundStateCoordinator({onEvent = null} = {}) {
  const panelQueues = new Map();
  const workspaceQueues = new Map();
  const storageQueues = new Map();
  const globalWorkspaceQueue = createMutationCoordinator({onEvent});

  const label = (scope, action) => `${scope}:${action}`;

  function queueFrom(map, key) {
    let queue = map.get(key);
    if (!queue) {
      queue = createMutationCoordinator({onEvent});
      map.set(key, queue);
    }
    return queue;
  }

  function validWindowId(windowId) {
    const id = Number(windowId);
    return Number.isInteger(id) && id >= 0 ? id : null;
  }

  // Bootstrap/browser-repair work must never sit in front of a user click.
  // Sync operations serialize with each other, settings with settings, and
  // pending panel actions with pending panel actions.
  function storageLane(action) {
    const name = String(action || "storage");
    if (name.startsWith("initialize-")) return "bootstrap";
    if (name === "pending-panel-action") return "panel-action";
    if (name.includes("sync")) return "sync";
    if (name.includes("site-settings") || name.includes("notification-setting")) return "settings";
    return "default";
  }

  function allQueues() {
    return [
      globalWorkspaceQueue,
      ...panelQueues.values(),
      ...workspaceQueues.values(),
      ...storageQueues.values()
    ];
  }

  return {
    panel(windowId, action, operation) {
      const id = validWindowId(windowId);
      if (id == null) {
        return Promise.reject(new TypeError("panel windowId must be an integer"));
      }
      return queueFrom(panelQueues,id).enqueue(label(`panel:${id}`, action), operation);
    },

    workspace(windowId, action, operation) {
      const id = validWindowId(windowId);
      if (id != null) {
        return queueFrom(workspaceQueues,id).enqueue(label(`workspace:${id}`, action), operation);
      }
      return globalWorkspaceQueue.enqueue(label("workspace:global", action), operation);
    },

    workspaceRead(windowId, action, reader) {
      const id = validWindowId(windowId);
      if (id != null) {
        return queueFrom(workspaceQueues,id).enqueueRead(label(`workspace:${id}`, action), reader);
      }
      return globalWorkspaceQueue.enqueueRead(label("workspace:global", action), reader);
    },

    storage(action, operation) {
      const lane = storageLane(action);
      return queueFrom(storageQueues,lane).enqueue(label(`storage:${lane}`, action), operation);
    },

    async whenIdle() {
      await Promise.all(allQueues().map(queue => queue.whenIdle()));
    },

    snapshot() {
      const panel = Object.fromEntries(
        [...panelQueues.entries()].map(([id,queue]) => [id,queue.snapshot()])
      );
      const workspace = Object.fromEntries(
        [...workspaceQueues.entries()].map(([id,queue]) => [id,queue.snapshot()])
      );
      const storage = Object.fromEntries(
        [...storageQueues.entries()].map(([lane,queue]) => [lane,queue.snapshot()])
      );
      return {
        panel,
        workspace,
        storage,
        globalWorkspace:globalWorkspaceQueue.snapshot(),
        pending:allQueues().reduce((sum,queue) => sum + queue.snapshot().pending,0)
      };
    }
  };
}
