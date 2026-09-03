# 01 — Project status

Status legend:

- ✅ implemented and observed working in at least one user runtime screenshot/use
- 🟨 implemented in code but current behavior still needs live browser verification
- 🧪 experimental / service-dependent
- 🕒 planned or deferred
- ⛔ not available through the browser public API / intentionally not pursued

## Current baseline: v1.0.0

| Area | Status | Notes |
|---|---|---|
| MV3 Edge/Chrome extension | ✅ | Current source in `app/` |
| Native Side Panel container | ✅/🟨 | Used in Edge/Chrome; lifecycle has had regressions |
| Collapsed external rail | ✅/🟨 | Implemented at `document_start`; restart/zero-shortcut expand is P0 retest |
| Global enable/disable | ✅/🟨 | X disables globally; re-enable path implemented |
| Empty onboarding | ✅ | No default shortcuts |
| Two independent panes | ✅ | Split UI is present and used |
| Pane Auto/S/C/R modes | ✅ | Auto canonical; explicit overrides available |
| Pane focus/active tracking | ✅/🟨 | iframe bridge + focus fallback |
| Add current page | 🟨 | v0.8.5 rewrite; must retest empty workspace and active pane cases |
| Quick bookmark from pane | ✅/🟨 | Implemented; needs regression retest |
| Scrollable shortcut rail | ✅ | Wheel/touchpad/touch design implemented |
| Overflow up/down arrows | ✅/🟨 | Implemented; verify with many shortcuts |
| Groups | ✅/🟨 | Creation exists; drag-into-group had bugs and needs post-fix live retest |
| Two-pane templates | ✅/🟨 | Editor exists; drag creation needs post-fix live retest |
| Template icon overlap | ✅ | 20–80%, default 50%, TOP above |
| Pointer/touch drag | 🟨 | Native favicon drag suppressed in later builds; verify mouse + touch |
| Search palette | 🟨 | Click/close regression fixed in v0.8.4; needs live confirmation |
| Search hotkey | 🟨 | Ctrl+Shift+Space implemented |
| Workspaces | ✅/🟨 | App Tower workspaces implemented and window-bound |
| Native browser Workspace binding | ⛔/🕒 | No stable public ID/API relied on |
| Recent | ✅/🟨 | Population observed; open action was fixed later and needs retest |
| Per-site Zoom | 🟨 | Settings present; verify actual rendering effect |
| Sleep after 5 min | 🟨 | Resource lease system implemented; requires long-running test |
| Hard cap <= 6 live resources | 🟨 | Implemented; verify eviction order |
| Site notifications Allow/Block | ✅/🟨 | Permission prompt observed; behavior needs broader test |
| Notification categories from modules | 🧪 | Metadata/storage exists; provider integration needed |
| Options page with left navigation | ✅ | Visible in screenshots |
| System/light/dark theme | ✅ | Options shown in both themes |
| System/custom accent | ✅/🟨 | Implemented |
| Edge-native-looking settings glyph | 🟨 | v0.8.5 fix awaiting live test |
| Browser-native settings left-nav insertion | ⛔ | Public extension API does not allow it |
| Browser context menu | ✅/🟨 | Actions registered; verify all routes |
| PWA discovery | ✅ | Web Apps list populated in user runtime |
| PWA top-level app sidecar | 🧪 | Implemented; not comprehensively verified |
| Sidecar Manager | ✅/🟨 | UI exists; only separate top-level sidecars belong there |
| Declarative module registry | ✅ | YouTube + Yandex Music bundled manifests |
| User module JSON import | ✅/🟨 | Data-only validator path implemented |
| Yandex Music track/album/playlist adapter | 🧪 | Official iframe-based behavior; service-dependent |
| YouTube concrete video embed | 🧪 | Official embed path |
| Generic YouTube page in pane | 🧪 | Ordinary Auto/Compatibility; known unreliable |
| Media contract | ✅ | Provider-neutral state contract exists |
| Persistent background audio | 🕒 | Not implemented; offscreen architecture discussed |
| Browser Sync | ✅/🟨 | Workspaces/shortcut structures/modules; needs multi-device test |
| JSON Export/Import | ✅/🟨 | Multiple schema migrations exist |
| New Tab override | ✅ | Used so rail exists on new tabs/start surfaces |
| Yandex Browser fallback build | 🧪 | Dedicated sidecar ZIP; live compatibility not guaranteed |
| Firefox | 🕒 | Possible future adapter; not current target |

## P0 before adding major features

- Verify v0.8.5 current-page capture.
- Verify collapse/expand before and after restart with zero shortcuts.
- Verify no duplicate collapsed+expanded rails.
- Verify no spontaneous simultaneous pane reloads for at least 10 minutes.
- Verify search mouse interaction.
- Verify Recent -> Open.
- Verify group/template drag/drop.
- Decide what experience is acceptable for generic YouTube and Google/Gemini
  anti-bot pages rather than repeatedly changing generic compatibility rules.
