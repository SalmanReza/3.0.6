// v3.0.6 browser checks: every line of the approved command (A–M), in EN and BN, plus "no page errors" on every
// page opened and "no request outside the app" for the whole run.
// Run against the build of the UNZIPPED release folder:
//   unzip Prayer-Times-v3.0.6.zip && cd Prayer-Times-v3.0.6 && npm ci && npm i --no-save puppeteer-core && npx vite --port 1431 &
//   PRAYER_E2E_URL=http://127.0.0.1:1431/ node scripts/e2e-v306.mjs
process.env.TZ = 'Asia/Dhaka';
import { launch, URL0, sleep } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';
import * as E from '../src/moon-engine.js';
import * as S from '../src/sky.js';
import * as RP from '../src/reading-plan.js';
import { loadReading } from '../src/blessed-reminder.js';
import { formatClock } from '../src/time-format.js';

const SHOTS = process.env.SHOTS_DIR || '/workspace/prayer/shots306/';
fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const run = id => !ONLY.length || ONLY.some(x => id.split('').includes(x) || id === x);
const kb = fs.readFileSync(new URL('../public/ephemeris/de442s.bsp', import.meta.url));
E.loadKernel(kb.buffer.slice(kb.byteOffset, kb.byteOffset + kb.byteLength));
const R = await loadReading();
const P = R.passages;
const DHAKA = [23.8103, 90.4125];
const LONDON = [51.5074, -0.1278];
const origin = new URL(URL0).origin;

const b = await launch();
let pass = 0, fail = 0;
const out = [];
const ok = (id, name, cond, info = '') => {
  (cond ? pass++ : fail++);
  const line = `${cond ? 'PASS' : 'FAIL'} [${id}] ${name}${info ? '  — ' + String(info).replace(/\s+/g, ' ').slice(0, 400) : ''}`;
  out.push(line); console.log(line);
};
const outside = [];
const kernelLoads = [];
const pages = [];
// each scenario gets its own browser context (its own localStorage); `reading` seeds the read-mark store
async function open({ lang = 'en', w = 1280, h = 900, at = null, data = {}, reading = null, ctx = null } = {}) {
  const c = ctx || await b.createBrowserContext();
  const p = await c.newPage();
  p.ctx = c;
  await p.setViewport({ width: w, height: h });
  p.errs = [];
  p.on('pageerror', e => p.errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text()); });
  p.on('request', r => { const u = r.url(); if (u.startsWith('data:') || u.startsWith('blob:')) return; if (new URL(u).origin !== origin) outside.push(u); if (/de442s\.bsp/.test(u)) kernelLoads.push(u); });
  const off = at ? new Date(at).getTime() - Date.now() : 0;
  await p.evaluateOnNewDocument((lang, off, data, reading) => {
    if (!sessionStorage.getItem('init')) {
      sessionStorage.setItem('init', '1');
      localStorage.setItem('prayer-times-data', JSON.stringify({ lat: 23.8103, lon: 90.4125, place: 'Dhaka', language: lang, theme: 'Pearl Mint', ...data }));
      localStorage.removeItem('prayer-times-pending');
      if (reading === 'keep') {} else if (reading) localStorage.setItem('prayer-times-reading-plan', JSON.stringify(reading)); else localStorage.removeItem('prayer-times-reading-plan');
    }
    if (off) { const RD = Date; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }
  }, lang, off, data, reading);
  await p.goto(URL0, { waitUntil: 'networkidle0' });
  await sleep(1200);
  pages.push(p);
  return p;
}
const close = async p => { await p.close(); };
const noErrors = (p, id, where) => ok(id, `${where}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const note = p => p.evaluate(() => {
  const n = document.getElementById('dailyNote');
  const mark = n.querySelector('[data-blessed-mark]');
  return {
    ref: n.querySelector('.blessed-ref')?.textContent.trim(), subject: n.querySelector('.blessed-subject')?.textContent.trim(),
    buttons: [...n.querySelectorAll('.blessed-actions > *')].map(x => x.textContent.trim()),
    mark: mark ? { index: Number(mark.dataset.blessedMark), text: mark.textContent.trim() } : null,
    done: n.querySelector('[data-blessed-done]')?.textContent.trim() || null,
    allRead: n.querySelector('[data-blessed-all-read]')?.textContent.trim() || null,
    featured: n.querySelector('.blessed-featured') ? { id: n.querySelector('.blessed-featured').dataset.featured, text: n.querySelector('.blessed-featured').textContent.trim() } : null,
    progress: n.querySelector('[data-blessed-progress]')?.textContent.trim() || null
  };
});
const store = p => p.evaluate(() => JSON.parse(localStorage.getItem('prayer-times-reading-plan') || 'null'));
const isReadIn = (st, year, i) => !!st && RP.isRead(st, year, i);
const openPortion = async p => { await click(p, '#dailyNote [data-blessed-portion]'); await sleep(500); };
const portion = p => p.evaluate(() => ({
  open: document.getElementById('portionDialog').open,
  title: document.getElementById('portionTitle').textContent.trim(),
  summary: document.getElementById('portionSummary').textContent.trim(),
  nav: document.getElementById('portionNav').hidden ? null : document.getElementById('portionNav').textContent.trim(),
  items: [...document.querySelectorAll('#portionList .portion-item')].map(li => ({ index: Number(li.dataset.portion), read: li.classList.contains('is-read'), featured: li.querySelector('.portion-featured')?.dataset.featured || null, ref: li.querySelector('.portion-ref').textContent.trim(), button: li.querySelector('[data-blessed-mark]').textContent.trim() }))
}));
const digitsBn = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const T = (k, lang) => RP.PLAN_TEXT[k][lang];
const ymdOf = n => { const x = E.ymdOfDayNumber(n); return `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`; };
const hijriCivil = (y, m, d, loc = DHAKA) => ymdOf(E.dayOfCrescentHijri(y, m, d, ...loc));
const yearDays = (y, loc = DHAKA) => E.dayOfCrescentHijri(y + 1, 1, 1, ...loc) - E.dayOfCrescentHijri(y, 1, 1, ...loc);
const LANGS = ['en', 'bn'];
const DAY = '2026-11-23';
const MID = `${DAY}T14:00:00+06:00`;
// expected plan for 23 Nov 2026 in Dhaka (12 Jumada II 1448 by crescent)
const H = E.crescentHijriOfDay(E.dayNumber(2026, 11, 23), ...DHAKA);
const DAYS1448 = yearDays(1448);
const DOY = E.dayNumber(2026, 11, 23) - E.dayOfCrescentHijri(1448, 1, 1, ...DHAKA) + 1;
const RANGE = RP.planRange(P, DOY, DAYS1448);
const TODAY = []; for (let i = RANGE.from; i < RANGE.to; i++) TODAY.push(i);
const JUZ = RP.planJuz(P, RANGE);
console.log(`info: 23 Nov 2026 Dhaka = ${H.day}/${H.month}/${H.year}, day ${DOY} of ${DAYS1448}, passages ${RANGE.from}–${RANGE.to - 1} (${TODAY.length}), juz ${JUZ.join('–')}`);

/* ---------- A. Mark as read / C. count ---------- */
if (run('AC')) for (const lang of LANGS) {
  const p = await open({ lang, at: MID });
  let n = await note(p);
  const expectedLine = n0 => RP.planProgressLine({ juz: JUZ, read: n0, total: TODAY.length }, lang);
  ok('A', `${lang}: “${T('markRead', lang)}” sits under the passage beside Read more / Full section / Today’s portion`, n.mark && n.mark.text === T('markRead', lang) && n.buttons.includes(lang === 'bn' ? 'আজকের অংশ' : "Today's portion") && n.buttons[n.buttons.length - 1] === T('markRead', lang), JSON.stringify(n.buttons));
  ok('A', `${lang}: the passage shown is one of today’s unread passages`, TODAY.includes(n.mark?.index), String(n.mark?.index));
  ok('C', `${lang}: “0 of ${TODAY.length} passages read today”, Juz’ of today’s passages`, n.progress === expectedLine(0), n.progress);
  ok('A', `${lang}: showing a passage does not count it (store empty after load and 3 s)`, await (async () => { await sleep(3000); const st = await store(p); return !st || RP.yearReadCount(st, 1448) === 0; })());
  await (await p.$('#dailyNote')).screenshot({ path: path.join(SHOTS, `A-mark-as-read-${lang}.png`) });
  const first = n.mark.index;
  await click(p, '#dailyNote [data-blessed-mark]');
  await sleep(250);
  const done = await note(p);
  ok('A', `${lang}: after pressing, the card shows “${T('readDone', lang)}”`, done.done === T('readDone', lang) && done.ref === n.ref, JSON.stringify(done.buttons));
  await (await p.$('#dailyNote')).screenshot({ path: path.join(SHOTS, `A-read-tick-${lang}.png`) });
  ok('A', `${lang}: the passage is stored as read for 1448`, isReadIn(await store(p), 1448, first));
  await sleep(1400);
  n = await note(p);
  ok('A', `${lang}: then the next unread passage is shown`, n.mark && n.mark.index !== first && TODAY.includes(n.mark.index) && n.ref !== done.ref, `${done.ref} → ${n.ref}`);
  ok('C', `${lang}: the count reads 1 of ${TODAY.length}`, n.progress === expectedLine(1), n.progress);
  // mark every remaining passage with the button
  let guard = 0;
  while ((n = await note(p)).mark && guard++ < 40) { await click(p, '#dailyNote [data-blessed-mark]'); await sleep(1400); }
  n = await note(p);
  ok('A', `${lang}: when the whole day is read it shows “${T('allRead', lang)}”`, n.allRead === T('allRead', lang) && !n.mark, JSON.stringify(n));
  ok('C', `${lang}: the count reads ${TODAY.length} of ${TODAY.length}`, n.progress === expectedLine(TODAY.length), n.progress);
  const st = await store(p);
  ok('C', `${lang}: exactly today’s ${TODAY.length} passages are stored as read`, RP.yearReadCount(st, 1448) === TODAY.length && TODAY.every(i => RP.isRead(st, 1448, i)));
  if (lang === 'bn') ok('C', 'bn: the count uses Bangla digits', /^পারা [০-৯–]+ · আজ [০-৯]+টি অংশের [০-৯]+টি পড়া হয়েছে$/.test(n.progress), n.progress);
  await (await p.$('#dailyNote')).screenshot({ path: path.join(SHOTS, `A-all-read-${lang}.png`) });
  // B. Undo in Today's portion
  await openPortion(p);
  let pt = await portion(p);
  ok('B', `${lang}: Today’s portion lists today’s ${TODAY.length} passages in mushaf order, each with “${T('undoRead', lang)}”`, pt.open && JSON.stringify(pt.items.map(x => x.index)) === JSON.stringify(TODAY) && pt.items.every(x => x.read && x.button === T('undoRead', lang)), JSON.stringify(pt.items.map(x => [x.index, x.button])));
  const target = TODAY[2];
  await click(p, `#portionList [data-portion="${target}"] [data-blessed-mark]`);
  await sleep(300);
  pt = await portion(p);
  const st2 = await store(p);
  ok('B', `${lang}: Undo read affects only that passage`, pt.items.filter(x => !x.read).map(x => x.index).join() === String(target) && !RP.isRead(st2, 1448, target) && RP.yearReadCount(st2, 1448) === TODAY.length - 1, JSON.stringify(pt.items.map(x => [x.index, x.read])));
  ok('B', `${lang}: it now offers “${T('markRead', lang)}” again and the summary reads ${TODAY.length - 1} of ${TODAY.length}`, pt.items.find(x => x.index === target).button === T('markRead', lang) && pt.summary === expectedLine(TODAY.length - 1), pt.summary);
  await (await p.$('#portionDialog')).screenshot({ path: path.join(SHOTS, `B-undo-${lang}.png`) });
  await click(p, `#portionList [data-portion="${target}"] [data-blessed-mark]`);
  await sleep(300);
  pt = await portion(p);
  ok('B', `${lang}: Mark as read in Today’s portion marks it again`, pt.items.every(x => x.read) && RP.isRead(await store(p), 1448, target));
  await click(p, '#portionClose');
  await sleep(300);
  noErrors(p, 'A', `${lang} mark/undo`);
  await close(p);
}

/* ---------- F. behind list, new year, history; D plan via the UI ---------- */
if (run('F')) for (const lang of LANGS) {
  const p = await open({ lang, at: MID });
  await openPortion(p);
  let pt = await portion(p);
  const behind = RANGE.from;
  ok('F', `${lang}: “${RP.behindLine(behind, lang)}” is offered under Today’s portion`, pt.nav === RP.behindLine(behind, lang), pt.nav);
  ok('F', `${lang}: today’s portion holds only today (${TODAY.length}) — it never grows with unread days`, pt.items.length === TODAY.length);
  await click(p, '#portionNav [data-portion-behind]');
  await sleep(500);
  pt = await portion(p);
  ok('F', `${lang}: it opens “${T('behindTitle', lang)}”, oldest first from 1:1, with the same buttons`, pt.title === T('behindTitle', lang) && pt.items.length === behind && pt.items[0].index === 0 && pt.items.every((x, i) => x.index === i && x.button === T('markRead', lang)), `${pt.title} ${pt.items.length} ${pt.items[0]?.ref}`);
  await (await p.$('#portionDialog')).screenshot({ path: path.join(SHOTS, `F-behind-${lang}.png`) });
  await click(p, '#portionList [data-portion="0"] [data-blessed-mark]');
  await sleep(300);
  pt = await portion(p);
  ok('F', `${lang}: marking the oldest one there counts it (behind ${behind - 1})`, pt.summary === RP.behindLine(behind - 1, lang) && isReadIn(await store(p), 1448, 0), pt.summary);
  await click(p, '#portionNav [data-portion-back]');
  await sleep(400);
  pt = await portion(p);
  ok('F', `${lang}: “${T('behindBack', lang)}” returns to today; count of today unchanged (0)`, pt.title === (lang === 'bn' ? 'আজকের অংশ' : "Today's portion") && pt.summary === RP.planProgressLine({ juz: JUZ, read: 0, total: TODAY.length }, lang) && pt.nav === RP.behindLine(behind - 1, lang), pt.summary);
  noErrors(p, 'F', `${lang} behind list`);
  // the same browser profile in Muharram 1449: fresh plan, 1448 kept as history (Settings)
  const ny = `${hijriCivil(1449, 1, 2)}T14:00:00+06:00`;
  const q = await open({ lang, at: ny, reading: 'keep', ctx: p.ctx });
  const n = await note(q);
  const r1449 = RP.planRange(P, 2, yearDays(1449));
  ok('F', `${lang}: a new Hijri year (2 Muharram 1449, ${ny.slice(0, 10)}) starts a fresh plan at the start of the mushaf`, TODAY.length && n.mark && n.mark.index >= r1449.from && n.mark.index < r1449.to && n.progress === RP.planProgressLine({ juz: RP.planJuz(P, r1449), read: 0, total: r1449.to - r1449.from }, lang), `${n.ref} ${n.progress}`);
  const st = await store(q);
  ok('F', `${lang}: 1448’s read marks are kept as history`, RP.yearReadCount(st, 1448) === 1 && RP.storedYears(st).includes(1448));
  await click(q, '#settingsToggle'); await sleep(600);
  const years = await q.evaluate(() => document.getElementById('blessedMonthLine')?.textContent.trim());
  ok('F', `${lang}: Settings shows the year lines (“${RP.yearLine(1448, 1, lang)}”)`, !!years && years.includes(RP.yearLine(1448, 1, lang)), years);
  noErrors(q, 'F', `${lang} new year`);
  await close(q); await close(p);
}

/* ---------- F. backup export / replace / merge carry the read marks ---------- */
if (run('F')) {
  const p = await open({ lang: 'en', at: MID });
  await click(p, '#dailyNote [data-blessed-mark]'); await sleep(1500);
  const before = await store(p);
  await p.evaluate(() => { window.__exported = null; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__exportHref = this.href; return; } return orig.call(this); }; });
  await click(p, '#settingsToggle'); await sleep(500);
  await click(p, '#exportData'); await sleep(300);
  const exported = await p.evaluate(async () => (await (await fetch(window.__exportHref)).json()));
  ok('F', 'export: the backup carries the read marks (data.reading)', JSON.stringify(exported.data.reading) === JSON.stringify(before) && exported.appVersion === '3.0.6');
  // replace with a backup that has passage 5 read only
  const other = { v: 1, years: {} };
  const s = { getItem: () => JSON.stringify(other), setItem: (k, v) => Object.assign(other, JSON.parse(v)), removeItem() {} };
  RP.setRead(s, 1448, 5, true);
  const file = path.join(SHOTS, 'backup-reading.json');
  fs.writeFileSync(file, JSON.stringify({ version: 1, appVersion: '3.0.6', exportedAt: new Date().toISOString(), data: { reading: other } }));
  const input = await p.$('#importFile');
  await input.uploadFile(file); await sleep(500);
  await click(p, '#mergeBackup'); await sleep(600);
  let st = await store(p);
  ok('F', 'merge: a passage stays read if either side has it read', RP.isRead(st, 1448, 5) && RP.yearReadCount(st, 1448) === RP.yearReadCount(before, 1448) + 1);
  await click(p, '#settingsToggle'); await sleep(400);
  await input.uploadFile(file); await sleep(500);
  await click(p, '#replaceBackup'); await sleep(600);
  st = await store(p);
  ok('F', 'replace: the read marks become the backup’s', RP.yearReadCount(st, 1448) === 1 && RP.isRead(st, 1448, 5));
  const v305 = path.join(SHOTS, 'backup-v305.json');
  fs.writeFileSync(v305, JSON.stringify({ version: 1, appVersion: '3.0.5', exportedAt: new Date().toISOString(), data: { language: 'en' } }));
  await click(p, '#settingsToggle'); await sleep(400);
  await input.uploadFile(v305); await sleep(500);
  await click(p, '#replaceBackup'); await sleep(600);
  ok('F', 'a v3.0.5 backup (no read marks) leaves the read marks as they are', RP.yearReadCount(await store(p), 1448) === 1);
  noErrors(p, 'F', 'backup');
  await close(p);
}

/* ---------- C. the old automatic counts are cleared ---------- */
if (run('C')) {
  const c = await b.createBrowserContext();
  const p0 = await c.newPage();
  await p0.goto(URL0, { waitUntil: 'networkidle0' });
  await p0.evaluate(() => localStorage.setItem('prayer-times-blessed-reading', JSON.stringify({ day: '2026-11-23', read: [1, 2, 3] })));
  await p0.close();
  const p = await open({ lang: 'en', at: MID, reading: 'keep', ctx: c });
  const legacy = await p.evaluate(() => localStorage.getItem('prayer-times-blessed-reading'));
  const n = await note(p);
  ok('C', 'the reminder’s old automatic read counts are cleared on start; nothing counts until marked', legacy === null && n.progress === RP.planProgressLine({ juz: JUZ, read: 0, total: TODAY.length }, 'en'), n.progress);
  noErrors(p, 'C', 'legacy clear');
  await close(p);
}

/* ---------- E. featured passages ---------- */
if (run('E')) for (const lang of LANGS) {
  const cases = [['arafah', 1448, 12, 9, [343]], ['badr', 1448, 9, 17, [605]], ['qadr', 1448, 9, 27, [2689, 2690]]];
  for (const [id, y, m, d, idx] of cases) {
    const civil = hijriCivil(y, m, d);
    const p = await open({ lang, at: `${civil}T14:00:00+06:00` });
    const n = await note(p);
    const f = RP.FEATURED.find(x => x.id === id);
    const doy = E.dayNumber(...civil.split('-').map(Number)) - E.dayOfCrescentHijri(y, 1, 1, ...DHAKA) + 1;
    const r = RP.planRange(P, doy, yearDays(y));
    ok('E', `${lang}: ${d}/${m}/${y} (${civil}) shows the ${id} passage first with its one-line note`, n.featured?.id === id && n.featured.text === f.note[lang] && n.mark?.index === idx[0], `${n.featured?.text} | ${n.ref}`);
    if (id === 'badr') ok('E', `${lang}: Badr is labelled approximate`, n.featured.text.includes(lang === 'bn' ? 'আনুমানিক' : 'approximate'));
    if (id === 'qadr') ok('E', `${lang}: 27 Ramadan is labelled commonly held`, n.featured.text.includes(lang === 'bn' ? 'প্রচলিত মতে' : 'commonly held'));
    await (await p.$('#dailyNote')).screenshot({ path: path.join(SHOTS, `E-${id}-${lang}.png`) });
    await openPortion(p);
    const pt = await portion(p);
    const plan = []; for (let i = r.from; i < r.to; i++) plan.push(i);
    const expected = [...idx.filter(i => !plan.includes(i)), ...plan];
    ok('E', `${lang}: Today’s portion lists the featured passage(s) first, then the unchanged plan; M counts them`, JSON.stringify(pt.items.map(x => x.index)) === JSON.stringify(expected) && pt.items.filter(x => x.featured === id).length === idx.filter(i => !plan.includes(i)).length && pt.summary === RP.planProgressLine({ juz: RP.planJuz(P, r), read: 0, total: expected.length }, lang), `${pt.summary} ${JSON.stringify(pt.items.slice(0, 3))}`);
    if (id === 'arafah' && lang === 'en') {
      // shared read status: mark 5:3 on Arafah, then open the plan day that holds passage 343
      await click(p, `#portionList [data-portion="343"] [data-blessed-mark]`); await sleep(300);
      const starts = RP.planStarts(P, yearDays(1448));
      const planDay = starts.findIndex(s => s > 343);
      const civil2 = ymdOf(E.dayOfCrescentHijri(1448, 1, 1, ...DHAKA) + planDay - 1);
      const q = await open({ lang, at: `${civil2}T14:00:00+06:00`, reading: 'keep', ctx: p.ctx });
      await openPortion(q);
      const pq = await portion(q);
      ok('E', `en: the featured passage shares its read mark with the same passage in the plan (plan day ${planDay}, ${civil2})`, pq.items.find(x => x.index === 343)?.read === true && pq.items.find(x => x.index === 343)?.button === 'Undo read', JSON.stringify(pq.items.find(x => x.index === 343)));
      noErrors(q, 'E', 'shared read');
      await close(q);
    }
    noErrors(p, 'E', `${lang} ${id}`);
    await close(p);
  }
  // an ordinary day has no featured passage
  const p = await open({ lang, at: MID });
  ok('E', `${lang}: an ordinary day (23 Nov 2026) shows no featured note`, !(await note(p)).featured);
  await close(p);
}

/* ---------- G. reading day changes at the saved location's midnight ---------- */
if (run('G')) {
  const london = { lat: LONDON[0], lon: LONDON[1], place: 'London' };
  // device clock is Dhaka; the location is London (UTC+0 in November)
  const at = async (iso, data) => { const p = await open({ lang: 'en', at: iso, data }); await openPortion(p); const pt = await portion(p); noErrors(p, 'G', iso); await close(p); return pt.items.map(x => x.index); };
  const a = await at('2026-11-24T05:50:00+06:00', london); // 23:50 London, 23 Nov
  const bb = await at('2026-11-24T06:10:00+06:00', london); // 00:10 London, 24 Nov
  const c = await at('2026-11-24T01:00:00+06:00', london); // 19:00 London, 23 Nov
  ok('G', 'London location, Dhaka device: 19:00 and 23:50 London time are the same reading day', JSON.stringify(a) === JSON.stringify(c), `${c[0]} / ${a[0]}`);
  ok('G', 'London location: the reading day changes at midnight London time (00:10 gives the next portion)', bb[0] === a[a.length - 1] + 1, `${a[a.length - 1]} → ${bb[0]}`);
  const d = await at('2026-11-23T23:50:00+06:00', {});
  const e = await at('2026-11-24T00:10:00+06:00', {});
  ok('G', 'Dhaka location: the reading day changes at midnight Dhaka time', e[0] === d[d.length - 1] + 1, `${d[d.length - 1]} → ${e[0]}`);
  // same instant, 02:00 Dhaka on 24 Nov (= 20:00 London on 23 Nov): a Dhaka location is on the 24th's portion, a London one still on the 23rd's
  const dk = await at('2026-11-24T02:00:00+06:00', {});
  const ld = await at('2026-11-24T02:00:00+06:00', london);
  ok('G', 'same instant, different saved locations: Dhaka is on 24 Nov’s portion, London still on 23 Nov’s', JSON.stringify(dk) === JSON.stringify(e) && JSON.stringify(ld) === JSON.stringify(a), `${dk[0]} / ${ld[0]}`);
}

/* ---------- H. Hijri date by crescent visibility ---------- */
if (run('H')) for (const lang of LANGS) {
  const read = p => p.evaluate(() => ({ date: document.getElementById('hijriDateLabel')?.textContent.trim(), label: document.getElementById('hijriSourceLabel')?.hidden ? null : document.getElementById('hijriSourceLabel')?.textContent.trim() }));
  const L = lang === 'bn' ? 'নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী' : 'Predicted by crescent visibility';
  const month = lang === 'bn' ? /জমাদিউস সানি|জুমাদা|জমাদিউল আখির|জুমাদাল/ : /Jumada II|Jumada al-Thani|Jumada al-Akhirah|Jumādá II/;
  const p = await open({ lang, at: MID });
  let h = await read(p);
  ok('H', `${lang}: 23 Nov 2026 14:00 Dhaka reads 12 Jumada II 1448 with the label “${L}”`, h.label === L && h.date.includes(lang === 'bn' ? '১২' : '12') && h.date.includes(lang === 'bn' ? '১৪৪৮' : '1448'), JSON.stringify(h));
  await (await p.$('.clock-date')).screenshot({ path: path.join(SHOTS, `H-hijri-label-${lang}.png`) });
  noErrors(p, 'H', `${lang} hijri`);
  await close(p);
  const ev = await open({ lang, at: `${DAY}T17:30:00+06:00` });
  h = await read(ev);
  ok('H', `${lang}: after Maghrib (17:30) the date is 13 Jumada II`, h.date.includes(lang === 'bn' ? '১৩' : '13') && h.label === L, JSON.stringify(h));
  await close(ev);
  for (const adj of [-2, -1, 1, 2]) {
    const q = await open({ lang, at: MID, data: { hijriAdjust: adj } });
    h = await read(q);
    const want = String(12 + adj);
    ok('H', `${lang}: Hijri adjustment ${adj > 0 ? '+' : ''}${adj} applies on top (${want})`, h.date.startsWith(lang === 'bn' ? digitsBn(want) : want) && h.label === L, JSON.stringify(h));
    await close(q);
  }
  // Mecca: the crescent month began a day earlier than in Dhaka
  const m = await open({ lang, at: '2026-11-11T14:00:00+06:00', data: { lat: 21.4225, lon: 39.8262, place: 'Mecca' } });
  const dk = await open({ lang, at: '2026-11-11T14:00:00+06:00' });
  const hm = await read(m), hd = await read(dk);
  ok('H', `${lang}: the date depends on the location (11 Nov 2026: Mecca 1 Jumada II, Dhaka 30 Jumada I)`, hm.date.startsWith(lang === 'bn' ? '১ ' : '1 ') && hd.date.startsWith(lang === 'bn' ? '৩০' : '30'), `${hm.date} | ${hd.date}`);
  await close(m); await close(dk);
  // beyond the polar circle (Tromsø 69.65° N) the crescent rule cannot run every month: Umm al-Qura date, no label
  const tr = await open({ lang, at: MID, data: { lat: 69.6496, lon: 18.956, place: 'Tromsø' } });
  const ht = await read(tr);
  ok('H', `${lang}: beyond the polar circle (Tromsø) the Umm al-Qura date is shown without the label (13 Jumada II)`, ht.label === null && ht.date.startsWith(lang === 'bn' ? '১৩' : '13'), JSON.stringify(ht));
  noErrors(tr, 'H', `${lang} Tromsø`);
  await close(tr);
  void month;
}

/* ---------- I/J/K. offline, no sync button, licences, privacy, version ---------- */
if (run('IJK')) for (const lang of LANGS) {
  const p = await open({ lang, at: MID });
  const ui = await p.evaluate(() => ({
    sync: [...document.querySelectorAll('button, a')].filter(x => /sync|synchron|online|internet|সিঙ্ক|অনলাইন/i.test(x.textContent + (x.title || ''))).map(x => x.textContent.trim()),
    version: document.getElementById('appVersionLabel')?.textContent.trim()
  }));
  ok('I', `${lang}: no online / sync button anywhere`, ui.sync.length === 0, JSON.stringify(ui.sync));
  ok('K', `${lang}: version label ${lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'}`, ui.version === (lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'), ui.version);
  await click(p, '#settingsToggle'); await sleep(600);
  const s = await p.evaluate(() => ({ about: document.body.innerText, privacy: [...document.querySelectorAll('.settings-card')].find(c => c.querySelector('#exportData'))?.querySelector('p.muted')?.textContent.trim() }));
  ok('J', `${lang}: privacy text unchanged`, lang === 'en' ? s.privacy === "Prayer history, preferences, themes and location stay in this application's local profile. Nothing is uploaded or synchronised." : s.privacy.startsWith('নামাজের ইতিহাস, পছন্দ, থিম ও অবস্থান অ্যাপের স্থানীয় প্রোফাইলে থাকে।'), s.privacy);
  ok('J', `${lang}: About credits moon-sighting (MIT), DE442S and tz-lookup`, /moon-sighting/.test(s.about) && /DE442S/.test(s.about) && /tz-lookup/.test(s.about) && (lang === 'en' ? /MIT licence/.test(s.about) : /MIT লাইসেন্স/.test(s.about)));
  ok('H', `${lang}: About states the polar limit (66.56°) and the unlabelled Umm al-Qura fallback`, lang === 'en' ? /Beyond the polar circles \(latitude above 66\.56° N or S\)[\s\S]*Umm al-Qura calendar is used/.test(s.about) : /মেরুবৃত্তের ভেতরে \(অক্ষাংশ ৬৬\.৫৬° উত্তর বা দক্ষিণের বেশি\)[\s\S]*উম্মুল কুরা পঞ্জিকা ব্যবহার করা হয়/.test(s.about)); // [v3.0.6 H polar]
  noErrors(p, 'IJK', `${lang} settings`);
  await close(p);
}

/* ---------- M. astrolabe and its Sun/Moon cards use the precise positions; look unchanged ---------- */
if (run('M')) for (const lang of LANGS) for (const iso of ['2026-11-23T14:00:00+06:00', '2026-11-24T02:00:00+06:00']) {
  const p = await open({ lang, at: iso });
  await p.evaluate(() => document.getElementById('astroStage').dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
  await sleep(1600);
  const now = await p.evaluate(() => Date.now());
  const cards = await p.evaluate(() => [...document.querySelectorAll('#astroHeroLeft .astro-info')].map(c => [...c.querySelectorAll('li')].map(li => [li.querySelector('span').textContent.trim(), li.querySelector('strong').textContent.trim()])));
  const d = new Date(now);
  const sun = E.preciseSunPosition(d, ...DHAKA), moon = E.preciseMoonPosition(d, ...DHAKA), ph = E.preciseMoonPhase(d), pass = E.preciseMoonPass(d, ...DHAKA);
  const oldMoon = S.moonPosition(d, ...DHAKA);
  const num = s => Number(String(s).replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/[^\d.-]/g, ''));
  const [sunRows, moonRows] = cards;
  const get = (rows, en, bn) => rows?.find(r => r[0] === (lang === 'bn' ? bn : en))?.[1];
  const sunH = num(get(sunRows, 'Height', 'উচ্চতা')), moonH = num(get(moonRows, 'Height', 'উচ্চতা')), moonDir = num(get(moonRows, 'Direction', 'দিক').split(' ')[0]), ill = num(get(moonRows, 'Illumination', 'আলোকিত অংশ'));
  const rise = get(moonRows, 'Moonrise', 'চাঁদ ওঠে');
  ok('M', `${lang} ${iso.slice(0, 16)}: Sun height = DE442S value (${sunH}° vs ${sun.altitude.toFixed(2)}°)`, Math.abs(sunH - sun.altitude) <= 0.6);
  ok('M', `${lang} ${iso.slice(0, 16)}: Moon height/direction = DE442S (${moonH}°/${moonDir}° vs ${moon.altitude.toFixed(2)}°/${moon.azimuth.toFixed(2)}°; old series ${oldMoon.altitude.toFixed(2)}°/${oldMoon.azimuth.toFixed(2)}°)`, Math.abs(moonH - moon.altitude) <= 0.6 && Math.abs(((moonDir - moon.azimuth + 540) % 360) - 180) <= 0.6);
  ok('M', `${lang} ${iso.slice(0, 16)}: illumination = DE442S (${ill}% vs ${(ph.illumination * 100).toFixed(2)}%)`, Math.abs(ill - ph.illumination * 100) <= 0.6);
  const wantRise = pass.rise ? formatClock(pass.rise, { lang }) : null;
  ok('M', `${lang} ${iso.slice(0, 16)}: moonrise = DE442S (${rise} vs ${wantRise})`, rise === wantRise);
  const shot = path.join(SHOTS, `M-astrolabe-${lang}-${iso.slice(11, 13)}.png`);
  await p.screenshot({ path: shot });
  noErrors(p, 'M', `${lang} astrolabe page`);
  await close(p);
}

/* ---------- L/I. the kernel is read from the app itself; nothing else leaves the machine ---------- */
ok('L', 'the bundled DE442S kernel was read from the app’s own files', kernelLoads.length > 0 && kernelLoads.every(u => u.startsWith(origin + '/') && u.endsWith('/ephemeris/de442s.bsp')), `${kernelLoads.length} loads`);
ok('I', `no request left the app during the whole run (${pages.length} pages)`, outside.length === 0, outside.slice(0, 5).join(' '));

console.log(`\n${pass} passed, ${fail} failed`);
fs.writeFileSync(path.join(SHOTS, 'e2e-v306-results.txt'), out.join('\n') + `\n\n${pass} passed, ${fail} failed\n`);
await b.close();
process.exit(fail ? 1 : 0);
