import fs from 'node:fs';
import * as E from '../src/moon-engine.js';
const b = fs.readFileSync(new URL('../public/ephemeris/de442s.bsp', import.meta.url));
E.loadKernel(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
// conjunction day estimate via crescentHijri? use mean synodic from lunation 0 (25 Jun 2025 new moon)
const K0 = E.dayNumber(2025,6,25);
for (const lat of [55, 60, 63, 65, 66, 67, 68, 70, 72, 75, 78]) {
  let maxOff = -99, minOff = 99, nulls = 0, n=0;
  for (let k = E.lunationOf(1440,1); k < E.lunationOf(1573,1); k++) {
    const S = E.monthStartEvening(k, lat, 18); if (S==null){nulls++;continue;}
    const off = S - (K0 + k*29.530589); n++;
    maxOff = Math.max(maxOff, off); minOff = Math.min(minOff, off);
  }
  // coverage of crescentHijriOfDay over 2018-2150 sample
  let miss=0, tot=0; for (let d=E.dayNumber(2019,1,1); d<E.dayNumber(2149,1,1); d+=37){tot++; if(!E.crescentHijriOfDay(d,lat,18)) miss++;}
  console.log(`lat ${lat}: start minus mean conjunction: ${minOff.toFixed(1)}..${maxOff.toFixed(1)} days; nulls ${nulls}; crescent date missing on ${miss}/${tot} sample days`);
}
