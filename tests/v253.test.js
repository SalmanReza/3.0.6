import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VERSION } from '../src/branding.js';
import { verseSeconds, VERSE_SECONDS_DEFAULT, rewardSeconds } from '../src/recognition.js';
import { AV } from '../src/astrolabe-view.js';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);

test('v3.0.6 version, verse timer, hour band and voluntary begin reminders', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(VERSE_SECONDS_DEFAULT, 12);
  assert.equal(verseSeconds({}), 12);
  assert.equal(verseSeconds({ verse: 20 }), 20);
  assert.equal(verseSeconds({ verse: 0 }), 12);
  assert.equal(rewardSeconds({ voluntary: 8 }), 8);
  // Hour numerals (ring − 10) stay outside the clipped tympan, even where a curve is allowed to 1.18×.
  assert.ok(AV.plateR * 1.18 < AV.ring - 10, `plate ${AV.plateR} overlaps hour numerals at ${AV.ring - 10}`);
  assert.ok(AV.ring + 8 < AV.limb - 6, 'hour band stays inside the degree limb');
  assert.match(app, /PRE_BEGIN_KEYS = \[[^\]]*duha/);
  assert.match(app, /Remaining in this prohibited time/);
  assert.match(app, /function recordedRakahTotal/);
  assert.match(app, /id="fardVerseCard"|fardVerseCard/);
  assert.match(html, /id="verseSeconds"/);
  assert.match(html, /id="prayerView"/);
  assert.match(app, /includeFard: true/);
});
