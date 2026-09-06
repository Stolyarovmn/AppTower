export function collapseTargetForUrl(value, newTabUrl = "") {
  const url = String(value || "");
  if (/^https?:\/\//i.test(url)) return "content";

  const appNewTab = String(newTabUrl || "");
  if (appNewTab && (url === appNewTab || url.startsWith(`${appNewTab}?`) || url.startsWith(`${appNewTab}#`))) {
    return "newtab";
  }

  return "unsupported";
}
