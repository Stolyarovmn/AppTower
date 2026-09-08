import { icon, shortcutIcon, iconButton } from './ui/icons.js';
import { read, send, applyTheme, subscribe } from './ui/client.js';
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

const shortcuts=document.createElement('div');shortcuts.className='shortcut-list';
const spacer=document.createElement('div');spacer.className='rail-spacer';
const separator=document.createElement('div');separator.className='rail-separator';
compact.append(separator,shortcuts,spacer);
for(const [label,name,command] of [['Добавить текущую страницу','add','add-current'],['Группы и шаблоны','group','organize'],['Поиск','search','search'],['Настройки','settings','settings']])
 compact.append(iconButton(label,name,()=>send({type:'OPEN_PANEL',windowId,command:{type:command}})));
async function renderRail(state){
 const key=`atv2.workspace.window.${windowId}`;
 const id=(await chrome.storage.session.get(key))[key];
 const w=state.workspaces.find(w=>w.id===id)||state.workspaces[0];
 shortcuts.replaceChildren(...w.items.map(x=>{const b=iconButton(x.title,'group',()=>send({type:'OPEN_PANEL',windowId,command:{type:'open-item',id:x.id}}));b.replaceChildren(shortcutIcon(x,state.settings.overlap));return b;}));
}
subscribe(renderRail);void read().then(renderRail);
