import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function validateTree(root, {fallback=false}={}) {
  const label = path.relative(repo, root) || ".";
  if (!fs.existsSync(root)) {
    fail(`${label}: missing source tree`);
    return;
  }

  const files = walk(root);
  const jsonFiles = files.filter(f => f.endsWith(".json"));
  const jsFiles = files.filter(f => f.endsWith(".js"));

  for (const file of jsonFiles) {
    try { JSON.parse(read(file)); }
    catch (error) { fail(`${label}: invalid JSON ${path.relative(root,file)}: ${error.message}`); }
  }

  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], {encoding:"utf8"});
    if (result.status !== 0) {
      fail(`${label}: JS syntax ${path.relative(root,file)}\n${result.stderr}`);
    }
  }

  for (const file of jsFiles) {
    const text = read(file);
    for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1];
      if (!spec.startsWith(".")) continue;
      const target = path.resolve(path.dirname(file), spec);
      if (!fs.existsSync(target)) fail(`${label}: missing import ${spec} from ${path.relative(root,file)}`);
    }
  }

  const manifestPath = path.join(root, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    fail(`${label}: manifest.json missing`);
    return;
  }
  const manifest = JSON.parse(read(manifestPath));

  const refs = [];
  if (manifest.background?.service_worker) refs.push(manifest.background.service_worker);
  if (manifest.side_panel?.default_path) refs.push(manifest.side_panel.default_path);
  if (manifest.options_ui?.page) refs.push(manifest.options_ui.page);
  refs.push(...Object.values(manifest.chrome_url_overrides || {}));
  for (const cs of manifest.content_scripts || []) {
    refs.push(...(cs.js || []), ...(cs.css || []));
  }
  refs.push(...Object.values(manifest.icons || {}));
  for (const ref of refs) {
    if (ref && !fs.existsSync(path.join(root, ref))) fail(`${label}: manifest resource missing: ${ref}`);
  }

  for (const page of ["sidepanel","options","newtab"]) {
    const htmlPath = path.join(root,page,`${page}.html`);
    const jsPath = path.join(root,page,`${page}.js`);
    if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) continue;
    const html = read(htmlPath);
    const js = read(jsPath);
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    const duplicates = [...new Set(ids.filter((id,i) => ids.indexOf(id) !== i))];
    if (duplicates.length) fail(`${label}: duplicate IDs in ${page}: ${duplicates.join(", ")}`);

    const refs = new Set([...js.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(m=>m[1]));
    if (page === "options") {
      for (const m of js.matchAll(/\bq\(["']([^"']+)["']\)/g)) refs.add(m[1]);
    }
    for (const id of refs) {
      if (!ids.includes(id)) fail(`${label}: ${page}.js references missing #${id}`);
    }
  }

  const forbidden = files.filter(f => [".pem",".crx"].includes(path.extname(f).toLowerCase()));
  if (forbidden.length) fail(`${label}: forbidden signing artifacts: ${forbidden.map(f=>path.relative(root,f)).join(", ")}`);

  if (fallback) {
    if ((manifest.permissions || []).includes("sidePanel")) fail(`${label}: fallback variant still requests sidePanel`);
    if (manifest.side_panel) fail(`${label}: fallback variant still declares side_panel`);
  }

  const readme = path.join(root,"README.md");
  if (fs.existsSync(readme)) {
    const first = read(readme).match(/App Tower Next v(\d+\.\d+\.\d+)/);
    if (first && first[1] !== manifest.version) {
      fail(`${label}: README version ${first[1]} != manifest ${manifest.version}`);
    }
  }

  console.log(`${label}: JSON ${jsonFiles.length}, JS ${jsFiles.length}, manifest/DOM/import checks OK`);
  return manifest;
}

const appManifest = validateTree(path.join(repo,"app"));
const fallbackManifest = validateTree(path.join(repo,"variants","yandex-sidecar"), {fallback:true});
if (appManifest && fallbackManifest && appManifest.version !== fallbackManifest.version) {
  fail(`variant version mismatch: app ${appManifest.version}, yandex ${fallbackManifest.version}`);
}

if (!process.exitCode) console.log("App Tower Next validation: OK");
