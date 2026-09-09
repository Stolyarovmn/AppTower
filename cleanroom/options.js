import { icon, shortcutIcon } from './ui/icons.js';
import {
  read,
  mutate,
  send,
  applyTheme,
  download,
  button,
} from './ui/client.js';
import { form, customColorControl } from './ui/dialogs.js';
import { validate, flatten } from './core/model.js';
let state = await read(),
  section = location.hash.slice(1) || 'general',
  selectedWorkspaceId = state.workspaces[0].id;
const content = document.getElementById('content'),
  status = document.getElementById('status');
const sections = {
  general: 'Общие',
  appearance: 'Оформление',
  workspaces: 'Рабочие области',
  shortcuts: 'Ярлыки',
  recent: 'Недавние',
  sites: 'Сайты',
  performance: 'Производительность',
  modules: 'Модули',
  apps: 'Веб-приложения',
  data: 'Данные и синхронизация',
  diagnostics: 'Диагностика',
};
async function act(action) {
  try {
    state = await mutate(action);
    status.textContent = '';
    render();
  } catch (e) {
    status.textContent = e.message;
  }
}
function hint(text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  content.append(p);
}
function row(label, value, options, change) {
  if(options.length===2 && options.every(([v])=>['true','false'].includes(String(v)))) { toggle(label,String(value)==='true',v=>change(String(v)));return; }
  const box = document.createElement('div');
  box.className = 'setting-row';
  const l = document.createElement('label');
  l.textContent = label;
  const input = document.createElement('select');
  for (const [v, name] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = name;
    input.append(o);
  }
  input.value = String(value);
  input.onchange = () => change(input.value);
  l.append(input);
  box.append(l);
  content.append(box);
}
function actionButton(title, fn, options = {}) {
  const b = button(options.iconOnly ? '' : title, fn);
  b.title = title;
  b.setAttribute('aria-label', title);
  const name = options.icon || ({
    'Открыть':'external', 'Открыть как приложение':'external',
    'Открыть AppTower':'workspaces', 'Создать область':'add',
    'Очистить недавние':'broom', 'Добавить сайт':'add',
    'Импортировать модуль JSON':'data', 'Открытые отдельные окна':'external',
    'Экспорт JSON':'data', 'Импорт JSON':'data',
    'Открыть диагностику':'search',
    'Переименовать':'edit', 'Удалить':'trash', 'Сбросить':'trash',
    'Показать':'external', 'Закрыть':'close',
  })[title];
  if (name) b.insertAdjacentHTML('afterbegin', icon(name));
  if (options.iconOnly) b.classList.add('icon-action');
  return b;
}
function labeledAction(title, fn, options) {
  return actionButton(title, fn, options);
}
function card(label, actions, entity) {
  const c = document.createElement('div');
  c.className = 'card';
  const text = document.createElement('span');
  text.textContent = label;
  if(entity)c.append(shortcutIcon(entity));
  c.append(text, ...actions.map(([title, fn, options]) => actionButton(title, fn, options)));
  content.append(c);
}
function workspacePicker() {
  if (!state.workspaces.some((w) => w.id === selectedWorkspaceId))
    selectedWorkspaceId = state.workspaces[0].id;
  const box = document.createElement('label');
  box.className = 'workspace-filter';
  const text = document.createElement('span');
  text.textContent = 'Рабочая область';
  const select = document.createElement('select');
  for (const w of state.workspaces) {
    const option = document.createElement('option');
    option.value = w.id;
    option.textContent = w.name;
    select.append(option);
  }
  select.value = selectedWorkspaceId;
  select.onchange = () => {
    selectedWorkspaceId = select.value;
    render();
  };
  box.append(text, select);
  content.append(box);
  return state.workspaces.find((w) => w.id === selectedWorkspaceId);
}
function pickJSON(run) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    try {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 2000000) throw Error('Файл больше 2 МБ');
      await run(JSON.parse(await file.text()));
    } catch (e) {
      status.textContent = e.message;
    }
  };
  input.click();
}
function render() {
  applyTheme(state.settings);
  document.getElementById('title').textContent =
    sections[section] || sections.general;
  content.replaceChildren();
  const nav = document.getElementById('nav');
  nav.replaceChildren(
    ...Object.entries(sections).map(([id, label]) => {
      const b = button(label, () => {
        section = id;
        location.hash = id;
        render();
      });
      b.insertAdjacentHTML('afterbegin', icon(({general:'settings',appearance:'palette',workspaces:'workspaces',shortcuts:'group',recent:'clock',sites:'globe',performance:'performance',modules:'modules',apps:'app',data:'sync',diagnostics:'search'})[id]));
      b.dataset.section = id;
      b.setAttribute('aria-current', section === id ? 'page' : 'false');
      return b;
    }),
  );
  for (const [title, ids] of [['Интерфейс',['general','appearance']],['Организация',['workspaces','shortcuts','recent']],['Сайты и ресурсы',['sites','performance','modules','apps']],['Обслуживание',['data','diagnostics']]]) {
    const heading = document.createElement('h3'); heading.textContent = title;
    const group = document.createElement('div'); group.className = 'nav-group'; group.append(heading);
    for (const id of ids) group.append([...nav.querySelectorAll('button')].find(b => b.dataset.section === id));
    nav.append(group);
  }
  if (section === 'general') {
    row(
      'AppTower включён',
      state.enabled,
      [
        ['true', 'Да'],
        ['false', 'Нет'],
      ],
      async (v) => {
        if (v === 'false') {
          await send({ type: 'APP_DISABLE' });
          state = await read();
          render();
        } else await act({ type: 'enabled', value: true });
      },
    );
    hint(
      'Крестик в колонке отключает AppTower во всех окнах. Кнопка расширения включает его снова.',
    );
    card('Запуск', [
      [
        'Открыть AppTower',
        async () => {
          const w = await chrome.windows.getCurrent();
          await send({ type: 'OPEN_PANEL', windowId: w.id });
        },
      ],
    ]);
  }
  if (section === 'appearance') {
    row(
      'Тема',
      state.settings.theme,
      [
        ['system', 'Системная'],
        ['light', 'Светлая'],
        ['dark', 'Тёмная'],
      ],
      (theme) => act({ type: 'settings', value: { theme } }),
    );
    const color = document.createElement('input');
    color.type = 'color';
    color.value = state.settings.accent || '#1683ff';
    color.onchange = () =>
      act({ type: 'settings', value: { accent: color.value } });
    card('Цвет акцента', [
      ['Системный', () => act({ type: 'settings', value: { accent: '' } })],
    ]);
    content.lastChild.append(customColorControl(color));
    row(
      'Перекрытие иконок шаблона',
      state.settings.overlap,
      [20, 30, 40, 50, 60, 70, 80].map((n) => [n, n + '%']),
      (overlap) =>
        act({ type: 'settings', value: { overlap: Number(overlap) } }),
    );
    hint(
      'Ширину нативной Side Panel меняйте перетаскиванием её границы в браузере. Компактная колонка занимает 48 CSS-пикселей.',
    );
  }
  if (section === 'workspaces') {
    content.append(
      labeledAction('Создать область', async () => {
        const v = await form('Новая область', [
          { name: 'name', label: 'Название', required: true },
        ]);
        if (v) await act({ type: 'workspace-add', name: v.name });
      }),
    );
    const order = document.createElement('div');
    order.className = 'workspace-order';
    for (const w of state.workspaces) {
      const row = document.createElement('div');
      row.className = 'card workspace-order-row';
      row.dataset.id = w.id;
      const grip = document.createElement('span');
      grip.className = 'drag-handle';
      grip.title = 'Перетащить область';
      grip.innerHTML = icon('grip');
      grip.draggable = true;
      const name = document.createElement('span');
      name.textContent = w.name;
      row.append(
        grip,
        name,
        actionButton('Переименовать', async () => {
            const v = await form('Рабочая область', [
              {
                name: 'name',
                label: 'Название',
                value: w.name,
                required: true,
              },
            ]);
            if (v)
              await act({
                type: 'workspace-rename',
                workspaceId: w.id,
                name: v.name,
              });
          }, {iconOnly:true}),
        actionButton('Удалить', () => {
            if (confirm('Удалить область и её ярлыки?'))
              return act({ type: 'workspace-remove', workspaceId: w.id });
          }, {iconOnly:true}),
      );
      grip.ondragstart = (event) => {
        event.dataTransfer.setData('text/plain', w.id);
        event.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      };
      grip.ondragend = () => row.classList.remove('dragging');
      row.ondragover = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      };
      row.ondrop = (event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData('text/plain');
        if (id && id !== w.id)
          void act({type:'workspace-reorder', workspaceId:id, targetId:w.id});
      };
      order.append(row);
    }
    content.append(order);
  }
  if (section === 'shortcuts') {
    const w = workspacePicker();
    for (const x of flatten(w))
        card(x.title + (x.url ? ' — ' + x.url : ''), [
          [
            'Открыть',
            () => {
              const site = x.type === 'template' ? x.top : x;
              if (site.url) return chrome.tabs.create({ url: site.url });
            },
            {iconOnly:true,icon:'external'},
          ],
          [
            'Переименовать',
            async () => {
              const v = await form('Ярлык', [
                {
                  name: 'title',
                  label: 'Название',
                  value: x.title,
                  required: true,
                },
              ]);
              if (v)
                await act({
                  type: 'edit',
                  workspaceId: w.id,
                  id: x.id,
                  value: v,
                });
            },
            {iconOnly:true},
          ],
          [
            'Удалить',
            () => { if (confirm(`Удалить «${x.title}»?`)) return act({ type: 'remove', workspaceId: w.id, id: x.id }); },
            {iconOnly:true},
          ],
        ], x);
  }
  if (section === 'recent') {
    content.append(
      labeledAction('Очистить недавние', () => act({ type: 'clear-recent' })),
    );
    for (const x of state.recent)
      card(x.title, [
        [
          'Открыть',
          async () => {
            const w = await chrome.windows.getCurrent();
            await send({
              type: 'OPEN_PANEL',
              windowId: w.id,
              command: { type: 'navigate', url: x.url },
            });
          },
          {iconOnly:true,icon:'external'},
        ],
      ], {title:x.title,url:x.url});
  }
  if (section === 'performance') {
    row(
      'Фоновых страниц на окно',
      state.settings.backgroundLimit,
      [0, 4, 8, 12, 16, 24].map((n) => [n, n]),
      (backgroundLimit) =>
        act({ type: 'settings', value: { backgroundLimit: Number(backgroundLimit) } }),
    );
    hint(
      'Открытые области не выгружаются по таймеру. Фоновые страницы хранятся до 5 минут; при заполнении кэша вытесняются самые старые. «Не усыплять» отменяет таймер для сайта, но не лимит фонового кэша. Закрытие нативной панели завершает все её страницы.',
    );
  }
  if (section === 'sites') {
    hint(
      'Сайты ваших ярлыков, групп и шаблонов появляются здесь автоматически. Параметры применяются ко всем ярлыкам одного сайта.',
    );
    const origins = new Set();
    for (const w of state.workspaces) for (const item of flatten(w)) {
      for (const site of item.type === 'template' ? [item.top,item.bottom] : [item])
        if (site.url) origins.add(new URL(site.url).origin);
    }
    if (!origins.size) hint('Добавьте ярлык в AppTower — его сайт появится здесь автоматически.');
    for (const origin of origins) {
      const s = state.sites[origin] || {zoom:1,pwaApp:false,neverSleep:false,notifications:'ask'};
      card(origin, [[
        'Сбросить',
        () => {
          if (confirm(`Удалить индивидуальные настройки для ${origin}?`))
            return act({type:'site-settings-remove', url:origin});
        },
        {iconOnly:true},
      ]], {title:new URL(origin).hostname,url:origin});
      row(
        'Масштаб',
        s.zoom,
        [0.5, 0.75, 1, 1.25, 1.5, 2].map((n) => [n, n * 100 + '%']),
        (zoom) =>
          act({
            type: 'site-settings',
            url: origin,
            value: { zoom: Number(zoom) },
          }),
      );
      row(
        'Открывать в отдельном окне в Авто',
        s.pwaApp,
        [
          ['false', 'Нет'],
          ['true', 'Да'],
        ],
        (pwaApp) =>
          act({
            type: 'site-settings',
            url: origin,
            value: { pwaApp: pwaApp === 'true' },
          }),
      );
      row(
        'Не усыплять',
        s.neverSleep,
        [
          ['false', 'Нет'],
          ['true', 'Да'],
        ],
        (neverSleep) =>
          act({
            type: 'site-settings',
            url: origin,
            value: { neverSleep: neverSleep === 'true' },
          }),
      );
      row(
        'Уведомления',
        s.notifications,
        [
          ['ask', 'По умолчанию'],
          ['allow', 'Разрешить'],
          ['block', 'Блокировать'],
        ],
        async (notifications) => {
          const granted = await chrome.permissions.request({
            permissions: ['contentSettings'],
          });
          if (granted)
            await act({
              type: 'site-settings',
              url: origin,
              value: { notifications },
            });
          else status.textContent = 'Разрешение не предоставлено';
        },
      );
    }
  }
  if (section === 'modules') {
    hint('Модуль меняет способ открытия поддерживаемого сайта в режиме «Авто». Переключатель временно включает или отключает модуль, сохраняя его настройки.');
    toggle('Модуль YouTube',state.modules.some(m=>m.type==='youtube'&&m.enabled),enabled=>act({type:'module-add',module:{type:'youtube',enabled}}));
    content.append(
      labeledAction('Импортировать модуль JSON', () =>
        pickJSON((module) => act({ type: 'module-add', module })),
      ),
    );
    hint(
      'Модули — проверяемые данные. Формат: {"type":"embed","host":"example.com","target":"https://example.com/embed","name":"Пример"}. Модуль заменяет адрес только в режиме Авто и для указанного host.',
    );
    for (const m of state.modules)
      if(m.type !== 'youtube') {
        toggle(m.name,m.enabled,enabled=>act({type:'module-add',module:{...m,enabled}}));
        content.lastChild.append(actionButton('Удалить конфигурацию модуля', () => {
          if (confirm(`Удалить модуль «${m.name}»?`))
            return act({type:'module-remove',id:m.id});
        }, {iconOnly:true,icon:'trash'}));
      }
  }
  if (section === 'apps') {
    hint(
      'AppTower автоматически находит Web App Manifest на посещённых сайтах. Запись позволяет открыть сайт в отдельном окне браузера без вкладочной панели; приложение в операционную систему не устанавливается.',
    );
    for (const p of state.pwas)
      card(p.name, [
        [
          'Открыть как приложение',
          () => send({ type: 'APP_SIDECAR', url: p.start_url }),
          {iconOnly:true,icon:'external'},
        ],
        [
          'Удалить',
          () => act({type:'pwa-remove',url:p.url}),
          {iconOnly:true},
        ],
      ], {title:p.name,url:p.start_url});
    content.append(
      labeledAction('Открытые отдельные окна', async () => {
        const data =
          (await chrome.storage.session.get('atv2.sidecars'))[
            'atv2.sidecars'
          ] || {};
        for (const [origin, id] of Object.entries(data))
          card(origin, [
            ['Показать', () => chrome.windows.update(id, { focused: true }), {iconOnly:true}],
            ['Закрыть', () => chrome.windows.remove(id), {iconOnly:true}],
          ]);
      }),
    );
  }
  if (section === 'data') {
    row(
      'Browser Sync',
      state.settings.sync,
      [
        ['false', 'Выключен'],
        ['true', 'Включён'],
      ],
      (sync) => act({ type: 'settings', value: { sync: sync === 'true' } }),
    );
    hint(
      'Синхронизируются области, ярлыки и модули. Открытые страницы и недавние остаются на устройстве. Побеждает более новая запись; лимит пакета — 7600 байт, превышение показывается как ошибка без потери локальных данных.',
    );
    card('Резервная копия', [
      ['Экспорт JSON', () => download('AppTower-settings.json', state)],
      [
        'Импорт JSON',
        () =>
          pickJSON(async (value) => {
            const next = validate(value);
            next.settings.sync = state.settings.sync;
            if (confirm('Заменить настройки и ярлыки данными из файла?'))
              await act({ type: 'import', value: next });
          }),
      ],
    ]);
  }
  if (section === 'diagnostics')
    card('Версия ' + chrome.runtime.getManifest().version, [
      [
        'Открыть диагностику',
        () =>
          chrome.tabs.create({
            url: chrome.runtime.getURL('diagnostics.html'),
          }),
      ],
    ]);
}
render();

function toggle(label,value,change){const row=document.createElement('label');row.className='setting-row toggle-row';const text=document.createElement('span');text.textContent=label;const input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.checked=!!value;input.onchange=()=>change(input.checked);row.append(text,input);content.append(row);}
