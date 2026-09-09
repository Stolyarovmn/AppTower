import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export function checkPermissions(manifest, budget) {
  const errors = [];
  for (const field of ['permissions', 'optional_permissions', 'host_permissions', 'optional_host_permissions']) {
    const allowed = budget[field];
    if (!allowed || typeof allowed !== 'object') throw Error(`Missing budget: ${field}`);
    for (const [name, reason] of Object.entries(allowed)) {
      if (typeof reason !== 'string' || !reason.trim()) errors.push(`Missing rationale: ${field}:${name}`);
    }
    if (manifest[field] !== undefined && !Array.isArray(manifest[field])) errors.push(`Invalid list: ${field}`);
    else for (const permission of manifest[field] || []) {
      if (!Object.hasOwn(allowed, permission)) errors.push(`Unreviewed ${field}: ${permission}`);
    }
  }
  for (const script of manifest.content_scripts || []) {
    for (const match of script.matches || []) {
      if (!budget.content_script_matches.includes(match)) errors.push(`Unreviewed content script match: ${match}`);
    }
    if (script.all_frames && !budget.content_script_all_frames) errors.push('Unreviewed all_frames injection');
    if (script.match_origin_as_fallback || script.match_about_blank) errors.push('Unreviewed inherited-origin injection');
    if (script.world === 'MAIN') errors.push('Unreviewed MAIN world injection');
  }
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const manifest = JSON.parse(fs.readFileSync(process.argv[2] || path.join(root, 'manifest.json')));
  const budget = JSON.parse(fs.readFileSync(new URL('./permission-budget.json', import.meta.url)));
  const errors = checkPermissions(manifest, budget);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Cleanroom permission budget: OK');
}
