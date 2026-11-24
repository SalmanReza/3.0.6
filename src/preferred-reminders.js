/* Preferred-time reminders (v2.1.0). Two independent reminders per prayer that has a preferred period:
   "before the preferred time begins" and "before the preferred time ends". Everything is computed from the
   preferred windows the app already derives (src/preferred-times.js); no times are hard-coded here.
   Pure functions, no DOM and no clock of their own, so they are tested with mocked time. */
import { preferredWindow } from './preferred-times.js';
import { isReminderDue, parseReminderMinutes, PRE_REMINDER_MAX, REMINDER_GRACE_MS } from './reminder-schedule.js';

export const PREF_KINDS = Object.freeze(['begin', 'end']);
export const PREF_DEFAULT_MINUTES = 10;
export { PRE_REMINDER_MAX };

export const defaultPrefReminders = () => ({
  begin: { enabled: false, minutes: {} },
  end: { enabled: false, minutes: {} }
});

/** Sanitise stored settings (older or hand-edited profiles). Unknown kinds/keys/values are dropped. */
export function sanitizePrefReminders(raw, allowedKeys) {
  const out = defaultPrefReminders();
  if (!raw || typeof raw !== 'object') return out;
  for (const kind of PREF_KINDS) {
    const src = raw[kind];
    if (!src || typeof src !== 'object') continue;
    out[kind].enabled = src.enabled === true;
    const minutes = src.minutes && typeof src.minutes === 'object' ? src.minutes : {};
    for (const key of allowedKeys || Object.keys(minutes)) {
      if (!(key in minutes)) continue;
      const raw = minutes[key];
      if (raw === '' || raw === undefined || raw === null) continue;
      const value = parseReminderMinutes(raw);
      if (value === null) continue;
      out[kind].minutes[key] = value; // 0 is a valid "at the moment it begins/ends"
    }
  }
  return out;
}

export function minutesFor(config, kind, key) {
  const minutes = config?.[kind]?.minutes;
  if (minutes && Object.prototype.hasOwnProperty.call(minutes, key)) {
    const value = Number(minutes[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return PREF_DEFAULT_MINUTES;
}

/** Stable identity of one reminder: kind, prayer and the day it belongs to. A restart, a clock change or a
    re-render can never produce a second notification for the same prayer period. */
export const reminderId = (kind, key, dayKey) => `pref:${kind}:${key}:${dayKey}`;

/** The prayer events that have a preferred period, with that period. `events`: [{ key, date, start, end, eid? }]. */
export function preferredEvents(events, school = 'hanafi') {
  const out = [];
  for (const event of events || []) {
    const pref = preferredWindow(event.key, event.start, event.end, school, {
      friday: event.key === 'dhuhr' && event.date instanceof Date && event.date.getDay() === 5,
      eid: event.eid || ''
    });
    if (pref) out.push({ ...event, pref });
  }
  return out;
}

/** Distinct prayer keys (in first-seen order) that support a preferred period; what the settings tabs list. */
export function supportedKeys(events, school = 'hanafi') {
  const seen = [];
  for (const event of preferredEvents(events, school)) if (!seen.includes(event.key)) seen.push(event.key);
  return seen;
}

/** When a reminder fires. "begin": N minutes before the preferred period starts. "end": N minutes before it ends,
    but never before it has started. */
export function fireTime(kind, pref, minutes) {
  const ms = minutes * 60000;
  if (kind === 'begin') return pref.start.getTime() - ms;
  return Math.max(pref.end.getTime() - ms, pref.start.getTime());
}

/** Reminders due at `now`. `events` come from the app's own schedule (yesterday/today/tomorrow).
    `sent`: map of reminderId -> timestamp. A reminder is due from its fire time until the grace window ends
    (never after the limit: the start for "begin", the end for "end"). */
export function dueReminders({ now, events, config, sent = {}, school = 'hanafi', dayKeyOf, grace = REMINDER_GRACE_MS }) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const out = [];
  if (!Number.isFinite(nowMs)) return out;
  for (const event of preferredEvents(events, school)) {
    for (const kind of PREF_KINDS) {
      const cfg = config?.[kind];
      if (!cfg || cfg.enabled !== true) continue;
      const minutes = cfg.minutes && event.key in cfg.minutes ? Number(cfg.minutes[event.key]) : NaN;
      if (!Number.isFinite(minutes) || minutes < 0) continue;
      const id = reminderId(kind, event.key, dayKeyOf(event.date));
      if (sent[id]) continue;
      const edge = kind === 'begin' ? event.pref.start.getTime() : event.pref.end.getTime();
      const at = fireTime(kind, event.pref, minutes);
      // Offset 0 fires at the edge itself, so the usual "never at or after the edge" limit is relaxed.
      const limit = minutes === 0 ? at + grace : edge;
      if (!isReminderDue(nowMs, at, limit, grace)) continue;
      const minutesLeft = minutes === 0 ? 0 : Math.max(1, Math.ceil((edge - nowMs) / 60000));
      out.push({ id, kind, key: event.key, event, minutes, at, limit, minutesLeft, edge });
    }
  }
  return out;
}

/** Drop sent markers older than `days` (by their own timestamp, and any stamped in the future after a clock change). */
export function pruneSent(sent, nowMs, days = 10) {
  let changed = false;
  for (const [id, stamp] of Object.entries(sent)) {
    if (!id.startsWith('pref:')) continue;
    if (!Number.isFinite(stamp) || stamp < nowMs - days * 86400000 || stamp > nowMs + 2 * 86400000) { delete sent[id]; changed = true; }
  }
  return changed;
}

/** Notification text for a due reminder (the caller supplies localisation helpers). */
export function reminderText(due, { bn, name, time, num }) {
  if (due.minutes === 0 || due.minutesLeft === 0) {
    if (due.kind === 'begin') {
      return {
        title: bn ? `${name}-এর উত্তম সময় শুরু হয়েছে` : `${name} preferred time has begun`,
        body: bn ? `উত্তম সময় এখন চলছে (${time(due.event.pref.start)})।` : `The preferred time begins now (${time(due.event.pref.start)}).`
      };
    }
    return {
      title: bn ? `${name}-এর উত্তম সময় শেষ হয়েছে` : `${name} preferred time has ended`,
      body: bn ? `উত্তম সময় শেষ হয়েছে ${time(due.event.pref.end)}-এ।` : `The preferred time ended at ${time(due.event.pref.end)}.`
    };
  }
  if (due.kind === 'begin') {
    return {
      title: bn ? `${name}-এর উত্তম সময় ${num(due.minutesLeft)} মিনিট পরে শুরু` : `${name}: preferred time begins in ${due.minutesLeft} min`,
      body: bn ? `উত্তম সময় শুরু হবে ${time(due.event.pref.start)}-এ।` : `The preferred time starts at ${time(due.event.pref.start)}.`
    };
  }
  return {
    title: bn ? `${name}-এর উত্তম সময় ${num(due.minutesLeft)} মিনিট পরে শেষ` : `${name}: preferred time ends in ${due.minutesLeft} min`,
    body: bn ? `উত্তম সময় শেষ হবে ${time(due.event.pref.end)}-এ।` : `The preferred time ends at ${time(due.event.pref.end)}.`
  };
}
