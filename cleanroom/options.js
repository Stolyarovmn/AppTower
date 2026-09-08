import {
  read,
  mutate,
  send,
  applyTheme,
  download,
  button,
} from './ui/client.js';
import { form } from './ui/dialogs.js';
import { validate, flatten } from './core/model.js';
let state = await read(),
  section = location.hash.slice(1) || 'general';
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
    status.textContent = 'Сохранено';
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
function card(label, actions) {
  const c = document.createElement('div');
  c.className = 'card';
  const text = document.createElement('span');
  text.textContent = label;
  c.append(text, ...actions.map(([title, fn]) => button(title, fn)));
  content.append(c);
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
      b.setAttribute('aria-current', section === id ? 'page' : 'false');
      return b;
    }),
  );
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
      [
        'Новая вкладка',
        () => chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') }),
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
    content.lastChild.append(color);
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
      button('Создать область', async () => {
        const v = await form('Новая область', [
          { name: 'name', label: 'Название', required: true },
        ]);
        if (v) await act({ type: 'workspace-add', name: v.name });
      }),
    );
    for (const w of state.workspaces)
      card(w.name, [
        [
          'Переименовать',
          async () => {
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
          },
        ],
        [
          'Удалить',
          () => {
            if (confirm('Удалить область и её ярлыки?'))
              return act({ type: 'workspace-remove', workspaceId: w.id });
          },
        ],
      ]);
  }
  if (section === 'shortcuts') {
    for (const w of state.workspaces) {
      hint(w.name);
      for (const x of flatten(w))
        card(x.title + (x.url ? ' — ' + x.url : ''), [
          [
            'Открыть',
            () => {
              const site = x.type === 'template' ? x.top : x;
              if (site.url) return chrome.tabs.create({ url: site.url });
            },
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
          ],
          [
            'Удалить',
            () => act({ type: 'remove', workspaceId: w.id, id: x.id }),
          ],
        ]);
    }
  }
  if (section === 'recent') {
    content.append(
      button('Очистить недавние', () => act({ type: 'clear-recent' })),
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
        ],
      ]);
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
    content.append(
      button('Добавить сайт', async () => {
        const v = await form('Параметры сайта', [
          { name: 'url', label: 'URL', required: true },
        ]);
        if (v)
          await act({ type: 'site-settings', url: v.url, value: { zoom: 1 } });
      }),
    );
    for (const [origin, s] of Object.entries(state.sites)) {
      hint(origin);
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
    content.append(
      button('Добавить модуль YouTube', () =>
        act({ type: 'module-add', module: { type: 'youtube' } }),
      ),
    );
    content.append(
      button('Импортировать модуль JSON', () =>
        pickJSON((module) => act({ type: 'module-add', module })),
      ),
    );
    hint(
      'Модули — проверяемые данные. Формат: {"type":"embed","host":"example.com","target":"https://example.com/embed","name":"Пример"}. Модуль заменяет адрес только в режиме Авто и для указанного host.',
    );
    for (const m of state.modules)
      card(m.name, [
        ['Удалить', () => act({ type: 'module-remove', id: m.id })],
      ]);
  }
  if (section === 'apps') {
    hint(
      'Обнаруженные Web App Manifest. Открытие создаёт обычное отдельное окно браузера, а не устанавливает PWA в ОС.',
    );
    for (const p of state.pwas)
      card(p.name, [
        [
          'Открыть как приложение',
          () => send({ type: 'APP_SIDECAR', url: p.start_url }),
        ],
      ]);
    content.append(
      button('Открытые отдельные окна', async () => {
        const data =
          (await chrome.storage.session.get('atv2.sidecars'))[
            'atv2.sidecars'
          ] || {};
        for (const [origin, id] of Object.entries(data))
          card(origin, [
            ['Показать', () => chrome.windows.update(id, { focused: true })],
            ['Закрыть', () => chrome.windows.remove(id)],
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
