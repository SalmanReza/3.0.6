// v3.0.2 (1422) vs v3.0.3 (unzipped build, PORT303): same data, same clock, same views; screenshots + innerText diff.
import puppeteer from '/workspace/prayer/3.0.3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'node:fs';
const OUT = '/workspace/prayer/compare303/';
const P303 = Number(process.env.PORT303 || 1424);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'], env: { ...process.env, TZ: 'Asia/Dhaka' } });
const AT = '2026-11-23T14:00:00+06:00';
const DAY = '2026-11-23';
const data = lang => ({ lat: 23.8103, lon: 90.4125, place: 'Dhaka', language: lang, theme: 'Pearl Mint', history: {
  '2026-11-22': { fard: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, voluntary: { witr: true }, rakahs: { witr: 3 }, rakahSets: { witr: [true, true] } },
  [DAY]: { fard: {}, voluntary: { duha: true }, rakahs: { duha: 2 }, rakahSets: { duha: [true] }, at: { 'voluntary:duha': [60, 480] } } } });
async function page(port, lang, w, h) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const off = new Date(AT).getTime() - Date.now();
  await p.evaluateOnNewDocument((d, off) => {
    if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear(); localStorage.setItem('prayer-times-data', JSON.stringify(d)); }
    const RD = Date; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } };
  }, data(lang), off);
  await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 1500));
  return p;
}
const views = {
  home: async p => {},
  settings: async p => { await p.click('#settingsToggle'); },
  countdown: async p => { await p.evaluate(() => document.querySelector('.live-event [data-event-countdown]')?.click()); },
  weekly: async p => { await p.evaluate(d => document.querySelector(`[data-week-date="${d}"]`)?.click(), DAY); },
  clock: async p => { await p.evaluate(() => document.getElementById('liveClock')?.click()); },
  portion: async p => { await p.evaluate(() => document.querySelector('#dailyNote [data-blessed-portion]')?.click()); },
};
const report = [];
for (const lang of ['en', 'bn']) for (const [w, h] of [[1280, 720], [420, 700]]) for (const [v, go] of Object.entries(views)) {
  const res = {};
  for (const [tag, port] of [['302', 1422], ['303', P303]]) {
    const p = await page(port, lang, w, h);
    await go(p); await new Promise(r => setTimeout(r, 900));
    const text = await p.evaluate(() => document.body.innerText.replace(/\d{1,2}:\d{2}:\d{2}|[০-৯]{1,2}:[০-৯]{2}:[০-৯]{2}/g, 'HH:MM:SS'));
    const f = `${OUT}${v}-${lang}-${w}-${tag}.png`;
    await p.screenshot({ path: f, fullPage: true });
    res[tag] = { text, f, errs: p.errs };
    await p.close();
  }
  const a = res['302'].text.split('\n').map(s => s.trim()).filter(Boolean), c = res['303'].text.split('\n').map(s => s.trim()).filter(Boolean);
  const A = new Set(a), C = new Set(c);
  const removed = [...new Set(a.filter(x => !C.has(x)))], added = [...new Set(c.filter(x => !A.has(x)))];
  report.push({ view: v, lang, size: `${w}x${h}`, removed, added, errs302: res['302'].errs, errs303: res['303'].errs, shots: [res['302'].f, res['303'].f] });
  console.log(`${v} ${lang} ${w}x${h}: -${removed.length} +${added.length} errs ${res['302'].errs.length}/${res['303'].errs.length}`);
}
fs.writeFileSync(`${OUT}text-diff.json`, JSON.stringify(report, null, 1));
await b.close();
