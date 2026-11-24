// v3.0.6 update: changed only where marked "[v3.0.6 …]" (version label K; reminder lines A/C/D if needed).
// v3.0.5 maintenance: this suite was not re-run for v3.0.4, whose C (ticks select, Mark Complete records), D (one Undo
// per prayer) and E/F ("Revise previous prayer" only after Undo; no automatic "Record previous prayer") changed lines
// B3–B7, C4 and D11. Those expectations, the version label (E) and the font lines changed by v3.0.5 item 1 are
// updated only where marked "[v3.0.5 maint]"; B4–B7 now check the v3.0.4 rule and point to e2e-v303 line 1/2, which
// covers the late Mark Complete flow. Every other check is unchanged.
// v3.0.2 browser checks: at least one per line of the approved command, in EN and BN.
// Headless Chrome against the Vite dev server (PRAYER_E2E_URL, default http://127.0.0.1:1420/).
// Usage: npx vite --port 1420 & node scripts/e2e-v302.mjs
import { launch, open as openRaw, sleep } from './lib.mjs';
// every page uses a light theme (Pearl Mint) so the screenshots are light; a check's own data still wins
const open = (b, o = {}) => openRaw(b, { ...o, data: { theme: 'Pearl Mint', ...(o.data || {}) } });
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = process.env.SHOTS_DIR || '/workspace/prayer/shots302/';
fs.mkdirSync(SHOTS, { recursive: true });
const b = await launch();
let pass = 0, fail = 0;
const out = [];
const ok = (id, name, cond, info = '') => {
  (cond ? pass++ : fail++);
  const line = `${cond ? 'PASS' : 'FAIL'} [${id}] ${name}${info ? '  — ' + String(info).slice(0, 400) : ''}`;
  out.push(line);
  console.log(line);
};
const shot = async (p, sel, name) => {
  const el = sel ? await p.$(sel) : null;
  if (el) await el.screenshot({ path: path.join(SHOTS, name) });
  else await p.screenshot({ path: path.join(SHOTS, name) });
};
const LANGS = ['en', 'bn'];
const MID = '2026-11-23T14:00:00+06:00';      // Monday: Dhuhr open; Fajr and Duha ended
const AFTER_LOCK = '2026-11-23T16:10:00+06:00'; // after Asr began: Fajr/Duha record window locked
const FRI_LATE = '2026-11-20T16:10:00+06:00';  // Friday after Asr began: Dhuhr/Jumu'ah ended, not locked
const NIGHT = '2026-11-23T22:00:00+06:00';
const FAJR_EARLY = '2026-11-24T05:10:00+06:00';
const DAY = '2026-11-23';
const night = { history: { [DAY]: { fard: {}, voluntary: { tahajjud: true }, rakahs: { qiyam: 2, tahajjud: 4, witr: 3 }, rakahSets: { qiyam: [true], tahajjud: [true, true], witr: [true, true] } } } };
const rec = p => p.evaluate(() => JSON.parse(localStorage.getItem('prayer-times-data') || '{}'));
const mono = ff => /mono|consolas|menlo|courier/i.test(ff || '');

// ---------- A1 countdown fonts (EN/BN, default fonts and after switching both pickers) ----------
for (const lang of LANGS) {
  for (const fonts of [{}, { uiFont: 'kalpurush', enFont: 'inter' }]) {
    const tag = fonts.uiFont ? 'switched' : 'default';
    const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: fonts });
    const home = await p.evaluate(() => {
      const body = getComputedStyle(document.body).fontFamily;
      const els = [...document.querySelectorAll('.live-event .countdown-card-value, #nextCountValue, .next-count')];
      return { body, list: els.map(e => ({ c: e.className || e.id, ff: getComputedStyle(e).fontFamily, vn: getComputedStyle(e).fontVariantNumeric })) };
    });
    await p.evaluate(() => document.querySelector('.live-event [data-event-countdown]')?.click());
    await sleep(700);
    const cd = await p.evaluate(() => { const e = document.getElementById('countdownLarge'); return { ff: getComputedStyle(e).fontFamily, vn: getComputedStyle(e).fontVariantNumeric, body: getComputedStyle(document.body).fontFamily }; });
    if (lang === 'en' && tag === 'default') await shot(p, '#countdownView', 'countdown-page-font-en.png');
    if (lang === 'bn' && tag === 'switched') await shot(p, '#countdownView', 'countdown-page-font-bn-kalpurush.png');
    await p.evaluate(() => document.getElementById('liveClock')?.click());
    await sleep(900);
    const clock = await p.evaluate(() => [...document.querySelectorAll('.clock-count-big, .clock-preferred-count, #bestCountdown')].map(e => ({ c: e.className || e.id, ff: getComputedStyle(e).fontFamily, vn: getComputedStyle(e).fontVariantNumeric, vis: !!e.offsetParent })));
    const all = [...home.list, cd, ...clock];
    const good = home.list.length >= 2 && all.every(x => !mono(x.ff) && x.ff === home.body && /tabular-nums/.test(x.vn));
    ok('A1', `${lang}/${tag}: every countdown uses the UI font stack (not monospace), tabular-nums`, good, JSON.stringify({ body: home.body, n: all.length, bad: all.filter(x => mono(x.ff) || x.ff !== home.body) }));
    // [v3.0.5] one Font list: a v3.0.4 save migrates to the English choice in English and the Bangla choice in Bangla
    if (tag === 'switched') ok('A1', `${lang}: switched stack is the picked font`, lang === 'bn' ? /^"?Kalpurush/.test(home.body) : /^"?Inter"?/.test(home.body), home.body);
    const keep = await p.evaluate(() => { const e = document.getElementById('progressCore'); return e ? getComputedStyle(e).fontFamily : ''; });
    ok('A1', `${lang}/${tag}: progress core label keeps its monospace face`, mono(keep), keep);
    await p.close();
  }
}
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: MID });
  await shot(p, '.hero-row', 'home-countdowns-font-en.png');
  await p.close();
  const q = await open(b, { lang: 'bn', w: 1280, h: 720, at: MID });
  await shot(q, '.hero-row', 'home-countdowns-font-bn.png');
  await q.close();
}

// ---------- A2 Bornomala bundled, Lohit gone; About credits ----------
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { uiFont: 'lohit' } });
  const f = await p.evaluate(async () => {
    await document.fonts.load('16px "Bornomala"', 'কখগ');
    const sel = document.getElementById('uiFontSelect');
    return { loaded: document.fonts.check('16px "Bornomala"', 'কখগ'), options: [...sel.options].map(o => o.value), value: sel.value, stack: getComputedStyle(document.body).fontFamily, about: document.getElementById('aboutSources')?.innerText };
  });
  ok('A2', `${lang}: Bornomala is offered and loads offline; a saved Lohit choice opens as Bornomala`, f.loaded && f.options.includes('bornomala') && !f.options.includes('lohit') && f.value === 'bornomala' && /Bornomala/.test(f.stack), JSON.stringify({ ...f, about: undefined }));
  ok('A2', `${lang}: About names Bornomala and Li Ador Noirrit's licence`, lang === 'en' ? /Bornomala are OFL[\s\S]*Li Ador Noirrit is not bundled/.test(f.about) : /বর্ণমালা OFL[\s\S]*লি আদর নৈঋত/.test(f.about), f.about?.slice(0, 200));
  await p.close();
}

// ---------- A3 revise leftovers ----------
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const t = await p.evaluate(() => document.body.innerText);
  ok('A3', `${lang}: no Revise event record text anywhere`, !/Revise event record|ইভেন্টের রেকর্ড সংশোধন|RECORD REVIEW|রেকর্ড পর্যালোচনা/.test(t));
  await p.close();
}

// ---------- B1/B2/B3 ----------
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const b1 = await p.evaluate(() => ({
    buttons: document.querySelectorAll('#prayerGrid .record-button, #voluntaryList .record-button, [data-day-fard], [data-voluntary-record]').length,
    text: /Record completion|সম্পন্ন রেকর্ড করুন/.test((document.getElementById('prayerGrid')?.innerText || '') + (document.getElementById('voluntaryList')?.innerText || '')),
    cards: document.querySelectorAll('#prayerGrid .prayer-card').length
  }));
  ok('B1', `${lang}: no Record completion on the five Fard and voluntary cards`, b1.buttons === 0 && !b1.text && b1.cards === 5, JSON.stringify(b1));
  if (lang === 'en') await shot(p, '#prayerGrid .prayer-card', 'fard-card-no-record-en.png');
  if (lang === 'bn') await shot(p, '#prayerGrid .prayer-card', 'fard-card-no-record-bn.png');
  const b2 = await p.evaluate(() => !!document.querySelector('#liveEvents .live-event .mark-event-complete'));
  ok('B2', `${lang}: Mark Complete is still on the open home event card`, b2);
  await p.evaluate(() => document.querySelector('#liveEvents [data-event-countdown]')?.click());
  await sleep(700);
  const b2c = await p.evaluate(() => { const m = document.querySelector('#countdownView .mark-event-complete'); return m ? { disabled: m.disabled } : null; });
  ok('B2', `${lang}: Mark Complete is still on the countdown page (enabled while open)`, !!b2c && !b2c.disabled, JSON.stringify(b2c));
  await p.close();
  const q = await open(b, { lang, w: 1280, h: 720, at: MID });
  await q.click('#liveEvents .part-tick.fard[data-sub-key="dhuhr"]');
  await sleep(500);
  await q.click('#liveEvents [data-mark-complete="fard"][data-mark-key="dhuhr"]'); // [v3.0.5 maint] v3.0.4 C: Mark Complete records
  await sleep(500);
  const r = await rec(q);
  ok('B3', `${lang}: open Dhuhr circle ticks as before, not marked late`, !!r.history?.[DAY]?.fard?.dhuhr && !r.history?.[DAY]?.late, JSON.stringify(r.history?.[DAY]));
  await q.close();
}

// ---------- B4/B5/B6/B7 [v3.0.5 maint] superseded by v3.0.4 E/F ----------
// The automatic "Record previous prayer" section is gone (v3.0.4 F); an ended prayer comes back under "Revise previous
// prayer" only after Undo (v3.0.4 E). The late Mark Complete, Friday rule, ordered ticks and lock checks live in
// scripts/e2e-v303.mjs line 1/2. Here: the old section does not appear, and the in-window Undo still re-opens the card.
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const before = await p.evaluate(() => ({ block: !!document.getElementById('lateEventsBlock'), late: document.querySelectorAll('#liveEvents .late-event').length }));
  ok('B4', `${lang}: [v3.0.4 F] an ended unticked Fajr gets no card on its own`, !before.block && before.late === 0, JSON.stringify(before));
  await p.close();
  const w = await open(b, { lang, w: 1280, h: 720, at: MID, data: { history: { [DAY]: { fard: { dhuhr: true }, voluntary: {}, closed: { 'fard:dhuhr': true } } } } });
  const hiddenBefore = await w.evaluate(() => !document.querySelector('#liveEvents .part-tick.fard[data-sub-key="dhuhr"]'));
  await w.evaluate(d => document.querySelector(`[data-week-date="${d}"]`)?.click(), DAY);
  await sleep(500);
  const u2 = await w.$('[data-week-undo="prayer"][data-week-key="dhuhr"]'); // v3.0.4 D1 one Undo per prayer
  if (u2) await u2.click();
  await sleep(400);
  await w.keyboard.press('Escape');
  await sleep(500);
  await w.evaluate(() => { if (document.getElementById('homeView').hidden) document.querySelector('#weeklyDayBack, [data-back], .back-button')?.click(); });
  await sleep(500);
  const shownAgain = await w.evaluate(() => !!document.querySelector('#liveEvents .part-tick.fard[data-sub-key="dhuhr"]'));
  ok('B5', `${lang}: in-window untick brings the circle back under the normal heading (closed card re-opens)`, hiddenBefore && shownAgain && !!u2, JSON.stringify({ hiddenBefore, shownAgain, undo: !!u2 }));
  await w.close();
}

// ---------- B8 old records load unchanged ----------
for (const lang of LANGS) {
  const legacy = { '2026-11-22': { fard: { fajr: true, dhuhr: true, asr: true }, voluntary: { witr: true }, rakahs: { witr: 3 }, rakahSets: { witr: [true, false] }, revise: { 'fard:isha': { id: 'fard:isha', kind: 'fard', key: 'isha', parts: {} } }, closed: { 'fard:fajr': true } } };
  const p = await open(b, { lang, w: 1280, h: 720, at: MID, data: { history: legacy } });
  const r = await rec(p);
  // what v3.0.1 itself stores after loading the same record (captured from the v3.0.1 build, same data and clock):
  // its existing load-time normalisation pads rakahSets to the circle count and seals the locked day.
  const v301 = {"fard":{"fajr":true,"dhuhr":true,"asr":true},"voluntary":{"witr":true},"rakahs":{"witr":3},"rakahSets":{"witr":[true,true,false,false,false,false]},"revise":{"fard:isha":{"id":"fard:isha","kind":"fard","key":"isha","parts":{}}},"closed":{"fard:fajr":true},"locked":{"fard:fajr":1,"fard:dhuhr":1,"fard:asr":1,"voluntary:witr":1}};
  ok('B8', `${lang}: a v3.0.1 record loads exactly as v3.0.1 itself loads it (fields kept, revise kept) and the page has no errors`, JSON.stringify(r.history['2026-11-22']) === JSON.stringify(v301) && p.errs.length === 0, JSON.stringify({ errs: p.errs, got: r.history['2026-11-22'] }));
  await p.close();
}

// ---------- C Qiyam umbrella and labels ----------
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: NIGHT, data: night });
  const c = await p.evaluate(() => {
    const q = document.querySelector('#liveEvents [data-vol-count="qiyam"]');
    const labels = k => [...document.querySelectorAll(`#liveEvents [data-vol-tick="${k}"] span`)].map(s => s.textContent.trim());
    return { qiyam: q?.textContent.trim(), qLabels: labels('qiyam'), wLabels: labels('witr'), caption: document.getElementById('progressCaption')?.textContent };
  });
  const want = lang === 'bn' ? 'কিয়ামুল লাইল ৯ রাকাত: তাহাজ্জুদ ৪, বিতর ৩, অন্যান্য ২' : 'Qiyam al-Layl 9 rak‘ahs: Tahajjud 4, Witr 3, other 2';
  ok('C1/C2', `${lang}: Qiyam card shows the umbrella breakdown`, c.qiyam === want, c.qiyam);
  ok('C3', `${lang}: voluntary total counts each rak'ah once (9, not 18)`, lang === 'bn' ? /ঐচ্ছিক ৯ রাকাত/.test(c.caption) : /Voluntary 9 rak/.test(c.caption), c.caption);
  const ev = lang === 'bn' ? ['২', '৪', '৬', '৮', '১০', '১২'] : ['2', '4', '6', '8', '10', '12'];
  const od = lang === 'bn' ? ['১', '৩', '৫', '৭', '৯', '১১'] : ['1', '3', '5', '7', '9', '11'];
  ok('C4', `${lang}: Qiyam's own circles read 2,4,6…; Witr 1,3,5…`, JSON.stringify(c.qLabels) === JSON.stringify(ev) && JSON.stringify(c.wLabels) === JSON.stringify(od), JSON.stringify(c));
  if (lang === 'en') { await shot(p, '#liveEvents .live-event.voluntary:has([data-vol-count="qiyam"])', 'qiyam-card-en.png'); await shot(p, '#liveEvents .live-event.voluntary:has([data-vol-count="witr"])', 'witr-card-en.png'); }
  if (lang === 'bn') { await shot(p, '#liveEvents .live-event.voluntary:has([data-vol-count="qiyam"])', 'qiyam-card-bn.png'); await shot(p, '#liveEvents .live-event.voluntary:has([data-vol-count="witr"])', 'witr-card-bn.png'); }
  await p.evaluate(() => document.querySelector('#liveEvents [data-vol-tick="qiyam"][data-vol-index="1"]')?.click());
  await sleep(500);
  await p.evaluate(() => document.querySelector('#liveEvents [data-mark-complete="voluntary"][data-mark-key="qiyam"]')?.click()); // [v3.0.5 maint] v3.0.4 C
  await sleep(500);
  const r = await rec(p);
  ok('C4', `${lang}: ticking order and saved counts unchanged (2nd Qiyam circle saves 4)`, r.history[DAY].rakahs.qiyam === 4 && r.history[DAY].rakahs.tahajjud === 4 && r.history[DAY].rakahs.witr === 3, JSON.stringify(r.history[DAY].rakahs));
  await p.close();
}

// ---------- D Blessed Reminder ----------
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  // [v3.0.6 F] read marks are kept per year in localStorage, shared by every page of this run: start each language clean
  await p.evaluate(() => localStorage.removeItem('prayer-times-reading-plan'));
  await p.reload({ waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1200);
  const n = await p.evaluate(() => {
    const el = document.getElementById('dailyNote');
    return { text: el.innerText, subject: el.querySelector('.blessed-subject')?.textContent, ref: el.querySelector('.blessed-ref')?.textContent, nums: el.querySelectorAll('.blessed-num').length, progress: el.querySelector('.blessed-progress')?.textContent, lang: el.querySelector('.blessed-tr')?.getAttribute('lang'), full: !!el.querySelector('[data-blessed-full]'), portion: !!el.querySelector('[data-blessed-portion]'), arabicBlock: !!el.querySelector('.blessed-ar, [lang="ar"]') };
  });
  ok('D1', `${lang}: the reminder has no Arabic, only the selected language`, !ARABIC.test(n.text) && !n.arabicBlock && n.lang === lang, n.text.slice(0, 160));
  ok('D1', `${lang}: surah name and verse numbers are shown`, /\d|[০-৯]/.test(n.ref || '') && n.nums >= 1, n.ref);
  ok('D7', `${lang}: a subject line is shown above the passage`, !!n.subject && (lang === 'en' || /[\u0980-\u09FF]/.test(n.subject)), n.subject);
  // [changed in v3.0.6 D] the juz' of today's passages in the lunar-year plan (was: juz' 13 of the monthly plan)
  const expectProg = lang === 'bn' ? /^পারা [০-৯]+(–[০-৯]+)? · আজ [০-৯]+টি অংশের [০-৯]+টি পড়া হয়েছে$/ : /^Juz' \d+(–\d+)? · \d+ of \d+ passages read today$/;
  ok('D14', `${lang}: progress line under the reminder`, expectProg.test(n.progress || ''), n.progress);
  if (lang === 'en') await shot(p, '#dailyNote', 'blessed-reminder-en.png');
  if (lang === 'bn') await shot(p, '#dailyNote', 'blessed-reminder-bn.png');
  // D4/D5: Full section and Read more
  const full = await p.evaluate(async () => {
    const before = document.querySelector('#dailyNote .blessed-ref').textContent;
    document.querySelector('#dailyNote [data-blessed-full]')?.click();
    await new Promise(r => setTimeout(r, 200));
    const after = document.querySelector('#dailyNote .blessed-ref').textContent;
    const label = document.querySelector('#dailyNote [data-blessed-full]')?.textContent;
    document.querySelector('#dailyNote [data-blessed-full]')?.click();
    await new Promise(r => setTimeout(r, 200));
    return { before, after, label, back: document.querySelector('#dailyNote .blessed-ref').textContent };
  });
  ok('D4', `${lang}: Full section is one tap away and returns`, full.after !== full.before && full.back === full.before, JSON.stringify(full));
  // D13 Today's portion
  await p.evaluate(() => document.querySelector('#dailyNote [data-blessed-portion]').click());
  await sleep(500);
  const po = await p.evaluate(() => ({
    open: document.getElementById('portionDialog').open,
    title: document.getElementById('portionTitle').textContent,
    items: document.querySelectorAll('#portionList .portion-item').length,
    unread: document.querySelectorAll('#portionList .portion-item.is-unread').length,
    summary: document.getElementById('portionSummary').textContent,
    read: document.querySelectorAll('#portionList .portion-item:not(.is-unread)').length, // [changed in v3.0.6 C] only Mark as read counts
    scroll: (() => { const l = document.getElementById('portionList'); return l.scrollHeight > l.clientHeight && getComputedStyle(l).overflowY === 'auto'; })()
  }));
  // [changed in v3.0.6 C/D] today's portion of the lunar-year plan (~7–8 passages, was 69 = one juz'); nothing is read
  // until Mark as read is pressed (was: the shown passage counted as read automatically)
  ok('D13', `${lang}: Today's portion opens a scrollable list of today's passages with unread marked [v3.0.6 C/D]`, po.open && po.title === (lang === 'bn' ? 'আজকের অংশ' : "Today's portion") && po.items >= 2 && po.items <= 12 && po.read === 0 && po.unread === po.items && po.scroll, JSON.stringify(po));
  await p.evaluate(() => document.querySelector('#portionList .portion-item.is-unread [data-portion-open]').click());
  await sleep(400);
  const opened = await p.evaluate(() => ({ unread: document.querySelectorAll('#portionList .portion-item.is-unread').length, body: !!document.querySelector('#portionList .portion-item.is-open .blessed-tr'), full: !!document.querySelector('#portionList .portion-item.is-open [data-blessed-full]') }));
  await p.evaluate(() => document.querySelector('#portionList .portion-item.is-open [data-blessed-mark]')?.click());
  await sleep(400);
  const marked = await p.evaluate(() => document.querySelectorAll('#portionList .portion-item.is-unread').length);
  // [changed in v3.0.6 A/B] opening a passage no longer marks it read; its Mark as read button does
  ok('D13', `${lang}: opening a passage there does not mark it, its Mark as read does [v3.0.6 A/B]; Full section works there`, opened.unread === po.unread && marked === po.unread - 1 && opened.body && opened.full, JSON.stringify({ ...opened, marked }));
  if (lang === 'en') await shot(p, '#portionDialog', 'todays-portion-en.png');
  if (lang === 'bn') await shot(p, '#portionDialog', 'todays-portion-bn.png');
  await p.keyboard.press('Escape');
  await sleep(200);
  // D12 compact per-day bitset keyed by the Hijri date
  // [changed in v3.0.6 F] read status is kept per passage per Hijri year (was: a per-day bitset keyed by the Hijri date)
  const mem = await p.evaluate(() => ({ old: localStorage.getItem('prayer-times-blessed-reading'), plan: JSON.parse(localStorage.getItem('prayer-times-reading-plan') || '{}') }));
  ok('D12', `${lang}: reading memory is a compact bitset per Hijri year (one passage marked) [v3.0.6 F]`, mem.old === null && typeof mem.plan.years?.['1448'] === 'string' && mem.plan.years['1448'].length <= 460, JSON.stringify({ old: mem.old, years: Object.keys(mem.plan.years || {}), len: mem.plan.years?.['1448']?.length }));
  // D14 settings line and switch, persisted
  await p.click('#settingsToggle');
  await sleep(500);
  const st = await p.evaluate(() => ({ line: document.getElementById('blessedMonthLine')?.textContent, checked: document.getElementById('blessedProgressToggle')?.checked }));
  ok('D14', `${lang}: Settings shows the month line and the switch (on by default)`, (lang === 'bn' ? /^১৪৪৮ হিজরি: ২,৭৩৯টি অংশের ১টি পড়া হয়েছে$/ : /^1448 AH: 1 of 2,739 passages read$/).test(st.line || '') && st.checked === true /* [changed in v3.0.6 F] year line (was: This month: n of 30 parts) */, JSON.stringify(st));
  if (lang === 'en') await shot(p, '#blessedSettings', 'settings-reading-en.png');
  if (lang === 'bn') await shot(p, '#blessedSettings', 'settings-reading-bn.png');
  await p.click('#blessedProgressToggle');
  await sleep(300);
  await p.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  const hid = await p.evaluate(() => ({ line: !!document.querySelector('#dailyNote .blessed-progress'), saved: JSON.parse(localStorage.getItem('prayer-times-data')).blessedProgress }));
  ok('D14', `${lang}: switching it off hides the line and survives a reload`, !hid.line && hid.saved === false, JSON.stringify(hid));
  await p.close();
}

// D2 About credit; D16 name and credits
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const about = await p.evaluate(() => document.getElementById('aboutSources').innerText);
  ok('D2', `${lang}: About credits the Tanzil ruku' metadata (CC BY 3.0)`, /CC BY 3\.0/.test(about) && (lang === 'en' ? /556 ruku’ sections/.test(about) : /৫৫৬টি রুকু/.test(about)), about.slice(0, 200));
  ok('D16', `${lang}: name and translation credits unchanged`, (lang === 'en' ? /Saheeh International[\s\S]*Muhiuddin Khan/ : /সাহিহ ইন্টারন্যাশনাল[\s\S]*মুহিউদ্দিন খান/).test(about) && (await p.evaluate(() => document.querySelector('#dailyNote .eyebrow')?.textContent || '')).toUpperCase() === (lang === 'bn' ? 'একটি বরকতময় স্মরণ' : 'A BLESSED REMINDER'));
  await p.close();
}

// D3/D4/D5/D6/D8 data checks run in the page against the shipped files
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: MID });
  const d = await p.evaluate(async () => {
    const m = await import('/src/blessed-reminder.js');
    const R = await m.loadReading();
    const P = R.passages;
    let crossJuz = 0, crossSection = 0, cut = 0;
    const juz = new Set(P.juz), sec = new Set(P.sections);
    for (let i = 0; i < P.starts.length; i++) {
      const v = m.passageVerses(P, i);
      for (let x = v.from + 1; x < v.to; x++) { if (juz.has(x)) crossJuz++; if (sec.has(x)) crossSection++; }
      const s = m.presentPassage(R, i, 'en'); const f = m.presentPassage(R, i, 'en', { expanded: true });
      s.verses.forEach((vv, k) => { if (vv.preview ? !f.verses[k].text.startsWith(vv.text.slice(0, -1).trimEnd()) : vv.text !== f.verses[k].text) cut++; }); // v3.0.3: long-verse previews are display only
    }
    return { count: P.starts.length, crossJuz, crossSection, cut, themes: P.themes.length, tagged: P.tg.filter(Boolean).length };
  });
  ok('D3', 'v3.0.3 rebalance: 2,739 passages', d.count === 2739, JSON.stringify(d));
  ok('D4', 'passages never cross a juz\' or ruku\' boundary', d.crossJuz === 0 && d.crossSection === 0, JSON.stringify(d));
  ok('D5', 'no verse is ever cut (shown verses are whole)', d.cut === 0, JSON.stringify(d));
  ok('D8', 'eleven themes; tagged verses mark their passages as first picks', d.themes === 11 && d.tagged > 200, JSON.stringify(d));
  const long = await p.evaluate(async () => {
    const m = await import('/src/blessed-reminder.js');
    const R = await m.loadReading();
    for (let i = 0; i < R.passages.starts.length; i++) { const v = m.presentPassage(R, i, 'en'); if (v.truncated) return { i, shown: v.verses.length, all: v.allVerses.length }; }
    return null;
  });
  ok('D5', 'a long passage shows whole leading verses and Read more shows the rest', !!long && long.shown < long.all, JSON.stringify(long));
  ok('D6', 'hand-check report is in CHECKLIST-v3.0.2.md (300 + 100 split points)', (() => { try { const t = fs.readFileSync(new URL('../CHECKLIST-v3.0.2.md', import.meta.url), 'utf8'); return /Hand-check of split points/.test(t) && /300 split points/.test(t) && /100 more/.test(t); } catch { return false; } })());
  await p.close();
}

// D9/D15 simulated months in the real app: every day of a 29-day month (Jumada II 1448) and a 30-day month (Rajab 1448)
async function monthCoverage(startCivil, days) {
  const seen = new Map();
  const perDay = [];
  for (let d = 1; d <= days; d++) {
    const civil = new Date(new Date(`${startCivil}T10:00:00+06:00`).getTime() + (d - 1) * 864e5);
    const at = civil.toISOString();
    const p = await open(b, { lang: 'en', w: 1280, h: 720, at });
    await sleep(700);
    await p.evaluate(() => document.querySelector('#dailyNote [data-blessed-portion]')?.click());
    await sleep(250);
    const refs = await p.evaluate(async () => {
      const m = await import('/src/blessed-reminder.js');
      const R = await m.loadReading();
      const ids = [...document.querySelectorAll('#portionList .portion-item')].map(e => Number(e.dataset.portion));
      const verses = [];
      for (const i of ids) { const v = m.passageVerses(R.passages, i); for (let x = v.from; x < v.to; x++) verses.push(x); }
      return { verses, summary: document.getElementById('portionSummary').textContent, n: ids.length };
    });
    perDay.push({ d, n: refs.n, summary: refs.summary });
    for (const v of refs.verses) seen.set(v, (seen.get(v) || 0) + 1);
    await p.close();
  }
  const keys = [...seen.keys()].sort((x, y) => x - y);
  return { seen, perDay, first: keys[0], last: keys[keys.length - 1], contiguous: keys.length > 0 && keys.length === keys[keys.length - 1] - keys[0] + 1 && [...seen.values()].every(c => c === 1) };
}
{
  { const c = await open(b, { lang: 'en', w: 1280, h: 720, at: MID }); await c.evaluate(() => localStorage.removeItem('prayer-times-reading-plan')); await c.close(); } // [v3.0.6 F] no marks left from earlier checks
  const m29 = await monthCoverage('2026-11-11', 29);
  // [changed in v3.0.6 D] the whole Qur'an is read over the Hijri YEAR (2,739 passages over 354/355 days), not every
  // month: over these 29/30 days the portions follow on in mushaf order, no verse twice, none skipped, every day has one
  const m30 = await monthCoverage('2026-12-10', 30);
  const daysOk = m => m.perDay.every(x => x.n >= 2 && /^Juz' \d+(–\d+)? · 0 of \d+ passages read today$/.test(x.summary));
  ok('D9', '29 days from 11 Nov 2026: portions follow on in mushaf order, no verse twice or skipped [v3.0.6 D]', m29.contiguous && daysOk(m29), JSON.stringify({ size: m29.seen.size, first: m29.first, last: m29.last, day29: m29.perDay[28] }));
  ok('D9', '30 days from 10 Dec 2026: portions follow on in mushaf order, no verse twice or skipped [v3.0.6 D]', m30.contiguous && daysOk(m30), JSON.stringify({ size: m30.seen.size, first: m30.first, last: m30.last, d30: m30.perDay[29] }));
  // [changed in v3.0.6 D] a new Hijri month no longer restarts at juz' 1: the plan carries on from the day before
  const m29b = await monthCoverage('2026-12-09', 2);
  ok('D15', 'a new Hijri month continues the plan from the day before (no restart at juz\' 1) [v3.0.6 D]', m29b.contiguous && m29b.first <= m30.first && m29b.last >= m30.first, JSON.stringify({ prev: [m29b.first, m29b.last], next: m30.first }));
  fs.writeFileSync(path.join(SHOTS, 'month-coverage.json'), JSON.stringify({ m29: m29.perDay, m30: m30.perDay }, null, 1));
}
// D15 the day's juz' follows the Hijri date (Maghrib moves the date)
{
  const p = await open(b, { lang: 'en', w: 1280, h: 720, at: '2026-11-23T17:40:00+06:00' });
  await sleep(1000);
  const after = await p.evaluate(() => ({ prog: document.querySelector('#dailyNote .blessed-progress')?.textContent, hijri: document.getElementById('hijriDateLabel')?.textContent.trim() }));
  await p.close();
  const q = await open(b, { lang: 'en', w: 1280, h: 720, at: MID });
  await sleep(1000);
  const before = await q.evaluate(() => ({ prog: document.querySelector('#dailyNote .blessed-progress')?.textContent, hijri: document.getElementById('hijriDateLabel')?.textContent.trim() }));
  await q.close();
  // [changed in v3.0.6 G] the Hijri date still moves at Maghrib, but the reading day (today's portion) changes at
  // midnight in the location's time zone (was: the juz' moved on at Maghrib with the date)
  ok('D15', 'after Maghrib the Hijri date moves on while today\'s portion stays until midnight [v3.0.6 G]', after.hijri !== before.hijri && !!after.prog && after.prog === before.prog, JSON.stringify({ before, after }));
}
// D10 order and the 10-minute step; D11 moments
// [changed in v3.0.6 A] only Mark as read moves the reminder on (was: the next unread after 10 minutes); the
// moments (gratitude, Jumu'ah, dawn) are kept and pick an unread passage of today's portion with that theme.
const shownInfo = (pg, theme) => pg.evaluate(async theme => {
  const m = await import('/src/blessed-reminder.js'); const R = await m.loadReading();
  const btn = document.querySelector('#dailyNote [data-blessed-mark]');
  const i = btn ? Number(btn.dataset.blessedMark) : null;
  document.querySelector('#dailyNote [data-blessed-portion]')?.click();
  await new Promise(r => setTimeout(r, 300));
  const items = [...document.querySelectorAll('#portionList .portion-item.is-unread')].map(e => Number(e.dataset.portion));
  document.getElementById('portionDialog')?.close?.();
  const themed = theme ? items.filter(k => m.hasTheme(R.passages, k, theme)) : [];
  return { i, first: items[0], unread: items, themed, isThemed: theme ? m.hasTheme(R.passages, i, theme) : null, ref: document.querySelector('#dailyNote .blessed-ref')?.textContent };
}, theme);
{
  const s = await open(b, { lang: 'en', w: 1280, h: 720, at: MID });
  await s.evaluate(() => localStorage.removeItem('prayer-times-reading-plan'));
  await s.reload({ waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(1500);
  const a = await shownInfo(s, null);
  await sleep(16000); // the app's own 15-second render
  const a2 = await shownInfo(s, null);
  await s.evaluate(() => document.querySelector('#dailyNote [data-blessed-mark]')?.click());
  await sleep(2600); // "Read ✓" shows for a moment, then the next unread passage
  const a3 = await shownInfo(s, null);
  ok('D10', 'reads in order from the start of today\'s portion; stays until Mark as read, then the next unread [v3.0.6 A]', a.i === a.first && a2.i === a.i && a3.i === a.unread[1], JSON.stringify({ first: a, after16s: a2.i, afterMark: a3.i }));
  await s.click('#liveEvents .part-tick.fard[data-sub-key="dhuhr"]');
  await sleep(300);
  await s.click('#liveEvents [data-mark-complete="fard"][data-mark-key="dhuhr"]'); // [v3.0.5 maint] v3.0.4 C: the record (Mark Complete) is the "tick"
  await sleep(800);
  await sleep(15500); // next render after the tick
  const mo = await shownInfo(s, 'gratitude');
  ok('D11', 'right after a tick the gratitude moment picks a gratitude passage of today\'s portion (in order if it has none)', mo.themed.length ? mo.isThemed : mo.i === mo.first, JSON.stringify(mo));
  await s.close();
  const f = await open(b, { lang: 'en', w: 1280, h: 720, at: '2026-11-27T12:30:00+06:00' });
  await sleep(1200);
  const fr = await shownInfo(f, 'friday');
  ok('D11', 'Friday in the Jumu\'ah window: friday theme if today\'s portion has one, otherwise in order', fr.themed.length ? fr.isThemed : fr.i === fr.first, JSON.stringify(fr));
  await f.close();
  const dwn = await open(b, { lang: 'en', w: 1280, h: 720, at: FAJR_EARLY });
  await sleep(1200);
  const dw = await shownInfo(dwn, 'dawn');
  ok('D11', 'first 30 minutes of Fajr: the dawn moment applies (dawn passage if one is unread, otherwise in order)', dw.themed.length ? dw.isThemed : dw.i === dw.first, JSON.stringify(dw));
  await dwn.close();
}

// ---------- E version label ----------
for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const v = await p.evaluate(() => document.getElementById('appVersionLabel').textContent.trim());
  ok('E', `${lang}: corner label`, v === (lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'), v); // [v3.0.5 maint] [v3.0.6] K
  if (lang === 'en') await p.screenshot({ path: path.join(SHOTS, 'version-label-en.png'), clip: { x: 1180, y: 690, width: 100, height: 30 } });
  if (lang === 'bn') await p.screenshot({ path: path.join(SHOTS, 'version-label-bn.png'), clip: { x: 1180, y: 690, width: 100, height: 30 } });
  await p.close();
}

// ---------- Layout 1280x720 and 420x700 ----------
for (const lang of LANGS) {
  for (const [w, h] of [[1280, 720], [420, 700]]) {
    for (const at of [MID, NIGHT]) {
      const p = await open(b, { lang, w, h, at, data: at === NIGHT ? night : {} });
      await sleep(900);
      const lay = await p.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const sels = ['#dailyNote', '#lateEventsBlock', '#liveEvents', '.live-event', '.vol-count', '.blessed-progress', '.blessed-actions', '#prayerGrid', '#voluntaryList'];
        const bad = [];
        for (const s of sels) for (const e of document.querySelectorAll(s)) { if (!e.offsetParent) continue; const r = e.getBoundingClientRect(); if (r.right > W + 1 || r.left < -1 || e.scrollWidth > e.clientWidth + 2) bad.push({ s, r: Math.round(r.right), sw: e.scrollWidth, cw: e.clientWidth }); }
        return { pageOverflow: document.documentElement.scrollWidth > W + 1, bad };
      });
      ok('Layout', `${lang} ${w}x${h} ${at === NIGHT ? 'night' : 'day'}: nothing overflows`, !lay.pageOverflow && lay.bad.length === 0, JSON.stringify(lay));
      if (w === 420 && at === MID) await p.screenshot({ path: path.join(SHOTS, `narrow-home-${lang}.png`), fullPage: true });
      await p.close();
    }
  }
}

console.log(`\n${pass}/${pass + fail} passed`);
fs.writeFileSync(path.join(SHOTS, 'e2e-v302-results.txt'), `${out.join('\n')}\n\n${pass}/${pass + fail} passed\n`);
await b.close();
process.exit(fail ? 1 : 0);
