export const THEME_MODE_KEY = "atnThemeMode";
export const ACCENT_MODE_KEY = "atnAccentMode";
export const ACCENT_COLOR_KEY = "atnAccentColor";

export const DEFAULT_ACCENT = "#45c9bc";
const THEME_MODES = new Set(["system","light","dark"]);
const ACCENT_MODES = new Set(["system","custom"]);

export function normalizeThemeSettings(raw = {}) {
  return {
    themeMode:THEME_MODES.has(raw[THEME_MODE_KEY]) ? raw[THEME_MODE_KEY] : "system",
    accentMode:ACCENT_MODES.has(raw[ACCENT_MODE_KEY]) ? raw[ACCENT_MODE_KEY] : "system",
    accentColor:normalizeHexColor(raw[ACCENT_COLOR_KEY]) || DEFAULT_ACCENT
  };
}

export async function readThemeSettings() {
  const raw = await chrome.storage.local.get([
    THEME_MODE_KEY,
    ACCENT_MODE_KEY,
    ACCENT_COLOR_KEY
  ]);
  return normalizeThemeSettings(raw);
}

export function normalizeHexColor(value) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : "";
}

export function resolvedThemeMode(settings, media = globalThis.matchMedia?.("(prefers-color-scheme: dark)")) {
  if (settings?.themeMode === "light" || settings?.themeMode === "dark") return settings.themeMode;
  return media?.matches ? "dark" : "light";
}

export function resolveSystemAccent(documentRef = document) {
  try {
    const probe = documentRef.createElement("span");
    probe.style.cssText = "position:fixed;left:-9999px;top:-9999px;color:AccentColor;pointer-events:none";
    if (!probe.style.color) return DEFAULT_ACCENT;
    (documentRef.documentElement || documentRef.body).appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function resolvedAccent(settings, documentRef = document) {
  if (settings?.accentMode === "custom") {
    return normalizeHexColor(settings.accentColor) || DEFAULT_ACCENT;
  }
  return resolveSystemAccent(documentRef);
}

export function contrastForColor(value) {
  const text = String(value || "").trim();
  let rgb = null;

  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  } else {
    const match = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i.exec(text);
    if (match) rgb = [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  if (!rgb) return "#ffffff";
  const [r,g,b] = rgb.map(channel => Math.max(0,Math.min(255,channel)) / 255);
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance > 0.62 ? "#111111" : "#ffffff";
}

export function applyThemeToDocument(settings, documentRef = document) {
  const root = documentRef.documentElement;
  const theme = resolvedThemeMode(settings);
  const accent = resolvedAccent(settings, documentRef);

  root.dataset.theme = theme;
  root.dataset.themeMode = settings?.themeMode || "system";
  root.dataset.accentMode = settings?.accentMode || "system";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-contrast", contrastForColor(accent));
  root.style.colorScheme = theme;

  return {theme, accent};
}

export function watchSystemTheme(callback) {
  const media = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  if (!media) return () => {};
  const handler = () => callback?.(media.matches ? "dark" : "light");
  media.addEventListener?.("change", handler);
  return () => media.removeEventListener?.("change", handler);
}
