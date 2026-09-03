# App Tower

App Tower — Manifest V3 расширение для Microsoft Edge и Google Chrome,
которое воссоздаёт и расширяет концепт правой «башни приложений»: постоянная
полка-рейл, нативный Side Panel (где поддерживается), две независимые web-панели,
группы/шаблоны, воркспейсы, PWA/модули, управление ресурсами и «план управления»
в духе настроек браузера.

Контекст: Microsoft поэтапно отключает нативный «Sidebar app list»
(«App Tower») в Edge 149+ (начиная с Microsoft-аккаунтов) — расширение
восполняет эту фичу и расширяет её.

<details><summary>English</summary>

A Manifest V3 browser extension for Microsoft Edge and Google Chrome that
recreates and extends the classic right-side "App Tower": a persistent shortcut
rail, a native Side Panel where available, two independent web panes,
groups/templates, workspaces, PWA/module adapters, resource management and a
browser-settings-like control plane.

Context: Microsoft is retiring the native Sidebar app list ("App Tower")
in Edge 149+ (phased, starting with Microsoft account users); this
extension restores and extends it.
</details>

## Возможности

- **Рейл** — постоянная вертикальная полка с сайтами, группами и двухпанельными
  шаблонами. Доступна без шорткатов (свёрнутая — тонкий rail с поиском внизу).
- **Две независимые панели** — верхняя и нижняя; смена одной не перезагружает
  другую.
- **Нативный Side Panel** — основной режим на Edge/Chrome; для браузеров без
  Side Panel — sidecar-окно (fallback).
- **Воркспейсы** — наборы панелей; **группы и шаблоны** — first-class сущности.
- **PWA / модули** — адаптеры (YouTube, Яндекс.Музыка) как декларативные
  data-only модули.
- **Управление ресурсами** — бездействующие web-панели засыпают через 5 минут;
  лимит живых ресурсов — 6.
- **Опциональный Sync** — по аккаунту браузера (выключен по умолчанию).

## Требования

- Microsoft Edge или Google Chrome **116+** (MV3, `minimum_chrome_version: 116`).

## Установка из исходников (dev mode)

1. Возьмите каталог `app/`.
2. `chrome://extensions` → включите «Режим разработчика».
3. «Загрузить нераспакованное расширение» → выберите каталог `app/`.
4. Кликните по иконке расширения — откроется tower (Side Panel).

## Сборка и валидация

```bash
node tools/validate.mjs            # статическая проверка манифеста/JS/JSON
python tools/package.py            # чистые full-replacement ZIP в dist/
python tools/make_yandex_variant.py # (пере)генерация Yandex-fallback
```

Пакетировщик **никогда** не включает `.pem` / `.crx` / секреты в ZIP.

## Каталог

```text
app/                         исходники расширения (Edge/Chrome, v1.0.0)
variants/yandex-sidecar/     Chromium/Yandex fallback (генерируется)
archive/releases/            исторические релизы (ZIP)
archive/release-notes/       исторические release notes
archive/RELEASE_INDEX.csv    индекс версий/платформ/SHA-256
docs/                        продукт, архитектура, статус, тесты, roadmap
tools/                       валидация и пакетирование
.github/                     CI + шаблоны issue/PR
AGENTS.md                    обязательные правила для кодинг-агентов
```

Начните с `docs/00_START_HERE.md` и `docs/01_PROJECT_STATUS.md`.
Безопасность и права — `docs/08`; подача в сторы — `docs/21`.

## Каталоги

Распространение — **Microsoft Edge Add-ons** и **Google Chrome Web Store**.
Ссылки появятся здесь после одобрения. (Yandex fallback — вне сторов, как
sidecar для браузеров без Side Panel.)

## Статус

Статичная валидация пройдена; **поведение рантайма в Edge/Chrome — source of
truth** (Side Panel lifecycle, user-gesture, встраивание сайтов). См.
`docs/01_PROJECT_STATUS.md` и `docs/10_KNOWN_ISSUES.md`.

## Лицензия

MIT — см. `LICENSE`.

## Вклад

PR welcome: `main` = проверенная база; ветки `feature/<name>`, `fix/<name>`;
теги релизов `vX.Y.Z`. Перед правкой прочитайте `AGENTS.md`.
