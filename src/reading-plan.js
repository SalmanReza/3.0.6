/* v3.0.6 A Blessed Reminder: the lunar-year reading plan and the reader's own read marks.
   D  All 2,739 passages (6,236 verses, Tanzil ruku' sections split at build time; boundaries are
      never changed here) are read in mushaf order over the Hijri year, 1 Muharram to the last day
      of Dhul Hijjah. Day breaks fall only between passages and are placed so that each day's
      verse count is as close as possible to (verses / days in the year), about 17-18 verses or
      7-8 passages a day. Pure function of the passage data and the year length (354 or 355).
   E  A small list of Hijri dates with a well-attested link to a passage. That passage is shown
      first in Today's portion with a one-line note. It does not change the plan, and it shares
      its read mark with the same passage in the plan.
   A/B/C/F  A passage counts as read only when the reader marks it (Mark as read), and Undo read
      clears only that passage. Marks are kept per Hijri year (one bit per passage); earlier
      years stay in the store as history. The reminder's earlier automatic marks (v3.0.2-v3.0.5)
      are cleared once (clearLegacyReading). */
import { passageAtVerse, passageVerses, juzOfVerse, encodeBits, decodeBits, emptyBits, bitGet, READING_KEY } from './blessed-reminder.js';
import { verseIndex, toBn } from './quran/load.js';

export const PLAN_KEY = 'prayer-times-reading-plan';
export const PASSAGE_TOTAL = 2739;

/* ---------- D. plan ---------- */
const planMemo = new Map();
/** Passage index where each day starts: starts[0] = 0, starts[days] = passage count. */
export function planStarts(P, days) {
  const n = P.starts.length;
  const key = `${n}|${P.count}|${days}`;
  if (planMemo.has(key)) return planMemo.get(key);
  const out = [0];
  for (let d = 1; d < days; d++) {
    const target = (d * P.count) / days;
    const lo = out[d - 1] + 1, hi = n - (days - d);
    let best = lo, bestDiff = Infinity;
    for (let b = lo; b <= hi; b++) {
      const diff = Math.abs(P.starts[b] - target);
      if (diff < bestDiff) { best = b; bestDiff = diff; }
      if (P.starts[b] > target) break;
    }
    out.push(best);
  }
  out.push(n);
  planMemo.set(key, out);
  return out;
}
/** Passage range [from, to) for day `dayOfYear` (1-based) of a year with `days` days. */
export function planRange(P, dayOfYear, days) {
  const s = planStarts(P, days);
  const d = Math.max(1, Math.min(days, Math.floor(dayOfYear)));
  return { from: s[d - 1], to: s[d] };
}
export function rangeVerses(P, range) {
  const from = passageVerses(P, range.from).from;
  const to = range.to > range.from ? passageVerses(P, range.to - 1).to : from;
  return to - from;
}
/** Juz' numbers that today's passages belong to (one or two). */
export function planJuz(P, range) {
  if (range.to <= range.from) return [];
  const a = juzOfVerse(P, passageVerses(P, range.from).from), b = juzOfVerse(P, passageVerses(P, range.to - 1).to - 1);
  const out = [];
  for (let j = a; j <= b; j++) out.push(j);
  return out;
}

/* ---------- E. featured passages ---------- */
export const FEATURED = Object.freeze([
  {
    id: 'arafah', month: 12, day: 9, surah: 5, from: 3, to: 3, approximate: false, commonlyHeld: false,
    note: { en: 'Day of Arafah: Al-Ma’idah 5:3 (“This day I have perfected for you your religion”) was revealed on this day.', bn: 'আরাফার দিন: সূরা মায়িদা ৫:৩ (“আজ আমি তোমাদের জন্য তোমাদের দ্বীনকে পূর্ণাঙ্গ করলাম”) এই দিনে নাজিল হয়েছিল।' },
    source: 'Sahih al-Bukhari 45 and Sahih Muslim 3017 (Umar ibn al-Khattab: the verse was revealed at Arafah, on the Day of Arafah).'
  },
  {
    id: 'badr', month: 9, day: 17, surah: 8, from: 41, to: 44, approximate: true, commonlyHeld: false,
    note: { en: 'Battle of Badr (approximate date): Al-Anfal 8:41–44, “the day when the two armies met”.', bn: 'বদর যুদ্ধ (আনুমানিক তারিখ): সূরা আনফাল ৮:৪১–৪৪, “যেদিন দুই দল মুখোমুখি হয়েছিল”।' },
    source: 'Date: Ibn Ishaq, Sirat Rasul Allah (Ibn Hisham’s recension), Friday 17 Ramadan 2 AH; other early reports give the 19th, so it is shown as approximate. Passage: Qur’an 8:41–44.'
  },
  {
    id: 'qadr', month: 9, day: 27, surah: 96, from: 1, to: 5, approximate: false, commonlyHeld: true,
    note: { en: 'Laylat al-Qadr, commonly held to be the 27th night: Al-‘Alaq 96:1–5, the first verses revealed.', bn: 'লাইলাতুল কদর, প্রচলিত মতে ২৭তম রাত: সূরা আলাক ৯৬:১–৫, প্রথম নাজিল হওয়া আয়াত।' },
    source: 'First revelation 96:1–5: Sahih al-Bukhari 3 (Aisha). Revealed in Ramadan on Laylat al-Qadr: Qur’an 2:185 and 97:1. The 27th night: Sahih Muslim 762 (Ubayy ibn Ka‘b); other odd nights of the last ten are also reported, so it is labelled “commonly held”.'
  }
]);
/** Passage indices of a featured entry (the passages that contain its verses). */
export function featuredPassages(P, quran, f) {
  const a = verseIndex(quran, f.surah, f.from), b = verseIndex(quran, f.surah, f.to);
  if (a < 0 || b < 0) return [];
  const out = [];
  for (let i = passageAtVerse(P, a); i <= passageAtVerse(P, b); i++) out.push(i);
  return out;
}
export function featuredFor(hijri) {
  return hijri ? FEATURED.filter(f => f.month === hijri.month && f.day === hijri.day) : [];
}

/** Today's portion: featured passages first (once, and not repeated from the plan), then the plan. */
export function todaysPortion(P, quran, { hijri, dayOfYear, days }) {
  const range = planRange(P, dayOfYear, days);
  const featured = [];
  for (const f of featuredFor(hijri)) for (const i of featuredPassages(P, quran, f)) if (!featured.some(x => x.index === i)) featured.push({ index: i, featured: f });
  const items = featured.filter(x => x.index < range.from || x.index >= range.to);
  for (let i = range.from; i < range.to; i++) items.push({ index: i, featured: featured.find(x => x.index === i)?.featured || null });
  return { range, items, featured: featured.map(x => x.featured).filter((f, k, all) => all.indexOf(f) === k) };
}

/* ---------- read marks (A, B, C, F) ---------- */
export function readStore(storage) {
  try {
    const raw = (storage || globalThis.localStorage)?.getItem(PLAN_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object' && v.years && typeof v.years === 'object') return { v: 1, years: { ...v.years } };
  } catch { /* corrupt: start empty */ }
  return { v: 1, years: {} };
}
export function writeStore(storage, store) {
  try { (storage || globalThis.localStorage)?.setItem(PLAN_KEY, JSON.stringify(store)); } catch { /* quota */ }
}
/** C: the reminder's old automatic read counts are removed once. Returns true when something was cleared. */
export function clearLegacyReading(storage) {
  try {
    const s = storage || globalThis.localStorage;
    if (s?.getItem(READING_KEY) == null) return false;
    s.removeItem(READING_KEY);
    return true;
  } catch { return false; }
}
function yearBits(store, year) { return decodeBits(store.years[String(year)] || '', PASSAGE_TOTAL); }
export function isRead(store, year, i) { return bitGet(yearBits(store, year), i); }
export function setRead(storage, year, i, read) {
  if (!Number.isInteger(i) || i < 0 || i >= PASSAGE_TOTAL || !Number.isInteger(Number(year))) return false;
  const store = readStore(storage);
  const bits = yearBits(store, year);
  if (read) bits[i >> 3] |= 1 << (i & 7); else bits[i >> 3] &= ~(1 << (i & 7));
  store.years[String(year)] = encodeBits(bits);
  writeStore(storage, store);
  return true;
}
export function readCount(store, year, indices) {
  const bits = yearBits(store, year);
  let c = 0;
  for (const i of indices) if (bitGet(bits, i)) c++;
  return c;
}
export function yearReadCount(store, year) {
  const bits = yearBits(store, year);
  let c = 0;
  for (let i = 0; i < PASSAGE_TOTAL; i++) if (bitGet(bits, i)) c++;
  return c;
}
/** F: unread passages planned before today in this Hijri year, oldest first. */
export function behindList(P, store, { year, dayOfYear, days }) {
  const from = planRange(P, dayOfYear, days).from;
  const bits = yearBits(store, year);
  const out = [];
  for (let i = 0; i < from; i++) if (!bitGet(bits, i)) out.push(i);
  return out;
}
export function storedYears(store) { return Object.keys(store.years).filter(y => /^\d+$/.test(y)).map(Number).sort((a, b) => b - a); }
/** Backup: years -> base64 bits. Merge keeps a passage read if either side has it read. */
export function sanitizeReadingBackup(value) {
  const out = {};
  if (!value || typeof value !== 'object' || !value.years || typeof value.years !== 'object') return null;
  for (const [y, b] of Object.entries(value.years)) if (/^\d{3,4}$/.test(y) && typeof b === 'string' && b.length <= 1024 && /^[A-Za-z0-9+/=]*$/.test(b)) out[y] = encodeBits(decodeBits(b, PASSAGE_TOTAL));
  return { v: 1, years: out };
}
export function mergeReading(a, b) {
  const out = { v: 1, years: { ...(a?.years || {}) } };
  for (const [y, bits] of Object.entries(b?.years || {})) {
    const x = decodeBits(out.years[y] || '', PASSAGE_TOTAL), z = decodeBits(bits, PASSAGE_TOTAL);
    for (let i = 0; i < x.length; i++) x[i] |= z[i];
    out.years[y] = encodeBits(x);
  }
  return out;
}
export { emptyBits };

/* ---------- text (EN / BN) ---------- */
export const PLAN_TEXT = Object.freeze({
  markRead: { en: 'Mark as read', bn: 'পড়েছি' },
  undoRead: { en: 'Undo read', bn: 'পড়া চিহ্ন সরান' },
  readDone: { en: 'Read ✓', bn: 'পড়া হয়েছে ✓' },
  allRead: { en: "Today's portion read ✓", bn: 'আজকের অংশ পড়া শেষ ✓' },
  behindBack: { en: "Back to today's portion", bn: 'আজকের অংশে ফিরুন' },
  behindTitle: { en: 'Earlier unread passages', bn: 'আগের না-পড়া অংশ' }
});
const num = (n, lang) => (lang === 'bn' ? toBn(n) : String(n));
const group = (n, lang) => { const s = Number(n).toLocaleString('en-US'); return lang === 'bn' ? toBn(s) : s; };
/** C: "Juz' 7 · 3 of 8 passages read today" (M counts the featured passages too). */
export function planProgressLine({ juz, read, total }, lang = 'en') {
  const j = juz.map(x => num(x, lang)).join('–');
  if (lang === 'bn') return `পারা ${j} · আজ ${num(total, 'bn')}টি অংশের ${num(read, 'bn')}টি পড়া হয়েছে`;
  return `Juz' ${j} · ${read} of ${total} passages read today`;
}
export function behindLine(x, lang = 'en') {
  return lang === 'bn' ? `এ বছর ${num(x, 'bn')}টি অংশ পিছিয়ে` : `${x} passage${x === 1 ? '' : 's'} behind this year`;
}
export function yearLine(year, read, lang = 'en') {
  return lang === 'bn'
    ? `${num(year, 'bn')} হিজরি: ${group(PASSAGE_TOTAL, 'bn')}টি অংশের ${group(read, 'bn')}টি পড়া হয়েছে`
    : `${year} AH: ${group(read, 'en')} of ${group(PASSAGE_TOTAL, 'en')} passages read`;
}
