import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { azimuthSamples, BRIGHT_STARS, starHourAngle } from '../src/astrolabe.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);

test('v1.9.1 shows Qur’an alone when a verse exists, otherwise hadith', () => {
  assert.match(app, /const quran = items\.filter\(item => item\.kind === 'quran'\)/);
  assert.match(app, /quran\.length \? quran : items\.filter\(item => item\.kind === 'hadith'\)/);
  assert.match(app, /function leadEvidenceHtml\(key, date\)/);
  const live = app.slice(app.indexOf('function renderLiveEvents'), app.indexOf('function renderFard'));
  assert.match(live, /leadEvidenceHtml\(event\.key, event\.date\)/);
  assert.match(live, /data-mark-complete=/);
  assert.match(live, /Mark Complete/);
});

test('v1.9.1 puts a circular astrolabe on the left and a modern analog clock on the right', () => {
  assert.match(html, /class="instrument-row"/);
  assert.match(html, /id="analogClockButton"/);
  assert.match(html, /id="clockHour"/);
  assert.match(html, /id="liveClock"/);
  assert.ok(html.indexOf('id="skyPanel"') < html.indexOf('id="clockCard"'));
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /azimuthSamples\(state\.lat/);
  assert.match(app, /BRIGHT_STARS/);
  assert.match(app, /function paintAnalogClock/);
  assert.match(css, /\.instrument-row \{[^}]*grid-template-columns:/);
  assert.ok(azimuthSamples(23.8, 180).length > 4);
  assert.ok(BRIGHT_STARS.some(star => star.name === 'Sirius'));
  assert.ok(Number.isFinite(starHourAngle(new Date('2026-11-15T06:00:00Z'), 90.4, 101.287)));
});

test('v1.9.1 removes homepage undo and puts Undo prayer on weekly day cards', () => {
  const fard = app.slice(app.indexOf('function renderFard'), app.indexOf('function updateCardCountdowns'));
  const voluntary = app.slice(app.indexOf('function renderVoluntary'), app.indexOf('function otherNaflCount'));
  assert.doesNotMatch(fard, /Undo record/);
  assert.doesNotMatch(voluntary, /Undo record/);
  assert.match(app, /class="square-button is-undo undo-corner"/);
  assert.match(app, /function undoWeeklyRecord/);
  assert.match(css, /\.undo-corner \{[^}]*right:/);
  assert.match(css, /\.home-board \.hero-row \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
});

test('v1.9.1 keeps the reward phrase visible instead of forcing it transparent', () => {
  assert.doesNotMatch(css, /^\.pf-reward \{ opacity: 0; \}/m);
  assert.match(html, /class="progress-reward-mean"/);
  assert.match(app, /All praise is due to Allah/);
});
