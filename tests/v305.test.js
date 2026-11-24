/* v3.0.5: checks for every line of the approved command (1 fonts, 2 tick chronology, 3 Qiyam al-Layl, 4 version).
   Browser checks for the same lines (EN and BN) run against the unzipped build in scripts/e2e-v305.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import { UI_FONTS, EN_FONTS, ALL_FONTS, FONT_GROUPS, SYSTEM_STACK, sanitizeFont, migrateFont, fontStack, fontLabel, isEnglishFont } from '../src/ui-fonts.js';
import { orderLocks } from '../src/recording-window.js';
import { qiyamBreakdown, inTahajjudTime, qiyamRecordInTahajjud } from '../src/voluntary-ticks.js';
import { migrateRecord } from '../src/history-migrate.js';
import { KNOWN_STATE_KEYS, splitBackup, mergeHistory } from '../src/backup.js';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const fn = name => { const i = app.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return app.slice(i, app.indexOf('\n}\n', i) + 2); };

/* ---------- 1. one Font list ---------- */
test('1 one Font list: System default + 10 English + 10 Bangla, grouped, bilingual labels', () => {
  assert.equal(ALL_FONTS.length, 21);
  assert.equal(ALL_FONTS[0].id, 'system');
  assert.equal(new Set(ALL_FONTS.map(f => f.id)).size, 21);
  assert.deepEqual(FONT_GROUPS.map(g => [g.id, g.fonts.length]), [['en', 10], ['bn', 10]]);
  assert.deepEqual(FONT_GROUPS.map(g => g.en), ['English', 'Bangla']);
  assert.deepEqual(FONT_GROUPS.map(g => g.bn), ['ইংরেজি', 'বাংলা']);
  assert.deepEqual(FONT_GROUPS[0].fonts.map(f => f.id), EN_FONTS.filter(f => f.id !== 'system').map(f => f.id));
  assert.deepEqual(FONT_GROUPS[1].fonts.map(f => f.id), UI_FONTS.filter(f => f.id !== 'system').map(f => f.id));
  for (const f of ALL_FONTS) { assert.ok(fontLabel(f.id, 'en')); assert.match(fontLabel(f.id, 'bn'), /[\u0980-\u09FF]|[A-Za-z]/); }
  assert.equal(fontLabel('system', 'bn'), 'সিস্টেম ডিফল্ট');
});

test('1 the chosen font draws what it can; English fonts fall back to Hind Siliguri for Bangla; System unchanged', () => {
  assert.equal(fontStack('system'), SYSTEM_STACK);
  assert.equal(fontStack('lato'), `"Lato", "Hind Siliguri", ${SYSTEM_STACK}`);
  assert.equal(fontStack('solaiman'), `"SolaimanLipi", ${SYSTEM_STACK}`);
  assert.equal(fontStack('hind'), `"Hind Siliguri", ${SYSTEM_STACK}`);
  for (const f of EN_FONTS.filter(x => x.id !== 'system')) { assert.ok(isEnglishFont(f.id)); assert.match(fontStack(f.id), new RegExp(`^"${f.family}", "Hind Siliguri", `)); }
  for (const f of UI_FONTS.filter(x => x.id !== 'system')) { assert.ok(!isEnglishFont(f.id)); assert.match(fontStack(f.id), new RegExp(`^"${f.family}", "Segoe UI Variable"`)); }
  assert.match(fn('applyUiFont'), /const stack = fontStack\(state\.font\)/);
  for (const v of ['--ui-font', '--en-font', '--app-font']) assert.match(fn('applyUiFont'), new RegExp(`setProperty\\('${v}', stack\\)`));
});

test('1 sanitising and migration of saved settings (language decides; removed fonts as before)', () => {
  for (const f of ALL_FONTS) assert.equal(sanitizeFont(f.id), f.id);
  for (const bad of [undefined, null, '', 'Comic Sans', 7, {}, 'system ']) assert.equal(sanitizeFont(bad), 'system');
  assert.equal(sanitizeFont('lohit'), 'bornomala');
  for (const old of ['baloo', 'atma', 'mina', 'galada']) assert.equal(sanitizeFont(old), 'hind');
  assert.equal(migrateFont({ language: 'bn', uiFont: 'solaiman', enFont: 'lato' }), 'solaiman', 'Bangla: the Bangla choice wins');
  assert.equal(migrateFont({ language: 'en', uiFont: 'solaiman', enFont: 'lato' }), 'lato', 'English: the English choice wins');
  assert.equal(migrateFont({ language: 'en', uiFont: 'solaiman' }), 'solaiman', 'English with System English font: the Bangla font drew the text');
  assert.equal(migrateFont({ language: 'bn', enFont: 'lora' }), 'lora', 'Bangla with System Bangla font: the English font drew the Latin text');
  assert.equal(migrateFont({ language: 'bn', uiFont: 'baloo' }), 'hind');
  assert.equal(migrateFont({ language: 'en', uiFont: 'lohit' }), 'bornomala');
  assert.equal(migrateFont({}), 'system');
  assert.equal(migrateFont({ font: 'nunito', uiFont: 'tiro', language: 'bn' }), 'nunito', 'a saved v3.0.5 font wins');
  assert.match(app, /font: migrateFont\(saved\)/);
  assert.match(app, /delete state\.uiFont;\ndelete state\.enFont;/);
});

test('1 Settings: one Font dropdown with optgroups and an honest EN/BN note', () => {
  assert.doesNotMatch(html, /enFontSelect|>English font</);
  assert.equal((html.match(/FontSelect"/g) || []).length, 2, 'one label for + one select');
  assert.match(html, /<label for="uiFontSelect">Font<\/label><select id="uiFontSelect"><\/select><p class="form-note" id="fontNote">English fonts have no Bangla letters, so with an English font Bangla text uses Hind Siliguri\.<\/p>/);
  const r = fn('renderUiFontSelect');
  assert.match(r, /<optgroup label=/);
  assert.match(r, /select\.value = state\.font/);
  assert.match(r, /ইংরেজি ফন্টে বাংলা অক্ষর নেই, তাই ইংরেজি ফন্ট বেছে নিলে বাংলা লেখা Hind Siliguri ফন্টে দেখায়।/);
  assert.match(app, /\$\('uiFontSelect'\)\.addEventListener\('change', event => \{ state\.font = sanitizeFont\(event\.target\.value\); save\(\); applyUiFont\(\); \}\);/);
  assert.doesNotMatch(app.replace('delete state.uiFont;\ndelete state.enFont;', ''), /enFontSelect|state\.enFont|state\.uiFont/);
});

test('1 backup: new key travels; old backups (uiFont/enFont) are read and migrated, not reported unknown', () => {
  assert.ok(KNOWN_STATE_KEYS.includes('font'));
  assert.ok(KNOWN_STATE_KEYS.includes('uiFont'));
  assert.ok(KNOWN_STATE_KEYS.includes('enFont'));
  assert.deepEqual(splitBackup({ uiFont: 'tiro', enFont: 'lora', language: 'en' }).unknown, []);
  assert.deepEqual(splitBackup({ font: 'lora' }).clean, { font: 'lora' });
  assert.match(app, /if \('font' in clean \|\| 'uiFont' in clean \|\| 'enFont' in clean\) state\.font = migrateFont\(\{ language: state\.language, \.\.\.clean \}\);/);
  // [changed in v3.0.6 F] the export also carries the read marks; the whole state is still written
  assert.match(app, /data: \{ \.\.\.state, reading: readStore\(\) \} \}, null, 2\)/, 'export writes the whole state, so `font` is in new backups');
});

/* ---------- 2. tick chronology ---------- */
test('2 orderLocks: skip allowed; an empty circle before a ticked one is locked; unticking unlocks', () => {
  assert.deepEqual(orderLocks([false, false, false, false]), [false, false, false, false]);
  assert.deepEqual(orderLocks([false, true, false, false]), [true, false, false, false], 'Fard ticked: 4 before locked');
  assert.deepEqual(orderLocks([true, true, false, false]), [false, false, false, false]);
  assert.deepEqual(orderLocks([false, true, false, true]), [true, false, true, false]);
  assert.deepEqual(orderLocks([false, false, false, true]), [true, true, true, false]);
  assert.deepEqual(orderLocks([false, false, false, false]), [false, false, false, false], 'after unticking all: open again');
  assert.deepEqual(orderLocks(null), []);
});

test('2 every Fard card (home, countdown page, revise) renders order locks: disabled, aria-disabled, dimmed', () => {
  const p = fn('partOrderLocks');
  assert.match(p, /orderLocks\(flags\)/);
  assert.match(p, /selectionView\(date\)/, 'recorded + pending selections');
  assert.match(p, /fridayFardChoice\(record\)/, 'Friday Jumu’ah/Dhuhr count as the Fard circle');
  const h = fn('partsHtml');
  assert.match(h, /const orderAttr = ' disabled aria-disabled="true" data-locked="true" data-order-locked="true"';/);
  assert.equal((h.match(/ordered && enabled \? orderAttr/g) || []).length, 3, 'Friday options, Fard, Sunnah/Nafl');
  assert.equal((h.match(/\$\{ordered && enabled \? ' is-locked' : ''\}/g) || []).length, 2);
  assert.equal((app.match(/partsHtml\(/g) || []).length, 3, 'one definition, home/revise card and countdown page');
});

test('2 clicks on a locked circle do nothing; a selected circle can always be unticked while open', () => {
  assert.match(fn('togglePrayer'), /if \(on && kind === 'fard' && partOrderLocks\(key, eventDate\)\.get\('fard'\)\) return;/);
  assert.match(fn('toggleFridayFard'), /if \(!shown && partOrderLocks\('dhuhr', eventDate\)\.get\('fard'\)\) return;/);
  const s = fn('toggleSubPrayer');
  assert.match(s, /if \(!unticking && partOrderLocks\(prayerKey, eventDate\)\.get\(`\$\{layer\}:\$\{key\}`\)\) return;/);
  assert.match(s, /partRecordable\(\{ position: 'after', fardDone: true,/);
  assert.match(app, /if \(!tick \|\| tick\.disabled\) return;/);
});

test('2 voluntary circles (Qiyam, Witr, Duha …) and Other voluntary already tick strictly in order', async () => {
  const { tickAllowed } = await import('../src/voluntary-ticks.js');
  assert.equal(tickAllowed([true, false, false], 2), false);
  assert.equal(tickAllowed([true, false, false], 1), true);
  assert.equal(tickAllowed([true, true, false], 0), false);
});

/* ---------- 3. Qiyam al-Layl ---------- */
test('3 split: Qiyam rak‘ahs before Tahajjud are "other"; in Tahajjud time they are Tahajjud; Witr is Witr; total = sum', () => {
  const r = { qiyam: 2, tahajjud: 0, witr: 3 };
  assert.deepEqual(qiyamBreakdown(r), { total: 5, tahajjud: 0, witr: 3, other: 2 });
  assert.deepEqual(qiyamBreakdown(r, { qiyamInTahajjud: true }), { total: 5, tahajjud: 2, witr: 3, other: 0 });
  assert.deepEqual(qiyamBreakdown({ qiyam: 4, tahajjud: 2, witr: 3 }, { qiyamInTahajjud: true }), { total: 9, tahajjud: 6, witr: 3, other: 0 });
  assert.deepEqual(qiyamBreakdown({}), { total: 0, tahajjud: 0, witr: 0, other: 0 });
});

test('3 Tahajjud time is Tahajjud start until Fajr; saved records use qiyamPart, older ones their saved time', () => {
  const night = { qiyamStart: 1000 * 60 * 60 * 19, tahajjudStart: 1000 * 60 * 60 * 25, fajr: 1000 * 60 * 60 * 29 };
  assert.ok(inTahajjudTime(night.tahajjudStart, night.tahajjudStart, night.fajr));
  assert.ok(!inTahajjudTime(night.tahajjudStart - 1, night.tahajjudStart, night.fajr));
  assert.ok(!inTahajjudTime(night.fajr, night.tahajjudStart, night.fajr));
  assert.equal(qiyamRecordInTahajjud({ qiyamPart: 'tahajjud' }, night), true);
  assert.equal(qiyamRecordInTahajjud({ qiyamPart: 'other', at: { 'voluntary:qiyam': [400, 0] } }, night), false);
  assert.equal(qiyamRecordInTahajjud({ at: { 'voluntary:qiyam': [400, 0] } }, night), true, 'older record at 01:40 (6h40 after 19:00)');
  assert.equal(qiyamRecordInTahajjud({ at: { 'voluntary:qiyam': [60, 0] } }, night), false, 'older record at 20:00');
  assert.equal(qiyamRecordInTahajjud({}, night), false, 'no time: "other", as before');
});

test('3 Mark Complete stores the split; Undo clears it; load and merge keep it', () => {
  const m = fn('markEventComplete');
  assert.match(m, /if \(kind === 'voluntary' && key === 'qiyam' && newlyTicked\) \{/);
  assert.match(m, /record\.qiyamPart = night && inTahajjudTime\(now\.getTime\(\), night\.tahajjudStart, night\.fajr\) \? 'tahajjud' : 'other';/);
  assert.match(fn('undoWeeklyRecord'), /if \(layer === 'voluntary' && key === 'qiyam'\) delete record\.qiyamPart;/);
  assert.equal(migrateRecord({ qiyamPart: 'tahajjud' }).qiyamPart, 'tahajjud');
  assert.equal('qiyamPart' in migrateRecord({ qiyamPart: 'x' }), false);
  const merged = mergeHistory({ '2026-11-23': { fard: {} } }, { '2026-11-23': { voluntary: { qiyam: true }, rakahs: { qiyam: 4 }, qiyamPart: 'tahajjud' } }).history['2026-11-23'];
  assert.equal(merged.qiyamPart, 'tahajjud');
  const kept = mergeHistory({ d: { qiyamPart: 'other' } }, { d: { qiyamPart: 'tahajjud' } }).history.d;
  assert.equal(kept.qiyamPart, 'other', 'the existing record wins, as for rak‘ahs');
});

test('3 card summary, Prayer record, progress and stats use the same split (EN and BN)', () => {
  const t = fn('qiyamBreakdownText');
  assert.match(t, /qiyamBreakdown\(record\.rakahs, \{ qiyamInTahajjud: !!day && qiyamInTahajjud\(day\) \}\)/);
  assert.match(t, /কিয়ামুল লাইল \$\{n\(b\.total\)\} রাকাত: তাহাজ্জুদ \$\{n\(b\.tahajjud\)\}, বিতর \$\{n\(b\.witr\)\}, অন্যান্য \$\{n\(b\.other\)\}/);
  assert.match(t, /Qiyam al-Layl \$\{b\.total\} rak‘ah\$\{b\.total === 1 \? '' : 's'\}: Tahajjud \$\{b\.tahajjud\}, Witr \$\{b\.witr\}, other \$\{b\.other\}/);
  assert.match(fn('voluntaryTicksHtml'), /qiyamBreakdownText\(record, event\.date\)/);
  assert.match(fn('renderWeeklyDayView'), /data-record-split="\$\{key\}">\$\{escapeHtml\(qiyamBreakdownText\(record, date\)\)\}/);
  const d = fn('voluntaryEventDone');
  assert.match(d, /if \(key === 'qiyam'\) return !!\(record\.voluntary\?\.tahajjud \|\| record\.voluntary\?\.witr\);/);
  assert.match(d, /if \(key === 'tahajjud'\) return !!record\.voluntary\?\.qiyam && qiyamInTahajjud\(day, record\);/);
  assert.equal((fn('dayLayers').match(/voluntaryEventDone\(record, event\.key, day\)/g) || []).length, 3);
  assert.match(app, /const naflCount = events\.filter\(event => voluntaryEventDone\(record, event\.key, date\)\)\.length;/);
  assert.match(fn('recordedRakahTotal'), /for \(const value of Object\.values\(record\.rakahs \|\| \{\}\)\) total \+= Number\(value\) \|\| 0;/, 'each rak‘ah still counts once');
});

/* ---------- 4. version ---------- */
test('4 version 3.0.6 everywhere; label v3.0.6 / v৩.০.৬', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(versionLabel('en'), 'v3.0.6');
  assert.equal(versionLabel('bn'), 'v৩.০.৬');
  const pkg = JSON.parse(readText('../package.json', import.meta.url));
  const lock = JSON.parse(readText('../package-lock.json', import.meta.url));
  assert.equal(pkg.version, '3.0.6');
  assert.equal(lock.version, '3.0.6');
  assert.equal(lock.packages[''].version, '3.0.6');
  assert.equal(JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url)).version, '3.0.6');
  assert.match(readText('../src-tauri/Cargo.toml', import.meta.url), /^version = "3\.0\.6"$/m);
  assert.match(readText('../src-tauri/Cargo.lock', import.meta.url), /name = "prayer-times-desktop"\nversion = "3\.0\.6"/);
  assert.match(readText('../README.md', import.meta.url), /^# Prayer Times — Windows desktop application \(v3\.0\.6\)/);
  assert.match(readText('../CHANGELOG.txt', import.meta.url), /^Prayer Times Desktop v3\.0\.6/);
  assert.match(readText('../LICENSES', import.meta.url), /^Prayer Times v3\.0\.6/);
  assert.match(html, /id="appVersionLabel">v3\.0\.6</);
});
