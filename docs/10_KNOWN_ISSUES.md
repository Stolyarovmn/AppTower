# 10 — Known issues / verification queue

## P0 — v0.8.5 live verification

The following fixes are present in code but were not yet confirmed by the user
after the v0.8.5 delivery:

1. **Add current page with no shortcuts**
   - Previous symptom: form opens empty.
   - v0.8.5 change: resolve active normal HTTP(S) browser tab / recent web tab.
   - Required test: normal site -> open empty App Tower -> Add current page.

2. **Collapse/expand**
   - Previous symptom: collapse button does nothing; after restart collapsed rail
     will not expand, apparently worse with zero shortcuts.
   - v0.8.5 change: browser-adapter close strategy and disabled-tab repair.
   - Required test: five collapse/expand cycles, then browser restart, zero sites.

3. **Settings icon**
   - Previous symptom: custom gear does not look like Edge system glyph.
   - v0.8.5 change: Edge uses Segoe Fluent/MDL2 Settings glyph with SVG fallback.
   - Required test: Edge light and dark theme, 100% and >100% display scaling.

## High priority regression queue

### Group/template drag
Historically:
- prohibited-drop cursor appeared
- site could not be dropped into group
- site->site did not reliably create group/template

Code later disabled native draggable behavior and moved to Pointer Events.
Needs live mouse/touch retest.

### Spontaneous pane reloads
Historically both panes reloaded together because workspace change broadcasts
forced `renderAll(true)`.
Later builds removed forced reload for ordinary workspace writes.
Needs a 10+ minute runtime test and logging if reproduced.

### Search
Historically only Esc worked because results were re-rendered on mouseenter and
the close button submit was prevented.
v0.8.4 changed this; needs live retest.

### Recent -> Open
Recent population became visible in v0.8.3 screenshots, but opening failed.
v0.8.4 changed the user-gesture path. Needs live retest.

## Third-party service issues

### YouTube
Specific video embeds are more predictable than a generic full YouTube page.
Generic YouTube inside an iframe remains unreliable. Do not endlessly rotate
between desktop/mobile URLs without evidence.

Possible product decisions:
- keep generic Auto best-effort Compatibility
- recommend specific video embed/module
- offer Real Page/PWA sidecar when generic page fails
- add a visible "site blocks/failed in pane -> open Real Page" recovery affordance

### Gemini / Google anti-bot
User observed `google.com/sorry` / reCAPTCHA inside the pane. This is external
anti-abuse behavior. Do not try to bypass CAPTCHA via DNR. Prefer Real Page/PWA
sidecar for services that reject embedded traffic.

### Password autofill
Cross-origin framed pages do not provide the same password-manager behavior as
top-level browsing. Real Page/PWA sidecar is the intended fallback.

## UX debt

- verify all toolbar hit targets and spacing on high-DPI Windows
- continue replacing tiny/non-native menu symbols with a consistent icon system
- make Shortcuts/Recent/Web Apps/Sidecars pages action-oriented, not read-only
- clearly explain diagnostic resource lease rows as diagnostics, not logs
