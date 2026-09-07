import { youtubeUrl } from '../modules/youtube.js';
export function evictLeases(leases, key, limit) {
  const others = Object.entries(leases)
    .filter(([id]) => id !== key)
    .sort((a, b) => a[1].at - b[1].at);
  return others
    .slice(0, Math.max(0, others.length + 1 - Math.max(1, Math.min(6, limit))))
    .map(([id]) => id);
}
export function rendererUrl(pane, modules) {
  if (!pane.url) return '';
  if (pane.mode === 'A') {
    if (modules.some((m) => m.type === 'youtube' && m.enabled)) {
      const converted = youtubeUrl(pane.url);
      if (converted) return converted;
    }
    const m = modules.find(
      (m) => m.enabled && m.host === new URL(pane.url).hostname,
    );
    if (m) return m.target;
  }
  return pane.url;
}
