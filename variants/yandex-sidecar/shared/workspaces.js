import { normalizeShortcutList } from "./shortcuts.js";

export const WORKSPACES_KEY = "atnWorkspacesV1";
export const DEFAULT_WORKSPACE_KEY = "atnDefaultWorkspaceIdV1";
export const WINDOW_WORKSPACES_KEY = "atnWindowWorkspaceMapV1";

export function normalizeWorkspace(raw, fallbackState = null) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim().slice(0,128);
  if (!id) return null;
  return {
    id,
    name:String(raw.name || "Workspace").replace(/\s+/g," ").trim().slice(0,80) || "Workspace",
    sites:normalizeShortcutList(raw.sites || fallbackState?.sites || []),
    panes:normalizePanes(raw.panes || fallbackState?.panes),
    layout:normalizeLayout(raw.layout || fallbackState?.layout),
    createdAt:Number(raw.createdAt) || Date.now(),
    updatedAt:Number(raw.updatedAt) || Date.now()
  };
}

export function normalizePanes(value) {
  const empty = {url:"",title:"",mode:"auto",compatDomains:[],sourceSiteId:null};
  const pane = raw => raw?.url ? {
    url:String(raw.url),
    title:String(raw.title || raw.url),
    mode:["auto","secure","compat","real"].includes(raw.mode) ? raw.mode : "auto",
    compatDomains:Array.isArray(raw.compatDomains) ? raw.compatDomains.map(String).slice(0,20) : [],
    sourceSiteId:raw.sourceSiteId ? String(raw.sourceSiteId) : null
  } : structuredClone(empty);
  return {top:pane(value?.top),bottom:pane(value?.bottom)};
}

export function normalizeLayout(value) {
  const ratio = Math.min(.8,Math.max(.2,Number(value?.ratio)||.58));
  return {
    split:value?.split === true,
    ratio,
    activePane:value?.activePane === "bottom" ? "bottom" : "top"
  };
}

export function workspaceSummary(workspace) {
  return {id:workspace.id,name:workspace.name,updatedAt:workspace.updatedAt};
}
