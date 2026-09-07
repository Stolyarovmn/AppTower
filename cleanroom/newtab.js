import { icon } from './ui/icons.js';
import { read, send, applyTheme } from './ui/client.js';
import { url } from './core/model.js';
applyTheme((await read()).settings);
const windowId = (await chrome.windows.getCurrent()).id;
document.getElementById('open').onclick = () =>
  send({ type: 'OPEN_PANEL', windowId }).catch((e) => alert(e.message));
document.getElementById('settings').onclick = () =>
  send({ type: 'APP_OPTIONS' });
document.getElementById('address').onsubmit = (e) => {
  e.preventDefault();
  const href = url(document.getElementById('url').value);
  if (href) location.href = href;
};

const compact = document.getElementById('compact');
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type === 'NEW_TAB_VISIBILITY' && m.windowId === windowId)
    compact.hidden = !m.visible;
});
document.getElementById('expand').onclick =
  document.getElementById('open').onclick;
document.getElementById('disable').onclick = () =>
  send({ type: 'APP_DISABLE' });
void send({ type: 'RAIL_STATE_REQUEST', windowId });

document.getElementById('disable').innerHTML = icon('close');
document.getElementById('expand').innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.55"><path d="M12.5 4.5 7 10 12.5 15.5"/></svg>';
