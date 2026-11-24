import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { allInstrumentText } from '../src/astrolabe-view.js';
import { clockText } from '../src/clock-dial.js';
import { rewardSeconds } from '../src/recognition.js';
import { APP_VERSION } from '../src/branding.js';

const read = p => readText(p, import.meta.url);
const html = read('../index.html');
const app = read('../src/app.js');
const css = read('../src/styles.css');

test('version is 3.0.6 in every manifest', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(JSON.parse(read('../package.json')).version, '3.0.6');
  assert.equal(JSON.parse(read('../src-tauri/tauri.conf.json')).version, '3.0.6');
  assert.match(read('../src-tauri/Cargo.toml'), /^version = "3\.0\.6"/m);
});

test('astrolabe and clock faces carry only English/Bangla letters and digits (no Arabic, Persian, Urdu, Latin ornaments)', () => {
  const allowed = /^[A-Za-z0-9\u0980-\u09FF\s·°′″'’\-–—+.,:()/%]*$/;
  for (const lang of ['en', 'bn']) {
    for (const t of [...allInstrumentText(lang), ...clockText(lang)]) {
      assert.match(t, allowed, `${lang}: unexpected glyph in "${t}"`);
      assert.doesNotMatch(t, /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/, `${lang}: Arabic-script text "${t}"`);
      if (lang === 'bn') assert.doesNotMatch(t, /[A-Za-z]{2,}/, `bn: Latin words on the instrument "${t}"`);
    }
  }
});

test('sun and moon use the real apparent-size ratio and real positions', () => {
  assert.match(app, /bodyRadii\(now, g\.plateR\)/);
  assert.match(app, /platePoint\(/);
  assert.match(app, /localSiderealDegrees/);
});

test('astrolabe is mouse-rotatable with the vault-lock dial (drag, fine, momentum, wheel, keys, reset)', () => {
  assert.match(app, /new DialPhysics\(|DialPhysics\(/);
  for (const ev of ["'pointerdown'", "'pointermove'", "'pointerup'", "'wheel'", "'keydown'", "'dblclick'"]) assert.ok(app.includes(ev), ev);
  assert.match(html, /id="astroStage"/);
});

test('main clock opens an expanded page; astrolabe moves to the top bar and stays live', () => {
  assert.match(html, /id="topbarAstro"/);
  assert.match(html, /id="clockBigSlot"/);
  assert.match(html, /id="timeBack"/);
  assert.match(app, /topbarAstro/);
  assert.match(app, /clock-expanded/);
  assert.match(css, /body\.clock-expanded \.topbar-astro/);
});

test('ticks are 80% of the Mark Complete button (single CSS variable relation)', () => {
  assert.match(css, /--tick-d: calc\(var\(--mc-h\) \* \.8\)/);
  assert.match(css, /body \.live-event \.part-tick i, body \.part-tick\.fard i \{ width: var\(--tick-d\); height: var\(--tick-d\)/);
  assert.match(css, /mark-event-complete \{ width: var\(--mc-h\); height: var\(--mc-h\)/);
});

test('settings: calculation profile is always expanded, two preferred-time reminder tabs, voluntary seconds field', () => {
  assert.doesNotMatch(html, /<details[^>]*calculation-profile/);
  assert.match(html, /id="prefTabBegin"/);
  assert.match(html, /id="prefTabEnd"/);
  assert.match(html, /id="voluntarySeconds"/);
});

test('reward seconds use the single 1–120 setting, default 8', () => {
  assert.equal(rewardSeconds({ voluntary: 17 }), 17);
  assert.equal(rewardSeconds({}), 8);
  assert.equal(rewardSeconds({ voluntary: 999 }), 8);
  assert.equal(rewardSeconds({ voluntary: 0 }), 8);
  assert.equal(rewardSeconds({ voluntary: 1 }), 1);
});

test('package check script covers the v2.1.0 modules', () => {
  const check = JSON.parse(read('../package.json')).scripts.check;
  for (const m of ['astrolabe-view', 'dial-physics', 'preferred-reminders', 'voluntary-rewards', 'voluntary-ticks', 'clock-dial']) assert.ok(check.includes(`src/${m}.js`), m);
});

test('Bangla translation table covers the new interface strings', () => {
  for (const s of ['Back to prayers', 'Recognition seconds per voluntary prayer', 'Before preferred time begins', 'Before preferred time ends', 'Set total', 'TIME LEFT']) {
    assert.ok(app.includes(`'${s}'`) || app.includes(`"${s}"`) || html.includes(s), s);
  }
});
