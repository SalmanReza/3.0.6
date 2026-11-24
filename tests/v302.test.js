/* v3.0.2: one or more checks per line of the approved command (A1–A3, B1–B8, C1–C4, D1–D16, E).
   Browser checks for the same lines are in scripts/e2e-v302.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import { UI_FONTS, sanitizeUiFont } from '../src/ui-fonts.js';
import { tickPlan, tickLabels, qiyamBreakdown, toggleTick, normalizeTicks, rakahsFromTicks } from '../src/voluntary-ticks.js';
import { migrateRecord, migrateHistory } from '../src/history-migrate.js';
import { mergeHistory } from '../src/backup.js';
import { loadQuran } from '../src/quran/load.js';
import { TAGGED_VERSES } from '../src/quran/tags.js';
import {
  loadReading, chooseReading, presentPassage, juzForDay, dayRange, passageVerses, progressLine, monthLine,
  momentTheme, markRead, readBitsFor, hasTheme, hasTagged, READING_KEY, LONG_TR_CHARS, ADVANCE_MS, BLESSED_TITLE, FULL_SECTION, TODAYS_PORTION
} from '../src/blessed-reminder.js';
import { buildPassages, loadMetadata } from '../scripts/build-passages.mjs';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const licences = readText('../LICENSES', import.meta.url);
const quranLicences = readText('../src/quran/LICENSES.txt', import.meta.url);
const memoryStorage = () => { const m = {}; return { m, getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };
const fn = name => { const i = app.indexOf(`function ${name}(`); return app.slice(i, app.indexOf('\n}\n', i) + 2); };

/* ---------------- A ---------------- */
test('A1 every countdown uses var(--app-font) with tabular-nums; the listed monospace items stay', () => {
  for (const sel of ['.next-count {', '.countdown-large {', 'body .clock-preferred-count {', 'body .clock-count-big {', 'body .countdown-card .countdown-card-value {']) {
    const rule = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
    assert.match(rule, /var\(--app-font\)/, sel);
    assert.doesNotMatch(rule, /monospace/, sel);
    assert.match(rule, /tabular-nums/, sel);
  }
  const best = css.slice(css.indexOf('body #bestCountdown {'), css.indexOf('}', css.indexOf('body #bestCountdown {')));
  assert.match(best, /var\(--app-font\)/);
  assert.match(css, /body \.clock-count-big,\s*body \.clock-preferred-count,\s*body #bestCountdown \{\s*font-family: var\(--app-font\);/);
  assert.doesNotMatch(css, /countdown[^{]*\{[^}]*(ui-monospace|Consolas)/);
  for (const keep of [/\.progress-core-label \{[^}]*monospace/, /\.prayer-index \{[^}]*monospace/, /\.saved-location span[^{]*\{[^}]*monospace/, /\.keyboard-help dt \{[^}]*monospace/, /\.coord-card \.cp-coords \{[^}]*monospace/]) {
    assert.match(css, keep, 'unchanged monospace item');
  }
  // [changed in v3.0.5 1] follows the one Font picker
  assert.match(app, /setProperty\('--app-font', stack\)/, 'follows the Font picker');
});

test('A2 Bornomala is bundled under OFL 1.0 in place of Lohit; Li Ador Noirrit is not; AdorshoLipi stays', () => {
  assert.ok(UI_FONTS.some(f => f.id === 'bornomala' && f.family === 'Bornomala'));
  assert.ok(!UI_FONTS.some(f => /Lohit/.test(f.family || '')));
  assert.ok(UI_FONTS.some(f => f.id === 'solaiman') && UI_FONTS.some(f => f.id === 'adorsho'));
  assert.equal(sanitizeUiFont('lohit'), 'bornomala', 'a saved Lohit choice still loads');
  assert.ok(fs.statSync(new URL('../src/fonts/bn-new/bornomala.woff2', import.meta.url)).size > 50000);
  assert.ok(!fs.existsSync(new URL('../src/fonts/bn-new/lohit-bengali.woff2', import.meta.url)));
  const ofl = readText('../src/fonts/bn-new/OFL-Bornomala.txt', import.meta.url);
  assert.match(ofl, /SIL OPEN FONT LICENSE Version 1\.0/);
  assert.match(ofl, /Codepotro/);
  assert.match(css, /font-family: "Bornomala"; src: url\("\.\/fonts\/bn-new\/bornomala\.woff2"\)/);
  assert.match(licences, /Bornomala — SIL Open Font License 1\.0/);
  assert.match(licences, /lipighor\.com\/EULA/);
  assert.match(html, /Kalpurush, SolaimanLipi and Bornomala are OFL; Siyam Rupali and AdorshoLipi are GNU GPL\. Li Ador Noirrit is not bundled/);
  assert.match(app, /কালপুরুষ, সোলায়মানলিপি ও বর্ণমালা OFL/);
});

test('A3 unused Revise event record strings and code are gone; old revise data still loads', () => {
  for (const s of ['Revise event record', 'RECORD REVIEW', 'Confirm the open revision', 'Prayer record confirmed', 'Record moved to Revise', 'Review or confirm before the record window closes', 'bindRakahControls', 'day-detail revision']) {
    assert.ok(!app.includes(s), s);
  }
  assert.doesNotMatch(css, /\.revise-(section|records|card|ticks|tick|rakah)\b/);
  const old = migrateRecord({ fard: { fajr: true }, voluntary: {}, revise: { 'fard:fajr': { id: 'fard:fajr', kind: 'fard', key: 'fajr', parts: {} } } });
  assert.ok(old.revise['fard:fajr']);
});

/* ---------------- B ---------------- */
test('B1 no Record completion on Fard or voluntary description cards', () => {
  const fard = fn('renderFard');
  const vol = fn('renderVoluntary');
  for (const part of [fard, vol]) {
    assert.doesNotMatch(part, /Record completion|রেকর্ড করুন|record-button|data-day-fard|data-voluntary-record/);
  }
  assert.ok(!app.includes("'Record completion'"));
});

test('B2 Mark Complete stays on the home event card and on the countdown page', () => {
  const card = fn('eventCardElement');
  // v3.0.3 line 1: the footer (Mark Complete) is now also on Record previous prayer cards
  assert.match(card, /<footer class="live-event-footer">\s*<button class="square-button is-complete mark-event-complete"/);
  assert.match(app, /data-mark-complete="\$\{countdownState\.kind\}"/);
  assert.match(fn('markEventComplete'), /now < event\.start \|\| now >= event\.end/);
});

test('B3 while the time is open the same circles render on the live card', () => {
  const card = fn('eventCardElement');
  assert.match(card, /isVol \? voluntaryTicksHtml\(event\) : partsHtml\(event\.key, event\.date, true, \{ includeFard: true \}\)/);
  assert.match(fn('renderLiveEvents'), /getActiveEvents\(new Date\(\)\)\.filter\(event => !eventClosed\(event\)\)/);
});

// [changed in v3.0.4 E/F] "Record previous prayer" is removed: a prayer whose time ends unrecorded gets no card on its own.
// B4–B7 now check the replacement, "Revise previous prayer" (shown only after Undo), with the same rules and late mark.
test('B4 Revise previous prayer: heading, rules and the quiet late mark', () => {
  assert.doesNotMatch(html, /id="lateEventsBlock"|Record previous prayer/);
  assert.match(fn('eventCardElement'), /'আগের নামাজ সংশোধন করুন' : 'Revise previous prayer'/);
  const prev = fn('reviseEvents');
  assert.match(prev, /pendingStore\.reopened/);
  assert.match(prev, /eventClosed\(event\)/);
  assert.match(prev, /dayIsLocked/);
  const rec = fn('reviseOpen');
  assert.match(rec, /recordingOpen\(event\.start, event\.end, fardLock\?\.at, now\)/);
  assert.match(fn('lateNoteHtml'), /'সময়ের পরে রেকর্ড' : 'recorded after its time'/);
  assert.match(fn('markEventComplete'), /noteLate\(/);
  assert.doesNotMatch(fn('reviseEvents') + fn('lateNoteHtml'), /missed|qada|guilt|ক্বাযা|কাযা/i, 'no guilt wording');
});

test('B5 Undo in the daily record removes the whole prayer and clears its closed flag, sets and late marks', () => {
  const undo = fn('undoWeeklyRecord');
  assert.match(undo, /delete record\.closed\[`fard:\$\{key\}`\]/);
  assert.match(undo, /delete record\.rakahSets\[key\]/);
  assert.match(undo, /delete record\.late\[`\$\{layer\}:\$\{key\}`\]/);
  assert.match(undo, /applyFridayFard\(record, null\)/);
  assert.match(undo, /reopenAfterUndo\(/);
});

test('B6 the revise card ends at the existing record-window lock', () => {
  assert.match(fn('reviseOpen'), /lockInstant\(lockItem\('fard', event\.key\)/);
  assert.match(fn('voluntaryCanEdit'), /recordingOpen\(event\.start, event\.end, lock\?\.at, new Date\(\)\)/);
});

test('B7 Friday exclusivity, ordered ticks, sound and rewards use the same handlers under Revise previous prayer', () => {
  const card = fn('eventCardElement');
  assert.ok(card.includes('partsHtml(event.key, event.date, true') && card.includes('voluntaryTicksHtml(event)'));
  assert.match(fn('renderLiveEvents'), /bindEventCards\(box\)/);
  assert.match(fn('toggleFridayFard'), /if \(shown && shown !== choice\) return;/);
  assert.match(fn('toggleVoluntaryTick'), /tickAllowed\(current, index\)/);
  assert.match(fn('markEventComplete'), /playLayerSound\(layerOf\(kind, key\), true, before, after\);\s*noteRecognition\(before, after/);
});

test('B8 old records load unchanged; late marks survive backup merge', () => {
  const legacy = { '2026-11-01': { fard: { fajr: true, dhuhr: true }, voluntary: { witr: true }, rakahs: { witr: 3 }, rakahSets: { witr: [true, true] }, at: { 'fard:fajr': [1, 300] }, closed: { 'fard:fajr': true } } };
  const migrated = migrateHistory(JSON.parse(JSON.stringify(legacy)));
  assert.deepEqual(migrated['2026-11-01'].fard, legacy['2026-11-01'].fard);
  assert.deepEqual(migrated['2026-11-01'].closed, legacy['2026-11-01'].closed);
  assert.equal(migrated['2026-11-01'].late, undefined);
  const merged = mergeHistory({ '2026-11-02': { fard: { asr: true }, voluntary: {} } }, { '2026-11-02': { fard: { asr: true }, voluntary: {}, late: { 'fard:asr': true } } });
  assert.deepEqual(merged.history['2026-11-02'].late, { 'fard:asr': true });
  const plain = mergeHistory({ '2026-11-03': { fard: {}, voluntary: {} } }, { '2026-11-03': { fard: {}, voluntary: {} } });
  assert.equal(plain.history['2026-11-03'].late, undefined);
});

/* ---------------- C ---------------- */
test('C1/C2 Qiyam umbrella breakdown: Tahajjud and Witr count toward Qiyam; its own circles are "other"', () => {
  assert.deepEqual(qiyamBreakdown({ qiyam: 2, tahajjud: 4, witr: 3 }), { total: 9, tahajjud: 4, witr: 3, other: 2 });
  assert.deepEqual(qiyamBreakdown({ tahajjud: 4 }), { total: 4, tahajjud: 4, witr: 0, other: 0 });
  assert.match(fn('qiyamBreakdownText'), /Qiyam al-Layl \$\{b\.total\} rak‘ah\$\{b\.total === 1 \? '' : 's'\}: Tahajjud \$\{b\.tahajjud\}, Witr \$\{b\.witr\}, other \$\{b\.other\}/);
  assert.match(fn('qiyamBreakdownText'), /কিয়ামুল লাইল \$\{n\(b\.total\)\} রাকাত: তাহাজ্জুদ \$\{n\(b\.tahajjud\)\}, বিতর \$\{n\(b\.witr\)\}, অন্যান্য \$\{n\(b\.other\)\}/);
});

test('C3 each rak‘ah counts once: totals sum the separate stored counts', () => {
  const record = { rakahs: { qiyam: 2, tahajjud: 4, witr: 3 } };
  const sum = Object.values(record.rakahs).reduce((a, b) => a + b, 0);
  assert.equal(sum, 9);
  assert.equal(sum, qiyamBreakdown(record.rakahs).total, 'the Qiyam umbrella equals the plain voluntary total (no double count)');
  assert.match(fn('voluntaryRakahTotal'), /for \(const value of Object\.values\(record\.rakahs \|\| \{\}\)\) total \+= Number\(value\) \|\| 0;/);
  assert.match(fn('recordedRakahTotal'), /Object\.values\(record\.rakahs \|\| \{\}\)/);
});

test('C4 circle labels are running totals; ticking order and saved counts are unchanged', () => {
  assert.deepEqual(tickLabels('witr'), [1, 3, 5, 7, 9, 11]);
  for (const key of ['qiyam', 'tahajjud', 'duha', 'tarawih']) assert.deepEqual(tickLabels(key), [2, 4, 6, 8, 10, 12], key);
  assert.deepEqual(tickLabels('awwabin'), [2, 4, 6]);
  assert.deepEqual(tickLabels('eid_prayer'), [2]);
  assert.deepEqual(tickPlan('qiyam'), [2, 2, 2, 2, 2, 2]);
  const t = toggleTick('qiyam', normalizeTicks('qiyam', []), 0, 0);
  const t2 = toggleTick('qiyam', t.ticks, 1, t.total);
  assert.equal(t2.total, 4);
  assert.equal(rakahsFromTicks('witr', [true, true, false, false, false, false]), 3);
  assert.match(fn('voluntaryTicksHtml'), /<span>\$\{bn \? localizeDigits\(upTo\) : upTo\}<\/span>/);
});

/* ---------------- D ---------------- */
test('D1 no Arabic in the bundled data or the UI', async () => {
  const data = await loadQuran();
  assert.equal(data.ar, undefined);
  assert.equal(data.sources.ar, undefined);
  assert.ok(data.surahs.every(s => s.ar === undefined));
  assert.ok(fs.statSync(new URL('../src/quran/data.json', import.meta.url)).size < 3.1e6);
  assert.doesNotMatch(app, /blessed-ar/);
  assert.doesNotMatch(css, /blessed-ar/);
  assert.doesNotMatch(readText('../src/blessed-reminder.js', import.meta.url), /\.ar\b/);
  assert.doesNotMatch(readText('../src/quran/load.js', import.meta.url), /data\.ar/);
});

test('D2 passages come from the 556 Tanzil ruku and are credited CC BY 3.0', async () => {
  const { passages: P } = await loadReading();
  assert.equal(P.sections.length, 556);
  assert.match(licences, /Tanzil Quran Metadata[\s\S]*CC BY 3\.0/);
  assert.match(quranLicences, /Creative Commons Attribution 3\.0/);
  assert.match(html, /556 ruku’ sections and the juz’ boundaries of the Tanzil Quran Metadata \(CC BY 3\.0, tanzil\.net\)/);
});

test('D3/D4 passages (v3.0.3: 2,739), contiguous, complete, sections and juz never crossed; app computes nothing', async () => {
  const { passages: P } = await loadReading();
  assert.equal(P.starts.length, 2739); // v3.0.3 rebalance
  assert.equal(P.starts[0], 0);
  for (let i = 1; i < P.starts.length; i++) assert.ok(P.starts[i] > P.starts[i - 1]);
  const starts = new Set(P.starts);
  for (const s of P.sections) assert.ok(starts.has(s), `section ${s} starts a passage`);
  for (const j of P.juz) assert.ok(starts.has(j), `juz ${j} starts a passage`);
  const rebuilt = buildPassages(JSON.parse(fs.readFileSync(new URL('../src/quran/data.json', import.meta.url))), loadMetadata());
  assert.deepEqual(rebuilt.starts, P.starts, 'the compact file is exactly what the build script produces');
  assert.match(fn('presentPassage') || readText('../src/blessed-reminder.js', import.meta.url), /sectionVerses/);
  assert.equal(FULL_SECTION.en, 'Full section');
  assert.equal(FULL_SECTION.bn, 'পুরো অংশ');
});

test('D5 long passages show whole verses; a long single verse is never cut', async () => {
  const R = await loadReading();
  const P = R.passages;
  let checkedSingle = 0, checkedMulti = 0;
  for (let i = 0; i < P.starts.length; i++) {
    const v = presentPassage(R, i, 'en');
    const all = presentPassage(R, i, 'en', { expanded: true });
    // v3.0.3 line 5: a verse over 350 characters shows a preview until Read more; the data is never cut
    for (let k = 0; k < v.verses.length; k++) {
      if (v.verses[k].preview) assert.ok(all.verses[k].text.startsWith(v.verses[k].text.slice(0, -1).trimEnd()));
      else assert.equal(v.verses[k].text, all.verses[k].text);
    }
    if (all.verses.length === 1 && all.verses[0].long) { checkedSingle++; assert.equal(v.previewed, true); assert.equal(all.truncated, false); }
    if (v.truncated && !v.previewed) { checkedMulti++; assert.ok(v.verses.length < all.verses.length); }
  }
  assert.ok(checkedSingle > 0 && checkedMulti > 0);
  assert.ok(LONG_TR_CHARS > 0);
});

test('D7 every section has an EN and BN subject shown above the passage', async () => {
  const R = await loadReading();
  assert.equal(R.sections.en.length, 556);
  assert.equal(R.sections.bn.length, 556);
  assert.ok(R.sections.en.every(s => s && s.length > 3));
  assert.ok(R.sections.bn.every(s => /[\u0980-\u09FF]/.test(s)));
  const v = presentPassage(R, 0, 'bn');
  assert.equal(v.subject, R.sections.bn[0]);
  assert.match(fn('passageHtml'), /<p class="blessed-subject">\$\{escapeHtml\(view\.subject\)\}<\/p><p class="blessed-tr"/);
});

test('D8 every section has themes from the 11; tagged verses are first picks', async () => {
  const R = await loadReading();
  const P = R.passages;
  assert.deepEqual(P.themes, ['gratitude', 'friday', 'dawn', 'night', 'prayer', 'mercy', 'patience', 'hereafter', 'creation', 'prophets', 'law']);
  assert.equal(R.sections.themes.length, 556);
  for (const t of P.themes) assert.ok(R.sections.themes.some(m => m & (1 << P.themes.indexOf(t))), t);
  // a tagged verse's passage carries its tag
  const data = R.quran;
  let n = 0;
  for (const t of TAGGED_VERSES) {
    const verse = data.surahs[t.s - 1].start + t.a - 1;
    let lo = 0; while (lo + 1 < P.starts.length && P.starts[lo + 1] <= verse) lo++;
    for (const tag of t.tags) if (P.themes.includes(tag)) { assert.ok(hasTagged(P, lo, tag) && hasTheme(P, lo, tag)); n++; }
  }
  assert.ok(n > 300);
  assert.equal(TAGGED_VERSES.length, 405);
});

test('D9 one juz per Hijri day; 29-day month reads 29+30 on day 29; all 6,236 verses exactly once', async () => {
  const { passages: P } = await loadReading();
  assert.deepEqual(juzForDay(1, 30), [1]);
  assert.deepEqual(juzForDay(29, 29), [29, 30]);
  assert.deepEqual(juzForDay(29, 30), [29]);
  assert.deepEqual(juzForDay(30, 30), [30]);
  for (const len of [29, 30]) {
    const seen = new Array(P.count).fill(0);
    for (let d = 1; d <= len; d++) {
      const r = dayRange(P, juzForDay(d, len));
      for (let i = r.from; i < r.to; i++) { const v = passageVerses(P, i); for (let x = v.from; x < v.to; x++) seen[x]++; }
    }
    assert.ok(seen.every(c => c === 1), `${len}-day month`);
  }
  // [changed in v3.0.6 D/G] the app reads the lunar-year plan for the reading day (midnight at the location)
  assert.match(fn('chooseBlessedForNow'), /readingContext\(now\)/);
  assert.match(fn('readingContext'), /readingCivilDate\(now\)/);
  assert.match(fn('readingContext'), /hijriYearDays\(hijri\.year\)/);
});

test('D10/D12 reads in order, advances every 10 minutes and on signature change, never repeats in a day', async () => {
  const { passages: P } = await loadReading();
  const s = memoryStorage();
  const hijri = { year: 1448, month: 6, day: 7 };
  const r = dayRange(P, [7]);
  let c = chooseReading({ P, hijri, signature: 'a', now: 0, storage: s });
  assert.equal(c.index, r.from);
  c = chooseReading({ P, hijri, signature: 'a', now: ADVANCE_MS - 1, storage: s });
  assert.equal(c.index, r.from, 'held before 10 minutes');
  c = chooseReading({ P, hijri, signature: 'a', now: ADVANCE_MS, storage: s });
  assert.equal(c.index, r.from + 1, 'moves after 10 minutes');
  c = chooseReading({ P, hijri, signature: 'b', now: ADVANCE_MS + 1, storage: s });
  assert.equal(c.index, r.from + 2, 'moves on a signature change');
  const seen = new Set([r.from, r.from + 1, r.from + 2]);
  for (let k = 3; k < r.to - r.from; k++) { c = chooseReading({ P, hijri, signature: `s${k}`, now: ADVANCE_MS + k, storage: s }); assert.ok(!seen.has(c.index)); seen.add(c.index); }
  assert.equal(c.read, c.total);
  const stored = JSON.parse(s.m[READING_KEY]);
  assert.equal(stored.day, '1448-06-07');
  assert.ok(stored.bits.length <= Math.ceil(Math.ceil((r.to - r.from) / 8) * 4 / 3) + 4, 'compact bitset');
});

test('D11 moments pick an unread passage of the day with the theme, tagged first; otherwise in order', async () => {
  const { passages: P } = await loadReading();
  assert.equal(momentTheme({ justTicked: true }), 'gratitude');
  assert.equal(momentTheme({ allFardJustDone: true }), 'gratitude');
  assert.equal(momentTheme({ jumuahWindow: true }), 'friday');
  assert.equal(momentTheme({ fajrFirst30: true }), 'dawn');
  assert.equal(momentTheme({}), null);
  const s = memoryStorage();
  const hijri = { year: 1448, month: 6, day: 28 }; // juz 28 has Surat al-Jumu'ah (62:9-11)
  chooseReading({ P, hijri, signature: 'a', now: 0, storage: s });
  const c = chooseReading({ P, hijri, signature: 'a', moment: 'friday', now: 1, storage: s });
  assert.equal(c.mode, 'moment');
  assert.ok(hasTagged(P, c.index, 'friday'), 'a tagged friday verse is picked first');
  const r = dayRange(P, [28]);
  assert.ok(c.index >= r.from && c.index < r.to);
  // when nothing of the theme is unread, continue in order
  const s2 = memoryStorage();
  const h1 = { year: 1448, month: 6, day: 1 };
  const r1 = dayRange(P, [1]);
  for (let k = 0; k < r1.to - r1.from; k++) if (hasTheme(P, r1.from + k, 'friday')) markRead({ P, hijri: h1, index: r1.from + k, storage: s2 });
  chooseReading({ P, hijri: h1, signature: 'x', now: 0, storage: s2 });
  const back = chooseReading({ P, hijri: h1, signature: 'x', moment: 'friday', now: 5, storage: s2 });
  assert.equal(back.mode, 'order');
  assert.match(fn('blessedMoment'), /now\.getDay\(\) === 5 && !!times && now >= times\.dhuhr && now < times\.asr/);
  assert.match(fn('blessedMoment'), /times\.fajr\.getTime\(\) \+ 30 \* 60000/);
});

test('D13 Today\'s portion lists the day, marks unread, and opening marks read', async () => {
  const { passages: P } = await loadReading();
  assert.equal(TODAYS_PORTION.en, "Today's portion");
  assert.equal(TODAYS_PORTION.bn, 'আজকের অংশ');
  assert.match(html, /<dialog id="portionDialog"/);
  const s = memoryStorage();
  const hijri = { year: 1448, month: 6, day: 2 };
  chooseReading({ P, hijri, signature: 'a', now: 0, storage: s });
  const r = dayRange(P, [2]);
  assert.equal(readBitsFor({ P, hijri, storage: s }).read, 1);
  assert.ok(markRead({ P, hijri, index: r.from + 5, storage: s }));
  assert.equal(readBitsFor({ P, hijri, storage: s }).read, 2);
  // [changed in v3.0.6 A/B] opening a passage only shows it; its own Mark as read / Undo read button marks it
  assert.match(fn('renderTodaysPortion'), /setPassageRead\(/);
  assert.doesNotMatch(fn('renderTodaysPortion'), /markRead\(/);
  assert.match(fn('renderTodaysPortion'), /portion-unread/);
});

test('D14 progress line and month line (EN/BN, Bangla digits); switch on by default and persisted', () => {
  assert.equal(progressLine({ juz: [7], read: 41, total: 92 }, 'en'), "Juz' 7 · 41 of 92 passages read today");
  assert.equal(progressLine({ juz: [7], read: 41, total: 92 }, 'bn'), 'পারা ৭ · আজ ৯২টি অংশের ৪১টি পড়া হয়েছে');
  assert.equal(progressLine({ juz: [29, 30], read: 1, total: 355 }, 'en'), "Juz' 29–30 · 1 of 355 passages read today");
  assert.equal(monthLine(7, 'en'), 'This month: 7 of 30 parts');
  assert.equal(monthLine(7, 'bn'), 'এই মাসে: ৩০ পারার ৭টি');
  assert.match(app, /blessedProgress: true,/);
  assert.match(app, /blessedProgress: saved\.blessedProgress !== false,/);
  assert.match(html, /id="blessedProgressToggle" checked/);
});

test('D15 a new Hijri month restarts at juz 1 and its parts count; the day follows the date', async () => {
  const { passages: P } = await loadReading();
  const s = memoryStorage();
  for (let i = dayRange(P, [30]).from; i < dayRange(P, [30]).to; i++) {
    chooseReading({ P, hijri: { year: 1448, month: 6, day: 30 }, signature: `x${i}`, now: i, storage: s });
  }
  assert.equal(readBitsFor({ P, hijri: { year: 1448, month: 6, day: 30 }, storage: s }).monthParts, 1);
  const first = chooseReading({ P, hijri: { year: 1448, month: 7, day: 1 }, signature: 'n', now: 10, storage: s });
  assert.equal(first.index, 0);
  assert.equal(first.monthParts, 0);
});

test('D16 credits, evidence files and the name are unchanged', () => {
  assert.equal(BLESSED_TITLE.en, 'A Blessed Reminder');
  assert.equal(BLESSED_TITLE.bn, 'একটি বরকতময় স্মরণ');
  assert.match(quranLicences, /Saheeh International/);
  assert.match(quranLicences, /Muhiuddin Khan/);
  for (const f of ['prayer-evidence.js', 'prayer-card-notes.js']) {
    const now = fs.readFileSync(new URL(`../src/${f}`, import.meta.url));
    const base = new URL(`../../3.0.1/src/${f}`, import.meta.url);
    if (fs.existsSync(base)) assert.ok(now.equals(fs.readFileSync(base)), f);
  }
});

/* ---------------- E ---------------- */
test('E everything is 3.0.6; the label reads v3.0.6 / v৩.০.৬', () => {
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
  assert.match(readText('../README.md', import.meta.url), /\(v3\.0\.6\)/);
  assert.match(readText('../CHANGELOG.txt', import.meta.url), /^Prayer Times Desktop v3\.0\.6/);
  assert.match(readText('../TEST-RESULTS.md', import.meta.url), /v3\.0\.6/);
  assert.match(html, /id="appVersionLabel">v3\.0\.6</);
});
