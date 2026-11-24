import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { preferredWindow, preferredState } from '../src/preferred-times.js';
import { QURAN_REFLECTIONS, reflectionOfTime } from '../src/daily-reflections.js';
import { platePoint, jewelRadius, plateRadiusOf } from '../src/astrolabe.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);

test('preferred period is always painted under the main countdown and ticks every second', () => {
  assert.match(app, /id="timePreferred"/);
  assert.match(app, /function paintPreferred\(now = new Date\(\)\)/);
  assert.match(app, /paintPreferred\(now\)/);
  const live = /function updateTimeViewLive\(\) \{([\s\S]*?)\n\}/.exec(app)?.[1] || '';
  assert.match(live, /paintPreferred\(now\)/);
  const start = new Date('2026-11-14T06:00:00');
  const end = new Date('2026-11-14T12:00:00');
  const pref = preferredWindow('dhuhr', start, end, 'hanafi');
  assert.equal(preferredState(pref, new Date(start.getTime() - 1000)), 'upcoming');
  assert.equal(preferredState(pref, new Date(start.getTime() + 1000)), 'active');
  assert.equal(preferredState(pref, end), 'expired');
});

test('astrolabe jewels are equal and sit on stereographic hour angle', () => {
  const jewel = jewelRadius(140);
  assert.equal(jewel, 10);
  const south = platePoint(-23.44, 0, 100, 100, 70);
  const east = platePoint(0, 270, 100, 100, 70);
  assert.ok(south.y < 100, 'v2.0.1: the meridian is vertical and hour angle 0 (upper culmination) is at the top');
  assert.ok(east.x < 100, 'east is to the left');
  assert.ok(plateRadiusOf(0) < plateRadiusOf(-23));
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /radii\.sun \/ 10\.5/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /eclipticBandSamples\(beta, 120\)/);
  assert.match(html, /id="progressReward"/);
  assert.match(html, /قَدْ أَفْلَحَ الْمُؤْمِنُونَ/);
});

test('reflection of time is Qur’an only and holds until the signature changes', () => {
  assert.ok(QURAN_REFLECTIONS.length > 20);
  assert.ok(QURAN_REFLECTIONS.every(row => String(row[2]).startsWith('Q')));
  const memory = { signature: '', index: 0, stored: null };
  const storage = {
    getItem: () => memory.stored,
    setItem: (_key, value) => { memory.stored = value; }
  };
  globalThis.localStorage = storage;
  const first = reflectionOfTime({ signature: '2026-11-14|none|0', lang: 'en' });
  const held = reflectionOfTime({ signature: '2026-11-14|none|0', lang: 'bn' });
  assert.equal(held.code, first.code);
  assert.notEqual(held.text, first.text);
  const next = reflectionOfTime({ signature: '2026-11-14|all-done|1', lang: 'en' });
  assert.ok(next.code.startsWith('Q'));
  delete globalThis.localStorage;
});
