/* Planispheric astrolabe geometry (v1.8.1).
   Stereographic projection from the south celestial pole, which is the
   construction used on Abbasid planispheric astrolabes. The north celestial
   pole sits at the centre. Hour angle 0 (the meridian) is drawn at the
   bottom, east to the left, so the daily motion runs clockwise.
   Sun and moon are small bosses on the rete. The sun is the full jewel;
   the moon is drawn a little smaller, which is how the two markers read
   on a planispheric plate. Positions come from the same equatorial
   coordinates as src/sky.js. */
const RAD = Math.PI / 180;
const OBLIQUITY = 23.4392911;

const norm = deg => ((deg % 360) + 360) % 360;

/** Local apparent sidereal time in degrees. Same GMST series as sunPosition. */
export function localSiderealDegrees(date, longitude) {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const gmstHours = 18.697374558 + 24.06570982441908 * n;
  return norm(gmstHours * 15 + longitude);
}

/** Radius on the plate, 1 at the tropic of Capricorn (the rim of a classic plate). */
export function plateRadiusOf(declination, obliquity = OBLIQUITY) {
  const r = Math.tan((45 - declination / 2) * RAD);
  const cap = Math.tan((45 - (-obliquity) / 2) * RAD);
  if (!Number.isFinite(r) || r < 0) return 0;
  return r / cap;
}

/**
 * Equatorial coordinates from altitude and azimuth.
 * Azimuth is degrees from north, clockwise, matching sunPosition / moonPosition.
 */
export function equatorialFromAltAz(altitude, azimuth, latitude) {
  const a = altitude * RAD;
  const A = azimuth * RAD;
  const phi = latitude * RAD;
  const sinDec = Math.sin(phi) * Math.sin(a) + Math.cos(phi) * Math.cos(a) * Math.cos(A);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const y = -Math.cos(a) * Math.sin(A);
  const x = Math.sin(a) * Math.cos(phi) - Math.cos(a) * Math.cos(A) * Math.sin(phi);
  const H = Math.atan2(y, x);
  return { declination: dec / RAD, hourAngle: norm(H / RAD) };
}

/** Plate coordinates, traditional orientation: the meridian runs vertically with
    the upper culmination at the top, west to the right, so the sky turns clockwise
    exactly as on a planispheric astrolabe viewed from the front. */
export function platePoint(declination, hourAngleDeg, cx, cy, plateR) {
  const scaled = Math.min(1.18, Math.max(0, plateRadiusOf(declination))) * plateR;
  const signed = hourAngleDeg > 180 ? hourAngleDeg - 360 : hourAngleDeg;
  const H = signed * RAD;
  return {
    x: cx + scaled * Math.sin(H),
    y: cy - scaled * Math.cos(H),
    radius: scaled
  };
}

/** Apparent angular diameters in degrees. The sun and moon are within a few percent of each
    other in the sky, which is why they are drawn at (almost) the same size on the rete. */
export function sunAngularDiameter(date) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * RAD;
  const au = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  return 0.5332 / au;
}
export function moonAngularDiameter(date) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const M = (134.9634 + 13.06499295 * d) * RAD;
  const D = (297.8502 + 12.19074912 * d) * RAD;
  const km = 385001 - 20905 * Math.cos(M) - 3699 * Math.cos(2 * D - M) - 2956 * Math.cos(2 * D) - 570 * Math.cos(2 * M);
  return 2 * Math.asin(1737.4 / km) / RAD;
}
/** Jewel radii that keep the true sun : moon angular-size ratio. */
export function bodyRadii(date, plateR) {
  const sunR = jewelRadius(plateR);
  const ratio = moonAngularDiameter(date) / sunAngularDiameter(date);
  return { sun: sunR, moon: sunR * ratio, ratio };
}

/** Ecliptic parallel (ecliptic latitude beta, degrees) as plate-ready samples on the rete (right ascension fixed). */
export function eclipticBandSamples(beta = 0, steps = 96) {
  const eps = OBLIQUITY * RAD;
  const b = beta * RAD;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const lam = (i / steps) * 2 * Math.PI;
    const sinDec = Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(lam);
    const dec = Math.asin(sinDec);
    const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) * Math.cos(b) - Math.sin(b) * Math.sin(eps), Math.cos(lam) * Math.cos(b));
    out.push({ longitude: (i / steps) * 360, declination: dec / RAD, rightAscension: norm(ra / RAD) });
  }
  return out;
}

/** Equal jewel radius as a base unit: about 1/14 of the plate. The sun is drawn at this size; the moon follows the true size ratio. */
export function jewelRadius(plateR) {
  return Math.max(3.2, plateR / 14);
}


/** Horizon (and other altitude circles) as equatorial samples for this latitude. */
export function altitudeSamples(latitude, altitudeDeg, steps = 72) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    const azimuth = (i / steps) * 360;
    out.push({ azimuth, ...equatorialFromAltAz(altitudeDeg, azimuth, latitude) });
  }
  return out;
}

/** One azimuth arc, sampled from a low altitude up toward the zenith. */
export function azimuthSamples(latitude, azimuthDeg, altStart = -6, altEnd = 80, steps = 22) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const altitude = altStart + (altEnd - altStart) * (i / steps);
    out.push({ azimuth: azimuthDeg, altitude, ...equatorialFromAltAz(altitude, azimuthDeg, latitude) });
  }
  return out;
}

/** Bright stars used as rete pointers. Right ascension and declination are J2000 degrees. */
export const BRIGHT_STARS = Object.freeze([
  { name: 'Sirius', ra: 101.287, dec: -16.716 },
  { name: 'Canopus', ra: 95.988, dec: -52.696 },
  { name: 'Arcturus', ra: 213.915, dec: 19.182 },
  { name: 'Vega', ra: 279.234, dec: 38.784 },
  { name: 'Capella', ra: 79.172, dec: 45.998 },
  { name: 'Rigel', ra: 78.634, dec: -8.202 },
  { name: 'Procyon', ra: 114.825, dec: 5.225 },
  { name: 'Betelgeuse', ra: 88.793, dec: 7.407 },
  { name: 'Altair', ra: 297.696, dec: 8.868 },
  { name: 'Aldebaran', ra: 68.980, dec: 16.509 },
  { name: 'Spica', ra: 201.298, dec: -11.161 },
  { name: 'Antares', ra: 247.351, dec: -26.432 },
  { name: 'Pollux', ra: 116.329, dec: 28.026 },
  { name: 'Regulus', ra: 152.093, dec: 11.967 }
]);

export function starHourAngle(date, longitude, rightAscension) {
  return norm(localSiderealDegrees(date, longitude) - rightAscension);
}

export function samplesToPath(samples, cx, cy, plateR, { closed = false, clip = true } = {}) {
  const r = n => Math.round(n * 10) / 10;
  let d = '';
  let pen = false;
  const limit = plateR * 1.02;
  samples.forEach((sample, index) => {
    const p = platePoint(sample.declination, sample.hourAngle, cx, cy, plateR);
    const inside = !clip || Math.hypot(p.x - cx, p.y - cy) <= limit;
    if (!inside) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${r(p.x)} ${r(p.y)}`;
    pen = true;
    if (index === samples.length - 1 && closed && d) d += 'Z';
  });
  return d;
}

/**
 * A slightly under-damped spring, so a body eases toward its true position
 * with visible momentum instead of stepping. Reduced motion snaps.
 */
export function createGlide() {
  const state = new Map();
  return function glide(id, target, dt, { reduced = false } = {}) {
    const prev = state.get(id);
    if (!prev || reduced || !Number.isFinite(dt) || dt <= 0 || dt > 1.2) {
      const next = { x: target.x, y: target.y, vx: 0, vy: 0 };
      state.set(id, next);
      return next;
    }
    const k = 26;
    const damp = 2 * Math.sqrt(k) * 0.68;
    const vx = prev.vx + ((target.x - prev.x) * k - damp * prev.vx) * dt;
    const vy = prev.vy + ((target.y - prev.y) * k - damp * prev.vy) * dt;
    const next = { x: prev.x + vx * dt, y: prev.y + vy * dt, vx, vy };
    state.set(id, next);
    return next;
  };
}
