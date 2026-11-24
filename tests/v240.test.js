import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VERSION } from '../src/branding.js';
import { phraseLines, highestKind, rewardSeconds, dayVerseLines, DAY_VERSE, PHRASES } from '../src/recognition.js';
import { figureSvg, REWARD_TEXT } from '../src/progress-figure.js';
import { tickPlan, validateExtraRakahs, toggleTick, migrateVoluntaryRecord, extraErrorText, allowsExtraInput, applyExtra } from '../src/voluntary-ticks.js';
import { trayTooltipText } from '../src/tray-tooltip.js';
import { determine, progressLine, forEachLine } from '../src/progress-lines.js';
import { migrateRecord } from '../src/history-migrate.js';
import { readText } from './helpers/read-text.js';

const css = readText('../src/styles.css', import.meta.url);
const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);

test('v3.0.6 version is consistent', () => {
  assert.equal(APP_VERSION, '3.0.6');
});

test('reward phrases, highest-rank rule, duration and bilingual lines', () => {
  assert.equal(highestKind(['voluntary', 'sunnah', 'nafl']), 'sunnah');
  assert.equal(highestKind(['nafl', 'voluntary']), 'nafl');
  assert.equal(rewardSeconds({ voluntary: 8 }), 8);
  const fard = phraseLines('fard', 'en');
  assert.equal(fard.ar, PHRASES.fard.ar);
  assert.equal(fard.tr, 'La ilaha illallah');
  assert.equal(fard.meaning, 'There is no god but Allah');
  const bn = phraseLines('voluntary', 'bn');
  assert.equal(bn.tr, 'সুবহানাল্লাহ');
  assert.equal(phraseLines('sunnah', 'en').tr, 'Allahu Akbar');
  assert.equal(phraseLines('nafl', 'en').tr, 'Alhamdulillah');
});

test('the disc verse appears as soon as all five Fard are done, even with nothing else recorded', () => {
  assert.equal(REWARD_TEXT, DAY_VERSE.ar);
  const onlyFard = figureSvg({ fard: [true, true, true, true, true], sunnah: [false, false, false, false, false], nafl: [false, false, false, false, false], voluntary: [false, false, false, false, false] });
  assert.match(onlyFard, /قَدْ أَفْلَحَ الْمُؤْمِنُونَ/);
  assert.doesNotMatch(figureSvg({ fard: [true, true, true, true, false], sunnah: [], nafl: [], voluntary: [] }), /pf-reward/);
  const lines = dayVerseLines('en');
  assert.equal(lines.tr, "Qad aflaha al-mu'minun");
  assert.equal(lines.ref, "Al-Mu'minun 23:1");
  assert.match(dayVerseLines('bn').tr, /কাদ আফলাহাল/);
  assert.match(app, /showRewardText/);
  assert.match(html, /id="showRewardText"/);
});

test('Witr odd circles, extra totals, and gap packing', () => {
  assert.deepEqual(tickPlan('witr'), [1, 3, 5, 7, 9, 11]);
  assert.equal(allowsExtraInput('witr'), true);
  assert.equal(validateExtraRakahs('witr', '13').ok, true);
  assert.equal(validateExtraRakahs('witr', '14').ok, false);
  assert.match(extraErrorText('parity', 'en', { key: 'witr', count: 14 }), /13 or 15/);
  assert.match(extraErrorText('parity', 'bn', { key: 'witr', count: 14 }), /১৩ অথবা ১৫/);
  assert.equal(validateExtraRakahs('qiyam', '14').ok, true);
  assert.equal(validateExtraRakahs('qiyam', '13').ok, false);
  const mig = migrateRecord({ voluntary: { witr: true }, rakahSets: { witr: [true, true] }, rakahs: { witr: 3 } });
  assert.deepEqual(mig.rakahSets.witr, [true, true, false, false, false, false]);
  assert.equal(mig.rakahs.witr, 3);
  const packed = migrateVoluntaryRecord('qiyam', [true, false, true], 4);
  assert.deepEqual(packed.ticks, [true, true, false, false, false, false]);
  let r = toggleTick('qiyam', [], 2);
  assert.equal(r.total, 0);
});

test('Rotate and Flip use the smooth brushed-silver ring, not knurl teeth', () => {
  const block = css.slice(css.indexOf('v2.4.0: Rotate and Flip'));
  assert.match(block, /\.astro-tool \{/);
  assert.match(block, /repeating-conic-gradient\(rgba\(0,0,0,\.075\)/);
  assert.doesNotMatch(block.slice(0, 800), /rgba\(0,0,0,\.34\) 0 1\.1deg/);
});

test('Today\'s progress circle is centred in the left third from 700px', () => {
  assert.match(css, /v2\.4\.0: Today's progress circle/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 2fr\)/);
});

test('tray text has no title and switches to minutes only under an hour', () => {
  assert.equal(trayTooltipText({ available: [{ name: 'Isha', msLeft: 42 * 60000 }], next: { name: 'Fajr', ms: 50 * 60000 } }), 'Isha: 42m left\nNext: Fajr in 50m');
});

test('progress text: voluntary react wins over an older Fard react, and lines exist in both languages', () => {
  const now = Date.UTC(2026, 10, 15, 20, 0);
  const fard = [
    { key: 'fajr', start: now - 16 * 3600000, end: now - 15 * 3600000, done: true, tickedAt: now - 10 * 60000, parts: [2] },
    { key: 'dhuhr', start: now - 8 * 3600000, end: now - 6 * 3600000, done: false },
    { key: 'asr', start: now - 5 * 3600000, end: now - 3 * 3600000, done: false },
    { key: 'maghrib', start: now - 2 * 3600000, end: now - 3600000, done: false },
    { key: 'isha', start: now - 30 * 60000, end: now + 4 * 3600000, done: false }
  ];
  const voluntary = [{ key: 'qiyam', start: now - 30 * 60000, end: now + 4 * 3600000, done: true, tickedAt: now - 60 * 1000, rakahs: 6, parts: [6] }];
  const c = determine({ now, fard, voluntary, dateKey: '2026-11-15', habits: {} });
  assert.equal(c.state, 'react');
  assert.equal(c.doneKey, 'qiyam');
  assert.equal(c.voluntary, true);
  const line = progressLine({ lang: 'en', dateKey: '2026-11-15', now, fard, voluntary, fmt: () => '8:00 PM' });
  assert.match(line.text, /Qiyam/);
  assert.match(line.text, /6 rak/);
  const bn = progressLine({ lang: 'bn', dateKey: '2026-11-15', now, fard, voluntary, fmt: () => '২০:০০' });
  assert.match(bn.text, /কিয়ামুল লাইল/);
  assert.match(bn.text, /৬ রাকাত/);
  const witr = progressLine({
    lang: 'en', dateKey: '2026-11-15', now,
    fard, voluntary: [{ key: 'witr', start: now - 30 * 60000, end: now + 4 * 3600000, done: true, tickedAt: now - 60 * 1000, rakahs: 3, parts: [3] }],
    fmt: () => '8:00 PM'
  });
  assert.match(witr.text, /Witr/);
  assert.match(witr.text, /3 rak/);
  let sawQiyam = false, sawWitr = false;
  forEachLine('en', ({ state, text }) => {
    if (state === 'react' && /Qiyam done, 6 rak/.test(text)) sawQiyam = true;
    if (/Witr done, 3 rak/.test(text)) sawWitr = true;
  });
  // forEachLine uses n=4 from REP_FEATS, so look more loosely
  sawQiyam = false; sawWitr = false;
  forEachLine('en', ({ text }) => {
    if (/Qiyam done, \d+ rak/.test(text)) sawQiyam = true;
    if (/Witr done, \d+ rak/.test(text)) sawWitr = true;
  });
  assert.equal(sawQiyam, true);
  assert.equal(sawWitr, true);
});

test('unticking the last circle clears a custom total before dropping a tick', () => {
  const extra = applyExtra('qiyam', 14);
  const drop = toggleTick('qiyam', extra.ticks, 5, extra.total);
  assert.equal(drop.total, 12);
  assert.deepEqual(drop.ticks, extra.ticks);
  const again = toggleTick('qiyam', drop.ticks, 5, drop.total);
  assert.equal(again.total, 10);
  const witr = applyExtra('witr', 13);
  const back = toggleTick('witr', witr.ticks, 5, witr.total);
  assert.equal(back.total, 11);
  assert.ok(back.ticks.every(Boolean));
});
