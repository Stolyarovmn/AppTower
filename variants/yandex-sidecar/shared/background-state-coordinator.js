import {createMutationCoordinator} from "./mutation-coordinator.js";

export function createBackgroundStateCoordinator({onEvent = null} = {}) {
  const queue = createMutationCoordinator({onEvent});

  const label = (scope, action) => `${scope}:${action}`;

  return {
    panel(windowId, action, operation) {
      const id = Number(windowId);
      if (!Number.isInteger(id)) {
        return Promise.reject(new TypeError("panel windowId must be an integer"));
      }
      return queue.enqueue(label(`panel:${id}`, action), operation);
    },

    workspace(windowId, action, operation) {
      const id = Number(windowId);
      const scope = Number.isInteger(id) ? `workspace:${id}` : "workspace:global";
      return queue.enqueue(label(scope, action), operation);
    },

    workspaceRead(windowId, action, reader) {
      const id = Number(windowId);
      const scope = Number.isInteger(id) ? `workspace:${id}` : "workspace:global";
      return queue.enqueueRead(label(scope, action), reader);
    },

    storage(action, operation) {
      return queue.enqueue(label("storage", action), operation);
    },

    whenIdle() {
      return queue.whenIdle();
    },

    snapshot() {
      return queue.snapshot();
    }
  };
}
