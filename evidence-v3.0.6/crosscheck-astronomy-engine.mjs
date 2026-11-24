// Cross-check only: needs astronomy-engine (MIT), which is not an app dependency: npm i --no-save astronomy-engine
import fs from 'node:fs';
import * as A from 'astronomy-engine';
import * as E from '../src/moon-engine.js';
const b = fs.readFileSync(new URL('../public/ephemeris/de442s.bsp', import.meta.url));
E.loadKernel(b.buffer.slice(b.byteOffset, b.byteOffset+b.byteLength));
const cities=[['Dhaka',23.8103,90.4125],['London',51.5074,-0.1278],['NewYork',40.7128,-74.006],['CapeTown',-33.9249,18.4241],['Mecca',21.4225,39.8262],['Tromso',69.65,18.96]];
let rows=[], maxS=0,maxM=0,maxAz=0,maxI=0, n=0, maxRise=0;
for (let k=0;k<600;k++){
  const d=new Date(Date.UTC(2024,0,1)+k*86400000*1.83+k*3600000*5.3); const [nm,la,lo]=cities[k%cities.length];
  const obs=new A.Observer(la,lo,0);
  const hs=A.Horizon(d,obs,...(()=>{const e=A.Equator(A.Body.Sun,d,obs,true,true);return [e.ra,e.dec];})());
  const em=A.Equator(A.Body.Moon,d,obs,true,true); const hm=A.Horizon(d,obs,em.ra,em.dec);
  const ps=E.preciseSunPosition(d,la,lo), pm=E.preciseMoonPosition(d,la,lo);
  const ill=A.Illumination(A.Body.Moon,d).phase_fraction, pi=E.preciseMoonPhase(d).illumination;
  maxS=Math.max(maxS,Math.abs(ps.altitude-hs.altitude)); maxM=Math.max(maxM,Math.abs(pm.altitude-hm.altitude));
  if (Math.abs(pm.altitude)<80) maxAz=Math.max(maxAz,Math.abs(((pm.azimuth-hm.azimuth+540)%360)-180)); maxI=Math.max(maxI,Math.abs(ill-pi)); n++;
}
// moonrise comparison
for (let k=0;k<60;k++){ const d=new Date(Date.UTC(2026,0,1)+k*86400000*6.1); const [nm,la,lo]=cities[k%5];
  const p=E.preciseMoonPass(d,la,lo); if(!p.rise) continue; const r=A.SearchRiseSet(A.Body.Moon,new A.Observer(la,lo,0),+1,new Date(p.rise.getTime()-3*3600000),1);
  if (r) maxRise=Math.max(maxRise,Math.abs(r.date-p.rise)/60000); }
console.log(JSON.stringify({samples:n, maxSunAltDiffDeg:+maxS.toFixed(4), maxMoonAltDiffDeg:+maxM.toFixed(4), maxMoonAzDiffDeg:+maxAz.toFixed(4), maxIllumDiff:+maxI.toFixed(5), maxMoonriseDiffMin:+maxRise.toFixed(2)}));
