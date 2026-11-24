/* v3.0.6: checks for every line of the approved command (A–M). Browser checks for the same lines
   (EN and BN, no page errors, no request outside the app) run in scripts/e2e-v306.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import * as E from '../src/moon-engine.js';
import * as S from '../src/sky.js';
import * as RP from '../src/reading-plan.js';
import { loadReading, READING_KEY, passageVerses, hasTheme } from '../src/blessed-reminder.js';
import { verseByIndex } from '../src/quran/load.js';
import { KNOWN_STATE_KEYS, splitBackup } from '../src/backup.js';
import tzlookup from '../src/vendor/tz-lookup.js';
import { vendorMoonSighting, vendorTzLookup } from '../scripts/vendor-libs.mjs';
import { readText } from './helpers/read-text.js';

const file = rel => fileURLToPath(new URL(rel, import.meta.url));
const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const fn = name => { const i = app.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return app.slice(i, app.indexOf('\n}\n', i) + 2); };
const kernelBytes = fs.readFileSync(file('../public/ephemeris/de442s.bsp'));
E.loadKernel(kernelBytes.buffer.slice(kernelBytes.byteOffset, kernelBytes.byteOffset + kernelBytes.byteLength));
const memoryStorage = () => { const m = {}; return { m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };
const DHAKA = [23.8103, 90.4125];
const ymd = n => { const x = E.ymdOfDayNumber(n); return `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`; };

/* ---------- L. full precision: the DE442S kernel is bundled ---------- */
test('L the JPL DE442S kernel is in the app (public/ephemeris), unmodified, read from the app’s own files', () => {
  assert.equal(kernelBytes.length, 32701440);
  assert.equal(kernelBytes.length, E.KERNEL_BYTES);
  assert.equal(crypto.createHash('md5').update(kernelBytes).digest('hex'), 'cc49327e06088124c0e39d8dde9f0b58', 'NAIF aa_checksums.txt');
  assert.equal(kernelBytes.subarray(0, 7).toString('latin1'), 'DAF/SPK');
  assert.equal(E.KERNEL_PATH, 'ephemeris/de442s.bsp');
  const load = readText('../src/moon-engine.js', import.meta.url);
  assert.match(load, /if \(url\.origin !== origin\) return false;/);
  assert.match(app, /loadEphemeris\(\)\.finally\(\(\) => init\(\)\);/, 'the kernel is read before the first render');
  assert.match(fn('loadEphemeris'), /loadBundledKernel\(document\.baseURI, window\.location\.origin\)/);
  assert.match(fn('loadEphemeris'), /Promise\.race\(\[load, new Promise\(resolve => setTimeout\(\(\) => resolve\(false\), 15000\)\)\]\)/, 'the app never waits more than 15 s for the kernel');
  assert.ok(E.ephemerisReady());
});

/* ---------- J. licence, privacy ---------- */
test('J the moon-sighting MIT licence (and the kernel and tz-lookup notices) are in the licences list; privacy text unchanged', () => {
  const lic = readText('../LICENSES', import.meta.url);
  assert.match(lic, /moon-sighting 1\.2\.0 by Aric Camarata — MIT licence/);
  assert.match(lic, /JPL DE442S planetary ephemeris/);
  assert.match(lic, /@photostructure\/tz-lookup 11\.8\.0 — CC0 1\.0/);
  const full = readText('../src/vendor/LICENSES-v3.0.6.txt', import.meta.url);
  assert.match(full, /MIT License\s+Copyright \(c\) 2026 Aric Camarata/);
  assert.match(full, /CC0 1\.0 Universal/);
  assert.match(full, /cc49327e06088124c0e39d8dde9f0b58/);
  assert.match(html, /moon-sighting by Aric Camarata \(MIT licence\) and NASA JPL’s DE442S ephemeris/);
  assert.match(app, /আরিক কামারাতার moon-sighting \(MIT লাইসেন্স\)/);
  // H polar limit stated in the app (EN and BN)
  assert.match(html, /Beyond the polar circles \(latitude above 66\.56° N or S\)[^<]*Umm al-Qura calendar is used, without the “Predicted by crescent visibility” label\./);
  assert.match(app, /মেরুবৃত্তের ভেতরে \(অক্ষাংশ ৬৬\.৫৬° উত্তর বা দক্ষিণের বেশি\)[^']*উম্মুল কুরা পঞ্জিকা ব্যবহার করা হয়/);
  const privacy = "Prayer history, preferences, themes and location stay in this application's local profile. Nothing is uploaded or synchronised.";
  assert.ok(html.includes(privacy));
  assert.match(app, /"Prayer history, preferences, themes and location stay in this application's local profile\. Nothing is uploaded or synchronised\.":'নামাজের ইতিহাস, পছন্দ, থিম ও অবস্থান অ্যাপের স্থানীয় প্রোফাইলে থাকে।/);
});

test('J/I the offline copies are exactly the pinned npm packages with only the network code taken out', () => {
  const pkg = JSON.parse(readText('../package.json', import.meta.url));
  assert.equal(pkg.devDependencies['moon-sighting'], '1.2.0');
  assert.equal(pkg.devDependencies['@photostructure/tz-lookup'], '11.8.0');
  const ms = fs.readFileSync(file('../node_modules/moon-sighting/dist/index.mjs'), 'utf8');
  assert.equal(readText('../src/vendor/moon-sighting.js', import.meta.url), vendorMoonSighting(ms));
  const tz = fs.readFileSync(file('../node_modules/@photostructure/tz-lookup/tz.js'), 'utf8');
  assert.equal(readText('../src/vendor/tz-lookup.js', import.meta.url), vendorTzLookup(tz));
  assert.ok(ms.includes('ping.ariccamarata.com'), 'the npm build carries a telemetry ping (off by default)');
});

/* ---------- I. no internet ---------- */
test('I no internet: no network API anywhere in the app code except the same-origin kernel read; no sync button; CSP allows only the app itself', () => {
  const NET = /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.onLine|import\(\s*['"]https?:/;
  const srcDir = file('../src');
  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
  walk(srcDir);
  const hits = files.filter(p => NET.test(fs.readFileSync(p, 'utf8')));
  assert.deepEqual(hits.map(p => path.relative(srcDir, p).split(path.sep).join('/')), ['moon-engine.js']);
  const engine = readText('../src/moon-engine.js', import.meta.url);
  assert.equal((engine.match(/fetch\(/g) || []).length, 1);
  for (const p of files) assert.doesNotMatch(fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''), /['"`]https?:\/\/(?!www\.w3\.org)/, p);
  assert.doesNotMatch(html, /Temporal synchroni|Sync time|syncButton/i);
  assert.doesNotMatch(app, /Temporal synchroni|timeapi|aladhan/i);
  const conf = JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url));
  assert.equal(conf.app.security.csp, "default-src 'self' asset:; img-src 'self' data: asset:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:1420 ws://127.0.0.1:1420");
  const cargo = readText('../src-tauri/Cargo.toml', import.meta.url);
  assert.doesNotMatch(cargo, /reqwest|tauri-plugin-http|hyper/);
});

/* ---------- H. Hijri date by location ---------- */
test('H Odeh crescent on one evening: zones A/B/C count as visible; the 10–11 Nov 2026 evenings at Dhaka', () => {
  assert.deepEqual([...E.ODEH_VISIBLE_ZONES], ['A', 'B', 'C']);
  const before = E.eveningCrescent(E.dayNumber(2026, 11, 10), ...DHAKA);
  const after = E.eveningCrescent(E.dayNumber(2026, 11, 11), ...DHAKA);
  assert.equal(before.zone, 'D');
  assert.equal(before.visible, false);
  assert.equal(after.zone, 'A');
  assert.equal(after.visible, true);
  assert.ok(after.lag > 60 && after.lag < 90, `lag ${after.lag}`);
  // the crescent check's sunset is 17:14 Dhaka time, the same minute as the app's own sunset that day
  assert.equal(new Date(after.sunset.getTime() + 6 * 3600000).toISOString().slice(11, 16), '17:14');
});

test('H 29th-evening rule: months are 29 or 30 days, chained from Muharram 1440, for cities and high latitudes', () => {
  for (const [lat, lon] of [DHAKA, [21.4225, 39.8262], [51.5074, -0.1278], [34.05, -118.25], [-6.2, 106.8], [65.01, 25.47], [-33.92, 18.42], [-54.8, -68.3]]) {
    for (let k = E.lunationOf(1440, 1); k < E.lunationOf(1460, 1); k++) {
      const a = E.monthStartEvening(k, lat, lon), b = E.monthStartEvening(k + 1, lat, lon);
      assert.ok(b - a === 29 || b - a === 30, `${lat},${lon} lunation ${k}: ${b - a}`);
      // the month is 29 days exactly when the crescent is predicted visible on the evening of the 29th
      const ev = E.eveningCrescent(a + 29, lat, lon);
      assert.equal(b - a === 29, ev.visible, `${lat},${lon} ${k}`);
    }
  }
});

test('H Dhaka month starts 1446–1448 (day 1 = the civil day after the sunset that starts the month)', () => {
  const got = [];
  for (let k = E.lunationOf(1446, 9); k <= E.lunationOf(1448, 7); k++) { const h = E.hijriOfLunation(k); got.push(`${h.month}/${h.year} ${ymd(E.monthStartEvening(k, ...DHAKA) + 1)}`); }
  assert.deepEqual(got, ['9/1446 2025-03-02', '10/1446 2025-03-31', '11/1446 2025-04-29', '12/1446 2025-05-29', '1/1447 2025-06-27', '2/1447 2025-07-27', '3/1447 2025-08-25', '4/1447 2025-09-24', '5/1447 2025-10-24', '6/1447 2025-11-23', '7/1447 2025-12-22', '8/1447 2026-01-21', '9/1447 2026-02-19', '10/1447 2026-03-21', '11/1447 2026-04-19', '12/1447 2026-05-18', '1/1448 2026-06-17', '2/1448 2026-07-16', '3/1448 2026-08-15', '4/1448 2026-09-13', '5/1448 2026-10-13', '6/1448 2026-11-12', '7/1448 2026-12-11']);
  assert.deepEqual(E.crescentHijriOfDay(E.dayNumber(2026, 11, 23), ...DHAKA), { year: 1448, month: 6, day: 12 });
  assert.deepEqual(E.crescentHijriOfDay(E.dayNumber(2026, 11, 12), ...DHAKA), { year: 1448, month: 6, day: 1 });
  assert.deepEqual(E.crescentHijriOfDay(E.dayNumber(2026, 11, 11), ...DHAKA), { year: 1448, month: 5, day: 30 });
  // the date depends on the location: Mecca starts Jumada II 1448 a day earlier than Dhaka
  assert.deepEqual(E.crescentHijriOfDay(E.dayNumber(2026, 11, 11), 21.4225, 39.8262), { year: 1448, month: 6, day: 1 });
  // beyond the polar circles (some days without a sunset) there is no crescent date: Umm al-Qura, unlabelled
  assert.equal(E.POLAR_LIMIT, 66.56);
  assert.equal(E.crescentHijriOfDay(E.dayNumber(2026, 11, 23), 69.65, 18.96), null);
  assert.equal(E.crescentHijriOfDay(E.dayNumber(2026, 11, 23), -77.85, 166.67), null);
  assert.ok(E.crescentHijriOfDay(E.dayNumber(2026, 11, 23), 66.5, 25.7));
  // before the epoch there is no crescent date (the app falls back to Umm al-Qura without the label)
  assert.equal(E.crescentHijriOfDay(E.dayNumber(2018, 1, 1), ...DHAKA), null);
});

test('H app: Maghrib change kept, −2..+2 on top, label EN/BN, Umm al-Qura only as a labelled-off fallback', () => {
  assert.match(fn('islamicCalendarDateAt'), /times\?\.maghrib && moment >= times\.maghrib \? addDays\(moment, 1\) : moment/);
  assert.match(fn('hijriParts'), /const shifted = addDays\(date, hijriShift\(\)\);\n  return crescentHijri\(shifted\) \|\| ummAlQuraParts\(shifted\);/);
  assert.match(fn('crescentHijri'), /crescentHijriOfDay\(dayNumberOfLocalDate\(date\), state\.lat, state\.lon\)/);
  assert.match(app, /const HIJRI_SOURCE_LABEL = \{ en: 'Predicted by crescent visibility', bn: 'নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী' \};/);
  assert.match(fn('paintClockDate'), /source\.hidden = !crescent;/);
  assert.match(html, /<div class="clock-date-note" id="hijriSourceLabel" hidden><\/div>/);
  assert.match(app, /'Predicted by crescent visibility':'নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী'/);
  assert.match(fn('render'), /hijriByCrescent\(today\) \? 'Predicted by crescent visibility' : 'Umm al-Qura estimate; local moon-sighting may differ\.'/);
  assert.match(fn('hijriMonthDays'), /crescentMonthLength\(year, month, state\.lat, state\.lon\)/);
});

/* ---------- M. astrolabe and Sun/Moon cards: precise positions ---------- */
test('M precise sun and moon replace the low-precision series in the astrolabe and the Sun/Moon cards (same shapes)', () => {
  assert.match(app, /import \{ sunPosition as approxSunPosition, moonPosition as approxMoonPosition, moonPhase as approxMoonPhase, phaseName, moonPass as approxMoonPass, sunIntensity, moonLitPath \} from '\.\/sky\.js';/);
  assert.match(fn('sunPosition'), /ephemerisReady\(\) \? preciseSunPosition\(date, latitude, longitude\) : approxSunPosition/);
  assert.match(fn('moonPosition'), /ephemerisReady\(\) \? preciseMoonPosition\(date, latitude, longitude\) : approxMoonPosition/);
  assert.match(fn('moonPhase'), /ephemerisReady\(\) \? preciseMoonPhase\(date\) : approxMoonPhase\(date\)/);
  assert.match(fn('moonPass'), /preciseMoonPass\(now, latitude, longitude\)/);
  for (const name of ['renderAstroView', 'updateSky', 'placeSkyBodies']) assert.match(fn(name), /sunPosition\(now, state\.lat, state\.lon\)/, name);
  const d = new Date('2026-11-23T08:00:00Z');
  const sun = E.preciseSunPosition(d, ...DHAKA), moon = E.preciseMoonPosition(d, ...DHAKA), phase = E.preciseMoonPhase(d), pass = E.preciseMoonPass(d, ...DHAKA);
  for (const k of ['altitude', 'azimuth', 'declination', 'hourAngle']) { assert.ok(Number.isFinite(sun[k]), k); assert.ok(Number.isFinite(moon[k]), k); }
  assert.ok(moon.distance > 350000 && moon.distance < 410000);
  assert.ok(phase.illumination > 0.9 && phase.waxing === true && phase.elongation > 150 && phase.elongation < 180);
  assert.ok(pass.rise instanceof Date && pass.set instanceof Date && pass.set > pass.rise);
  // close to the old series (which is ~0.01° for the sun, a degree or two for the moon), never wildly off
  const a = S.sunPosition(d, ...DHAKA), b = S.moonPosition(d, ...DHAKA);
  assert.ok(Math.abs(a.altitude - sun.altitude) < 0.1 && Math.abs(b.altitude - moon.altitude) < 3);
  // the astrolabe’s look is untouched: the marker markup and the astrolabe files are the v3.0.5 ones
  const V305 = { 'astrolabe-view.js': 'fe90b0b86b95c2a8d62b2fd11e5aeabffa1e3610720c1864ee1545748281240c', 'astrolabe.js': '15c883b3e5ed9d8471925955b8e2923d6c36ae22ea860d682d5b58dbb8a14a40', 'sky.js': '7d9f295cc10cfd217bad2b81a567eace95e745cb23ab0a43e371f18d87845452', 'clock-dial.js': '9fa431571d5bffe078b8ab53eda07a51d5634c0c96a90cbf8b86e0b854ca17dc' };
  for (const [f, sha] of Object.entries(V305)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file(`../src/${f}`))).digest('hex'), sha, `${f} is byte-identical to v3.0.5`);
});

/* ---------- D. lunar-year plan ---------- */
test('D 2,739 passages / 6,236 verses in mushaf order over 354 or 355 days, breaks only between passages, balanced, deterministic', async () => {
  const { passages: P } = await loadReading();
  assert.equal(P.starts.length, 2739);
  assert.equal(P.count, 6236);
  assert.equal(RP.PASSAGE_TOTAL, 2739);
  for (const days of [354, 355]) {
    const s = RP.planStarts(P, days);
    assert.equal(s.length, days + 1);
    assert.equal(s[0], 0);
    assert.equal(s[days], 2739);
    let verses = 0;
    const per = [];
    for (let d = 1; d <= days; d++) {
      const r = RP.planRange(P, d, days);
      assert.ok(r.to > r.from, 'every day has at least one passage');
      assert.equal(r.from, s[d - 1]);
      const v = RP.rangeVerses(P, r);
      per.push(v); verses += v;
    }
    assert.equal(verses, 6236, 'every verse exactly once');
    assert.ok(Math.min(...per) >= 13 && Math.max(...per) <= 23, `${days}: verses/day ${Math.min(...per)}–${Math.max(...per)}`);
    assert.ok(Math.abs(2739 / days - 7.7) < 0.1, 'about 7–8 passages a day on average');
    assert.deepEqual(RP.planStarts(P, days), s, 'deterministic');
  }
  assert.deepEqual(RP.planRange(P, 1, 354), { from: 0, to: RP.planStarts(P, 354)[1] });
  assert.equal(verseByIndex((await loadReading()).quran, passageVerses(P, RP.planRange(P, 355, 355).to - 1).to - 1).surah, 114);
  assert.deepEqual(RP.planJuz(P, RP.planRange(P, 1, 354)), [1]);
  assert.deepEqual(RP.planJuz(P, RP.planRange(P, 354, 354)), [30]);
  assert.match(fn('readingContext'), /juz: planJuz\(R\.passages, portion\.range\)/);
});

/* ---------- E. featured passages ---------- */
test('E featured passages: three well-attested dates with sources; approximate / commonly held labelled; shown first; plan unchanged', async () => {
  const R = await loadReading();
  const P = R.passages;
  assert.deepEqual(RP.FEATURED.map(f => [f.id, f.month, f.day]), [['arafah', 12, 9], ['badr', 9, 17], ['qadr', 9, 27]]);
  for (const f of RP.FEATURED) { assert.ok(f.source.length > 40, f.id); assert.match(f.note.bn, /[\u0980-\u09FF]/); assert.ok(f.note.en.length < 140, 'one line'); }
  assert.deepEqual(RP.featuredPassages(P, R.quran, RP.FEATURED[0]), [343]);
  assert.deepEqual(RP.featuredPassages(P, R.quran, RP.FEATURED[1]), [605]);
  assert.deepEqual(RP.featuredPassages(P, R.quran, RP.FEATURED[2]), [2689, 2690]);
  assert.equal(RP.FEATURED[1].approximate, true);
  assert.match(RP.FEATURED[1].note.en, /\(approximate date\)/);
  assert.match(RP.FEATURED[1].note.bn, /\(আনুমানিক তারিখ\)/);
  assert.equal(RP.FEATURED[2].commonlyHeld, true);
  assert.match(RP.FEATURED[2].note.en, /commonly held/);
  assert.match(RP.FEATURED[2].note.bn, /প্রচলিত মতে/);
  assert.match(RP.FEATURED[0].source, /Bukhari 45/);
  assert.match(RP.FEATURED[2].source, /Bukhari 3/);
  const day = { hijri: { year: 1448, month: 9, day: 27 }, dayOfYear: 263, days: 354 };
  const portion = RP.todaysPortion(P, R.quran, day);
  assert.deepEqual(portion.items.slice(0, 2).map(x => x.index), [2689, 2690]);
  assert.deepEqual(portion.range, RP.planRange(P, 263, 354), 'the plan is unchanged');
  assert.equal(portion.items.length, 2 + portion.range.to - portion.range.from);
  // a featured passage shares its read mark with the same passage in the plan
  const s = memoryStorage();
  RP.setRead(s, 1448, 343, true);
  assert.ok(RP.isRead(RP.readStore(s), 1448, 343));
  const plain = RP.todaysPortion(P, R.quran, { hijri: { year: 1448, month: 6, day: 12 }, dayOfYear: 160, days: 354 });
  assert.ok(plain.items.every(x => !x.featured));
});

/* ---------- A, B, C. Mark as read / Undo read / count ---------- */
test('A/B/C only the reader marks a passage; undo affects only that passage; counts of confirmed passages; old automatic counts cleared', async () => {
  const s = memoryStorage();
  s.setItem(READING_KEY, JSON.stringify({ day: '1448-06-12', bits: 'AAAA', parts: [1, 2] }));
  assert.equal(RP.clearLegacyReading(s), true);
  assert.equal(s.getItem(READING_KEY), null);
  assert.equal(RP.clearLegacyReading(s), false);
  assert.match(app, /clearLegacyReading\(\); \/\/ C: the reminder's old automatic read counts are cleared/);
  assert.ok(RP.setRead(s, 1448, 1000, true));
  assert.ok(RP.setRead(s, 1448, 1001, true));
  assert.ok(RP.setRead(s, 1448, 1000, false));
  const st = RP.readStore(s);
  assert.equal(RP.isRead(st, 1448, 1000), false);
  assert.equal(RP.isRead(st, 1448, 1001), true);
  assert.equal(RP.readCount(st, 1448, [1000, 1001, 1002]), 1);
  assert.equal(RP.planProgressLine({ juz: [18], read: 1, total: 9 }, 'en'), "Juz' 18 · 1 of 9 passages read today");
  assert.equal(RP.planProgressLine({ juz: [18], read: 1, total: 9 }, 'bn'), 'পারা ১৮ · আজ ৯টি অংশের ১টি পড়া হয়েছে');
  assert.equal(RP.planProgressLine({ juz: [29, 30], read: 0, total: 12 }, 'bn'), 'পারা ২৯–৩০ · আজ ১২টি অংশের ০টি পড়া হয়েছে');
  assert.deepEqual(RP.PLAN_TEXT.markRead, { en: 'Mark as read', bn: 'পড়েছি' });
  assert.deepEqual(RP.PLAN_TEXT.undoRead, { en: 'Undo read', bn: 'পড়া চিহ্ন সরান' });
  assert.deepEqual(RP.PLAN_TEXT.readDone, { en: 'Read ✓', bn: 'পড়া হয়েছে ✓' });
  assert.deepEqual(RP.PLAN_TEXT.allRead, { en: "Today's portion read ✓", bn: 'আজকের অংশ পড়া শেষ ✓' });
  // the app never marks a passage just because it was shown or opened
  assert.doesNotMatch(fn('chooseBlessedForNow'), /setRead|setPassageRead/);
  assert.match(fn('passageHtml'), /data-blessed-mark="\$\{view\.index\}"/);
  assert.match(fn('passageHtml'), /PLAN_TEXT\.readDone/);
  assert.match(fn('passageHtml'), /PLAN_TEXT\.allRead/);
  assert.match(fn('renderTodaysPortion'), /markButtonHtml\(i, read\)/);
  assert.match(fn('markButtonHtml'), /read \? PLAN_TEXT\.undoRead : PLAN_TEXT\.markRead/);
  assert.match(app, /blessedJustRead = \{ index, until: Date\.now\(\) \+ 1200 \};/);
});

/* ---------- F. per year, behind list, history, backup ---------- */
test('F per-year marks, earlier unread list oldest first, today’s portion never grows, history kept, backup and merge', async () => {
  const { passages: P } = await loadReading();
  const s = memoryStorage();
  const ctx = { year: 1448, dayOfYear: 5, days: 354 };
  const from = RP.planRange(P, 5, 354).from;
  RP.setRead(s, 1448, 3, true);
  const behind = RP.behindList(P, RP.readStore(s), ctx);
  assert.equal(behind.length, from - 1);
  assert.deepEqual(behind.slice(0, 4), [0, 1, 2, 4], 'oldest first, read ones left out');
  assert.deepEqual(RP.planRange(P, 5, 354), { from, to: RP.planStarts(P, 354)[5] }, 'today is only today');
  assert.equal(RP.behindLine(3, 'en'), '3 passages behind this year');
  assert.equal(RP.behindLine(1, 'en'), '1 passage behind this year');
  assert.equal(RP.behindLine(3, 'bn'), 'এ বছর ৩টি অংশ পিছিয়ে');
  // a new year starts fresh; the old year stays as history
  RP.setRead(s, 1449, 0, true);
  const st = RP.readStore(s);
  assert.equal(RP.isRead(st, 1449, 3), false);
  assert.equal(RP.isRead(st, 1448, 3), true);
  assert.deepEqual(RP.storedYears(st), [1449, 1448]);
  assert.equal(RP.yearLine(1448, 1, 'en'), '1448 AH: 1 of 2,739 passages read');
  assert.equal(RP.yearLine(1448, 1234, 'bn'), '১৪৪৮ হিজরি: ২,৭৩৯টি অংশের ১,২৩৪টি পড়া হয়েছে');
  // backup
  assert.ok(KNOWN_STATE_KEYS.includes('reading'));
  assert.deepEqual(splitBackup({ reading: st }).unknown, []);
  const clean = RP.sanitizeReadingBackup(JSON.parse(JSON.stringify(st)));
  assert.deepEqual(clean, st);
  assert.equal(RP.sanitizeReadingBackup({ years: { abc: 'x' } }).years.abc, undefined);
  assert.equal(RP.sanitizeReadingBackup('nope'), null);
  const other = memoryStorage(); RP.setRead(other, 1448, 7, true);
  const merged = RP.mergeReading(st, RP.readStore(other));
  assert.ok(RP.isRead(merged, 1448, 3) && RP.isRead(merged, 1448, 7) && RP.isRead(merged, 1449, 0));
  assert.match(app, /data: \{ \.\.\.state, reading: readStore\(\) \}/);
  assert.match(app, /if \('reading' in clean\) \{ const reading = sanitizeReadingBackup\(clean\.reading\); if \(reading\) writeStore\(undefined, reading\); \}/);
  assert.match(app, /writeStore\(undefined, mergeReading\(readStore\(\), reading\)\)/);
  assert.match(html, /<div class="portion-nav" id="portionNav" hidden><\/div>/);
  assert.match(fn('renderTodaysPortion'), /behindList\(R\.passages, store, \{ year: hijri\.year, dayOfYear: ctx\.dayOfYear, days: ctx\.days \}\)/);
});

/* ---------- G. reading day at the location's midnight ---------- */
test('G the reading day changes at midnight in the time zone of the saved location (offline lookup)', () => {
  assert.equal(tzlookup(23.8103, 90.4125), 'Asia/Dhaka');
  assert.equal(tzlookup(51.5074, -0.1278), 'Europe/London');
  assert.equal(tzlookup(21.4225, 39.8262), 'Asia/Riyadh');
  assert.equal(tzlookup(40.7128, -74.006), 'America/New_York');
  assert.match(fn('readingCivilDate'), /new Intl\.DateTimeFormat\('en-CA', \{ timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' \}\)\.formatToParts\(now\)/);
  assert.match(fn('locationTimeZone'), /tzlookup\(Number\(state\.lat\), Number\(state\.lon\)\)/);
  assert.match(fn('readingContext'), /const civil = readingCivilDate\(now\);\n  const hijri = hijriParts\(civil\);/);
  // 23:59 and 00:01 Dhaka time fall on different reading days whatever the device zone is
  const day = (ms, zone) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(ms));
  assert.notEqual(day(Date.parse('2026-11-23T23:59:00+06:00'), 'Asia/Dhaka'), day(Date.parse('2026-11-24T00:01:00+06:00'), 'Asia/Dhaka'));
});

/* ---------- K. version ---------- */
test('K version 3.0.6 everywhere; label v3.0.6 / v৩.০.৬', () => {
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
  assert.match(readText('../TEST-RESULTS.md', import.meta.url), /### v3\.0\.6/);
  assert.match(html, /id="appVersionLabel">v3\.0\.6</);
});

test('every new reading text has English and Bangla; the settings note describes the plan honestly', () => {
  for (const [k, v] of Object.entries(RP.PLAN_TEXT)) { assert.ok(v.en, k); assert.match(v.bn, /[\u0980-\u09FF]/, k); }
  assert.match(html, /The whole Qur’an is read once each Hijri year: its 2,739 passages in mushaf order, about 7–8 a day/);
  assert.match(app, /'The whole Qur’an is read once each Hijri year: [^']+':'প্রতি হিজরি বছরে পুরো কুরআন একবার পড়া হয়: ২,৭৩৯টি অংশ/);
  assert.doesNotMatch(html, /One juz’ is read each Hijri day/);
  assert.match(css, /\.portion-mark \.blessed-more/);
  void hasTheme;
});
