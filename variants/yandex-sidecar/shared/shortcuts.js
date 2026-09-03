export const SHORTCUT_SITE = "site";
export const SHORTCUT_GROUP = "group";
export const SHORTCUT_TEMPLATE = "template";
export const DEFAULT_TEMPLATE_OVERLAP = 50;

const MODES = new Set(["auto","secure","compat","real"]);

export function normalizeShortcutList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeShortcut).filter(Boolean);
}

export function normalizeShortcut(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const kind = raw.kind === SHORTCUT_GROUP || raw.kind === SHORTCUT_TEMPLATE
    ? raw.kind
    : SHORTCUT_SITE;

  if (kind === SHORTCUT_GROUP) {
    const id = cleanId(raw.id);
    if (!id) return null;
    const items = Array.isArray(raw.items)
      ? raw.items.map(normalizeShortcut).filter(item => item && item.kind !== SHORTCUT_GROUP).slice(0,100)
      : [];
    return {
      kind:SHORTCUT_GROUP,
      id,
      title:cleanTitle(raw.title || "Группа", 80) || "Группа",
      items
    };
  }

  if (kind === SHORTCUT_TEMPLATE) {
    const id = cleanId(raw.id);
    const top = normalizeSite(raw.top);
    const bottom = normalizeSite(raw.bottom);
    if (!id || !top || !bottom) return null;
    return {
      kind:SHORTCUT_TEMPLATE,
      id,
      title:cleanTitle(raw.title || `${top.title} + ${bottom.title}`, 100) || `${top.title} + ${bottom.title}`,
      top,
      bottom,
      overlap:clampOverlap(raw.overlap)
    };
  }

  return normalizeSite(raw);
}

export function normalizeSite(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const url = normalizeUrl(raw.url);
  if (!url) return null;
  return {
    kind:SHORTCUT_SITE,
    id:cleanId(raw.id) || crypto.randomUUID(),
    title:cleanTitle(raw.title || url, 120) || url,
    url,
    mode:MODES.has(raw.mode) ? raw.mode : "auto",
    compatDomains:normalizeDomains(raw.compatDomains)
  };
}

export function normalizeUrl(value) {
  let input = String(value || "").trim();
  if (!input) return null;
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) input = `https://${input}`;
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeDomains(values) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const text = String(raw || "").trim().toLowerCase();
    if (!text) continue;
    try {
      const host = text.includes("://") ? new URL(text).hostname : text.replace(/^\.+|\.+$/g, "");
      if (/^[a-z0-9.-]+$/i.test(host)) out.push(host);
    } catch {}
  }
  return [...new Set(out)];
}

export function clampOverlap(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_TEMPLATE_OVERLAP;
  return Math.min(80, Math.max(20, Math.round(number)));
}

export function groupInitials(title) {
  const text = String(title || "").trim();
  if (!text) return "Г";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${firstGlyph(words[0])}${firstGlyph(words[1])}`.toUpperCase();
  return Array.from(words[0] || text).slice(0,2).join("").toUpperCase();
}

export function isSite(item) { return item?.kind === SHORTCUT_SITE && Boolean(item.url); }
export function isGroup(item) { return item?.kind === SHORTCUT_GROUP && Array.isArray(item.items); }
export function isTemplate(item) { return item?.kind === SHORTCUT_TEMPLATE && isSite(item.top) && isSite(item.bottom); }

export function firstLaunchableSite(items) {
  for (const item of Array.isArray(items) ? items : []) {
    if (isSite(item)) return item;
    if (isTemplate(item)) return item.top;
    if (isGroup(item)) {
      const child = firstLaunchableSite(item.items);
      if (child) return child;
    }
  }
  return null;
}

export function findTopLevel(items, id) {
  return (Array.isArray(items) ? items : []).find(item => item?.id === id) || null;
}

export function findShortcutDeep(items, id) {
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.id === id) return item;
    if (isGroup(item)) {
      const found = item.items.find(child => child?.id === id);
      if (found) return found;
    }
  }
  return null;
}

export function cloneSite(site) {
  const normalized = normalizeSite(site);
  return normalized ? structuredClone(normalized) : null;
}

export function collectLaunchSites(items) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (isSite(item)) out.push(item);
    else if (isTemplate(item)) out.push(item.top, item.bottom);
    else if (isGroup(item)) out.push(...collectLaunchSites(item.items));
  }
  return out;
}

function cleanId(value) {
  const text = String(value || "").trim();
  return text.slice(0,128);
}

function cleanTitle(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0,max);
}

function firstGlyph(value) {
  return Array.from(String(value || "").trim())[0] || "";
}
