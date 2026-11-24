/* A Blessed Reminder (v3.0.2).
   The Qur'an is read one juz' per Hijri day, in passages that were split at
   build time (scripts/build-passages.mjs from the 556 Tanzil ruku' sections;
   CC BY 3.0). The app only looks passages up; it never splits text at run time.
   - Day d of the Hijri month reads juz' d. In a 29-day month day 29 reads
     juz' 29 and 30 together; when day 30 exists it reads juz' 30.
   - Inside the day's portion the reminder reads in order and moves to the next
     unread passage every 10 minutes and whenever the progress signature changes.
   - Moments (gratitude after a tick or when all five Fard are done, friday in
     the Jumu'ah window, dawn in the first 30 minutes of Fajr) pick an unread
     passage of the day's juz' with that theme, the 405 tagged verses first.
   - Read passages are kept as a per-day bitset keyed by the Hijri date, so a
     passage never repeats in a day. Translation only (no Arabic). */

import { loadQuran, quranLoaded, verseByIndex, refLabel, toBn } from './quran/load.js';
import { TAGGED_VERSES } from './quran/tags.js';

export const BLESSED_TITLE = { en: 'A Blessed Reminder', bn: 'একটি বরকতময় স্মরণ' };
export const READ_MORE = { en: 'Read more', bn: 'আরও পড়ুন' };
export const READ_LESS = { en: 'Show less', bn: 'সংক্ষেপে দেখুন' };
export const FULL_SECTION = { en: 'Full section', bn: 'পুরো অংশ' };
export const TODAYS_PORTION = { en: "Today's portion", bn: 'আজকের অংশ' };
export const READING_KEY = 'prayer-times-blessed-reading';
export const LONG_TR_CHARS = 320;
/* v3.0.3: the 232 verses whose English text is over 350 characters (2:282 is the longest)
   open as a short preview; Read more shows the whole verse. The data is never cut: the
   preview is display only and ends at a word boundary with an ellipsis. */
export const LONG_VERSE_CHARS = 350;
export const PREVIEW_CHARS = 220;
export function isLongVerse(quran, i) { return String(verseByIndex(quran, i).en || '').length > LONG_VERSE_CHARS; }
export function previewText(text, max = PREVIEW_CHARS) {
  const t = String(text || '');
  if (t.length <= max) return t;
  let cut = t.lastIndexOf(' ', max);
  if (cut < max * 0.6) cut = max;
  return `${t.slice(0, cut).replace(/[\s,;:–—-]+$/, '')}…`;
}
export const ADVANCE_MS = 10 * 60 * 1000;
export const THEMES = Object.freeze(['gratitude', 'friday', 'dawn', 'night', 'prayer', 'mercy', 'patience', 'hereafter', 'creation', 'prophets', 'law']);

/* ---------- data loading (passages + section subjects) ---------- */
let passCache = null;
let sectCache = null;
let pending = null;
async function readJson(name) {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return JSON.parse(readFileSync(fileURLToPath(new URL(`./quran/${name}`, import.meta.url)), 'utf8'));
  }
  const mod = name === 'passages.json' ? await import('./quran/passages.json') : await import('./quran/sections.json');
  return mod.default || mod;
}
export async function loadReading() {
  if (passCache && sectCache && quranLoaded()) return { quran: quranLoaded(), passages: passCache, sections: sectCache };
  if (!pending) {
    pending = Promise.all([loadQuran(), readJson('passages.json'), readJson('sections.json')]).then(([quran, p, s]) => {
      passCache = p; sectCache = s;
      return { quran, passages: p, sections: s };
    });
  }
  return pending;
}
export function readingLoaded() {
  return passCache && sectCache && quranLoaded() ? { quran: quranLoaded(), passages: passCache, sections: sectCache } : null;
}
export { loadQuran };

/* ---------- lookups ---------- */
function upperBound(list, value) { // last index with list[i] <= value
  let lo = 0, hi = list.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (list[mid] <= value) lo = mid; else hi = mid - 1; }
  return lo;
}
export function passageVerses(P, i) {
  const from = P.starts[i];
  const to = (i + 1 < P.starts.length ? P.starts[i + 1] : P.count);
  return { from, to };
}
export function passageAtVerse(P, verse) { return upperBound(P.starts, verse); }
export function sectionOfVerse(P, verse) { return upperBound(P.sections, verse); }
export function sectionVerses(P, k) { return { from: P.sections[k], to: k + 1 < P.sections.length ? P.sections[k + 1] : P.count }; }
export function juzOfVerse(P, verse) { return upperBound(P.juz, verse) + 1; }
export function hasTheme(P, i, theme) { return !!(P.pt[i] & (1 << P.themes.indexOf(theme))); }
export function hasTagged(P, i, theme) { return !!(P.tg[i] & (1 << P.themes.indexOf(theme))); }

/** Juz' numbers read on Hijri day `day` of a month with `monthLength` days. */
export function juzForDay(day, monthLength = 30) {
  const d = Math.max(1, Math.min(30, Math.floor(Number(day) || 1)));
  if (d === 29 && Number(monthLength) === 29) return [29, 30];
  return [d];
}
/** Passage index range [from, to) covering the given consecutive juz'. */
export function dayRange(P, juzList) {
  const first = juzList[0], last = juzList[juzList.length - 1];
  const fromVerse = P.juz[first - 1];
  const toVerse = last < P.juz.length ? P.juz[last] : P.count;
  return { from: passageAtVerse(P, fromVerse), to: toVerse >= P.count ? P.starts.length : passageAtVerse(P, toVerse) };
}

/* ---------- compact per-day read bitset ---------- */
export function hijriKey(h) { return `${h.year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`; }
export function emptyBits(n) { return new Uint8Array(Math.ceil(n / 8)); }
export function bitGet(bits, i) { return !!(bits[i >> 3] & (1 << (i & 7))); }
export function bitSet(bits, i) { bits[i >> 3] |= 1 << (i & 7); }
export function bitCount(bits, n) { let c = 0; for (let i = 0; i < n; i++) if (bitGet(bits, i)) c++; return c; }
export function encodeBits(bits) {
  let s = '';
  for (const b of bits) s += String.fromCharCode(b);
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
}
export function decodeBits(text, n) {
  const out = emptyBits(n);
  try {
    const s = typeof atob === 'function' ? atob(String(text || '')) : Buffer.from(String(text || ''), 'base64').toString('binary');
    for (let i = 0; i < out.length && i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  } catch { /* corrupt: start the day fresh */ }
  return out;
}

export function readReading(storage) {
  try {
    const raw = (storage || globalThis.localStorage)?.getItem(READING_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}
export function writeReading(storage, memory) {
  try { (storage || globalThis.localStorage)?.setItem(READING_KEY, JSON.stringify(memory)); }
  catch { /* quota / private mode */ }
}

/** Which moment applies right now, if any. */
export function momentTheme({ justTicked = false, allFardJustDone = false, jumuahWindow = false, fajrFirst30 = false } = {}) {
  if (justTicked || allFardJustDone) return 'gratitude';
  if (jumuahWindow) return 'friday';
  if (fajrFirst30) return 'dawn';
  return null;
}

function nextInOrder(range, bits, after) {
  const n = range.to - range.from;
  for (let k = 1; k <= n; k++) {
    const i = range.from + (((after == null ? -1 : after - range.from) + k) % n + n) % n;
    if (!bitGet(bits, i - range.from)) return i;
  }
  return null;
}
function themedUnread(P, range, bits, theme, after) {
  let tagged = null, plain = null;
  const n = range.to - range.from;
  for (let k = 1; k <= n; k++) {
    const i = range.from + (((after == null ? -1 : after - range.from) + k) % n + n) % n;
    if (bitGet(bits, i - range.from)) continue;
    if (tagged == null && hasTagged(P, i, theme)) { tagged = i; break; }
    if (plain == null && hasTheme(P, i, theme)) plain = i;
  }
  return tagged ?? plain;
}

/**
 * Choose the passage to show now and update the stored reading state.
 * @param {object} o
 * @param {{year,month,day}} o.hijri  the app's Hijri date (changes at Maghrib)
 * @param {number} o.monthLength       29 or 30
 * @param {string} o.signature         progress-line signature (advance on change)
 * @param {string|null} o.moment       'gratitude' | 'friday' | 'dawn' | null
 * @param {number} o.now               ms
 */
export function chooseReading({ P, hijri, monthLength = 30, signature = '', moment = null, now = Date.now(), storage } = {}) {
  if (!P || !hijri) return null;
  const juz = juzForDay(hijri.day, monthLength);
  const range = dayRange(P, juz);
  const n = range.to - range.from;
  const key = hijriKey(hijri);
  const monthKey = `${hijri.year}-${String(hijri.month).padStart(2, '0')}`;
  const mem = readReading(storage);
  let changed = false;
  if (mem.day !== key || mem.n !== n || mem.from !== range.from) {
    mem.day = key; mem.from = range.from; mem.n = n; mem.bits = encodeBits(emptyBits(n));
    mem.current = null; mem.shownAt = 0; mem.sig = ''; mem.moment = null; changed = true;
  }
  if (mem.month !== monthKey) { mem.month = monthKey; mem.parts = []; changed = true; }
  if (!Array.isArray(mem.parts)) mem.parts = [];
  const bits = decodeBits(mem.bits, n);
  const current = Number.isInteger(mem.current) && mem.current >= range.from && mem.current < range.to ? mem.current : null;
  const sigChanged = !!signature && !!mem.sig && signature !== mem.sig;
  const timeUp = current != null && now - (Number(mem.shownAt) || 0) >= ADVANCE_MS;
  const momentNew = !!moment && moment !== mem.moment;
  let pick = current;
  let mode = 'order';
  if (current == null || sigChanged || timeUp || momentNew) {
    let themed = null;
    if (moment) themed = themedUnread(P, range, bits, moment, null);
    if (themed != null) { pick = themed; mode = 'moment'; }
    else pick = nextInOrder(range, bits, null) ?? current ?? range.from; // the earliest unread: order resumes after a moment
    if (pick !== current) { mem.current = pick; mem.shownAt = now; changed = true; }
    else if (timeUp) { mem.shownAt = now; changed = true; }
  }
  if (signature !== mem.sig) { mem.sig = signature; changed = true; }
  if ((moment || null) !== (mem.moment || null)) { mem.moment = moment || null; changed = true; }
  if (pick != null && !bitGet(bits, pick - range.from)) { bitSet(bits, pick - range.from); changed = true; }
  mem.bits = encodeBits(bits);
  const read = bitCount(bits, n);
  changed = updateMonthParts(mem, P, juz, range, bits) || changed;
  if (changed) writeReading(storage, mem);
  return { index: pick, juz, range, read, total: n, mode, moment: mode === 'moment' ? moment : null, monthParts: mem.parts.length, key };
}

function updateMonthParts(mem, P, juz, range, bits) {
  let changed = false;
  for (const j of juz) {
    const r = dayRange(P, [j]);
    let all = true;
    for (let i = r.from; i < r.to; i++) if (!bitGet(bits, i - range.from)) { all = false; break; }
    if (all && !mem.parts.includes(j)) { mem.parts.push(j); changed = true; }
  }
  return changed;
}

/** Mark one passage of today's portion as read (Today's portion list). */
export function markRead({ P, hijri, monthLength = 30, index, storage }) {
  const range = dayRange(P, juzForDay(hijri.day, monthLength));
  const n = range.to - range.from;
  const mem = readReading(storage);
  if (mem.day !== hijriKey(hijri) || mem.n !== n || mem.from !== range.from) return false;
  if (index < range.from || index >= range.to) return false;
  const bits = decodeBits(mem.bits, n);
  bitSet(bits, index - range.from);
  mem.bits = encodeBits(bits);
  if (!Array.isArray(mem.parts)) mem.parts = [];
  updateMonthParts(mem, P, juzForDay(hijri.day, monthLength), range, bits);
  writeReading(storage, mem);
  return true;
}
export function readBitsFor({ P, hijri, monthLength = 30, storage }) {
  const range = dayRange(P, juzForDay(hijri.day, monthLength));
  const n = range.to - range.from;
  const mem = readReading(storage);
  const bits = mem.day === hijriKey(hijri) && mem.n === n && mem.from === range.from ? decodeBits(mem.bits, n) : emptyBits(n);
  return { range, bits, read: bitCount(bits, n), total: n, monthParts: mem.month === `${hijri.year}-${String(hijri.month).padStart(2, '0')}` && Array.isArray(mem.parts) ? mem.parts.length : 0 };
}

/* ---------- presentation (translation only) ---------- */
function versesText(quran, from, to, lang) {
  const out = [];
  for (let i = from; i < to; i++) {
    const v = verseByIndex(quran, i);
    out.push({ ayah: v.ayah, surah: v.surah, index: i, text: lang === 'bn' ? v.bn : v.en, long: String(v.en || '').length > LONG_VERSE_CHARS });
  }
  return out;
}
export function rangeRef(quran, from, to, lang = 'en') {
  const a = verseByIndex(quran, from), b = verseByIndex(quran, to - 1);
  const d = x => lang === 'bn' ? toBn(x) : String(x);
  const name = lang === 'bn' ? a.surahBn : a.surahEn;
  if (a.ayah === b.ayah) return `${name} ${d(a.surah)}:${d(a.ayah)}`;
  return `${name} ${d(a.surah)}:${d(a.ayah)}–${d(b.ayah)}`;
}
/**
 * The passage as shown: subject, verses (whole verses only), ref.
 * When `expanded` is false and the passage is long, only whole leading
 * verses that fit are shown (at least one whole verse) and Read more shows
 * the rest. A verse is never cut, so a long single verse is shown whole.
 */
export function presentPassage(R, index, lang = 'en', { expanded = false, full = false } = {}) {
  const { quran, passages: P, sections: S } = R;
  const span = passageVerses(P, index);
  const k = sectionOfVerse(P, span.from);
  const sec = sectionVerses(P, k);
  const { from, to } = full ? sec : span;
  const verses = versesText(quran, from, to, lang);
  const chars = verses.reduce((sum, v) => sum + v.text.length, 0);
  const long = !full && chars > LONG_TR_CHARS;
  let shown = verses;
  if (long && !expanded) {
    shown = [verses[0]];
    let used = verses[0].text.length;
    for (let i = 1; i < verses.length && used + verses[i].text.length <= LONG_TR_CHARS; i++) { shown.push(verses[i]); used += verses[i].text.length; }
  }
  // a long verse (over 350 characters in English) opens as a preview until Read more
  let previewed = false;
  if (!full && !expanded) {
    shown = shown.map(v => {
      if (!v.long) return v;
      previewed = true;
      return { ...v, text: previewText(v.text), preview: true };
    });
  }
  return {
    index, section: k,
    subject: lang === 'bn' ? S.bn[k] : S.en[k],
    verses: shown,
    allVerses: verses,
    truncated: shown.length < verses.length || previewed, // the data is never cut; a preview is display only
    previewed,
    long, expanded, full,
    ref: rangeRef(quran, from, to, lang),
    sectionRef: rangeRef(quran, sec.from, sec.to, lang),
    sectionIsPassage: sec.from === span.from && sec.to === span.to,
    juz: juzOfVerse(P, span.from)
  };
}

export function progressLine({ juz, read, total }, lang = 'en') {
  const j = juz.join('–');
  if (lang === 'bn') return `পারা ${toBn(j)} · আজ ${toBn(total)}টি অংশের ${toBn(read)}টি পড়া হয়েছে`;
  return `Juz' ${j} · ${read} of ${total} passages read today`;
}
export function monthLine(parts, lang = 'en') {
  return lang === 'bn' ? `এই মাসে: ৩০ পারার ${toBn(parts)}টি` : `This month: ${parts} of 30 parts`;
}

export { refLabel, TAGGED_VERSES };
