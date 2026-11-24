/* Voluntary prayer completion ticks (v2.4.0). Ticks fill in order from the left.
   Each ordinary tick is one two-rak‘ah set, at most six ticks (12 rak‘ahs).
   Witr uses odd totals 1, 3, 5, 7, 9, 11; more than 11 (odd) or more than 12
   (even, other prayers) are entered as a number. Data is kept in the existing
   record fields: record.rakahSets[key] (array of booleans) and record.rakahs[key] (total). */
export const MAX_TICKS = 6;
export const MAX_COUNT = 100;
export const TICK_LIMIT = 12;
export const WITR_TICK_LIMIT = 11;

const BN_TO_EN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };

export function tickPlan(key) {
  if (key === 'eid_prayer') return [2];
  if (key === 'witr') return [1, 3, 5, 7, 9, 11];
  if (key === 'awwabin') return [2, 2, 2];
  return [2, 2, 2, 2, 2, 2];
}

/** Circle labels as running totals (v3.0.2): Witr keeps 1, 3, 5, 7, 9, 11; every other
 *  voluntary prayer (Qiyam's own circles too) reads 2, 4, 6, 8, 10, 12. Ticking order and
 *  the saved counts are unchanged; only the label text is cumulative. */
export function tickLabels(key) {
  const plan = tickPlan(key);
  if (key === 'witr') return plan.slice();
  let sum = 0;
  return plan.map(value => (sum += value));
}

/** Qiyam al-Layl is the umbrella of the night: every Tahajjud and Witr rak‘ah is Qiyam al-Layl, but not
 *  every Qiyam rak‘ah is Tahajjud or Witr. v3.0.5: the Qiyam card's own rak‘ahs count as Tahajjud when they
 *  were recorded from Tahajjud start until Fajr (qiyamInTahajjud), otherwise as "other". Stored counts stay
 *  separate, so totals count each rak‘ah once: total = Tahajjud + Witr + other. */
export function qiyamBreakdown(rakahs = {}, { qiyamInTahajjud = false } = {}) {
  const n = key => Math.max(0, Math.floor(Number(rakahs?.[key]) || 0));
  const own = n('qiyam');
  const tahajjud = n('tahajjud') + (qiyamInTahajjud ? own : 0), witr = n('witr'), other = qiyamInTahajjud ? 0 : own;
  return { total: tahajjud + witr + other, tahajjud, witr, other };
}

/** v3.0.5: is an instant inside Tahajjud time (Tahajjud start until Fajr)? Times in ms. */
export function inTahajjudTime(at, tahajjudStart, fajr) {
  return Number.isFinite(at) && Number.isFinite(tahajjudStart) && Number.isFinite(fajr) && at >= tahajjudStart && at < fajr;
}

/** v3.0.5: which part of the night a saved Qiyam record is. A v3.0.5 record stores qiyamPart when Mark
 *  Complete is pressed; an older record falls back to its saved time (record.at['voluntary:qiyam'][0] =
 *  minutes after Qiyam start); a record with neither stays "other", as before. */
export function qiyamRecordInTahajjud(record, { qiyamStart, tahajjudStart, fajr } = {}) {
  if (record?.qiyamPart === 'tahajjud') return true;
  if (record?.qiyamPart === 'other') return false;
  const at = record?.at?.['voluntary:qiyam'];
  const minutes = Array.isArray(at) ? Number(at[0]) : NaN;
  if (!Number.isFinite(minutes) || !Number.isFinite(qiyamStart)) return false;
  return inTahajjudTime(qiyamStart + minutes * 60000, tahajjudStart, fajr);
}

export const allowsExtraInput = key => key !== 'eid_prayer';
export const isWitr = key => key === 'witr';
export const extraMin = key => (key === 'witr' ? 13 : 14);

export function parseRakahInput(raw) {
  return String(raw ?? '').trim().replace(/[০-৯]/g, d => BN_TO_EN[d] || d);
}

export function rakahsFromTicks(key, ticks = []) {
  const plan = tickPlan(key);
  if (key === 'witr') {
    let highest = 0;
    plan.forEach((label, index) => { if (ticks[index]) highest = label; });
    return highest;
  }
  return plan.reduce((sum, value, index) => sum + (ticks[index] ? value : 0), 0);
}

export function normalizeTicks(key, ticks) {
  const plan = tickPlan(key);
  return plan.map((_, index) => !!(Array.isArray(ticks) && ticks[index]));
}

export function lastTickedIndex(ticks = []) {
  let last = -1;
  (Array.isArray(ticks) ? ticks : []).forEach((ticked, index) => { if (ticked) last = index; });
  return last;
}

/** The next empty circle may be ticked; only the last ticked circle may be unticked. */
export function tickAllowed(ticks, index) {
  const list = Array.isArray(ticks) ? ticks : [];
  if (index < 0 || index >= list.length) return false;
  const last = lastTickedIndex(list);
  if (list[index]) return index === last;
  return index === last + 1;
}

export function ticksForTotal(key, total) {
  const plan = tickPlan(key);
  const n = Number(total) || 0;
  if (key === 'witr') {
    if (n <= 0) return plan.map(() => false);
    const idx = plan.indexOf(n);
    if (idx >= 0) return plan.map((_, i) => i <= idx);
    return plan.map(() => true);
  }
  if (n <= 0) return plan.map(() => false);
  const per = plan[0] || 2;
  const count = Math.min(plan.length, Math.floor(n / per));
  return plan.map((_, i) => i < count);
}

function oldWitrTotal(ticks, total) {
  const given = Number(total) || 0;
  if (Array.isArray(ticks) && ticks.length <= 2 && ticks.some(Boolean) && (!given || ticks.length === 2)) {
    const fromOld = (ticks[0] ? 2 : 0) + (ticks[1] ? 1 : 0);
    if (fromOld) return given && given !== fromOld && given % 2 === 1 ? given : fromOld;
  }
  if (given) return given;
  if (Array.isArray(ticks) && ticks.length) return rakahsFromTicks('witr', normalizeTicks('witr', ticks));
  return 0;
}

function toOddWitr(n) {
  if (n <= 0) return 0;
  return n % 2 === 1 ? n : n + 1;
}

/** Pack gaps from the left, keeping the total rak‘ahs. Witr maps a total to the matching odd circle or a custom odd total. */
export function migrateVoluntaryRecord(key, ticks, total) {
  const plan = tickPlan(key);
  if (key === 'witr') {
    let n = toOddWitr(oldWitrTotal(ticks, total));
    if (n <= 0) return { ticks: plan.map(() => false), total: 0 };
    if (n > MAX_COUNT) n = n % 2 === 1 ? MAX_COUNT - (MAX_COUNT % 2 === 0 ? 1 : 0) : MAX_COUNT - 1;
    if (n <= WITR_TICK_LIMIT) return { ticks: ticksForTotal('witr', n), total: n };
    return { ticks: plan.map(() => true), total: n };
  }
  const current = Array.isArray(ticks) ? ticks.map(Boolean) : [];
  const ticked = current.filter(Boolean).length;
  const packed = plan.map((_, i) => i < ticked);
  let tot = Number(total) || 0;
  if (!tot) tot = rakahsFromTicks(key, packed);
  if (tot > TICK_LIMIT) return { ticks: plan.map(() => true), total: tot };
  if (tot > 0) {
    const fromTotal = ticksForTotal(key, tot);
    const fromPacked = rakahsFromTicks(key, packed);
    // Prefer a packed count that already equals the saved total; otherwise rebuild from the total.
    if (fromPacked === tot) return { ticks: packed, total: tot };
    return { ticks: fromTotal, total: tot };
  }
  return { ticks: packed, total: rakahsFromTicks(key, packed) };
}

function nearestPair(key, count) {
  const min = extraMin(key);
  const wantOdd = key === 'witr';
  if (!Number.isInteger(count)) return [];
  if (count < min) return [min];
  if ((count % 2 === 1) === wantOdd) return [count];
  const lo = count - 1;
  const hi = count + 1;
  if (lo >= min) return [lo, hi];
  return [hi];
}

function hintFor(key, error, count, lang) {
  const bn = lang === 'bn';
  const n = v => (bn ? String(v).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]) : String(v));
  const pair = nearestPair(key, count);
  const names = pair.map(n).join(bn ? ' অথবা ' : ' or ');
  if (key === 'witr') {
    if (error === 'min') return bn
      ? `এই ঘর শুধু ১৩ রাকাত বা তার বেশির জন্য। ১১ বা তার কম হলে বৃত্তে টিক দিন।`
      : 'Use this box only for 13 rak‘ahs or more. Tick the totals for 11 or fewer.';
    if (error === 'parity') return bn
      ? `বিতর বিজোড় মোট রাকাতে রেকর্ড হয়। ${names} লিখুন।`
      : `Witr is recorded as an odd total. Try ${names}.`;
  } else {
    if (error === 'min') return bn
      ? `এই ঘর শুধু ১৪ রাকাত বা তার বেশির জন্য। ১২ বা তার কম হলে সেট টিক দিন।`
      : 'Use this box only for 14 rak‘ahs or more. Tick the sets for 12 or fewer.';
    if (error === 'parity') return bn
      ? `নফল নামাজ দুই রাকাতের সেটে পড়া হয়। ${names} লিখুন।`
      : `Voluntary prayers are prayed in sets of two. Try ${names}.`;
  }
  return '';
}

export const EXTRA_ERRORS = Object.freeze({
  empty: ['Enter the number of rak‘ahs.', 'রাকাতের সংখ্যা লিখুন।'],
  whole: ['Use whole numbers only.', 'শুধু পূর্ণসংখ্যা লিখুন।'],
  min: ['Use this box only for more than 12 rak‘ahs. Tick the sets for 12 or fewer.', 'এই ঘর শুধু ১২ রাকাতের বেশির জন্য। ১২ বা তার কম হলে সেট টিক দিন।'],
  even: ['Voluntary prayers are prayed in sets of two. Enter an even number.', 'নফল নামাজ দুই রাকাতের সেটে পড়া হয়। জোড় সংখ্যা লিখুন।'],
  parity: ['Enter a number of the right kind.', 'সঠিক ধরনের সংখ্যা লিখুন।'],
  max: ['The highest count accepted is 100.', 'সর্বোচ্চ ১০০ রাকাত গ্রহণযোগ্য।'],
  'not-allowed': ['This prayer has a fixed number of rak‘ahs.', 'এই নামাজের রাকাত নির্দিষ্ট।']
});

/** Validate the extra-total input. Returns { ok, count, error, hint, nearest }. hint is English; use extraErrorText for a language. */
export function validateExtraRakahs(key, raw) {
  if (!allowsExtraInput(key)) return { ok: false, count: 0, error: 'not-allowed', nearest: [], hint: '' };
  const text = parseRakahInput(raw);
  if (text === '') return { ok: false, count: 0, error: 'empty', nearest: [], hint: '' };
  if (!/^\d+$/.test(text)) return { ok: false, count: 0, error: 'whole', nearest: [], hint: '' };
  const count = Number(text);
  if (count === 0) return { ok: false, count, error: 'whole', nearest: [], hint: '' };
  const min = extraMin(key);
  const wantOdd = key === 'witr';
  if (count > MAX_COUNT) return { ok: false, count, error: 'max', nearest: [], hint: '' };
  if (count < min) {
    const nearest = nearestPair(key, count);
    return { ok: false, count, error: 'min', nearest, hint: hintFor(key, 'min', count, 'en') };
  }
  if ((count % 2 === 1) !== wantOdd) {
    const nearest = nearestPair(key, count);
    return { ok: false, count, error: 'parity', nearest, hint: hintFor(key, 'parity', count, 'en') };
  }
  return { ok: true, count, error: '', nearest: [count], hint: '' };
}

export function extraErrorText(error, lang = 'en', { key, count } = {}) {
  if ((error === 'min' || error === 'parity' || error === 'even') && key) {
    const mapped = error === 'even' ? 'parity' : error;
    const text = hintFor(key, mapped, count, lang);
    if (text) return text;
  }
  const pair = EXTRA_ERRORS[error];
  return pair ? pair[lang === 'bn' ? 1 : 0] : '';
}

/** Apply a tick toggle: returns the new { ticks, total }. Un-ticking after a large count was entered falls back to the ticks. */
export function tickCap(key) {
  return rakahsFromTicks(key, tickPlan(key).map(() => true));
}

export function toggleTick(key, ticks, index, currentTotal) {
  const next = normalizeTicks(key, ticks);
  if (index < 0 || index >= next.length) return { ticks: next, total: rakahsFromTicks(key, next) };
  const cap = tickCap(key);
  const stored = Number(currentTotal);
  // A custom total above the tick cap is cleared first; the last circle stays ticked.
  if (Number.isFinite(stored) && stored > cap && next.every(Boolean) && next[index] && index === lastTickedIndex(next)) {
    return { ticks: next, total: cap };
  }
  if (!tickAllowed(next, index)) return { ticks: next, total: rakahsFromTicks(key, next) };
  next[index] = !next[index];
  return { ticks: next, total: rakahsFromTicks(key, next) };
}

/** A large count fills every tick; the total keeps the entered number. */
export function applyExtra(key, count) {
  return { ticks: tickPlan(key).map(() => true), total: count };
}
