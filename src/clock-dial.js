/* Swiss-style main clock artwork (v2.1.0): polished steel case, fluted bezel, sunburst dial with applied indices,
   a railway minute track, a date window, dauphine hour and minute hands and a counterweighted seconds hand.
   String builders only (testable in Node). Text is English or Bangla, nothing else. */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const clockDigits = (value, lang) => String(value).replace(/[0-9]/g, d => (lang === 'bn' ? BN_DIGITS[Number(d)] : d));
const f = n => (Math.round(n * 100) / 100).toString();
const polar = (r, deg) => ({ x: 100 + r * Math.sin(deg * Math.PI / 180), y: 100 - r * Math.cos(deg * Math.PI / 180) });

/* The numerals sit under the inner end of their baton. BATON_INNER is that end (radius from the centre); GAP is the clear space
   between the baton and the nearest edge of the digit's ink, the same for every numeral. */
export const NUMERAL_HOURS = Object.freeze([6, 9]);
export const BATON_INNER = 60.5;
export const NUMERAL_GAP = 5.2;

/**
 * Where to put a numeral so that the gap to its baton is identical for 6 and 9 and the glyph is optically centred on the hour
 * axis whatever its width or height. `ink` is the glyph's measured ink box relative to the text anchor and baseline
 * ({ left, right, top, bottom } in dial units, y down: top is negative above the baseline). Returns the text x/y and the radius of the ink centre.
 */
export function placeNumeral(hour, ink, { cx = 100, cy = 100, inner = BATON_INNER, gap = NUMERAL_GAP } = {}) {
  const deg = hour * 30, sin = Math.sin(deg * Math.PI / 180), cos = Math.cos(deg * Math.PI / 180);
  const halfW = (ink.right - ink.left) / 2, halfH = (ink.bottom - ink.top) / 2;
  // extent of the ink along the radial direction (the hour axis points from the centre towards the hour)
  const halfRadial = Math.abs(sin) * halfW + Math.abs(cos) * halfH;
  const radius = inner - gap - halfRadial;
  const centreX = cx + radius * sin, centreY = cy - radius * cos;
  return { x: centreX - (ink.left + ink.right) / 2, y: centreY - (ink.top + ink.bottom) / 2, radius, edge: radius + halfRadial };
}

export const CLOCK_WORDS = Object.freeze({ caption: ['LOCAL TIME', 'স্থানীয় সময়'] });

export function clockDefs() {
  return `
<linearGradient id="ckCase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".3" stop-color="#9ba5ad"/><stop offset=".55" stop-color="#eef1f4"/><stop offset=".8" stop-color="#7f8a93"/><stop offset="1" stop-color="#d7dce0"/></linearGradient>
<linearGradient id="ckBezel" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d666e"/><stop offset=".5" stop-color="#cfd5da"/><stop offset="1" stop-color="#4c555d"/></linearGradient>
<radialGradient id="ckDial" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#2d3640"/><stop offset=".72" stop-color="#171d23"/><stop offset="1" stop-color="#0d1115"/></radialGradient>
<linearGradient id="ckIndex" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".5" stop-color="#b6bec5"/><stop offset="1" stop-color="#f2f4f6"/></linearGradient>
<linearGradient id="ckHand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b4bcc3"/><stop offset="1" stop-color="#f1f3f5"/></linearGradient>
<radialGradient id="ckGold" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d9ae55"/><stop offset="1" stop-color="#8a6422"/></radialGradient>
<linearGradient id="ckGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="ckDialClip"><circle cx="100" cy="100" r="87"/></clipPath>`;
}

export function clockDialMarkup(lang = 'en') {
  let out = '';
  out += `<circle cx="100" cy="100" r="98" fill="url(#ckCase)"/>`;
  out += `<circle cx="100" cy="100" r="97" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`;
  let flutes = '';
  for (let i = 0; i < 120; i++) { const a = polar(97.5, i * 3), b = polar(93.4, i * 3); flutes += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; }
  out += `<path d="${flutes}" stroke="#5a636b" stroke-opacity=".55" stroke-width=".55" fill="none"/>`;
  out += `<circle cx="100" cy="100" r="92.4" fill="url(#ckBezel)"/>`;
  out += `<circle cx="100" cy="100" r="89.4" fill="#05080a"/>`;
  out += `<circle cx="100" cy="100" r="87.4" fill="url(#ckDial)"/>`;
  // sunburst
  let rays = '';
  for (let i = 0; i < 180; i++) { const b = polar(88, i * 2); rays += `M100 100L${f(b.x)} ${f(b.y)}`; }
  out += `<g clip-path="url(#ckDialClip)"><path d="${rays}" stroke="#fff" stroke-opacity=".05" stroke-width=".7" fill="none"/></g>`;
  out += `<circle cx="100" cy="100" r="86" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".6"/>`;
  // railway minute track
  let minor = '', fives = '';
  for (let i = 0; i < 60; i++) {
    const five = i % 5 === 0;
    const a = polar(85, i * 6), b = polar(five ? 79.5 : 81.8, i * 6);
    const seg = `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
    if (five) fives += seg; else minor += seg;
  }
  out += `<circle cx="100" cy="100" r="82.6" fill="none" stroke="#c7cfd6" stroke-opacity=".55" stroke-width=".5"/>`;
  out += `<path d="${minor}" stroke="#d4dae0" stroke-opacity=".85" stroke-width=".6" fill="none"/><path d="${fives}" stroke="#ffffff" stroke-width="1.3" fill="none"/>`;
  // applied rhodium baton indices; double baton at 12
  for (let h = 0; h < 12; h++) {
    const deg = h * 30;
    const three = h === 3;       // the date window sits here
    if (three) continue;
    const bars = h === 0 ? [-3.1, 3.1] : [0];
    for (const dx of bars) {
      const w = h % 3 === 0 ? 3.6 : 2.7;
      const len = h % 3 === 0 ? 17 : 14;
      out += `<g transform="rotate(${deg} 100 100)"><rect x="${f(100 + dx - w / 2)}" y="${f(100 - 77.5)}" width="${w}" height="${len - (h === 0 ? 1 : 0)}" fill="url(#ckIndex)" stroke="#05080a" stroke-width=".5"/><rect x="${f(100 + dx - w / 2 + .85)}" y="${f(100 - 77.5 + 1.5)}" width="${f(w - 1.7)}" height="${len - 3}" fill="#bfe8c6" opacity=".55"/></g>`;
    }
  }
  // numerals 6 and 9 (12 is carried by the double baton); small, upright
  // (v2.1.1) Drawn at a first-guess place; the app then measures the real ink of each glyph and places it optically (see placeNumeral).
  for (const hour of NUMERAL_HOURS) {
    const p = polar(56, hour * 30);
    out += `<text x="${f(p.x)}" y="${f(p.y)}" class="ck-num" data-hour="${hour}" text-anchor="middle">${clockDigits(hour, lang)}</text>`;
  }
  // date window at three o'clock
  out += `<rect x="131" y="92.5" width="25" height="15" rx="1.6" fill="#05080a" stroke="url(#ckIndex)" stroke-width="1.1"/>`;
  out += `<rect x="132.2" y="93.7" width="22.6" height="12.6" rx="1" fill="#f1f3ee"/>`;
  out += `<text id="clockDateWin" x="143.5" y="100.4" class="ck-date" text-anchor="middle" dominant-baseline="central">1</text>`;
  // caption
  out += `<text x="100" y="132" class="ck-caption" text-anchor="middle">${CLOCK_WORDS.caption[lang === 'bn' ? 1 : 0]}</text>`;
  return out;
}

/** Hands, drawn pointing at twelve about the centre (100,100); the app rotates each group. */
export function clockHandsMarkup() {
  const hour = `<path d="M100 56L104.4 92L100 108L95.6 92Z" fill="url(#ckHand)" stroke="#05080a" stroke-width=".7" stroke-linejoin="round"/><path d="M100 63L102 90L100 98L98 90Z" fill="#bfe8c6" opacity=".7"/>`;
  const minute = `<path d="M100 28L103.6 90L100 110L96.4 90Z" fill="url(#ckHand)" stroke="#05080a" stroke-width=".7" stroke-linejoin="round"/><path d="M100 36L101.7 88L100 98L98.3 88Z" fill="#bfe8c6" opacity=".7"/>`;
  const second = `<path d="M100 14L100.9 100L99.1 100Z" fill="#d9ae55"/><path d="M99.2 100L100.8 100L101.4 122L98.6 122Z" fill="#d9ae55"/><circle cx="100" cy="118" r="3.1" fill="#d9ae55"/><circle cx="100" cy="30" r="2.3" fill="none" stroke="#d9ae55" stroke-width=".9"/>`;
  return { hour, minute, second };
}

export function clockCapMarkup() {
  return `<circle cx="100" cy="100" r="5.2" fill="url(#ckGold)" stroke="#6e5019" stroke-width=".5"/><circle cx="100" cy="100" r="1.7" fill="#0b0f12"/>`;
}

export function clockGlassMarkup() {
  return `<path d="M24 78A80 80 0 0 1 176 78A100 100 0 0 0 24 78Z" fill="url(#ckGlass)" opacity=".55"/>`;
}

export function clockText(lang = 'en') {
  return [...clockDialMarkup(lang).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
}
