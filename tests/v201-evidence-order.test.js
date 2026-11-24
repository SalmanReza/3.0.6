import test from 'node:test';
import assert from 'node:assert/strict';
import { SUNNI_EVIDENCE, JAFARI_EVIDENCE, evidenceFor } from '../src/prayer-evidence.js';

// Section 2 of the v2.0.1 brief: Qur’an → Hadith → other notes, never reversed.
test('evidence is always ordered Qur’an first, then hadith, for both languages and both evidence sets', () => {
  for (const [school, set] of [['hanafi', SUNNI_EVIDENCE], ['jafari', JAFARI_EVIDENCE]]) {
    for (const key of Object.keys(set)) for (const lang of ['en', 'bn']) {
      const kinds = evidenceFor(key, school, lang).items.map(item => item.kind);
      const firstHadith = kinds.indexOf('hadith');
      if (firstHadith >= 0) assert.ok(!kinds.slice(firstHadith).includes('quran'), `${school}/${key}/${lang}: a verse after a hadith`);
    }
  }
});

test('when any Qur’an reference exists for an event it is the first block shown', () => {
  let withVerse = 0;
  for (const [school, set] of [['hanafi', SUNNI_EVIDENCE], ['jafari', JAFARI_EVIDENCE]]) {
    for (const [key, items] of Object.entries(set)) {
      if (!items.some(item => item.kind === 'quran')) continue;
      withVerse++;
      assert.equal(evidenceFor(key, school, 'en').items[0].kind, 'quran', `${school}/${key}`);
      assert.equal(evidenceFor(key, school, 'bn').items[0].kind, 'quran', `${school}/${key} (bn)`);
    }
  }
  assert.ok(withVerse > 25);
});

test('v2.0.1 adds verified verses for events that used to open with a hadith', () => {
  for (const key of ['duha', 'tarawih', 'eid_prayer', 'witr', 'rawatib', 'tahiyyatul_masjid', 'istikhara', 'kusuf', 'khusuf', 'istisqa', 'nafl_mutlaq']) {
    assert.equal(evidenceFor(key, 'hanafi', 'en').items[0].kind, 'quran', key);
  }
});

test('events with no Qur’anic reference fall back to a hadith', () => {
  for (const key of ['wudu_prayer', 'janazah']) assert.equal(evidenceFor(key, 'hanafi', 'en').items[0].kind, 'hadith', key);
});
