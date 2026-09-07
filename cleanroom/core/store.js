import {
  KEY,
  validate,
  migrate,
  reduce,
  syncProjection,
  mergeSync,
} from './model.js';
export function createStore(storage, onChange = () => {}) {
  let queue = Promise.resolve();
  let initial;
  async function read() {
    const saved = await storage.local.get([KEY, 'atv2.data.v1']);
    if (saved[KEY]) return validate(saved[KEY]);
    initial ||= migrate(saved['atv2.data.v1']);
    return structuredClone(initial);
  }
  function write(action) {
    const task = queue.then(async () => {
      const old = await read();
      const next =
        action.type === 'import' ? validate(action.value) : reduce(old, action);
      await onChange(next);
      await storage.local.set({ [KEY]: next });
      let warning = '';
      if (next.settings.sync) {
        try {
          const value = syncProjection(next);
          if (new TextEncoder().encode(JSON.stringify(value)).length > 7600)
            throw Error(
              'Настройки сохранены локально: объём превышает лимит одной записи Sync. Используйте экспорт.',
            );
          await storage.sync.set({ 'atv2.sync.v1': value });
        } catch (e) {
          warning = e.message;
        }
      }
      return { state: next, warning };
    });
    queue = task.catch(() => {});
    return task;
  }
  async function receive(remote) {
    const task = queue.then(async () => {
      const old = await read();
      if (!old.settings.sync) return;
      const next = mergeSync(old, remote);
      if (next !== old) {
        await onChange(next);
        await storage.local.set({ [KEY]: next });
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  return { read, write, receive };
}
