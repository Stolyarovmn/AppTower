import { youtubeUrl } from '../modules/youtube.js';
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
