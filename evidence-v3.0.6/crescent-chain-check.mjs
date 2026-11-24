import fs from 'node:fs';
import * as E from '../src/moon-engine.js';
const b = fs.readFileSync(new URL('../public/ephemeris/de442s.bsp', import.meta.url));
E.loadKernel(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const locs = { Dhaka: [23.8103, 90.4125], Mecca: [21.4225, 39.8262], London: [51.5074, -0.1278], LosAngeles: [34.05, -118.25], Jakarta: [-6.2, 106.8], CapeTown: [-33.92, 18.42], Oulu: [65.01, 25.47], Reykjavik: [64.15, -21.94], Ushuaia: [-54.8, -68.3] };
const out = ['Crescent month chain check, Hijri 1440–1572 (lunations ' + E.lunationOf(1440, 1) + '..' + (E.lunationOf(1573, 1) - 1) + '), current engine (src/moon-engine.js)'];
for (const [name, [la, lo]] of Object.entries(locs)) {
  const t = Date.now(); let n = 0, bad = 0, rule = 0, d29 = 0;
  for (let k = E.lunationOf(1440, 1); k < E.lunationOf(1573, 1); k++) {
    const a = E.monthStartEvening(k, la, lo), c = E.monthStartEvening(k + 1, la, lo); n++;
    if (c - a !== 29 && c - a !== 30) bad++;
    if (c - a === 29) d29++;
    if ((c - a === 29) !== E.eveningCrescent(a + 29, la, lo).visible) rule++;
  }
  out.push(`${name} (${la}, ${lo}): months ${n}, 29-day ${d29}, 30-day ${n - d29}, lengths other than 29/30: ${bad}, months breaking the 29th-evening rule: ${rule}  (${Date.now() - t} ms)`);
}
out.push('Tromso (69.65 N) and Svalbard (78.22 N): beyond the polar circle, no crescent date (Umm al-Qura, unlabelled): ' + JSON.stringify([E.crescentHijriOfDay(E.dayNumber(2026,11,23),69.65,18.96), E.crescentHijriOfDay(E.dayNumber(2026,11,23),78.22,15.65)]));
fs.writeFileSync(new URL('./crescent-chain-check.txt', import.meta.url), out.join('\n') + '\n'); console.log(out.join('\n'));
