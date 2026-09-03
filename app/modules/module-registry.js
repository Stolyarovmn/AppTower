export const MODULE_STORAGE_KEY = "atnInstalledModules";
export const MODULE_CATALOG_PATH = "modules/catalog.json";
const MODULE_FORMAT = "app-tower-module";
const CATALOG_FORMAT = "app-tower-module-catalog";
const MODULE_SCHEMA_VERSION = 1;

export async function loadModuleCatalog() {
  const response = await fetch(chrome.runtime.getURL(MODULE_CATALOG_PATH), { cache:"no-store" });
  if (!response.ok) throw new Error(`Module catalog HTTP ${response.status}`);
  const raw = await response.json();
  if (!raw || raw.format !== CATALOG_FORMAT || raw.schemaVersion !== 1 || !Array.isArray(raw.modules)) {
    throw new Error("Invalid App Tower module catalog");
  }
  return raw.modules
    .map(entry => normalizeCatalogEntry(entry))
    .filter(Boolean);
}

export async function loadInstalledModules() {
  const raw = (await chrome.storage.local.get(MODULE_STORAGE_KEY))[MODULE_STORAGE_KEY];
  const result = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [id, manifest] of Object.entries(raw)) {
    try {
      const normalized = validateModuleManifest(manifest);
      if (normalized.id === id) result[id] = normalized;
    } catch {}
  }
  return result;
}

export async function installBundledModule(moduleId) {
  const catalog = await loadModuleCatalog();
  const entry = catalog.find(item => item.id === moduleId);
  if (!entry?.manifest) throw new Error(`Unknown bundled module: ${moduleId}`);
  const response = await fetch(chrome.runtime.getURL(entry.manifest), { cache:"no-store" });
  if (!response.ok) throw new Error(`Module ${moduleId} HTTP ${response.status}`);
  return installModuleManifest(await response.json());
}

export async function installModuleManifest(rawManifest) {
  const manifest = validateModuleManifest(rawManifest);
  const installed = await loadInstalledModules();
  installed[manifest.id] = manifest;
  await chrome.storage.local.set({ [MODULE_STORAGE_KEY]: installed });
  return manifest;
}

export async function uninstallModule(moduleId) {
  const installed = await loadInstalledModules();
  if (!(moduleId in installed)) return false;
  delete installed[moduleId];
  await chrome.storage.local.set({ [MODULE_STORAGE_KEY]: installed });
  return true;
}

export function validateModuleManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Module must be an object");
  if (raw.format !== MODULE_FORMAT || Number(raw.schemaVersion) !== MODULE_SCHEMA_VERSION) {
    throw new Error("Unsupported App Tower module format");
  }

  const id = cleanId(raw.id);
  const name = cleanText(raw.name, 80);
  const version = cleanText(raw.version || "1.0.0", 32);
  const category = cleanId(raw.category || "general");
  const description = cleanText(raw.description || "", 240);
  const hosts = Array.isArray(raw.hosts)
    ? [...new Set(raw.hosts.map(normalizeHost).filter(Boolean))].slice(0, 24)
    : [];

  if (!id || !name || !Array.isArray(raw.adapters) || !raw.adapters.length || raw.adapters.length > 40) {
    throw new Error("Invalid module metadata");
  }

  const adapters = raw.adapters.map((adapter, index) => validateAdapter(adapter, index));
  const notificationCategories = Array.isArray(raw.notificationCategories)
    ? raw.notificationCategories.map(validateNotificationCategory).filter(Boolean).slice(0, 24)
    : [];
  return {
    format:MODULE_FORMAT,
    schemaVersion:MODULE_SCHEMA_VERSION,
    id, name, version, category, description, hosts, adapters,
    notificationCategories
  };
}

export function resolveModuleRenderer(value, installedModules) {
  const url = normalizeWebUrl(value);
  if (!url) return null;
  const manifests = Object.values(installedModules || {}).sort((a,b) => a.id.localeCompare(b.id));

  for (const manifest of manifests) {
    for (const adapter of manifest.adapters || []) {
      let match = null;
      try {
        match = new RegExp(adapter.match.urlRegex, "i").exec(url);
      } catch {
        continue;
      }
      if (!match) continue;

      const renderer = adapter.renderer;
      let src = url;
      if (renderer.source !== "original") {
        src = applyTemplate(renderer.srcTemplate, match);
      } else if (renderer.replaceHost) {
        try {
          const rewritten = new URL(src);
          rewritten.hostname = renderer.replaceHost;
          src = rewritten.href;
        } catch {}
      }

      const normalizedSrc = normalizeWebUrl(src);
      if (!normalizedSrc) continue;

      return {
        type:renderer.type,
        moduleId:manifest.id,
        serviceKey:renderer.serviceKey || manifest.id,
        kind:renderer.kind || "media",
        src:normalizedSrc,
        layout:structuredClone(renderer.layout || {})
      };
    }
  }
  return null;
}

export function findCatalogCandidates(value, catalog, installedModules = {}) {
  let host = "";
  try { host = new URL(normalizeWebUrl(value)).hostname.replace(/^www\./,"").toLowerCase(); } catch {}
  if (!host) return [];
  return (catalog || []).filter(entry => {
    if (installedModules?.[entry.id]) return false;
    return (entry.hosts || []).some(candidate => host === candidate || host.endsWith(`.${candidate}`));
  });
}

function validateNotificationCategory(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = cleanId(raw.id);
  const name = cleanText(raw.name || raw.title || id, 80);
  const description = cleanText(raw.description || "", 160);
  if (!id || !name) return null;
  return {id,name,description};
}

export function modulesForUrl(value, installedModules = {}) {
  const url = normalizeWebUrl(value);
  if (!url) return [];
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./,"").toLowerCase(); } catch {}
  if (!host) return [];
  return Object.values(installedModules || {}).filter(manifest =>
    (manifest.hosts || []).some(candidate => host === candidate || host.endsWith(`.${candidate}`))
  );
}

function validateAdapter(raw, index) {
  if (!raw || typeof raw !== "object") throw new Error(`Invalid adapter ${index}`);
  const id = cleanId(raw.id || `adapter-${index + 1}`);
  const urlRegex = String(raw.match?.urlRegex || "");
  if (!id || !urlRegex || urlRegex.length > 600) throw new Error(`Invalid adapter matcher: ${id}`);

  // Compile now so malformed patterns never enter storage.
  try { new RegExp(urlRegex, "i"); } catch { throw new Error(`Invalid module regex: ${id}`); }

  const renderer = raw.renderer || {};
  if (!["media","web"].includes(renderer.type)) throw new Error(`Unsupported renderer type in ${id}`);

  const source = renderer.source === "original" ? "original" : "template";
  const srcTemplate = source === "template" ? String(renderer.srcTemplate || "") : "";
  if (source === "template" && (!srcTemplate || srcTemplate.length > 1200)) {
    throw new Error(`Invalid renderer template in ${id}`);
  }

  return {
    id,
    match:{urlRegex},
    renderer:{
      type:renderer.type,
      serviceKey:cleanId(renderer.serviceKey || ""),
      kind:cleanId(renderer.kind || (renderer.type === "web" ? "web" : "media")),
      source,
      srcTemplate,
      replaceHost:normalizeHost(renderer.replaceHost || ""),
      layout:validateLayout(renderer.layout || {})
    }
  };
}

function validateLayout(raw) {
  const result = {};
  if (raw.height === "fill") result.height = "fill";
  else if (Number.isFinite(Number(raw.height))) {
    result.height = Math.min(1200, Math.max(80, Math.round(Number(raw.height))));
  }

  const aspect = String(raw.aspectRatio || "").trim();
  if (/^\d{1,2}(?:\.\d+)?\s*\/\s*\d{1,2}(?:\.\d+)?$/.test(aspect)) {
    result.aspectRatio = aspect;
  }
  return result;
}

function applyTemplate(template, match) {
  return String(template).replace(/\{\{(\d+)\}\}/g, (_, rawIndex) => {
    const value = match[Number(rawIndex)] ?? "";
    return encodeURIComponent(String(value));
  });
}

function normalizeCatalogEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = cleanId(raw.id);
  const name = cleanText(raw.name, 80);
  const manifest = String(raw.manifest || "");
  if (!id || !name || !/^modules\/[A-Za-z0-9._/-]+\.json$/.test(manifest)) return null;
  return {
    id,
    name,
    version:cleanText(raw.version || "", 32),
    category:cleanId(raw.category || "general"),
    description:cleanText(raw.description || "", 240),
    hosts:Array.isArray(raw.hosts) ? raw.hosts.map(normalizeHost).filter(Boolean) : [],
    manifest
  };
}

function normalizeHost(value) {
  const host = String(value || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  return /^[a-z0-9.-]+$/.test(host) ? host : "";
}

function normalizeWebUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function cleanId(value) {
  const id = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(id) ? id : "";
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max);
}
