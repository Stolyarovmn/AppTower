import test from "node:test";
import assert from "node:assert/strict";
import {
  localShortcutTreeIsEmpty,
  sanitizeSyncedPreferences,
  shouldRestoreSync,
  validSyncPayload
} from "../../app/shared/sync-bridge.js";

const payload = {
  format:"app-tower-next-sync",
  updatedAt:123,
  workspaces:[{id:"main",sites:[{id:"a"}]}]
};

test("legacy remote sync payload restores opt-in on a fresh reinstall", () => {
  assert.equal(validSyncPayload(payload),true);
  assert.equal(shouldRestoreSync({
    remoteIntent:undefined,
    remotePayload:payload,
    localWorkspaces:undefined
  }),true);
});

test("explicit disabled sync intent wins over an existing remote payload", () => {
  assert.equal(shouldRestoreSync({
    remoteIntent:false,
    remotePayload:payload,
    localWorkspaces:[]
  }),false);
});

test("legacy payload does not silently re-enable sync over local shortcut data", () => {
  assert.equal(localShortcutTreeIsEmpty([{id:"main",sites:[{id:"local"}]}]),false);
  assert.equal(shouldRestoreSync({
    remoteIntent:undefined,
    remotePayload:payload,
    localWorkspaces:[{id:"main",sites:[{id:"local"}]}]
  }),false);
});

test("only approved preferences are accepted from sync", () => {
  const result = sanitizeSyncedPreferences({
    atnThemeMode:"dark",
    atnAccentColor:"#123456",
    atnPerformanceV1:{idleMinutes:5,maxLive:4},
    atnSiteSettingsV1:{"https://example.com":{zoom:110}},
    atnEnabled:false,
    pendingAction:{intent:"remove-everything"}
  });
  assert.deepEqual(result,{
    atnThemeMode:"dark",
    atnAccentColor:"#123456",
    atnPerformanceV1:{idleMinutes:5,maxLive:4},
    atnSiteSettingsV1:{"https://example.com":{zoom:110}}
  });
});
