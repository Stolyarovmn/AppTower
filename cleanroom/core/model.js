export const KEY = 'atv2.workspace.v1';
export const MODES = ['A', 'S', 'C', 'R'];
export const blankPane = () => ({ url: '', title: '', mode: 'A' });
export const workspace = (name = 'Основная', id = crypto.randomUUID()) => ({
  id,
  name,
  items: [],
  panes: { top: blankPane(), bottom: blankPane() },
  activePane: 'top',
  singlePane: 'top',
  split: false,
  ratio: 0.5,
});
export function defaults() {
  return {
    schema: 1,
    enabled: true,
    settings: {
      theme: 'system',
      accent: '',
      sync: false,
      backgroundLimit: 12,
      idleMinutes: 5,
      overlap: 50,
    },
    workspaces: [workspace()],
    recent: [],
    sites: {},
    modules: [],
    pwas: [],
    updatedAt: 0,
  };
}
export function url(value) {
  let s = String(value || '').trim();
  if (s && !/^[a-z][\w+.-]*:/i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}
const text = (s, max = 120) =>
  String(s || '')
    .trim()
    .slice(0, max);
export function site(value = {}) {
  const href = url(value.url);
  if (!href) throw Error('Нужен HTTP(S) URL');
  return {
    id: text(value.id) || crypto.randomUUID(),
    type: 'site',
    title: text(value.title) || new URL(href).hostname,
    url: href,
    mode: MODES.includes(value.mode) ? value.mode : 'A',
  };
}
export function item(value, inGroup = false) {
  if (!value || typeof value !== 'object') throw Error('Некорректный ярлык');
  if (value.type === 'group') {
    if (inGroup) throw Error('Вложенные группы запрещены');
    return {
      id: text(value.id) || crypto.randomUUID(),
      type: 'group',
      title: text(value.title) || 'Группа',
      color: /^#[0-9a-f]{6}$/i.test(value.color || '') ? value.color : '#648bd8',
      items: (value.items || []).map((x) => item(x, true)),
    };
  }
  if (value.type === 'template')
    return {
      id: text(value.id) || crypto.randomUUID(),
      type: 'template',
      title: text(value.title) || 'Шаблон',
      ratio: Math.max(0.2, Math.min(0.8, Number.isFinite(Number(value.ratio)) ? Number(value.ratio) : 0.5)),
      top: site(value.top),
      bottom: site(value.bottom),
    };
  return site(value);
}
export function validateModule(m) {
  if (
    m?.type === 'youtube' &&
    Object.keys(m).every((k) => ['id', 'name', 'type', 'enabled'].includes(k))
  )
    return {
      id: 'youtube',
      name: 'YouTube',
      type: 'youtube',
      enabled: m.enabled !== false,
    };
  if (
    !m ||
    m.type !== 'embed' ||
    typeof m.host !== 'string' ||
    !/^[a-z0-9.-]+$/i.test(m.host)
  )
    throw Error('Модуль: нужен type=embed и точный host');
  const target = url(m.target);
  if (!target || new URL(target).protocol !== 'https:')
    throw Error('Модуль: target должен быть HTTPS URL');
  if (
    Object.keys(m).some(
      (k) => !['id', 'name', 'type', 'host', 'target', 'enabled'].includes(k),
    )
  )
    throw Error('Модуль содержит неподдерживаемые поля');
  return {
    id: text(m.id) || crypto.randomUUID(),
    name: text(m.name) || m.host,
    type: 'embed',
    host: m.host.toLowerCase(),
    target,
    enabled: m.enabled !== false,
  };
}
export function validate(value) {
  if (
    !value ||
    value.schema !== 1 ||
    !Array.isArray(value.workspaces) ||
    !value.workspaces.length
  )
    throw Error('Неподдерживаемый формат AppTower');
  const d = defaults();
  d.enabled = value.enabled !== false;
  const settings = value.settings || {};
  d.settings = {
    theme: ['system', 'light', 'dark'].includes(settings.theme)
      ? settings.theme
      : 'system',
    accent: /^#[0-9a-f]{6}$/i.test(settings.accent || '')
      ? settings.accent
      : '',
    sync: settings.sync === true,
    backgroundLimit: Math.max(0, Math.min(24, Number.isFinite(Number(settings.backgroundLimit)) ? Math.floor(Number(settings.backgroundLimit)) : 12)),
    idleMinutes: 5,
    overlap: Math.max(20, Math.min(80, Number(settings.overlap) || 50)),
  };
  d.workspaces = value.workspaces.slice(0, 30).map((w) => {
    const n = workspace(
      text(w.name) || 'Область',
      text(w.id) || crypto.randomUUID(),
    );
    n.items = (w.items || []).map((x) => item(x));
    for (const p of ['top', 'bottom'])
      n.panes[p] = {
        url: url(w.panes?.[p]?.url),
        title: text(w.panes?.[p]?.title),
        mode: MODES.includes(w.panes?.[p]?.mode) ? w.panes[p].mode : 'A',
      };
    n.split = !!w.split;
    n.singlePane = w.singlePane === 'bottom' ? 'bottom' : 'top';
    n.activePane = n.split
      ? w.activePane === 'bottom'
        ? 'bottom'
        : 'top'
      : n.singlePane;
    n.ratio = Math.max(0.2, Math.min(0.8, Number(w.ratio) || 0.5));
    return n;
  });
  const ids = new Set();
  for (const w of d.workspaces) {
    if (ids.has(w.id)) throw Error('Повтор ID рабочей области');
    ids.add(w.id);
    const entries = new Set();
    for (const x of w.items.flatMap((x) => [x, ...(x.items || [])])) {
      if (entries.has(x.id)) throw Error('Повтор ID ярлыка');
      entries.add(x.id);
    }
  }
  d.recent = (value.recent || [])
    .filter((x) => url(x.url))
    .slice(0, 100)
    .map((x) => ({
      url: url(x.url),
      title: text(x.title),
      at: Number(x.at) || 0,
    }));
  d.sites = {};
  for (const [origin, v] of Object.entries(value.sites || {})) {
    if (!url(origin)) continue;
    d.sites[new URL(origin).origin] = {
      zoom: Math.max(0.5, Math.min(2, Number(v.zoom) || 1)),
      neverSleep: !!v.neverSleep,
      pwaApp: !!v.pwaApp,
      notifications: ['allow', 'block'].includes(v.notifications)
        ? v.notifications
        : 'ask',
    };
  }
  d.modules = (value.modules || []).slice(0, 30).map(validateModule);
  d.pwas = (value.pwas || [])
    .filter((p) => url(p.url) && url(p.start_url))
    .slice(0, 100)
    .map((p) => ({
      url: url(p.url),
      start_url: url(p.start_url),
      name: text(p.name),
    }));
  d.updatedAt = Number(value.updatedAt) || 0;
  return d;
}
export function migrate(old) {
  const d = defaults(),
    w = d.workspaces[0];
  if (old) {
    w.items = (old.shortcuts || []).flatMap((x) => {
      try {
        return [site(x)];
      } catch {
        return [];
      }
    });
    w.split = !!old.split;
    for (const p of ['top', 'bottom'])
      w.panes[p] = {
        ...blankPane(),
        url: url(old.panes?.[p]?.url),
        title: text(old.panes?.[p]?.title),
      };
    w.activePane = old.activePane === 'bottom' && w.split ? 'bottom' : 'top';
  }
  return d;
}
export function locate(w, id) {
  for (const list of [
    w.items,
    ...w.items.filter((x) => x.type === 'group').map((x) => x.items),
  ]) {
    const index = list.findIndex((x) => x.id === id);
    if (index >= 0) return { list, index, item: list[index] };
  }
  throw Error('Ярлык не найден');
}
export function flatten(w) {
  return w.items.flatMap((x) => (x.type === 'group' ? [x, ...x.items] : [x]));
}
export function reduce(input, action) {
  const d = structuredClone(input),
    w =
      d.workspaces.find((x) => x.id === action.workspaceId) || d.workspaces[0];
  switch (action.type) {
    case 'enabled':
      d.enabled = !!action.value;
      break;
    case 'settings':
      d.settings = { ...d.settings, ...action.value };
      break;
    case 'site-settings': {
      const origin = new URL(url(action.url)).origin;
      d.sites[origin] = { ...d.sites[origin], ...action.value };
      break;
    }
    case 'workspace-add':
      d.workspaces.push(workspace(text(action.name) || 'Новая область'));
      break;
    case 'workspace-rename':
      w.name = text(action.name) || w.name;
      break;
    case 'workspace-remove':
      if (d.workspaces.length === 1)
        throw Error('Нельзя удалить последнюю область');
      d.workspaces = d.workspaces.filter((x) => x.id !== w.id);
      break;
    case 'add': {
      const added = item(action.item);
      w.items.push(added);
      if (action.openIfEmpty && added.type === 'site' && !w.panes.top.url && !w.panes.bottom.url)
        w.panes[w.singlePane] = { url: added.url, title: added.title, mode: added.mode };
      break;
    }
    case 'edit': {
      const found = locate(w, action.id);
      found.list[found.index] = item(
        { ...found.item, ...action.value, id: found.item.id },
        found.list !== w.items,
      );
      break;
    }
    case 'remove': {
      const found = locate(w, action.id);
      found.list.splice(found.index, 1);
      break;
    }
    case 'ungroup': {
      const f = locate(w, action.id);
      if (f.item.type !== 'group') throw Error('Это не группа');
      f.list.splice(f.index, 1, ...f.item.items);
      break;
    }
    case 'decompose': {
      const f = locate(w, action.id);
      if (f.item.type !== 'template') throw Error('Это не шаблон');
      f.list.splice(
        f.index,
        1,
        { ...f.item.top, id: crypto.randomUUID() },
        { ...f.item.bottom, id: crypto.randomUUID() },
      );
      break;
    }
    case 'swap-template': {
      const f = locate(w, action.id);
      if (f.item.type !== 'template') throw Error('Это не шаблон');
      [f.item.top, f.item.bottom] = [f.item.bottom, f.item.top];
      break;
    }
    case 'move': {
      if (action.id === action.targetId) break;
      const src = locate(w, action.id),
        dst = locate(w, action.targetId);
      if (action.position === 'inside') {
        if (dst.item.type !== 'group' || src.item.type === 'group')
          throw Error('Нельзя вложить группу');
        src.list.splice(src.index, 1);
        dst.item.items.push(src.item);
      } else {
        if (src.item.type === 'group' && dst.list !== w.items)
          throw Error('Вложенные группы запрещены');
        src.list.splice(src.index, 1);
        const index = dst.list.indexOf(dst.item);
        dst.list.splice(
          index + (action.position === 'after' ? 1 : 0),
          0,
          src.item,
        );
      }
      break;
    }
    case 'combine': {
      if (action.id === action.targetId) throw Error('Нужны два разных сайта');
      const a = locate(w, action.id),
        b = locate(w, action.targetId);
      if (a.item.type !== 'site' || b.item.type !== 'site')
        throw Error('Объединять можно только сайты');
      const combined =
        action.kind === 'template'
          ? {
              id: crypto.randomUUID(),
              type: 'template',
              title: text(action.name) || 'Шаблон',
              ratio: w.ratio,
              top: action.reverse ? b.item : a.item,
              bottom: action.reverse ? a.item : b.item,
            }
          : {
              id: crypto.randomUUID(),
              type: 'group',
              title: text(action.name) || 'Группа',
              color: action.color,
              items: [a.item, b.item],
            };
      a.list.splice(a.list.indexOf(a.item), 1);
      b.list.splice(b.list.indexOf(b.item), 1);
      w.items.push(combined);
      break;
    }
    case 'pane': {
      const p = action.pane === 'bottom' ? 'bottom' : 'top';
      w.panes[p] = { ...w.panes[p], ...action.value };
      if (action.value.url !== undefined)
        w.panes[p].url = url(action.value.url);
      if (p !== w.singlePane) w.split = true;
      w.activePane = p;
      break;
    }
    case 'layout':
      Object.assign(w, {
        split: action.split ?? w.split,
        ratio: action.ratio ?? w.ratio,
        activePane: action.activePane ?? w.activePane,
      });
      if (action.split === false) w.singlePane = w.activePane;
      break;
    case 'close-pane':
      if (w.split) {
        const keep = action.pane === 'top' ? 'bottom' : 'top';
        w.panes[action.pane] = blankPane();
        w.split = false;
        w.singlePane = keep;
        w.activePane = keep;
      }
      break;
    case 'open-item': {
      const x = locate(w, action.id).item;
      if (x.type === 'group') throw Error('Выберите сайт в группе');
      if (x.type === 'template') {
        w.panes = {
          top: { url: x.top.url, title: x.top.title, mode: x.top.mode },
          bottom: {
            url: x.bottom.url,
            title: x.bottom.title,
            mode: x.bottom.mode,
          },
        };
        w.split = true;
        w.ratio = x.ratio;
      } else {
        const p = action.pane || w.activePane;
        w.panes[p] = { url: x.url, title: x.title, mode: x.mode };
        if (p !== w.singlePane) w.split = true;
        w.activePane = p;
      }
      break;
    }
    case 'recent': {
      const href = url(action.url);
      if (href)
        d.recent = [
          {
            url: href,
            title: text(action.title) || new URL(href).hostname,
            at: Date.now(),
          },
          ...d.recent.filter((x) => x.url !== href),
        ].slice(0, 100);
      break;
    }
    case 'clear-recent':
      d.recent = [];
      break;
    case 'clear-items':
      w.items = [];
      break;
    case 'module-add': {
      const m = validateModule(action.module);
      d.modules = d.modules.filter((x) => x.id !== m.id);
      d.modules.push(m);
      break;
    }
    case 'module-remove':
      d.modules = d.modules.filter((x) => x.id !== action.id);
      break;
    case 'pwa':
      d.pwas = [
        action.pwa,
        ...d.pwas.filter((x) => x.url !== action.pwa.url),
      ].slice(0, 100);
      break;
    default:
      throw Error('Неизвестная команда данных: ' + action.type);
  }
  d.updatedAt = Date.now();
  return validate(d);
}
export function syncProjection(d) {
  return {
    schema: 1,
    updatedAt: d.updatedAt,
    workspaces: d.workspaces.map(({ id, name, items }) => ({
      id,
      name,
      items,
    })),
    modules: d.modules,
  };
}
export function mergeSync(local, remote) {
  if (remote.updatedAt <= local.updatedAt) return local;
  const next = validate({
    ...local,
    workspaces: remote.workspaces.map((w) => ({
      ...w,
      ...Object.fromEntries(['panes', 'split', 'ratio', 'activePane', 'singlePane'].map(key => [key, local.workspaces.find(x => x.id === w.id)?.[key]])),
    })),
    modules: remote.modules,
    updatedAt: remote.updatedAt,
  });
  return next;
}
