const currentWindow = await chrome.windows.getCurrent();
const params = new URLSearchParams(location.search);

function parseWindowId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

const hostWindowId = parseWindowId(params.get("hostWindowId")) ?? currentWindow.id;

function makeCloseButton(dialog) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dialog-close";
  button.setAttribute("aria-label", "Закрыть");
  button.title = "Закрыть";
  button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5 15.5 15.5M15.5 4.5 4.5 15.5"/></svg>';
  button.addEventListener("click", () => {
    if (dialog.open) dialog.close("cancel");
  });
  return button;
}

function markLegacyCloseOnlyRows(form) {
  for (const row of form.querySelectorAll(".dialog-actions")) {
    const buttons = [...row.querySelectorAll(":scope > button")];
    if (buttons.length !== 1) continue;
    const button = buttons[0];
    const value = String(button.value || "").toLowerCase();
    if (value === "close" || value === "cancel") {
      row.classList.add("dialog-close-only");
      row.setAttribute("aria-hidden", "true");
    }
  }
}

function installDialogShell(dialog) {
  const form = dialog.querySelector("form");
  if (!form || form.dataset.atnDialogShell === "1") return;
  form.dataset.atnDialogShell = "1";

  form.prepend(makeCloseButton(dialog));
  markLegacyCloseOnlyRows(form);

  // Search keeps its keyboard-hint footer, but the redundant text Close button
  // is hidden by the shared stylesheet.

  dialog.addEventListener("pointerdown", event => {
    // Chromium targets the <dialog> itself for a click on ::backdrop. Treat it
    // as cancellation only; never synthesize Save/OK/destructive actions.
    if (event.target === dialog && dialog.open) dialog.close("backdrop");
  });
}

for (const dialog of document.querySelectorAll("dialog")) installDialogShell(dialog);

// Keep future dialogs consistent too, including module-provided declarative UI.
const dialogObserver = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches?.("dialog")) installDialogShell(node);
      for (const dialog of node.querySelectorAll?.("dialog") || []) installDialogShell(dialog);
    }
  }
});
dialogObserver.observe(document.documentElement, {childList:true, subtree:true});

/* Context-menu parity: groups already expose Dissolve directly; templates must
 * not require opening the editor just to perform the equivalent action. */
const shortcutMenu = document.getElementById("shortcut-menu");
let contextShortcut = null;

document.addEventListener("contextmenu", event => {
  const shortcut = event.target?.closest?.(".rail-site[data-shortcut-id]");
  contextShortcut = shortcut ? {
    id:shortcut.dataset.shortcutId || "",
    kind:shortcut.dataset.shortcutKind || ""
  } : null;
}, true);

function injectTemplateDissolveAction() {
  if (!shortcutMenu || shortcutMenu.classList.contains("hidden")) return;
  if (contextShortcut?.kind !== "template" || !contextShortcut.id) return;
  if (shortcutMenu.querySelector('[data-ui-action="dissolve-template"]')) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.uiAction = "dissolve-template";
  button.textContent = "Разобрать шаблон";
  button.addEventListener("click", async () => {
    const templateId = contextShortcut?.id;
    shortcutMenu.classList.add("hidden");
    if (!templateId) return;
    button.disabled = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type:"MUTATE_SHORTCUTS",
        windowId:hostWindowId,
        action:"dissolve",
        id:templateId
      });
      if (!response?.ok) throw new Error(response?.error || "Не удалось разобрать шаблон");
    } catch (error) {
      alert(`Не удалось разобрать шаблон: ${String(error?.message || error)}`);
    } finally {
      button.disabled = false;
    }
  });

  const duplicate = [...shortcutMenu.querySelectorAll("button")]
    .find(item => item.textContent.trim() === "Дублировать");
  const existingDivider = duplicate?.previousElementSibling?.classList?.contains("separator")
    ? duplicate.previousElementSibling
    : duplicate;

  if (existingDivider) shortcutMenu.insertBefore(button, existingDivider);
  else shortcutMenu.append(button);
}

if (shortcutMenu) {
  const menuObserver = new MutationObserver(injectTemplateDissolveAction);
  menuObserver.observe(shortcutMenu, {childList:true, attributes:true, attributeFilter:["class"]});
}
