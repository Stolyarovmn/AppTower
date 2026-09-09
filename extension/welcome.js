import { read, send, applyTheme } from './ui/client.js';

applyTheme((await read()).settings);
const windowId = (await chrome.windows.getCurrent()).id;
document.getElementById('open').onclick = () =>
  send({ type: 'OPEN_PANEL', windowId }).catch((error) => alert(error.message));
document.getElementById('settings').onclick = () =>
  send({ type: 'APP_OPTIONS' }).catch((error) => alert(error.message));
