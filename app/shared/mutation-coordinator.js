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
        pending,
        queued:Math.max(0, pending - (active ? 1 : 0)),
        ...extra
      });
    } catch {}
  };

  async function run(entry) {
    active = {id:entry.id,label:entry.label,startedAt:Date.now()};
    emit("start",entry,{active:{...active}});
    try {
      const value = await entry.mutation({id:entry.id,label:entry.label});
      emit("commit",entry);
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

  function enqueue(label, mutation) {
    if (typeof mutation !== "function") {
      return Promise.reject(new TypeError("Mutation must be a function"));
    }

    const entry = {
      id:++sequence,
      label:String(label || "mutation"),
      mutation
    };

    // Count work when it enters the queue, not only when it starts. This makes
    // diagnostics and test gates reflect the real amount of outstanding work.
    pending += 1;
    emit("enqueue",entry);

    // Use the same continuation for fulfilled/rejected tails so one failed
    // mutation cannot permanently poison the queue.
    const result = tail.then(() => run(entry), () => run(entry));
    tail = result.then(() => undefined, () => undefined);
    return result;
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

  return {enqueue,whenIdle,snapshot};
}
