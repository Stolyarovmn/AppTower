export function createMutationCoordinator({onEvent = null} = {}) {
  let tail = Promise.resolve();
  let sequence = 0;
  let pending = 0;
  let active = null;

  const emit = (phase, entry, extra = {}) => {
    try {
      onEvent?.({
        phase,
        id:entry.id,
        label:entry.label,
        kind:entry.kind,
        pending,
        queued:Math.max(0, pending - (active ? 1 : 0)),
        ...extra
      });
    } catch {}
  };

  async function run(entry) {
    active = {
      id:entry.id,
      label:entry.label,
      kind:entry.kind,
      startedAt:Date.now()
    };
    emit("start",entry,{active:{...active}});
    try {
      const value = await entry.operation({
        id:entry.id,
        label:entry.label,
        kind:entry.kind
      });
      emit(entry.kind === "read" ? "read" : "commit",entry);
      return value;
    } catch (error) {
      emit("error",entry,{error:String(error?.message || error)});
      throw error;
    } finally {
      pending -= 1;
      active = null;
      emit("finish",entry);
    }
  }

  function enqueueOperation(kind, label, operation) {
    if (typeof operation !== "function") {
      return Promise.reject(new TypeError(`${kind === "read" ? "Reader" : "Mutation"} must be a function`));
    }

    const entry = {
      id:++sequence,
      label:String(label || kind),
      kind,
      operation
    };

    // Count all serialized work when it enters the queue, not only when it
    // starts. Reads use the same barrier as mutations so they cannot observe a
    // half-persisted state, but they are diagnosed separately and never emit a
    // commit phase.
    pending += 1;
    emit("enqueue",entry);

    // Use the same continuation for fulfilled/rejected tails so one failed
    // operation cannot permanently poison the queue.
    const result = tail.then(() => run(entry), () => run(entry));
    tail = result.then(() => undefined, () => undefined);
    return result;
  }

  function enqueue(label, mutation) {
    return enqueueOperation("mutation",label,mutation);
  }

  function enqueueRead(label, reader) {
    return enqueueOperation("read",label,reader);
  }

  async function whenIdle() {
    await tail;
  }

  function snapshot() {
    return {
      sequence,
      pending,
      queued:Math.max(0, pending - (active ? 1 : 0)),
      active:active ? {...active} : null
    };
  }

  return {enqueue,enqueueRead,whenIdle,snapshot};
}
