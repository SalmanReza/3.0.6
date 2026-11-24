import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, sanitizePrefReminders, reminderId, fireTime, pruneSent, supportedKeys, preferredEvents, defaultPrefReminders, reminderText } from '../src/preferred-reminders.js';
import { preferredWindow } from '../src/preferred-times.js';

const day = new Date(2026, 10, 15);
const dayKeyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (h, m = 0) => new Date(2026, 10, 15, h, m);
// Dhuhr 12:00-15:30 (preferred: first 34% => 12:00-13:11:24); Asr 15:30-17:00 (preferred first half)
const events = [
  { key: 'dhuhr', kind: 'fard', date: day, start: at(12), end: at(15, 30) },
  { key: 'asr', kind: 'fard', date: day, start: at(15, 30), end: at(17) },
  { key: 'sunrise-gap', kind: 'x', date: day, start: at(6), end: at(7) }     // no preferred period for this key
];
const cfg = (begin, end) => ({ begin: { enabled: !!begin, minutes: begin || {} }, end: { enabled: !!end, minutes: end || {} } });
const run = (now, config, sent = {}) => dueReminders({ now, events, config, sent, dayKeyOf });

test('unsupported prayer keys never get a reminder or appear in the supported list', () => {
  assert.deepEqual(supportedKeys(events), ['dhuhr', 'asr']);
  assert.equal(preferredEvents(events).length, 2);
});

test('"before preferred time begins" fires N minutes before the preferred start, from the real window', () => {
  const pref = preferredWindow('asr', at(15, 30), at(17), 'hanafi');
  assert.equal(pref.start.getTime(), at(15, 30).getTime());
  const config = cfg({ asr: 15 }, null);
  assert.equal(run(at(15, 14), config).length, 0);
  const due = run(at(15, 16), config);
  assert.equal(due.length, 1);
  assert.equal(due[0].kind, 'begin');
  assert.equal(due[0].id, reminderId('begin', 'asr', '2026-11-15'));
  assert.equal(fireTime('begin', pref, 15), at(15, 15).getTime());
  assert.equal(due[0].minutesLeft, 14);
});

test('"before preferred time ends" is independent of the begin reminder', () => {
  const pref = preferredWindow('asr', at(15, 30), at(17), 'hanafi');   // 15:30 - 16:15
  assert.equal(pref.end.getTime(), at(16, 15).getTime());
  const onlyEnd = cfg(null, { asr: 10 });
  assert.equal(run(at(15, 16), onlyEnd).length, 0, 'begin disabled, end not yet due');
  const due = run(at(16, 6), onlyEnd);
  assert.deepEqual(due.map(d => d.kind), ['end']);
  const onlyBegin = cfg({ asr: 10 }, null);
  assert.equal(run(at(16, 6), onlyBegin).length, 0, 'end reminder disabled');
});

test('master switch off means nothing is due even when minutes are stored', () => {
  const config = { begin: { enabled: false, minutes: { asr: 15 } }, end: { enabled: false, minutes: { asr: 15 } } };
  assert.equal(run(at(15, 20), config).length, 0);
  assert.equal(run(at(16, 8), config).length, 0);
});

test('no duplicates: a sent marker suppresses the reminder, even after a restart that reloads it', () => {
  const config = cfg({ asr: 15 }, null);
  const first = run(at(15, 16), config);
  assert.equal(first.length, 1);
  const sent = { [first[0].id]: at(15, 16).getTime() };
  const restored = JSON.parse(JSON.stringify(sent));          // persisted and reloaded
  assert.equal(run(at(15, 17), config, restored).length, 0);
  assert.equal(run(at(15, 29), config, restored).length, 0);
});

test('a reminder is never delivered late: after the grace window or after the limit nothing fires', () => {
  const config = cfg({ asr: 15 }, null);          // fires 15:15, grace two minutes
  assert.equal(run(at(15, 16), config).length, 1);
  assert.equal(run(at(15, 18), config).length, 0, 'grace window over (the app was asleep)');
  assert.equal(run(at(15, 40), config).length, 0, 'window already started');
});

test('system clock moved forward past the window: no stale notification; moved back: still only once', () => {
  const config = cfg({ asr: 15 }, { asr: 10 });
  assert.equal(run(at(18, 0), config).length, 0);              // jumped forward past both
  const sent = {};
  const a = run(at(15, 16), config); for (const d of a) sent[d.id] = at(15, 16).getTime();
  assert.equal(a.length, 1);
  assert.equal(run(at(15, 15, 30), config, sent).length, 0);   // clock set back a little
  assert.equal(run(at(15, 16), config, sent).length, 0);
});

test('end reminder with a lead longer than the window fires at the window start, not before it', () => {
  const pref = preferredWindow('asr', at(15, 30), at(17), 'hanafi');
  assert.equal(fireTime('end', pref, 120), pref.start.getTime());
});

test('sanitize drops unknown prayers, bad minutes and non-boolean switches', () => {
  const out = sanitizePrefReminders({ begin: { enabled: 'yes', minutes: { asr: '15', dhuhr: 999, zzz: 5 } }, end: { enabled: true, minutes: { asr: 7.5, isha: 3 } } }, ['asr', 'dhuhr', 'isha']);
  assert.deepEqual(out, { begin: { enabled: false, minutes: { asr: 15 } }, end: { enabled: true, minutes: { isha: 3 } } });
  assert.deepEqual(sanitizePrefReminders(null, ['asr']), defaultPrefReminders());
});

test('old sent markers and markers stamped in the future (clock change) are pruned', () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  const sent = { 'pref:begin:asr:old': now - 20 * 86400000, 'pref:end:asr:fut': now + 30 * 86400000, 'pref:end:asr:keep': now - 3600000, 'edge:other': 1 };
  assert.equal(pruneSent(sent, now), true);
  assert.deepEqual(Object.keys(sent).sort(), ['edge:other', 'pref:end:asr:keep']);
});

test('notification text is built in English and Bangla', () => {
  const due = run(at(15, 16), cfg({ asr: 15 }, null))[0];
  const en = reminderText(due, { bn: false, name: 'Asr', time: d => '15:30', num: n => n });
  assert.match(en.title, /Asr: preferred time begins in 14 min/);
  const bn = reminderText(due, { bn: true, name: 'আসর', time: d => '১৫:৩০', num: n => String(n) });
  assert.match(bn.title, /আসর-এর উত্তম সময়/);
});
