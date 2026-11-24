// v3.0.6 update: changed only where marked "[v3.0.6 …]" (version label K; reminder lines A/C/D if needed).
// v3.0.5 update: the font lines (A, B: one Font list, v3.0.5 item 1) and the version label (H) changed; marked "[v3.0.5]".
// v3.0.4 browser checks: at least one per line (A–L) of the approved command, in EN and BN.
// Run against the build of the UNZIPPED release folder:
//   unzip Prayer-Times-v3.0.4.zip && cd Prayer-Times-v3.0.4 && npm ci && npm i --no-save puppeteer-core && npx vite --port 1426 &
//   PRAYER_E2E_URL=http://127.0.0.1:1426/ node scripts/e2e-v304.mjs
import { launch, open as openRaw, sleep } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const open = (b, o = {}) => openRaw(b, { ...o, data: { theme: 'Pearl Mint', ...(o.data || {}) } });
const SHOTS = process.env.SHOTS_DIR || '/workspace/prayer/shots304/';
fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const run = id => !ONLY.length || ONLY.includes(id);
const b = await launch();
let pass = 0, fail = 0;
const out = [];
const ok = (id, name, cond, info = '') => {
  (cond ? pass++ : fail++);
  const line = `${cond ? 'PASS' : 'FAIL'} [${id}] ${name}${info ? '  — ' + String(info).replace(/\s+/g, ' ').slice(0, 400) : ''}`;
  out.push(line); console.log(line);
};
const LANGS = ['en', 'bn'];
const DAY = '2026-11-23';                        // Monday
const MID = `${DAY}T14:00:00+06:00`;             // Dhuhr open; Fajr and Duha ended, not locked
const AFTER_LOCK = `${DAY}T16:10:00+06:00`;      // Asr began: Fajr / Duha record window locked
const NIGHT = `${DAY}T21:00:00+06:00`;
const NEXT_NOON = '2026-11-24T12:30:00+06:00';   // next day after Dhuhr began
const at = (h, m = 0) => new Date(`${DAY}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+06:00`).getTime();
const rec = p => p.evaluate(d => (JSON.parse(localStorage.getItem('prayer-times-data') || '{}').history || {})[d] || {}, DAY);
const pend = p => p.evaluate(() => JSON.parse(localStorage.getItem('prayer-times-pending') || '{}'));
const soundCounter = p => p.evaluate(() => {
  window.__osc = 0; const O = window.AudioContext;
  if (O && !window.__patched) { window.__patched = true; window.AudioContext = class extends O { constructor(...a) { super(...a); const c = this.createOscillator; this.createOscillator = function (...x) { const o = c.apply(this, x); const s = o.start.bind(o); o.start = (...y) => { window.__osc++; return s(...y); }; return o; }; } }; }
});
const osc = p => p.evaluate(() => window.__osc || 0);
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const openDay = async (p, d = DAY) => { await p.evaluate(x => document.querySelector(`[data-week-date="${x}"]`)?.click(), d); await sleep(700); };
const goHome = async p => { await p.evaluate(() => document.querySelector('#weeklyDayBack, #countdownBack, #timeBack, #astroBack')?.click()); await sleep(600); };
const visibleMain = p => p.evaluate(() => [...document.querySelectorAll('main')].filter(m => !m.hidden).map(m => m.id).join(','));
const fullDay = { fard: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, sunnah: { fajr_before: true, dhuhr_before: true, dhuhr_after: true, maghrib_after: true, isha_after: true }, nafl: {}, voluntary: { duha: true }, rakahs: { duha: 2 }, rakahSets: { duha: [true] }, closed: { 'fard:fajr': true, 'fard:dhuhr': true, 'fard:asr': true, 'fard:maghrib': true, 'fard:isha': true, 'voluntary:duha': true } };

/* ---------- A. clock and countdown digits use the app font ---------- */
if (run('A')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { enFont: 'lora', uiFont: 'tiro' } });
  const probe = () => p.evaluate(() => {
    const body = getComputedStyle(document.body).fontFamily;
    const sels = ['#liveClock', '#nextCountValue', '.countdown-card-value', '.live-event .countdown-card-value', '#countdownLarge', '#bestCountdown', '.clock-count-big', '.clock-preferred-count', '.ck-num', '#topbarClock time', '.forbidden-left'];
    const res = [];
    for (const s of sels) for (const e of document.querySelectorAll(s)) {
      const cs = getComputedStyle(e);
      res.push({ s, ff: cs.fontFamily, num: cs.fontVariantNumeric });
    }
    return { body, res };
  });
  const check = (r, tag) => {
    // dial numerals (.ck-num) are single labels: font checked, fixed-width not applicable
    const bad = r.res.filter(x => x.ff !== r.body || /Optima|Palatino/i.test(x.ff) || (x.s !== '.ck-num' && !/tabular-nums/.test(x.num)));
    ok('A', `${lang} ${tag}: ${r.res.length} clock/countdown elements use the app font (${r.body.split(',')[0]}), tabular digits, no Optima/Palatino`, r.res.length >= 4 && !bad.length, JSON.stringify(bad.slice(0, 3)));
  };
  check(await probe(), 'home');
  await click(p, '#nextCountdownOpen'); await sleep(700);
  check(await probe(), 'countdown page');
  await goHome(p);
  await click(p, '#analogClockButton'); await sleep(900);
  check(await probe(), 'clock page');
  await goHome(p);
  // switch fonts in Settings, then re-check
  await click(p, '#settingsToggle'); await sleep(500);
  await p.select('#uiFontSelect', lang === 'bn' ? 'kalpurush' : 'plex'); await sleep(400); // [v3.0.5] one Font list
  await click(p, '#settingsToggle'); await sleep(700);
  const after = await probe();
  ok('A', `${lang}: after switching fonts the app font is ${lang === 'bn' ? 'Kalpurush' : 'IBM Plex Sans'} first`, lang === 'bn' ? /Kalpurush/i.test(after.body.split(',')[0]) : /IBM Plex/i.test(after.body.split(',')[0]), after.body); // [v3.0.5]
  check(after, 'after font switch');
  await p.screenshot({ path: path.join(SHOTS, `A-clock-font-${lang}.png`), clip: { x: 0, y: 0, width: 1280, height: 330 } });
  await p.close();
}

/* ---------- B. fonts: 10 + System in each language; removed Bangla fonts move to Hind Siliguri ---------- */
if (run('B')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { uiFont: 'baloo' } });
  await click(p, '#settingsToggle'); await sleep(500);
  const r = await p.evaluate(() => ({
    // [v3.0.5] one Font list: System default, then the English group, then the Bangla group
    en: ['system', ...[...document.querySelectorAll('#uiFontSelect optgroup:nth-of-type(1) option')].map(o => o.value)],
    ui: ['system', ...[...document.querySelectorAll('#uiFontSelect optgroup:nth-of-type(2) option')].map(o => o.value)],
    uiValue: document.getElementById('uiFontSelect').value,
    saved: JSON.parse(localStorage.getItem('prayer-times-data')).font // [v3.0.5]
  }));
  ok('B', `${lang}: English list = 10 fonts + System`, r.en.length === 11 && r.en.includes('system') && ['lato', 'nunito', 'sourcesans', 'plex', 'lora'].every(k => r.en.includes(k)), r.en.join());
  ok('B', `${lang}: Bangla list = 10 fonts + System, without Baloo Da 2 / Atma / Mina / Galada`, r.ui.length === 11 && !r.ui.some(k => ['baloo', 'atma', 'mina', 'galada'].includes(k)), r.ui.join());
  ok('B', `${lang}: a saved Baloo Da 2 choice now shows Hind Siliguri`, r.uiValue === 'hind', JSON.stringify(r));
  const loaded = await p.evaluate(async () => { const n = []; for (const f of ['Lato', 'Nunito', 'Source Sans 3', 'IBM Plex Sans', 'Lora']) n.push((await document.fonts.load(`16px "${f}"`)).length); return n; });
  ok('B', `${lang}: the 5 new English fonts are bundled and load`, loaded.every(n => n > 0), loaded.join());
  const about = await p.evaluate(() => document.getElementById('aboutSources')?.textContent || '');
  ok('B', `${lang}: About credits the new fonts`, ['Lato', 'Nunito', 'Source Sans 3', 'IBM Plex Sans', 'Lora'].every(f => about.includes(f)));
  await p.close();
}

/* ---------- C. ticks select, Mark Complete records ---------- */
if (run('C')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { sound: true, tickSound: true } });
  await soundCounter(p);
  const o0 = await osc(p);
  await click(p, '#liveEvents [data-sub-layer="fard"][data-sub-key="dhuhr"]'); await sleep(400);
  const o1 = await osc(p);
  let r = await rec(p); let q = await pend(p);
  ok('C', `${lang}: ticking Dhuhr Fard only selects it (tick sound, nothing recorded)`, o1 > o0 && !r.fard?.dhuhr && !!q.days?.[DAY], JSON.stringify({ o0, o1, fard: r.fard, pend: q.days?.[DAY] }));
  const ring0 = await p.evaluate(() => document.getElementById('completedCount')?.textContent.trim());
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
  await soundCounter(p);
  const kept = await p.evaluate(() => document.querySelector('#liveEvents [data-sub-layer="fard"][data-sub-key="dhuhr"]')?.classList.contains('done'));
  ok('C', `${lang}: the selection survives a reload and the progress count did not move (${ring0})`, kept && /^(0|০)/.test(ring0 || ''), JSON.stringify({ kept, ring0 }));
  await p.screenshot({ path: path.join(SHOTS, `C-selected-not-recorded-${lang}.png`) });
  const o2 = await osc(p);
  await click(p, '#liveEvents [data-mark-complete][data-mark-key="dhuhr"]'); await sleep(700);
  r = await rec(p); q = await pend(p);
  ok('C', `${lang}: Mark Complete records Dhuhr with the completion sound and clears the selection`, !!r.fard?.dhuhr && !!r.closed?.['fard:dhuhr'] && (await osc(p)) > o2 && !q.days?.[DAY]?.fard?.dhuhr, JSON.stringify({ fard: r.fard, closed: r.closed }));
  // Other voluntary prayers: +2 taps pending, own Mark Complete saves a timed entry
  const o3 = await osc(p);
  await click(p, '#otherVoluntaryAdd'); await sleep(300); await click(p, '#otherVoluntaryAdd'); await sleep(400);
  const pendTxt = await p.evaluate(() => document.getElementById('otherVoluntaryPending')?.textContent.trim());
  r = await rec(p);
  ok('C', `${lang}: two "+2 rak'ahs" taps show 4 performed, tick sound, nothing recorded`, /4|৪/.test(pendTxt || '') && !r.otherNafl && (await osc(p)) > o3, JSON.stringify({ pendTxt, otherNafl: r.otherNafl }));
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(800);
  const pendAfter = await p.evaluate(() => document.getElementById('otherVoluntaryPending')?.textContent.trim());
  ok('C', `${lang}: the pending Other voluntary count survives a reload`, /4|৪/.test(pendAfter || ''), pendAfter);
  await p.screenshot({ path: path.join(SHOTS, `C-other-pending-${lang}.png`), fullPage: true });
  await click(p, '#otherVoluntaryComplete'); await sleep(700);
  r = await rec(p);
  ok('C', `${lang}: Other voluntary Mark Complete saves one timed entry of 4 rak'ahs`, r.otherNafl === 4 && r.otherEntries?.length === 1 && r.otherEntries[0].rakahs === 4 && r.otherEntries[0].at > 0, JSON.stringify(r.otherEntries));
  await p.close();
}

/* ---------- C3. the Friday rule still applies while selecting ---------- */
if (run('C')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: '2026-11-20T13:30:00+06:00' });
  await click(p, '#liveEvents [data-sub-layer="fard"][data-sub-key="jumuah"]'); await sleep(400);
  const f = await p.evaluate(() => ({ jum: document.querySelector('#liveEvents [data-sub-key="jumuah"]')?.classList.contains('done'), dhuhrExclusive: document.querySelector('#liveEvents [data-sub-layer="fard"][data-sub-key="dhuhr"]')?.classList.contains('is-exclusive') }));
  const r = await p.evaluate(() => (JSON.parse(localStorage.getItem('prayer-times-data') || '{}').history || {})['2026-11-20'] || {});
  ok('C', `${lang}: Friday: selecting Jumu'ah makes Dhuhr exclusive, and nothing is recorded yet`, f.jum && f.dhuhrExclusive && !r.fard?.dhuhr && !r.fridayFard, JSON.stringify({ f, r }));
  await p.close();
}

/* ---------- C5. lowering Other voluntary entries in the Prayer record (10 AM / 7 PM, 20-rak'ah reduction, windows) ---------- */
if (run('C5')) for (const lang of LANGS) {
  const two = { otherNafl: 8, rakahs: { other_nafl: 8 }, otherEntries: [{ at: at(10), rakahs: 4 }, { at: at(19), rakahs: 4 }] };
  // at 21:00 the 10 AM entry is locked (Asr began), the 7 PM one is open
  let p = await open(b, { lang, w: 1280, h: 900, at: NIGHT, data: { history: { [DAY]: two } } });
  await openDay(p);
  const st = await p.evaluate(() => [...document.querySelectorAll('.other-entry')].map(e => ({ line: e.querySelector('.other-entry-line')?.textContent.trim(), ticks: e.querySelectorAll('[data-other-tick]').length, done: e.querySelectorAll('[data-other-tick].done').length, usable: [...e.querySelectorAll('[data-other-tick]')].filter(x => !x.disabled && !x.classList.contains('is-locked')).length })));
  ok('C5', `${lang}: two timed entries (10 AM, 7 PM), each with circles 2–12 and 2 filled`, st.length === 2 && st.every(e => e.ticks === 6 && e.done === 2), JSON.stringify(st));
  await p.screenshot({ path: path.join(SHOTS, `C5-entries-night-${lang}.png`), fullPage: true });
  await click(p, '[data-other-tick="0"][data-other-index="1"]'); await sleep(500);
  let r = await rec(p);
  ok('C5', `${lang}: at 9 PM the 10 AM entry is locked (its window closed at Asr)`, r.otherNafl === 8 && r.otherEntries[0].rakahs === 4, JSON.stringify(r.otherEntries));
  await click(p, '[data-other-tick="1"][data-other-index="1"]'); await sleep(500);
  r = await rec(p);
  ok('C5', `${lang}: unticking the top circle lowers the 7 PM entry 4 → 2; totals update`, r.otherNafl === 6 && r.otherEntries[1].rakahs === 2, JSON.stringify(r));
  await p.close();
  // at 14:00 (before Asr) the 10 AM entry can be lowered
  p = await open(b, { lang, w: 1280, h: 900, at: MID, data: { history: { [DAY]: { otherNafl: 4, rakahs: { other_nafl: 4 }, otherEntries: [{ at: at(10), rakahs: 4 }] } } } });
  await openDay(p);
  await click(p, '[data-other-tick="0"][data-other-index="1"]'); await sleep(500);
  r = await rec(p);
  ok('C5', `${lang}: at 2 PM the 10 AM entry lowers 4 → 2`, r.otherNafl === 2 && r.otherEntries[0].rakahs === 2, JSON.stringify(r.otherEntries));
  await click(p, '[data-other-tick="0"][data-other-index="0"]'); await sleep(500);
  r = await rec(p);
  ok('C5', `${lang}: unticking the last circle removes the entry`, !r.otherNafl && !r.otherEntries?.length, JSON.stringify(r));
  await p.close();
  // 20-rak'ah reduction: 24 → 4 with the "More than 12" box
  p = await open(b, { lang, w: 1280, h: 900, at: MID, data: { history: { [DAY]: { otherNafl: 24, rakahs: { other_nafl: 24 }, otherEntries: [{ at: at(12, 30), rakahs: 24 }] } } } });
  await openDay(p);
  const hasBox = await p.evaluate(() => !!document.querySelector('[data-other-extra="0"] input'));
  await p.screenshot({ path: path.join(SHOTS, `C5-more-than-12-${lang}.png`), fullPage: true });
  await p.evaluate(() => { const i = document.querySelector('[data-other-extra="0"] input'); i.value = '30'; document.querySelector('[data-other-extra="0"]').requestSubmit(); }); await sleep(400);
  r = await rec(p);
  ok('C5', `${lang}: over 12 shows the "More than 12" box, and it cannot raise the number (30 refused)`, hasBox && r.otherNafl === 24, JSON.stringify(r.otherEntries));
  await p.evaluate(() => { const i = document.querySelector('[data-other-extra="0"] input'); i.value = '4'; document.querySelector('[data-other-extra="0"]').requestSubmit(); }); await sleep(500);
  r = await rec(p);
  const circles = await p.evaluate(() => document.querySelectorAll('[data-other-tick="0"].done').length);
  ok('C5', `${lang}: entering 4 lowers 24 → 4 (a 20-rak'ah reduction) and it turns back into circles`, r.otherNafl === 4 && r.otherEntries[0].rakahs === 4 && circles === 2, JSON.stringify({ e: r.otherEntries, circles }));
  await p.close();
  // the 7 PM (Isha period) entry is locked the next day after Dhuhr began
  p = await open(b, { lang, w: 1280, h: 900, at: NEXT_NOON, data: { history: { [DAY]: { otherNafl: 4, rakahs: { other_nafl: 4 }, otherEntries: [{ at: at(19), rakahs: 4 }] } } } });
  await openDay(p);
  await click(p, '[data-other-tick="0"][data-other-index="1"]'); await sleep(500);
  r = await rec(p);
  ok('C5', `${lang}: the 7 PM entry is locked once its window closes (next day, after Dhuhr began)`, r.otherNafl === 4, JSON.stringify(r.otherEntries));
  await p.close();
}

/* ---------- D. Prayer record page: one card per Fard prayer, one Undo ---------- */
if (run('D')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 900, at: NIGHT, data: { history: { [DAY]: fullDay } } });
  await openDay(p);
  const d = await p.evaluate(() => ({
    prayers: [...document.querySelectorAll('.weekly-prayer-card')].map(c => ({ key: c.dataset.weekPrayer, undo: c.querySelectorAll('[data-week-undo]').length, parts: c.querySelectorAll('.weekly-part-line').length })),
    fardUndo: document.querySelectorAll('[data-week-undo="fard"], [data-week-undo="sunnah"]').length,
    duhaUndo: document.querySelectorAll('[data-week-undo="voluntary"][data-week-key="duha"]').length
  }));
  ok('D', `${lang}: five Fard prayer cards, each with its parts and exactly one Undo; no separate Sunnah/Fard undo`, d.prayers.length === 5 && d.prayers.every(c => c.undo === 1 && c.parts >= 1) && d.fardUndo === 0, JSON.stringify(d));
  ok('D', `${lang}: Duha keeps one card with one Undo`, d.duhaUndo === 1, JSON.stringify(d));
  await p.screenshot({ path: path.join(SHOTS, `D-prayer-record-${lang}.png`), fullPage: true });
  await p.close();
}

/* ---------- E. Revise previous prayer (only after Undo) / F. no automatic late cards ---------- */
if (run('E')) for (const lang of LANGS) {
  const heading = lang === 'bn' ? 'আগের নামাজ সংশোধন করুন' : 'Revise previous prayer';
  // F: nothing recorded; at 2 PM no late card appears on its own
  let p = await open(b, { lang, w: 1280, h: 720, at: MID });
  let late = await p.evaluate(() => document.querySelectorAll('#liveEvents .late-event').length);
  ok('F', `${lang}: unrecorded Fajr and Duha (time ended) show no card on their own`, late === 0, String(late));
  const recovery = await p.evaluate(() => { document.getElementById('settingsToggle').click(); return !!document.getElementById('recoveryPanel') && !!document.getElementById('recoverySelect'); });
  ok('F', `${lang}: Prayer Completion Recovery is still in Settings`, recovery);
  await p.close();
  // E: undo Fajr (time passed) in the Prayer record -> only Fajr under Revise previous prayer
  const day = { fard: { fajr: true, dhuhr: true }, sunnah: { fajr_before: true }, closed: { 'fard:fajr': true, 'fard:dhuhr': true } };
  p = await open(b, { lang, w: 1280, h: 900, at: MID, data: { history: { [DAY]: day } } });
  await openDay(p);
  await click(p, '[data-week-undo="prayer"][data-week-key="fajr"]'); await sleep(600);
  let r = await rec(p);
  ok('D', `${lang}: one Undo removes the whole Fajr (Sunnah and Fard)`, !r.fard?.fajr && !r.sunnah?.fajr_before && !r.closed?.['fard:fajr'], JSON.stringify(r));
  await goHome(p);
  const rv = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#liveEvents .late-event')].map(c => ({ name: c.querySelector('.live-name')?.textContent.trim(), head: c.querySelector('.revise-heading')?.textContent.trim() })) }));
  ok('E', `${lang}: after Undo only Fajr appears, under "${heading}"`, rv.cards.length === 1 && /Fajr|ফজর/.test(rv.cards[0].name) && rv.cards[0].head === heading, JSON.stringify(rv));
  await p.screenshot({ path: path.join(SHOTS, `E-revise-previous-${lang}.png`) });
  await click(p, '#liveEvents .late-event [data-sub-layer="fard"][data-sub-key="fajr"]'); await sleep(300);
  await click(p, '#liveEvents .late-event [data-mark-complete]'); await sleep(700);
  r = await rec(p);
  late = await p.evaluate(() => document.querySelectorAll('#liveEvents .late-event').length);
  ok('E', `${lang}: re-tick + Mark Complete records Fajr with the "recorded after its time" mark and the card leaves`, !!r.fard?.fajr && !!r.late?.['fard:fajr'] && late === 0, JSON.stringify({ fard: r.fard, late: r.late, cards: late }));
  // undo Dhuhr while its time is open -> back to its normal card, no Revise heading
  await openDay(p);
  await click(p, '[data-week-undo="prayer"][data-week-key="dhuhr"]'); await sleep(600);
  await goHome(p);
  const dh = await p.evaluate(() => ({ normal: [...document.querySelectorAll('#liveEvents .live-event:not(.late-event) .live-name')].map(e => e.textContent.trim()), late: document.querySelectorAll('#liveEvents .late-event').length }));
  ok('E', `${lang}: undoing Dhuhr while its time is open returns it to its normal card`, dh.normal.some(n => /Dhuhr|যোহর/.test(n)) && dh.late === 0, JSON.stringify(dh));
  await p.close();
  // E4: the Revise card goes away when the record window closes (Fajr at Asr)
  p = await open(b, { lang, w: 1280, h: 720, at: AFTER_LOCK, pending: { days: {}, other: {}, reopened: { [`${DAY}|fard|fajr`]: true } } });
  late = await p.evaluate(() => document.querySelectorAll('#liveEvents .late-event').length);
  ok('E', `${lang}: after Asr began the undone Fajr is no longer offered`, late === 0, String(late));
  await p.close();
}

/* ---------- G. card layout: one flowing grid, no empty space ---------- */
if (run('G')) {
  const REOPEN = { days: {}, other: {}, reopened: { [`${DAY}|fard|fajr`]: true, [`${DAY}|voluntary|duha`]: true } };
  const COMBOS = {
    'Asr only': { at: AFTER_LOCK, pending: null },
    'available now': { at: MID, pending: null },
    'now + 1 Revise': { at: MID, pending: { days: {}, other: {}, reopened: { [`${DAY}|fard|fajr`]: true } } },
    'now + 2 Revise': { at: MID, pending: REOPEN }
  };
  for (const lang of LANGS) for (const [w, h] of [[1280, 720], [900, 700], [420, 700]]) for (const theme of ['Pearl Mint', 'Obsidian']) for (const [combo, c] of Object.entries(COMBOS)) {
    const p = await open(b, { lang, w, h, at: c.at, data: { theme }, pending: c.pending });
    await sleep(500);
    const g = await p.evaluate(() => {
      const box = document.getElementById('liveEvents'); const cb = box.getBoundingClientRect();
      const cards = [...box.children].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
      const rows = {}; cards.forEach(r => { const k = Math.round(r.top); (rows[k] ||= []).push(r); });
      const gaps = Object.values(rows).map(rs => Math.round(cb.right - Math.max(...rs.map(r => r.right))));
      return { n: cards.length, rows: Object.keys(rows).length, gaps, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, headings: document.querySelectorAll('#liveEvents > h2, #liveEvents > h3, #lateHeading').length };
    });
    ok('G', `${lang} ${w}x${h} ${theme === 'Obsidian' ? 'dark' : 'light'} ${combo}: ${g.n} cards in ${g.rows} rows, every row filled to the edge, no heading rows`, g.n >= 1 && g.gaps.every(x => x <= 2) && !g.overflow && g.headings === 0, JSON.stringify(g));
    if (theme === 'Pearl Mint' && combo !== 'available now') await p.screenshot({ path: path.join(SHOTS, `G-layout-${w}-${combo.replace(/\W+/g, '-')}-${lang}.png`), clip: await p.evaluate(() => { const r = document.getElementById('liveEvents').getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: document.documentElement.clientWidth, height: Math.max(40, r.height) }; }) });
    if (theme === 'Obsidian' && combo === 'now + 2 Revise' && w === 1280) await p.screenshot({ path: path.join(SHOTS, `G-layout-dark-${w}-${lang}.png`), fullPage: true });
    await p.close();
  }
}

/* ---------- H. version ---------- */
if (run('H')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const v = await p.evaluate(() => document.getElementById('appVersionLabel').textContent.trim());
  ok('H', `${lang}: corner label reads ${lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'}`, v === (lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'), v); // [v3.0.5] 4 [v3.0.6] K
  await p.close();
}

/* ---------- J. theme picker: dark first, then light ---------- */
if (run('J')) {
  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const themes = [...src.slice(src.indexOf('const THEMES = ['), src.indexOf('];', src.indexOf('const THEMES = ['))).matchAll(/\['([^']+)', '(dark|light)'/g)].map(m => [m[1], m[2]]);
  const expected = [...themes.filter(t => t[1] === 'dark'), ...themes.filter(t => t[1] !== 'dark')].map(t => t[0]);
  for (const lang of LANGS) {
    const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { theme: 'Pearl Mint' } });
    await click(p, '#settingsToggle'); await sleep(500);
    const opts = await p.evaluate(() => ({ values: [...document.querySelectorAll('#themeSelect option')].map(o => o.value), selected: document.getElementById('themeSelect').value }));
    ok('J', `${lang}: theme picker lists all ${themes.filter(t => t[1] === 'dark').length} dark themes, then all light ones, relative order kept; saved theme still selected`, JSON.stringify(opts.values) === JSON.stringify(expected) && opts.selected === 'Pearl Mint', JSON.stringify(opts));
    await p.close();
  }
}

/* ---------- K. countdown page: completion card leaves after Mark Complete ---------- */
if (run('K')) for (const lang of LANGS) for (const [w, h] of [[1280, 800], [900, 800], [420, 800]]) {
  const p = await open(b, { lang, w, h, at: MID });
  await p.evaluate(() => document.querySelector('#liveEvents .live-event:not(.late-event) [data-event-countdown][data-key="dhuhr"]')?.click()); await sleep(700);
  const geo = () => p.evaluate(() => [...document.querySelectorAll('#countdownView .page-cards > section')].filter(e => getComputedStyle(e).display !== 'none').map(e => { const r = e.getBoundingClientRect(); return { id: e.id, top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; }));
  const before = await geo();
  if (w !== 900) await p.screenshot({ path: path.join(SHOTS, `K-before-${w}-${lang}.png`), fullPage: true });
  await click(p, '#eventCompletionCard [data-sub-layer="fard"][data-sub-key="dhuhr"]'); await sleep(300);
  const sel = await rec(p);
  const stillShown = (await geo()).some(x => x.id === 'eventPrayerCard');
  ok('C', `${lang} ${w}: on the countdown page a tick only selects (nothing recorded, card stays)`, !sel.fard?.dhuhr && !sel.closed?.['fard:dhuhr'] && stillShown, JSON.stringify(sel));
  await click(p, '#eventCompletionCard [data-mark-complete]'); await sleep(800);
  const after = await geo();
  const r = await rec(p);
  const gap = after.length === 2 ? after[1].top - after[0].bottom : -1;
  const gridGap = before.length >= 2 ? before[1].top - before[0].bottom : -1;
  ok('K', `${lang} ${w}: Mark Complete records Dhuhr and leaves only Prayer countdown + Event timing, gap closed (${gap}px = card gap ${gridGap}px)`, !!r.closed?.['fard:dhuhr'] && before.some(x => x.id === 'eventPrayerCard') && after.map(x => x.id).join() === 'eventHero,eventTimingCard' && gap === gridGap, JSON.stringify({ before, after }));
  if (w !== 900) await p.screenshot({ path: path.join(SHOTS, `K-after-${w}-${lang}.png`), fullPage: true });
  if (w === 1280) {
    // undo while Dhuhr's time is open -> the card comes back
    await goHome(p); await openDay(p);
    await click(p, '[data-week-undo="prayer"][data-week-key="dhuhr"]'); await sleep(600);
    await goHome(p);
    await p.evaluate(() => document.querySelector('#liveEvents [data-event-countdown][data-key="dhuhr"]')?.click()); await sleep(700);
    const back = await geo();
    ok('K', `${lang}: after Undo while Dhuhr is open the completion card comes back`, back.some(x => x.id === 'eventPrayerCard'), JSON.stringify(back));
  }
  await p.close();
}

/* ---------- L. astrolabe and clock glide open from every page, and back ---------- */
if (run('L')) {
  const views = {
    home: async () => {},
    'home scrolled': async p => { await p.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' })); },
    countdown: async p => { await click(p, '#nextCountdownOpen'); },
    settings: async p => { await click(p, '#settingsToggle'); },
    'prayer record (weekly day)': async p => { await openDay(p); },
    'prayer page': async p => { await click(p, '[data-card-info]'); },
    'clock page': async p => { await click(p, '#analogClockButton'); await sleep(900); },
    'astrolabe page': async p => { await p.evaluate(() => document.getElementById('astroStage').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await sleep(1200); }
  };
  const animCount = p => p.evaluate(() => ['astroStage', 'analogClockButton'].reduce((a, id) => a + document.getElementById(id).getAnimations().length, 0));
  const watch = async p => { let n = 0; for (let i = 0; i < 10; i++) { await sleep(40); n = Math.max(n, await animCount(p)); } return n; };
  for (const lang of LANGS) for (const [name, go] of Object.entries(views)) for (const target of ['astro', 'clock']) {
    if ((name === 'clock page' && target === 'clock') || (name === 'astrolabe page' && target === 'astro')) continue;
    const p = await open(b, { lang, w: 1280, h: 720, at: MID });
    await sleep(300); await go(p); await sleep(600);
    const from = await visibleMain(p);
    if (target === 'astro') await p.evaluate(() => document.getElementById('astroStage').dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
    else await click(p, '#analogClockButton');
    const n = await watch(p); await sleep(700);
    const to = await visibleMain(p);
    ok('L', `${lang}: ${target} opens with the glide from ${name} (${from})`, n > 0 && to === (target === 'astro' ? 'astroView' : 'timeView'), JSON.stringify({ from, to, animations: n }));
    if (name === 'countdown') {
      await click(p, target === 'astro' ? '#astroBack' : '#timeBack');
      const nb = await watch(p); await sleep(700);
      ok('L', `${lang}: closing the ${target} page animates back`, nb > 0 && (await visibleMain(p)) === 'homeView', String(nb));
    }
    await p.close();
  }
  // reduced motion: no glide, page still opens
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: MID });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await click(p, '#settingsToggle'); await sleep(400);
  await p.evaluate(() => document.getElementById('astroStage').dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
  const n = await watch(p); await sleep(500);
  ok('L', 'prefers-reduced-motion: the astrolabe page opens from Settings without the glide', n === 0 && (await visibleMain(p)) === 'astroView', String(n));
  await p.close();
}

console.log(`\n${pass}/${pass + fail} passed`);
fs.writeFileSync(path.join(SHOTS, 'e2e-v304-results.txt'), `URL: ${process.env.PRAYER_E2E_URL || '(default)'}\n${out.join('\n')}\n\n${pass}/${pass + fail} passed\n`);
await b.close();
process.exit(fail ? 1 : 0);
