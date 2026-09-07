import {
  read,
  mutate,
  send,
  subscribe,
  applyTheme,
  button,
} from './ui/client.js';
import { url, flatten, locate } from './core/model.js';
import { icon, iconButton, shortcutIcon } from './ui/icons.js';
import { form, menu } from './ui/dialogs.js';
import { installDrag } from './ui/drag.js';
import { createPanes } from './ui/panes.js';
const windowId = (await chrome.windows.getCurrent()).id;
const sessionKey = `atv2.workspace.window.${windowId}`;
let state = await read(),
  workspaceId = (await chrome.storage.session.get(sessionKey))[sessionKey],
  port = null;
const $ = (id) => document.getElementById(id),
  list = $('shortcut-list'),
  panes = $('panes');
function error(e) {
  $('toast').textContent = e.message || String(e);
  $('toast').hidden = false;
  setTimeout(() => ($('toast').hidden = true), 6000);
}
const renderer = createPanes(windowId, error);
const current = () =>
  state.workspaces.find((w) => w.id === workspaceId) || state.workspaces[0];
const act = async (action) => {
  state = await mutate({ workspaceId: current().id, ...action });
  await render();
};
async function addSite() {
  const r = await send({ type: 'GET_ACTIVE_TAB', windowId });
  const sources = {
    tab: { url: url(r.tab?.url), title: r.tab?.title || '' },
    top: current().panes.top,
    bottom: current().panes.bottom,
    custom: { url: '', title: '' },
  };
  const value = await form(
    'Добавить сайт',
    [
      {
        name: 'source',
        label: 'Источник',
        value: 'tab',
        options: [
          ['tab', 'Текущая вкладка браузера'],
          ['top', 'Верхняя область'],
          ['bottom', 'Нижняя область'],
          ['custom', 'Другой адрес'],
        ],
        change: (value, controls) => {
          controls.url.value = sources[value].url;
          controls.title.value = sources[value].title;
        },
      },
      { name: 'title', label: 'Название', value: sources.tab.title },
      { name: 'url', label: 'URL', value: sources.tab.url, required: true },
    ],
    'Добавить',
  );
  if (value)
    await act({ type: 'add', item: { title: value.title, url: value.url } });
}
async function editItem(x) {
  const fields = [
    { name: 'title', label: 'Название', value: x.title, required: true },
  ];
  if (x.type === 'site')
    fields.push(
      { name: 'url', label: 'URL', value: x.url, required: true },
      {
        name: 'mode',
        label: 'Режим',
        value: x.mode,
        options: [
          ['A', 'Авто'],
          ['S', 'Обычный iframe'],
          ['C', 'Совместимость'],
          ['R', 'Отдельное окно'],
        ],
      },
    );
  const v = await form('Изменить', fields);
  if (v) await act({ type: 'edit', id: x.id, value: v });
}
async function openItem(x, pane) {
  if (x.type === 'group') {
    menu(
      x.title,
      x.items.map((child) => [child.title, () => openItem(child, pane)]),
    );
    return;
  }
  await act({ type: 'open-item', id: x.id, pane });
}
function context(x) {
  const actions = [
    ['Открыть сверху', () => openItem(x, 'top')],
    ['Открыть снизу', () => openItem(x, 'bottom')],
    ['Изменить', () => editItem(x)],
  ];
  if (x.type === 'group')
    actions.push(['Разгруппировать', () => act({ type: 'ungroup', id: x.id })]);
  if (x.type === 'template')
    actions.push(
      [
        'Поменять области местами',
        () => act({ type: 'swap-template', id: x.id }),
      ],
      ['Разобрать на сайты', () => act({ type: 'decompose', id: x.id })],
    );
  if (x.type === 'site')
    actions.push([
      'Открыть отдельным окном',
      () => send({ type: 'APP_SIDECAR', url: x.url }),
    ]);
  actions.push(['Удалить', () => act({ type: 'remove', id: x.id })]);
  menu(x.title, actions);
}
async function organizer() {
  menu('Организация', [
    [
      'Создать группу',
      async () => {
        const v = await form('Новая группа', [
          { name: 'title', label: 'Название', required: true },
        ]);
        if (v)
          await act({
            type: 'add',
            item: { type: 'group', title: v.title, items: [] },
          });
      },
    ],
    [
      'Сохранить две области как шаблон',
      async () => {
        const w = current();
        if (!w.panes.top.url || !w.panes.bottom.url)
          throw Error('Сначала откройте два сайта');
        const v = await form('Новый шаблон', [
          { name: 'title', label: 'Название', required: true },
        ]);
        if (v)
          await act({
            type: 'add',
            item: {
              type: 'template',
              title: v.title,
              top: w.panes.top,
              bottom: w.panes.bottom,
            },
          });
      },
    ],
    ['Управление рабочими областями', () => send({ type: 'APP_OPTIONS' })],
    [
      'Очистить ярлыки этой области',
      async () => {
        if (confirm('Удалить все ярлыки этой рабочей области?'))
          await act({ type: 'clear-items' });
      },
    ],
  ]);
}
async function drop(id, targetId, position) {
  const target = locate(current(), targetId).item;
  if (position !== 'inside' || target.type === 'group') {
    await act({ type: 'move', id, targetId, position });
    return;
  }
  const v = await form('Объединить сайты', [
    { name: 'name', label: 'Название', required: true },
    {
      name: 'kind',
      label: 'Тип',
      value: 'group',
      options: [
        ['group', 'Группа'],
        ['template', 'Шаблон двух областей'],
      ],
    },
  ]);
  if (v) await act({ type: 'combine', id, targetId, ...v });
}
let itemSignature = '';
async function render() {
  const w = current();
  workspaceId = w.id;
  applyTheme(state.settings);
  $('workspace').replaceChildren(
    ...state.workspaces.map((x) => {
      const o = document.createElement('option');
      o.value = x.id;
      o.textContent = x.name;
      o.selected = x.id === w.id;
      return o;
    }),
  );
  panes.dataset.layout = w.split ? 'split' : 'single';
  panes.dataset.single = w.singlePane || 'top';
  $('split-toggle').setAttribute('aria-pressed', String(w.split));
  document.querySelector('.pane[data-pane="top"]').style.flex = w.split
    ? `${w.ratio} 1 0`
    : '1';
  document.querySelector('.pane[data-pane="bottom"]').style.flex =
    `${1 - w.ratio} 1 0`;
  for (const p of document.querySelectorAll('.pane'))
    p.classList.toggle('active', p.dataset.pane === w.activePane);
  const signature = JSON.stringify([w.id, w.items, state.settings.overlap]);
  if (signature !== itemSignature) {
    itemSignature = signature;
    list.replaceChildren();
    for (const x of w.items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shortcut';
      b.title = x.title;
      b.setAttribute('aria-label', x.title);
      b.dataset.id = x.id;
      b.append(shortcutIcon(x, state.settings.overlap));
      b.onclick = () => {
        if (b.dataset.suppressClick) return;
        void openItem(x).catch(error);
      };
      b.oncontextmenu = (e) => {
        e.preventDefault();
        context(x);
      };
      list.append(b);
    }
  }
  $('empty-state').hidden =
    !!w.panes.top.url || (!w.split && w.singlePane === 'bottom');
  $('empty-state').querySelector('h2').textContent = w.items.length
    ? 'Откройте сайт из колонки'
    : 'Ваши сайты рядом';
  await renderer.render(state, w);
  updateOverflow();
}
function updateOverflow() {
  $('scroll-up').hidden = list.scrollTop < 2;
  $('scroll-down').hidden =
    list.scrollHeight - list.clientHeight - list.scrollTop < 2;
}
const rail = document.querySelector('.rail');
rail.insertBefore(
  iconButton('Группы и шаблоны', 'group', () => organizer().catch(error)),
  $('search'),
);
rail.insertBefore(
  iconButton('Закрыть AppTower', 'close', () =>
    send({ type: 'APP_DISABLE' }).catch(error),
  ),
  rail.firstChild,
);
$('settings').innerHTML = icon('settings');
for (const [id, label, delta] of [
  ['scroll-up', 'Прокрутить вверх', -120],
  ['scroll-down', 'Прокрутить вниз', 120],
]) {
  const b = button(label, () =>
    list.scrollBy({ top: delta, behavior: 'smooth' }),
  );
  b.id = id;
  b.className = 'scroll-arrow';
  b.textContent = delta < 0 ? '⌃' : '⌄';
  b.hidden = true;
  if (delta < 0) list.before(b);
  else list.after(b);
}
list.addEventListener('scroll', updateOverflow);
new ResizeObserver(updateOverflow).observe(list);
installDrag(list, drop, error);
const empty = document.createElement('div');
empty.id = 'empty-state';
empty.className = 'empty-state';
const heading = document.createElement('h2');
empty.append(
  heading,
  button('Добавить текущую страницу', addSite),
  button('Импорт и синхронизация', () => send({ type: 'APP_OPTIONS' })),
);
document.querySelector('.pane[data-pane="top"] .frame-wrap').append(empty);
$('workspace').onchange = async (e) => {
  workspaceId = e.target.value;
  await chrome.storage.session.set({ [sessionKey]: workspaceId });
  await render();
};
$('split-toggle').onclick = () =>
  act({ type: 'layout', split: !current().split }).catch(error);
$('collapse').addEventListener('click', () =>
  send({ type: 'COLLAPSE_PANEL', windowId }).catch(error),
);
$('add').onclick = () => addSite().catch(error);
$('settings').onclick = () => send({ type: 'APP_OPTIONS' }).catch(error);
for (const el of document.querySelectorAll('.pane')) {
  const name = el.dataset.pane,
    input = el.querySelector('[data-role="url"]');
  const navigate = () =>
    act({ type: 'pane', pane: name, value: { url: input.value } });
  input.onkeydown = (e) => {
    if (e.key === 'Enter') void navigate().catch(error);
  };
  el.querySelector('[data-action="go"]').onclick = () =>
    navigate().catch(error);
  el.querySelector('[data-action="reload"]').onclick = () =>
    renderer.wake(name, true).catch(error);
  el.querySelector('[data-action="save"]').onclick = () =>
    act({
      type: 'add',
      item: { ...current().panes[name], url: input.value },
    }).catch(error);
  el.querySelector('[data-action="close"]').onclick = () =>
    act({ type: 'close-pane', pane: name }).catch(error);
  el.querySelector('.pane-toolbar').onpointerdown = () => {
    if (current().activePane !== name)
      void act({ type: 'layout', activePane: name }).catch(error);
  };
  el.querySelector('[data-action="more"]').onclick = () =>
    menu('Область', [
      ...['A', 'S', 'C', 'R'].map((mode, i) => [
        ['Авто', 'Обычный iframe', 'Совместимость', 'Отдельное окно'][i],
        () => act({ type: 'pane', pane: name, value: { mode } }),
      ]),
      [
        'Открыть обычной вкладкой',
        () => chrome.tabs.create({ url: current().panes[name].url }),
      ],
      ['Приостановить', () => renderer.sleep(name)],
      ['Очистить', () => act({ type: 'pane', pane: name, value: { url: '' } })],
    ]);
}
const splitter = document.querySelector('.splitter');
splitter.setAttribute('role', 'separator');
splitter.tabIndex = 0;
splitter.removeAttribute('aria-hidden');
splitter.onpointerdown = (e) => {
  splitter.setPointerCapture(e.pointerId);
};
splitter.onpointermove = (e) => {
  if (!splitter.hasPointerCapture(e.pointerId)) return;
  const r = panes.getBoundingClientRect();
  const ratio = Math.max(0.2, Math.min(0.8, (e.clientY - r.top) / r.height));
  current().ratio = ratio;
  document.querySelector('.pane[data-pane="top"]').style.flex = `${ratio} 1 0`;
  document.querySelector('.pane[data-pane="bottom"]').style.flex =
    `${1 - ratio} 1 0`;
};
splitter.onpointerup = (e) => {
  splitter.releasePointerCapture(e.pointerId);
  void act({ type: 'layout', ratio: current().ratio }).catch(error);
};
splitter.onkeydown = (e) => {
  if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    void act({
      type: 'layout',
      ratio: current().ratio + (e.key === 'ArrowUp' ? -0.05 : 0.05),
    }).catch(error);
  }
};
function search() {
  const d = $('search-dialog');
  if (!d.open) d.showModal();
  $('search-input').value = '';
  renderSearch();
  $('search-input').focus();
}
function renderSearch() {
  const q = $('search-input').value.toLowerCase(),
    results = $('search-results');
  const entries = [
    ...flatten(current()).map((x) => ({
      label: x.title,
      run: () => openItem(x),
    })),
    ...state.recent.map((x) => ({
      label: 'Недавнее: ' + x.title,
      run: () =>
        act({
          type: 'pane',
          pane: current().activePane,
          value: { url: x.url, title: x.title },
        }),
    })),
    ...state.workspaces.map((w) => ({
      label: 'Область: ' + w.name,
      run: async () => {
        workspaceId = w.id;
        await chrome.storage.session.set({ [sessionKey]: workspaceId });
        await render();
      },
    })),
    { label: 'Добавить текущую страницу', run: addSite },
    { label: 'Группы и шаблоны', run: organizer },
    { label: 'Настройки', run: () => send({ type: 'APP_OPTIONS' }) },
  ];
  results.replaceChildren(
    ...entries
      .filter((x) => x.label.toLowerCase().includes(q))
      .map((x) =>
        button(x.label, async () => {
          $('search-dialog').close();
          await x.run();
        }),
      ),
  );
}
$('search').onclick = search;
$('search-input').oninput = renderSearch;
$('search-dialog').onkeydown = (e) => {
  const nodes = [...$('search-results').querySelectorAll('button')],
    index = nodes.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    nodes[
      (index + (e.key === 'ArrowDown' ? 1 : -1) + nodes.length) % nodes.length
    ]?.focus();
  }
  if (e.key === 'Enter' && document.activeElement === $('search-input')) {
    e.preventDefault();
    nodes[0]?.click();
  }
};
for (const b of document.querySelectorAll('.dialog-close'))
  b.onclick = () => b.closest('dialog').close();
async function command(c) {
  if (c?.type === 'organize') await organizer();
  else if (c?.type === 'search') search();
  else if (c?.type === 'add-current') await addSite();
  else if (c?.type === 'settings') await send({ type: 'APP_OPTIONS' });
  else if (c?.type === 'open-item')
    await openItem(locate(current(), c.id).item);
  else if (c?.type === 'navigate')
    await act({
      type: 'pane',
      pane: current().activePane,
      value: { url: c.url },
    });
}
function reconnect() {
  const old = port;
  port = chrome.runtime.connect({ name: `ATV2_PANEL:${windowId}` });
  port.onMessage.addListener((m) => {
    if (m.type === 'COMMAND') void command(m.command).catch(error);
  });
  old?.disconnect();
}
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type === 'PANEL_RECONNECT') reconnect();
});
subscribe((next) => {
  state = next;
  void render().catch(error);
});
await render();
reconnect();
