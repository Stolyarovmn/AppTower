import {WORKSPACES_KEY, DEFAULT_WORKSPACE_KEY, normalizeWorkspace} from "./workspaces.js";
import {MODULE_STORAGE_KEY} from "../modules/module-registry.js";

const SYNC_ENABLED_KEY = "atnSyncEnabled";
const SYNC_INTENT_KEY = "atnSyncIntentV1";
const SYNC_PAYLOAD_KEY = "atnSyncPayload";
const SYNC_PREFERENCES_KEY = "atnSyncPreferencesV1";
const SYNC_UPDATED_AT_KEY = "atnSyncUpdatedAt";

const PREFERENCE_KEYS = [
  "atnThemeMode",
  "atnAccentMode",
  "atnAccentColor",
  "atnSiteSettingsV1",
  "atnPerformanceV1",
  "atnPwaPreferencesV1"
];

export function validSyncPayload(payload) {
  return Boolean(
    payload && payload.format === "app-tower-next-sync" &&
    Number.isFinite(Number(payload.updatedAt)) &&
    (Array.isArray(payload.workspaces) || Array.isArray(payload.sites))
  );
}

export function localShortcutTreeIsEmpty(workspaces) {
  return !Array.isArray(workspaces) || !workspaces.some(workspace =>
    Array.isArray(workspace?.sites) && workspace.sites.length > 0
  );
}

export function shouldRestoreSync({remoteIntent, remotePayload, localWorkspaces}) {
  if (remoteIntent === true) return true;
  if (remoteIntent === false) return false;
  return validSyncPayload(remotePayload) && localShortcutTreeIsEmpty(localWorkspaces);
}

export function sanitizeSyncedPreferences(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const result = {};
  for (const key of PREFERENCE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload,key)) continue;
    const value = payload[key];
    try {
      result[key] = structuredClone(value);
    } catch {}
  }
  return result;
}

function workspaceFromRemote(raw) {
  const id = String(raw?.id || "").slice(0,128);
  if (!id) return null;
  return normalizeWorkspace({
    id,
    name:String(raw?.name || "Workspace"),
    sites:Array.isArray(raw?.sites) ? raw.sites : [],
    panes:{top:{},bottom:{}},
    layout:{split:false,ratio:.58,activePane:"top"},
    createdAt:Date.now(),
    updatedAt:Number(raw?.updatedAt) || Date.now()
  });
}

async function restoreRemotePayload(payload) {
  if (!validSyncPayload(payload)) return false;
  let workspaces = [];
  if (Array.isArray(payload.workspaces)) {
    workspaces = payload.workspaces.map(workspaceFromRemote).filter(Boolean);
  } else if (Array.isArray(payload.sites)) {
    workspaces = [normalizeWorkspace({
      id:crypto.randomUUID(),
      name:"Основной",
      sites:payload.sites,
      panes:{top:{},bottom:{}},
      layout:{split:false,ratio:.58,activePane:"top"},
      createdAt:Date.now(),
      updatedAt:Date.now()
    })].filter(Boolean);
  }
  if (!workspaces.length) return false;

  const defaultWorkspaceId = workspaces.some(item => item.id === payload.defaultWorkspaceId)
    ? payload.defaultWorkspaceId
    : workspaces[0].id;
  const patch = {
    [WORKSPACES_KEY]:workspaces,
    [DEFAULT_WORKSPACE_KEY]:defaultWorkspaceId,
    [SYNC_UPDATED_AT_KEY]:Number(payload.updatedAt) || Date.now()
  };
  if (Array.isArray(payload.modules)) {
    patch[MODULE_STORAGE_KEY] = Object.fromEntries(
      payload.modules.filter(item => item?.id).map(item => [String(item.id),item])
    );
  }
  await chrome.storage.local.set(patch);
  return true;
}

function preferenceSnapshot(raw) {
  const data = {};
  for (const key of PREFERENCE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw,key)) data[key] = raw[key];
  }
  return {
    format:"app-tower-next-preferences",
    schemaVersion:1,
    updatedAt:Date.now(),
    data
  };
}

function validPreferenceEnvelope(value) {
  return Boolean(
    value && value.format === "app-tower-next-preferences" &&
    Number.isFinite(Number(value.updatedAt)) &&
    value.data && typeof value.data === "object" && !Array.isArray(value.data)
  );
}

async function installSyncBridge() {
  let applyingRemotePreferences = false;
  let pushTimer = null;

  const pushPreferences = async () => {
    if (applyingRemotePreferences) return;
    const local = await chrome.storage.local.get([SYNC_ENABLED_KEY,...PREFERENCE_KEYS]);
    if (local[SYNC_ENABLED_KEY] !== true) return;
    await chrome.storage.sync.set({
      [SYNC_PREFERENCES_KEY]:preferenceSnapshot(local)
    });
  };

  const schedulePreferencePush = () => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void pushPreferences().catch(() => {});
    }, 120);
  };

  const applyPreferenceEnvelope = async envelope => {
    if (!validPreferenceEnvelope(envelope)) return false;
    const current = await chrome.storage.local.get(SYNC_ENABLED_KEY);
    if (current[SYNC_ENABLED_KEY] !== true) return false;
    const patch = sanitizeSyncedPreferences(envelope.data);
    if (!Object.keys(patch).length) return false;
    applyingRemotePreferences = true;
    try {
      await chrome.storage.local.set(patch);
    } finally {
      applyingRemotePreferences = false;
    }
    return true;
  };

  // Bootstrap before onInstalled/onStartup is dispatched. This is the critical
  // reinstall path: the old implementation stored the opt-in only in local
  // storage, so uninstalling reset the switch and prevented the remote payload
  // from being pulled on the next install.
  const [remote,local] = await Promise.all([
    chrome.storage.sync.get([SYNC_INTENT_KEY,SYNC_PAYLOAD_KEY,SYNC_PREFERENCES_KEY]),
    chrome.storage.local.get([SYNC_ENABLED_KEY,WORKSPACES_KEY])
  ]);

  const restore = shouldRestoreSync({
    remoteIntent:remote[SYNC_INTENT_KEY],
    remotePayload:remote[SYNC_PAYLOAD_KEY],
    localWorkspaces:local[WORKSPACES_KEY]
  });

  if (restore) {
    const patch = {[SYNC_ENABLED_KEY]:true};
    if (validPreferenceEnvelope(remote[SYNC_PREFERENCES_KEY])) {
      Object.assign(patch,sanitizeSyncedPreferences(remote[SYNC_PREFERENCES_KEY].data));
    }
    await chrome.storage.local.set(patch);
    if (localShortcutTreeIsEmpty(local[WORKSPACES_KEY])) {
      await restoreRemotePayload(remote[SYNC_PAYLOAD_KEY]);
    }
    if (remote[SYNC_INTENT_KEY] !== true) {
      await chrome.storage.sync.set({[SYNC_INTENT_KEY]:true}).catch(() => {});
    }
  } else if (remote[SYNC_INTENT_KEY] === false && local[SYNC_ENABLED_KEY] === true) {
    await chrome.storage.local.set({[SYNC_ENABLED_KEY]:false});
  }

  chrome.storage.onChanged.addListener((changes,area) => {
    if (area === "local") {
      if (changes[SYNC_ENABLED_KEY]) {
        const enabled = changes[SYNC_ENABLED_KEY].newValue === true;
        void chrome.storage.sync.set({[SYNC_INTENT_KEY]:enabled}).catch(() => {});
        if (enabled) schedulePreferencePush();
      }
      if (!applyingRemotePreferences && PREFERENCE_KEYS.some(key => changes[key])) {
        schedulePreferencePush();
      }
      return;
    }

    if (area !== "sync") return;
    if (changes[SYNC_INTENT_KEY]) {
      const enabled = changes[SYNC_INTENT_KEY].newValue === true;
      void chrome.storage.local.set({[SYNC_ENABLED_KEY]:enabled}).catch(() => {});
    }
    if (changes[SYNC_PREFERENCES_KEY]?.newValue) {
      void applyPreferenceEnvelope(changes[SYNC_PREFERENCES_KEY].newValue).catch(() => {});
    }
  });
}

if (globalThis.chrome?.storage?.local && globalThis.chrome?.storage?.sync) {
  await installSyncBridge();
}
