import { send, mutate } from './client.js';
import { rendererUrl } from '../core/resources.js';
export function createPanes(windowId, onError) {
  const records = {};
  let latest,
    work,
    serial = 0;
  for (const name of ['top', 'bottom']) {
    const el = document.querySelector(`.pane[data-pane="${name}"]`);
    const frame = el.querySelector('iframe');
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    const notice = document.createElement('div');
    notice.className = 'pane-notice';
    notice.hidden = true;
    el.querySelector('.frame-wrap').append(notice);
    records[name] = {
      el,
      frame,
      notice,
      signature: '',
      at: Date.now(),
      asleep: false,
      sequence: 0,
    };
    el.addEventListener('pointerdown', () => {
      records[name].at = Date.now();
    });
    frame.addEventListener('load', () => {
      void chrome.runtime
        .sendMessage({
          type: 'DEV_LOG',
          event: 'frame.loaded',
          payload: { pane: name, source: frame.src },
        })
        .catch(() => {});
    });
  }
  async function sleep(name, release = true) {
    const r = records[name];
    r.sleepTarget = r.signature;
    r.sequence++;
    r.frame.src = 'about:blank';
    r.signature = '';
    r.asleep = true;
    notice(name, 'Область приостановлена', () => wake(name));
    if (release)
      await send({
        type: 'APP_LEASE',
        key: `${windowId}:${name}`,
        release: true,
      });
  }
  function notice(name, label, action) {
    const r = records[name];
    r.notice.replaceChildren();
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => Promise.resolve(action()).catch(onError);
    r.notice.append(b);
    r.notice.hidden = false;
  }
  async function wake(name, force = false) {
    const r = records[name],
      p = work.panes[name];
    if (!p.url) return;
    const signature = p.mode + '|' + rendererUrl(p, latest.modules);
    if (!force && r.signature === signature && !r.asleep) return;
    const seq = ++r.sequence;
    await send({ type: 'APP_LEASE', key: `${windowId}:${name}` });
    if (seq !== r.sequence) return;
    r.signature = signature;
    r.asleep = false;
    r.at = Date.now();
    r.notice.hidden = true;
    r.frame.src = rendererUrl(p, latest.modules);
    void mutate({ type: 'recent', url: p.url, title: p.title }).catch(onError);
  }
  async function render(state, w) {
    latest = state;
    work = w;
    serial++;
    for (const name of ['top', 'bottom']) {
      const r = records[name],
        p = w.panes[name],
        shown = name === (w.singlePane || 'top') || w.split;
      const input = r.el.querySelector('[data-role="url"]');
      if (document.activeElement !== input) input.value = p.url;
      const setting = p.url ? state.sites[new URL(p.url).origin] : null;
      const zoom = setting?.zoom || 1;
      r.frame.style.zoom = zoom;
      r.frame.style.width = `${100 / zoom}%`;
      r.frame.style.height = `${100 / zoom}%`;
      if (!shown || !p.url) {
        if (r.signature) {
          r.sequence++;
          r.frame.src = 'about:blank';
          r.signature = '';
          void send({
            type: 'APP_LEASE',
            key: `${windowId}:${name}`,
            release: true,
          }).catch(onError);
        }
        r.notice.hidden = shown && !!p.url;
        continue;
      }
      if (p.mode === 'R' || (p.mode === 'A' && setting?.pwaApp)) {
        if (r.signature) {
          r.sequence++;
          r.signature = '';
          r.frame.src = 'about:blank';
          void send({
            type: 'APP_LEASE',
            key: `${windowId}:${name}`,
            release: true,
          }).catch(onError);
        }
        notice(name, 'Открыть отдельным окном', () =>
          send({ type: 'APP_SIDECAR', url: p.url }),
        );
        continue;
      }
      const sig = p.mode + '|' + rendererUrl(p, state.modules);
      if (r.asleep && r.sleepTarget === sig) continue;
      r.asleep = false;
      await wake(name);
    }
  }
  chrome.runtime.onMessage.addListener((m, _sender, reply) => {
    if (m?.type === 'APP_SLEEP') {
      const name = ['top', 'bottom'].find((n) => m.key === `${windowId}:${n}`);
      if (name) {
        records[name].sleepTarget = records[name].signature;
        void sleep(name, false).then(() => reply({ ok: true }));
        return true;
      }
    }
  });
  setInterval(() => {
    if (!latest || !work) return;
    for (const name of ['top', 'bottom']) {
      const r = records[name],
        p = work.panes[name];
      if (document.activeElement === r.frame) r.at = Date.now();
      if (
        r.signature &&
        Date.now() - r.at >= 300000 &&
        !latest.sites[p.url ? new URL(p.url).origin : '']?.neverSleep
      ) {
        r.sleepTarget = r.signature;
        void sleep(name).catch(onError);
      }
    }
  }, 15000);
  window.addEventListener('blur', () => {
    for (const name of ['top', 'bottom'])
      if (document.activeElement === records[name].frame) {
        records[name].at = Date.now();
        void mutate({
          type: 'layout',
          workspaceId: work.id,
          activePane: name,
        }).catch(onError);
      }
  });
  return { render, wake, sleep };
}
