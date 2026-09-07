# Privacy Policy — App Tower

_Last updated: 2026-09-04_

App Tower is a local browser extension for Microsoft Edge and Google Chrome. It organizes websites chosen by the user into a persistent rail, workspaces, and two web panes.

## Data handled by App Tower

App Tower stores configuration in browser-managed extension storage. Depending on the features you use, this can include:

- workspace names;
- shortcut, group and template configuration;
- website URLs and titles chosen or opened through App Tower;
- App Tower Recent entries;
- theme, layout, module and per-site settings.

App Tower does not have its own account system, analytics service, advertising service, telemetry backend or developer-operated server that receives this configuration.

## Browser Sync

Browser Sync is optional and disabled by default. If enabled, App Tower stores supported workspace and shortcut data in the browser's sync storage so it can follow the signed-in browser account across devices.

This may include workspace names, website URLs and titles, shortcut structures and module configuration. App Tower does not intentionally sync cookies, saved passwords, authentication tokens, page content or the browser's general browsing history.

The browser vendor operates the sync service and its own privacy terms apply to that service.

## Website and network access

App Tower runs content scripts on normal `http://` and `https://` pages to provide the collapsed rail, detect Web App Manifest metadata and support embedded-pane behavior.

When you choose or open a website, App Tower may:

- load that website in an App Tower web pane;
- request that website's Web App Manifest to obtain app metadata;
- load favicon or icon resources from the website;
- use scoped browser networking rules to permit framing for websites selected for Compatibility rendering.

App Tower does not intentionally read or transmit page text, form contents, cookies or saved passwords to the developer.

## Embedded web content

Websites shown in App Tower panes remain ordinary third-party web content. Those websites communicate with their own servers and remain governed by their own privacy policies.

Embedded sites may request browser-managed permissions such as camera, microphone, clipboard, fullscreen or autoplay when those capabilities are allowed for the frame. The browser's normal permission model still applies. A website embedded in a pane does not gain access to App Tower's extension APIs.

Some websites block iframe embedding, authentication, DRM, anti-bot or CAPTCHA flows. App Tower does not attempt to bypass those protections and may instead require opening the site as a normal top-level page.

## New Tab page

App Tower can replace the browser's New Tab page with its own launch page through the standard browser extension override mechanism. This behavior is part of the installed extension and can be reverted by disabling/removing App Tower or changing the relevant browser/extension settings.

## Export and removal

App Tower's export feature is intended to contain App Tower configuration only. It must not export cookies, saved passwords, authentication tokens, form data or unrelated browser history.

Removing the extension causes browser-managed extension data to be removed according to the browser's extension-storage behavior. Data already stored by an enabled browser Sync service is governed by that browser's sync behavior.

## Sharing and sale of data

App Tower does not sell personal data and does not share App Tower configuration with advertisers or analytics providers.

## Independence

App Tower is an independent browser extension. It is not affiliated with, endorsed by, sponsored by, or developed by Microsoft, Google, Yandex, or the operators of websites that can be opened through the extension.

## Contact

Questions about privacy or data handling: `m.stoliarov@outlook.com`
