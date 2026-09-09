# AppTower

AppTower adds a persistent right-side workspace to Microsoft Edge and Google
Chrome. Keep frequently used sites, groups and two-pane templates in one place,
open the panel when needed, and return to a compact rail when it is collapsed.

## What it does

- opens sites in independent upper and lower panes;
- keeps shortcuts, groups, templates and workspaces;
- opens a site in its own browser window when an iframe is unsuitable;
- provides per-site zoom and notification settings;
- adapts its colors to the browser or system theme.

Some sites deliberately prohibit embedding, or require a normal browser tab for
login, media protection or full screen. AppTower provides a normal-tab and
separate-window route for those sites.

## Install

Store links will appear here after review by Microsoft Edge Add-ons and the
Chrome Web Store. Until then, download a release ZIP, unpack it, open the
browser extensions page, enable Developer mode and choose **Load unpacked**.

Supported browsers: current Microsoft Edge and Google Chrome with the Side Panel
API. The manifest requires Chromium 141 or later.

## Privacy and support

AppTower has no account, analytics or advertising. It stores your settings in
browser storage; optional browser sync is enabled only by you. Read the full
[privacy policy](PRIVACY.md). Report problems through
[GitHub Issues](https://github.com/Stolyarovmn/AppTower/issues).

## Releases

Each release is built from a `release/*` branch, tagged as `vX.Y.Z`, tested and
attached to the corresponding GitHub Release. The legacy v1 implementation and
its historical artifacts remain available in the `legacy/v1` branch.

## License

[MIT](LICENSE)
