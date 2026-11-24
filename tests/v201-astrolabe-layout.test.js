import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { platePoint, plateRadiusOf, eclipticBandSamples, localSiderealDegrees, sunAngularDiameter, moonAngularDiameter, bodyRadii } from '../src/astrolabe.js';
import { sunPosition } from '../src/sky.js';

const html = readText('../index.html', import.meta.url);
const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const norm = d => ((d % 360) + 360) % 360;

test('3 traditional orientation: meridian vertical, noon culmination at the top, west to the right', () => {
  const top = platePoint(0, 0, 100, 100, 70);
  const west = platePoint(0, 90, 100, 100, 70);
  const east = platePoint(0, 270, 100, 100, 70);
  const bottom = platePoint(0, 180, 100, 100, 70);
  assert.ok(top.y < 100 && Math.abs(top.x - 100) < 1e-6);
  assert.ok(west.x > 100 && east.x < 100);
  assert.ok(bottom.y > 100);
});

test('3 the sun on the rete lies on the ecliptic after the rete is turned by sidereal time', () => {
  const lon = 90.4125, lat = 23.8103;
  for (const iso of ['2026-03-20T06:00:00Z', '2026-06-21T09:30:00Z', '2026-09-23T15:00:00Z', '2026-11-15T10:40:00Z', '2027-01-05T22:10:00Z']) {
    const date = new Date(iso);
    const sun = sunPosition(date, lat, lon);
    const lst = localSiderealDegrees(date, lon);
    const ra = norm(lst - sun.hourAngle);
    // The ecliptic sample with the same right ascension must have (almost) the sun's declination.
    const samples = eclipticBandSamples(0, 720);
    const near = samples.reduce((best, s) => (Math.abs(norm(s.rightAscension - ra + 180) - 180) < Math.abs(norm(best.rightAscension - ra + 180) - 180) ? s : best));
    assert.ok(Math.abs(near.declination - sun.declination) < 0.45, `${iso}: ecliptic dec ${near.declination.toFixed(2)} vs sun ${sun.declination.toFixed(2)}`);
  }
  // rotating the rete by LST puts a body of right ascension RA at hour angle LST - RA
  const lst = 123;
  const ra = 40;
  const staticPoint = platePoint(10, -ra, 0, 0, 100);
  const a = lst * Math.PI / 180;
  const rotated = { x: staticPoint.x * Math.cos(a) - staticPoint.y * Math.sin(a), y: staticPoint.x * Math.sin(a) + staticPoint.y * Math.cos(a) };
  const direct = platePoint(10, lst - ra, 0, 0, 100);
  assert.ok(Math.hypot(rotated.x - direct.x, rotated.y - direct.y) < 1e-6);
});

test('3 sun and moon are drawn with their true apparent-size ratio (nearly equal, never the old 0.86 guess)', () => {
  const dates = ['2026-01-03T00:00:00Z', '2026-04-10T00:00:00Z', '2026-07-04T00:00:00Z', '2026-10-20T00:00:00Z'].map(d => new Date(d));
  for (const date of dates) {
    const sun = sunAngularDiameter(date), moon = moonAngularDiameter(date);
    assert.ok(sun > 0.52 && sun < 0.55, `sun ${sun}`);
    assert.ok(moon > 0.48 && moon < 0.57, `moon ${moon}`);
    const radii = bodyRadii(date, 140);
    assert.ok(Math.abs(radii.moon / radii.sun - moon / sun) < 1e-9);
  }
  assert.ok(sunAngularDiameter(dates[0]) > sunAngularDiameter(dates[2]), 'the sun looks larger at perihelion in January');
});

test('3 the astrolabe is rebuilt as a full instrument and driven by real time', () => {
  for (const id of ['skyMater', 'skyPlate', 'skyRete', 'skyReteBody', 'skyRule', 'skySun', 'skyMoon']) assert.ok(html.includes(`id="${id}"`), id);
  // [retired in v2.1.0: superseded 2.0.1 design] for (const fn of ['drawAstrolabeMater', 'drawAstrolabePlate', 'drawAstrolabeRete', 'rotateAstrolabeRete']) assert.match(app, new RegExp(`function ${fn}\\(`));
  assert.match(app, /localSiderealDegrees\(now, state\.lon\)/, 'rete turns with sidereal time');
  assert.match(app, /requestAnimationFrame/, 'bodies and rule glide in real time');
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /ZODIAC_AR/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /altitudeSamples\(state\.lat, alt/, 'twilight lines for the saved latitude');
});

test('3/4 panel: 3fr | 2fr, one height for both cards, the clock face never larger than the astrolabe stage', () => {
  assert.match(css, /body \.instrument-row \{ display: grid; grid-template-columns: minmax\(0, 3fr\) minmax\(0, 2fr\);/);
  assert.match(css, /--inst-h: clamp\(9\.5rem, min\(37vh, 34vw\), 25rem\)/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /body \.instrument-row > \.sky-panel, body \.instrument-row > \.clock-card \{ height: var\(--inst-h\)/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /body \.clock-card \.analog-clock \{ height: min\(88cqh, 56cqw\)/);
  const top = html.indexOf('class="astro-top"'), stage = html.indexOf('class="sky-stage astro-stage"'), foot = html.indexOf('id="skyObservatoryFooter"');
  assert.ok(top > 0 && top < stage && stage < foot, 'labels only above and below the instrument');
});

test('4 main clock: numerals, glide every frame, local time and full date inside the card', () => {
  const card = html.slice(html.indexOf('<article class="clock-card"'), html.indexOf('</article>', html.indexOf('<article class="clock-card"')));
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(card, /id="clockNumerals"/);
  assert.match(card, /id="liveClock"/);
  assert.match(card, /id="dateLabel"/);
  assert.match(card, /id="hijriDateLabel"/);
  assert.match(app, /function ensureAnalogSweep\(\)/);
  assert.match(app, /requestAnimationFrame\(step\)/);
});

test('10 opening view: viewport-relative sizing, hero row and a self-correcting fit', () => {
  assert.match(css, /--hero-h: clamp\(/);
  assert.match(css, /--topbar-h: clamp\(/);
  const fit = app.slice(app.indexOf('function fitAboveFold'), app.indexOf('function render()'));
  // [retired in v2.2.0: the user asked that the UI never shrinks to fit several events] the iterative zoom-out fit is gone
  assert.doesNotMatch(fit, /Math\.max\(0\.7/, 'v2.2.0: no scale-down');
  assert.match(fit, /shell\.style\.zoom = ''/);
  assert.match(app, /addEventListener\('resize'[\s\S]{0,80}updateSky\(true\); scheduleFoldFit\(\)/);
});

test('9 reward disc is back at its original size, so recognition phrases and الحمد لله are readable', () => {
  assert.match(css, /--pv: min\(8\.25rem, calc\(var\(--hero-h\) - \.9rem\)\)/);
  assert.match(css, /body \.home-board \.progress-visual \{ width: var\(--pv\)/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /body \.home-board \.recog-ar \{ font-size: clamp\(\.55rem, 9\.5cqw/);
  assert.ok(css.lastIndexOf('body .home-board .progress-visual { width: var(--pv)') > css.lastIndexOf('.home-board .progress-visual { width: 3.35rem'), 'the override comes after the 3.35rem rule');
});

test('5 coordinates card reads exactly "coordinates: (lat, lon)"', () => {
  assert.match(app, /`\(\$\{state\.lat\.toFixed\(4\)\}, \$\{state\.lon\.toFixed\(4\)\}\)`/);
  assert.match(app, /`coordinates: \$\{coords\}`/);
  // [retired in v2.2.0: coordinates became an instrument-style plate, a button with an engraved mark, "23.8103° N  90.4125° E" and the place name]
  assert.match(html, /<button class="coord-card" id="locationLabel" type="button"[^>]*>coordinates: \(—, —\)</);
});

test('6 Mark Complete records only the main tick and closes the card; the tick alone never closes it', () => {
  const mark = app.slice(app.indexOf('function markEventComplete'), app.indexOf('/* Gregorian and Hijri'));
  assert.doesNotMatch(mark, /for \(const part of eventParts/, 'sub-ticks that are still empty stay empty');
  assert.match(mark, /bucket\[key\] = true/);
  assert.match(mark, /\(record\.closed \|\|= \{\}\)\[`\$\{kind\}:\$\{key\}`\] = true/);
  const live = app.slice(app.indexOf('function renderLiveEvents'), app.indexOf('function renderFard'));
  assert.ok(live.indexOf('includeFard: true') !== -1 && live.indexOf('includeFard: true') < live.indexOf('data-mark-complete'), 'Fard circle is with the parts, before Mark Complete');
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /body \.home-board \.live-tick-stack \{ flex-direction: column/);
});

test('7/8 Undo prayer is gone from the homepage, including the voluntary card', () => {
  const home = app.slice(app.indexOf('function renderLiveEvents'), app.indexOf('function renderFard'));
  assert.doesNotMatch(home, /Undo prayer|is-undo/);
  const voluntary = app.slice(app.indexOf('function appendOtherVoluntaryCard'), app.indexOf('function renderSituational'));
  assert.doesNotMatch(voluntary, /Undo prayer|is-undo|rak‘ahs<\/div>/);
  assert.match(voluntary, /\+2 rak‘ahs/);
});

test('1 Bangla: new strings, no letter-spacing on Bangla text', () => {
  for (const key of ['Mark Complete', 'Prayer', 'Page Up', 'Page Down', 'Enter / Space']) assert.ok(app.includes(`'${key}':'`), key);
  assert.match(css, /html\[lang="bn"\] body, html\[lang="bn"\] body \* \{ letter-spacing: 0 !important; \}/);
  assert.match(app, /function timezoneText\(\)/);
  assert.match(app, /শুরু \$\{fmt\(countdownState\.start\)\} · শেষ/);
});
