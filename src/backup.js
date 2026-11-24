/* JSON backup. Replace swaps the device record. Merge keeps both completions
   and never silently drops a conflicting tick. Unknown fields are reported
   and left out. */

export const KNOWN_STATE_KEYS = Object.freeze([
  'lat', 'lon', 'place', 'theme', 'language', 'sound', 'tickStyle', 'profile', 'clock', 'uiFont',
  'notifications', 'reminders', 'preReminders', 'reminderSent', 'compact', 'startup', 'adjustments',
  'history', 'lockWatermark', 'sections', 'cards', 'recognitionPace', 'showRewardText',
  // v3.0.3: the reading progress-line switch and the Hijri date adjustment travel with the backup
  'blessedProgress', 'hijriAdjust',
  // v3.0.5: one font setting; enFont is still read from v3.0.1–v3.0.4 backups and migrated into font
  'font', 'enFont',
  // v3.0.6: the reader's own read marks for the lunar-year plan, per Hijri year (kept outside the main record)
  'reading'
]);

/* v3.0.3: Hijri date adjustment, whole days from -2 to +2 (default 0). */
export const HIJRI_ADJUST_OPTIONS = Object.freeze([-2, -1, 0, 1, 2]);
export function sanitizeHijriAdjust(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= -2 && n <= 2 ? n : 0;
}
/* Settings for a Replace: values from the backup, defaults for the v3.0.3 ones an older backup lacks. */
export function settingsFromBackup(clean) {
  return {
    blessedProgress: clean.blessedProgress !== false,
    hijriAdjust: sanitizeHijriAdjust(clean.hijriAdjust)
  };
}

export function parseBackup(text) {
  let value;
  try { value = JSON.parse(text); } catch { return { ok: false, error: 'This file is not valid JSON.' }; }
  if (!value || typeof value !== 'object' || !value.data || typeof value.data !== 'object') {
    return { ok: false, error: 'This file is not a Prayer Times backup.' };
  }
  return { ok: true, backup: value };
}

export function splitBackup(data) {
  const source = data && typeof data === 'object' ? data : {};
  const unknown = Object.keys(source).filter(key => !KNOWN_STATE_KEYS.includes(key));
  const clean = {};
  for (const key of KNOWN_STATE_KEYS) if (key in source) clean[key] = source[key];
  return { unknown, clean };
}

function tickMap(record, layer) {
  const map = record && record[layer];
  return map && typeof map === 'object' ? map : {};
}

/** Union of completion ticks. A day/key that is true on one side and false on the other is a conflict; the existing true tick is kept. */
export function mergeHistory(current, incoming) {
  const base = current && typeof current === 'object' ? current : {};
  const extra = incoming && typeof incoming === 'object' ? incoming : {};
  const history = {};
  const conflicts = [];
  const days = new Set([...Object.keys(base), ...Object.keys(extra)]);
  for (const day of days) {
    const left = base[day] && typeof base[day] === 'object' ? base[day] : null;
    const right = extra[day] && typeof extra[day] === 'object' ? extra[day] : null;
    if (!left || !right) { history[day] = left || right; continue; }
    const merged = {
      ...left,
      fard: { ...tickMap(left, 'fard') }, voluntary: { ...tickMap(left, 'voluntary') },
      sunnah: { ...tickMap(left, 'sunnah') }, nafl: { ...tickMap(left, 'nafl') },
      situational: { ...tickMap(left, 'situational') }, situationalSets: { ...(left.situationalSets || {}) }, situationalOccurrences: { ...(left.situationalOccurrences || {}) },
      at: { ...(left.at || {}) }, locked: { ...(left.locked || {}) }, closed: { ...(left.closed || {}) },
      rakahs: { ...(left.rakahs || {}) }, rakahSets: { ...(left.rakahSets || {}) },
      revise: { ...(left.revise || {}) }
    };
    for (const layer of ['fard', 'voluntary', 'sunnah', 'nafl', 'situational']) {
      for (const [key, value] of Object.entries(tickMap(right, layer))) {
        const had = !!merged[layer][key];
        if (had && !value) { conflicts.push({ day, layer, key }); continue; }
        if (value) merged[layer][key] = true;
      }
    }
    for (const [key, value] of Object.entries(right.closed || {})) { if (value === true) merged.closed[key] = true; }
    for (const mapName of ['at', 'locked']) {
      for (const [key, value] of Object.entries(right[mapName] || {})) {
        if (!(key in merged[mapName])) merged[mapName][key] = value;
      }
    }
    for (const [key, value] of Object.entries(right.situationalSets || {})) { merged.situationalSets[key] = Math.max(Number(merged.situationalSets[key] || 0), Number(value || 0)); }
    for (const [key, value] of Object.entries(right.situationalOccurrences || {})) { merged.situationalOccurrences[key] = Math.max(Number(merged.situationalOccurrences[key] || 0), Number(value || 0)); }
    for (const [key, value] of Object.entries(right.rakahs || {})) {
      if (!(key in merged.rakahs)) merged.rakahs[key] = value;
      else if (merged.rakahs[key] !== value) conflicts.push({ day, layer: 'rakahs', key });
    }
    for (const [key, value] of Object.entries(right.rakahSets || {})) {
      if (!(key in merged.rakahSets)) merged.rakahSets[key] = value;
      else if (Array.isArray(value) && Array.isArray(merged.rakahSets[key])) {
        const count = Math.max(value.length, merged.rakahSets[key].length);
        merged.rakahSets[key] = Array.from({ length: count }, (_, i) => !!(value[i] || merged.rakahSets[key][i]));
      }
    }
    for (const [key, value] of Object.entries(right.revise || {})) {
      if (!(key in merged.revise)) merged.revise[key] = value;
      else if (JSON.stringify(merged.revise[key]) !== JSON.stringify(value)) conflicts.push({ day, layer: 'revise', key });
    }
    // v3.0.2: "recorded after its time" marks
    if (left.late || right.late) merged.late = { ...(left.late || {}), ...Object.fromEntries(Object.entries(right.late || {}).filter(([, value]) => value === true)) };
    // v3.0.5: Qiyam al-Layl split travels with the Qiyam record; the existing side wins, as for rak‘ahs
    if (!left.qiyamPart && right.qiyamPart) merged.qiyamPart = right.qiyamPart;
    const extraNafl = Math.max(Math.floor(Number(left.otherNafl) || 0), Math.floor(Number(right.otherNafl) || 0));
    if (extraNafl > 0) merged.otherNafl = extraNafl - (extraNafl % 2);
    history[day] = merged;
  }
  return { history, conflicts };
}

