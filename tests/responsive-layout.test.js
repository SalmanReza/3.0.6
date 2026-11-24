import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readText } from './helpers/read-text.js';

const css = readText('../src/styles.css', import.meta.url);
const config = JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url));

test('UI scale responds smoothly to window width and height', () => {
  assert.match(css, /html\s*\{[^}]*font-size:\s*clamp\(14px,\s*calc\(12\.8px\s*\+\s*0\.32vw\s*\+\s*0\.18vh\),\s*28px\)/s);
  assert.match(css, /body\s*\{[^}]*font-size:\s*\.875rem/s);
});

test('component geometry uses scalable rem sizing', () => {
  assert.match(css, /\.app-shell\s*\{[^}]*container:\s*app-shell\s*\/\s*inline-size/s);
  assert.match(css, /\.app-shell\s*\{[^}]*width:\s*min\(3400px,\s*100%\)/s);
  assert.match(css, /\.next-card\s*\{[^}]*padding:\s*1\.6875rem/s);
  assert.match(css, /\.prayer-card\s*\{[^}]*padding:\s*0?\.9375rem/s);
});

test('wide and narrow windows have container-based layouts', () => {
  assert.match(css, /@container app-shell\s*\(min-width:\s*1450px\)/);
  assert.match(css, /@container app-shell\s*\(min-width:\s*1900px\)/);
  assert.match(css, /@container app-shell\s*\(max-width:\s*1100px\)/);
  assert.match(css, /@container app-shell\s*\(max-width:\s*780px\)/);
});

test('desktop window opens maximized and remains resizable at a practical minimum size', () => {
  const window = config.app.windows.find(item => item.label === 'main');
  assert.equal(window.maximized, true);
  assert.equal(window.resizable, true);
  assert.equal(window.minWidth, 640);
  assert.equal(window.minHeight, 480);
  assert.equal(window.width, 1280);
  assert.equal(window.height, 800);
});

test('4K desktop fullscreen keyboard controls are wired', () => {
  const app = readText('../src/app.js', import.meta.url);
  const keyboard = readText('../src/keyboard.js', import.meta.url);
  const capability = JSON.parse(readText('../src-tauri/capabilities/default.json', import.meta.url));
  assert.match(app, /getCurrentWindow/);
  assert.match(app, /shortcutFor\(event, \{ helpOpen: keyboardHelp\.open \}\)/);
  assert.match(keyboard, /key === 'F11'/);
  assert.match(keyboard, /key === 'Escape'/);
  for (const key of ['Home', 'PageUp', 'PageDown', 'End', '?']) assert.ok(keyboard.includes(`key === '${key}'`), `missing ${key} shortcut`);
  assert.match(app, /keyboardHelp\.showModal\(\)/);
  // core:default only grants read-only window commands; setFullscreen needs its own permission.
  assert.ok(capability.permissions.includes('core:window:allow-set-fullscreen'));
});

test('voluntary and situational reference cards match the obligatory-card grid while retaining readable content', () => {
  assert.match(css, /\.ref-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.ref-card\s*\{[^}]*padding:\s*\.7rem\s+\.75rem\s+\.8rem/s);
  assert.match(css, /\.ref-quote blockquote\s*\{[^}]*font-size:\s*\.72rem/s);
  assert.match(css, /\.ref-practical\s*\{[^}]*font-size:\s*\.56rem/s);
  assert.ok(css.lastIndexOf('@container app-shell (max-width: 780px)') > css.indexOf('.ref-grid { display:grid;'));
  assert.ok(css.lastIndexOf('@media (max-width: 780px)') > css.indexOf('.ref-grid { display:grid;'));
  assert.match(css.slice(css.lastIndexOf('@container app-shell (max-width: 780px)'), css.length), /\.ref-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css.slice(css.lastIndexOf('@media (max-width: 780px)'), css.length), /\.ref-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});


test('voluntary and situational cards match the Fard-card grid with all information visible inline', () => {
  assert.match(css, /\.voluntary-list,\s*\n\.situational-list\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@container app-shell \(max-width: 780px\)\s*\{[^}]*\.voluntary-list,[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  const app = readText('../src/app.js', import.meta.url);
  assert.doesNotMatch(app, /<details class="voluntary-disclosure"/);
  assert.match(app, /data-compact-eta="true"/);
  assert.match(app, /cardCountdown\(\{ now, start, end, lang: lang\(\) \}\)/);
  assert.match(css, /\.voluntary-item \.ref-card \{/);
  assert.match(css, /\.voluntary-item \.rakah-control \{/);
  assert.doesNotMatch(app, /data-voluntary-record=/); // v3.0.2 B1: no Record completion on description cards
  assert.match(app, /otherVoluntaryAdd/);
  assert.match(app, /recordOtherNafl\(2\)/);
  assert.match(app, /referenceCardHtml\(event\.key/);
  assert.match(app, /referenceCardHtml\(key, prayerName\(key\), 'weekly-situational'/);
});


test('simultaneous live prayer-event cards use a consistent grid and a clear four-zone composition', () => {
  const layout = css.slice(css.lastIndexOf('/* v2.5.3 event-card composition'));
  assert.match(layout, /body \.live-events\s*\{[^}]*display:\s*grid/s);
  assert.match(layout, /grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 31rem\), 1fr\)\)/);
  assert.match(layout, /body \.live-events > \.live-event\s*\{[^}]*grid-template-rows:\s*auto auto 1fr auto/s);
  assert.match(layout, /\.live-event-head\s*\{/);
  assert.match(layout, /\.live-event-evidence\s*\{/);
  assert.match(layout, /\.live-event-tracking\s*\{/);
  assert.match(layout, /\.live-event-footer\s*\{/);
  assert.match(layout, /\.mark-event-complete\s*\{[^}]*height:\s*2\.55rem/s);
});

test('live prayer-event markup separates identity, evidence, rakah tracking and completion action', () => {
  const app = readText('../src/app.js', import.meta.url);
  const render = app.slice(app.indexOf('function renderLiveEvents()'), app.indexOf('function renderFard('));
  for (const zone of ['live-event-head', 'live-event-evidence', 'live-event-tracking', 'live-event-footer']) {
    assert.ok(render.includes(zone), `missing ${zone}`);
  }
  assert.ok(render.indexOf('live-event-head') < render.indexOf('live-event-evidence'));
  assert.ok(render.indexOf('live-event-evidence') < render.indexOf('live-event-tracking'));
  assert.ok(render.indexOf('live-event-tracking') < render.indexOf('live-event-footer'));
  assert.match(render, /data-event-countdown="true"/);
  assert.match(render, /data-mark-complete=/);
  assert.match(render, /voluntaryTicksHtml\(event\)/);
  assert.match(render, /partsHtml\(event\.key, event\.date, true/);
});
