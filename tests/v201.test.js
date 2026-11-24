import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readText } from './helpers/read-text.js';
import { APP_VERSION, BRAND_MARK_SVG } from '../src/branding.js';
import { migrateRecord } from '../src/history-migrate.js';
import { mergeHistory } from '../src/backup.js';

const html = readText('../index.html', import.meta.url);
const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const icon = readText('../src-tauri/icons/icon.svg', import.meta.url);
const pkg = JSON.parse(readText('../package.json', import.meta.url));
const lock = JSON.parse(readText('../package-lock.json', import.meta.url));
const tauri = JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url));
const cargo = readText('../src-tauri/Cargo.toml', import.meta.url);
const bnBlock = app.slice(app.indexOf('/* v2.0.1 */'));

test('version 3.0.6 is used everywhere', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(pkg.version, '3.0.6');
  assert.equal(lock.version, '3.0.6');
  assert.equal(lock.packages[''].version, '3.0.6');
  assert.equal(tauri.version, '3.0.6');
  assert.match(cargo, /^version = "3\.0\.6"/m);
  assert.match(readText('../CHANGELOG.txt', import.meta.url), /^Prayer Times Desktop v3\.0\.6/);
});

test('1 header: app mark and name on the left, a small Coordinates card on the right, no separate date block', () => {
  const header = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</header>'));
  assert.ok(header.indexOf('class="brand"') < header.indexOf('id="locationLabel"'), 'brand first, coordinates after it');
  assert.match(header, /class="brand-mark" id="brandMark"/);
  assert.match(header, /<div class="brand-name">Prayer Times<\/div>/);
  assert.match(header, /class="coord-card" id="locationLabel"/);
  assert.doesNotMatch(header, /top-date|dateLabel|hijriDateLabel|brand-sub/);
  assert.match(app, /`coordinates: \$\{coords\}`/, 'English reads exactly: coordinates: (lat, lon)');
  assert.match(app, /const coords = `\(\$\{state\.lat\.toFixed\(4\)\}, \$\{state\.lon\.toFixed\(4\)\}\)`/);
  assert.match(app, /`স্থানাঙ্ক: \$\{localizeDigits\(coords\)\}`/, 'Bangla digits and wording');
  assert.match(app, /'coordinates: \(not set\)'/);
  assert.match(app, /'স্থানাঙ্ক: \(নির্ধারিত নয়\)'/);
  assert.ok(header.indexOf('id="locationLabel"') > header.indexOf('id="settingsToggle"'), 'the coordinates card is the far-right item');
});

test('1.1 new astrolabe and mihrab logo is shared by the icon, favicon, header and Tauri icons', () => {
  assert.match(icon, /<svg[^>]*viewBox="0 0 512 512"/);
  // [retired in v2.3.0: logo B replaces the v2.2.0 mihrab logo: silver ring with degree ticks, enamel face, gold crescent and star over rete rings]
  assert.match(icon, /id="pBS"/, 'brushed-silver ring');
  assert.match(icon, /id="pBE"/, 'dark enamel face');
  assert.match(icon, /<mask id="m1x"/, 'crescent');
  assert.doesNotMatch(icon, /mihrab niche/, 'the pointed arch is gone');
  assert.doesNotMatch(icon, /minarets|clock face/, 'the old minaret and clock logo is gone');
  assert.equal(readText('../public/favicon.svg', import.meta.url), icon);
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="favicon\.svg">/);
  assert.ok(html.includes(BRAND_MARK_SVG), 'index.html header mark equals BRAND_MARK_SVG');
  assert.match(app, /\$\('brandMark'\)/);
  assert.match(app, /brandMark\.innerHTML = BRAND_MARK_SVG/);
  assert.doesNotMatch(html, /M8 51V23h7v28/, 'old header glyph removed');
  const png = name => fs.readFileSync(new URL(`../src-tauri/icons/${name}`, import.meta.url));
  for (const [name, size] of [['32x32.png', 32], ['128x128.png', 128], ['128x128@2x.png', 256]]) {
    const data = png(name);
    assert.equal(data.subarray(1, 4).toString(), 'PNG');
    assert.equal(data.readUInt32BE(16), size, `${name} width`);
    assert.equal(data.readUInt32BE(20), size, `${name} height`);
  }
  const ico = png('icon.ico');
  assert.equal(ico.readUInt16LE(2), 1, 'ICO type');
  assert.ok(ico.readUInt16LE(4) >= 4, 'ICO holds several sizes');
  assert.deepEqual(tauri.bundle.icon, ['icons/32x32.png', 'icons/128x128.png', 'icons/128x128@2x.png', 'icons/icon.ico']);
});

test('1.2 the Local time card carries the date and the row is 60% astrolabe / 40% clock at every width', () => {
  const clock = html.slice(html.indexOf('<article class="clock-card"'), html.indexOf('</article>', html.indexOf('<article class="clock-card"')));
  assert.match(clock, /id="liveClock"/);
  assert.match(clock, /id="dateLabel"/);
  assert.match(clock, /id="hijriDateLabel"/);
  assert.ok(html.indexOf('id="skyPanel"') < html.indexOf('id="clockCard"'));
  const decl = [...css.matchAll(/\.instrument-row \{([^}]*)\}/g)].map(match => match[1]);
  const last = decl.filter(body => /3fr/.test(body)).pop();
  assert.match(last, /grid-template-columns: minmax\(0, 3fr\) minmax\(0, 2fr\)/);
  assert.match(app, /function paintClockDate/);
  assert.match(app, /replace\(\/\\s\*যুগ\$\/, ' হিজরি'\)/, 'Hijri era is written in Bangla, not যুগ');
});

test('2 the horizontal strip is gone and the sixth Voluntary prayers card replaces it', () => {
  assert.doesNotMatch(html, /otherVoluntarySection|other-voluntary-tab|id="otherVoluntaryAdd"/);
  const voluntary = app.slice(app.indexOf('function renderVoluntary'), app.indexOf('function renderSituational'));
  assert.match(voluntary, /function appendOtherVoluntaryCard\(list\)/);
  assert.match(voluntary, /appendOtherVoluntaryCard\(list\);\n\}/, 'the card is appended last, after the five prayers');
  assert.match(voluntary, /id="otherVoluntaryAdd"/);
  assert.doesNotMatch(voluntary, /id="otherVoluntaryUndo"|id="otherVoluntaryCount"/, 'no undo or count on the homepage card');
  assert.match(voluntary, /recordOtherNafl\(2\)/);
  assert.doesNotMatch(voluntary, /recordOtherNafl\(-2\)/);
  assert.match(css, /\.voluntary-list \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/, 'six cards split 3 + 3');
  assert.match(css, /\.other-voluntary-card\.is-glow/);
  assert.match(app, /if \(next < 0 \|\| next % 2\) return/, 'nafl still moves in sets of two');
});

test('3 legend says Voluntary, and rak‘ah sets leave the Additional worship cards', () => {
  assert.match(html, /<span data-bn="ঐচ্ছিক"><i class="legend-dot voluntary" aria-hidden="true"><\/i> Voluntary<\/span>/);
  assert.doesNotMatch(html, /Other voluntary<\/span>/);
  assert.match(app, /node\.parentElement\?\.dataset\?\.bn/);
  assert.match(app, /Voluntary \$\{volRak\} rak‘ahs/);
  assert.match(app, /ঐচ্ছিক \$\{n\(volRak\)\} রাকাত/);
  assert.match(app, /Voluntary none yet/);
  assert.match(app, /ঐচ্ছিক এখনও নেই/);
  const list = app.slice(app.indexOf('function renderVoluntary'), app.indexOf('function appendOtherVoluntaryCard'));
  assert.doesNotMatch(list, /rakahControlsHtml|bindRakahControls/);
  const live = app.slice(app.indexOf('function renderLiveEvents'), app.indexOf('function renderFard'));
  assert.doesNotMatch(app, /function renderRevisions|reviseRakahHtml|data-revise-rakah-set/);
});

test('4 ticks never close an event card; only Mark completed does', () => {
  const live = app.slice(app.indexOf('function renderLiveEvents'), app.indexOf('function renderFard'));
  assert.match(live, /filter\(event => !eventClosed\(event\)/);
  assert.doesNotMatch(live, /eventComplete\(/);
  const toggle = app.slice(app.indexOf('function togglePrayer'), app.indexOf('function markEventComplete'));
  assert.doesNotMatch(toggle, /closed/, 'a tick only records');
  const mark = app.slice(app.indexOf('function markEventComplete'), app.indexOf('function updateClock'));
  assert.match(mark, /\(record\.closed \|\|= \{\}\)\[`\$\{kind\}:\$\{key\}`\] = true/);
  assert.match(app, /function seedClosedFlags/);
  assert.match(app, /if \(record\.closed\) delete record\.closed\[`\$\{layer\}:\$\{key\}`\]/, 'weekly Undo prayer reopens the event');
});

test('4 Mark completed and Undo prayer are square buttons with smooth corners in opposite colours', () => {
  assert.match(app, /class="square-button is-complete mark-event-complete"[^>]*>Mark Complete<\/button>/);
  assert.match(app, /aria-label="Mark Complete"/);
  assert.match(app, /class="square-button is-undo undo-corner"/);
  assert.doesNotMatch(app, /id="otherVoluntaryUndo"/);
  const base = css.match(/\n\.square-button \{([^}]*)\}/)[1];
  assert.match(base, /aspect-ratio: 1 \/ 1/);
  assert.match(base, /width: 3\.5rem; height: 3\.5rem/);
  assert.match(base, /border-radius: 1\.05rem/);
  assert.match(base, /--sq-fg: var\(--on-good\); --sq-bg: var\(--good\)/);
  assert.match(css, /\.square-button\.is-undo \{ --sq-fg: var\(--good\); --sq-bg: var\(--on-good\); \}/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /\.home-board \.live-event \.square-button\.mark-event-complete \{ width: 3\.3rem; height: 3\.3rem;/);
});

test('Bangla wording exists for every new string', () => {
  assert.match(app, /'Mark Complete':'সম্পন্ন করুন'/);
  assert.match(bnBlock, /'Add extra nafl in sets of two rak‘ahs whenever prayer is permitted\.':'[^']+'/);
  for (const key of ['Other voluntary prayers', 'WHEN PRAYER IS PERMITTED', '+2 rak‘ahs', 'Undo prayer', 'Mark Complete', 'LOCAL TIME']) {
    assert.ok(app.includes(`'${key}':'`), `${key} has a Bangla entry`);
  }
  assert.match(app, /other_nafl: \{ en: 'Other voluntary prayers', bn: 'অন্যান্য নফল নামাজ' \}/);
});

test('closed flags survive migration and backup merge', () => {
  assert.deepEqual(migrateRecord({ fard: {}, closed: { 'fard:isha': true, 'voluntary:witr': 'yes' } }).closed, { 'fard:isha': true });
  assert.deepEqual(migrateRecord({ fard: {}, closed: 'bad' }).closed, {});
  const merged = mergeHistory(
    { '2026-11-15': { fard: { isha: true }, closed: { 'fard:isha': true } } },
    { '2026-11-15': { fard: {}, voluntary: { witr: true }, closed: { 'voluntary:witr': true } } }
  );
  assert.deepEqual(merged.history['2026-11-15'].closed, { 'fard:isha': true, 'voluntary:witr': true });
});
