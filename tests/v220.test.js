import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { BRAND_MARK_SVG, APP_VERSION } from '../src/branding.js';

const read = p => readText(p, import.meta.url);
const app = read('../src/app.js');
const css = read('../src/styles.css');
const html = read('../index.html');

test('v2.2.0 the UI is never scaled down to fit several events', () => {
  const fit = app.slice(app.indexOf('function fitAboveFold'), app.indexOf('function render()'));
  assert.doesNotMatch(fit, /Math\.max\(0\.7|zoom = scale|for \(let pass/, 'no scale-down loop');
  assert.match(fit, /shell\.style\.zoom = ''/);
  assert.equal(APP_VERSION, '3.0.6');
});

test('v2.2.0 countdown page: horizontal panel, three columns, stacks below 900px, centred information card without a preferred-time card', () => {
  assert.match(html, /<div class="cf-left">[\s\S]*id="countdownTitle"[\s\S]*<div class="cf-centre">[\s\S]*id="countdownLarge"[\s\S]*id="countdownStart"/);
  assert.match(css, /body #countdownView \.countdown-focus \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 900px\) \{\s*body #countdownView \.countdown-focus \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.page-cards\.no-best #eventPrayerCard \{ grid-column: 1 \/ -1; justify-self: center/);
  assert.match(app, /classList\.toggle\('no-best', phase === 'none' \|\| phase === 'expired'\)/);
});

test('v2.2.0 astrolabe rotation is locked until Rotate is on; the state is not saved but the angle is', () => {
  assert.match(html, /id="astroRotateBtn"[^>]*aria-pressed="false"/);
  assert.match(html, /id="astroTools"/);
  assert.match(app, /let avRotateOn = false;/);
  assert.match(app, /if \(!avRotateOn\) return; \/\/ locked: dragging does nothing/);
  assert.match(app, /currentPage === 'astro' \|\| avRotateOn\) return;/, 'a click opens the page unless Rotate is on');
  assert.match(app, /if \(!avRotateOn\) return; \/\/ locked: the wheel scrolls the page/);
  assert.doesNotMatch(app.slice(app.indexOf('function persistAstro'), app.indexOf('function persistAstro') + 400), /avRotateOn/, 'the on/off state is never saved');
  assert.match(app, /state\.astro = \{ angle:/);
});

test('v2.2.0 Rotate and Flip share one premium design, inside the home panel and below the dial on the astrolabe page', () => {
  assert.match(css, /\.astro-tool, body \.topbar #settingsToggle\.settings-crown \{ position: relative;/);
  assert.match(css, /repeating-conic-gradient\(rgba\(0,0,0,\.34\) 0 1\.1deg/, 'knurled bezel');
  assert.match(css, /body \.sky-panel \.astro-stage > \.astro-tools \{ right: calc\(100% \+ 1rem\); bottom: 1rem; \}/);
  assert.match(css, /body\.astro-expanded \.astro-big-slot \.astro-stage > \.astro-tools \{[^}]*top: calc\(100% \+ \.5rem\)/);
  assert.doesNotMatch(css, /\.astro-flip-btn \{ position: absolute; right: -2%/, 'the old overlapping corner button is gone');
  assert.match(app, /Turn on Rotate, then drag/);
  assert.match(app, /“ঘোরান” চালু করুন, তারপর টানুন/);
});

test('v2.2.0 logo (replaced by logo B in v2.3.0): one artwork in the header, favicon, icon.svg', () => {
  const icon = read('../src-tauri/icons/icon.svg');
  assert.ok(html.includes(BRAND_MARK_SVG));
  assert.equal(read('../public/favicon.svg'), icon);
  for (const id of ['pBS', 'pBE', 'pBG', 'm1x']) assert.ok(icon.includes(id), id);
  assert.doesNotMatch(icon, /mihrab niche|minarets|clock face/);
});

test('v2.2.0 coordinates plate and settings crown', () => {
  assert.match(html, /<button class="coord-card" id="locationLabel" type="button"/);
  assert.match(html, /class="icon-button settings-crown" id="settingsToggle"/);
  assert.match(app, /function coordinatePlateHtml\(\)/);
  assert.match(app, /dir\(state\.lat, 'N', 'S'\)/);
  assert.match(app, /dir\(state\.lon, 'পূ', 'প'\)/);
  assert.match(app, /\$\('locationLabel'\)\.addEventListener\('click'/);
  assert.match(css, /settings-crown:hover svg \{ transform: rotate\(60deg\)/);
});

test('v2.2.0 astrolabe crispness: hairline floor, text floor, no pinned GPU layer, geometric precision', () => {
  assert.match(app, /function sharpenAstrolabe\(force = false\)/);
  assert.match(app, /const floor = 0\.8 \/ devicePerUnit;/);
  assert.match(app, /Math\.min\(Math\.max\(base, floor\), base \* 2\.5\)/);
  assert.match(app, /6\.4 \/ \(4\.3 \* css \/ AV\.size\)/);
  assert.doesNotMatch(css, /#avBody \{ will-change: transform; \}/);
  assert.doesNotMatch(css, /body \.astro-flip \{[^}]*will-change/, 'only while flipping');
  assert.match(css, /body \.astro-stage\.is-flipping \.astro-flip \{ will-change: transform; \}/);
  assert.match(css, /\.astro-svg, \.astro-svg text \{ text-rendering: geometricPrecision; shape-rendering: geometricPrecision; \}/);
  for (const cls of ['av-num', 'av-word', 'av-ecl', 'av-dnum', 'av-dnum2', 'av-dcard', 'av-star-label']) {
    assert.match(css, new RegExp(`\\.${cls} \\{ font: \\d+ calc\\([\\d.]+px \\* var\\(--av-tf, 1\\)\\) var`), cls);
  }
});
