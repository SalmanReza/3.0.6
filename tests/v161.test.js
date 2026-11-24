import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { SUNNI_EVIDENCE, JAFARI_EVIDENCE, evidenceFor } from '../src/prayer-evidence.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const brand = readText('../src/branding.js', import.meta.url);
const pkg = JSON.parse(readText('../package.json', import.meta.url));
const tauri = JSON.parse(readText('../src-tauri/tauri.conf.json', import.meta.url));

test('countdown page has three horizontal layers with equal second-row cards', () => {
  const page = /<main id="countdownView"[\s\S]*?<div class="page-cards">([\s\S]*?)<\/div>\s*<\/main>/.exec(html)?.[1] || '';
  const hero = page.indexOf('id="eventHero"');
  const preferred = page.indexOf('id="bestBlock"');
  const prayer = page.indexOf('id="eventPrayerCard"');
  const timing = page.indexOf('id="eventTimingCard"');
  assert.ok(hero >= 0 && preferred > hero && prayer > preferred && timing > prayer);
  assert.match(page, /id="eventPrayerCard"[\s\S]*id="eventRakahCard"[\s\S]*id="eventCompletionCard"/);
  assert.match(css, /#countdownView \.page-cards \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /#countdownView \.countdown-focus,[\s\S]*#countdownView #eventTimingCard \{ grid-column:1 \/ -1; \}/);
  assert.match(css, /#countdownView #bestBlock,[\s\S]*#countdownView #eventPrayerCard \{ grid-column:auto/);
});

test('preferred countdown updates live independently without re-rendering prayer controls each second', () => {
  assert.match(app, /function updateCountdownViewLive\(now = new Date\(\)\)/);
  assert.match(app, /const phase = preferredState\(pref, timestamp\)/);
  assert.match(app, /\$\('bestCountdown'\)\.textContent = countdown\(target - timestamp\)/);
  const tick = /function updateCountdownWidgets\(\) \{([\s\S]*?)\n\}/.exec(app)?.[1] || '';
  assert.match(tick, /updateCountdownViewLive\(now\)/);
  assert.doesNotMatch(tick, /renderCountdownView\(\)/);
  assert.match(app, /function renderCountdownView\(\)[\s\S]*?renderCountdownDetails\(\)/);
});

test('prayer event card contains school/date-specific Qur’an-first evidence, rakah guidance and completion controls', () => {
  assert.match(app, /referenceCardHtml\(key, countdownState\.title, 'countdown', \{ date \}\)/);
  assert.match(app, /referenceCardHtml outputs Qur'an first, then the school-specific hadith, then rak'ah guidance/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /rakahControlsHtml\(key, date\)/);
  assert.match(app, /data-mark-complete="\$\{countdownState\.kind\}"/);
  assert.match(app, /partsHtml\(key, date, open, \{ includeFard: true \}\)/);
  for (const [school, set] of [['hanafi', SUNNI_EVIDENCE], ['jafari', JAFARI_EVIDENCE]]) {
    for (const [key, entries] of Object.entries(set)) {
      if (entries.length > 1) {
        assert.equal(entries[0].kind, 'quran', `${key}: Qur'an should lead when both sources exist`);
        assert.equal(entries[1].kind, 'hadith', `${key}: hadith should follow Qur'an`);
      }
      const rendered = evidenceFor(key, school, 'en')?.items || [];
      if (rendered.length > 1) {
        assert.equal(rendered[0].kind, 'quran');
        assert.equal(rendered[1].kind, 'hadith');
      }
    }
  }
});

test('astrolabe sun and moon keep their true apparent-size ratio', () => {
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(html, /sky-sun-instrument-ring/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(html, /sky-moon-instrument-ring/);
  assert.doesNotMatch(html, /skyObservatoryGlow/);
  assert.doesNotMatch(app, /skyObservatoryGlow/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /scale\(\$\{scale\.toFixed\(3\)\}\)/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /const moonScale = radii\.moon \/ 10\.5/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(app, /scale\(\$\{moonScale\.toFixed\(3\)\}\)/);
  assert.doesNotMatch(app, /sunScale \* 0\.58/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /\.sky-sun-instrument-ticks/);
  // [retired in v2.1.0: superseded 2.0.1 design] assert.match(css, /\.sky-moon-instrument-ticks/);
});

test('version metadata is consistently 3.0.6', () => {
  assert.match(brand, /APP_VERSION = '3\.0\.6'/);
  assert.equal(pkg.version, '3.0.6');
  assert.equal(tauri.version, '3.0.6');
});
