import { createStore } from './store.js';
import { url } from './model.js';
export function compatibilityRules(state, extensionId) {
  const origins = new Set();
  for (const w of state.workspaces)
    for (const p of Object.values(w.panes)) {
      if (p.url && ['A', 'C'].includes(p.mode))
        origins.add(new URL(p.url).origin);
    }
  return [...origins].sort().map((origin, index) => ({
    id: 1000 + index,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [
        { header: 'x-frame-options', operation: 'remove' },
        { header: 'content-security-policy', operation: 'remove' },
      ],
    },
    condition: {
      regexFilter: '^' + origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/',
      initiatorDomains: [extensionId],
      resourceTypes: ['sub_frame'],
    },
  }));
}
export function installFeatures({ setEnabled, openWindowPanel, log }) {
  const WELCOME_KEY = 'atv2.welcome.shown';
  let sidecars = new Map();
  const store = createStore(chrome.storage, async (state) => {
    setEnabled(state.enabled);
    const old = await chrome.declarativeNetRequest.getSessionRules();
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: old
        .filter((r) => r.id >= 1000 && r.id < 2000)
        .map((r) => r.id),
      addRules: compatibilityRules(state, chrome.runtime.id),
    });
    void chrome.runtime.sendMessage({ type: 'APP_CHANGED' }).catch(() => {});
  });
  async function sidecar(href, { reload = false } = {}) {
    href = url(href);
    if (!href) throw Error('Некорректный URL');
    const origin = new URL(href).origin;
    const cached =
      (await chrome.storage.session.get('atv2.sidecars'))['atv2.sidecars'] ||
      {};
    sidecars = new Map(Object.entries(cached));
    const id = sidecars.get(origin);
    if (id) {
      try {
        await chrome.windows.update(id, { focused: true });
        const tabs = await chrome.tabs.query({ windowId: id });
        if (tabs[0]) {
          if (reload) await chrome.tabs.reload(tabs[0].id);
          else if (tabs[0].url !== href)
            await chrome.tabs.update(tabs[0].id, { url: href });
        }
        return;
      } catch {
        sidecars.delete(origin);
      }
    }
    const win = await chrome.windows.create({
      url: href,
      type: 'popup',
      width: 960,
      height: 800,
    });
    sidecars.set(origin, win.id);
    await chrome.storage.session.set({
      'atv2.sidecars': Object.fromEntries(sidecars),
    });
  }
  async function closeSidecar(href) {
    href = url(href);
    if (!href) throw Error('Некорректный URL');
    const origin = new URL(href).origin;
    const cached =
      (await chrome.storage.session.get('atv2.sidecars'))['atv2.sidecars'] ||
      {};
    const id = cached[origin];
    if (id) await chrome.windows.remove(id).catch(() => {});
    delete cached[origin];
    sidecars.delete(origin);
    await chrome.storage.session.set({ 'atv2.sidecars': cached });
  }
  async function notifications() {
    if (
      !(await chrome.permissions.contains({ permissions: ['contentSettings'] }))
    )
      throw Error('Разрешите управление уведомлениями в настройках');
    const state = await store.read();
    await chrome.contentSettings.notifications.clear({ scope: 'regular' });
    for (const [origin, s] of Object.entries(state.sites))
      if (s.notifications !== 'ask')
        await chrome.contentSettings.notifications.set({
          primaryPattern: origin + '/*',
          setting: s.notifications,
          scope: 'regular',
        });
  }
  async function process(m, sender) {
    if (m.type === 'APP_GET') {
      const key = `atv2.workspace.window.${sender.tab?.windowId}`;
      return {
        ok: true,
        state: await store.read(),
        workspaceId: (await chrome.storage.session.get(key))[key],
      };
    }
    if (m.type === 'APP_MUTATE') {
      const result = await store.write(m.action);
      if (m.action.type === 'site-settings' && m.action.value.notifications)
        await notifications();
      return { ok: true, ...result };
    }
    if (m.type === 'APP_DISABLE') {
      await store.write({ type: 'enabled', value: false });
      for (const w of await chrome.windows.getAll())
        await chrome.sidePanel.close({ windowId: w.id }).catch(() => {});
      return { ok: true };
    }
    if (m.type === 'APP_OPTIONS') {
      if (m.section)
        await chrome.tabs.create({
          url: chrome.runtime.getURL(`options.html#${m.section}`),
        });
      else await chrome.runtime.openOptionsPage();
      return { ok: true };
    }
    if (m.type === 'APP_SIDECAR') {
      await sidecar(m.url, { reload: !!m.reload });
      return { ok: true };
    }
    if (m.type === 'APP_SIDECAR_RETURN') {
      await closeSidecar(m.url);
      return { ok: true };
    }
    if (m.type === 'APP_DISCOVER_PWA') {
      const page = url(sender.tab?.url),
        manifest = url(m.url);
      if (
        !page ||
        !manifest ||
        new URL(page).origin !== new URL(manifest).origin
      )
        return { ok: false };
      const response = await fetch(manifest, {
        credentials: 'omit',
        signal: AbortSignal.timeout(5000),
      });
      const raw = await response.text();
      if (raw.length > 100000) throw Error('Манифест слишком большой');
      const data = JSON.parse(raw);
      const start = url(new URL(data.start_url || page, manifest).href);
      if (new URL(start).origin !== new URL(page).origin)
        throw Error('Другой origin start_url');
      await store.write({
        type: 'pwa',
        pwa: {
          url: manifest,
          start_url: start,
          name: data.name || data.short_name || new URL(page).hostname,
        },
      });
      return { ok: true };
    }
  }
  chrome.runtime.onMessage.addListener((m, sender, reply) => {
    if (
      !m?.type?.startsWith('APP_') ||
      ['APP_CHANGED', 'APP_SLEEP'].includes(m.type)
    )
      return;
    process(m, sender)
      .then(reply)
      .catch((e) => {
        log('features.error', { type: m.type, error: e.message });
        reply({ ok: false, error: e.message });
      });
    return true;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes['atv2.sync.v1']?.newValue)
      void store
        .receive(changes['atv2.sync.v1'].newValue)
        .catch((e) => log('sync.error', { error: e.message }));
  });
  chrome.runtime.onInstalled.addListener(async (details = {}) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'at-add',
        title: 'Добавить страницу в AppTower',
        contexts: ['page'],
      });
      chrome.contextMenus.create({
        id: 'at-open',
        title: 'Открыть ссылку в AppTower',
        contexts: ['link'],
      });
    });
    if (details.reason === 'install') {
      const existing = await chrome.storage.local.get(WELCOME_KEY);
      if (!existing[WELCOME_KEY]) {
        await chrome.storage.local.set({ [WELCOME_KEY]: true });
        await chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      }
    }
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!Number.isInteger(tab?.windowId)) return;
    if (info.menuItemId === 'at-add')
      void openWindowPanel(tab.windowId, { type: 'add-current' });
    if (info.menuItemId === 'at-open')
      void openWindowPanel(tab.windowId, {
        type: 'navigate',
        url: info.linkUrl,
      });
  });
  void store
    .read()
    .then(async (state) => {
      setEnabled(state.enabled);
      const old = await chrome.declarativeNetRequest.getSessionRules();
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: old
          .filter((r) => r.id >= 1000 && r.id < 2000)
          .map((r) => r.id),
        addRules: compatibilityRules(state, chrome.runtime.id),
      });
    })
    .catch((e) => log('features.restore.failed', { error: e.message }));
  return store;
}
