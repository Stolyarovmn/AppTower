(() => {
  if (window === window.top) return;

  const STYLE_ID = "app-tower-next-embedded-cleanup";
  const MSG = "ATN_EMBED_INIT_V025";
  const INTERACTION_MSG = "ATN_EMBED_INTERACTION_V027";
  const META_MSG = "ATN_EMBED_META_V082";
  let initialized = false;
  let lastMetaKey = "";

  function enableCleanup() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html, body, * {
        scrollbar-width: none !important;
      }
      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      *::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
      }
      html, body {
        overscroll-behavior: contain !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.setAttribute("data-atn-embedded", "1");
    initialized = true;
    scheduleMeta();
  }

  function notifyMeta() {
    if (!initialized) return;
    if (window.parent !== window.top) return;
    try {
      const href = location.href;
      const title = String(document.title || "").trim();
      const key = `${href}\n${title}`;
      if (key === lastMetaKey) return;
      lastMetaKey = key;
      window.parent.postMessage({
        type:META_MSG,
        href,
        title
      }, "*");
    } catch {}
  }

  function scheduleMeta() {
    for (const delay of [0,80,300,900]) setTimeout(notifyMeta,delay);
  }

  function notifyInteraction(kind) {
    if (!initialized) return;
    // Only the website document directly hosted by our side-panel iframe should
    // select the pane. Nested third-party frames are intentionally ignored here.
    // WindowProxy identity comparison is allowed across origins.
    if (window.parent !== window.top) return;
    try {
      window.parent.postMessage({
        type: INTERACTION_MSG,
        kind,
        href: location.href
      }, "*");
    } catch {}
  }

  addEventListener("pointerdown", () => notifyInteraction("pointerdown"), true);
  addEventListener("focusin", () => notifyInteraction("focusin"), true);
  addEventListener("keydown", () => notifyInteraction("keydown"), true);

  addEventListener("load", scheduleMeta);
  addEventListener("popstate", scheduleMeta);
  addEventListener("hashchange", scheduleMeta);
  document.addEventListener("click", scheduleMeta, true);
  document.addEventListener("submit", scheduleMeta, true);

  const titleObserver = new MutationObserver(scheduleMeta);
  const observeTitle = () => {
    const title = document.querySelector("title");
    if (title) titleObserver.observe(title,{subtree:true,childList:true,characterData:true});
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeTitle, {once:true});
  } else {
    observeTitle();
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.type !== MSG) return;
    enableCleanup();
  });
})();
