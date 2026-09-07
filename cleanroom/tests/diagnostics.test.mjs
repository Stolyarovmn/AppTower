import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const background=fs.readFileSync(path.join(root,'background.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'diagnostics.html'),'utf8');

test('diagnostics is exposed and records lifecycle/API capability evidence',()=>{
  assert.equal(manifest.options_page,'diagnostics.html');
  for(const token of ['atv2.devlog.v1','lifecycle.transition','panel.collapse.request','panel.collapse.unsupported','edge.sidePanel.onOpened','edge.sidePanel.onClosed','GET_DIAGNOSTICS','RUN_SELF_TEST']) assert.match(background,new RegExp(token.replaceAll('.','\\.')));
  assert.match(html,/Запустить self-test/);
  assert.match(html,/Копировать JSON/);
  assert.match(html,/Скачать JSON/);
});
