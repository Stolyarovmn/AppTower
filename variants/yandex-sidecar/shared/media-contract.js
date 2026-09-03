export const MEDIA_STATE_KEY = "atnMediaStateV1";

export function normalizeMediaState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const provider = String(raw.provider || "").trim().slice(0,64);
  const windowId = Number(raw.windowId);
  const pane = raw.pane === "bottom" ? "bottom" : "top";
  if (!provider || !Number.isInteger(windowId)) return null;
  return {
    provider,
    windowId,
    pane,
    title:String(raw.title || "").slice(0,160),
    artist:String(raw.artist || "").slice(0,160),
    artwork:String(raw.artwork || "").slice(0,1000),
    playing:raw.playing === true,
    controllable:raw.controllable === true,
    capabilities:Array.isArray(raw.capabilities) ? raw.capabilities.filter(x => ["play","pause","next","previous","seek"].includes(x)).slice(0,8) : [],
    updatedAt:Date.now()
  };
}
