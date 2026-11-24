/* v3.0.6 Sun, moon and Hijri date from moon-sighting (MIT, Aric Camarata) with the JPL DE442S
   kernel bundled in the app (public/ephemeris/de442s.bsp, loaded from the app's own files; no
   internet). See src/vendor/moon-sighting.js for what the offline copy removes.

   Positions (line M): topocentric, airless (no refraction) altitude and azimuth of the Sun and the
   Moon for the saved latitude/longitude at sea level, the Moon's illuminated fraction and
   waxing/waning from the kernel's geocentric Sun and Moon vectors, and moonrise/moonset found
   with the same horizon (-0.833 degrees) as before. Declination and hour angle for the astrolabe
   are converted from that altitude/azimuth (src/astrolabe.js equatorialFromAltAz).

   Hijri date (line H), for the saved location:
   - month k is the k-th lunation after the new moon of 25 June 2025 (1 Muharram 1447);
   - the crescent test is the Odeh (2006) criterion as implemented by moon-sighting, evaluated at
     the library's best time (sunset + 4/9 of the lag) on a given local evening; "visible" means
     Odeh zone A (naked eye), B (optical aid, may be seen by naked eye) or C (optical aid only);
   - on the evening of the 29th, if the crescent is predicted visible, the new month starts at that
     sunset (29-day month); otherwise the month completes 30 days;
   - one chain of months per location, from a fixed epoch: Muharram 1440 (September 2018) starts on
     the first visible evening after its conjunction, and every later month follows from the one
     before it by the 29th-evening rule (so every date is a fixed function of the location);
   - the day changes at Maghrib (the app's existing rule; this file works with civil dates, the
     Hijri day number of a civil date being the one current during its daytime).
   Before the epoch (Hijri 1440), after the kernel's span (it ends 2150-01-22) or before the kernel
   is loaded, callers fall back to the Umm al-Qura calendar and do not show the label. */
import {
  SpkKernel, setKernel, computeTimeScales, jdTTtoET, getMoonGeocentricState, getSunGeocentricState,
  computeAzAlt, computeIllumination, computeCrescentGeometry, computeCrescentWidth, computeOdeh,
  findAltitudeCrossing, bestTimeHeuristic, geodeticToECEF, itrsToGcrs, nearestNewMoon, NAIF_IDS
} from './vendor/moon-sighting.js';
import { equatorialFromAltAz } from './astrolabe.js';
import { horizonCrossings } from './sky.js';

export const KERNEL_PATH = 'ephemeris/de442s.bsp';
export const KERNEL_BYTES = 32701440;
export const KERNEL_MD5 = 'cc49327e06088124c0e39d8dde9f0b58'; // NAIF aa_checksums.txt
export const KERNEL_FIRST_MS = Date.UTC(1849, 11, 27);
export const KERNEL_LAST_MS = Date.UTC(2150, 0, 21);
export const ODEH_VISIBLE_ZONES = Object.freeze(['A', 'B', 'C']);
const HORIZON = -0.8333;
const DAY_MS = 86400000;
const SYNODIC = 29.530588853;
const REF_YEAR = 1447; // lunation 0 = Muharram 1447 (new moon 2025-06-25 10:31 UTC)
const REF_NEW_MOON_JD = 2460851.94; // approximate; nearestNewMoon() refines it

let kernel = null;
export function loadKernel(arrayBuffer) {
  kernel = SpkKernel.fromBuffer(arrayBuffer);
  setKernel(kernel);
  visibleMemo.clear();
  startMemo.clear();
  return true;
}
export function ephemerisReady() { return !!kernel; }
/** Reads the bundled kernel from the app's own files (same origin only; never the internet).
 *  `base` is the page URL (document.baseURI), `origin` the page origin. Returns true when loaded. */
export async function loadBundledKernel(base, origin) {
  const url = new URL(KERNEL_PATH, base);
  if (url.origin !== origin) return false;
  const response = await fetch(url.href);
  if (!response.ok) return false;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== KERNEL_BYTES) return false;
  loadKernel(buffer);
  return true;
}
export function unloadKernel() { kernel = null; setKernel(null); visibleMemo.clear(); startMemo.clear(); }
const inSpan = ms => ms >= KERNEL_FIRST_MS && ms <= KERNEL_LAST_MS;

const observer = (lat, lon) => ({ lat: Number(lat), lon: Number(lon), elevation: 0 });
function scales(date) { const ts = computeTimeScales(date instanceof Date ? date : new Date(date)); return { ts, et: jdTTtoET(ts.jdTT) }; }

/* ---------- positions (line M) ---------- */
function body(id, date, lat, lon) {
  const { ts, et } = scales(date);
  const gcrs = id === NAIF_IDS.SUN ? getSunGeocentricState(kernel, et).position : getMoonGeocentricState(kernel, et).position;
  const azAlt = computeAzAlt(gcrs, observer(lat, lon), ts, true);
  return { azAlt, gcrs, ts };
}
const norm = deg => ((deg % 360) + 360) % 360;
export function preciseSunPosition(date, lat, lon) {
  const { azAlt } = body(NAIF_IDS.SUN, date, lat, lon);
  const eq = equatorialFromAltAz(azAlt.altitude, azAlt.azimuth, lat);
  return { altitude: azAlt.altitude, azimuth: norm(azAlt.azimuth), declination: eq.declination, hourAngle: eq.hourAngle };
}
export function preciseMoonPosition(date, lat, lon) {
  const { azAlt, gcrs, ts } = body(NAIF_IDS.MOON, date, lat, lon);
  const eq = equatorialFromAltAz(azAlt.altitude, azAlt.azimuth, lat);
  const o = geodeticToECEF(Number(lat), Number(lon), 0);
  const obs = itrsToGcrs([o[0] / 1e3, o[1] / 1e3, o[2] / 1e3], ts);
  const distance = Math.hypot(gcrs[0] - obs[0], gcrs[1] - obs[1], gcrs[2] - obs[2]);
  return { altitude: azAlt.altitude, azimuth: norm(azAlt.azimuth), distance, declination: eq.declination, hourAngle: eq.hourAngle };
}
/** Same shape as sky.js moonPhase: illuminated fraction 0..1, waxing, elongation 0..360 (0 new, 180 full). */
export function preciseMoonPhase(date) {
  const { et } = scales(date);
  const m = getMoonGeocentricState(kernel, et).position, s = getSunGeocentricState(kernel, et).position;
  const ill = computeIllumination(m, s);
  return { illumination: Math.max(0, Math.min(1, ill.illumination)), waxing: ill.isWaxing, elongation: ill.isWaxing ? ill.elongationDeg : 360 - ill.elongationDeg };
}
/** Same shape and rules as sky.js moonPass, with the precise moon altitude. */
export function preciseMoonPass(now, lat, lon) {
  const t = now.getTime();
  const alt = ms => preciseMoonPosition(new Date(ms), lat, lon).altitude;
  const up = alt(t) > -0.833;
  const crossings = horizonCrossings(alt, t - 30 * 3600000, t + 30 * 3600000);
  let rise = null, set = null;
  if (up) {
    rise = [...crossings].reverse().find(c => c.rising && c.at <= t);
    set = crossings.find(c => !c.rising && c.at > t);
  } else {
    rise = crossings.find(c => c.rising && c.at > t);
    set = rise ? crossings.find(c => !c.rising && c.at > rise.at) : null;
  }
  return { up, rise: rise ? new Date(rise.at) : null, set: set ? new Date(set.at) : null };
}

/* ---------- crescent on one local evening (line H) ---------- */
// Civil day numbers: days since 1970-01-01 of a Y-M-D date (no time zone).
export const dayNumber = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
export const dayNumberOfLocalDate = date => dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
export function ymdOfDayNumber(n) { const d = new Date(n * DAY_MS); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }

/** The crescent at the location on the evening of civil day `n` (searches sunset from local mean noon). */
export function eveningCrescent(n, lat, lon) {
  const obs = observer(lat, lon);
  const noonMs = n * DAY_MS + 12 * 3600000 - (Number(lon) / 15) * 3600000;
  if (!kernel || !inSpan(noonMs)) return null;
  const startET = scales(new Date(noonMs)).et;
  const endET = startET + 26 * 3600;
  const sunset = findAltitudeCrossing(kernel, NAIF_IDS.SUN, obs, null, startET, startET + 20 * 3600, HORIZON, false);
  const moonset = findAltitudeCrossing(kernel, NAIF_IDS.MOON, obs, null, startET, endET, HORIZON, false);
  const base = { day: n, sunset, moonset, visible: false, zone: null, V: null, lag: null };
  if (!sunset || !moonset) return base;
  const best = bestTimeHeuristic(sunset, moonset);
  if (!best) return { ...base, lag: (moonset - sunset) / 60000 };
  const { ts, et } = scales(best.bestTimeUTC);
  const moonG = getMoonGeocentricState(kernel, et).position, sunG = getSunGeocentricState(kernel, et).position;
  const o = geodeticToECEF(obs.lat, obs.lon, 0);
  const og = itrsToGcrs([o[0] / 1e3, o[1] / 1e3, o[2] / 1e3], ts);
  const moonTopo = [moonG[0] - og[0], moonG[1] - og[1], moonG[2] - og[2]];
  const sunTopo = [sunG[0] - og[0], sunG[1] - og[1], sunG[2] - og[2]];
  const geometry = computeCrescentGeometry(computeAzAlt(moonG, obs, ts, true), computeAzAlt(sunG, obs, ts, true), moonTopo, sunTopo, sunset, moonset);
  computeCrescentWidth(moonTopo, geometry.ARCL);
  const odeh = computeOdeh(geometry);
  return { ...base, bestTime: best.bestTimeUTC, lag: best.lagMinutes, zone: odeh.zone, V: odeh.V, visible: ODEH_VISIBLE_ZONES.includes(odeh.zone) };
}

/* ---------- Hijri month chain (line H) ---------- */
const visibleMemo = new Map();
const startMemo = new Map();
const locKey = (lat, lon) => `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
function visibleOn(n, lat, lon) {
  const key = `${locKey(lat, lon)}|${n}`;
  if (!visibleMemo.has(key)) { const r = eveningCrescent(n, lat, lon); visibleMemo.set(key, r ? r.visible : null); }
  return visibleMemo.get(key);
}
let refJD = null;
function conjunctionMs(k) {
  if (refJD == null) refJD = nearestNewMoon(REF_NEW_MOON_JD);
  const jd = nearestNewMoon(refJD + k * SYNODIC);
  return (jd - 2440587.5) * DAY_MS - 69000; // TT -> UTC (about 69 s in this era; only used to pick the local date)
}
/** Evening (civil day number) that starts lunation k: the first visible evening after its conjunction, scanning 4 evenings. */
function anchorEvening(k, lat, lon) {
  const c = conjunctionMs(k);
  const local = Math.floor((c + (Number(lon) / 15) * 3600000) / DAY_MS);
  for (let n = local; n <= local + 3; n++) if (visibleOn(n, lat, lon)) return n;
  return local + 1; // never visible (polar day/night): the chain's 30-day rule takes over
}
function nextStart(S, lat, lon) {
  const v = visibleOn(S + 29, lat, lon);
  if (v == null) return null;
  return v ? S + 29 : S + 30;
}
/** Civil day number of the sunset that starts lunation-month k at the location, or null.
 *  One chain per location from the fixed epoch month (Muharram 1440, September 2018), so every
 *  month follows from the month before it exactly as the rule says. Earlier months return null. */
export const EPOCH_YEAR = 1440;
const EPOCH_K = (EPOCH_YEAR - REF_YEAR) * 12;
/** Beyond the polar circles some days have no sunset, so "the evening of the 29th" does not always exist and the
 *  chain drifts away from the moon (weeks to months at 75°+). There the app keeps the Umm al-Qura date, unlabelled. */
export const POLAR_LIMIT = 66.56;
export function crescentApplies(lat) { return Number.isFinite(Number(lat)) && Math.abs(Number(lat)) <= POLAR_LIMIT; }
export function monthStartEvening(k, lat, lon) {
  if (!kernel || k < EPOCH_K || !crescentApplies(lat)) return null;
  const key = locKey(lat, lon);
  let chain = startMemo.get(key);
  if (!chain) {
    const c = conjunctionMs(EPOCH_K);
    chain = inSpan(c - 2 * DAY_MS) ? [anchorEvening(EPOCH_K, lat, lon)] : [null];
    startMemo.set(key, chain);
  }
  while (chain.length <= k - EPOCH_K) {
    const last = chain[chain.length - 1];
    const kNext = EPOCH_K + chain.length;
    if (last == null || !inSpan(conjunctionMs(kNext) + 3 * DAY_MS)) { chain.push(null); if (last == null) break; continue; }
    chain.push(nextStart(last, lat, lon));
  }
  const i = k - EPOCH_K;
  return i < chain.length ? chain[i] : null;
}
export function lunationOf(year, month) { return (year - REF_YEAR) * 12 + (month - 1); }
export function hijriOfLunation(k) { return { year: REF_YEAR + Math.floor(k / 12), month: ((k % 12) + 12) % 12 + 1 }; }
/** Length (29 or 30) of Hijri month (year, month) at the location, or null. */
export function crescentMonthLength(year, month, lat, lon) {
  const k = lunationOf(year, month);
  const a = monthStartEvening(k, lat, lon), b = monthStartEvening(k + 1, lat, lon);
  return a == null || b == null ? null : b - a;
}
/** Hijri {year, month, day} current during the daytime of civil day n, or null outside the span. */
export function crescentHijriOfDay(n, lat, lon) {
  if (!kernel || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null;
  const k0 = Math.round(((n + 0.5) * DAY_MS - conjunctionMs(0)) / (SYNODIC * DAY_MS));
  for (let k = k0 - 2; k <= k0 + 1; k++) {
    const a = monthStartEvening(k, lat, lon), b = monthStartEvening(k + 1, lat, lon);
    if (a == null || b == null) continue;
    if (n > a && n <= b) return { ...hijriOfLunation(k), day: n - a };
  }
  return null;
}
/** Civil day number of the daytime of Hijri (year, month, day) at the location, or null. */
export function dayOfCrescentHijri(year, month, day, lat, lon) {
  const a = monthStartEvening(lunationOf(year, month), lat, lon);
  return a == null ? null : a + day;
}
export function clearCrescentCache() { visibleMemo.clear(); startMemo.clear(); }
