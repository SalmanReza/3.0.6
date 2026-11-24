import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION, versionLabel } from '../src/branding.js';
import { fridayFardChoice, fridayFardRakahs, fridayFardOptionLabel, FRIDAY_FARD_OPTIONS, fardPartLabel } from '../src/prayer-layers.js';
import { fardSlotDone } from '../src/weekly-cycle.js';
import { sanitizePrefReminders, minutesFor, dueReminders, fireTime, reminderText, PREF_DEFAULT_MINUTES } from '../src/preferred-reminders.js';
import { preferredWindow } from '../src/preferred-times.js';
import { EN_FONTS, UI_FONTS, sanitizeEnFont, DEFAULT_EN_FONT, combinedFontStack, enFontStack } from '../src/ui-fonts.js';
import { loadQuran, verseAt, verseIndex, verseByIndex } from '../src/quran/load.js';
import { TAGGED_VERSES, TAG_NAMES } from '../src/quran/tags.js';
import { loadReading, chooseReading, presentPassage, BLESSED_TITLE, READING_KEY } from '../src/blessed-reminder.js';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const html = readText('../index.html', import.meta.url);
const css = readText('../src/styles.css', import.meta.url);
const pkg = JSON.parse(readText('../package.json', import.meta.url));

test('version is 3.0.6 everywhere and the label localises digits', () => {
  assert.equal(APP_VERSION, '3.0.6');
  assert.equal(pkg.version, '3.0.6');
  assert.equal(versionLabel('en'), 'v3.0.6');
  assert.equal(versionLabel('bn'), 'v৩.০.৬');
  assert.match(html, /id="appVersionLabel"/);
  assert.match(css, /body \.app-version-label/);
  assert.match(css, /pointer-events:\s*none/);
});

test('the Revise event record tab is gone; old revise flags are still loadable', () => {
  assert.doesNotMatch(html, /id="reviseSection"|Revise event record|reviseRecords/);
  assert.doesNotMatch(app, /function startRevision|function renderRevisions|function confirmRevision/);
  assert.doesNotMatch(app, /delete record\.revise/);
});

test('Friday Jumu’ah and Dhuhr are mutually exclusive options with 2 or 4 rak’ahs', () => {
  assert.deepEqual(FRIDAY_FARD_OPTIONS.map(o => o.key), ['jumuah', 'dhuhr']);
  assert.equal(fridayFardOptionLabel('jumuah', 'en'), '2 Jumu’ah');
  assert.equal(fridayFardOptionLabel('dhuhr', 'bn'), '৪ যোহর');
  const friday = new Date(2026, 10, 20); // Friday
  assert.equal(friday.getDay(), 5);
  assert.equal(fardPartLabel('dhuhr', friday, 'en'), '2 Jumu’ah / 4 Dhuhr');
  assert.equal(fardPartLabel('dhuhr', friday, 'en', 'jumuah'), '2 Jumu’ah');
  assert.equal(fardPartLabel('dhuhr', friday, 'bn', 'dhuhr'), '৪ যোহর');
  const jumuah = { fard: { jumuah: true }, fridayFard: 'jumuah' };
  const dhuhr = { fard: { dhuhr: true }, fridayFard: 'dhuhr' };
  const legacy = { fard: { dhuhr: true } };
  assert.equal(fridayFardChoice(jumuah), 'jumuah');
  assert.equal(fridayFardChoice(dhuhr), 'dhuhr');
  assert.equal(fridayFardChoice(legacy), 'legacy');
  assert.equal(fridayFardRakahs(jumuah), 2);
  assert.equal(fridayFardRakahs(dhuhr), 4);
  assert.equal(fridayFardRakahs(legacy), 2);
  assert.equal(fardSlotDone(jumuah.fard, 'dhuhr', friday), true);
  assert.equal(fardSlotDone(dhuhr.fard, 'dhuhr', friday), true);
  assert.equal(fardSlotDone({}, 'dhuhr', friday), false);
  assert.match(app, /FRIDAY_FARD_OPTIONS\.map/);
  assert.match(app, /applyFridayFard\(record, 'jumuah'\)/);
  assert.doesNotMatch(app, /record\.fard\.jumuah && !record\.fard\.dhuhr\) record\.fard\.dhuhr = true/);
});

test('preferred reminders accept 0 minutes and fire at the edge', () => {
  const at = (h, m = 0) => new Date(2026, 10, 15, h, m);
  const pref = preferredWindow('asr', at(15, 30), at(17), 'hanafi');
  assert.ok(pref);
  assert.equal(fireTime('begin', pref, 0), pref.start.getTime());
  assert.equal(fireTime('end', pref, 0), pref.end.getTime());
  const saved = sanitizePrefReminders({ begin: { enabled: true, minutes: { asr: 0 } }, end: { enabled: true, minutes: { asr: 0 } } }, ['asr']);
  assert.equal(saved.begin.minutes.asr, 0);
  assert.equal(minutesFor(saved, 'begin', 'asr'), 0);
  assert.equal(minutesFor(saved, 'begin', 'isha'), PREF_DEFAULT_MINUTES);
  const events = [{ key: 'asr', date: at(15, 30), start: at(15, 30), end: at(17) }];
  const atBegin = dueReminders({ now: pref.start, events, config: saved, sent: {}, school: 'hanafi', dayKeyOf: () => '2026-11-15' });
  assert.equal(atBegin.length, 1);
  assert.equal(atBegin[0].minutes, 0);
  const en = reminderText(atBegin[0], { bn: false, name: 'Asr', time: d => '15:30', num: n => n });
  assert.match(en.title, /preferred time has begun/);
  const bn = reminderText(atBegin[0], { bn: true, name: 'আসর', time: d => '১৫:৩০', num: n => n });
  assert.match(bn.title, /উত্তম সময় শুরু হয়েছে/);
  const atEnd = dueReminders({ now: pref.end, events, config: saved, sent: {}, school: 'hanafi', dayKeyOf: () => '2026-11-15' });
  assert.equal(atEnd.length, 1);
  assert.match(reminderText(atEnd[0], { bn: false, name: 'Asr', time: () => '16:15', num: n => n }).title, /has ended/);
  const early = dueReminders({ now: new Date(pref.start.getTime() - 60000), events, config: saved, sent: {}, school: 'hanafi', dayKeyOf: () => '2026-11-15' });
  assert.equal(early.length, 0);
});

test('new English and Bangla fonts are bundled offline with licences', () => {
  assert.equal(EN_FONTS[0].id, 'system');
  assert.equal(sanitizeEnFont('inter'), 'inter');
  assert.equal(sanitizeEnFont('Comic Sans'), DEFAULT_EN_FONT);
  assert.match(combinedFontStack('inter', 'kalpurush'), /Inter/);
  assert.match(combinedFontStack('inter', 'kalpurush'), /Kalpurush/);
  assert.equal(enFontStack('system'), '"Segoe UI Variable", "Segoe UI", "Nirmala UI", "Amiri", system-ui, sans-serif');
  const extras = ['kalpurush', 'siyam', 'solaiman', 'bornomala', 'adorsho']; // v3.0.2: Bornomala replaces Lohit Bengali
  for (const id of extras) assert.ok(UI_FONTS.some(f => f.id === id), id);
  const files = [
    'latin/inter-400.woff2', 'latin/manrope-400.woff2', 'latin/outfit-400.woff2', 'latin/plusjakarta-400.woff2', 'latin/fraunces-400.woff2',
    'bn-new/kalpurush.woff2', 'bn-new/siyam-rupali.woff2', 'bn-new/solaimanlipi.woff2', 'bn-new/bornomala.woff2', 'bn-new/adorsholipi.woff2'
  ];
  for (const file of files) {
    const bytes = fs.statSync(new URL(`../src/fonts/${file}`, import.meta.url)).size;
    assert.ok(bytes > 8000, `${file} ${bytes}`);
  }
  assert.match(css, /font-family: "Inter"/);
  assert.match(css, /font-family: "Kalpurush"/);
  assert.match(css, /font-display: swap/);
  // [changed in v3.0.5 1] one Font list replaces the English font + Font pickers
  assert.doesNotMatch(html, /id="enFontSelect"/);
  assert.match(html, /<label for="uiFontSelect">Font<\/label><select id="uiFontSelect"><\/select>/);
  assert.match(html, /id="tickSoundToggle"/);
  assert.doesNotMatch(css, /url\(["']?https?:/);
});

test('ten new themes join the original ten', () => {
  assert.match(app, /\['Desert Night', 'dark'/);
  assert.match(app, /\['Sky Lilac', 'light'/);
  const names = ['Desert Night','Indigo Dusk','Emerald Night','Charcoal Copper','Deep Plum','Sandstone','Pearl Mint','Linen','Dawn Peach','Sky Lilac'];
  for (const name of names) assert.match(app, new RegExp(`\\['${name}', '(dark|light)'`));
  assert.equal([...app.matchAll(/\['[^']+', '(dark|light)', '#[0-9a-fA-F]{6}'/g)].length, 20);
});

test('the bundled Qur’an has 6236 verified verses and a tagged pool', async () => {
  const data = await loadQuran();
  assert.equal(data.count, 6236);
  assert.equal(data.surahs.length, 114);
  assert.equal(data.ar, undefined, 'v3.0.2: no Arabic is bundled');
  assert.equal(data.en.length, 6236);
  assert.equal(data.bn.length, 6236);
  const first = verseAt(data, 1, 1);
  assert.match(first.en, /Allah/i);
  assert.match(first.bn, /আল্লাহ/);
  assert.equal(verseIndex(data, 2, 255), 7 + 254);
  const kursi = verseAt(data, 2, 255);
  assert.match(kursi.en, /Ever-Living|Allah/i);
  assert.equal(verseByIndex(data, 6235).surah, 114);
  assert.equal(verseAt(data, 114, 7), null);
  assert.ok(TAGGED_VERSES.length >= 300);
  for (const item of TAGGED_VERSES) {
    assert.notEqual(verseIndex(data, item.s, item.a), -1, `${item.s}:${item.a}`);
    assert.ok(item.tags.every(tag => TAG_NAMES.includes(tag)));
  }
});

test('A Blessed Reminder (v3.0.2 reading): first passage of the day, persistence and whole verses', async () => {
  const R = await loadReading();
  assert.equal(BLESSED_TITLE.en, 'A Blessed Reminder');
  assert.equal(BLESSED_TITLE.bn, 'একটি বরকতময় স্মরণ');
  const memory = {};
  const storage = { getItem: key => memory[key] || null, setItem: (key, value) => { memory[key] = value; } };
  const first = chooseReading({ P: R.passages, hijri: { year: 1448, month: 1, day: 1 }, monthLength: 30, signature: 'a', now: 0, storage });
  assert.equal(first.index, 0);
  assert.ok(memory[READING_KEY]);
  const held = chooseReading({ P: R.passages, hijri: { year: 1448, month: 1, day: 1 }, monthLength: 30, signature: 'a', now: 1000, storage });
  assert.equal(held.index, first.index);
  const view = presentPassage(R, first.index, 'en');
  assert.match(view.ref, /1:1/);
  assert.ok(view.subject);
});

test('countdown font, clipping fixes, Mark Complete and tick sound are in the source', () => {
  assert.match(css, /body \.countdown-large/);
  assert.match(css, /body \.countdown-large,[^}]*font-family: var\(--app-font\)/s); // v3.0.2 A1: the app font
  assert.match(css, /#eventCompletionCard \.completion-row/);
  assert.match(css, /#countdownView \.event-prayer-card \.ref-card[^}]*overflow:\s*visible/);
  assert.match(app, /data-mark-complete="\$\{countdownState\.kind\}"/);
  assert.match(app, /tickSound: saved\.tickSound !== false/);
  assert.match(app, /if \(!state\.sound \|\| state\.tickSound === false\) return;/);
  assert.match(html, /Tick sound</);
});
