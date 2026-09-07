const currentWindow = await chrome.windows.getCurrent();
const params = new URLSearchParams(location.search);
const parsedHostWindowId = Number(params.get("hostWindowId"));
const hostWindowId = Number.isInteger(parsedHostWindowId) ? parsedHostWindowId : currentWindow.id;

const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
try {
  chrome.runtime.sendMessage = (message,...rest) => {
    if (message?.type === "PANE_LIVE") {
      message = {...message,keepAlive:true,foreground:true};
    }
    return originalSendMessage(message,...rest);
  };
} catch {}

function normalWebUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return /^(https?):$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function reprotectVisiblePanes() {
  for (const pane of document.querySelectorAll('.pane[data-pane]')) {
    if (getComputedStyle(pane).display === "none" || pane.getClientRects().length === 0) continue;
    const url = normalWebUrl(pane.querySelector('[data-role="url"]')?.value);
    if (!url) continue;
    await originalSendMessage({
      type:"PANE_LIVE",
      windowId:hostWindowId,
      pane:pane.dataset.pane === "bottom" ? "bottom" : "top",
      url,
      renderer:"iframe",
      keepAlive:true,
      foreground:true
    }).catch(()=>{});
  }
}
void reprotectVisiblePanes();

async function openAddForActiveBrowserTab() {
  const response = await originalSendMessage({type:"GET_CURRENT_TAB",windowId:hostWindowId}).catch(()=>null);
  const url = normalWebUrl(response?.tab?.url);
  if (!url) return false;
  await chrome.storage.local.set({
    pendingAction:{
      intent:"add",
      sourceUrl:url,
      sourceTitle:String(response?.tab?.title || url).slice(0,240),
      windowId:hostWindowId,
      nonce:Date.now()
    }
  });
  return true;
}

document.addEventListener("click",event => {
  const button = event.target?.closest?.("#rail-add,#home-add-current");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void openAddForActiveBrowserTab();
},true);

const style = document.createElement("style");
style.dataset.atnManualGateFixes = "1";
style.textContent = `
.atn-drag-proxy {
  transform:translate(calc(-100% - 16px),-50%) scale(1.04) !important;
}
`;
document.head.append(style);
