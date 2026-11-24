/* v3.0.3: one or more checks per line of the approved command (lines 1–8).
   Browser checks for the same lines run against the unzipped build in scripts/e2e-v303.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import { splitBackup, settingsFromBackup, sanitizeHijriAdjust, HIJRI_ADJUST_OPTIONS, KNOWN_STATE_KEYS } from '../src/backup.js';
import {
  loadReading, presentPassage, passageVerses, juzForDay, dayRange, isLongVerse, previewText, LONG_VERSE_CHARS, PREVIEW_CHARS
} from '../src/blessed-reminder.js';
import { buildPassages, loadMetadata } from '../scripts/build-passages.mjs';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const fn = name => { const i = app.indexOf(`function ${name}(`); return app.slice(i, app.indexOf('\n}\n', i) + 2); };

test('L1 Mark Complete on Record previous prayer cards runs the same completion flow, marked late', () => {
  const card = fn('eventCardElement');
  assert.match(card, /<footer class="live-event-footer">\s*<button class="square-button is-complete mark-event-complete"/);
  assert.doesNotMatch(card, /\$\{late \? '' : `\s*<footer/);
  assert.match(card, /\$\{late \? ' data-mark-late="1"' : ''\}/);
  assert.match(fn('bindEventCards'), /markEventComplete\([^)]*\{ late: button\.dataset\.markLate === '1' \}\)/);
  const mark = fn('markEventComplete');
  assert.match(mark, /const lateOk = late && event && now >= event\.end && !eventClosed\(event\)/);
  assert.match(mark, /dayIsLocked\(/);
  assert.match(mark, /reviseOpen\(event, now\)/); // [changed in v3.0.4 E] the revise window replaces lateRecordable
  assert.match(mark, /if \(lateOk && newlyTicked\) noteLate\(record, `\$\{kind\}:\$\{key\}`, event, true\)/);
  // the same flow: Friday rule, closing, sound and rewards
  assert.match(mark, /applyFridayFard\(record, 'jumuah'\)/);
  assert.match(mark, /\(record\.closed \|\|= \{\}\)\[`\$\{kind\}:\$\{key\}`\] = true/);
  assert.match(mark, /playLayerSound\(/);
  assert.match(mark, /noteRecognition\(/);
});

// [changed in v3.0.4 D/E/F] L2/L3: the undo re-opens that one prayer under "Revise previous prayer" only;
// a partly ticked or unticked voluntary no longer appears on its own after its time (F1).
test('L2 undo in the daily record re-opens that one prayer only', () => {
  const undo = fn('undoWeeklyRecord');
  assert.ok(undo.length > 50);
  // nothing in the undo touches another prayer's tick or closed flag
  assert.doesNotMatch(undo, /for \(const .* of (getFardEvents|getVoluntaryEvents|reviseEvents)/);
  assert.match(fn('reopenAfterUndo'), /pendingStore\.reopened\[`\$\{dateKey\(date\)\}\|\$\{kind\}\|\$\{key\}`\] = true/);
  assert.match(fn('reopenAfterUndo'), /new Date\(\) >= event\.end && reviseOpen\(event\)/);
  assert.match(fn('renderLiveEvents'), /filter\(event => !eventClosed\(event\)\)/);
});

test('L3 a voluntary revise card stays until the record window closes', () => {
  const rec = fn('reviseOpen');
  assert.match(rec, /if \(event\.kind === 'voluntary'\) return voluntaryCanEdit\(event, dayRecord\(event\.date, false\)\);/);
  assert.match(fn('voluntaryCanEdit'), /recordingOpen\(event\.start, event\.end, lock\?\.at, new Date\(\)\)/);
});

test('L4 passages: 2,739, none over 10 verses, all 6,236 verses once, juz never crossed; 29/30-day months', async () => {
  const R = await loadReading();
  const P = R.passages;
  assert.equal(P.starts.length, 2739);
  const dist = {};
  let total = 0;
  for (let i = 0; i < P.starts.length; i++) {
    const { from, to } = passageVerses(P, i);
    const n = to - from;
    assert.ok(n >= 1 && n <= 10, `passage ${i} has ${n} verses`);
    const g = n >= 5 ? '5-10' : String(n);
    dist[g] = (dist[g] || 0) + 1;
    total += n;
  }
  assert.equal(total, 6236);
  assert.deepEqual(dist, { 1: 679, 2: 1176, 3: 538, 4: 259, '5-10': 87 });
  const starts = new Set(P.starts);
  for (const j of P.juz) assert.ok(starts.has(j));
  const rebuilt = buildPassages(JSON.parse(fs.readFileSync(new URL('../src/quran/data.json', import.meta.url))), loadMetadata());
  assert.deepEqual(rebuilt.starts, P.starts);
  for (const len of [29, 30]) {
    const seen = new Map();
    for (let d = 1; d <= len; d++) {
      const r = dayRange(P, juzForDay(d, len));
      for (let i = r.from; i < r.to; i++) { const v = passageVerses(P, i); for (let x = v.from; x < v.to; x++) seen.set(x, (seen.get(x) || 0) + 1); }
    }
    assert.equal(seen.size, 6236);
    assert.ok([...seen.values()].every(c => c === 1));
  }
  // the four forced list cuts and the evidence files are shipped
  assert.ok(fs.existsSync(new URL('../evidence-v3.0.3/five-to-ten.tsv', import.meta.url)));
});

test('L5 long verses: 232 previews at a word boundary with an ellipsis; Read more shows the whole verse (EN/BN)', async () => {
  const R = await loadReading();
  let n = 0;
  for (let i = 0; i < 6236; i++) if (isLongVerse(R.quran, i)) n++;
  assert.equal(n, 232);
  assert.equal(LONG_VERSE_CHARS, 350);
  const t = 'word '.repeat(100).trim();
  const p = previewText(t);
  assert.ok(p.endsWith('…') && p.length <= PREVIEW_CHARS + 1 && t.startsWith(p.slice(0, -1)));
  assert.match(p, /word…$/);
  // 2:282 (the longest verse) in EN and BN
  const P = R.passages;
  let idx = -1;
  for (let i = 0; i < P.starts.length && idx < 0; i++) { const v = passageVerses(P, i); if (v.from <= 288 && 288 < v.to) idx = i; }
  for (const lang of ['en', 'bn']) {
    const short = presentPassage(R, idx, lang);
    const long = presentPassage(R, idx, lang, { expanded: true });
    const pv = short.verses.find(v => v.preview);
    assert.ok(pv, lang);
    assert.ok(short.truncated && short.previewed);
    const whole = long.verses.find(v => v.ayah === pv.ayah && v.surah === pv.surah);
    assert.ok(whole.text.length > 1000 && !whole.preview);
    assert.ok(whole.text.startsWith(pv.text.slice(0, -1).trimEnd()));
    assert.ok(pv.text.endsWith('…'));
  }
  assert.match(fn('passageHtml'), /view\.truncated \|\| view\.expanded/);
});

test('L6 Hijri date adjustment: −2..+2 days, default 0, shifts every Hijri date, not prayer times', () => {
  assert.deepEqual([...HIJRI_ADJUST_OPTIONS], [-2, -1, 0, 1, 2]);
  assert.equal(sanitizeHijriAdjust(undefined), 0);
  assert.equal(sanitizeHijriAdjust('1'), 1);
  assert.equal(sanitizeHijriAdjust(3), 0);
  assert.equal(sanitizeHijriAdjust(-2), -2);
  assert.equal(sanitizeHijriAdjust(0.5), 0);
  assert.match(app, /hijriAdjust: 0,/);
  assert.match(app, /hijriAdjust: sanitizeHijriAdjust\(saved\.hijriAdjust\)/);
  // [changed in v3.0.6 H] the shift is applied before the crescent (or Umm al-Qura) lookup; the clock card uses hijriParts
  assert.match(fn('hijriParts'), /const shifted = addDays\(date, hijriShift\(\)\);/);
  assert.match(fn('hijriParts'), /crescentHijri\(shifted\) \|\| ummAlQuraParts\(shifted\)/);
  assert.match(fn('paintClockDate'), /hijriParts\(hijriDay\)/);
  assert.match(fn('paintClockDate'), /const hijriDay = islamicCalendarDateAt\(now\);/);
  assert.match(fn('paintClockDate'), /\$\{hijriShift\(\)\}/);
  const card = html.slice(html.indexOf('TIME ADJUSTMENTS'), html.indexOf('</section>', html.indexOf('TIME ADJUSTMENTS')));
  assert.match(card, /<select id="hijriAdjustSelect">/);
  assert.match(card, /Hijri date adjustment/);
  assert.match(fn('renderHijriAdjust'), /'হিজরি তারিখ সমন্বয়' : 'Hijri date adjustment'/);
  // prayer times never read the adjustment
  for (const name of ['getTimes', 'getFardEvents']) assert.doesNotMatch(fn(name), /hijri/i, name);
  // the reading's day and month length use hijriParts (adjusted)
  assert.match(fn('currentHijriDate'), /hijriParts\(/);
  // [changed in v3.0.6 D] the plan's day comes from hijriParts (adjusted) of the reading day
  assert.match(fn('readingContext'), /hijriParts\(civil\)/);
});

test('L7 backup carries the progress-line switch and the Hijri adjustment; older backups import with defaults', () => {
  assert.ok(KNOWN_STATE_KEYS.includes('blessedProgress') && KNOWN_STATE_KEYS.includes('hijriAdjust'));
  const { unknown, clean } = splitBackup({ theme: 'Pearl Mint', blessedProgress: false, hijriAdjust: -1 });
  assert.deepEqual(unknown, []);
  assert.deepEqual(settingsFromBackup(clean), { blessedProgress: false, hijriAdjust: -1 });
  const old = splitBackup({ theme: 'Pearl Mint', history: {} });
  assert.deepEqual(settingsFromBackup(old.clean), { blessedProgress: true, hijriAdjust: 0 });
  assert.deepEqual(settingsFromBackup(splitBackup({ hijriAdjust: 9 }).clean), { blessedProgress: true, hijriAdjust: 0 });
  assert.match(app, /Object\.assign\(state, settingsFromBackup\(clean\)\)/);
  // [changed in v3.0.6 F] export writes the whole state plus the read marks
  assert.match(app, /data: \{ \.\.\.state, reading: readStore\(\) \} \}/);
});

test('L8 version 3.0.6 everywhere; label v3.0.6 / v৩.০.৬', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(versionLabel('en'), 'v3.0.6');
  assert.equal(versionLabel('bn'), 'v৩.০.৬');
  assert.equal(JSON.parse(readText('../package.json', import.meta.url)).version, '3.0.6');
  const lock = JSON.parse(readText('../package-lock.json', import.meta.url));
  assert.equal(lock.version, '3.0.6');
  assert.equal(lock.packages[''].version, '3.0.6');
  assert.equal(JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url)).version, '3.0.6');
  assert.match(readText('../src-tauri/Cargo.toml', import.meta.url), /^version = "3\.0\.6"$/m);
  assert.match(readText('../src-tauri/Cargo.lock', import.meta.url), /name = "prayer-times-desktop"\nversion = "3\.0\.6"/);
  assert.match(readText('../README.md', import.meta.url), /^# Prayer Times — Windows desktop application \(v3\.0\.6\)/);
  assert.match(readText('../CHANGELOG.txt', import.meta.url), /^Prayer Times Desktop v3\.0\.6/);
  assert.match(readText('../TEST-RESULTS.md', import.meta.url), /^### v3\.0\.6/);
  assert.match(html, /id="appVersionLabel">v3\.0\.6</);
});
