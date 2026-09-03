(() => {
  const INSTANCE_KEY = "__ATN_PWA_DISCOVERY_V060__";
  if (globalThis[INSTANCE_KEY]) return;
  globalThis[INSTANCE_KEY] = true;

  const MESSAGE_TYPE = "ATN_PWA_MANIFEST_LINK_V060";
  let lastKey = "";
  let observer = null;

  function manifestLink() {
    for (const link of document.querySelectorAll('link[rel]')) {
      const rel = String(link.getAttribute("rel") || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (!rel.includes("manifest")) continue;
      try {
        return new URL(link.getAttribute("href") || "", document.baseURI).href;
      } catch {}
    }
    return "";
  }

  function scan() {
    const manifestUrl = manifestLink();
    if (!manifestUrl) return;

    let pageUrl = "";
    try { pageUrl = location.href; } catch { return; }

    const key = `${pageUrl}\n${manifestUrl}`;
    if (key === lastKey) return;
    lastKey = key;

    const payload = {
      type: MESSAGE_TYPE,
      pageUrl,
      manifestUrl,
      topFrame: window === window.top
    };

    // The background cache is authoritative and works for both normal tabs and
    // App Tower iframe pages.
    try { chrome.runtime.sendMessage(payload).catch(() => {}); } catch {}

    // The Side Panel can react immediately while the background fetch/cache is
    // still completing.
    if (window !== window.top && window.parent === window.top) {
      try { window.parent.postMessage(payload, "*"); } catch {}
    }
  }

  function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(scan);
    observer.observe(document.documentElement, {
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:["rel","href"]
    });
  }

  scan();
  startObserver();

  document.addEventListener("DOMContentLoaded", () => {
    scan();
    startObserver();
  }, { once:true });

  addEventListener("load", scan, { once:true });
})();
