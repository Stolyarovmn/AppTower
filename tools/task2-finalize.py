from pathlib import Path

BACKGROUND = Path("app/background.js")
PATCHES = [
    Path("tools/task2-patches/01-01.patch"),
    Path("tools/task2-patches/01-02.patch"),
    Path("tools/task2-patches/01-03.patch"),
    Path("tools/task2-patches/01-06.patch"),
    Path("tools/task2-patches/01-07.patch"),
]


def parse_hunks(raw: str):
    lines = raw.splitlines(keepends=True)
    hunks = []
    i = 0
    while i < len(lines):
        if not lines[i].startswith("@@ "):
            i += 1
            continue
        header = lines[i].rstrip("\r\n")
        i += 1
        body = []
        while i < len(lines) and not lines[i].startswith("@@ "):
            line = lines[i]
            if line.startswith(("diff --git ", "--- ", "+++ ")):
                break
            if line.startswith((" ", "+", "-")):
                body.append(line)
            elif line.startswith("\\ No newline") or line.strip() == "":
                pass
            else:
                raise RuntimeError(f"Unsupported patch line after {header}: {line!r}")
            i += 1
        old = "".join(line[1:] for line in body if line[0] in " -")
        new = "".join(line[1:] for line in body if line[0] in " +")
        if not old:
            raise RuntimeError(f"Empty old-side hunk: {header}")
        hunks.append((header, old, new))
    return hunks


def replace_section(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]


def main():
    text = BACKGROUND.read_text(encoding="utf-8")

    for patch_path in PATCHES:
        hunks = parse_hunks(patch_path.read_text(encoding="utf-8"))
        print(f"{patch_path}: {len(hunks)} hunks")
        for header, old, new in hunks:
            count = text.count(old)
            if count != 1:
                raise RuntimeError(f"{patch_path} {header}: old block occurrences={count}")
            text = text.replace(old, new, 1)

    text = replace_section(
        text,
        '  if (message.type === "OPEN_SITE") {',
        '  if (message.type === "OPEN_TEMPLATE") {',
        '''  if (message.type === "OPEN_SITE") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    let openPromise = Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      if (message.containerOpened !== true) {
        openPromise = openTowerContainer(windowId,{tabId:sender?.tab?.id});
      }
    }
    (async () => {
      try {
        await serializeWorkspaceMutation(windowId,"open-site",async () => {
          const state = await getWindowWorkspaceState(windowId);
          const current = state.workspace;
          const url = normalizeUrl(message.url);
          if (!url) throw new Error("Invalid URL");
          const explicitBottom = message.targetPane === "bottom";
          const existingPane = explicitBottom ? null : findPaneForUrl(current.panes, url);
          const targetPane = explicitBottom ? "bottom" : (existingPane || current.layout.activePane);
          if (!existingPane || explicitBottom) {
            const inferred = inferDefaultsForUrl(url);
            current.panes[targetPane] = {
              url,
              title:String(message.title || url),
              mode:resolveAutoMode(url, normalizeMode(message.mode || inferred.mode)),
              compatDomains:normalizeCompatDomains(Array.isArray(message.compatDomains) && message.compatDomains.length ? message.compatDomains : inferred.compatDomains),
              sourceSiteId:message.siteId ? String(message.siteId) : null
            };
          }
          if (explicitBottom) current.layout.split = true;
          current.layout.activePane = targetPane;
          await saveWindowWorkspaceState(windowId,{panes:current.panes,layout:current.layout});
          await recordRecent({windowId,workspaceId:current.id,url,title:String(message.title || url),kind:"site"});
          await syncCompatibilityRules(current.panes);
        });
        await openPromise;
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

''')

    text = replace_section(
        text,
        '  if (message.type === "OPEN_TEMPLATE") {',
        '  if (message.type === "MUTATE_SHORTCUTS") {',
        '''  if (message.type === "OPEN_TEMPLATE") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    let openPromise = Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      if (message.containerOpened !== true) {
        openPromise = openTowerContainer(windowId,{tabId:sender?.tab?.id});
      }
    }
    (async () => {
      try {
        await serializeWorkspaceMutation(windowId,"open-template",async () => {
          const template = upgradeShortcut(message.template);
          if (!isTemplate(template)) throw new Error("Invalid two-pane template");
          const state = await getWindowWorkspaceState(windowId);
          const current = state.workspace;
          current.panes.top = paneFromSite(template.top, template.id);
          current.panes.bottom = paneFromSite(template.bottom, template.id);
          current.layout.split = true;
          current.layout.activePane = "top";
          await saveWindowWorkspaceState(windowId,{panes:current.panes,layout:current.layout});
          await recordRecent({windowId,workspaceId:current.id,url:template.top.url,title:template.title,kind:"template",template});
          await syncCompatibilityRules(current.panes);
        });
        await openPromise;
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

''')

    text = replace_section(
        text,
        '  if (message.type === "MUTATE_SHORTCUTS") {',
        '  if (message.type === "OPEN_PANEL") {',
        '''  if (message.type === "MUTATE_SHORTCUTS") {
    (async () => {
      try {
        const windowId = messageWindowId(message, sender);
        const result = await serializeWorkspaceMutation(windowId,"mutate-shortcuts",() =>
          mutateShortcuts(message, windowId)
        );
        sendResponse({ok:true, ...result});
      } catch (error) {
        sendResponse({ok:false, error:String(error?.message || error)});
      }
    })();
    return true;
  }

''')

    text = replace_section(
        text,
        '  if (message.type === "OPEN_PANEL") {',
        '  if (message.type === "COLLAPSE_PANEL") {',
        '''  if (message.type === "OPEN_PANEL") {
    globallyEnabled = true;
    chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: true }).catch(() => {});
    const windowId = messageWindowId(message, sender);
    const action = panelActionFromMessage(message,windowId);

    if (message.intent === "settings") {
      openOptions()
        .then(() => sendResponse({ok:true,options:true}))
        .catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
      return true;
    }

    const panelLikelyOpen = Number.isInteger(windowId) && (
      hasLivePanel(windowId) ||
      (openWindows.has(windowId) && !collapsedWindows.has(windowId))
    );

    if (panelLikelyOpen) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
      (async () => {
        try {
          if (action) {
            await serializeStorageMutation("pending-panel-action",() =>
              chrome.storage.local.set({pendingAction:action})
            );
          }
          await ensureWorkspaceSystem();
          sendResponse({ok:true,reusedPanel:true});
        } catch (error) {
          sendResponse({ok:false,error:String(error?.message || error)});
        }
      })();
      return true;
    }

    const openPromise = Number.isInteger(windowId)
      ? openTowerContainer(windowId,{intent:message.intent,tabId:sender?.tab?.id})
      : Promise.resolve();
    if (Number.isInteger(windowId)) {
      void markPanelOpen(windowId,{authoritative:true}).catch(() => {});
    }
    const pendingPromise = action
      ? serializeStorageMutation("pending-panel-action",() =>
          chrome.storage.local.set({pendingAction:action})
        )
      : Promise.resolve();

    (async () => {
      try {
        await Promise.all([ensureWorkspaceSystem(),pendingPromise,openPromise]);
        sendResponse({ok:true});
      } catch (error) {
        if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true}).catch(() => {});
        sendResponse({ok:false,error:String(error?.message || error)});
      }
    })();
    return true;
  }

''')

    text = replace_section(
        text,
        '  if (message.type === "COLLAPSE_PANEL") {',
        '  if (message.type === "DISABLE_GLOBAL") {',
        '''  if (message.type === "COLLAPSE_PANEL") {
    const windowId = Number(message.windowId);
    (async () => {
      try {
        if (!Number.isInteger(windowId)) throw new Error("Invalid windowId");
        await closeTowerContainer(windowId);
        await markPanelClosed(windowId,{collapsed:true});
        sendResponse({ok:true});
      } catch (error) {
        sendResponse({ok:false,error:String(error?.message || error)});
      }
    })();
    return true;
  }

  if (message.type === "PANEL_COLLAPSED") {
    const windowId = messageWindowId(message,sender);
    (async () => {
      if (Number.isInteger(windowId)) await markPanelClosed(windowId,{collapsed:true});
      sendResponse({ok:true});
    })().catch(error => sendResponse({ok:false,error:String(error?.message || error)}));
    return true;
  }

''')

    text = replace_section(
        text,
        '  if (message.type === "DISABLE_GLOBAL") {',
        '  if (message.type === "ATN_PWA_MANIFEST_LINK_V060") {',
        '''  if (message.type === "DISABLE_GLOBAL") {
    (async () => {
      globallyEnabled = false;
      await chrome.storage.local.set({ [GLOBAL_ENABLED_KEY]: false });

      const tabs = await chrome.tabs.query({ url:["http://*/*","https://*/*"] });
      await Promise.allSettled(
        tabs
          .filter(tab => Number.isInteger(tab.id))
          .map(tab => chrome.tabs.sendMessage(tab.id, {
            type:"ATN_SET_RAIL_VISIBLE",
            visible:false
          }))
      );

      const windowIds = [...new Set([...openWindows,...collapsedWindows])];
      await Promise.allSettled(windowIds.map(async windowId => {
        if (openWindows.has(windowId)) await closeTowerContainer(windowId).catch(() => {});
        await markPanelClosed(windowId,{collapsed:false});
      }));

      sendResponse({ ok:true });
    })().catch(error => {
      sendResponse({ ok:false, error:String(error?.message || error) });
    });
    return true;
  }

''')

    legacy = [name for name in ("persistPanelWindows", "persistCollapsedWindows") if name in text]
    if legacy:
        raise RuntimeError(f"legacy panel persistence remains: {legacy}")

    BACKGROUND.write_text(text, encoding="utf-8")
    print("TASK2 runtime integration prepared")


if __name__ == "__main__":
    main()
