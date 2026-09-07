export function resolvePanelHostWindowId({search = "", currentWindowId = null} = {}) {
  const params = new URLSearchParams(String(search || ""));
  const raw = params.get("hostWindowId");

  if (raw !== null && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }

  const fallback = Number(currentWindowId);
  return Number.isInteger(fallback) && fallback >= 0 ? fallback : null;
}
