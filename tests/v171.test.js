import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { migrateRecord } from '../src/history-migrate.js';
import { mergeHistory } from '../src/backup.js';

const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const html = readText('../index.html', import.meta.url);
const tauri = JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url));

test('v1.7.1 removes the homepage transparent circle; v1.8.1 restores native window decorations', () => {
  assert.match(css, /\.next-card::after \{ content:none; display:none; \}/);
  assert.doesNotMatch(html, /class="window-titlebar"/);
  assert.doesNotMatch(html, /id="windowMinimize"/);
  assert.equal(tauri.app.windows[0].decorations, true);
  assert.match(css, /\.app-shell \{ padding-top:\.55rem; \}/);
});

test('other voluntary prayers replace situational cards with a repeating +2 control', () => {
  assert.match(app, /id="otherVoluntaryAdd"/);
  assert.doesNotMatch(app, /id="otherVoluntaryUndo"/, 'v2.0.1: Undo prayer lives on the day-detail screen only');
  assert.match(app, /function recordOtherNafl\(delta\)/);
  assert.doesNotMatch(app, /data-situational-pair=/);
  assert.match(app, /querySelector\('#otherVoluntaryAdd'\)\.addEventListener\('click', \(\) => recordOtherNafl\(2\)\)/);
});

test('each +2 rakah action records an even nafl count and glows the tab for half a second', () => {
  // [changed in v3.0.4 C/D/E/F] +2 adds to an unsaved count (pendingStore.other); Mark Complete saves the even total
  assert.match(app, /if \(next < 0 \|\| next % 2\) return;/);
  assert.match(app, /record\.otherNafl = total/);
  assert.match(app, /record\.rakahs\.other_nafl = total/);
  assert.match(app, /bar\.classList\.add\('is-glow'\)/);
  assert.match(app, /setTimeout\(\(\) => bar\.classList\.remove\('is-glow'\), 500\)/);
  assert.match(css, /\.other-voluntary-card\.is-glow \{[^}]*#e7c56a/s);
});

test('legacy situational plans stay available for history, and new nafl counts stay even', () => {
  assert.match(app, /nafl_mutlaq: \{ mode: 'custom', step: 2 \}/);
  assert.match(app, /janazah: \{ mode: 'occasion', rakahs: 0 \}/);
  assert.match(app, /if \(next < 0 \|\| next % 2\) return/);
});

test('situational set counts survive migration and backup merge; legacy single checks remain one prior set', () => {
  const old = migrateRecord({ situational: { istikhara: true }, rakahs: { istikhara: 2 } });
  assert.equal(old.situational.istikhara, true);
  const merged = mergeHistory({ '2026-11-14': { situational: { istikhara: true }, situationalSets: { istikhara: 2 }, situationalOccurrences: { istikhara: 2 }, rakahs: { istikhara: 4 } } }, { '2026-11-14': { situational: { istikhara: true }, situationalSets: { istikhara: 3 }, situationalOccurrences: { istikhara: 3 }, rakahs: { istikhara: 6 } } });
  assert.equal(merged.history['2026-11-14'].situationalSets.istikhara, 3);
  assert.equal(merged.history['2026-11-14'].situationalOccurrences.istikhara, 3);
});
