import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const root = path.resolve(import.meta.dirname,"../..");

function pngSize(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
}

test("extension icons are deterministic, current and correctly sized", () => {
  execFileSync("python",[path.join(root,"tools/generate_icons.py"),"--check"],{cwd:root,stdio:"pipe"});
  for (const size of [16,32,48,128]) {
    const dimensions = pngSize(path.join(root,"app/icons",`icon${size}.png`));
    assert.deepEqual(dimensions,{width:size,height:size});
  }
});
