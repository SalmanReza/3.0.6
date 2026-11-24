import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const html = readText('../index.html', import.meta.url);
const sky = readText('../src/sky.js', import.meta.url);

test('v1.5.1 voluntary cards and v1.7.1 situational records show inline evidence without disclosure UI', () => {
  const voluntary = app.slice(app.indexOf('function renderVoluntary'), app.indexOf('function renderSituational'));
  const situational = app.slice(app.indexOf('function renderSituational'), app.indexOf('function rakahControlsHtml'));
  assert.match(voluntary, /referenceCardHtml\(event\.key, prayerName\(event\.key\)\)\}`/); // v3.0.2 B1: nothing after the evidence card
  assert.doesNotMatch(voluntary, /rakahControlsHtml/, 'rak‘ah sets no longer live in the Additional worship cards');
  assert.doesNotMatch(voluntary, /data-voluntary-record=/);
  assert.doesNotMatch(voluntary, /<details|<summary|Details & actions/);
  assert.match(situational, /otherVoluntaryBar/);
  assert.match(situational, /recordOtherNafl/);
  assert.doesNotMatch(situational, /<details|<summary|Details & actions/);
  assert.match(css, /\.voluntary-item \.ref-card \{/);
  assert.match(css, /\.voluntary-item \.rakah-control \{/);
});

test('v1.5.1 voluntary countdowns share the Fard hours/minutes formatter and preserve click-through', () => {
  assert.match(app, /data-event-countdown="true" data-compact-eta="true" data-kind="voluntary"/);
  assert.match(app, /document\.querySelectorAll\('\.prayer-eta\[data-compact-eta\]'\)/);
  assert.match(app, /cardCountdown\(\{ now, start, end, lang: lang\(\) \}\)/);
  assert.match(app, /list\.querySelectorAll\('\[data-event-countdown\]'\)/);
  assert.match(app, /renderSituational\(\);\s*updateCardCountdowns\(\);/);
});

test('v1.5.1 observatory uses hand-drawn manuscript artwork while retaining the live astronomy engine and information', () => {
  // [retired in v2.1.0: superseded 2.0.1 design] for (const cls of ['sky-sun-rays','sky-sun-disc','sky-sun-engraving','sky-moon-lit','sky-moon-engraving','sky-moon-crater']) assert.ok(html.includes(`class="${cls}"`), `missing ${cls}`);
  assert.doesNotMatch(html, /celestial\/(?:sun|moon)\.png/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /function drawAstrolabeMater\(\)/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /ast-throne/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /ast-limb/);
  assert.match(app, /moonLitPath\(/);
  assert.match(app, /prohibitedIntervals\(times\)/);
  assert.match(html, /id="skyPosition"/);
  assert.match(html, /id="skyObservatoryFooter"/);
  assert.match(css, /Abbasid-era manuscript and astrolabe illustration treatment/);
  assert.match(sky, /export function sunPosition/);
  assert.match(sky, /export function moonPosition/);
});
