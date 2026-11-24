/* v3.0.4: one or more checks per line of the approved command (A–J).
   Browser checks for the same lines (EN and BN) run against the unzipped build in scripts/e2e-v304.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import { UI_FONTS, EN_FONTS, REMOVED_UI_FONTS, sanitizeUiFont, sanitizeEnFont, uiFontStack, combinedFontStack } from '../src/ui-fonts.js';
import { migrateHistory } from '../src/history-migrate.js';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const html = readText('../index.html', import.meta.url);
const licences = readText('../LICENSES', import.meta.url);
const fn = name => { const i = app.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return app.slice(i, app.indexOf('\n}\n', i) + 2); };
const rules = () => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(), body: m[2] }));

test('A1/A2 every clock and countdown digit rule uses the app font; no Optima, Palatino, Book Antiqua or Georgia', () => {
  const digit = /#liveClock|countdown|-count\b|count-big|preferred-count|countdown-card-value|#bestCountdown|\.ck-num|\.ck-date|next-count|timeMainCount/;
  const hits = rules().filter(r => digit.test(r.sel) && /font(-family)?\s*:/.test(r.body));
  assert.ok(hits.length >= 8, `found ${hits.length} digit font rules`);
  for (const r of hits) {
    r.body = r.body.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(r.body, /Optima|Palatino|Book Antiqua|Georgia/, r.sel);
    const fam = /font-family\s*:\s*([^;]+)/.exec(r.body)?.[1] || /font\s*:[^;]*?(var\(--[a-z-]+[^;]*)/.exec(r.body)?.[1] || '';
    if (fam) assert.match(fam, /var\(--app-font|inherit|var\(--ui-font/, `${r.sel}: ${fam}`);
  }
  for (const sel of ['body .clock-card #liveClock', 'body.astro-expanded .topbar-clock #liveClock']) {
    const r = rules().find(x => x.sel === sel);
    assert.ok(r, sel);
    assert.match(r.body, /font-family: var\(--app-font\)/);
    assert.match(r.body, /tabular-nums/);
  }
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /Optima|Palatino|Book Antiqua/);
});

test('A3 the app font is the combined EN+BN stack and follows both pickers', () => {
  assert.match(app, /--app-font/);
  const stack = combinedFontStack('lato', 'kalpurush');
  assert.ok(stack.indexOf('Lato') >= 0 && stack.indexOf('Kalpurush') > stack.indexOf('Lato'), stack);
});

test('B1 English has 10 bundled fonts plus System default; the 5 new ones are OFL and on disk', () => {
  assert.equal(EN_FONTS.length, 11);
  assert.equal(EN_FONTS[0].id, 'system');
  for (const [id, family, file, ofl] of [['lato', 'Lato', 'lato-400.woff2', 'OFL-lato.txt'], ['nunito', 'Nunito', 'nunito.woff2', 'OFL-nunito.txt'], ['sourcesans', 'Source Sans 3', 'sourcesans3.woff2', 'OFL-source-sans-3.txt'], ['plex', 'IBM Plex Sans', 'ibmplexsans.woff2', 'OFL-ibm-plex-sans.txt'], ['lora', 'Lora', 'lora.woff2', 'OFL-lora.txt']]) {
    assert.ok(EN_FONTS.some(f => f.id === id), id);
    assert.equal(sanitizeEnFont(id), id);
    assert.ok(fs.existsSync(new URL(`../src/fonts/latin/${file}`, import.meta.url)), file);
    assert.match(readText(`../src/fonts/latin/${ofl}`, import.meta.url), /SIL OPEN FONT LICENSE/i, ofl);
    assert.match(css, new RegExp(`font-family: ?["']${family}["']`), family);
  }
});

test('B2 Bangla is trimmed to exactly 10 plus System default; a removed choice loads as Hind Siliguri', () => {
  assert.deepEqual(UI_FONTS.map(f => f.id), ['system', 'hind', 'notosans', 'notoserif', 'anek', 'tiro', 'kalpurush', 'siyam', 'solaiman', 'bornomala', 'adorsho']);
  for (const id of ['baloo', 'atma', 'mina', 'galada']) {
    assert.ok(REMOVED_UI_FONTS.includes(id));
    assert.equal(sanitizeUiFont(id), 'hind', id);
  }
  assert.equal(sanitizeUiFont('lohit'), 'bornomala');
  assert.equal(sanitizeUiFont('kalpurush'), 'kalpurush');
  const files = fs.readdirSync(new URL('../src/fonts/ui/', import.meta.url));
  assert.ok(!files.some(f => /baloo|atma|mina|galada/i.test(f)), files.join(','));
  assert.doesNotMatch(css, /Baloo Da 2|Galada|"Atma"|'Atma'|"Mina"|'Mina'/);
  assert.doesNotMatch(licences + html, /Baloo|Galada/);
  assert.match(uiFontStack('hind'), /Hind Siliguri/);
});

test('B3 every font is credited in LICENSES and About', () => {
  for (const name of ['Inter', 'Manrope', 'Outfit', 'Plus Jakarta Sans', 'Fraunces', 'Lato', 'Nunito', 'Source Sans 3', 'IBM Plex Sans', 'Lora', 'Hind Siliguri', 'Noto Sans Bengali', 'Noto Serif Bengali', 'Anek Bangla', 'Tiro Bangla', 'Kalpurush', 'Siyam Rupali', 'SolaimanLipi', 'Bornomala', 'AdorshoLipi']) {
    assert.ok(licences.replace(/\s+/g, ' ').includes(name), `LICENSES: ${name}`);
  }
  for (const name of ['Lato', 'Nunito', 'Source Sans 3', 'IBM Plex Sans', 'Lora']) assert.ok(html.includes(name), `About: ${name}`);
});

test('C1–C3 ticks only select into a separate pending store; Mark Complete records', () => {
  assert.match(app, /const PENDING_KEY = 'prayer-times-pending'/);
  for (const f of ['togglePrayer', 'toggleSubPrayer', 'toggleFridayFard', 'toggleVoluntaryTick', 'confirmExtraRakahs']) {
    const body = fn(f);
    assert.match(body, /pendingDay\(/, f);
    assert.match(body, /savePending\(\)/, f);
    assert.doesNotMatch(body, /\bsave\(\)|noteRecognition|playLayerSound/, `${f} records nothing, no reward, only the tick sound`);
    assert.match(body, /playSelectSound\(/, f);
  }
  const mark = fn('markEventComplete');
  assert.match(mark, /pendingDay\(eventDate, false\)/);
  assert.match(mark, /clearPendingEvent\(kind, key, eventDate\)/);
  assert.match(mark, /save\(\);\s*savePending\(\);/);
  assert.match(mark, /playLayerSound\(/);
  assert.match(mark, /noteRecognition\(/);
  // selections never enter history, so progress, ring, history, tray, charts and rewards (all read from state.history) ignore them
  assert.doesNotMatch(fn('selectionView'), /state\.history|save\(\)/);
  assert.match(fn('toggleFridayFard'), /if \(shown && shown !== choice\) return;/);
  assert.match(fn('toggleVoluntaryTick'), /tickAllowed\(current, index\)/);
  // old records load unchanged (no pending field in them)
  const legacy = { '2026-11-01': { fard: { fajr: true }, voluntary: { duha: true }, rakahs: { duha: 4 }, rakahSets: { duha: [true, true] }, otherNafl: 6 } };
  assert.deepEqual(migrateHistory(JSON.parse(JSON.stringify(legacy)))['2026-11-01'].fard, legacy['2026-11-01'].fard);
  assert.equal(migrateHistory(JSON.parse(JSON.stringify(legacy)))['2026-11-01'].otherNafl, 6);
});

test('C4 Other voluntary: +2 is unsaved with the tick sound; its own Mark Complete saves a timed entry', () => {
  assert.match(fn('appendOtherVoluntaryCard'), /id="otherVoluntaryComplete"/);
  const add = fn('recordOtherNafl');
  assert.match(add, /pendingStore\.other\[dateText\] = next/);
  assert.match(add, /playSelectSound\('voluntary'/);
  assert.doesNotMatch(add, /\bsave\(\)|noteRecognition/);
  const done = fn('completeOtherNafl');
  assert.match(done, /entries\.push\(\{ at: Date\.now\(\), rakahs: count \}\)/);
  assert.match(done, /playLayerSound\('voluntary', true, before, after\)/);
  assert.match(fn('renderSituational'), /রাকাত আদায়` : `\$\{count\} rak‘ahs performed`/);
  assert.match(fn('prunePending'), /if \(day < current\) \{ delete pendingStore\.other\[day\]/);
});

test('C5 Other voluntary entries can only be lowered, follow the record window and keep the old total fields', () => {
  const lower = fn('lowerOtherEntry');
  assert.match(lower, /total >= entry\.rakahs\) return false/);
  assert.match(lower, /otherEntryLocked\(entry, date\)/);
  assert.match(fn('otherEntryLockAt'), /lockInstant\(lockItem\('fard', period\.key\)/);
  assert.match(fn('writeOtherEntries'), /record\.otherNafl = total/);
  assert.match(fn('otherEntryHtml'), /More than 12 rak‘ahs\? Enter the total/);
  assert.match(fn('otherEntryHtml'), /Set total/);
  assert.match(fn('otherEntries'), /list\.unshift\(\{ at: null, rakahs: total - sum \}\)/, 'a pre-3.0.4 total shows as one entry');
});

test('D1/D2 one card per Fard prayer with one Undo for the whole prayer; voluntary keep one Undo each', () => {
  const view = fn('renderWeeklyDayView');
  assert.match(view, /weeklyUndoButton\('prayer', prayer\.key, date\)/);
  assert.doesNotMatch(view, /weeklyUndoButton\(part\.layer/);
  assert.match(view, /weeklyUndoButton\('voluntary', key, date\)/);
  assert.doesNotMatch(view, /weeklyUndoButton\('other'/);
  assert.match(fn('undoWeeklyRecord'), /prayerRecordIds\(key, date, record\)/);
});

test('E1–E4 Revise previous prayer appears only after Undo, only for that prayer, until its record window closes', () => {
  assert.match(fn('reopenAfterUndo'), /new Date\(\) >= event\.end && reviseOpen\(event\)/);
  assert.match(fn('reviseEvents'), /!reviseOpen\(event, now\)/);
  assert.match(fn('eventCardElement'), /'আগের নামাজ সংশোধন করুন' : 'Revise previous prayer'/);
  assert.match(fn('markEventComplete'), /noteLate\(record, `\$\{kind\}:\$\{key\}`, event, true\)/);
});

test('F1/F2 no automatic Record previous prayer; Recovery untouched', () => {
  assert.doesNotMatch(app + html, /Record previous prayer|আগের নামাজ রেকর্ড করুন|previousPrayerEvents|lateRecordable|lateEventsBlock/);
  const v303 = new URL('../../3.0.3/src/recovery.js', import.meta.url);
  if (fs.existsSync(v303)) assert.equal(readText('../src/recovery.js', import.meta.url), fs.readFileSync(v303, 'utf8'));
});

test('G one flowing row set: cards grow to fill each row; the Revise heading sits inside its card', () => {
  assert.match(css, /body \.live-events \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /body \.live-events > \.live-event \{ flex: 1 1 min\(100%, 31rem\); width: auto; min-width: 0; max-width: none; \}/);
  assert.match(fn('eventCardElement'), /class="revise-heading"/);
});

test('H version 3.0.6 everywhere; label v3.0.6 / v৩.০.৬', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(versionLabel('en'), 'v3.0.6');
  assert.equal(versionLabel('bn'), 'v৩.০.৬');
  const pkg = JSON.parse(readText('../package.json', import.meta.url));
  const lock = JSON.parse(readText('../package-lock.json', import.meta.url));
  assert.equal(pkg.version, '3.0.6');
  assert.equal(lock.version, '3.0.6');
  assert.equal(lock.packages[''].version, '3.0.6');
  assert.equal(JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url)).version, '3.0.6');
  assert.match(readText('../src-tauri/Cargo.toml', import.meta.url), /version = "3\.0\.6"/);
  assert.match(readText('../src-tauri/Cargo.lock', import.meta.url), /name = "prayer-times-desktop"\nversion = "3\.0\.6"/);
  assert.match(readText('../README.md', import.meta.url), /^# Prayer Times — Windows desktop application \(v3\.0\.6\)/);
  assert.match(readText('../CHANGELOG.txt', import.meta.url), /^Prayer Times Desktop v3\.0\.6/);
  assert.match(readText('../TEST-RESULTS.md', import.meta.url), /### v3\.0\.6/);
  assert.match(licences, /Prayer Times v3\.0\.6/);
  assert.match(html, /id="appVersionLabel">v3\.0\.6</);
});

test('J the theme picker lists every dark theme first, then every light theme; ids unchanged', () => {
  const start = app.indexOf('const THEMES = [');
  const THEMES = Function(`return ${app.slice(start + 'const THEMES = '.length, app.indexOf('];', start) + 1)}`)();
  const order = Function('THEMES', `${fn('themePickerOrder')}; return themePickerOrder(THEMES);`)(THEMES);
  const modes = order.map(t => t[1]);
  const firstLight = modes.indexOf('light');
  assert.ok(firstLight > 0 && modes.slice(0, firstLight).every(m => m === 'dark') && modes.slice(firstLight).every(m => m === 'light'), modes.join());
  assert.deepEqual(order.filter(t => t[1] === 'dark').map(t => t[0]), THEMES.filter(t => t[1] === 'dark').map(t => t[0]));
  assert.deepEqual(order.filter(t => t[1] === 'light').map(t => t[0]), THEMES.filter(t => t[1] === 'light').map(t => t[0]));
  assert.equal(order.length, THEMES.length);
  assert.equal(THEMES[0][0], 'Obsidian', 'the default (first) theme is unchanged');
  assert.match(app, /\$\('themeSelect'\)\.innerHTML = themePickerOrder\(\)\.map/);
});

test('K after Mark Complete the countdown page hides the middle card; Undo brings it back', () => {
  const body = fn('renderCountdownDetails');
  assert.match(body, /const recorded = !!record\.closed\?\.\[`\$\{countdownState\.kind\}:\$\{key\}`\]/);
  assert.match(body, /prayerCard\.hidden = recorded/);
  assert.match(css, /#countdownView #eventPrayerCard\[hidden\] \{ display: none !important; \}/);
  assert.match(html, /id="eventPrayerCard"/);
});

test('L astrolabe and clock open with the glide from every page; zero-size start still animates; reduced motion respected', () => {
  const astro = fn('openAstroView');
  assert.doesNotMatch(astro, /currentPage !== 'home' && currentPage !== 'time'\) return/);
  assert.match(astro, /leaveOtherPageForInstruments\(\)/);
  assert.match(fn('openTimeView'), /leaveOtherPageForInstruments\(\)/);
  const flip = fn('flipMove');
  assert.match(flip, /prefersReducedMotion\(\)/);
  assert.doesNotMatch(flip, /if \(!from\.width \|\| !to\.width\) return;/);
  assert.match(flip, /if \(!from\.width \|\| !from\.height\)/);
});
