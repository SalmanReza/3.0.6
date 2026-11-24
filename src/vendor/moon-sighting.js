/* moon-sighting 1.2.0 (https://www.npmjs.com/package/moon-sighting) by Aric Camarata, MIT licence
   (full text in src/vendor/LICENSES-v3.0.6.txt and LICENSES). Offline copy made by scripts/vendor-libs.mjs:
   telemetry, kernel download and file access removed; internal functions exported. No maths changed. */
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/types.ts
var YALLOP_THRESHOLDS = {
  A: 0.216,
  B: -0.014,
  C: -0.16,
  D: -0.232,
  E: -0.293
};
var YALLOP_DESCRIPTIONS = {
  A: "Easily visible to the naked eye",
  B: "Visible under perfect conditions",
  C: "May need optical aid to find; naked eye possible",
  D: "Optical aid needed; naked eye not possible",
  E: "Not visible even with telescope under good conditions",
  F: "Below Danjon limit \u2014 crescent cannot form"
};
var ODEH_THRESHOLDS = {
  A: 5.65,
  B: 2,
  C: -0.96
};
var ODEH_DESCRIPTIONS = {
  A: "Visible with naked eye",
  B: "Visible with optical aid; may be seen with naked eye under excellent conditions",
  C: "Visible with optical aid only",
  D: "Not visible even with optical aid"
};
var WGS84 = {
  /** Semi-major axis in meters */
  a: 6378137,
  /** Inverse flattening */
  invF: 298.257223563,
  /** Flattening */
  f: 1 / 298.257223563,
  /** Semi-minor axis in meters */
  get b() {
    return this.a * (1 - this.f);
  },
  /** First eccentricity squared */
  get e2() {
    return 2 * this.f - this.f * this.f;
  }
};

// src/math/index.ts
function vscale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function vdot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function vnorm(a) {
  return Math.sqrt(vdot(a, a));
}
function vunit(a) {
  const n = vnorm(a);
  if (n === 0) throw new RangeError("Cannot normalize a zero vector");
  return vscale(a, 1 / n);
}
function angularSep(a, b) {
  const cosAngle = Math.max(-1, Math.min(1, vdot(vunit(a), vunit(b))));
  return Math.acos(cosAngle);
}
function mvmul(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
  ];
}
function mmmul(a, b) {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
  ];
}
function mtranspose(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}
function rotX(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [1, 0, 0, 0, c, s, 0, -s, c];
}
function rotY(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, 0, -s, 0, 1, 0, s, 0, c];
}
function rotZ(theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}
function chebyshevEvalWithDerivative(coeffs, x, radius) {
  const n = coeffs.length;
  if (n === 0) return [0, 0];
  if (n === 1) return [coeffs[0], 0];
  const x2 = 2 * x;
  let b2 = 0;
  let b1 = 0;
  let db2 = 0;
  let db1 = 0;
  for (let k = n - 1; k >= 1; k--) {
    const b0 = coeffs[k] + x2 * b1 - b2;
    const db0 = 2 * b1 + x2 * db1 - db2;
    b2 = b1;
    b1 = b0;
    db2 = db1;
    db1 = db0;
  }
  const value = coeffs[0] + x * b1 - b2;
  const dvalue = b1 + x * db1 - db2;
  return [value, dvalue / radius];
}
function brentRoot(f, a, b, tol = 1e-9, maxIter = 64) {
  let fa = f(a);
  let fb = f(b);
  if (fa * fb > 0) return null;
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }
  let c = a;
  let fc = fa;
  let mflag = true;
  let s;
  let d = 0;
  for (let i = 0; i < maxIter; i++) {
    if (Math.abs(b - a) < tol) return b;
    if (fa !== fc && fb !== fc) {
      s = a * fb * fc / ((fa - fb) * (fa - fc)) + b * fa * fc / ((fb - fa) * (fb - fc)) + c * fa * fb / ((fc - fa) * (fc - fb));
    } else {
      s = b - fb * ((b - a) / (fb - fa));
    }
    const cond1 = s < (3 * a + b) / 4 || s > b;
    const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
    const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
    const cond4 = mflag && Math.abs(b - c) < tol;
    const cond5 = !mflag && Math.abs(c - d) < tol;
    if (cond1 || cond2 || cond3 || cond4 || cond5) {
      s = (a + b) / 2;
      mflag = true;
    } else {
      mflag = false;
    }
    const fs = f(s);
    d = c;
    c = b;
    fc = fb;
    if (fa * fs < 0) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
  }
  return b;
}
var DEG2RAD = Math.PI / 180;
var RAD2DEG = 180 / Math.PI;

// src/spk/index.ts
var NAIF_IDS = {
  SSB: 0,
  // Solar System Barycenter
  MERCURY_BARYCENTER: 1,
  VENUS_BARYCENTER: 2,
  EMB: 3,
  // Earth-Moon Barycenter
  MARS_BARYCENTER: 4,
  JUPITER_BARYCENTER: 5,
  SATURN_BARYCENTER: 6,
  URANUS_BARYCENTER: 7,
  NEPTUNE_BARYCENTER: 8,
  PLUTO_BARYCENTER: 9,
  SUN: 10,
  MOON: 301,
  EARTH: 399
};
var DAF_RECORD_SIZE = 1024;
var BYTES_PER_DOUBLE = 8;
var SpkKernel = class _SpkKernel {
  constructor(buffer, segments, le) {
    __publicField(this, "buffer");
    __publicField(this, "segments");
    __publicField(this, "index");
    __publicField(this, "le");
    this.buffer = buffer;
    this.segments = segments;
    this.le = le;
    this.index = /* @__PURE__ */ new Map();
    for (const seg of segments) {
      const key = `${seg.target}:${seg.center}`;
      const list = this.index.get(key) ?? [];
      list.push(seg);
      this.index.set(key, list);
    }
  }
  /** Load a kernel from a binary ArrayBuffer. */
  static fromBuffer(buffer) {
    const { nd, ni, fward, le } = parseDafFileRecord(buffer);
    const segments = parseSummaryRecords(buffer, fward, nd, ni, le);
    return new _SpkKernel(buffer, segments, le);
  }
  /**
   * Compute the state vector (position + velocity) for a body relative to a center.
   * Uses segment chaining when no direct segment exists.
   */
  getState(target, center, et) {
    const direct = this.findSeg(target, center, et);
    if (direct) return evaluateSegment(this.buffer, direct, et, this.le);
    return this.getChained(target, center, et);
  }
  findSeg(target, center, et) {
    const candidates = this.index.get(`${target}:${center}`);
    if (!candidates) return null;
    return candidates.find((s) => et >= s.startET && et <= s.endET) ?? null;
  }
  getChained(target, center, et) {
    const ssb = NAIF_IDS.SSB;
    const emb = NAIF_IDS.EMB;
    if (target === NAIF_IDS.MOON && center === NAIF_IDS.EARTH) {
      const s1 = this.findSeg(NAIF_IDS.MOON, emb, et);
      const s2 = this.findSeg(NAIF_IDS.EARTH, emb, et);
      if (s1 && s2) {
        return subtractSV(
          evaluateSegment(this.buffer, s1, et, this.le),
          evaluateSegment(this.buffer, s2, et, this.le)
        );
      }
    }
    if (target === NAIF_IDS.EARTH && center === NAIF_IDS.MOON) {
      const s1 = this.findSeg(NAIF_IDS.EARTH, emb, et);
      const s2 = this.findSeg(NAIF_IDS.MOON, emb, et);
      if (s1 && s2) {
        return subtractSV(
          evaluateSegment(this.buffer, s1, et, this.le),
          evaluateSegment(this.buffer, s2, et, this.le)
        );
      }
    }
    if (target === NAIF_IDS.SUN && center === NAIF_IDS.EARTH) {
      const sSunSsb = this.findSeg(NAIF_IDS.SUN, ssb, et);
      const sEmbSsb = this.findSeg(emb, ssb, et);
      const sEarthEmb = this.findSeg(NAIF_IDS.EARTH, emb, et);
      if (sSunSsb && sEmbSsb && sEarthEmb) {
        const svSunSsb = evaluateSegment(this.buffer, sSunSsb, et, this.le);
        const svEmbSsb = evaluateSegment(this.buffer, sEmbSsb, et, this.le);
        const svEarthEmb = evaluateSegment(this.buffer, sEarthEmb, et, this.le);
        const earthSsb = addSV(svEmbSsb, svEarthEmb);
        return subtractSV(svSunSsb, earthSsb);
      }
    }
    const sTargetSsb = this.findSeg(target, ssb, et);
    const sCenterSsb = this.findSeg(center, ssb, et);
    if (sTargetSsb && sCenterSsb) {
      return subtractSV(
        evaluateSegment(this.buffer, sTargetSsb, et, this.le),
        evaluateSegment(this.buffer, sCenterSsb, et, this.le)
      );
    }
    throw new Error(`SpkKernel: no path for target=${target} center=${center} et=${et}`);
  }
  getSegments() {
    return this.segments;
  }
};
function parseDafFileRecord(buffer) {
  const dv = new DataView(buffer);
  let le = true;
  let nd = dv.getInt32(8, true);
  if (nd < 1 || nd > 100) {
    nd = dv.getInt32(8, false);
    le = false;
  }
  const ni = dv.getInt32(12, le);
  const fward = dv.getInt32(76, le);
  const bward = dv.getInt32(80, le);
  const free = dv.getInt32(84, le);
  return { nd, ni, fward, bward, free, le };
}
function parseSummaryRecords(buffer, fward, nd, ni, le) {
  const dv = new DataView(buffer);
  const segments = [];
  const summaryBytes = nd * BYTES_PER_DOUBLE + ni * 4;
  let recordNum = fward;
  while (recordNum !== 0) {
    const recOffset = (recordNum - 1) * DAF_RECORD_SIZE;
    const nextRecord = dv.getFloat64(recOffset, le);
    const nSummaries = Math.round(dv.getFloat64(recOffset + 16, le));
    let offset = recOffset + 24;
    for (let i = 0; i < nSummaries; i++) {
      if (offset + summaryBytes > buffer.byteLength) break;
      const startET = dv.getFloat64(offset, le);
      const endET = dv.getFloat64(offset + 8, le);
      offset += nd * BYTES_PER_DOUBLE;
      const target = dv.getInt32(offset, le);
      const center = dv.getInt32(offset + 4, le);
      const frame = dv.getInt32(offset + 8, le);
      const dataType = dv.getInt32(offset + 12, le);
      const beginAddr = dv.getInt32(offset + 16, le);
      const endAddr = dv.getInt32(offset + 20, le);
      offset += ni * 4;
      const dataOffset = (beginAddr - 1) * BYTES_PER_DOUBLE;
      const dataSize = endAddr - beginAddr + 1;
      segments.push({ target, center, frame, dataType, startET, endET, dataOffset, dataSize });
    }
    recordNum = Math.round(nextRecord);
  }
  return segments;
}
function evaluateSegment(buffer, seg, et, le) {
  if (seg.dataType === 2) return evaluateType2(buffer, seg, et, le);
  if (seg.dataType === 3) return evaluateType3(buffer, seg, et, le);
  throw new Error(`Unsupported SPK segment type: ${seg.dataType}`);
}
function evaluateType2(buffer, seg, et, le = true) {
  const dv = new DataView(buffer);
  const endOffset = seg.dataOffset + seg.dataSize * BYTES_PER_DOUBLE;
  const N = dv.getFloat64(endOffset - BYTES_PER_DOUBLE, le);
  const rsize = dv.getFloat64(endOffset - 2 * BYTES_PER_DOUBLE, le);
  const intlen = dv.getFloat64(endOffset - 3 * BYTES_PER_DOUBLE, le);
  const init = dv.getFloat64(endOffset - 4 * BYTES_PER_DOUBLE, le);
  const nCoeffs = Math.round((rsize - 2) / 3);
  let recIdx = Math.floor((et - init) / intlen);
  recIdx = Math.max(0, Math.min(Math.round(N) - 1, recIdx));
  const recOffset = seg.dataOffset + recIdx * rsize * BYTES_PER_DOUBLE;
  const mid = dv.getFloat64(recOffset, le);
  const radius = dv.getFloat64(recOffset + BYTES_PER_DOUBLE, le);
  const x = (et - mid) / radius;
  const xC = readCoeffs(dv, recOffset + 2 * BYTES_PER_DOUBLE, nCoeffs, le);
  const yC = readCoeffs(dv, recOffset + (2 + nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const zC = readCoeffs(dv, recOffset + (2 + 2 * nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const [px, vx] = chebyshevEvalWithDerivative(xC, x, radius);
  const [py, vy] = chebyshevEvalWithDerivative(yC, x, radius);
  const [pz, vz] = chebyshevEvalWithDerivative(zC, x, radius);
  return { position: [px, py, pz], velocity: [vx, vy, vz] };
}
function evaluateType3(buffer, seg, et, le = true) {
  const dv = new DataView(buffer);
  const endOffset = seg.dataOffset + seg.dataSize * BYTES_PER_DOUBLE;
  const N = dv.getFloat64(endOffset - BYTES_PER_DOUBLE, le);
  const rsize = dv.getFloat64(endOffset - 2 * BYTES_PER_DOUBLE, le);
  const intlen = dv.getFloat64(endOffset - 3 * BYTES_PER_DOUBLE, le);
  const init = dv.getFloat64(endOffset - 4 * BYTES_PER_DOUBLE, le);
  const nCoeffs = Math.round((rsize - 2) / 6);
  let recIdx = Math.floor((et - init) / intlen);
  recIdx = Math.max(0, Math.min(Math.round(N) - 1, recIdx));
  const recOffset = seg.dataOffset + recIdx * rsize * BYTES_PER_DOUBLE;
  const mid = dv.getFloat64(recOffset, le);
  const radius = dv.getFloat64(recOffset + BYTES_PER_DOUBLE, le);
  const x = (et - mid) / radius;
  const xPC = readCoeffs(dv, recOffset + 2 * BYTES_PER_DOUBLE, nCoeffs, le);
  const yPC = readCoeffs(dv, recOffset + (2 + nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const zPC = readCoeffs(dv, recOffset + (2 + 2 * nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const xVC = readCoeffs(dv, recOffset + (2 + 3 * nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const yVC = readCoeffs(dv, recOffset + (2 + 4 * nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const zVC = readCoeffs(dv, recOffset + (2 + 5 * nCoeffs) * BYTES_PER_DOUBLE, nCoeffs, le);
  const px = chebyshevEvalWithDerivative(xPC, x, radius)[0];
  const py = chebyshevEvalWithDerivative(yPC, x, radius)[0];
  const pz = chebyshevEvalWithDerivative(zPC, x, radius)[0];
  const vx = chebyshevEvalWithDerivative(xVC, x, radius)[0];
  const vy = chebyshevEvalWithDerivative(yVC, x, radius)[0];
  const vz = chebyshevEvalWithDerivative(zVC, x, radius)[0];
  return { position: [px, py, pz], velocity: [vx, vy, vz] };
}
function readCoeffs(dv, offset, n, le) {
  const arr = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    arr[k] = dv.getFloat64(offset + k * BYTES_PER_DOUBLE, le);
  }
  return arr;
}
function subtractSV(a, b) {
  return {
    position: [
      a.position[0] - b.position[0],
      a.position[1] - b.position[1],
      a.position[2] - b.position[2]
    ],
    velocity: [
      a.velocity[0] - b.velocity[0],
      a.velocity[1] - b.velocity[1],
      a.velocity[2] - b.velocity[2]
    ]
  };
}
function addSV(a, b) {
  return {
    position: [
      a.position[0] + b.position[0],
      a.position[1] + b.position[1],
      a.position[2] + b.position[2]
    ],
    velocity: [
      a.velocity[0] + b.velocity[0],
      a.velocity[1] + b.velocity[1],
      a.velocity[2] + b.velocity[2]
    ]
  };
}

// src/time/index.ts
var J2000 = 2451545;
var TT_MINUS_TAI = 32.184;
var SECONDS_PER_DAY = 86400;
var DAYS_PER_JULIAN_CENTURY = 36525;
var LEAP_SECOND_TABLE = [
  [24413175e-1, 10],
  // 1972 Jan 1
  [24414995e-1, 11],
  // 1972 Jul 1
  [24416835e-1, 12],
  // 1973 Jan 1
  [24420485e-1, 13],
  // 1974 Jan 1
  [24424135e-1, 14],
  // 1975 Jan 1
  [24427785e-1, 15],
  // 1976 Jan 1
  [24431445e-1, 16],
  // 1977 Jan 1
  [24435095e-1, 17],
  // 1978 Jan 1
  [24438745e-1, 18],
  // 1979 Jan 1
  [24442395e-1, 19],
  // 1980 Jan 1
  [24447865e-1, 20],
  // 1981 Jul 1
  [24451515e-1, 21],
  // 1982 Jul 1
  [24455165e-1, 22],
  // 1983 Jul 1
  [24462475e-1, 23],
  // 1985 Jul 1
  [24471615e-1, 24],
  // 1988 Jan 1
  [24478925e-1, 25],
  // 1990 Jan 1
  [24482575e-1, 26],
  // 1991 Jan 1
  [24488045e-1, 27],
  // 1992 Jul 1
  [24491695e-1, 28],
  // 1993 Jul 1
  [24495345e-1, 29],
  // 1994 Jul 1
  [24500835e-1, 30],
  // 1996 Jan 1
  [24506305e-1, 31],
  // 1997 Jul 1
  [24511795e-1, 32],
  // 1999 Jan 1
  [24537365e-1, 33],
  // 2006 Jan 1
  [24548325e-1, 34],
  // 2009 Jan 1
  [24561095e-1, 35],
  // 2012 Jul 1
  [24572045e-1, 36],
  // 2015 Jul 1
  [24577545e-1, 37]
  // 2017 Jan 1
];
function getDeltaAT(jdUTC) {
  let deltaAT = 10;
  for (const [jd, dat] of LEAP_SECOND_TABLE) {
    if (jdUTC >= jd) deltaAT = dat;
    else break;
  }
  return deltaAT;
}
function dateToJD(date) {
  return date.getTime() / 864e5 + 24405875e-1;
}
function jdToDate(jd) {
  return new Date((jd - 24405875e-1) * 864e5);
}
function computeTimeScales(utc, ut1utcOverride, deltaTOverride) {
  const jdUTC = dateToJD(utc);
  const deltaAT = getDeltaAT(jdUTC);
  const jdTAI = jdUTC + deltaAT / SECONDS_PER_DAY;
  const jdTT = jdTAI + TT_MINUS_TAI / SECONDS_PER_DAY;
  const tdbCorrection = tdbMinusTT(jdTT) / SECONDS_PER_DAY;
  const jdTDB = jdTT + tdbCorrection;
  let jdUT1;
  let deltaT;
  if (ut1utcOverride !== void 0) {
    jdUT1 = jdUTC + ut1utcOverride / SECONDS_PER_DAY;
    deltaT = (jdTT - jdUT1) * SECONDS_PER_DAY;
  } else if (deltaTOverride !== void 0) {
    deltaT = deltaTOverride;
    jdUT1 = jdTT - deltaT / SECONDS_PER_DAY;
  } else {
    deltaT = deltaTPolynomial(jdTT);
    jdUT1 = jdTT - deltaT / SECONDS_PER_DAY;
  }
  return { utc, jdUTC, jdTT, jdTDB, jdUT1, deltaT, deltaAT };
}
function jdTTtoET(jdTT) {
  const tdbCorr = tdbMinusTT(jdTT);
  return (jdTT - J2000) * SECONDS_PER_DAY + tdbCorr;
}
function tdbMinusTT(jdTT) {
  const d = jdTT - J2000;
  const gDeg = 357.53 + 0.9856003 * d;
  const g = gDeg * Math.PI / 180;
  return 1658e-6 * Math.sin(g) + 14e-6 * Math.sin(2 * g);
}
function deltaTPolynomial(jdTT) {
  const y = 2e3 + (jdTT - J2000) / 365.25;
  if (y < -500) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (y < 500) {
    const u = y / 100;
    return 10583.6 - 1014.41 * u + 33.78311 * u * u - 5.952053 * u * u * u - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (y < 1600) {
    const u = (y - 1e3) / 100;
    return 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u ** 3 - 0.8503463 * u ** 4 - 5050998e-9 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129;
  } else if (y < 1800) {
    const t = y - 1700;
    return 8.83 + 0.1603 * t - 59285e-7 * t * t + 13336e-8 * t ** 3 - t ** 4 / 1174e3;
  } else if (y < 1860) {
    const t = y - 1800;
    return 13.72 - 0.332447 * t + 68612e-7 * t * t + 41116e-7 * t ** 3 - 37436e-8 * t ** 4 + 121272e-10 * t ** 5 - 1699e-10 * t ** 6 + 875e-12 * t ** 7;
  } else if (y < 1900) {
    const t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 4473624e-10 * t ** 4 + t ** 5 / 233174;
  } else if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 61966e-7 * t ** 3 - 197e-6 * t ** 4;
  } else if (y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 20936e-7 * t ** 3;
  } else if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    const t = y - 2e3;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 17275e-7 * t ** 3 + 651814e-9 * t ** 4 + 2373599e-11 * t ** 5;
  } else if (y < 2050) {
    const t = y - 2e3;
    return 62.92 + 0.32217 * t + 5589e-6 * t * t;
  } else if (y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  } else {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
}

// src/bodies/index.ts
var AU_KM = 1495978707e-1;
var MOON_RADIUS_KM = 1737.4;
function getMoonGeocentricState(kernel, et) {
  return kernel.getState(NAIF_IDS.MOON, NAIF_IDS.EARTH, et);
}
function getSunGeocentricState(kernel, et) {
  return kernel.getState(NAIF_IDS.SUN, NAIF_IDS.EARTH, et);
}
function computeIllumination(moonGCRS, sunGCRS) {
  const rMoon = vnorm(moonGCRS);
  const rSun = vnorm(sunGCRS);
  const cosElong = vdot(moonGCRS, sunGCRS) / (rMoon * rSun);
  const elongationDeg = Math.acos(Math.max(-1, Math.min(1, cosElong))) / DEG2RAD;
  const moonToSun = [
    sunGCRS[0] - moonGCRS[0],
    sunGCRS[1] - moonGCRS[1],
    sunGCRS[2] - moonGCRS[2]
  ];
  const moonToEarth = [-moonGCRS[0], -moonGCRS[1], -moonGCRS[2]];
  const rMoonToSun = vnorm(moonToSun);
  const cosPhase = vdot(moonToEarth, moonToSun) / (rMoon * rMoonToSun);
  const phaseAngleDeg = Math.acos(Math.max(-1, Math.min(1, cosPhase))) / DEG2RAD;
  const illumination = (1 + Math.cos(phaseAngleDeg * DEG2RAD)) / 2;
  const crossZ = sunGCRS[0] * moonGCRS[1] - sunGCRS[1] * moonGCRS[0];
  const isWaxing = crossZ > 0;
  return { illumination, phaseAngleDeg, elongationDeg, isWaxing };
}
function computeCrescentWidth(moonTopoVec, ARCL) {
  const rMoon = Math.sqrt(moonTopoVec[0] ** 2 + moonTopoVec[1] ** 2 + moonTopoVec[2] ** 2);
  const SDmoon_arcmin = Math.atan(MOON_RADIUS_KM / rMoon) / DEG2RAD * 60;
  const ARCL_rad = ARCL * DEG2RAD;
  const W = SDmoon_arcmin * (1 - Math.cos(ARCL_rad));
  return { W, Wprime: W };
}
function getMoonSunApproximate(jdTT) {
  const T = (jdTT - J2000) / DAYS_PER_JULIAN_CENTURY;
  const L0 = 280.46646 + 36000.76983 * T + 3032e-7 * T * T;
  const M_sun = 357.52911 + 35999.05029 * T - 1537e-7 * T * T;
  const M_sun_rad = M_sun % 360 * DEG2RAD;
  const e_sun = 0.016708634 - 42037e-9 * T - 1267e-10 * T * T;
  const C = (1.914602 - 4817e-6 * T - 14e-6 * T * T) * Math.sin(M_sun_rad) + (0.019993 - 101e-6 * T) * Math.sin(2 * M_sun_rad) + 289e-6 * Math.sin(3 * M_sun_rad);
  const sunLonDeg = L0 + C;
  const nu_rad = M_sun_rad + C * DEG2RAD;
  const R_AU = 1.000001018 * (1 - e_sun * e_sun) / (1 + e_sun * Math.cos(nu_rad));
  const R_km = R_AU * AU_KM;
  const omega = (125.04 - 1934.136 * T) * DEG2RAD;
  const sunLonApp = sunLonDeg - 569e-5 - 478e-5 * Math.sin(omega);
  const sunLon_rad = sunLonApp * DEG2RAD;
  const eps = (23.439291111 - 0.013004167 * T - 1638e-10 * T * T + 5036e-10 * T * T * T) * DEG2RAD;
  const sunGCRS = [
    R_km * Math.cos(sunLon_rad),
    R_km * Math.sin(sunLon_rad) * Math.cos(eps),
    R_km * Math.sin(sunLon_rad) * Math.sin(eps)
  ];
  const Lp = 218.3164477 + 481267.88123421 * T - 15786e-7 * T * T + T * T * T / 538841 - T * T * T * T / 65194e3;
  const D = 297.8501921 + 445267.1114034 * T - 18819e-7 * T * T + T * T * T / 545868 - T * T * T * T / 113065e3;
  const M = 357.5291092 + 35999.0502909 * T - 1536e-7 * T * T + T * T * T / 2449e4;
  const Mp = 134.9633964 + 477198.8675055 * T + 87414e-7 * T * T + T * T * T / 69699 - T * T * T * T / 14712e3;
  const F = 93.272095 + 483202.0175233 * T - 36539e-7 * T * T - T * T * T / 3526e3 + T * T * T * T / 86331e4;
  const A1 = (119.75 + 131.849 * T) * DEG2RAD;
  const A2 = (53.09 + 479264.29 * T) * DEG2RAD;
  const A3 = (313.45 + 481266.484 * T) * DEG2RAD;
  const D_r = D % 360 * DEG2RAD;
  const M_r = M % 360 * DEG2RAD;
  const Mp_r = Mp % 360 * DEG2RAD;
  const F_r = F % 360 * DEG2RAD;
  const E = 1 - 2516e-6 * T - 74e-7 * T * T;
  const LD = [
    [0, 0, 1, 0, 6288774, -20905355],
    [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888],
    [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158],
    [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620],
    [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755],
    [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782],
    [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636],
    [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675],
    [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445],
    [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0],
    [2, -1, -2, 0, 2390, 10056]
  ];
  let Sl = 0, Sr = 0;
  for (const [d, m, mp, f, sl, sr] of LD) {
    const arg = d * D_r + m * M_r + mp * Mp_r + f * F_r;
    const eCorr = Math.abs(m) === 2 ? E * E : Math.abs(m) === 1 ? E : 1;
    Sl += sl * eCorr * Math.sin(arg);
    Sr += sr * eCorr * Math.cos(arg);
  }
  Sl += 3958 * Math.sin(A1) + 1962 * Math.sin((Lp - F) * DEG2RAD) + 318 * Math.sin(A2);
  const FB = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794]
  ];
  let Sb = 0;
  for (const [d, m, mp, f, sb] of FB) {
    const arg = d * D_r + m * M_r + mp * Mp_r + f * F_r;
    const eCorr = Math.abs(m) === 2 ? E * E : Math.abs(m) === 1 ? E : 1;
    Sb += sb * eCorr * Math.sin(arg);
  }
  Sb += -2235 * Math.sin(Lp * DEG2RAD) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F_r) + 175 * Math.sin(A1 + F_r) + 127 * Math.sin((Lp - Mp) * DEG2RAD) - 115 * Math.sin((Lp + Mp) * DEG2RAD);
  const moonLonDeg = Lp + Sl * 1e-6;
  const moonLatDeg = Sb * 1e-6;
  const moonDistKm = 385000.56 + Sr * 1e-3;
  const moonLon_rad = moonLonDeg * DEG2RAD;
  const moonLat_rad = moonLatDeg * DEG2RAD;
  const moonGCRS = [
    moonDistKm * Math.cos(moonLat_rad) * Math.cos(moonLon_rad),
    moonDistKm * (Math.cos(eps) * Math.cos(moonLat_rad) * Math.sin(moonLon_rad) - Math.sin(eps) * Math.sin(moonLat_rad)),
    moonDistKm * (Math.sin(eps) * Math.cos(moonLat_rad) * Math.sin(moonLon_rad) + Math.cos(eps) * Math.sin(moonLat_rad))
  ];
  return { moonGCRS, sunGCRS };
}
function nearestNewMoon(jdTT) {
  const Y = 2e3 + (jdTT - J2000) / 365.25;
  const k = Math.round((Y - 2e3) * 12.3685);
  const T = k / 1236.85;
  let JDE = 245155009766e-5 + 29.530588861 * k + 15437e-8 * T * T - 15e-8 * T * T * T + 73e-11 * T * T * T * T;
  const M = (2.5534 + 29.1053567 * k - 14e-7 * T * T - 11e-8 * T * T * T) * DEG2RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 1238e-8 * T * T * T) * DEG2RAD;
  const Fc = (160.7108 + 390.67050284 * k - 16118e-7 * T * T - 227e-8 * T * T * T) * DEG2RAD;
  const Om = (124.7746 - 1.56375588 * k + 20672e-7 * T * T + 215e-8 * T * T * T) * DEG2RAD;
  const E = 1 - 2516e-6 * T - 74e-7 * T * T;
  JDE += -0.4072 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * Fc) + 739e-5 * E * Math.sin(Mp - M) - 514e-5 * E * Math.sin(Mp + M) + 208e-5 * E * E * Math.sin(2 * M) - 111e-5 * Math.sin(Mp - 2 * Fc) - 57e-5 * Math.sin(Mp + 2 * Fc) + 56e-5 * E * Math.sin(2 * Mp + M) - 42e-5 * Math.sin(3 * Mp) + 42e-5 * E * Math.sin(M + 2 * Fc) + 38e-5 * E * Math.sin(M - 2 * Fc) - 24e-5 * E * Math.sin(2 * Mp - M) - 17e-5 * Math.sin(Om) - 7e-5 * Math.sin(Mp + 2 * M) + 4e-5 * Math.sin(2 * Mp - 2 * Fc) + 4e-5 * Math.sin(3 * M) + 3e-5 * Math.sin(Mp + M - 2 * Fc) + 3e-5 * Math.sin(2 * Mp + 2 * Fc) - 3e-5 * Math.sin(Mp + M + 2 * Fc) + 3e-5 * Math.sin(Mp - M + 2 * Fc) - 2e-5 * Math.sin(Mp - M - 2 * Fc) - 2e-5 * Math.sin(3 * Mp + M) + 2e-5 * Math.sin(4 * Mp);
  return JDE;
}

// src/frames/index.ts
var ARCSEC_RAD = Math.PI / (180 * 3600);
var UAS01_TO_ARCSEC = 1e-7;
var NUT_2000B = [
  // 1
  [0, 0, 0, 0, 1, -172064161, -174666, 33386, 92052331, 9086, 15377],
  // 2
  [0, 0, 2, -2, 2, -13170906, -13696, -13238, 5730336, -3015, -4587],
  // 3
  [0, 0, 2, 0, 2, -2276413, -2353, 2796, 978459, -619, 645],
  // 4
  [0, 0, 0, 0, 2, 2074554, 2352, -2635, -897492, 307, -187],
  // 5
  [0, 1, 0, 0, 0, 1475877, -11817, 11817, 73871, -184, -1924],
  // 6
  [0, 1, 2, -2, 2, -516821, 1226, -524, 224386, -677, -174],
  // 7
  [1, 0, 0, 0, 0, 711159, 73, -872, -6750, 0, 358],
  // 8
  [0, 0, 2, 0, 1, -387298, -367, 380, 200728, 18, 318],
  // 9
  [1, 0, 2, 0, 2, -301461, -36, 816, 129025, -63, 367],
  // 10
  [0, -1, 2, -2, 2, 215829, -494, 111, -95929, 299, 132],
  // 11
  [0, 0, 2, -2, 1, 128227, 137, 181, -68982, -9, 39],
  // 12
  [-1, 0, 2, 0, 2, 123457, 11, 19, -53311, 32, -4],
  // 13
  [-1, 0, 0, 2, 0, 156994, 10, -168, -1235, 0, 82],
  // 14
  [1, 0, 0, 0, 1, 63110, 63, 27, -33228, 0, -9],
  // 15
  [-1, 0, 0, 0, 1, -57976, -63, -189, 31429, 0, -75],
  // 16
  [-1, 0, 2, 2, 2, -59641, -11, 149, 25543, -11, 66],
  // 17
  [1, 0, 2, 0, 1, -51613, -42, 129, 26366, 0, 78],
  // 18
  [-2, 0, 2, 0, 1, 45893, 50, 31, -24236, -10, 20],
  // 19
  [0, 0, 0, 2, 0, 63384, 11, -150, -1220, 0, 29],
  // 20
  [0, 0, 2, 2, 2, -38571, -1, 158, 16452, -11, 68],
  // 21
  [0, -2, 2, -2, 2, 32481, 0, 0, -13870, 0, 0],
  // 22
  [-2, 0, 0, 2, 0, -47722, 0, -18, 477, 0, -25],
  // 23
  [2, 0, 2, 0, 2, -31046, -1, 131, 13238, -11, 59],
  // 24
  [1, 0, 2, -2, 2, 28593, 0, -1, -12338, 10, -3],
  // 25
  [-1, 0, 2, 0, 1, 20441, 21, 10, -10758, 0, -3],
  // 26
  [2, 0, 0, 0, 0, 29243, 0, -74, -609, 0, 13],
  // 27
  [0, 0, 2, 0, 0, 25887, 0, -66, -550, 0, 11],
  // 28
  [0, 1, 0, 0, 1, -14053, -25, 79, 8551, -2, -45],
  // 29
  [-1, 0, 0, 2, 1, 15164, 10, 11, -8001, 0, -1],
  // 30
  [0, 2, 2, -2, 2, -15794, 72, -16, 6850, -42, -5],
  // 31
  [0, 0, -2, 2, 0, 21783, 0, 13, -167, 0, 13],
  // 32
  [1, 0, 0, -2, 1, -12873, -10, -37, 6953, 0, -14],
  // 33
  [0, -1, 0, 0, 1, -12654, 11, 63, 6415, 0, 26],
  // 34
  [-1, 0, 2, 2, 1, -10204, 0, 25, 5222, 0, 15],
  // 35
  [0, 2, 0, 0, 0, 16707, -85, -10, 168, -1, 10],
  // 36
  [1, 0, 2, 2, 2, -7691, 0, 44, 3268, 0, 19],
  // 37
  [-2, 0, 2, 0, 0, -11024, 0, -14, 104, 0, 2],
  // 38
  [0, 1, 2, 0, 2, 7566, -21, -11, -3250, 0, -5],
  // 39
  [0, 0, 2, 2, 1, -6637, -11, 25, 3353, 0, 14],
  // 40
  [0, -1, 2, 0, 2, -7141, 21, 8, 3070, 0, 4],
  // 41
  [0, 0, 0, 2, 1, -6302, -11, 2, 3272, 0, 4],
  // 42
  [1, 0, 2, -2, 1, 5800, 10, 2, -3045, 0, -1],
  // 43
  [2, 0, 2, -2, 2, 6443, 0, -7, -2768, 0, -4],
  // 44
  [-2, 0, 0, 2, 1, -5774, -11, -15, 3041, 0, -5],
  // 45
  [2, 0, 2, 0, 1, -5350, 0, 21, 2695, 0, 12],
  // 46
  [0, -1, 2, -2, 1, -4752, -11, -3, 2719, 0, -3],
  // 47
  [0, 0, 0, -2, 1, -4940, -11, -21, 2720, 0, -9],
  // 48
  [-1, -1, 0, 2, 0, 7350, 0, -8, -51, 0, 4],
  // 49
  [2, 0, 0, -2, 1, 4065, 0, 6, -2206, 0, 1],
  // 50
  [1, 0, 0, 2, 0, 6579, 0, -24, -199, 0, 2],
  // 51
  [0, 1, 2, -2, 1, 3579, 0, 5, -1900, 0, 1],
  // 52
  [1, -1, 0, 0, 0, 4725, 0, -6, -41, 0, 3],
  // 53
  [-2, 0, 2, 0, 2, -3075, 0, -2, 1313, 0, -1],
  // 54
  [3, 0, 2, 0, 2, -2904, 0, 15, 1233, 0, 7],
  // 55
  [0, -1, 0, 2, 0, 4348, 0, -10, -81, 0, 2],
  // 56
  [1, -1, 2, 0, 2, -2878, 0, 8, 1232, 0, 4],
  // 57
  [0, 0, 0, 1, 0, -4230, 0, 5, -20, 0, -2],
  // 58
  [-1, -1, 2, 2, 2, -2819, 0, 7, 1207, 0, 3],
  // 59
  [-1, 0, 2, 0, 0, -4056, 0, 5, 40, 0, -2],
  // 60
  [0, -1, 2, 2, 2, -2647, 0, 11, 1129, 0, 5],
  // 61
  [-2, 0, 0, 0, 1, -2294, 0, -10, 1266, 0, -4],
  // 62
  [1, 1, 2, 0, 2, 2481, 0, -7, -1062, 0, -3],
  // 63
  [2, 0, 0, 0, 1, 2179, 0, -2, -1129, 0, -2],
  // 64
  [-1, 1, 0, 1, 0, 3276, 0, 1, -9, 0, 0],
  // 65
  [1, 1, 0, 0, 0, -3389, 0, 5, 35, 0, -2],
  // 66
  [1, 0, 2, 0, 0, 3339, 0, -13, -107, 0, 1],
  // 67
  [-1, 0, 2, -2, 1, -1987, 0, -6, 1073, 0, -2],
  // 68
  [1, 0, 0, 0, 2, -1981, 0, 0, 854, 0, 0],
  // 69
  [-1, 0, 0, 1, 0, 4026, 0, -353, -553, 0, -139],
  // 70
  [0, 0, 2, 1, 2, 1660, 0, -5, -710, 0, -2],
  // 71
  [-1, 0, 2, 4, 2, -1521, 0, 9, 647, 0, 4],
  // 72
  [-1, 1, 0, 1, 1, 1464, 0, -11, -527, 0, -1],
  // 73
  [0, -2, 2, -2, 1, -1389, 0, 3, 656, 0, 1],
  // 74
  [1, -1, 2, 2, 2, -1377, 0, 8, 594, 0, 4],
  // 75
  [3, 0, 2, -2, 2, 1371, 0, -2, -588, 0, -1],
  // 76
  [0, 0, 4, -2, 4, 1341, 0, 0, -577, 0, 0],
  // 77
  [0, 0, 2, -2, 4, -1316, 0, 0, 567, 0, 0]
];
function arcsecToRad(arcsec) {
  const r = arcsec * ARCSEC_RAD % (2 * Math.PI);
  return r >= 0 ? r : r + 2 * Math.PI;
}
function fundamentalL(T) {
  return arcsecToRad(
    485868.249036 + T * (17179159232178e-4 + T * (31.8792 + T * (0.051635 + T * -2447e-7)))
  );
}
function fundamentalLp(T) {
  return arcsecToRad(
    1287104793048e-6 + T * (1295965810481e-4 + T * (-0.5532 + T * (136e-6 + T * -1149e-8)))
  );
}
function fundamentalF(T) {
  return arcsecToRad(
    335779.526232 + T * (17395272628478e-4 + T * (-12.7512 + T * (-1037e-6 + T * 417e-8)))
  );
}
function fundamentalD(T) {
  return arcsecToRad(
    1072260703692e-6 + T * (1602961601209e-3 + T * (-6.3706 + T * (6593e-6 + T * -3169e-8)))
  );
}
function fundamentalOm(T) {
  return arcsecToRad(
    450160.398036 + T * (-69628905431e-4 + T * (7.4722 + T * (7702e-6 + T * -5939e-8)))
  );
}
function computeCIPXYs(jdTT) {
  const T = (jdTT - J2000) / DAYS_PER_JULIAN_CENTURY;
  const l = fundamentalL(T);
  const lp = fundamentalLp(T);
  const F = fundamentalF(T);
  const D = fundamentalD(T);
  const Om = fundamentalOm(T);
  let dpsi = 0;
  let deps = 0;
  for (const [nl, nlp, nF, nD, nOm, ps, pst, pc, ec, ect, es] of NUT_2000B) {
    const arg = nl * l + nlp * lp + nF * F + nD * D + nOm * Om;
    const sinA = Math.sin(arg);
    const cosA = Math.cos(arg);
    dpsi += (ps + pst * T) * sinA + pc * cosA;
    deps += (ec + ect * T) * cosA + es * sinA;
  }
  const dpsiRad = dpsi * UAS01_TO_ARCSEC * ARCSEC_RAD;
  const depsRad = deps * UAS01_TO_ARCSEC * ARCSEC_RAD;
  const eps0 = (84381.406 + T * (-46.836769 + T * (-1831e-7 + T * (20034e-7 + T * (-576e-9 + T * -434e-10))))) * ARCSEC_RAD;
  const Xarcsec = -0.016617 + T * (2004.191898 + T * (-0.4297829 + T * (-0.19861834 + T * (7578e-9 + T * 59285e-10))));
  const Yarcsec = -6951e-6 + T * (-0.025896 + T * (-22.4072747 + T * (190059e-8 + T * (1112526e-9 + T * 1358e-10))));
  const X = Xarcsec * ARCSEC_RAD + dpsiRad * Math.sin(eps0);
  const Y = Yarcsec * ARCSEC_RAD - depsRad;
  const sPoly = -0.041775 * T * ARCSEC_RAD;
  const s = -X * Y / 2 + sPoly;
  return { X, Y, s };
}
function computeERA(jdUT1) {
  const Du = jdUT1 - 2451545;
  const era = 2 * Math.PI * (0.779057273264 + 1.0027378119113546 * Du);
  return (era % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
}
function celestialMotionMatrix(X, Y, s) {
  const r2 = X * X + Y * Y;
  const e = r2 > 0 ? Math.atan2(Y, X) : 0;
  const d = Math.asin(Math.sqrt(r2));
  return mmmul(rotZ(-(e + s)), mmmul(rotY(d), rotZ(e)));
}
function earthRotationMatrix(era) {
  return rotZ(era);
}
function polarMotionMatrix(xp, yp) {
  return mmmul(rotY(xp), rotX(-yp));
}
function gcrsToItrs(gcrsVec, ts, xp = 0, yp = 0) {
  const { X, Y, s } = computeCIPXYs(ts.jdTT);
  const Q = celestialMotionMatrix(X, Y, s);
  const era = computeERA(ts.jdUT1);
  const R = earthRotationMatrix(era);
  const W = polarMotionMatrix(xp, yp);
  const combined = mmmul(W, mmmul(R, Q));
  return mvmul(combined, gcrsVec);
}
function itrsToGcrs(itrsVec, ts, xp = 0, yp = 0) {
  const { X, Y, s } = computeCIPXYs(ts.jdTT);
  const Q = celestialMotionMatrix(X, Y, s);
  const era = computeERA(ts.jdUT1);
  const R = earthRotationMatrix(era);
  const W = polarMotionMatrix(xp, yp);
  const combined = mmmul(mtranspose(Q), mmmul(mtranspose(R), mtranspose(W)));
  return mvmul(combined, itrsVec);
}

// src/observer/index.ts
function geodeticToECEF(lat, lon, elev) {
  const phi = lat * Math.PI / 180;
  const lam = lon * Math.PI / 180;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinPhi * sinPhi);
  return [
    (N + elev) * cosPhi * Math.cos(lam),
    (N + elev) * cosPhi * Math.sin(lam),
    (N * (1 - WGS84.e2) + elev) * sinPhi
  ];
}
function computeENUBasis(lat, lon) {
  const phi = lat * Math.PI / 180;
  const lam = lon * Math.PI / 180;
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
  const sinLam = Math.sin(lam), cosLam = Math.cos(lam);
  const east = [-sinLam, cosLam, 0];
  const north = [-sinPhi * cosLam, -sinPhi * sinLam, cosPhi];
  const up = [cosPhi * cosLam, cosPhi * sinLam, sinPhi];
  return { east, north, up };
}
function ecefToENU(ecefDelta, lat, lon) {
  const { east, north, up } = computeENUBasis(lat, lon);
  return [vdot(ecefDelta, east), vdot(ecefDelta, north), vdot(ecefDelta, up)];
}
function enuToAzAlt(enu) {
  const [e, n, u] = enu;
  const horiz = Math.sqrt(e * e + n * n);
  const altitude = Math.atan2(u, horiz) * 180 / Math.PI;
  let azimuth = Math.atan2(e, n) * 180 / Math.PI;
  if (azimuth < 0) azimuth += 360;
  return { azimuth, altitude };
}
function computeAzAlt(bodyGCRS, observer, ts, airless) {
  const bodyITRS = gcrsToItrs(bodyGCRS, ts);
  const obsECEF = geodeticToECEF(observer.lat, observer.lon, observer.elevation);
  const obsITRS = [obsECEF[0] / 1e3, obsECEF[1] / 1e3, obsECEF[2] / 1e3];
  const delta = [
    bodyITRS[0] - obsITRS[0],
    bodyITRS[1] - obsITRS[1],
    bodyITRS[2] - obsITRS[2]
  ];
  const enu = ecefToENU(delta, observer.lat, observer.lon);
  const azAlt = enuToAzAlt(enu);
  if (!airless) {
    azAlt.altitude = applyRefraction(azAlt.altitude, observer.pressure, observer.temperature);
  }
  return azAlt;
}
function bennettRefraction(altitudeDeg, pressure = 1013.25, temperature = 15) {
  if (altitudeDeg < -1) return 0;
  const h = altitudeDeg;
  const argDeg = h + 7.31 / (h + 4.4);
  const argRad = argDeg * Math.PI / 180;
  const R = 1 / (Math.tan(argRad) * 60);
  const corrected = R * (pressure / 1010) * (283 / (273 + temperature));
  return Math.max(0, corrected);
}
function applyRefraction(airlessAlt, pressure = 1013.25, temperature = 15) {
  return airlessAlt + bennettRefraction(airlessAlt, pressure, temperature);
}

// src/visibility/index.ts
function arcvMinimum(W) {
  return 11.8371 - 6.3226 * W + 0.7319 * W * W - 0.1018 * W * W * W;
}
function computeYallopQ(ARCV, Wprime) {
  return (ARCV - arcvMinimum(Wprime)) / 10;
}
function yallopCategory(q) {
  if (q > YALLOP_THRESHOLDS.A) return "A";
  if (q > YALLOP_THRESHOLDS.B) return "B";
  if (q > YALLOP_THRESHOLDS.C) return "C";
  if (q > YALLOP_THRESHOLDS.D) return "D";
  if (q > YALLOP_THRESHOLDS.E) return "E";
  return "F";
}
function computeYallop(geometry, Wprime) {
  const q = computeYallopQ(geometry.ARCV, Wprime);
  const category = yallopCategory(q);
  return {
    q,
    category,
    description: YALLOP_DESCRIPTIONS[category],
    isVisibleNakedEye: category === "A" || category === "B",
    requiresOpticalAid: category === "C" || category === "D",
    isBelowDanjonLimit: category === "F",
    Wprime
  };
}
function computeOdehV(ARCV, W) {
  return ARCV - arcvMinimum(W);
}
function odehZone(V) {
  if (V >= ODEH_THRESHOLDS.A) return "A";
  if (V >= ODEH_THRESHOLDS.B) return "B";
  if (V >= ODEH_THRESHOLDS.C) return "C";
  return "D";
}
function computeOdeh(geometry) {
  const V = computeOdehV(geometry.ARCV, geometry.W);
  const zone = odehZone(V);
  return {
    V,
    zone,
    description: ODEH_DESCRIPTIONS[zone],
    isVisibleNakedEye: zone === "A",
    isVisibleWithOpticalAid: zone === "A" || zone === "B"
  };
}
function computeCrescentGeometry(moonAirlessAzAlt, sunAirlessAzAlt, moonGCRS, sunGCRS, sunsetUTC, moonsetUTC) {
  const ARCV = moonAirlessAzAlt.altitude - sunAirlessAzAlt.altitude;
  let DAZ = sunAirlessAzAlt.azimuth - moonAirlessAzAlt.azimuth;
  if (DAZ > 180) DAZ -= 360;
  if (DAZ < -180) DAZ += 360;
  const ARCL = angularSep(moonGCRS, sunGCRS) * (180 / Math.PI);
  const { W } = computeCrescentWidth(moonGCRS, ARCL);
  const lag = (moonsetUTC.getTime() - sunsetUTC.getTime()) / 6e4;
  return { ARCL, ARCV, DAZ, W, lag };
}
function buildGuidanceText(yallop, odeh, moonAz, moonAlt, bestTimeUTC, lagMinutes) {
  const direction = azimuthToCardinal(moonAz);
  const timeStr = bestTimeUTC.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const lagStr = `${Math.round(lagMinutes)} min after sunset`;
  let visibility;
  if (yallop.isVisibleNakedEye && odeh.isVisibleNakedEye) {
    visibility = "should be visible to the naked eye";
  } else if (odeh.isVisibleWithOpticalAid) {
    visibility = "may require binoculars or a telescope to spot";
  } else if (yallop.isBelowDanjonLimit) {
    visibility = "is too close to the Sun to form a visible crescent (below Danjon limit)";
  } else {
    visibility = "is not expected to be visible even with optical aid";
  }
  return `Best time to look: ${timeStr} (${lagStr}). Look ${direction} at ${Math.round(moonAlt)}\xB0 above the horizon. The crescent ${visibility}. Yallop: ${yallop.category} (${yallop.description}). Odeh: ${odeh.zone} (${odeh.description}).`;
}
function azimuthToCardinal(az) {
  const dirs = [
    "North",
    "NNE",
    "NE",
    "ENE",
    "East",
    "ESE",
    "SE",
    "SSE",
    "South",
    "SSW",
    "SW",
    "WSW",
    "West",
    "WNW",
    "NW",
    "NNW"
  ];
  const idx = Math.round(az / 22.5) % 16;
  return dirs[(idx + 16) % 16];
}

// src/events/index.ts
var SUN_ALTITUDE_THRESHOLD = -0.8333;
var MOON_ALTITUDE_THRESHOLD = -0.8333;
function etToTS(et) {
  const jdTT = J2000 + et / SECONDS_PER_DAY;
  const jdUTC_est = jdTT - 70 / SECONDS_PER_DAY;
  const deltaAT = getDeltaAT(jdUTC_est);
  const jdUTC = jdTT - (deltaAT + TT_MINUS_TAI) / SECONDS_PER_DAY;
  const utc = jdToDate(jdUTC);
  return computeTimeScales(utc);
}
function bodyPositionAt(kernel, naifId, et) {
  if (naifId === NAIF_IDS.SUN) {
    return getSunGeocentricState(kernel, et).position;
  }
  return getMoonGeocentricState(kernel, et).position;
}
function altitudeMinusThreshold(kernel, naifId, observer, et, threshold) {
  const ts = etToTS(et);
  const bodyGCRS = bodyPositionAt(kernel, naifId, et);
  const azAlt = computeAzAlt(bodyGCRS, observer, ts, true);
  return azAlt.altitude - threshold;
}
function findAltitudeCrossing(kernel, naifId, observer, ts, startET, endET, threshold, rising) {
  void ts;
  const f = (et) => altitudeMinusThreshold(kernel, naifId, observer, et, threshold);
  const STEP_S = 600;
  const nSteps = Math.ceil((endET - startET) / STEP_S);
  let prevET = startET;
  let prevF = f(prevET);
  for (let i = 1; i <= nSteps; i++) {
    const currET = Math.min(startET + i * STEP_S, endET);
    const currF = f(currET);
    const isRisingCross = rising && prevF < 0 && currF >= 0;
    const isSettingCross = !rising && prevF >= 0 && currF < 0;
    if (isRisingCross || isSettingCross) {
      const etCross = brentRoot(f, prevET, currET, 0.5);
      if (etCross !== null) {
        const tsCross = etToTS(etCross);
        return tsCross.utc;
      }
    }
    prevET = currET;
    prevF = currF;
  }
  return null;
}
function getSunMoonEvents(date, observer, kernel) {
  const midnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jdMidnight = dateToJD(midnight);
  const etStart = jdTTtoET(jdMidnight + 70 / SECONDS_PER_DAY);
  const etEnd = etStart + 28 * 3600;
  const ts0 = computeTimeScales(midnight);
  const sunriseUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.SUN,
    observer,
    ts0,
    etStart,
    etEnd,
    SUN_ALTITUDE_THRESHOLD,
    true
  );
  const sunsetUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.SUN,
    observer,
    ts0,
    etStart,
    etEnd,
    SUN_ALTITUDE_THRESHOLD,
    false
  );
  const civilTwilightEndUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.SUN,
    observer,
    ts0,
    etStart,
    etEnd,
    -6,
    false
  );
  const nauticalTwilightEndUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.SUN,
    observer,
    ts0,
    etStart,
    etEnd,
    -12,
    false
  );
  const astronomicalTwilightEndUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.SUN,
    observer,
    ts0,
    etStart,
    etEnd,
    -18,
    false
  );
  const moonriseUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.MOON,
    observer,
    ts0,
    etStart,
    etEnd,
    MOON_ALTITUDE_THRESHOLD,
    true
  );
  const moonsetUTC = findAltitudeCrossing(
    kernel,
    NAIF_IDS.MOON,
    observer,
    ts0,
    etStart,
    etEnd,
    MOON_ALTITUDE_THRESHOLD,
    false
  );
  return {
    sunriseUTC,
    sunsetUTC,
    moonriseUTC,
    moonsetUTC,
    civilTwilightEndUTC,
    nauticalTwilightEndUTC,
    astronomicalTwilightEndUTC
  };
}
function bestTimeHeuristic(sunsetUTC, moonsetUTC) {
  const lagMs = moonsetUTC.getTime() - sunsetUTC.getTime();
  if (lagMs <= 0) return null;
  const lagMinutes = lagMs / 6e4;
  const bestTimeMs = sunsetUTC.getTime() + 4 / 9 * lagMs;
  return {
    bestTimeUTC: new Date(bestTimeMs),
    lagMinutes
  };
}
function bestTimeOptimized(sunsetUTC, moonsetUTC, kernel, observer, steps = 90) {
  const lagMs = moonsetUTC.getTime() - sunsetUTC.getTime();
  if (lagMs <= 0) return null;
  const lagMinutes = lagMs / 6e4;
  const obsECEF = geodeticToECEF(observer.lat, observer.lon, observer.elevation);
  const obsITRS = [obsECEF[0] / 1e3, obsECEF[1] / 1e3, obsECEF[2] / 1e3];
  let bestTimeUTC = sunsetUTC;
  let maxV = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = new Date(sunsetUTC.getTime() + lagMs * i / steps);
    const ts = computeTimeScales(t);
    const et = jdTTtoET(ts.jdTT);
    const moonGCRS = getMoonGeocentricState(kernel, et).position;
    const sunGCRS = getSunGeocentricState(kernel, et).position;
    const obsGCRS = itrsToGcrs(obsITRS, ts);
    const moonAzAlt = computeAzAlt(moonGCRS, observer, ts, true);
    const sunAzAlt = computeAzAlt(sunGCRS, observer, ts, true);
    const ARCV = moonAzAlt.altitude - sunAzAlt.altitude;
    const moonTopo = [
      moonGCRS[0] - obsGCRS[0],
      moonGCRS[1] - obsGCRS[1],
      moonGCRS[2] - obsGCRS[2]
    ];
    const sunTopo = [
      sunGCRS[0] - obsGCRS[0],
      sunGCRS[1] - obsGCRS[1],
      sunGCRS[2] - obsGCRS[2]
    ];
    const cosARCL = vdot(moonTopo, sunTopo) / (vnorm(moonTopo) * vnorm(sunTopo));
    const ARCL = Math.acos(Math.max(-1, Math.min(1, cosARCL))) * (180 / Math.PI);
    const { W } = computeCrescentWidth(moonTopo, ARCL);
    const V = ARCV - arcvMinimum(W);
    if (V > maxV) {
      maxV = V;
      bestTimeUTC = t;
    }
  }
  return { bestTimeUTC, lagMinutes, maxV };
}
function computeObservationWindow(bestTimeUTC, windowMinutes = 20) {
  const windowMs = windowMinutes * 6e4;
  return [new Date(bestTimeUTC.getTime() - windowMs), new Date(bestTimeUTC.getTime() + windowMs)];
}

// src/api/index.ts
var DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
function toCalendarDay(date, label) {
  if (typeof date === "string") {
    const m = DAY_ONLY.exec(date);
    if (!m) {
      throw new RangeError(
        `${label}: expected a 'YYYY-MM-DD' calendar day or a Date, got '${date}'`
      );
    }
    const [, y, mo, d] = m;
    const at = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 12, 0, 0));
    if (at.getUTCMonth() !== Number(mo) - 1 || at.getUTCDate() !== Number(d)) {
      throw new RangeError(`${label}: '${date}' is not a real calendar day`);
    }
    return at;
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new RangeError(`${label}: expected a valid Date instance or a 'YYYY-MM-DD' string`);
  }
  return date;
}
function validateDate(date, label) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new RangeError(`${label}: expected a valid Date instance`);
  }
}
function validateLatitude(lat, label) {
  if (!isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`${label}: latitude must be a finite number in [-90, 90], got ${lat}`);
  }
}
function validateLongitude(lon, label) {
  if (!isFinite(lon) || lon < -180 || lon > 180) {
    throw new RangeError(`${label}: longitude must be a finite number in [-180, 180], got ${lon}`);
  }
}
function validateObserver(observer, label) {
  validateLatitude(observer.lat, label);
  validateLongitude(observer.lon, label);
}
var activeKernel = null;
/* vendored (Prayer Times v3.0.6): offline only. The kernel must be supplied as an in-memory buffer. */
async function initKernels(config) {
  const source = config?.planetary;
  if (!source || source.type !== "buffer") throw new Error("moon-sighting (offline copy): give the kernel as { planetary: { type: 'buffer', data } }");
  activeKernel = SpkKernel.fromBuffer(source.data);
  return activeKernel;
}
function setKernel(kernel) {
  activeKernel = kernel;
}
function getKernel() {
  return activeKernel;
}
async function resolveKernel(config) {
  if (config?.planetary?.type === "buffer") return SpkKernel.fromBuffer(config.planetary.data);
  if (activeKernel) return activeKernel;
  throw new Error("Kernel not loaded. Call initKernels() with the bundled kernel buffer first.");
}
async function getMoonSightingReport(date, observer, options) {
  const day = toCalendarDay(date, "getMoonSightingReport");
  validateObserver(observer, "getMoonSightingReport");
  const kernel = await resolveKernel(options?.kernels);
  const events = getSunMoonEvents(day, observer, kernel);
  const { sunsetUTC, moonsetUTC } = events;
  if (!sunsetUTC || !moonsetUTC) {
    return buildNullReport(day, observer, events, "DE442S", false);
  }
  const method = options?.bestTimeMethod ?? "heuristic";
  let bestTimeResult = null;
  if (method === "optimized") {
    const opt = bestTimeOptimized(sunsetUTC, moonsetUTC, kernel, observer);
    if (opt) bestTimeResult = { bestTimeUTC: opt.bestTimeUTC, lagMinutes: opt.lagMinutes };
  }
  if (!bestTimeResult) {
    bestTimeResult = bestTimeHeuristic(sunsetUTC, moonsetUTC);
  }
  if (!bestTimeResult) {
    return buildNullReport(day, observer, events, "DE442S", false);
  }
  const { bestTimeUTC, lagMinutes } = bestTimeResult;
  const bestTimeWindowUTC = computeObservationWindow(bestTimeUTC);
  const ts = computeTimeScales(bestTimeUTC, observer.ut1utc, observer.deltaT);
  const et = jdTTtoET(ts.jdTT);
  const moonGCRS = getMoonGeocentricState(kernel, et).position;
  const sunGCRS = getSunGeocentricState(kernel, et).position;
  const obsECEF = geodeticToECEF(observer.lat, observer.lon, observer.elevation);
  const obsITRS = [obsECEF[0] / 1e3, obsECEF[1] / 1e3, obsECEF[2] / 1e3];
  const obsGCRS = itrsToGcrs(obsITRS, ts);
  const moonAirless = computeAzAlt(moonGCRS, observer, ts, true);
  const sunAirless = computeAzAlt(sunGCRS, observer, ts, true);
  const moonApparent = computeAzAlt(moonGCRS, observer, ts, false);
  const illumData = computeIllumination(moonGCRS, sunGCRS);
  const illumination = illumData.illumination * 100;
  const prevNewMoonJD = previousNewMoon(ts.jdTT);
  const moonAgeHours = (ts.jdTT - prevNewMoonJD) * 24;
  const moonTopo = [
    moonGCRS[0] - obsGCRS[0],
    moonGCRS[1] - obsGCRS[1],
    moonGCRS[2] - obsGCRS[2]
  ];
  const sunTopo = [sunGCRS[0] - obsGCRS[0], sunGCRS[1] - obsGCRS[1], sunGCRS[2] - obsGCRS[2]];
  const geometry = computeCrescentGeometry(
    moonAirless,
    sunAirless,
    moonTopo,
    sunTopo,
    sunsetUTC,
    moonsetUTC
  );
  const { Wprime } = computeCrescentWidth(moonTopo, geometry.ARCL);
  const yallop = computeYallop(geometry, Wprime);
  const odeh = computeOdeh(geometry);
  const moonAboveHorizon = moonAirless.altitude > 0;
  const sightingPossible = moonAboveHorizon && lagMinutes > 0;
  const guidance = buildGuidanceText(
    yallop,
    odeh,
    moonApparent.azimuth,
    moonApparent.altitude,
    bestTimeUTC,
    lagMinutes
  );
  return {
    date: day,
    observer,
    sunsetUTC,
    moonsetUTC,
    lagMinutes,
    bestTimeUTC,
    bestTimeWindowUTC,
    moonPosition: moonApparent,
    sunPosition: sunAirless,
    illumination,
    moonAge: moonAgeHours,
    geometry,
    yallop,
    odeh,
    guidance,
    ephemerisSource: "DE442S",
    moonAboveHorizon,
    sightingPossible
  };
}
function buildNullReport(date, observer, events, source, sightingPossible) {
  return {
    date,
    observer,
    sunsetUTC: events.sunsetUTC,
    moonsetUTC: events.moonsetUTC,
    lagMinutes: null,
    bestTimeUTC: null,
    bestTimeWindowUTC: null,
    moonPosition: null,
    sunPosition: null,
    illumination: null,
    moonAge: null,
    geometry: null,
    yallop: null,
    odeh: null,
    guidance: "Sighting not possible: sunset or moonset could not be determined for this date and location.",
    ephemerisSource: source,
    moonAboveHorizon: null,
    sightingPossible
  };
}
var PHASE_DISPLAY = {
  "new-moon": { name: "New Moon", symbol: "\u{1F311}" },
  "waxing-crescent": { name: "Waxing Crescent", symbol: "\u{1F312}" },
  "first-quarter": { name: "First Quarter", symbol: "\u{1F313}" },
  "waxing-gibbous": { name: "Waxing Gibbous", symbol: "\u{1F314}" },
  "full-moon": { name: "Full Moon", symbol: "\u{1F315}" },
  "waning-gibbous": { name: "Waning Gibbous", symbol: "\u{1F316}" },
  "last-quarter": { name: "Last Quarter", symbol: "\u{1F317}" },
  "waning-crescent": { name: "Waning Crescent", symbol: "\u{1F318}" }
};
var SYNODIC_MONTH_DAYS = 29.530588861;
function previousNewMoon(jdTT) {
  let jd = nearestNewMoon(jdTT);
  let guard = 0;
  while (jd > jdTT && guard < 4) {
    jd = nearestNewMoon(jd - SYNODIC_MONTH_DAYS);
    guard++;
  }
  return jd;
}
function nextFullMoonAfter(jdTT) {
  let jd = nearestFullMoon(jdTT);
  let guard = 0;
  while (jd <= jdTT && guard < 4) {
    jd = nearestFullMoon(jd + SYNODIC_MONTH_DAYS);
    guard++;
  }
  return jd;
}
function nextNewMoonAfter(jdTT) {
  let jd = nearestNewMoon(jdTT);
  let guard = 0;
  while (jd <= jdTT && guard < 4) {
    jd = nearestNewMoon(jd + SYNODIC_MONTH_DAYS);
    guard++;
  }
  return jd;
}
function getMoonPhase(date = /* @__PURE__ */ new Date()) {
  validateDate(date, "getMoonPhase");
  const ts = computeTimeScales(date);
  const { moonGCRS, sunGCRS } = getMoonSunApproximate(ts.jdTT);
  const { illumination, elongationDeg, isWaxing } = computeIllumination(moonGCRS, sunGCRS);
  const illuminationPct = illumination * 100;
  const prevNewMoonJD = previousNewMoon(ts.jdTT);
  const age = (ts.jdTT - prevNewMoonJD) * 24;
  const phaseKey = elongationToPhase(elongationDeg, isWaxing);
  const { name: phaseName, symbol: phaseSymbol } = PHASE_DISPLAY[phaseKey];
  const nextNewMoonJD = nextNewMoonAfter(ts.jdTT);
  const nextFullMoonJD = nextFullMoonAfter(ts.jdTT);
  return {
    phase: phaseKey,
    phaseName,
    phaseSymbol,
    illumination: illuminationPct,
    age,
    elongationDeg,
    isWaxing,
    nextNewMoon: jdToDate(nextNewMoonJD),
    nextFullMoon: jdToDate(nextFullMoonJD),
    prevNewMoon: jdToDate(prevNewMoonJD)
  };
}
function getMoonPosition(date = /* @__PURE__ */ new Date(), lat, lon, elevation = 0) {
  validateDate(date, "getMoonPosition");
  validateLatitude(lat, "getMoonPosition");
  validateLongitude(lon, "getMoonPosition");
  const ts = computeTimeScales(date);
  const { moonGCRS } = getMoonSunApproximate(ts.jdTT);
  const observer = { lat, lon, elevation };
  const azAlt = computeAzAlt(moonGCRS, observer, ts, false);
  const distance = Math.sqrt(moonGCRS[0] ** 2 + moonGCRS[1] ** 2 + moonGCRS[2] ** 2);
  const RA_moon = Math.atan2(moonGCRS[1], moonGCRS[0]);
  const dec_moon = Math.asin(Math.max(-1, Math.min(1, moonGCRS[2] / distance)));
  const era = computeERA(ts.jdUT1);
  const HA = era + lon * DEG2RAD - RA_moon;
  const parallacticAngle = Math.atan2(
    Math.sin(HA),
    Math.cos(lat * DEG2RAD) * Math.tan(dec_moon) - Math.sin(lat * DEG2RAD) * Math.cos(HA)
  );
  return { azimuth: azAlt.azimuth, altitude: azAlt.altitude, distance, parallacticAngle };
}
function getMoonIllumination(date = /* @__PURE__ */ new Date()) {
  validateDate(date, "getMoonIllumination");
  const ts = computeTimeScales(date);
  const { moonGCRS, sunGCRS } = getMoonSunApproximate(ts.jdTT);
  const { illumination, elongationDeg, isWaxing } = computeIllumination(moonGCRS, sunGCRS);
  const phase = isWaxing ? elongationDeg / 360 : 1 - elongationDeg / 360;
  const moonDist = Math.sqrt(moonGCRS[0] ** 2 + moonGCRS[1] ** 2 + moonGCRS[2] ** 2);
  const sunDist = Math.sqrt(sunGCRS[0] ** 2 + sunGCRS[1] ** 2 + sunGCRS[2] ** 2);
  const RA_moon = Math.atan2(moonGCRS[1], moonGCRS[0]);
  const dec_moon = Math.asin(Math.max(-1, Math.min(1, moonGCRS[2] / moonDist)));
  const RA_sun = Math.atan2(sunGCRS[1], sunGCRS[0]);
  const dec_sun = Math.asin(Math.max(-1, Math.min(1, sunGCRS[2] / sunDist)));
  const dRA = RA_sun - RA_moon;
  const angle = Math.atan2(
    Math.cos(dec_sun) * Math.sin(dRA),
    Math.sin(dec_sun) * Math.cos(dec_moon) - Math.cos(dec_sun) * Math.sin(dec_moon) * Math.cos(dRA)
  );
  return { fraction: illumination, phase, angle, isWaxing };
}
function getMoonVisibilityEstimate(date = /* @__PURE__ */ new Date(), lat, lon, elevation = 0) {
  validateDate(date, "getMoonVisibilityEstimate");
  validateLatitude(lat, "getMoonVisibilityEstimate");
  validateLongitude(lon, "getMoonVisibilityEstimate");
  const ts = computeTimeScales(date);
  const { moonGCRS, sunGCRS } = getMoonSunApproximate(ts.jdTT);
  const observer = { lat, lon, elevation };
  const moonAirless = computeAzAlt(moonGCRS, observer, ts, true);
  const sunAirless = computeAzAlt(sunGCRS, observer, ts, true);
  const { elongationDeg } = computeIllumination(moonGCRS, sunGCRS);
  const ARCL = elongationDeg;
  const ARCV = moonAirless.altitude - sunAirless.altitude;
  const obsECEF = geodeticToECEF(lat, lon, elevation);
  const obsITRS = [obsECEF[0] / 1e3, obsECEF[1] / 1e3, obsECEF[2] / 1e3];
  const obsGCRS = itrsToGcrs(obsITRS, ts);
  const moonTopo = [
    moonGCRS[0] - obsGCRS[0],
    moonGCRS[1] - obsGCRS[1],
    moonGCRS[2] - obsGCRS[2]
  ];
  const { W } = computeCrescentWidth(moonTopo, ARCL);
  const V = ARCV - arcvMinimum(W);
  const zone = V >= ODEH_THRESHOLDS.A ? "A" : V >= ODEH_THRESHOLDS.B ? "B" : V >= ODEH_THRESHOLDS.C ? "C" : "D";
  return {
    V,
    zone,
    description: ODEH_DESCRIPTIONS[zone],
    isVisibleNakedEye: zone === "A",
    isVisibleWithOpticalAid: zone === "A" || zone === "B",
    ARCL,
    ARCV,
    W,
    moonAboveHorizon: moonAirless.altitude > 0,
    isApproximate: true
  };
}
function getMoon(date = /* @__PURE__ */ new Date(), lat, lon, elevation = 0) {
  validateDate(date, "getMoon");
  validateLatitude(lat, "getMoon");
  validateLongitude(lon, "getMoon");
  return {
    phase: getMoonPhase(date),
    position: getMoonPosition(date, lat, lon, elevation),
    illumination: getMoonIllumination(date),
    visibility: getMoonVisibilityEstimate(date, lat, lon, elevation)
  };
}
function nearestFullMoon(jdTT) {
  const Y = 2e3 + (jdTT - J2000) / 365.25;
  const kBase = Math.round((Y - 2e3) * 12.3685);
  const k1 = kBase - 0.5;
  const k2 = kBase + 0.5;
  const jde1 = fullMoonJDE(k1);
  const jde2 = fullMoonJDE(k2);
  const d1 = Math.abs(jde1 - jdTT);
  const d2 = Math.abs(jde2 - jdTT);
  return d1 < d2 ? jde1 : jde2;
}
function fullMoonJDE(k) {
  const T = k / 1236.85;
  let JDE = 245155009766e-5 + 29.530588861 * k + 15437e-8 * T * T - 15e-8 * T * T * T + 73e-11 * T * T * T * T;
  const M = (2.5534 + 29.1053567 * k - 14e-7 * T * T) * DEG2RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * DEG2RAD;
  const Fc = (160.7108 + 390.67050284 * k - 16118e-7 * T * T) * DEG2RAD;
  const Om = (124.7746 - 1.56375588 * k + 20672e-7 * T * T) * DEG2RAD;
  const E = 1 - 2516e-6 * T - 74e-7 * T * T;
  JDE += -0.40614 * Math.sin(Mp) + 0.17302 * E * Math.sin(M) + 0.01614 * Math.sin(2 * Mp) + 0.01043 * Math.sin(2 * Fc) + 734e-5 * E * Math.sin(Mp - M) - 515e-5 * E * Math.sin(Mp + M) + 209e-5 * E * E * Math.sin(2 * M) - 111e-5 * Math.sin(Mp - 2 * Fc) - 57e-5 * Math.sin(Mp + 2 * Fc) + 56e-5 * E * Math.sin(2 * Mp + M) - 42e-5 * Math.sin(3 * Mp) + 42e-5 * E * Math.sin(M + 2 * Fc) + 38e-5 * E * Math.sin(M - 2 * Fc) - 24e-5 * E * Math.sin(2 * Mp - M) - 17e-5 * Math.sin(Om) - 7e-5 * Math.sin(Mp + 2 * M) + 4e-5 * Math.sin(2 * Mp - 2 * Fc) + 4e-5 * Math.sin(3 * M) + 3e-5 * Math.sin(Mp + M - 2 * Fc) + 3e-5 * Math.sin(2 * Mp + 2 * Fc) - 3e-5 * Math.sin(Mp + M + 2 * Fc) + 3e-5 * Math.sin(Mp - M + 2 * Fc) - 2e-5 * Math.sin(Mp - M - 2 * Fc) - 2e-5 * Math.sin(3 * Mp + M) + 2e-5 * Math.sin(4 * Mp);
  return JDE;
}
function elongationToPhase(elongationDeg, isWaxing) {
  const e = elongationDeg;
  if (e < 5) return "new-moon";
  if (e > 175) return "full-moon";
  if (e < 85) return isWaxing ? "waxing-crescent" : "waning-crescent";
  if (e < 95) return isWaxing ? "first-quarter" : "last-quarter";
  return isWaxing ? "waxing-gibbous" : "waning-gibbous";
}
async function getSunMoonEvents2(date, observer, options) {
  const day = toCalendarDay(date, "getSunMoonEvents");
  validateObserver(observer, "getSunMoonEvents");
  const kernel = await resolveKernel(options?.kernels);
  return getSunMoonEvents(day, observer, kernel);
}

// src/index.ts (load-time telemetry call removed)
export {
  ODEH_DESCRIPTIONS,
  ODEH_THRESHOLDS,
  WGS84,
  YALLOP_DESCRIPTIONS,
  YALLOP_THRESHOLDS,
  getMoon,
  getMoonIllumination,
  getMoonPhase,
  getMoonPosition,
  getMoonSightingReport,
  getMoonVisibilityEstimate,
  getSunMoonEvents2 as getSunMoonEvents,
  initKernels,
  NAIF_IDS,
  SpkKernel,
  computeTimeScales,
  jdTTtoET,
  dateToJD,
  getMoonGeocentricState,
  getSunGeocentricState,
  computeAzAlt,
  computeIllumination,
  computeCrescentGeometry,
  computeCrescentWidth,
  computeOdeh,
  computeYallop,
  findAltitudeCrossing,
  bestTimeHeuristic,
  geodeticToECEF,
  itrsToGcrs,
  previousNewMoon,
  nearestNewMoon,
  setKernel,
  getKernel
};
