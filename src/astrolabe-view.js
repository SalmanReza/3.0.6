/* v2.1.0 astrolabe artwork: a precision-watchmaking instrument.
   Pure string builders (no DOM) so they can be unit-tested in Node. The only text this
   instrument ever contains is English or Bangla (letters and Western or Bengali digits),
   chosen through `lang`. No inscriptions, no ornamental pseudo-letters. */
import {
  platePoint, plateRadiusOf, altitudeSamples, azimuthSamples, samplesToPath,
  eclipticBandSamples, BRIGHT_STARS, jewelRadius, equatorialFromAltAz
} from './astrolabe.js';

export const AV = Object.freeze({ size: 400, cx: 200, cy: 200, limb: 192, ring: 164, plateR: 126 });

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const digitsFor = (value, lang) => String(value).replace(/[0-9]/g, d => (lang === 'bn' ? BN_DIGITS[Number(d)] : d));
const f = n => (Math.round(n * 100) / 100).toString();
const polar = (r, deg, cx = AV.cx, cy = AV.cy) => ({ x: cx + r * Math.sin(deg * Math.PI / 180), y: cy - r * Math.cos(deg * Math.PI / 180) });

export const STAR_LABELS = Object.freeze({
  Sirius: ['Sirius', 'লুব্ধক'], Arcturus: ['Arcturus', 'স্বাতী'], Vega: ['Vega', 'অভিজিৎ'], Capella: ['Capella', 'ব্রহ্মহৃদয়'],
  Procyon: ['Procyon', 'প্রোসিয়ন'], Betelgeuse: ['Betelgeuse', 'আর্দ্রা'], Altair: ['Altair', 'শ্রবণা'], Aldebaran: ['Aldebaran', 'রোহিণী'],
  Spica: ['Spica', 'চিত্রা'], Antares: ['Antares', 'জ্যেষ্ঠা'], Regulus: ['Regulus', 'মঘা'], Pollux: ['Pollux', 'পোলাক্স'], Rigel: ['Rigel', 'রিগেল']
});

/** The only words printed on the instrument, in both languages. */
export const DIAL_WORDS = Object.freeze({
  noon: ['NOON', 'মধ্যাহ্ন'], midnight: ['MIDNIGHT', 'মধ্যরাত'],
  horizon: ['HORIZON', 'দিগন্ত'], meridian: ['MERIDIAN', 'মধ্যরেখা'],
  ecliptic: ['ECLIPTIC', 'ক্রান্তিবৃত্ত'], hours: ['HOURS', 'ঘণ্টা']
});
const word = (key, lang) => DIAL_WORDS[key][lang === 'bn' ? 1 : 0];
export const starLabel = (name, lang) => (STAR_LABELS[name] || [name, name])[lang === 'bn' ? 1 : 0];

export function defsMarkup() {
  return `
<linearGradient id="avSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".28" stop-color="#aab3bb"/><stop offset=".52" stop-color="#eef1f4"/><stop offset=".78" stop-color="#8d979f"/><stop offset="1" stop-color="#d9dee2"/></linearGradient>
<linearGradient id="avSteelDark" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b747c"/><stop offset=".5" stop-color="#c3cad0"/><stop offset="1" stop-color="#58616a"/></linearGradient>
<radialGradient id="avPlate" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#2a3138"/><stop offset=".7" stop-color="#171c21"/><stop offset="1" stop-color="#0e1216"/></radialGradient>
<linearGradient id="avBlued" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a6bc0"/><stop offset=".5" stop-color="#1d3f86"/><stop offset="1" stop-color="#2a54a3"/></linearGradient>
<radialGradient id="avGold" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d9ae55"/><stop offset="1" stop-color="#8a6422"/></radialGradient>
<radialGradient id="avRuby" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#ff8f9d"/><stop offset=".5" stop-color="#c3112e"/><stop offset="1" stop-color="#6a0716"/></radialGradient>
<radialGradient id="avSun" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fffbe2"/><stop offset=".55" stop-color="#f5c862"/><stop offset="1" stop-color="#c98a2c"/></radialGradient>
<radialGradient id="avMoon" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#dfe6ef"/><stop offset="1" stop-color="#9aa7bd"/></radialGradient>
<linearGradient id="avGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
<pattern id="avStripes" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none"/><rect width="1.1" height="4" fill="#fff" opacity=".045"/></pattern>
<clipPath id="avPlateClip"><circle cx="${AV.cx}" cy="${AV.cy}" r="${AV.plateR}"/></clipPath>
<clipPath id="avSunClip"><circle r="10.7"/></clipPath>
<clipPath id="avMoonClip"><path id="avMoonClipPath" d=""/></clipPath>`;
}

/** Case, degree limb, then the 24-hour solar scale, then the tympan. The plate never enters the hour band. */
export function materMarkup(lang = 'en') {
  const { cx, cy, limb, ring, plateR } = AV;
  let out = '';
  out += `<circle cx="${cx}" cy="${cy}" r="${limb}" fill="url(#avSteel)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${limb - 1.2}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>`;
  // coin-edge fluting on the case
  let flutes = '';
  for (let i = 0; i < 180; i++) { const a = polar(limb, i * 2), b = polar(limb - 4.6, i * 2); flutes += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; }
  out += `<path d="${flutes}" stroke="#59626a" stroke-opacity=".55" stroke-width=".6" fill="none"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${limb - 6.2}" fill="url(#avSteelDark)"/>`;
  // hour band: black annulus inside the degree limb and outside the tympan
  out += `<circle cx="${cx}" cy="${cy}" r="${ring + 8}" fill="#0f1317"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${ring + 8}" fill="url(#avStripes)"/>`;
  // railroad: 96 quarter-hour ticks, 24 hour ticks (noon at the top, west on the right)
  let minor = '', major = '';
  for (let i = 0; i < 96; i++) {
    const deg = i * 3.75;
    const hour = i % 4 === 0;
    const a = polar(ring + 6, deg), b = polar(hour ? ring - 2 : ring + 2.2, deg);
    const seg = `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; if (hour) major += seg; else minor += seg;
  }
  out += `<path d="${minor}" stroke="#aeb7bf" stroke-width=".6" fill="none"/><path d="${major}" stroke="#f1f4f6" stroke-width="1.3" fill="none"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${ring - 16}" fill="none" stroke="#c9d0d6" stroke-opacity=".7" stroke-width=".7"/>`;
  // hour numerals sit in the hour band, clear of both the degree limb and the plate
  for (let h = 0; h < 24; h += 2) {
    const hour = (12 + h) % 24;
    const deg = h * 15;
    const p = polar(ring - 10, deg);
    out += `<text x="${f(p.x)}" y="${f(p.y)}" transform="rotate(${deg} ${f(p.x)} ${f(p.y)})" class="av-num" text-anchor="middle" dominant-baseline="central">${digitsFor(hour, lang)}</text>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${plateR + 6}" fill="url(#avSteel)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${plateR + 1.5}" fill="#0b0f12"/>`;
  return out;
}

/** The plate: Glashütte-ribbed anthracite with horizon, altitude circles, azimuths, tropics, twilights. */
export function plateMarkup(lat, lang = 'en') {
  const { cx, cy, plateR } = AV;
  let out = `<circle cx="${cx}" cy="${cy}" r="${plateR}" fill="url(#avPlate)"/><circle cx="${cx}" cy="${cy}" r="${plateR}" fill="url(#avStripes)"/>`;
  const R = plateR;
  const path = (samples, closed = false) => samplesToPath(samples, cx, cy, R, { closed, clip: false });
  // sky above the horizon
  const hor = altitudeSamples(lat, 0, 144);
  out += `<path d="${path(hor, true)}" fill="#3d5878" fill-opacity=".30" stroke="none"/>`;
  // twilight: -6, -12, -18
  const tw = [[-6, '.55'], [-12, '.4'], [-18, '.3']];
  for (const [alt, op] of tw) out += `<path d="${path(altitudeSamples(lat, alt, 144), true)}" fill="none" stroke="#9fb4cb" stroke-opacity="${op}" stroke-width=".7" stroke-dasharray="1.6 2.4"/>`;
  // tropics and equator
  for (const [dec, dash, op] of [[23.44, '2 3', .5], [0, '', .65], [-23.44, '', .8]]) {
    const r = plateRadiusOf(dec) * R;
    out += `<circle cx="${cx}" cy="${cy}" r="${f(r)}" fill="none" stroke="#c7cfd6" stroke-opacity="${op}" stroke-width="${dec === 0 ? .8 : .6}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  }
  // altitude circles every 10 degrees, azimuth lines every 15 degrees
  let alts = '', azs = '';
  for (let a = 10; a < 90; a += 10) alts += path(altitudeSamples(lat, a, 120), true);
  for (let az = 0; az < 360; az += 15) azs += path(azimuthSamples(lat, az, 0, 88, 22));
  out += `<path d="${alts}" fill="none" stroke="#cfd7de" stroke-opacity=".34" stroke-width=".55"/>`;
  out += `<path d="${azs}" fill="none" stroke="#cfd7de" stroke-opacity=".22" stroke-width=".5"/>`;
  // meridian cross and polar axes
  out += `<path d="M${cx} ${cy - R}V${cy + R}M${cx - R} ${cy}H${cx + R}" stroke="#e9eef2" stroke-opacity=".5" stroke-width=".7"/>`;
  // horizon in gold
  out += `<path d="${path(hor, true)}" fill="none" stroke="#e3c071" stroke-width="1.7"/>`;
  out += `<path d="${path(hor, true)}" fill="none" stroke="#fff3c4" stroke-opacity=".6" stroke-width=".5"/>`;
  // the only words on the plate
  out += `<text x="${cx}" y="${cy - R + 11}" class="av-word" text-anchor="middle">${word('noon', lang)}</text>`;
  out += `<text x="${cx}" y="${cy + R - 7}" class="av-word" text-anchor="middle">${word('midnight', lang)}</text>`;
  return out;
}

/** Rete drawn in its own frame (points sit at hour angle = -right ascension); the caller rotates it by local sidereal time. */
export function reteMarkup(lang = 'en') {
  const { cx, cy, plateR: R } = AV;
  const P = (dec, ra) => platePoint(dec, -ra, cx, cy, R);
  const ringPath = beta => {
    const pts = eclipticBandSamples(beta, 120).map(s => P(s.declination, s.rightAscension));
    return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('') + 'Z';
  };
  let out = '';
  // bridges (watch-style, tapered) from the pole to the ecliptic ring
  const anchors = [30, 150, 270].map(ra => P(0, ra));
  const bridge = (a, b, w) => `<path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="#d9ae55" stroke-width="${w + 1.6}" stroke-linecap="round"/><path d="M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}" stroke="url(#avBlued)" stroke-width="${w}" stroke-linecap="round"/>`;
  out += '<g fill="none">';
  for (const p of anchors) out += bridge({ x: cx, y: cy }, p, 3.2);
  out += '</g>';
  // ecliptic band (±10° of ecliptic latitude) in blued steel with a gold edge
  out += `<path d="${ringPath(10)}${ringPath(-10)}" fill="url(#avBlued)" fill-opacity=".92" fill-rule="evenodd" stroke="#d9ae55" stroke-width=".9"/>`;
  out += `<path d="${ringPath(0)}" fill="none" stroke="#fff3c4" stroke-opacity=".75" stroke-width=".6" stroke-dasharray="1.2 2.2"/>`;
  // ecliptic divisions: 5° ticks, 30° long ticks and numerals
  let ticks = '', longs = '';
  const e0 = eclipticBandSamples(10, 72), e1 = eclipticBandSamples(7, 72), e2 = eclipticBandSamples(4, 72);
  for (let i = 0; i < 72; i++) {
    const twelve = i % 6 === 0;
    const a = P(e0[i].declination, e0[i].rightAscension), b = twelve ? P(e2[i].declination, e2[i].rightAscension) : P(e1[i].declination, e1[i].rightAscension);
    const seg = `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; if (twelve) longs += seg; else ticks += seg;
  }
  out += `<path d="${ticks}" stroke="#f5e7b4" stroke-width=".55" fill="none"/><path d="${longs}" stroke="#ffe9a8" stroke-width="1" fill="none"/>`;
  const e14 = eclipticBandSamples(-6.2, 12);
  for (let i = 0; i < 12; i++) {
    const s = e14[i];
    const p = P(s.declination, s.rightAscension);
    out += `<text x="${f(p.x)}" y="${f(p.y)}" class="av-ecl" text-anchor="middle" dominant-baseline="central">${digitsFor(i * 30, lang)}</text>`;
  }
  // star pointers: gold chatons with a ruby; name only in the tooltip
  for (const star of BRIGHT_STARS) {
    if (!STAR_LABELS[star.name]) continue;
    const p = P(star.dec, star.ra);
    if (Math.hypot(p.x - cx, p.y - cy) > R - 4) continue;
    out += `<g><title>${starLabel(star.name, lang)}</title><path d="M${f(p.x)} ${f(p.y - 3.4)}L${f(p.x + 1.9)} ${f(p.y)}L${f(p.x)} ${f(p.y + 3.4)}L${f(p.x - 1.9)} ${f(p.y)}Z" fill="#e8edf1" stroke="#7d8890" stroke-width=".4"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r=".9" fill="#c3112e"/></g>`;
  }
  // chatons with blued screws along the bridges
  for (const p of anchors) {
    const m = { x: (p.x + cx) / 2, y: (p.y + cy) / 2 };
    out += `<circle cx="${f(m.x)}" cy="${f(m.y)}" r="4.4" fill="url(#avGold)" stroke="#6e5019" stroke-width=".5"/><circle cx="${f(m.x)}" cy="${f(m.y)}" r="2.1" fill="url(#avRuby)"/>`;
  }
  return out;
}

/** Centre pivot: gold chaton with ruby and blued screw, drawn above the rule. Fixed. */
export function pivotMarkup() {
  const { cx, cy } = AV;
  return `<circle cx="${cx}" cy="${cy}" r="8" fill="url(#avGold)" stroke="#6e5019" stroke-width=".6"/><circle cx="${cx}" cy="${cy}" r="4.4" fill="url(#avBlued)" stroke="#0e2149" stroke-width=".5"/><path d="M${cx - 3.2} ${cy - 1.6}L${cx + 3.2} ${cy + 1.6}" stroke="#05112b" stroke-width=".9" stroke-linecap="round"/>`;
}

/** Blued-steel rule (the hour hand of the instrument); drawn pointing at noon, then rotated to the sun's hour angle. */
export function ruleMarkup() {
  const { cx, cy, plateR } = AV;
  const tipY = cy - (plateR + 2), neck = cy - Math.round(plateR * 0.62);
  return `<path d="M${cx - 2.1} ${cy + 26}L${cx - 1.1} ${neck}L${cx - .7} ${tipY + 7}L${cx} ${tipY}L${cx + .7} ${tipY + 7}L${cx + 1.1} ${neck}L${cx + 2.1} ${cy + 26}Z" fill="url(#avBlued)" stroke="#0e2149" stroke-width=".35"/><path d="M${cx} ${neck + 10}L${cx - 3.4} ${neck + 26}L${cx} ${neck + 40}L${cx + 3.4} ${neck + 26}Z" fill="none" stroke="#d9ae55" stroke-width=".6"/><circle cx="${cx}" cy="${cy + 26}" r="4.2" fill="url(#avBlued)" stroke="#d9ae55" stroke-width=".7"/>`;
}

/** The sun: polished gold disc with a rotating guilloché ray ring. */
export function sunMarkup() {
  let rays = '';
  for (let i = 0; i < 24; i++) { const a = polar(16.2, i * 15, 0, 0), b = polar(i % 2 ? 13.6 : 12.8, i * 15, 0, 0); rays += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; }
  return `<g class="av-sun-rays"><path d="${rays}" stroke="#ffe9a8" stroke-width=".9" stroke-linecap="round" fill="none"/></g><circle r="12.2" fill="#6e5019" opacity=".55"/><circle r="10.7" fill="url(#avSun)" stroke="#8a6422" stroke-width=".6"/><circle r="7" fill="none" stroke="#fff3c4" stroke-width=".5" opacity=".9"/><circle r="3.1" fill="#fff6d6" opacity=".9"/>`;
}

/** The moon: dark steel disc with the lit limb; the whole group is turned so the lit side faces the sun. */
export function moonMarkup(radius) {
  return `<g class="av-moon-turn"><circle r="${f(radius + 1.4)}" fill="#aab3bb"/><circle r="${f(radius)}" fill="#161c26" stroke="#e6ebef" stroke-width=".55"/><g clip-path="url(#avMoonClip)"><circle r="${f(radius)}" fill="url(#avMoon)"/><circle cx="-2.2" cy="-2.4" r="1.2" fill="#8d9ab0" opacity=".5"/><circle cx="2.4" cy="2.6" r=".9" fill="#8d9ab0" opacity=".5"/></g></g>`;
}


/* ---- v2.1.1 enlarged-instrument detail --------------------------------------------------------------------------
   Drawn into their own groups and shown only when the instrument is big enough to carry them (the home version stays
   clean). Same rules as the rest: English or Bangla letters and digits only, nothing that looks like another script. */
export const CARDINALS = Object.freeze({ 0: ['N', 'উ'], 90: ['E', 'পূ'], 180: ['S', 'দ'], 270: ['W', 'প'] });

/** Fixed (turns with the instrument, not with the sky): 1° limb scale, 5-minute hour ticks, engraved plate, finer circles, azimuth and altitude numerals. */
export function detailMarkup(lat, lang = 'en') {
  const { cx, cy, limb, ring, plateR: R } = AV;
  const path = samples => samplesToPath(samples, cx, cy, R, { closed: true, clip: false });
  let limbMinor = '', limbMid = '', limbMajor = '';
  const outer = limb - 6.4;
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 5.2 : d % 5 === 0 ? 3.5 : 1.9;
    const a = polar(outer, d), b = polar(outer - len, d);
    const seg = `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
    if (d % 10 === 0) limbMajor += seg; else if (d % 5 === 0) limbMid += seg; else limbMinor += seg;
  }
  let out = '<g class="av-d-limb" fill="none" stroke="#1b2229" stroke-linecap="butt">';
  out += `<path d="${limbMinor}" stroke-width=".3" stroke-opacity=".75"/><path d="${limbMid}" stroke-width=".45"/><path d="${limbMajor}" stroke-width=".7"/></g>`;
  for (let d = 0; d < 360; d += 30) {
    const p = polar(outer - 9.2, d);
    out += `<text x="${f(p.x)}" y="${f(p.y)}" transform="rotate(${d} ${f(p.x)} ${f(p.y)})" class="av-dnum" text-anchor="middle" dominant-baseline="central">${digitsFor(d, lang)}</text>`;
  }
  // five-minute marks on the 24-hour railroad (the quarter hours are already drawn), still inside the hour band
  let mins = '';
  for (let i = 0; i < 288; i++) {
    if (i % 3 === 0) continue;
    const a = polar(ring + 6, i * 1.25), b = polar(ring + 3.6, i * 1.25);
    mins += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  }
  out += `<path d="${mins}" stroke="#c9d0d6" stroke-opacity=".7" stroke-width=".3" fill="none"/>`;
  // engraved plate (clipped to the plate): engine-turned hairlines, finer altitude and azimuth divisions
  let burst = '', rings = '';
  for (let d = 0; d < 360; d += 2) { const a = polar(12, d), b = polar(R, d); burst += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`; }
  for (let r = 6; r < R; r += 3.2) rings += `<circle cx="${cx}" cy="${cy}" r="${f(r)}"/>`;
  let alt5 = '', az5 = '';
  for (let a = 5; a < 90; a += 10) alt5 += path(altitudeSamples(lat, a, 120));
  for (let az = 0; az < 360; az += 5) if (az % 15) az5 += samplesToPath(azimuthSamples(lat, az, 0, 88, 18), cx, cy, R, { clip: false });
  out += '<g clip-path="url(#avPlateClip)">';
  out += `<path d="${burst}" stroke="#fff" stroke-opacity=".045" stroke-width=".35" fill="none"/><g fill="none" stroke="#fff" stroke-opacity=".03" stroke-width=".3">${rings}</g>`;
  out += `<path d="${alt5}" fill="none" stroke="#cfd7de" stroke-opacity=".16" stroke-width=".3"/><path d="${az5}" fill="none" stroke="#cfd7de" stroke-opacity=".1" stroke-width=".3"/>`;
  // altitude numerals up the meridian (south side) and azimuth numerals / points along the horizon
  for (let a = 10; a < 90; a += 10) {
    const q = equatorialFromAltAz(a, 180, lat), p = platePoint(q.declination, q.hourAngle, cx, cy, R);
    if (Math.hypot(p.x - cx, p.y - cy) > R - 6) continue;
    out += `<text x="${f(p.x + 3.4)}" y="${f(p.y)}" class="av-dnum2" text-anchor="start" dominant-baseline="central">${digitsFor(a, lang)}°</text>`;
  }
  for (let az = 0; az < 360; az += 30) {
    const q = equatorialFromAltAz(-0.8, az, lat), p = platePoint(q.declination, q.hourAngle, cx, cy, R);
    const d = Math.hypot(p.x - cx, p.y - cy) || 1;
    const k = Math.min(1, (R - 7.5) / d);
    const x = cx + (p.x - cx) * k, y = cy + (p.y - cy) * k;
    const card = CARDINALS[az];
    out += `<text x="${f(x)}" y="${f(y)}" class="${card ? 'av-dcard' : 'av-dnum2'}" text-anchor="middle" dominant-baseline="central">${card ? card[lang === 'bn' ? 1 : 0] : digitsFor(az, lang) + '°'}</text>`;
  }
  out += '</g>';
  return out;
}

/** Rete detail (turns with the sky): 1° ecliptic divisions, engraved hairlines on the blued band, engraved bridges. */
export function reteDetailMarkup() {
  const { cx, cy, plateR: R } = AV;
  const P = (dec, ra) => platePoint(dec, -ra, cx, cy, R);
  const ringPath = beta => eclipticBandSamples(beta, 120).map(s => P(s.declination, s.rightAscension)).map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('') + 'Z';
  let out = '<g fill="none">';
  for (const beta of [8.5, 5.5, 2.5, -2.5, -5.5, -8.5]) out += `<path d="${ringPath(beta)}" stroke="#fff" stroke-opacity=".13" stroke-width=".3"/>`;
  const a0 = eclipticBandSamples(10, 360), a1 = eclipticBandSamples(8.6, 360), a2 = eclipticBandSamples(7.4, 360);
  let fine = '';
  for (let i = 0; i < 360; i++) {
    if (i % 5 === 0) continue;
    const a = P(a0[i].declination, a0[i].rightAscension), b = P((i % 5 === 0 ? a2 : a1)[i].declination, (i % 5 === 0 ? a2 : a1)[i].rightAscension);
    fine += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`;
  }
  out += `<path d="${fine}" stroke="#f5e7b4" stroke-opacity=".8" stroke-width=".28"/>`;
  for (const ra of [30, 150, 270]) {
    const p = P(0, ra);
    out += `<path d="M${cx} ${cy}L${f(p.x)} ${f(p.y)}" stroke="#bcd0f2" stroke-opacity=".55" stroke-width=".35" stroke-linecap="round"/>`;
  }
  out += '</g>';
  return out;
}

/** Star pointers that carry a printed name at large sizes. Positions are in the rete frame. */
export function starLabelList(lang = 'en') {
  const { cx, cy, plateR: R } = AV;
  const list = [];
  for (const star of BRIGHT_STARS) {
    if (!STAR_LABELS[star.name]) continue;
    const p = platePoint(star.dec, -star.ra, cx, cy, R);
    if (Math.hypot(p.x - cx, p.y - cy) > R - 12) continue;
    list.push({ name: star.name, label: starLabel(star.name, lang), x: p.x, y: p.y });
  }
  return list;
}
export function starLabelsMarkup(lang = 'en') {
  return starLabelList(lang).map(s => `<text class="av-star-label" data-star="${s.name}" text-anchor="start" dominant-baseline="central">${s.label}</text>`).join('');
}

/** Fixed top index and crystal highlight (never rotated). */
export function overlayMarkup() {
  const { cx, cy, limb } = AV;
  return `<path d="M${cx - 7} ${cy - limb - 1}L${cx + 7} ${cy - limb - 1}L${cx} ${cy - limb + 12}Z" fill="#c3112e" stroke="#fff" stroke-width=".8" stroke-linejoin="round"/><path d="M${cx - 150} ${cy - 48}A156 156 0 0 1 ${cx + 150} ${cy - 48}A190 190 0 0 0 ${cx - 150} ${cy - 48}Z" fill="url(#avGlass)" opacity=".5"/>`;
}

/** Every word and number printed by this module for a language; used by the language-restriction test. */
export function allInstrumentText(lang = 'en', lat = 23.81) {
  const parts = [materMarkup(lang), plateMarkup(lat, lang), reteMarkup(lang), detailMarkup(lat, lang), reteDetailMarkup(), starLabelsMarkup(lang)];
  const texts = [];
  for (const markup of parts) {
    for (const m of markup.matchAll(/<(?:text|title)[^>]*>([^<]*)<\/(?:text|title)>/g)) texts.push(m[1]);
  }
  return texts;
}

export { jewelRadius };
