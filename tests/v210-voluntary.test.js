import test from 'node:test';
import assert from 'node:assert/strict';
import { tickPlan, rakahsFromTicks, validateExtraRakahs, toggleTick, applyExtra, allowsExtraInput, MAX_TICKS, normalizeTicks, tickAllowed, migrateVoluntaryRecord } from '../src/voluntary-ticks.js';
import { VOLUNTARY_REWARDS, rewardFor, sanitizeVoluntarySeconds, VOLUNTARY_SECONDS_DEFAULT } from '../src/voluntary-rewards.js';

test('no voluntary event ever has more than six ticks, each worth two rak‘ahs', () => {
  for (const key of ['duha', 'awwabin', 'qiyam', 'tahajjud', 'tarawih', 'eid_prayer', 'witr']) {
    const plan = tickPlan(key);
    assert.ok(plan.length >= 1 && plan.length <= MAX_TICKS, key);
  }
  assert.deepEqual(tickPlan('duha'), [2, 2, 2, 2, 2, 2]);
  assert.equal(rakahsFromTicks('duha', [true, true, true, true, true, true]), 12);
  assert.equal(tickPlan('awwabin').length, 3);
  assert.deepEqual(tickPlan('witr'), [1, 3, 5, 7, 9, 11]);
});

test('toggling ticks fills in order and only the last ticked circle can be unticked', () => {
  let r = toggleTick('qiyam', [], 0); assert.equal(r.total, 2);
  r = toggleTick('qiyam', r.ticks, 1); assert.equal(r.total, 4);
  const skipped = toggleTick('qiyam', r.ticks, 3);
  assert.equal(skipped.total, 4, 'later circles stay locked');
  assert.deepEqual(skipped.ticks, r.ticks);
  const first = toggleTick('qiyam', r.ticks, 0);
  assert.equal(first.total, 4, 'only the last ticked circle can be unticked');
  r = toggleTick('qiyam', r.ticks, 1); assert.equal(r.total, 2);
  const saved = JSON.parse(JSON.stringify(r.ticks));
  assert.deepEqual(normalizeTicks('qiyam', saved), saved);
  assert.equal(r.ticks.length, 6);
  assert.equal(tickAllowed([true, false, false, false, false, false], 0), true);
  assert.equal(tickAllowed([true, false, false, false, false, false], 1), true);
  assert.equal(tickAllowed([true, false, false, false, false, false], 2), false);
});

test('the more-than-12 input is validated', () => {
  assert.equal(validateExtraRakahs('tarawih', '20').ok, true);
  assert.equal(validateExtraRakahs('tarawih', '20').count, 20);
  assert.equal(validateExtraRakahs('qiyam', '14').ok, true);
  assert.equal(validateExtraRakahs('qiyam', '12').error, 'min');
  assert.equal(validateExtraRakahs('qiyam', '15').error, 'parity');
  assert.deepEqual(validateExtraRakahs('qiyam', '15').nearest, [14, 16]);
  assert.equal(validateExtraRakahs('qiyam', '').error, 'empty');
  assert.equal(validateExtraRakahs('qiyam', '1.5').error, 'whole');
  assert.equal(validateExtraRakahs('qiyam', '-4').error, 'whole');
  assert.equal(validateExtraRakahs('qiyam', 'abc').error, 'whole');
  assert.equal(validateExtraRakahs('qiyam', '০').error, 'whole');
  assert.equal(validateExtraRakahs('qiyam', '102').error, 'max');
  assert.equal(validateExtraRakahs('qiyam', '১৪').ok, true);
  assert.equal(validateExtraRakahs('qiyam', '১৪').count, 14);
  assert.equal(validateExtraRakahs('witr', '14').ok, false);
  assert.deepEqual(validateExtraRakahs('witr', '14').nearest, [13, 15]);
  assert.equal(validateExtraRakahs('witr', '13').ok, true);
  assert.equal(validateExtraRakahs('witr', '১৩').ok, true);
  assert.equal(allowsExtraInput('eid_prayer'), false);
  assert.equal(allowsExtraInput('witr'), true);
});

test('a large count fills the ticks and keeps the entered total', () => {
  const r = applyExtra('tarawih', 20);
  assert.equal(r.total, 20);
  assert.ok(r.ticks.every(Boolean));
  assert.equal(r.ticks.length, 6);
});

test('every voluntary prayer has its own reward text with a source, in both languages', () => {
  for (const key of ['duha', 'awwabin', 'qiyam', 'tahajjud', 'tarawih', 'eid_prayer', 'witr', 'other_nafl']) {
    const en = rewardFor(key, 'en'), bn = rewardFor(key, 'bn');
    assert.ok(en.text.length > 20 && en.ref, key);
    assert.ok(/[\u0980-\u09FF]/.test(bn.text) && /[\u0980-\u09FF]/.test(bn.ref), key + ' bn');
    assert.notEqual(en.text, bn.text);
  }
  const texts = new Set(Object.values(VOLUNTARY_REWARDS).map(item => item.en));
  assert.equal(texts.size, Object.keys(VOLUNTARY_REWARDS).length, 'no two prayers share a generic text');
  assert.equal(rewardFor('nope'), null);
});

test('recognition seconds for a voluntary prayer: whole seconds 1-120, otherwise the fallback', () => {
  assert.equal(sanitizeVoluntarySeconds('12'), 12);
  assert.equal(sanitizeVoluntarySeconds('0'), VOLUNTARY_SECONDS_DEFAULT);
  assert.equal(sanitizeVoluntarySeconds('121', 5), 5);
  assert.equal(sanitizeVoluntarySeconds('2.5', 5), 5);
  assert.equal(sanitizeVoluntarySeconds(undefined), VOLUNTARY_SECONDS_DEFAULT);
  assert.equal(sanitizeVoluntarySeconds(30), 30);
});

test('Witr totals and old 2+1 records migrate; gaps pack from the left', () => {
  let r = toggleTick('witr', [], 0); assert.equal(r.total, 1);
  r = toggleTick('witr', r.ticks, 1); assert.equal(r.total, 3);
  r = toggleTick('witr', r.ticks, 2); assert.equal(r.total, 5);
  const skipped = toggleTick('witr', r.ticks, 4);
  assert.equal(skipped.total, 5);
  const migrated = migrateVoluntaryRecord('witr', [true, true], 3);
  assert.deepEqual(migrated.ticks, [true, true, false, false, false, false]);
  assert.equal(migrated.total, 3);
  const fromTwo = migrateVoluntaryRecord('witr', [true, false], 2);
  assert.equal(fromTwo.total, 3);
  const packed = migrateVoluntaryRecord('qiyam', [true, false, true, false, false, false], 4);
  assert.deepEqual(packed.ticks, [true, true, false, false, false, false]);
  assert.equal(packed.total, 4);
  const extra = migrateVoluntaryRecord('qiyam', [true, true, true, true, true, true], 20);
  assert.equal(extra.total, 20);
  assert.ok(extra.ticks.every(Boolean));
});
