# 10 — Known issues / live verification queue

## P0 — v1.0.0 store-candidate verification

The following paths are implemented in source but must be confirmed in a real browser before 1.0.0 is described as production/store verified.

### 1. Add current page with an empty workspace

Historical symptom: the Add Site form opened empty even though a normal browser tab was active.

Required test:

1. open a normal HTTP(S) site;
2. open an empty App Tower workspace;
3. choose Add Current;
4. verify URL/title are captured from the intended browser tab or active App Tower pane according to the UI source selection.

### 2. Collapse / expand / restart

Historical symptoms:

- collapse button did nothing;
- collapsed rail could fail to expand after restart;
- zero-shortcut state made lifecycle regressions easier to reproduce;
- collapsed and expanded rails could appear at the same time.

Required test:

- five collapse/expand cycles with zero shortcuts;
- repeat with shortcuts;
- restart browser while collapsed;
- expand after restart;
- verify there is never a duplicate collapsed rail while the native Side Panel is open.

### 3. Settings icon / DPI

Required Edge visual test:

- light theme @100%;
- dark theme @100%;
- light/dark at >100% Windows display scaling;
- verify icon size/alignment matches the surrounding control system.

### 4. Search interaction

Historical symptom: Esc worked but mouse interaction could be lost by result re-rendering.

Required test:

- open search by rail icon;
- click result;
- close with explicit Close;
- close with Esc;
- use keyboard selection/Enter.

### 5. Recent -> Open

Required test:

- navigate/open several App Tower sites/templates;
- verify Recent populates;
- use Open from Options -> Recent;
- verify the requested item opens without losing Chromium user activation.

### 6. Group/template drag

Historical symptoms:

- prohibited-drop cursor;
- site could not be dropped into a group;
- site-on-site did not reliably create Group/Template.

Required test with mouse and, where available, touch/pointer input:

- reorder sites;
- site -> existing group;
- site -> site -> Group;
- site -> site -> two-pane Template;
- edit/save template overlap and top/bottom order.

### 7. Pane reload stability

Historical symptom: both panes reloaded together when workspace state changes triggered forced rendering.

Required test:

- keep two independent sites open for at least 10 minutes;
- interact with only one pane;
- change shortcuts/settings that should not replace pane URLs;
- verify the other pane does not reload without a documented renderer/resource reason.

If reproduced, collect timestamps for workspace writes/change notifications, iframe source changes, resource sleep/wake and Side Panel lifecycle events rather than stacking speculative reload fixes.

## Third-party service constraints

### YouTube

Specific supported video/embed/module paths are more predictable than a generic full YouTube page inside an arbitrary iframe. Generic YouTube iframe behavior is best-effort and must not be marketed as universally reliable.

Fallback options:

- supported provider/module path;
- Compatibility when appropriate;
- Real Page/PWA sidecar when top-level browsing is required.

### Gemini / Google anti-bot

`google.com/sorry`, reCAPTCHA or other anti-abuse responses are external service behavior. App Tower must not attempt to bypass CAPTCHA/anti-bot through DNR.

### Password autofill

Cross-origin framed pages may not provide password-manager behavior identical to top-level browsing. Real Page/PWA sidecar is the intended fallback for sites that require top-level context.

## UX debt

- verify toolbar hit targets and spacing on high-DPI Windows;
- continue replacing tiny/non-native-looking symbols with the shared icon system;
- keep Shortcuts/Recent/Web Apps/Sidecars pages action-oriented rather than passive lists;
- keep resource-lease rows clearly labelled as diagnostics, not application logs.

## Release gate

A green static validator/CI does not close these items. They are closed only by recorded real-browser verification against the release candidate.
