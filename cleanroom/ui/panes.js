import { send, mutate } from './client.js';
import { rendererUrl } from '../core/resources.js';

// Frames stay in their original DOM parent. Reparenting a live iframe reloads it.
// This cache survives navigation within this document, not native panel destruction.
export function createPanes(windowId, onError) {
  const slots = {}, cache = new Map();
  let latest, work, nextId = 0, revision = 0;
  for (const name of ['top', 'bottom']) {
    const el = document.querySelector(`.pane[data-pane="${name}"]`);
    const notice = document.createElement('div');
    notice.className = 'pane-notice'; notice.hidden = true;
    const wrap = el.querySelector('.frame-wrap'); wrap.append(notice);
    slots[name] = {el, wrap, notice, initial:el.querySelector('iframe'), current:null, paused:null};
  }
  function notice(name, label, run) {
    const n = slots[name].notice, b = document.createElement('button');
    b.textContent = label; b.onclick = () => Promise.resolve(run()).catch(onError);
    n.replaceChildren(b); n.hidden = false;
  }
  function park(slot) {
    if (!slot.current) return;
    slot.current.active = false;
    slot.current.at = Date.now();
    slot.current.frame.hidden = true;
    slot.current = null;
  }
  function discard(entry) {
    entry.frame.src = 'about:blank'; entry.frame.remove(); cache.delete(entry.key);
  }
  function trim() {
    if (!latest) return;
    const background = [...cache.values()].filter(e => !e.active).sort((a,b) => a.at-b.at);
    const excess = Math.max(0, background.length - latest.settings.backgroundLimit);
    background.forEach((e,i) => {
      const pinned = latest.sites[new URL(e.url).origin]?.neverSleep;
      if (i < excess || (!pinned && Date.now()-e.at >= latest.settings.idleMinutes*60000)) discard(e);
    });
  }
  function key(name, p) { return `${name}|${p.mode}|${rendererUrl(p, latest.modules)}`; }
  async function sleep(name) {
    const slot = slots[name];
    if (slot.current) { slot.paused = slot.current.key; discard(slot.current); slot.current = null; }
    notice(name, 'Область приостановлена — возобновить', () => wake(name));
  }
  async function wake(name, force = false) {
    const slot = slots[name], p = work.panes[name];
    if (!p.url) return;
    const k = key(name,p);
    if (slot.current?.key === k && !force) return;
    if (slot.current?.key !== k) park(slot);
    let entry = cache.get(k);
    if (!entry) {
      const frame = slot.initial || document.createElement('iframe'); slot.initial = null;
      frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'; frame.allowFullscreen = true;
      frame.title = p.title || new URL(p.url).hostname;
      entry = {key:k,frame,url:p.url,active:true,at:Date.now(),id:++nextId};
      cache.set(k, entry); slot.current = entry;
      if (!frame.isConnected) slot.wrap.insertBefore(frame,slot.notice);
      frame.addEventListener('load', () => { void chrome.runtime.sendMessage({type:'DEV_LOG',event:'frame.loaded',payload:{pane:name,resource:entry.id,source:frame.src}}).catch(()=>{}); });
      frame.src = rendererUrl(p,latest.modules);
    } else if (force) entry.frame.src = rendererUrl(p,latest.modules);
    entry.active = true; entry.at = Date.now(); entry.frame.hidden = false;
    slot.current = entry; slot.paused = null; slot.notice.hidden = true;
    void mutate({type:'recent',url:p.url,title:p.title}).catch(onError);
  }
  async function render(state,w) {
    const pass = ++revision;
    latest = state; work = w;
    for (const name of ['top','bottom']) {
      const slot = slots[name], p = w.panes[name], shown = w.split || name === w.singlePane;
      const input = slot.el.querySelector('[data-role="url"]');
      if (document.activeElement !== input) input.value = p.url.replace(/^https?:\/\//,'');
      if (!shown || !p.url) { park(slot); slot.notice.hidden = true; continue; }
      const setting = state.sites[new URL(p.url).origin];
      if (p.mode === 'R' || (p.mode === 'A' && setting?.pwaApp)) {
        park(slot); notice(name,'Открыть отдельным окном',() => send({type:'APP_SIDECAR',url:p.url})); continue;
      }
      if (slot.paused === key(name,p)) continue;
      await wake(name);
      if (pass !== revision) return;
      if (slot.current) {
        const zoom = setting?.zoom || 1;
        Object.assign(slot.current.frame.style,{zoom,width:`${100/zoom}%`,height:`${100/zoom}%`});
      }
    }
    trim();
  }
  // Only parked frames age out. An open translator remains live even without focus.
  const timer = setInterval(trim,15000);
  window.addEventListener('pagehide',() => clearInterval(timer),{once:true});
  window.addEventListener('blur',() => {
    for (const name of ['top','bottom']) if (slots[name].current?.frame === document.activeElement)
      void mutate({type:'layout',workspaceId:work.id,activePane:name}).catch(onError);
  });
  return {render,wake,sleep};
}
