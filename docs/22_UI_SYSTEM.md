# App Tower UI System

This document is the regression contract for App Tower visual consistency. A component may have its own layout, but spacing, typography, focus, dialog chrome and drag feedback must follow these rules.

## 1. Spacing scale

Use only the shared spacing tokens from `app/shared/ui-system.css` for normal UI gaps:

| Token | Value | Typical use |
| --- | ---: | --- |
| `--atn-space-1` | 4px | micro spacing |
| `--atn-space-2` | 8px | controls in one row |
| `--atn-space-3` | 12px | sections / form rows |
| `--atn-space-4` | 16px | cards / larger groups |
| `--atn-space-5` | 20px | large separation |
| `--atn-space-6` | 24px | page-level separation |

Acceptance criteria:
- sibling action buttons use `--atn-control-gap`;
- repeated form/action rows do not touch each other;
- a new screen must not introduce an arbitrary 5/7/9/11/13px gap when an existing token fits;
- focus decoration must not be counted as layout spacing.

## 2. Typography roles

Typography is semantic, not page-specific.

| Role | Token | Current value |
| --- | --- | ---: |
| Settings body / controls | `--atn-font-body` | 14px |
| Secondary/supporting copy | `--atn-font-secondary` | 13px |
| Captions/badges | `--atn-font-caption` | 11px |
| Dialog title | `--atn-font-dialog-title` | 17px |
| Settings page title | `--atn-font-page-title` | 28px |

Acceptance criteria:
- the same semantic role has the same computed font size on every Settings page;
- HTML elements such as `<small>` must not rely on the browser default font size;
- controls inherit the Settings body role unless a documented compact role exists;
- supporting text on `Sync и данные` must match supporting text on other Settings pages;
- a new local `font-size` requires either an existing semantic token or a documented new role.

Automated coverage: `ATN-E2E-019`.

## 3. Focus and selection

Focus indication must be visible without exceeding the control's geometry.

Rules:
- use an **inset** focus ring for controls inside scroll/clipping containers;
- do not use positive `outline-offset` inside scrollable dialog lists;
- active-state decoration and focus decoration must remain simultaneously understandable;
- focus must never be visibly cut at the top/bottom/left/right edge of a scrolling viewport.

Automated coverage: `ATN-E2E-018` checks the shortcut chooser focus style.

## 4. Dialog chrome

Dialogs use the shared `<dialog>` shell:
- close icon (`×`) at the top-right;
- `Esc` cancels;
- safe backdrop click cancels;
- backdrop/close must never synthesize Save/OK/Delete/Dissolve;
- a redundant lower-right `Закрыть` button is not used when it competes with the normal primary-action position;
- explicit `Отмена` remains valid when it is part of a form action row.

Automated coverage: `ATN-E2E-014` and related dialog tests.

## 5. Drag and drop

App Tower's rail uses Pointer Events rather than native HTML5 drag/drop so mouse, touch and pen share one interaction model.

During an active drag:
- the source shortcut becomes visibly dimmed;
- a visual shortcut proxy follows the pointer;
- the current drop target shows before/after/combine feedback;
- the proxy has `pointer-events:none` and may not perform mutations itself;
- releasing or cancelling the pointer removes the proxy immediately;
- the actual mutation remains owned by the rail drag state machine.

Automated coverage: `ATN-E2E-017` verifies that the proxy appears, follows the pointer, target combine feedback appears, and the proxy is removed after drop.

## 6. Regression gate

A UI consistency change is not complete until:
1. existing functional E2E tests remain green;
2. relevant computed-style/geometry tests are added or updated;
3. no test is weakened solely to accommodate the new visual implementation;
4. the test ZIP is built from the exact commit SHA that passed CI.
