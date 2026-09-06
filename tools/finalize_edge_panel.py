#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def replace_exact(path: str, old: str, new: str, *, count: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise RuntimeError(f"{path}: expected {count} occurrence(s), found {actual}: {old[:100]!r}")
    write(path, text.replace(old, new))


# ---------------------------------------------------------------------------
# Collapse handoff: never close the native Side Panel until a compact rail is
# known to exist on the active browser page. Privileged Edge/Chrome pages cannot
# host extension content scripts, so keeping the panel open is the only safe UX.
# ---------------------------------------------------------------------------
replace_exact(
    "app/background.js",
    'import { createPanelLifecycleController } from "./shared/panel-lifecycle-controller.js";\n',
    'import { createPanelLifecycleController } from "./shared/panel-lifecycle-controller.js";\n'
    'import { collapseTargetForUrl } from "./shared/collapse-handoff.js";\n',
)

marker = '''async function bestWebTabForWindow(windowId) {
'''
text = read("app/background.js")
start = text.index(marker)
end_marker = '''  return null;
}

chrome.runtime.onMessage.addListener'''
end = text.index(end_marker, start)
insert_at = end + len('''  return null;
}
''')
prepare = r'''

async function prepareCollapsedRail(windowId) {
  const [tab] = await chrome.tabs.query({active:true,windowId});
  if (!Number.isInteger(tab?.id)) {
    throw new Error("Не удалось определить активную вкладку для сворачивания App Tower");
  }

  const target = collapseTargetForUrl(
    tab.url,
    chrome.runtime.getURL("newtab/newtab.html")
  );

  if (target === "newtab") {
    return {kind:"newtab",tabId:tab.id};
  }

  if (target !== "content") {
    throw new Error("На служебной странице Edge нельзя свернуть App Tower в узкую панель. Перейдите на обычный сайт или новую вкладку App Tower.");
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type:"ATN_SET_RAIL_VISIBLE",
      visible:true,
      reason:"collapse-handoff"
    });
    if (!response?.ok) throw new Error("rail did not acknowledge handoff");
  } catch {
    throw new Error("Компактная панель App Tower ещё не готова на этой странице. Дождитесь загрузки страницы и повторите сворачивание.");
  }

  return {kind:"content",tabId:tab.id};
}
'''
write("app/background.js", text[:insert_at] + prepare + text[insert_at:])

replace_exact(
    "app/background.js",
    '''        if (!Number.isInteger(windowId)) throw new Error("Invalid windowId");
        await closeTowerContainer(windowId);
        await markPanelClosed(windowId,{collapsed:true});
        sendResponse({ok:true});
''',
    '''        if (!Number.isInteger(windowId)) throw new Error("Invalid windowId");
        const handoff = await prepareCollapsedRail(windowId);
        await closeTowerContainer(windowId);
        await markPanelClosed(windowId,{collapsed:true});
        sendResponse({ok:true,handoff:handoff.kind});
''',
)

replace_exact(
    "app/content/rail.js",
    '''  chrome.runtime.onMessage.addListener(message=>{
    if(disposed||message?.type!=="ATN_SET_RAIL_VISIBLE")return;
    setVisible(message.visible);
  });
''',
    '''  chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
    if(disposed||message?.type!=="ATN_SET_RAIL_VISIBLE")return;
    setVisible(message.visible);
    sendResponse?.({ok:true,visible:Boolean(message.visible)});
    return false;
  });
''',
)

write(
    "app/shared/collapse-handoff.js",
    '''export function collapseTargetForUrl(value, newTabUrl = "") {\n'''
    '''  const url = String(value || "");\n'''
    '''  if (/^https?:\\/\\//i.test(url)) return "content";\n\n'''
    '''  const appNewTab = String(newTabUrl || "");\n'''
    '''  if (appNewTab && (url === appNewTab || url.startsWith(`${appNewTab}?`) || url.startsWith(`${appNewTab}#`))) {\n'''
    '''    return "newtab";\n'''
    '''  }\n\n'''
    '''  return "unsupported";\n'''
    '''}\n''',
)

# ---------------------------------------------------------------------------
# Options navigation: install the nav click path synchronously, before the
# async ES module finishes its initial chrome.* reads. This removes a real race.
# ---------------------------------------------------------------------------
replace_exact(
    "app/options/options.html",
    '  <script src="options.js" type="module"></script>\n',
    '  <script src="options-nav-bootstrap.js"></script>\n  <script src="options.js" type="module"></script>\n',
)

write(
    "app/options/options-nav-bootstrap.js",
    r'''(() => {
  const nav = [...document.querySelectorAll("#settings-nav button[data-section]")];
  const pages = [...document.querySelectorAll(".page[data-page]")];
  if (!nav.length || !pages.length) return;

  const sections = new Set(nav.map(button => button.dataset.section).filter(Boolean));
  const show = id => {
    if (!sections.has(id)) return;
    for (const button of nav) button.classList.toggle("active", button.dataset.section === id);
    for (const page of pages) page.classList.toggle("active", page.dataset.page === id);

    const hash = `#${id}`;
    if (location.hash !== hash) history.replaceState(history.state, "", hash);
  };

  for (const button of nav) {
    button.addEventListener("click", () => show(button.dataset.section));
  }

  const initial = location.hash.slice(1);
  if (sections.has(initial)) show(initial);
  document.documentElement.dataset.optionsNavReady = "1";
})();
''',
)

# ---------------------------------------------------------------------------
# Pane toolbar: replace text glyphs with one SVG language, and make the focus
# affordance conditional on whether it can actually change the layout.
# ---------------------------------------------------------------------------
replace_exact(
    "app/sidepanel/sidepanel.html",
    '            <button class="go" data-action="go" title="Открыть URL">↵</button>\n',
    '''            <button class="go" data-action="go" title="Открыть URL" aria-label="Открыть URL">\n'''
    '''              <svg class="pane-action-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg>\n'''
    '''            </button>\n''',
    count=2,
)
replace_exact(
    "app/sidepanel/sidepanel.html",
    '            <button class="reload" data-action="reload" title="Обновить">⟳</button>\n',
    '''            <button class="reload" data-action="reload" title="Обновить" aria-label="Обновить">\n'''
    '''              <svg class="pane-action-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 7.2A6 6 0 1 0 16 12"/><path d="M12.5 4.5h3.5V8"/></svg>\n'''
    '''            </button>\n''',
    count=2,
)
replace_exact(
    "app/sidepanel/sidepanel.html",
    '            <button class="external" data-action="external" title="Открыть в обычной вкладке">↗</button>\n',
    '''            <button class="external" data-action="external" title="Открыть в обычной вкладке" aria-label="Открыть в обычной вкладке">\n'''
    '''              <svg class="pane-action-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M9 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V11"/><path d="M11 4h5v5M10 10l6-6"/></svg>\n'''
    '''            </button>\n''',
    count=2,
)
replace_exact(
    "app/sidepanel/sidepanel.html",
    '            <button class="focus" data-action="focus" title="Развернуть эту область">□</button>\n',
    '''            <button class="focus hidden" data-action="focus" title="Развернуть эту область" aria-label="Развернуть эту область" aria-pressed="false">\n'''
    '''              <svg class="pane-action-icon focus-expand-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v4M12 4h4v4M16 12v4h-4M8 16H4v-4"/></svg>\n'''
    '''              <svg class="pane-action-icon focus-restore-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h8v8M13 15H5V7"/></svg>\n'''
    '''            </button>\n''',
    count=2,
)

replace_exact(
    "app/sidepanel/sidepanel.css",
    '.pane-select,.go,.reload,.external,.focus,.mode-button,.pwa-button { border:0;background:transparent;border-radius:6px;min-width:27px;height:30px;padding:0 5px; }\n',
    '''.pane-select,.go,.reload,.external,.focus,.mode-button,.pwa-button { border:0;background:transparent;border-radius:6px;min-width:27px;height:30px;padding:0 5px; }\n'''
    '''.go,.reload,.external,.focus { display:grid;place-items:center; }\n'''
    '''.pane-action-icon { width:18px;height:18px;display:block;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round; }\n'''
    '''.focus .focus-restore-icon { display:none; }\n'''
    '''.focus[aria-pressed="true"] .focus-expand-icon { display:none; }\n'''
    '''.focus[aria-pressed="true"] .focus-restore-icon { display:block; }\n''',
)

replace_exact(
    "app/sidepanel/sidepanel.js",
    '''  updateLayoutButton();
  if (!onboarding) {
''',
    '''  updateLayoutButton();
  updatePaneFocusControls();
  if (!onboarding) {
''',
)

needle = '''function faviconURL(url) {
'''
text = read("app/sidepanel/sidepanel.js")
idx = text.index(needle)
focus_fn = r'''function updatePaneFocusControls() {
  const canChangeLayout = state.layout.split || Boolean(state.focus);
  for (const [name, pane] of Object.entries(paneEls)) {
    const button = pane?.querySelector('[data-action="focus"]');
    if (!button) continue;

    const focused = state.focus === name;
    const hidden = !canChangeLayout || (Boolean(state.focus) && !focused);
    button.classList.toggle("hidden", hidden);
    button.setAttribute("aria-pressed", String(focused));
    button.title = focused ? "Вернуть две области" : "Развернуть эту область";
    button.setAttribute("aria-label", focused ? "Вернуть две области" : "Развернуть эту область");
  }
}

'''
write("app/sidepanel/sidepanel.js", text[:idx] + focus_fn + text[idx:])

replace_exact(
    "app/sidepanel/sidepanel.js",
    '''    await persistWorkspaceState(patch);
    await syncCompatRules();
    siteDialog.close();
    renderAll(false);
''',
    '''    await persistWorkspaceState(patch);
    await syncCompatRules();
    renderAll(false);
    siteDialog.close();
''',
)

# ---------------------------------------------------------------------------
# Regression tests for the fixed races and UI contract.
# ---------------------------------------------------------------------------
old_focus_test = r'''test("ATN-E2E-022 pane focus control only appears when it can change the layout", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-focus-control-"));
  const context = await launch(profile);
  try {
    const panel = await openPanel(context);
    const topFocus = panel.locator('.pane[data-pane="top"] [data-action="focus"]');
    await expect(topFocus).toBeHidden();

    await panel.locator("#toggle-split").click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
    await expect(topFocus).toBeVisible();
    await topFocus.click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","focus-top");
    await expect(topFocus).toHaveAttribute("title","Вернуть две области");
    await topFocus.click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
  } finally {
    await context.close().catch(()=>{});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
'''
new_focus_test = r'''test("ATN-E2E-022 pane focus control only appears when it can change the layout", async () => {
  const {server,baseUrl} = await startFixtureServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-focus-control-"));
  const context = await launch(profile);
  try {
    const web = context.pages()[0] || await context.newPage();
    await web.goto(`${baseUrl}/host`);
    const panel = await openPanel(context);
    await addCustomSite(panel,"Focus layout",`${baseUrl}/focus`,{fromHome:true});

    const topFocus = panel.locator('.pane[data-pane="top"] [data-action="focus"]');
    await expect(topFocus).toBeHidden();

    await panel.locator("#toggle-split").click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
    await expect(topFocus).toBeVisible();
    await topFocus.click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","focus-top");
    await expect(topFocus).toHaveAttribute("title","Вернуть две области");
    await topFocus.click();
    await expect(panel.locator("#workspace")).toHaveAttribute("data-layout","split");
  } finally {
    await context.close().catch(()=>{});
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
'''
replace_exact("tests/e2e/ui-followup-regressions.spec.mjs", old_focus_test, new_focus_test)

append_test = r'''

test("ATN-E2E-024 pane toolbar actions use SVG icons instead of text glyphs", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(),"app-tower-pane-icons-"));
  const context = await launch(profile);
  try {
    const panel = await openPanel(context);
    for (const action of ["go","reload","external","focus"]) {
      const button = panel.locator(`.pane[data-pane="top"] [data-action="${action}"]`);
      await expect(button.locator("svg").first()).toBeAttached();
      const text = await button.evaluate(element => [...element.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join("")
        .trim());
      expect(text).toBe("");
    }
  } finally {
    await context.close().catch(()=>{});
    fs.rmSync(profile,{recursive:true,force:true});
  }
});
'''
path = "tests/e2e/ui-followup-regressions.spec.mjs"
write(path, read(path).rstrip() + append_test + "\n")

write(
    "tests/unit/collapse-handoff.test.mjs",
    r'''import test from "node:test";
import assert from "node:assert/strict";
import {collapseTargetForUrl} from "../../app/shared/collapse-handoff.js";

test("normal http pages can hand off to the injected compact rail", () => {
  assert.equal(collapseTargetForUrl("https://example.com/a","chrome-extension://id/newtab/newtab.html"),"content");
  assert.equal(collapseTargetForUrl("http://127.0.0.1:8080/","chrome-extension://id/newtab/newtab.html"),"content");
});

test("App Tower new tab can hand off to its built-in rail", () => {
  const newTab = "chrome-extension://id/newtab/newtab.html";
  assert.equal(collapseTargetForUrl(newTab,newTab),"newtab");
  assert.equal(collapseTargetForUrl(`${newTab}#home`,newTab),"newtab");
});

test("privileged browser pages are rejected instead of making App Tower disappear", () => {
  const newTab = "chrome-extension://id/newtab/newtab.html";
  assert.equal(collapseTargetForUrl("edge://settings/help",newTab),"unsupported");
  assert.equal(collapseTargetForUrl("chrome://extensions/",newTab),"unsupported");
  assert.equal(collapseTargetForUrl("chrome-extension://id/options/options.html",newTab),"unsupported");
});
''',
)

print("Edge panel finalization edits applied successfully")
