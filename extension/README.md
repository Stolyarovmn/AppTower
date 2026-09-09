# AppTower extension source

This directory contains the Manifest V3 extension submitted to Microsoft Edge
Add-ons and the Chrome Web Store. `manifest.json` is the store package root.

For a local check:

```bash
npm ci --ignore-scripts
npm test
python tools/package.py --output ../dist/AppTower-2.5.0.zip
```

The package script creates a store ZIP with runtime files only. It excludes test
and development files while retaining required third-party notices.
