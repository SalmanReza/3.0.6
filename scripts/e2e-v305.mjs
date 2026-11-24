// v3.0.6 update: changed only where marked "[v3.0.6 …]" (version label K; reminder lines A/C/D if needed).
// v3.0.5 browser checks: every line of the approved command (1 one Font list, 2 tick chronology, 3 Qiyam al-Layl split,
// 4 version), in EN and BN, plus "no page errors" on every page opened.
// Run against the build of the UNZIPPED release folder:
//   unzip Prayer-Times-v3.0.5.zip && cd Prayer-Times-v3.0.5 && npm ci && npm i --no-save puppeteer-core && npx vite --port 1431 &
//   PRAYER_E2E_URL=http://127.0.0.1:1431/ node scripts/e2e-v305.mjs
import { launch, open as openRaw, sleep } from './lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const open = (b, o = {}) => openRaw(b, { ...o, data: { theme: 'Pearl Mint', ...(o.data || {}) } });
const SHOTS = process.env.SHOTS_DIR || '/workspace/prayer/shots305/';
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
const noErrors = (p, id, where) => ok(id, `${where}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
const LANGS = ['en', 'bn'];
const DAY = '2026-11-23';
const MID = `${DAY}T14:00:00+06:00`;              // Dhuhr open; Fajr ended (revise window open until Asr)
const NIGHT = `${DAY}T21:00:00+06:00`;            // Isha open, before Tahajjud
const EVENING = `${DAY}T22:00:00+06:00`;          // Qiyam open, before Tahajjud
const LATE_NIGHT = '2026-11-24T02:30:00+06:00';   // Tahajjud time (last third), prayer day still 23 Nov
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('prayer-times-data') || '{}'));
const rec = async (p, d = DAY) => ((await saved(p)).history || {})[d] || {};
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const toSettings = async p => { await click(p, '#settingsToggle'); await sleep(500); };
const openDay = async (p, d = DAY) => { await p.evaluate(x => document.querySelector(`[data-week-date="${x}"]`)?.click(), d); await sleep(700); };
const bodyFont = p => p.evaluate(() => getComputedStyle(document.body).fontFamily);

/* ---------- 1. ONE Font dropdown ---------- */
if (run('1')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 900, at: MID });
  await toSettings(p);
  const ui = await p.evaluate(() => {
    const sel = document.getElementById('uiFontSelect');
    const label = document.querySelector('label[for="uiFontSelect"]')?.textContent.trim();
    return {
      selects: [...document.querySelectorAll('select')].filter(s => /font/i.test(s.id)).map(s => s.id),
      label, en: !!document.getElementById('enFontSelect'),
      groups: [...sel.querySelectorAll('optgroup')].map(g => ({ label: g.label, n: g.querySelectorAll('option').length })),
      top: [...sel.children].filter(c => c.tagName === 'OPTION').map(o => o.value),
      options: [...sel.options].map(o => [o.value, o.textContent]),
      note: document.getElementById('fontNote')?.textContent.trim(), noteVisible: !!document.getElementById('fontNote')?.offsetParent
    };
  });
  ok('1', `${lang}: Settings has ONE font dropdown (no English font picker)`, ui.selects.length === 1 && ui.selects[0] === 'uiFontSelect' && !ui.en && ui.label === (lang === 'bn' ? 'ফন্ট' : 'Font'), JSON.stringify({ selects: ui.selects, label: ui.label }));
  ok('1', `${lang}: it holds System default + 10 English + 10 Bangla fonts, grouped`, ui.options.length === 21 && JSON.stringify(ui.top) === '["system"]' && JSON.stringify(ui.groups) === JSON.stringify(lang === 'bn' ? [{ label: 'ইংরেজি', n: 10 }, { label: 'বাংলা', n: 10 }] : [{ label: 'English', n: 10 }, { label: 'Bangla', n: 10 }]), JSON.stringify(ui.groups));
  const sys = ui.options.find(o => o[0] === 'system')?.[1], kal = ui.options.find(o => o[0] === 'kalpurush')?.[1];
  ok('1', `${lang}: option labels are localised`, lang === 'bn' ? sys === 'সিস্টেম ডিফল্ট' && kal === 'কালপুরুষ · স্পষ্ট লেখা' : sys === 'System default' && kal === 'Kalpurush · clear text', JSON.stringify({ sys, kal }));
  ok('1', `${lang}: the honest note about English fonts and Hind Siliguri is shown`, ui.noteVisible && (lang === 'bn' ? /ইংরেজি ফন্টে বাংলা অক্ষর নেই.*Hind Siliguri/.test(ui.note) : /English fonts have no Bangla letters.*Hind Siliguri/.test(ui.note)), ui.note);
  const card = await p.evaluateHandle(() => document.getElementById('uiFontSelect').closest('section'));
  await card.asElement().screenshot({ path: path.join(SHOTS, `1-font-dropdown-${lang}.png`) });
  // the list itself (a native popup cannot be captured headless, so the same select is shown expanded for the picture only)
  await p.evaluate(() => { const s = document.getElementById('uiFontSelect'); s.size = 24; s.style.height = 'auto'; s.scrollIntoView({ block: 'start' }); });
  await sleep(200);
  await (await p.$('#uiFontSelect')).screenshot({ path: path.join(SHOTS, `1-font-list-expanded-${lang}.png`) });
  await p.evaluate(() => { const s = document.getElementById('uiFontSelect'); s.size = 0; s.style.height = ''; });
  // pick an English font: it draws Latin, Bangla falls back to Hind Siliguri
  await p.select('#uiFontSelect', 'lato'); await sleep(400);
  let ff = await bodyFont(p);
  const bnGlyph = await p.evaluate(async () => { await document.fonts.load('16px "Hind Siliguri"', 'কখগ'); return document.fonts.check('16px "Hind Siliguri"', 'কখগ'); });
  ok('1', `${lang}: Lato chosen -> every text uses Lato first, Bangla glyphs fall back to Hind Siliguri`, /^"?Lato"?, "Hind Siliguri"/.test(ff) && bnGlyph, ff);
  const same = await p.evaluate(() => { const b = getComputedStyle(document.body).fontFamily; return [...document.querySelectorAll('#liveClock, .settings-card h2, .section-heading h2, label')].slice(0, 40).every(e => getComputedStyle(e).fontFamily === b); });
  ok('1', `${lang}: headings, labels and the clock follow the one font`, same);
  await p.select('#uiFontSelect', 'kalpurush'); await sleep(400);
  ff = await bodyFont(p);
  const s1 = await saved(p);
  ok('1', `${lang}: Kalpurush chosen -> Kalpurush draws everything it can (its own Latin), saved as one key`, /^"?Kalpurush"?, "Segoe UI Variable"/.test(ff) && s1.font === 'kalpurush' && !('uiFont' in s1) && !('enFont' in s1), JSON.stringify({ ff, font: s1.font, uiFont: s1.uiFont, enFont: s1.enFont }));
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(700);
  ok('1', `${lang}: the choice survives a reload`, (await p.evaluate(() => document.getElementById('uiFontSelect').value)) === 'kalpurush' && /^"?Kalpurush/.test(await bodyFont(p)));
  noErrors(p, '1', `${lang} settings`);
  await p.close();
  // migration of v3.0.4 settings
  for (const [data, want, why] of [
    [{ uiFont: 'solaiman', enFont: 'lato' }, lang === 'bn' ? 'solaiman' : 'lato', 'Bangla choice in Bangla, English choice in English'],
    [{ uiFont: 'tiro' }, 'tiro', 'English font was System default: the Bangla font that drew the text'],
    [{ uiFont: 'baloo', enFont: 'system' }, 'hind', 'removed Baloo Da 2 -> Hind Siliguri as before'],
    [{ uiFont: 'lohit' }, 'bornomala', 'old Lohit -> Bornomala as before'],
    [{}, 'system', 'nothing saved -> System default']
  ]) {
    const m = await open(b, { lang, w: 1280, h: 720, at: MID, data });
    const got = await m.evaluate(() => ({ value: document.getElementById('uiFontSelect').value, body: getComputedStyle(document.body).fontFamily }));
    await m.evaluate(() => document.getElementById('settingsToggle').click()); await sleep(300);
    await m.select('#uiFontSelect', got.value); await sleep(200); // a save writes the migrated key
    const st = await saved(m);
    ok('1', `${lang}: migrate ${JSON.stringify(data)} -> ${want} (${why})`, got.value === want && st.font === want && !('uiFont' in st) && !('enFont' in st), JSON.stringify({ got, font: st.font }));
    await m.close();
  }
  // backup: an old (v3.0.4) backup and a new one
  const q = await open(b, { lang, w: 1280, h: 900, at: MID });
  await toSettings(q);
  const restore = async data => {
    const f = path.join(os.tmpdir(), `pt305-${lang}-${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify({ version: 1, appVersion: '3.0.4', data }));
    await (await q.$('#importFile')).uploadFile(f); await sleep(400);
    await click(q, '#replaceBackup'); await sleep(700);
    return { st: await saved(q), status: await q.evaluate(() => document.getElementById('backupStatus').textContent) };
  };
  let r = await restore({ language: lang, uiFont: 'tiro', enFont: 'lora', history: { [DAY]: { voluntary: { qiyam: true }, rakahs: { qiyam: 2 }, rakahSets: { qiyam: [true] }, qiyamPart: 'tahajjud' } } });
  ok('1', `${lang}: Replace with a v3.0.4 backup (uiFont tiro, enFont lora) -> font ${lang === 'bn' ? 'tiro' : 'lora'}, nothing reported unknown`, r.st.font === (lang === 'bn' ? 'tiro' : 'lora') && !/Not available/.test(r.status) && !('enFont' in r.st) && !('uiFont' in r.st), JSON.stringify({ font: r.st.font, status: r.status }));
  ok('3', `${lang}: the Qiyam split (qiyamPart) travels in a backup`, r.st.history?.[DAY]?.qiyamPart === 'tahajjud', JSON.stringify(r.st.history?.[DAY]));
  await toSettings(q);
  r = await restore({ language: lang, font: 'nunito' });
  ok('1', `${lang}: Replace with a v3.0.5 backup (font nunito) -> nunito`, r.st.font === 'nunito' && !/Not available/.test(r.status), JSON.stringify({ font: r.st.font, status: r.status }));
  noErrors(q, '1', `${lang} backup`);
  await q.close();
}

/* ---------- 2. tick chronology ---------- */
const partsIn = (p, root, prayer) => p.evaluate((root, prayer) => {
  const card = [...document.querySelectorAll(root)].find(c => c.querySelector(`[data-sub-prayer="${prayer}"]`));
  if (!card) return null;
  return [...card.querySelectorAll(`.prayer-parts [data-sub-prayer="${prayer}"]`)].map(e => ({
    layer: e.dataset.subLayer, key: e.dataset.subKey, label: e.querySelector('span')?.textContent.trim(),
    done: e.classList.contains('done'), disabled: e.disabled, aria: e.getAttribute('aria-disabled'), order: e.dataset.orderLocked === 'true',
    opacity: Number(getComputedStyle(e).opacity)
  }));
}, root, prayer);
const tap = (p, root, prayer, layer, key) => p.evaluate((root, prayer, layer, key) => {
  const card = [...document.querySelectorAll(root)].find(c => c.querySelector(`[data-sub-prayer="${prayer}"]`));
  card?.querySelector(`[data-sub-prayer="${prayer}"][data-sub-layer="${layer}"][data-sub-key="${key}"]`)?.click();
}, root, prayer, layer, key);
const forceTap = (p, root, prayer, layer, key) => p.evaluate((root, prayer, layer, key) => {
  const card = [...document.querySelectorAll(root)].find(c => c.querySelector(`[data-sub-prayer="${prayer}"]`));
  const e = card?.querySelector(`[data-sub-prayer="${prayer}"][data-sub-layer="${layer}"][data-sub-key="${key}"]`);
  if (e) { e.disabled = false; e.click(); }
}, root, prayer, layer, key);

if (run('2')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 900, at: NIGHT });
  const root = '#liveEvents .live-event';
  let parts = await partsIn(p, root, 'isha');
  const before = parts?.[0], fard = parts?.find(x => x.layer === 'fard');
  ok('2', `${lang}: Isha card circles in order: ${parts?.map(x => x.label).join(' | ')}`, parts?.length === 4 && before.layer !== 'fard' && parts[1].layer === 'fard', JSON.stringify(parts));
  ok('2', `${lang}: nothing ticked -> "4 before" is open`, !before.disabled && !before.order, JSON.stringify(before));
  await tap(p, root, 'isha', 'fard', 'isha'); await sleep(400);
  parts = await partsIn(p, root, 'isha');
  ok('2', `${lang}: Fard ticked -> the earlier "4 before" is locked (disabled, aria-disabled, dimmed)`, parts[1].done && parts[0].disabled && parts[0].aria === 'true' && parts[0].order && parts[0].opacity < 1, JSON.stringify(parts[0]));
  ok('2', `${lang}: later circles (2 Sunnah after, 2 Nafl) stay open`, !parts[2].disabled && !parts[3].disabled, JSON.stringify(parts.slice(2)));
  const card = await p.evaluateHandle(() => [...document.querySelectorAll('#liveEvents .live-event')].find(c => c.querySelector('[data-sub-prayer="isha"]')));
  await card.asElement().screenshot({ path: path.join(SHOTS, `2-locked-before-after-fard-${lang}.png`) });
  await forceTap(p, root, 'isha', parts[0].layer, parts[0].key); await sleep(400);
  const pend = await p.evaluate(() => JSON.parse(localStorage.getItem('prayer-times-pending') || '{}'));
  ok('2', `${lang}: even a forced click on the locked circle selects nothing`, !pend.days?.[DAY]?.[parts[0].layer]?.[parts[0].key], JSON.stringify(pend.days?.[DAY]));
  await tap(p, root, 'isha', 'nafl', parts[3].key); await sleep(400);
  parts = await partsIn(p, root, 'isha');
  ok('2', `${lang}: Nafl ticked -> the skipped "2 Sunnah after" before it is locked too`, parts[3].done && parts[2].disabled && parts[2].order, JSON.stringify(parts));
  await tap(p, root, 'isha', 'nafl', parts[3].key); await sleep(300);
  await tap(p, root, 'isha', 'fard', 'isha'); await sleep(400);
  parts = await partsIn(p, root, 'isha');
  ok('2', `${lang}: unticking the later circles unlocks every earlier one`, parts.every(x => !x.disabled && !x.order && !x.done), JSON.stringify(parts));
  // unticking the Fard while a later circle is ticked never strands it
  await tap(p, root, 'isha', 'fard', 'isha'); await sleep(300);
  await tap(p, root, 'isha', 'sunnah', parts[2].key); await sleep(300);
  await tap(p, root, 'isha', 'fard', 'isha'); await sleep(300);
  parts = await partsIn(p, root, 'isha');
  const stuck = parts[2].done && parts[1].disabled;
  await tap(p, root, 'isha', 'sunnah', parts[2].key); await sleep(300);
  parts = await partsIn(p, root, 'isha');
  ok('2', `${lang}: after unticking the Fard, the ticked Sunnah after can still be unticked, then all circles open`, stuck && parts.every(x => !x.done && !x.disabled), JSON.stringify(parts));
  // countdown page card: same rule
  await tap(p, root, 'isha', 'fard', 'isha'); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('#liveEvents .live-event')].find(c => c.querySelector('[data-sub-prayer="isha"]'))?.querySelector('[data-event-countdown]')?.click()); await sleep(800);
  const cd = await partsIn(p, '#countdownView', 'isha');
  ok('2', `${lang}: countdown page shows the same lock ("4 before" locked after Fard)`, !!cd && cd[1].done && cd[0].disabled && cd[0].order, JSON.stringify(cd));
  const cdCard = await p.$('#eventCompletionCard');
  if (cdCard) await cdCard.screenshot({ path: path.join(SHOTS, `2-countdown-page-locked-${lang}.png`) });
  await p.evaluate(() => document.querySelector('#countdownView [data-mark-complete="fard"][data-mark-key="isha"]')?.click()); await sleep(700);
  const r = await rec(p);
  ok('2', `${lang}: Mark Complete still records as before (Isha Fard, 4 before left empty)`, r.fard?.isha === true && !r[parts[0].layer]?.[parts[0].key] && r.closed?.['fard:isha'] === true, JSON.stringify(r));
  noErrors(p, '2', `${lang} night`);
  await p.close();
  // Revise previous prayer card (after Undo): same rule
  const v = await open(b, { lang, w: 1280, h: 900, at: MID, pending: { days: {}, other: {}, reopened: { [`${DAY}|fard|fajr`]: true } } });
  const vroot = '#liveEvents .live-event.late-event';
  await tap(v, vroot, 'fajr', 'fard', 'fajr'); await sleep(400);
  const vp = await partsIn(v, vroot, 'fajr');
  ok('2', `${lang}: Revise previous prayer (Fajr): Fard ticked -> "2 before" locked`, !!vp && vp[1].done && vp[0].disabled && vp[0].order, JSON.stringify(vp));
  noErrors(v, '2', `${lang} revise`);
  await v.close();
  // Friday: Jumu'ah / Dhuhr options are the Fard circle; ticking one locks the empty Sunnah before it
  const f = await open(b, { lang, w: 1280, h: 900, at: '2026-11-27T13:00:00+06:00' });
  let fp = await partsIn(f, root, 'dhuhr');
  const fOpen = !!fp && !fp[0].disabled;
  await tap(f, root, 'dhuhr', 'fard', 'jumuah'); await sleep(400);
  fp = await partsIn(f, root, 'dhuhr');
  const jum = fp?.find(x => x.key === 'jumuah');
  ok('2', `${lang}: Friday: Jumu'ah ticked -> the earlier "4 Sunnah before" is locked`, fOpen && !!jum?.done && fp[0].disabled && fp[0].order && fp[0].aria === 'true', JSON.stringify(fp));
  await tap(f, root, 'dhuhr', 'fard', 'jumuah'); await sleep(400);
  fp = await partsIn(f, root, 'dhuhr');
  ok('2', `${lang}: Friday: unticking Jumu'ah unlocks it`, !!fp && !fp[0].disabled && !fp[0].order, JSON.stringify(fp?.[0]));
  noErrors(f, '2', `${lang} friday`);
  await f.close();
  // already-recorded data loads fine: Fard recorded without its Sunnah before
  const o = await open(b, { lang, w: 1280, h: 900, at: NIGHT, data: { history: { [DAY]: { fard: { fajr: true, dhuhr: true, asr: true, maghrib: true }, sunnah: { dhuhr_after: true }, voluntary: {}, closed: { 'fard:fajr': true, 'fard:dhuhr': true, 'fard:asr': true, 'fard:maghrib': true } } } } });
  const st = await rec(o);
  await openDay(o);
  const recTxt = await o.evaluate(() => document.getElementById('weeklyDayCards')?.innerText || '');
  ok('2', `${lang}: older records load unchanged and the Prayer record lists them`, st.fard?.dhuhr === true && st.sunnah?.dhuhr_after === true && /Dhuhr|যোহর/.test(recTxt), recTxt.slice(0, 160));
  noErrors(o, '2', `${lang} old record`);
  await o.close();
}

/* ---------- 3. Qiyam al-Layl split ---------- */
const qiyamText = p => p.evaluate(() => document.querySelector('#liveEvents [data-vol-count="qiyam"]')?.textContent.trim());
const tile = (p, d = DAY) => p.evaluate(x => document.querySelector(`[data-week-date="${x}"] small`)?.textContent.trim(), d);
const want = (lang, t, ta, w, o) => lang === 'bn'
  ? `কিয়ামুল লাইল ${[t].map(String).map(s => s.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]))[0]} রাকাত: তাহাজ্জুদ ${String(ta).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d])}, বিতর ${String(w).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d])}, অন্যান্য ${String(o).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d])}`
  : `Qiyam al-Layl ${t} rak‘ah${t === 1 ? '' : 's'}: Tahajjud ${ta}, Witr ${w}, other ${o}`;
const witrDone = { [DAY]: { fard: {}, voluntary: { witr: true }, rakahs: { witr: 3 }, rakahSets: { witr: [true, true, false, false, false, false] }, closed: { 'voluntary:witr': true }, at: { 'voluntary:witr': [100, 1300] } } };

if (run('3')) for (const lang of LANGS) {
  const nTxt = n => lang === 'bn' ? String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]) : String(n);
  // before Tahajjud: Qiyam rak'ahs are "other" only
  const p = await open(b, { lang, w: 1280, h: 900, at: EVENING, data: { history: witrDone } });
  const tile0 = await tile(p);
  await click(p, '#liveEvents [data-vol-tick="qiyam"][data-vol-index="0"]'); await sleep(400);
  let t = await qiyamText(p);
  ok('3', `${lang}: 22:00 (before Tahajjud), Qiyam 2 + Witr 3 -> "${want(lang, 5, 0, 3, 2)}"`, t === want(lang, 5, 0, 3, 2), t);
  await click(p, '#liveEvents [data-mark-complete="voluntary"][data-mark-key="qiyam"]'); await sleep(700);
  let r = await rec(p);
  const tile1 = await tile(p);
  ok('3', `${lang}: Mark Complete before Tahajjud saves qiyamPart "other"`, r.voluntary?.qiyam === true && r.rakahs?.qiyam === 2 && r.qiyamPart === 'other', JSON.stringify(r));
  ok('3', `${lang}: weekly stats: Witr already counted Qiyam al-Layl as done (all Witr is Qiyam); "other" Qiyam does not add Tahajjud`, tile0?.endsWith(`${nTxt(2)}/${nTxt(5)}`) && tile1?.endsWith(`${nTxt(2)}/${nTxt(5)}`), JSON.stringify({ tile0, tile1 }));
  await openDay(p);
  let split = await p.evaluate(() => document.querySelector('[data-record-split]')?.textContent.trim());
  ok('3', `${lang}: Prayer record shows the same split (other 2)`, split === want(lang, 5, 0, 3, 2), split);
  noErrors(p, '3', `${lang} evening`);
  await p.close();
  // in Tahajjud time: Qiyam rak'ahs count as Tahajjud
  const q = await open(b, { lang, w: 1280, h: 900, at: LATE_NIGHT, data: { history: witrDone } });
  await click(q, '#liveEvents [data-vol-tick="qiyam"][data-vol-index="0"]'); await sleep(400);
  t = await qiyamText(q);
  ok('3', `${lang}: 02:30 (Tahajjud time), Qiyam 2 + Witr 3 -> "${want(lang, 5, 2, 3, 0)}"`, t === want(lang, 5, 2, 3, 0), t);
  const qcard = await q.evaluateHandle(() => document.querySelector('#liveEvents [data-vol-count="qiyam"]')?.closest('.live-event'));
  if (qcard.asElement()) await qcard.asElement().screenshot({ path: path.join(SHOTS, `3-qiyam-split-tahajjud-time-${lang}.png`) });
  await click(q, '#liveEvents [data-mark-complete="voluntary"][data-mark-key="qiyam"]'); await sleep(700);
  r = await rec(q);
  const tile2 = await tile(q);
  ok('3', `${lang}: Mark Complete in Tahajjud time saves qiyamPart "tahajjud"`, r.voluntary?.qiyam === true && r.rakahs?.qiyam === 2 && r.qiyamPart === 'tahajjud', JSON.stringify(r));
  ok('3', `${lang}: progress/stats: Qiyam in Tahajjud time also counts Tahajjud as done (3/5 voluntary)`, tile2?.endsWith(`${nTxt(3)}/${nTxt(5)}`), tile2);
  const total = await q.evaluate(() => document.getElementById('progressCaption')?.textContent || '');
  ok('3', `${lang}: totals still count each rak'ah once (5, not 7)`, lang === 'bn' ? /ঐচ্ছিক ৫ রাকাত/.test(total) : /Voluntary 5 rak/.test(total), total);
  await openDay(q);
  split = await q.evaluate(() => document.querySelector('[data-record-split]')?.textContent.trim());
  ok('3', `${lang}: Prayer record shows Tahajjud 2, Witr 3, other 0`, split === want(lang, 5, 2, 3, 0), split);
  const rcard = await q.evaluateHandle(() => document.querySelector('[data-record-split]')?.closest('article'));
  if (rcard.asElement()) await rcard.asElement().screenshot({ path: path.join(SHOTS, `3-prayer-record-split-${lang}.png`) });
  // Undo clears the split
  await click(q, '[data-week-undo="voluntary"][data-week-key="qiyam"]'); await sleep(500);
  r = await rec(q);
  ok('3', `${lang}: Undo on the Qiyam record removes it and its split`, !r.voluntary?.qiyam && !('qiyamPart' in r) && !r.rakahs?.qiyam, JSON.stringify(r));
  noErrors(q, '3', `${lang} late night`);
  await q.close();
  // the user's example: Qiyam al-Layl 6 = Tahajjud 2 (Tahajjud card) + Witr 3 + other 1? Qiyam circles are sets of 2, so
  // the closest real case: Tahajjud card 2, Witr 3, Qiyam 2 before Tahajjud -> 7 = 2 + 3 + 2
  const mix = await open(b, { lang, w: 1280, h: 900, at: MID, data: { history: { '2026-11-22': { fard: {}, voluntary: { qiyam: true, tahajjud: true, witr: true }, rakahs: { qiyam: 2, tahajjud: 2, witr: 3 }, qiyamPart: 'other' } } } });
  await openDay(mix, '2026-11-22');
  split = await mix.evaluate(() => document.querySelector('[data-record-split]')?.textContent.trim());
  ok('3', `${lang}: Tahajjud card 2 + Witr 3 + Qiyam 2 before Tahajjud -> "${want(lang, 7, 2, 3, 2)}"`, split === want(lang, 7, 2, 3, 2), split);
  await mix.close();
  // older records (no qiyamPart): their saved time decides; no time keeps "other" as before
  for (const [atv, ta, o, why] of [[[400, 120], 4, 0, 'saved 6h40 after Isha = in Tahajjud time'], [[60, 1200], 0, 4, 'saved 1h after Isha'], [null, 0, 4, 'no saved time']]) {
    const day = { fard: {}, voluntary: { qiyam: true }, rakahs: { qiyam: 4 }, rakahSets: { qiyam: [true, true] } };
    if (atv) day.at = { 'voluntary:qiyam': atv };
    const l = await open(b, { lang, w: 1280, h: 900, at: MID, data: { history: { '2026-11-22': day } } });
    await openDay(l, '2026-11-22');
    split = await l.evaluate(() => document.querySelector('[data-record-split]')?.textContent.trim());
    ok('3', `${lang}: older Qiyam record (${why}) -> Tahajjud ${ta}, other ${o}`, split === want(lang, 4, ta, 0, o), split);
    noErrors(l, '3', `${lang} older record`);
    await l.close();
  }
}

/* ---------- 4. version ---------- */
if (run('4')) for (const lang of LANGS) {
  const p = await open(b, { lang, w: 1280, h: 720, at: MID });
  const v = await p.evaluate(() => document.getElementById('appVersionLabel').textContent.trim());
  ok('4', `${lang}: corner label reads ${lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'}`, v === (lang === 'bn' ? 'v৩.০.৬' : 'v3.0.6'), v); // [v3.0.6] K
  await p.close();
}

console.log(`\n${pass}/${pass + fail} passed`);
fs.writeFileSync(path.join(SHOTS, 'e2e-v305-results.txt'), `${out.join('\n')}\n\n${pass}/${pass + fail} passed\n`);
await b.close();
process.exit(fail ? 1 : 0);
