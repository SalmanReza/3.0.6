import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { detailMarkup, reteDetailMarkup, starLabelsMarkup, starLabelList, allInstrumentText, CARDINALS } from '../src/astrolabe-view.js';
import { rewardSeconds } from '../src/recognition.js';

const read = p => readText(p, import.meta.url);
const app = read('../src/app.js');
const css = read('../src/styles.css');
const html = read('../index.html');

test('v2.1.1 detail layers carry only English or Bangla letters and digits', () => {
  const allowed = /^[A-Za-z0-9\u0980-\u09FF\s·°′″'’\-–—+.,:()/%]*$/;
  for (const lang of ['en', 'bn']) {
    const texts = [...allInstrumentText(lang)];
    assert.ok(texts.length > 60, 'the detail layers add printed text');
    for (const t of texts) {
      assert.match(t, allowed, `${lang}: "${t}"`);
      assert.doesNotMatch(t, /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/);
      if (lang === 'bn') assert.doesNotMatch(t, /[A-Za-z]{2,}/, `bn: "${t}"`);
    }
  }
  assert.deepEqual(Object.keys(CARDINALS).map(Number), [0, 90, 180, 270]);
});

test('v2.1.1 detail: 1° limb scale, 5-minute marks, named stars in both languages', () => {
  const d = detailMarkup(23.81, 'en');
  const limb = d.match(/class="av-d-limb"[\s\S]*?<\/g>/)[0];
  const segs = (limb.match(/M[\d.\-]+ [\d.\-]+L/g) || []).length;
  assert.equal(segs, 360, 'one tick per degree');
  assert.ok(d.includes('>330<') && d.includes('>0<'), 'degree numerals every 30°');
  assert.ok(reteDetailMarkup().length > 5000);
  const en = starLabelList('en').map(s => s.label), bn = starLabelList('bn').map(s => s.label);
  assert.ok(en.length >= 10 && en.includes('Sirius') && bn.includes('লুব্ধক'));
  assert.ok(starLabelsMarkup('bn').includes('data-star="Vega"'));
  assert.ok(detailMarkup(23.81, 'bn').includes('>পূ<') && detailMarkup(23.81, 'bn').includes('১০°'));
});

test('v2.1.1 astrolabe page, flip, click-vs-drag and persistence are wired', () => {
  assert.match(html, /id="astroView"/);
  assert.match(html, /id="astroFlipBtn"/);
  assert.match(html, /id="avMirror"/);
  assert.match(html, /id="topbarClock"/);
  assert.match(app, /function openAstroView\(\)/);
  assert.match(app, /function flipAstrolabe\(\)/);
  assert.match(app, /press\?\.moved/, 'a drag never counts as a click');
  assert.match(app, /window\.clearTimeout\(openTimer\)/, 'double-click (reset) cancels the pending open');
  assert.match(app, /rotateY\(90deg\)/, '3D coin flip');
  assert.match(app, /astro: sanitizeAstro\(saved\.astro\)/, 'rotation and flip restored from saved data');
  assert.match(app, /state\.astro = \{ angle:/, 'rotation and flip are saved');
  assert.match(css, /body\.astro-expanded \.topbar-clock/);
  assert.match(css, /body\.astro-expanded \.astro-big-slot \.astro-top, body\.astro-expanded \.astro-big-slot \.astro-foot \{ display: none; \}/, 'nothing printed twice');
});

test('v2.1.1 forbidden card: calm pause design, no icon, amber', () => {
  const fn = app.slice(app.indexOf('function forbiddenCardHtml'), app.indexOf('function activeProhibited'));
  assert.match(fn, /forbidden-progress/);
  assert.match(fn, /forbidden-next/);
  assert.match(fn, /countdown-card/);
  assert.doesNotMatch(fn, /<svg|<img|⚠/, "no icon");
  const rule = css.split('\n').find(l => l.startsWith('.forbidden-card {'));
  assert.match(rule, /#c9953c/);
  assert.doesNotMatch(rule, /8f6cff|#b3122e|red/i, 'no violet or red alert colours');
});

test('v2.1.1 rewards: panel, expiry repaint, phrases stay out of the disc', () => {
  assert.match(app, /function scheduleRewardClear\(seconds\)/);
  assert.match(app, /scheduleRewardClear\(Math\.max\(seconds, verseShow \? verseSeconds\(state\.recognitionPace\) : 0\)\);/, 'recognition schedules its own repaint');
  assert.doesNotMatch(app.slice(app.indexOf('function renderProgress')), /core\.append\(ar, tr, meaning\)/, 'phrases are no longer squeezed into the disc');
  assert.equal(rewardSeconds({ voluntary: 5 }), 5);
});

import { placeNumeral, BATON_INNER, NUMERAL_GAP } from '../src/clock-dial.js';
test('v2.1.1 clock numerals 6 and 9: identical clear gap to the baton, optically centred, whatever the glyph size', () => {
  // a tall 6 (7.9 high, 5.8 wide) and a narrower, shorter 9 (7.6 high, 5.6 wide), ink boxes relative to anchor/baseline
  const six = placeNumeral(6, { left: -2.9, right: 2.9, top: -7.9, bottom: 0.2 });
  const nine = placeNumeral(9, { left: -2.8, right: 2.8, top: -7.6, bottom: 0.1 });
  assert.ok(Math.abs((BATON_INNER - six.edge) - NUMERAL_GAP) < 1e-9);
  assert.ok(Math.abs((BATON_INNER - nine.edge) - NUMERAL_GAP) < 1e-9);
  // ink centre lies exactly on the hour axis
  assert.ok(Math.abs(six.x + (-2.9 + 2.9) / 2 - 100) < 1e-9);
  assert.ok(Math.abs(nine.y + (-7.6 + 0.1) / 2 - 100) < 1e-9);
  // a taller glyph is pushed further in so its gap does not shrink
  assert.ok(six.radius < nine.radius + 0.5);
});
