import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const html=fs.readFileSync(path.join(root,"sidepanel.html"),"utf8");
const js=fs.readFileSync(path.join(root,"sidepanel.js"),"utf8");
const rail=fs.readFileSync(path.join(root,"rail.js"),"utf8");

test("expanded right rail exposes a right-pointing collapse affordance",()=>{
  assert.match(html,/id="collapse"[^>]*aria-label="Свернуть AppTower"/);
  assert.match(html,/id="collapse"[\s\S]*?<path d="m7\.5 4\.5 5\.5 5\.5-5\.5 5\.5"\/?>/);
  assert.doesNotMatch(html,/id="collapse"[\s\S]*?<path d="m12\.5 4\.5-5\.5 5\.5 5\.5 5\.5"\/?>/);
  assert.match(js,/collapse\.addEventListener\("click"/);
  assert.match(js,/type:"COLLAPSE_PANEL"/);
});

test("compact rail prepares hidden and becomes visible only via lifecycle visibility message",()=>{
  assert.match(rail,/message\?\.type!=="RAIL_PREPARE_COLLAPSE"/);
  assert.match(rail,/ensure\(\);\s*setVisible\(false\);\s*sendResponse\(\{ok:true,ready:true,visible:false\}\)/);
  assert.match(rail,/message\?\.type==="RAIL_VISIBILITY"/);
  assert.doesNotMatch(rail,/RAIL_PREPARE_COLLAPSE[\s\S]{0,160}setVisible\(true\)/);
});

 test("compact expand arrow points left, opposite to expanded collapse",()=>{
  assert.match(rail,/M12\.5 4\.5 7 10 12\.5 15\.5/);
 });
