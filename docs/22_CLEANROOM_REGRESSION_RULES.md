# Cleanroom regression rules — release gate

These rules consolidate user reports from previous builds. They apply to the
rewrite even when implementation was written from scratch. A new implementation
is not evidence that old behavioral defects cannot recur.

| Report / invariant | Required evidence |
|---|---|
| Browser extension action and browser-owned Side Panel entry must converge on the same workspace and collapse behavior | Test each entry after global disable, worker restart and browser restart; explicit Collapse restores rail, not global disable |
| Exactly one AppTower representation per window | Expanded hides injected rail; closing never reveals rail before close confirmation; failed close leaves rail hidden |
| Expanded panel has only browser-owned global X | No extension global-disable button in expanded rail; pane X only in split |
| Collapsed rail X disables globally | Persists across restart; explicit action re-enables; native entry then Collapse restores compact surface |
| Chevron direction | Right-pointing expanded Collapse, left-pointing compact Expand |
| Settings icon | One shared SVG source in rail/panel/newtab; centered, same stroke, no font glyph or post-render patch replacement |
| Icon buttons and spacing | Compact consistent hit areas; no oversized kebab tile; verify Windows scaling and both themes |
| Pane independence | Renaming, organizing and navigating bottom do not assign top iframe src; closing top retains bottom document |
| Add current | Populated browser source when empty; explicit top/bottom/browser source selection; no stale URL after pane navigation |
| Search | Mouse click/keyboard/close/Escape work; hover does not recreate result; commands consumed once |
| Drag/drop | Real valid targets only; reject self/nested/invalid drops; cancellation safe; preview left of pointer; native favicon drag suppressed |
| Rail page space | Reserve once; restore original styles; fixed headers/buttons remain reachable; no accumulating width or extra scrollbar |
| Empty/reloaded tab | Rail works with zero shortcuts; recover stale extension context on existing tabs |
| Restart | Worker suspension is not browser close; reconnect must not reload pane; test full browser restart separately |
| Recent and Options open | Real user-action path; opens target, not an empty/recreated panel |
| Modules / external sites | No claim of universal iframe/media/auth support; explicit top-level fallback |
| Settings | Site notifications isolated; system theme updates; shared icons on all surfaces |
| Data loss | Existing TASK 3 risk remains planned; these fixes do not claim dirty-form/media protection |

## Entry-path diagnostics

Record browser action, native onOpened, panel connection, explicit Collapse,
enable reconciliation, close promise/event and rail visibility acknowledgement.
Include extension version and window/context identity. Do not infer two installed
extensions from two browser controls. Never log form contents or credentials.

## Release discipline

For each release record: source SHA, actual local test result, actual CI result,
and live-browser cases that passed or remain unverified. Mocked API/jsdom tests
are not Edge UI tests. A missing environment is a recorded gap, not a pass.
Every reported regression must map to a rule and an executable test where
possible. Visual and browser-owned entry controls still need live validation.
