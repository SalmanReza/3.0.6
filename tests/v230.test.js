import test from 'node:test';
import assert from 'node:assert/strict';
import { readText } from './helpers/read-text.js';
import { BRAND_MARK_SVG, APP_VERSION } from '../src/branding.js';

const read = p => readText(p, import.meta.url);
const app = read('../src/app.js');
const css = read('../src/styles.css');
const html = read('../index.html');

test('v2.3.0 version and logo B', () => {
  assert.equal(APP_VERSION, '3.0.6');
  const icon = read('../src-tauri/icons/icon.svg');
  assert.equal(icon, read('../scripts/logo-b.svg'));
  assert.equal(read('../public/favicon.svg'), icon);
  assert.ok(html.includes(BRAND_MARK_SVG));
  assert.match(icon, /<circle cx="276" cy="240" r="84"/, 'eccentric rete ring');
  assert.doesNotMatch(icon, /M170 282C|mihrab/, 'no pointed arch');
});

test('v2.3.0 tick sizes show rank: Mark Complete 100, Fard 90, Sunnah 80, Nafl / optional / voluntary 70', () => {
  assert.match(css, /--tick-fard: calc\(var\(--mc-h\) \* \.9\); --tick-sunnah: calc\(var\(--mc-h\) \* \.8\); --tick-nafl: calc\(var\(--mc-h\) \* \.7\)/);
  assert.match(css, /body \.live-event \.round-check \{ width: var\(--tick-fard\)/);
  assert.match(css, /\.part-tick\.nafl, body #eventCompletionCard \.part-tick\.nafl,\s*body \.live-event \.part-tick\.voluntary, body #eventCompletionCard \.part-tick\.voluntary \{ --own: var\(--tick-nafl\)/);
  assert.match(css, /width: var\(--own\); height: var\(--own\)/);
  assert.match(css, /\.part-tick\.nafl i, \.part-tick\.nafl\.done i \{ box-shadow: inset 0 0 0 \.0625rem var\(--layer-nafl-edge\)/, 'the light edge is inside the circle');
});

test('v2.3.0 settings crown has no hard-edged knurl teeth', () => {
  const crown = css.slice(css.indexOf('v2.3.0: settings crown edge smoothed'));
  assert.doesNotMatch(crown, /1\.1deg|transparent 0 67%/);
  assert.match(crown, /repeating-conic-gradient\(rgba\(0,0,0,\.075\) 0deg, rgba\(0,0,0,0\) 2\.4deg, rgba\(0,0,0,\.075\) 4\.8deg\)/);
});

test('v2.3.0 Rotate/Flip labels are translated and follow the on/off state', () => {
  assert.match(app, /function updateAstroToolLabels\(\)/);
  for (const k of ['Rotate the astrolabe: on (click to turn off)', 'Rotate the astrolabe: off (click to turn on)', 'Flip the astrolabe (flipped)', 'Flip the astrolabe (not flipped)', 'Rotate the astrolabe', 'Flip the astrolabe', 'Astrolabe controls']) {
    assert.ok(app.includes(`'${k}':'`), `BN_TEXT has "${k}"`);
  }
  assert.match(app, /el\.dataset\.originalTitle = en; el\.dataset\.originalAriaLabel = en;/, 'the generic translator can never bring English back');
  assert.match(app, /avRotateOn = !!on;[\s\S]*?updateAstroToolLabels\(\);/);
  assert.match(app, /applyAstroMirror[\s\S]*?updateAstroToolLabels\(\);\n  placeStarLabels/);
});
