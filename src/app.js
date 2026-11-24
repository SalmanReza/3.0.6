import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TrayIcon } from '@tauri-apps/api/tray';
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from '@tauri-apps/plugin-autostart';
import { calculatePrayerTimes, dateKey, jafariMidnight, CALCULATION_METHODS, SCHOOLS, HIGH_LATITUDE_RULES, DEFAULT_PROFILE, sanitizeProfile, presetForSchool, isShiaProfile } from './prayer-engine.js';
import { parseCoordinates, isGoogleMapsUrl } from './location.js';
import { PRAYER_GUIDANCE } from './islamic-content.js';
import { weekStart, sevenCycleDates, weeklyFardTally, isFridayDhuhr, fardSlotDone, FRIDAY_DHUHR_LABEL, WEEK_DAY_LABELS, FRIDAY } from './weekly-cycle.js';
import { shortcutFor, pageScrollDistance, carouselArrowDelta } from './keyboard.js';
import { figureSvg, figureChanges, progressSummary } from './progress-figure.js';
import { slotLabel, slotShortLabel, fardPartLabel, prayerParts, FARD_RAKAHS, findSlot, layerState, splitVoluntary, isSeasonal, FRIDAY_FARD_OPTIONS, fridayFardOptionLabel, fridayFardChoice, fridayFardRakahs } from './prayer-layers.js';
import { counterLabel, showsControls, stepIndex, reconcileIndex, wrapIndex } from './carousel.js';
import { playCues, soundCues, sanitizeTickStyle, DEFAULT_TICK_STYLE } from './sound.js';
import { trayTooltipText } from './tray-tooltip.js';
import { PROHIBITED_LABELS } from './forbidden-times.js';
import { parseReminderMinutes, sanitizeReminderMap, isReminderDue, preReminderFireAt, PRE_REMINDER_MAX } from './reminder-schedule.js';
import { APP_VERSION, copyrightText, versionLabel, BRAND_MARK_SVG } from './branding.js';
import { FONT_GROUPS, DEFAULT_FONT, sanitizeFont, migrateFont, fontStack, fontLabel } from './ui-fonts.js';
import { dayStatus } from './day-status.js';
import { loadReading, readingLoaded, presentPassage, momentTheme, hasTheme, hasTagged, BLESSED_TITLE, READ_MORE, READ_LESS, FULL_SECTION, TODAYS_PORTION } from './blessed-reminder.js';
import { progressLine, recentIdsWithin, VOLUNTARY_HEADS_UP_MINUTES } from './progress-lines.js';
import { analyzeHabits, pickSuggestion, addDaysKey } from './habits.js';
import { lockInstant, dayIsLocked, nextWatermark, sealRecord, lockKey, lockTip } from './tick-lock.js';
import { recordingOpen, partRecordable, orderLocks } from './recording-window.js';
import { phraseLines, dayVerseLines, highestKind, rewardSeconds, verseSeconds } from './recognition.js';
import { twoPrecedingFard, recoveryEligible, recoverableFards, RECOVERY_CONFIRM } from './recovery.js';
import { parseBackup, splitBackup, mergeHistory, sanitizeHijriAdjust, settingsFromBackup, HIJRI_ADJUST_OPTIONS } from './backup.js';
import { nextEclipse } from './eclipse.js';
import { AV, defsMarkup, materMarkup, plateMarkup, reteMarkup, ruleMarkup, sunMarkup, moonMarkup, pivotMarkup, overlayMarkup, detailMarkup, reteDetailMarkup, starLabelList, starLabelsMarkup } from './astrolabe-view.js';
import { DialPhysics } from './dial-physics.js';
import { clockDefs, clockDialMarkup, clockHandsMarkup, clockCapMarkup, clockGlassMarkup, clockDigits, placeNumeral } from './clock-dial.js';
import { sanitizePrefReminders, defaultPrefReminders, dueReminders, pruneSent, reminderText, supportedKeys, PREF_DEFAULT_MINUTES } from './preferred-reminders.js';
import { tickPlan, validateExtraRakahs, toggleTick, applyExtra, allowsExtraInput, normalizeTicks, TICK_LIMIT, tickAllowed, extraErrorText as extraErrorMessage, isWitr, tickLabels, qiyamBreakdown, inTahajjudTime, qiyamRecordInTahajjud } from './voluntary-ticks.js';
import { sanitizeVoluntarySeconds, VOLUNTARY_SECONDS_DEFAULT } from './voluntary-rewards.js';
import { migrateHistory } from './history-migrate.js';
import { sunPosition as approxSunPosition, moonPosition as approxMoonPosition, moonPhase as approxMoonPhase, phaseName, moonPass as approxMoonPass, sunIntensity, moonLitPath } from './sky.js';
import { loadBundledKernel, ephemerisReady, preciseSunPosition, preciseMoonPosition, preciseMoonPhase, preciseMoonPass, crescentHijriOfDay, crescentMonthLength, dayNumberOfLocalDate } from './moon-engine.js';
import tzlookup from './vendor/tz-lookup.js';
import { planJuz, todaysPortion, readStore, setRead, isRead, readCount, behindList, clearLegacyReading, yearReadCount, storedYears, planProgressLine, behindLine, yearLine, sanitizeReadingBackup, mergeReading, writeStore, PLAN_TEXT } from './reading-plan.js';
import { platePoint, plateRadiusOf, bodyRadii, createGlide, BRIGHT_STARS, localSiderealDegrees } from './astrolabe.js';
import { preferredWindow, preferredState } from './preferred-times.js';
import { cardNote } from './prayer-card-notes.js';
import { evidenceFor, JAFARI_HIDDEN } from './prayer-evidence.js';
import { nextBoundary, needsRefresh, boundaryDelay } from './prayer-boundary.js';
import { buildTimeline, eventLabel } from './day-timeline.js';
import { nextPrayerEventAfter, activeIntervals } from './interval-rows.js';
import { cardCountdown } from './card-countdown.js';
import { sanitizeSections, sanitizeCards } from './sections.js';
import { reminderRowVisible } from './season.js';
import { prohibitedIntervals } from './forbidden-times.js';
import { formatClock, sanitizeClockFormat, DEFAULT_CLOCK_FORMAT } from './time-format.js';

const $ = id => document.getElementById(id);

const FARD = [
  { key: 'fajr', en: 'Fajr', bn: 'ফজর' },
  { key: 'dhuhr', en: 'Dhuhr', bn: 'যোহর' },
  { key: 'asr', en: 'Asr', bn: 'আসর' },
  { key: 'maghrib', en: 'Maghrib', bn: 'মাগরিব' },
  { key: 'isha', en: 'Isha', bn: 'ইশা' }
];

const THEMES = [
  ['Obsidian', 'dark', '#101719', '#192326', '#a9c6b5'],
  ['Midnight', 'dark', '#111a2a', '#1b2a40', '#9dbfe6'],
  ['Forest', 'dark', '#111c18', '#1c2b23', '#9bc8a7'],
  ['Burgundy', 'dark', '#21151b', '#30212a', '#d7a2b0'],
  ['Graphite', 'dark', '#191b1e', '#25292e', '#c9d0d4'],
  ['Porcelain', 'light', '#f2f3ef', '#ffffff', '#456b58'],
  ['Ivory', 'light', '#f3eee3', '#fffaf1', '#8a7046'],
  ['Mist Blue', 'light', '#edf3f7', '#ffffff', '#4d7397'],
  ['Sage', 'light', '#edf2eb', '#ffffff', '#52785b'],
  ['Rose', 'light', '#f5eeee', '#fffafa', '#95616b'],
  ['Desert Night', 'dark', '#1a1410', '#261c16', '#e0b882'],
  ['Indigo Dusk', 'dark', '#121225', '#1c1c38', '#a5b4fc'],
  ['Emerald Night', 'dark', '#0c1714', '#15241f', '#6ee7b7'],
  ['Charcoal Copper', 'dark', '#161412', '#221e1b', '#d4a574'],
  ['Deep Plum', 'dark', '#1a1016', '#271821', '#e8b4d0'],
  ['Sandstone', 'light', '#f4efe6', '#fffcf7', '#8b5e34'],
  ['Pearl Mint', 'light', '#eef6f2', '#ffffff', '#2f6f5e'],
  ['Linen', 'light', '#f3efe6', '#fffdf8', '#6b5344'],
  ['Dawn Peach', 'light', '#f8eee8', '#fff9f6', '#b55a3a'],
  ['Sky Lilac', 'light', '#f0eef8', '#fdfcff', '#5b4d8a']
];
const THEME_BN = {
  'Obsidian': 'অবসিডিয়ান', 'Midnight': 'মধ্যরাত', 'Forest': 'বন', 'Burgundy': 'বার্গান্ডি', 'Graphite': 'গ্রাফাইট',
  'Porcelain': 'পোর্সেলিন', 'Ivory': 'আইভরি', 'Mist Blue': 'কুয়াশা নীল', 'Sage': 'সেজ', 'Rose': 'গোলাপ',
  'Desert Night': 'মরু রাত', 'Indigo Dusk': 'নীল সন্ধ্যা', 'Emerald Night': 'পান্না রাত', 'Charcoal Copper': 'কয়লা তামা', 'Deep Plum': 'গভীর বরই',
  'Sandstone': 'বেলেপাথর', 'Pearl Mint': 'মুক্তা পুদিনা', 'Linen': 'লিনেন', 'Dawn Peach': 'ভোরের পীচ', 'Sky Lilac': 'আকাশ লিলাক',
  dark: 'অন্ধকার', light: 'উজ্জ্বল'
};
/* v3.0.4 J: the picker lists every dark theme, then every light theme; each group keeps its order. Ids are unchanged. */
function themePickerOrder(list = THEMES) {
  return [...list.filter(theme => theme[1] === 'dark'), ...list.filter(theme => theme[1] !== 'dark')];
}
function themeOptionLabel(theme, language) {
  const bn = language === 'bn';
  const mode = bn ? THEME_BN[theme[1]] : theme[1];
  const name = bn ? (THEME_BN[theme[0]] || theme[0]) : theme[0];
  return bn ? `${name} (${mode})` : `${theme[0]} (${theme[1]})`;
}

const VOLUNTARY = [
  { key: 'duha', en: 'Ishraq / Duha', bn: 'ইশরাক / দুহা', desc: 'Morning voluntary prayer after sunrise, before the Zawal interval.', rakahs: 'Commonly 2 or more rak‘ahs.' },
  { key: 'awwabin', en: 'Awwabin', bn: 'আওয়াবিন', desc: 'Voluntary prayer after Maghrib and before Isha. Terminology and recommended rak‘ahs differ among scholarly traditions.', rakahs: 'Commonly prayed in sets of 2.' },
  { key: 'qiyam', en: 'Qiyam al-Layl', bn: 'কিয়ামুল লাইল', desc: 'Voluntary night prayer after Isha and before Fajr.', rakahs: 'Prayed in sets of 2; no fixed maximum.' },
  { key: 'tahajjud', en: 'Tahajjud', bn: 'তাহাজ্জুদ', desc: 'Night prayer after sleep. This app highlights the final third of the night as a practical time window.', rakahs: 'Prayed in sets of 2.' },
  { key: 'tarawih', en: 'Tarawih', bn: 'তারাবিহ', desc: 'Night prayer during Ramadan, performed after Isha.', rakahs: 'Common Hanafi practice: 20 rak‘ahs.' },
  { key: 'eid_prayer', en: 'Eid prayer', bn: 'ঈদের নামাজ', desc: 'Special congregational prayer on Eid al-Fitr and Eid al-Adha.', rakahs: '2 rak‘ahs with additional takbirs according to the school.' },
  { key: 'witr', en: 'Witr', bn: 'বিতর', desc: 'The concluding odd-numbered prayer of the night; Hanafi practice treats it as wajib.', rakahs: '3 rak‘ahs in Hanafi practice.' },
  { key: 'rawatib', en: 'Sunnah Rawatib', bn: 'সুন্নাতে রাতিবাহ', desc: 'The regular Sunnah prayers associated with the five obligatory prayers. See the guidance section for the complete 12-rak‘ah arrangement.', rakahs: '12 regular Sunnah rak‘ahs across the day and night.' }
];

const PREF_ALL_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'duha', 'awwabin', 'qiyam', 'witr', 'tahajjud', 'tarawih', 'eid_prayer'];
const REMINDER_VOLUNTARY = VOLUNTARY.filter(item => item.key !== 'rawatib');
const PRE_BEGIN_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'duha', 'awwabin', 'qiyam', 'tahajjud', 'witr', 'tarawih', 'eid_prayer'];

function sanitizeAstro(value) {
  const angle = Number(value?.angle);
  return { angle: Number.isFinite(angle) ? ((((angle + 180) % 360) + 360) % 360) - 180 : 0, flipped: value?.flipped === true };
}

const DEFAULTS = {
  // Location is deliberately unset on a fresh installation. The user must
  // supply a Google Maps link or enter coordinates; no device geolocation.
  lat: null,
  lon: null,
  place: '',
  theme: 'Obsidian',
  language: 'en',
  sound: true,
  tickSound: true,
  tickStyle: DEFAULT_TICK_STYLE,
  // Calculation profile (v1.3.1). Default unchanged: Karachi 18°/18°, Hanafi Asr, no high-latitude rule.
  profile: { ...DEFAULT_PROFILE },
  // 24-hour (default, as before) or 12-hour, applied everywhere a time is shown.
  clock: DEFAULT_CLOCK_FORMAT,
  // Interface font id (see src/ui-fonts.js); 'system' is the unchanged v1.3.0 look.
  // v3.0.5: one font setting for all 20 fonts (replaces uiFont + enFont).
  font: DEFAULT_FONT,
  notifications: false,
  reminders: {},
  preReminders: {},
  reminderSent: {},
  compact: false,
  startup: false,
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  history: {},
  lockWatermark: null,
  // Home page sections that can be hidden in Settings (all shown by default). Hidden sections are not rendered.
  sections: {},
  cards: sanitizeCards(),
  recognitionPace: { sunnah: 2, nafl: 1, voluntary: VOLUNTARY_SECONDS_DEFAULT },
  showRewardText: true,
  // v3.0.2: the "Juz' 7 · 41 of 92 passages read today" line under A Blessed Reminder (on by default).
  blessedProgress: true,
  // v3.0.3: Hijri date adjustment in whole days (-2..+2) for local moon sighting; prayer times are unchanged.
  hijriAdjust: 0,
  prefReminders: defaultPrefReminders(),
  // Astrolabe view (v2.1.1): the turn the user set (degrees) and whether it is flipped like a coin (mirrored view).
  astro: { angle: 0, flipped: false }
};

const saved = loadState() || {};
const state = {
  ...DEFAULTS,
  ...saved,
  adjustments: { ...DEFAULTS.adjustments, ...(saved.adjustments || {}) },
  history: migrateHistory(saved.history),
  lockWatermark: /^\d{4}-\d{2}-\d{2}$/.test(saved.lockWatermark || '') ? saved.lockWatermark : null,
  sections: sanitizeSections(saved.sections),
  cards: sanitizeCards(saved.cards),
  recognitionPace: {
    sunnah: Number(saved.recognitionPace?.sunnah) > 0 ? Number(saved.recognitionPace.sunnah) : 2,
    nafl: Number(saved.recognitionPace?.nafl) > 0 ? Number(saved.recognitionPace.nafl) : 1,
    voluntary: sanitizeVoluntarySeconds(saved.recognitionPace?.voluntary, VOLUNTARY_SECONDS_DEFAULT),
    verse: verseSeconds(saved.recognitionPace)
  },
  showRewardText: saved.showRewardText !== false,
  blessedProgress: saved.blessedProgress !== false,
  hijriAdjust: sanitizeHijriAdjust(saved.hijriAdjust),
  prefReminders: sanitizePrefReminders(saved.prefReminders, PREF_ALL_KEYS),
  reminders: saved.reminders && typeof saved.reminders === 'object' ? saved.reminders : {},
  reminderSent: saved.reminderSent && typeof saved.reminderSent === 'object' ? saved.reminderSent : {},
  // Minutes before a scheduled prayer begins (0/absent = off), validated 0–180.
  // Rawatib is omitted: it is prayed with the five prayers, not as its own start time.
  preReminders: sanitizeReminderMap(saved.preReminders, PRE_BEGIN_KEYS),
  tickStyle: sanitizeTickStyle(saved.tickStyle),
  tickSound: saved.tickSound !== false,
  profile: sanitizeProfile(saved.profile),
  clock: sanitizeClockFormat(saved.clock),
  // v3.0.5: one font; older saves migrate from the two pickers (Bangla choice in Bangla, English choice in English)
  font: migrateFont(saved),
  astro: sanitizeAstro(saved.astro)
};
delete state.uiFont;
delete state.enFont;
// v3.0.1: Friday Jumu’ah and Dhuhr are stored as separate, mutually exclusive
// choices. Older records may have fard.jumuah and/or fard.dhuhr; they still
// count as one midday Fard and are not rewritten on load.
const savedLat = state.lat;
const savedLon = state.lon;
const hasSavedLocation = savedLat !== null && savedLat !== undefined && String(savedLat).trim() !== '' &&
  savedLon !== null && savedLon !== undefined && String(savedLon).trim() !== '' &&
  Number.isFinite(Number(savedLat)) && Number.isFinite(Number(savedLon)) &&
  Math.abs(Number(savedLat)) <= 90 && Math.abs(Number(savedLon)) <= 180;
if (hasSavedLocation) {
  state.lat = Number(savedLat);
  state.lon = Number(savedLon);
} else {
  state.lat = null;
  state.lon = null;
  state.place = '';
}

function hasLocation() {
  return Number.isFinite(state.lat) && Number.isFinite(state.lon) &&
    Math.abs(state.lat) <= 90 && Math.abs(state.lon) <= 180;
}

let selectedDate = startOfDay(new Date());
let currentTimes = null;
let liveTimes = null;
let nextPrayer = null;
let countdownState = null;
let currentPage = 'home';
let prayerPageKey = '';
let homeScrollTop = 0;
let weeklyDetailDate = null;
const rakahDrafts = new Map();
/* v3.0.4 C: ticks on a card before Mark Complete are a selection. Selections live in their own storage key,
   never in history, so saved records and old backups load unchanged and nothing counts until Mark Complete.
   `days` = per-day selections, `other` = unsaved "+2 rak‘ahs" taps, `reopened` = prayers undone on the
   Prayer record page after their time (E, Revise previous prayer). */
const PENDING_KEY = 'prayer-times-pending';
function pendingObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function loadPending() {
  try {
    const raw = pendingObject(JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'));
    return { days: pendingObject(raw.days), other: pendingObject(raw.other), reopened: pendingObject(raw.reopened) };
  } catch { return { days: {}, other: {}, reopened: {} }; }
}
let pendingStore = loadPending();
function savePending() {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(pendingStore)); } catch { /* storage full: selections stay in memory */ }
}
function pendingDay(date, create = true) {
  const key = dateKey(date);
  if (create && !pendingStore.days[key]) pendingStore.days[key] = {};
  return pendingObject(pendingStore.days[key]);
}
/* Display state of a day's circles: what is recorded plus what is selected (selection never reaches history). */
function selectionView(date) {
  const record = dayRecord(date, false);
  const pend = pendingDay(date, false);
  const view = { ...record };
  for (const layer of ['fard', 'sunnah', 'nafl', 'voluntary']) view[layer] = { ...(record[layer] || {}), ...pendingObject(pend[layer]) };
  view.rakahSets = { ...(record.rakahSets || {}) };
  view.rakahs = { ...(record.rakahs || {}) };
  for (const [key, ticks] of Object.entries(pendingObject(pend.rakahSets))) {
    view.rakahSets[key] = ticks;
    if (pend.rakahs?.[key]) view.rakahs[key] = pend.rakahs[key]; else delete view.rakahs[key];
  }
  if (!shownFridayFard(record) && pend.fridayFard) applyFridayFard(view, pend.fridayFard);
  return view;
}
/* Drop a prayer event's selection (after Mark Complete or Undo). */
function clearPendingEvent(kind, key, date) {
  const dayKey = dateKey(date);
  const pend = pendingStore.days[dayKey];
  if (pend) {
    if (kind === 'fard') {
      if (pend.fard) delete pend.fard[key];
      if (key === 'dhuhr') delete pend.fridayFard;
      for (const part of prayerParts(key)) if (part.layer !== 'fard' && pend[part.layer]) delete pend[part.layer][part.slot.key];
    } else {
      if (pend[kind]) delete pend[kind][key];
      if (pend.rakahSets) delete pend.rakahSets[key];
      if (pend.rakahs) delete pend.rakahs[key];
    }
    for (const field of Object.keys(pend)) if (pend[field] && typeof pend[field] === 'object' && !Object.keys(pend[field]).length) delete pend[field];
    if (!Object.keys(pend).length) delete pendingStore.days[dayKey];
  }
  delete pendingStore.reopened[`${dayKey}|${kind}|${key}`];
}
/* Selections can never be completed once their day is sealed; unsaved "+2" taps clear when the prayer day ends. */
function prunePending(now = new Date()) {
  const current = dateKey(progressDate(now));
  let changed = false;
  for (const day of Object.keys(pendingStore.days)) if (dayIsLocked(day, current, state.lockWatermark)) { delete pendingStore.days[day]; changed = true; }
  for (const day of Object.keys(pendingStore.other)) if (day < current) { delete pendingStore.other[day]; changed = true; }
  if (changed) savePending();
}
/** The selection tick: a tick (or untick) cue only; the completion sound and the reward wait for Mark Complete. */
function playSelectSound(layer, ticked, step = 1) {
  if (!state.sound || state.tickSound === false) return;
  playCues(soundCues({ layer, ticked, step: Math.max(1, step) }), state.tickStyle, window);
}
let toastHandle = null;
let tickHandle = null;
let renderHandle = null;
let lastScheduleDate = dateKey(new Date());

const gearIcon = $('settingsToggle').innerHTML;
const homeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7"/></svg>';

function loadState() {
  try { return JSON.parse(localStorage.getItem('prayer-times-data') || '{}'); }
  catch { return {}; }
}

function save() {
  try { localStorage.setItem('prayer-times-data', JSON.stringify(state)); }
  catch { showToast('Could not save local data. Check available disk space.'); }
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, amount) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function addMinutes(date, amount) {
  return new Date(date.getTime() + amount * 60000);
}

function dayRecord(date = selectedDate, create = true) {
  const key = dateKey(date);
  if (!state.history[key] && create) state.history[key] = { fard: {}, voluntary: {} };
  return state.history[key] || { fard: {}, voluntary: {} };
}

function lang() { return state.language === 'bn' ? 'bn' : 'en'; }
function text(item) { return item[lang()] || item.en || item.key; }
function fmt(date) { return formatClock(date, { lang: lang(), clock: state.clock }); }
function prayerName(key) { const extra = { jumuah: { en: 'Jumu’ah', bn: 'জুমুআ' }, tahiyyatul_masjid: { en: 'Tahiyyat al-Masjid', bn: 'তাহিয়্যাতুল মসজিদ' }, istikhara: { en: 'Salat al-Istikhara', bn: 'সালাতুল ইস্তিখারা' }, tawbah: { en: 'Salat al-Tawbah', bn: 'নামাজুত তওবা' }, wudu_prayer: { en: 'Prayer after Wudu', bn: 'ওজুর পরের সালাত' }, kusuf: { en: 'Salat al-Kusuf (Solar Eclipse)', bn: 'সালাতুল কুসূফ (সূর্যগ্রহণ)' }, khusuf: { en: 'Salat al-Khusuf (Lunar Eclipse)', bn: 'সালাতুল খুসূফ (চন্দ্রগ্রহণ)' }, istisqa: { en: 'Salat al-Istisqa (Rain Prayer)', bn: 'সালাতুল ইস্তিসকা (বৃষ্টির সালাত)' }, janazah: { en: 'Salat al-Janazah', bn: 'সালাতুল জানাযা' }, nafl_mutlaq: { en: 'General Nafl Prayer (Salat al-Mutlaq)', bn: 'সাধারণ নফল সালাত (সালাতুল মুতলাক)'}, other_nafl: { en: 'Other voluntary prayers', bn: 'অন্যান্য নফল নামাজ' } }; return text(FARD.find(item => item.key === key) || VOLUNTARY.find(item => item.key === key) || extra[key] || { en: key, bn: key }); }
/* Friday's midday slot reads "Dhuhr/Jumu’ah" everywhere: either prayer completes it. */
function slotName(key, date) {
  return isFridayDhuhr(key, date) ? FRIDAY_DHUHR_LABEL[lang()] : prayerName(key);
}
function dayName(date) {
  return new Intl.DateTimeFormat(lang() === 'bn' ? 'bn-BD' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}
function pad(value) { return String(value).padStart(2, '0'); }
function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const value = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map(pad).join(':');
  return lang() === 'bn' ? localizeDigits(value) : value;
}
/* v1.3.4: header subtitle "Location: 23.8103, 90.4125" (Bangla: "অবস্থান: ২৩.৮১০৩, ৯০.৪১২৫") */
function locationSubtitle() {
  const coords = `(${state.lat.toFixed(4)}, ${state.lon.toFixed(4)})`;
  return lang() === 'bn' ? `স্থানাঙ্ক: ${localizeDigits(coords)}` : `coordinates: ${coords}`;
}
/* (v2.2.0) The coordinates plate: engraved compass mark, "23.9181° N  90.2533° E" in the selected language, place name on a second line. */
function coordinatePlateHtml() {
  const bn = lang() === 'bn';
  const num = value => { const t = Math.abs(value).toFixed(4); return bn ? localizeDigits(t) : t; };
  const dir = (value, pos, neg) => (value >= 0 ? pos : neg);
  const latText = `${num(state.lat)}° ${bn ? dir(state.lat, 'উ', 'দ') : dir(state.lat, 'N', 'S')}`;
  const lonText = `${num(state.lon)}° ${bn ? dir(state.lon, 'পূ', 'প') : dir(state.lon, 'E', 'W')}`;
  const mark = '<svg class="cp-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.6"/><path d="M12 3.4v3M12 17.6v3M3.4 12h3M17.6 12h3"/><path d="M14.9 9.1 13.2 13.2 9.1 14.9 10.8 10.8z" class="needle"/></svg>';
  const place = state.place ? `<span class="cp-place">${escapeHtml(state.place)}</span>` : '';
  return `${mark}<span class="cp-text"><span class="cp-coords"><b>${latText}</b><b>${lonText}</b></span>${place}</span>`;
}
function localizeDigits(value) { return String(value).replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)]); }
function setTranslatedText(id, message) {
  $(id).textContent = message;
  translateRenderedText();
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = lang()==='bn' ? (BN_TEXT[message] || message.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)])) : message;
  toast.classList.add('show');
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => toast.classList.remove('show'), 2400);
}

function applyUiFont() {
  // v3.0.5: one chosen font draws all text it can; Bangla glyphs an English font lacks use Hind Siliguri.
  const stack = fontStack(state.font);
  document.documentElement.style.setProperty('--ui-font', stack);
  document.documentElement.style.setProperty('--en-font', stack);
  document.documentElement.style.setProperty('--app-font', stack);
}

function paintVersionLabel() {
  const el = $('appVersionLabel');
  if (!el) return;
  el.textContent = versionLabel(lang());
}

function renderUiFontSelect() {
  const select = $('uiFontSelect');
  if (!select) return;
  // v3.0.5: one Font list, System default then the English and Bangla groups.
  const bn = lang() === 'bn';
  const option = id => `<option value="${id}">${escapeHtml(fontLabel(id, lang()))}</option>`;
  select.innerHTML = option('system') + FONT_GROUPS.map(group => `<optgroup label="${escapeHtml(bn ? group.bn : group.en)}">${group.fonts.map(font => option(font.id)).join('')}</optgroup>`).join('');
  select.value = state.font;
  const note = $('fontNote');
  if (note) note.textContent = bn
    ? 'ইংরেজি ফন্টে বাংলা অক্ষর নেই, তাই ইংরেজি ফন্ট বেছে নিলে বাংলা লেখা Hind Siliguri ফন্টে দেখায়।'
    : 'English fonts have no Bangla letters, so with an English font Bangla text uses Hind Siliguri.';
}

function applyTheme() {
  applyUiFont();
  const theme = THEMES.find(item => item[0] === state.theme) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--bg', theme[2]);
  root.style.setProperty('--surface', theme[3]);
  root.style.setProperty('--surface2', theme[2]);
  root.style.setProperty('--accent', theme[4]);
  root.style.setProperty('--accent2', theme[3]);
  root.style.setProperty('--text', theme[1] === 'dark' ? '#f0f3ef' : '#202823');
  root.style.setProperty('--muted', theme[1] === 'dark' ? '#9daaa6' : '#6f7c74');
  root.style.setProperty('--line', theme[1] === 'dark' ? '#303d3c' : '#d9e0da');
  root.style.setProperty('--good', theme[1] === 'dark' ? '#5dbb83' : '#27854f');
  root.style.setProperty('--gold', theme[1] === 'dark' ? '#c8a86a' : '#a78240');
  document.body.dataset.mode = theme[1];
  document.documentElement.style.colorScheme = theme[1];
  $('themeSelect').value = state.theme;
}

function timezoneText() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const bn = lang() === 'bn';
  const offset = new Intl.DateTimeFormat('en', { timeZoneName: 'longOffset' }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value.replace('GMT', 'UTC') || '';
  if (!bn) return `${zone || 'Device local time'} · ${offset}`;
  let name = '';
  try { name = new Intl.DateTimeFormat('bn-BD', { timeZoneName: 'long' }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || ''; } catch { /* fall back to the offset */ }
  return `${name || 'ডিভাইসের স্থানীয় সময়'} · ${localizeDigits(offset.replace('UTC', 'ইউটিসি'))}`;
}

function setLanguage() {
  document.documentElement.lang = lang();
  const coordCard = $('locationLabel');
  if (hasLocation()) coordCard.innerHTML = coordinatePlateHtml();
  else coordCard.textContent = lang() === 'bn' ? 'স্থানাঙ্ক: (নির্ধারিত নয়)' : 'coordinates: (not set)';
  coordCard.title = lang() === 'bn' ? 'অবস্থান সেটিংস খুলুন' : 'Open location settings';
  coordCard.setAttribute('aria-label', (hasLocation() ? locationSubtitle() : coordCard.textContent) + (state.place ? ` · ${state.place}` : ''));
  coordCard.classList.toggle('is-unset', !hasLocation());
  $('timezoneLabel').textContent = timezoneText();
  paintClockDate(new Date(), true);
  paintClockNumerals();
  $('selectedDay').textContent = dateKey(selectedDate) === dateKey(new Date()) ? (lang() === 'bn' ? 'আজ' : 'Today') : dayName(selectedDate);
  const mark = $('copyrightMark');
  if (mark) mark.textContent = copyrightText(lang());
  paintVersionLabel();
}

const shiaMode = () => isShiaProfile(state.profile);
const SCHOOL_SHORT = { hanafi: 'Hanafi', shafii: 'Shafi‘i', maliki: 'Maliki', hanbali: 'Hanbali', jafari: 'Ja‘fari' };
const SCHOOL_SHORT_BN = { hanafi: 'হানাফি', shafii: 'শাফিঈ', maliki: 'মালিকি', hanbali: 'হাম্বলি', jafari: 'জাফরি' };
function schoolShort() { return (lang() === 'bn' ? SCHOOL_SHORT_BN : SCHOOL_SHORT)[state.profile.school] || ''; }

function profileOptions(date) {
  // Umm al-Qura's Ramadan Isha (120 min) applies to nights that belong to Ramadan.
  return { ...state.profile, ramadan: hijriParts(addDays(date, 1))?.month === 9 };
}

function getTimes(date) {
  if (!Number.isFinite(state.lat) || !Number.isFinite(state.lon)) return null;
  const times = calculatePrayerTimes(date, state.lat, state.lon, -date.getTimezoneOffset(), profileOptions(date));
  for (const key of Object.keys(state.adjustments)) {
    if (times[key] instanceof Date) times[key] = addMinutes(times[key], Number(state.adjustments[key]) || 0);
  }
  // Keep solar noon/Zawal derived from true solar noon, not the adjusted Dhuhr display time.
  times.zawalStart = addMinutes(times.solarNoon, -6);
  times.zawalEnd = addMinutes(times.solarNoon, 6);
  times.dhuhr = addMinutes(times.zawalEnd, Number(state.adjustments.dhuhr) || 0);
  if (shiaMode()) {
    // Ja'fari: Isha ends at midnight, halfway between sunset and the next Fajr.
    const nextDay = addDays(date, 1);
    const next = calculatePrayerTimes(nextDay, state.lat, state.lon, -nextDay.getTimezoneOffset(), profileOptions(nextDay));
    const nextFajr = addMinutes(next.fajr, Number(state.adjustments.fajr) || 0);
    times.midnight = jafariMidnight(times.sunset, nextFajr);
  }
  return times;
}

/* v3.0.3: the Hijri date adjustment shifts every Hijri date the app shows or uses (occasions,
   Ramadan, Eid, the day's juz') by whole days; prayer times never use it.
   v3.0.6 (H): the Hijri date is worked out for the saved location from the predicted crescent
   (src/moon-engine.js, moon-sighting with the Odeh criterion and the bundled DE442S kernel). The
   Umm al-Qura calendar is only used where that cannot be done: before the kernel is loaded, without
   a location, before Hijri 1440 or after the kernel's end (2150); the label is then not shown. */
function hijriShift() { try { return sanitizeHijriAdjust(state.hijriAdjust); } catch { return 0; } }
function crescentHijri(date) {
  if (!ephemerisReady() || !hasLocation()) return null;
  try { return crescentHijriOfDay(dayNumberOfLocalDate(date), state.lat, state.lon); } catch { return null; }
}
function ummAlQuraParts(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(date);
    return {
      day: Number(parts.find(part => part.type === 'day')?.value),
      month: Number(parts.find(part => part.type === 'month')?.value),
      year: Number(parts.find(part => part.type === 'year')?.value)
    };
  } catch { return null; }
}
function hijriParts(date) {
  const shifted = addDays(date, hijriShift());
  return crescentHijri(shifted) || ummAlQuraParts(shifted);
}
/** True when the Hijri date of this civil date comes from the crescent prediction (the label is shown). */
function hijriByCrescent(date) { return !!crescentHijri(addDays(date, hijriShift())); }
/** Days (29 or 30) in Hijri month (year, month) of the calendar the app is using. */
function hijriMonthDays(year, month) {
  if (ephemerisReady() && hasLocation()) {
    const n = crescentMonthLength(year, month, state.lat, state.lon);
    if (n === 29 || n === 30) return n;
  }
  // Umm al-Qura: find day 29 of the month and see whether the next civil day is day 30
  const approx = new Date(Date.UTC(622, 6, 16) + ((year - 1) * 354.36707 + (month - 1) * 29.530588 + 28) * 86400000);
  for (let k = -4; k <= 4; k++) {
    const d = new Date(approx.getTime() + k * 86400000);
    const h = ummAlQuraParts(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
    if (h && h.year === year && h.month === month && h.day === 29) {
      const next = ummAlQuraParts(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 12));
      return next && next.day === 30 ? 30 : 29;
    }
  }
  return 30;
}
function hijriYearDays(year) { let n = 0; for (let m = 1; m <= 12; m++) n += hijriMonthDays(year, m); return n; }
function hijriDayOfYear(h) { let n = h.day; for (let m = 1; m < h.month; m++) n += hijriMonthDays(h.year, m); return n; }
/* Month names in the same words and order as the Intl Umm al-Qura format the app used before v3.0.6. */
const hijriNameCache = new Map();
function hijriDateText(h, bn) {
  const key = `${bn ? 'bn' : 'en'}|${h.month}`;
  if (!hijriNameCache.has(key)) {
    const fmt = new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'islamic-umalqura' });
    let parts = null;
    for (let k = 0; k < 400 && !parts; k += 7) {
      const d = new Date(2026, 0, 1 + k, 12);
      const u = ummAlQuraParts(d);
      if (u && u.month === h.month) parts = fmt.formatToParts(d);
    }
    hijriNameCache.set(key, parts);
  }
  const parts = hijriNameCache.get(key);
  const digits = value => (bn ? localizeDigits(value) : String(value));
  if (!parts) return `${digits(h.day)} ${h.month} ${digits(h.year)}`;
  return parts.map(part => part.type === 'day' ? digits(h.day) : part.type === 'year' ? digits(h.year) : part.value).join('');
}
const HIJRI_SOURCE_LABEL = { en: 'Predicted by crescent visibility', bn: 'নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী' };

/* v3.0.6 (M): the astrolabe, its Sun and Moon cards and the other sky readouts use the precise sun and
   moon from the bundled kernel; the low-precision series in src/sky.js is only a stand-in until the
   kernel has loaded (the app waits for it before its first render) or if it cannot be read. */
function sunPosition(date, latitude, longitude) {
  return ephemerisReady() ? preciseSunPosition(date, latitude, longitude) : approxSunPosition(date, latitude, longitude);
}
function moonPosition(date, latitude, longitude) {
  return ephemerisReady() ? preciseMoonPosition(date, latitude, longitude) : approxMoonPosition(date, latitude, longitude);
}
function moonPhase(date) { return ephemerisReady() ? preciseMoonPhase(date) : approxMoonPhase(date); }
const moonPassCache = new Map();
function moonPass(now, latitude, longitude) {
  if (!ephemerisReady()) return approxMoonPass(now, latitude, longitude);
  const key = `${Math.floor(now.getTime() / 60000)}|${latitude}|${longitude}`;
  if (!moonPassCache.has(key)) {
    if (moonPassCache.size > 8) moonPassCache.clear();
    moonPassCache.set(key, preciseMoonPass(now, latitude, longitude));
  }
  return moonPassCache.get(key);
}

/* v3.0.6 (L, I): the JPL DE442S kernel is a file inside the app (public/ephemeris). It is read from the
   app's own files before the first render (src/moon-engine.js); nothing is fetched from the internet. */
async function loadEphemeris() {
  // The app never waits more than 15 s for its own kernel file: if reading it stalls, the app starts with the
  // Umm al-Qura date (as before v3.0.6) and the precise data takes over as soon as the file has been read.
  const load = loadBundledKernel(document.baseURI, window.location.origin).catch(() => false);
  return Promise.race([load, new Promise(resolve => setTimeout(() => resolve(false), 15000))]);
}

function islamicCalendarDateAt(moment = new Date()) {
  const times = getTimes(startOfDay(moment));
  // The Hijri date of a civil date is the one current in its daytime. The Hijri date changes
  // at sunset, so after Maghrib use the following civil date as the night date.
  return times?.maghrib && moment >= times.maghrib ? addDays(moment, 1) : moment;
}

function currentHijriDate(moment = new Date()) {
  return hijriParts(islamicCalendarDateAt(moment));
}

function occasionFor(date) {
  const hijri = hijriParts(date);
  if (!hijri) return null;
  const events = {
    '1-1': ['Islamic New Year', 'Start of Muharram'],
    '1-9': ['Day before Ashura (Tasu’a)', '9 Muharram'],
    '1-10': ['Day of Ashura', '10 Muharram'],
    '3-12': ['Mawlid an-Nabi', 'Observance varies among Muslim communities'],
    '7-27': ['Isra and Mi’raj', '27 Rajab'],
    '8-15': ['Mid-Sha’ban', '15 Sha’ban'],
    '9-1': ['Start of Ramadan', 'The month of fasting'],
    '9-17': ['Battle of Badr', '17 Ramadan'],
    '9-27': ['Laylat al-Qadr (commonly observed)', 'The Night of Decree; the exact night is not fixed'],
    '10-1': ['Eid al-Fitr', '1 Shawwal'],
    '12-9': ['Day of Arafah', '9 Dhul Hijjah'],
    '12-10': ['Eid al-Adha', '10 Dhul Hijjah']
  };
  const exact = events[`${hijri.month}-${hijri.day}`];
  if (exact) return exact;
  if (hijri.month === 9 && hijri.day >= 21) return ['Last ten nights of Ramadan', 'Seek Laylat al-Qadr in the odd-numbered nights'];
  if (hijri.month === 12 && hijri.day <= 10) return ['First ten days of Dhul Hijjah', 'Among the most significant days of the Islamic year'];
  if (hijri.day >= 13 && hijri.day <= 15) return ['White Days', '13th–15th of the lunar month'];
  return null;
}

function daytimeHijriDateForNight(ishaTime) {
  // The night after sunset belongs to the following daytime Hijri date.
  return hijriParts(addDays(ishaTime, 1));
}

function isRamadanNight(ishaTime) {
  return daytimeHijriDateForNight(ishaTime)?.month === 9;
}

function getVoluntaryEvents(date, times = getTimes(date), nextTimes = getTimes(addDays(date, 1))) {
  if (!times || !nextTimes) return [];
  const nightEnd = nextTimes.fajr;
  const nightDuration = nightEnd.getTime() - times.maghrib.getTime();
  const events = [
    {
      key: 'duha', kind: 'voluntary', start: addMinutes(times.sunrise, 20), end: times.zawalStart,
      desc: VOLUNTARY.find(item => item.key === 'duha').desc
    },
    {
      key: 'awwabin', kind: 'voluntary', start: times.maghrib, end: times.isha,
      desc: VOLUNTARY.find(item => item.key === 'awwabin').desc
    },
    {
      key: 'qiyam', kind: 'voluntary', start: times.isha, end: nightEnd,
      desc: VOLUNTARY.find(item => item.key === 'qiyam').desc
    },
    {
      key: 'tahajjud', kind: 'voluntary', start: new Date(nightEnd.getTime() - nightDuration / 3), end: nightEnd,
      desc: VOLUNTARY.find(item => item.key === 'tahajjud').desc
    },
    { key: 'witr', kind: 'voluntary', start: times.isha, end: nightEnd, desc: VOLUNTARY.find(item => item.key === 'witr').desc }
  ];
  if (isRamadanNight(times.isha)) {
    events.push({ key: 'tarawih', kind: 'voluntary', start: times.isha, end: nightEnd, desc: VOLUNTARY.find(item => item.key === 'tarawih').desc });
  }
  const hijri = hijriParts(date);
  if (hijri && ((hijri.month === 10 && hijri.day === 1) || (hijri.month === 12 && hijri.day === 10))) {
    events.push({ key: 'eid_prayer', kind: 'voluntary', start: addMinutes(times.sunrise, 20), end: times.zawalStart, eid: hijri.month === 10 ? 'fitr' : 'adha', desc: VOLUNTARY.find(item => item.key === 'eid_prayer').desc });
  }
  // Ja'fari mode: Duha, Awwabin and congregational Tarawih are not part of
  // Ja'fari practice, so they are not scheduled; the night prayer, Witr and Eid stay.
  const excluded = shiaMode() ? SHIA_EXCLUDED_VOLUNTARY : [];
  return events.filter(event => event.end > event.start && !excluded.includes(event.key)).map(event => ({ ...event, date: startOfDay(date) }));
}

const SHIA_EXCLUDED_VOLUNTARY = ['duha', 'awwabin', 'tarawih'];

function getFardEvents(date, times = getTimes(date), nextTimes = getTimes(addDays(date, 1))) {
  if (!times || !nextTimes) return [];
  return [
    { key: 'fajr', kind: 'fard', date, start: times.fajr, end: times.sunrise },
    { key: 'dhuhr', kind: 'fard', date, start: times.dhuhr, end: times.asr },
    { key: 'asr', kind: 'fard', date, start: times.asr, end: times.maghrib },
    { key: 'maghrib', kind: 'fard', date, start: times.maghrib, end: times.isha },
    { key: 'isha', kind: 'fard', date, start: times.isha, end: times.midnight && times.midnight > times.isha ? times.midnight : nextTimes.fajr }
  ];
}

function prayerDayEvents(now = new Date()) {
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const todayTimes = getTimes(today);
  const yesterdayTimes = getTimes(yesterday);
  const tomorrowTimes = getTimes(tomorrow);
  if (!todayTimes || !tomorrowTimes) return [];
  let events = [];
  if (now < todayTimes.fajr && yesterdayTimes) {
    events = events.concat(getFardEvents(yesterday, yesterdayTimes, todayTimes));
    events = events.concat(getVoluntaryEvents(yesterday, yesterdayTimes, todayTimes));
  } else {
    events = events.concat(getFardEvents(today, todayTimes, tomorrowTimes));
    events = events.concat(getVoluntaryEvents(today, todayTimes, tomorrowTimes));
  }
  return events.sort((a, b) => a.start - b.start);
}

function getActiveEvents(now = new Date()) {
  return prayerDayEvents(now).filter(event => now >= event.start && now < event.end);
}

function eventParts(event) {
  if (event.kind !== 'fard' || shiaMode()) return [{ layer: event.kind, key: event.key, position: 'single' }];
  return prayerParts(event.key).map(part => part.layer === 'fard'
    ? { layer: 'fard', key: event.key, position: 'fard' }
    : { layer: part.layer, key: part.slot.key, position: part.slot.position });
}

function eventComplete(event) {
  const record = dayRecord(event.date, false);
  return eventParts(event).every(part => !!record[part.layer]?.[part.key]);
}

/* v2.0.1: ticks and sub-ticks only record what was prayed (and its rak‘ah information). A prayer event card in
   "Prayer events" is closed solely by its own Mark completed button, which stores this flag per event. */
function eventClosed(event) {
  return !!dayRecord(event.date, false).closed?.[`${event.kind}:${event.key}`];
}

function findRecordableEvent(kind, key, date) {
  const times = getTimes(date);
  const next = getTimes(addDays(date, 1));
  if (!times || !next) return null;
  const events = kind === 'fard' ? getFardEvents(date, times, next) : [...getVoluntaryEvents(date, times, next), ...getFardEvents(date, times, next)];
  return events.find(event => event.kind === kind && event.key === key) || null;
}

function summaryLines(event) {
  const record = dayRecord(event.date, false);
  const bn = lang() === 'bn';
  const lines = [];
  for (const part of eventParts(event)) {
    if (!record[part.layer]?.[part.key]) continue;
    if (part.layer === 'fard' || part.position === 'fard') {
      const n = event.key === 'dhuhr' && event.date.getDay() === 5 ? fridayFardRakahs(record) || FARD_RAKAHS[event.key] : FARD_RAKAHS[event.key];
      const name = event.key === 'dhuhr' && event.date.getDay() === 5
        ? (fridayFardChoice(record) === 'dhuhr' ? (bn ? 'যোহর' : 'Dhuhr') : (fridayFardChoice(record) === 'jumuah' ? (bn ? 'জুমা' : 'Jumu’ah') : (bn ? 'ফরজ' : 'Fard')))
        : (bn ? 'ফরজ' : 'Fard');
      lines.push(bn ? `${name}: ${n ? localizeDigits(n) + ' রাকাত সম্পন্ন।' : 'সম্পন্ন।'}` : `${name}: ${n ? n + " Rak'ahs completed." : 'completed.'}`);
    } else if (part.layer === 'voluntary' || part.position === 'single') {
      const guide = PRAYER_GUIDANCE[event.key];
      const detail = guide ? (bn ? guide.bn : guide.rakahs) : '';
      const performed = Number(record.rakahs?.[event.key] || 0);
      const actual = performed ? (bn ? `${localizeDigits(performed)} রাকাত আদায়` : `${performed} rak'ahs performed`) : detail;
      lines.push(bn ? `নফল: সম্পন্ন।${actual ? ' ' + actual : ''}` : `Voluntary: completed.${actual ? ' ' + actual : ''}`);
    } else {
      const slot = findSlot(part.layer, part.key);
      const label = slot ? slotShortLabel(slot, event.date, bn ? 'bn' : 'en') : part.key;
      const name = part.layer === 'sunnah' ? (bn ? 'সুন্নাত' : 'Sunnah') : (bn ? 'নফল' : 'Nafl');
      lines.push(bn ? `${name}: ${label} সম্পন্ন।` : `${name}: ${label} completed.`);
    }
  }
  return lines;
}

function renderCompletedToday() {
  const box = $('completedToday');
  if (!box) return;
  const bn = lang() === 'bn';
  const events = prayerDayEvents(new Date());
  const cards = events.map(event => ({ event, lines: summaryLines(event) })).filter(item => item.lines.length);
  const situationalRecord = dayRecord(progressDate(new Date()), false);
  for (const key of SITUATIONAL_KEYS) { const occurrences = Number(situationalRecord.situationalOccurrences?.[key] ?? (situationalRecord.situational?.[key] ? 1 : 0)); if (occurrences || situationalRecord.situational?.[key]) cards.push({ event: { key, date: progressDate(new Date()) }, lines: [lang()==='bn' ? `পরিস্থিতিভিত্তিক সালাত: ${occurrences || 1} বার, ${Number(situationalRecord.rakahs?.[key] || (key === 'janazah' ? 0 : 2))} রাকাত।` : `Situational prayer: ${occurrences || 1} occasion(s), ${Number(situationalRecord.rakahs?.[key] || (key === 'janazah' ? 0 : 2))} rak'ahs.`] }); }
  const extraNafl = otherNaflCount(situationalRecord);
  if (extraNafl) cards.push({ event: { key: 'other_nafl', date: progressDate(new Date()) }, lines: [lang()==='bn' ? `অন্যান্য নফল: ${localizeDigits(extraNafl)} রাকাত।` : `Other voluntary nafl: ${extraNafl} rak‘ahs.`] });
  const count = $('completedCount');
  if (count) count.textContent = bn ? localizeDigits(cards.length) : String(cards.length);
  if (!cards.length) {
    box.innerHTML = `<div class="live-empty"><span class="empty-mark">✦</span><div><strong>${bn ? 'আজ এখনো কোনো অংশ রেকর্ড হয়নি।' : 'Nothing has been recorded yet today.'}</strong><small>${bn ? 'শুধু যে অংশে টিক পড়েছে, সেটিই দেখা যাবে।' : 'Only parts with an actual tick are shown.'}</small></div></div>`;
    return;
  }
  box.innerHTML = cards.map(({ event, lines }) => `<article class="completed-card summary-card"><button class="prayer-name-button" type="button" data-completed-info="${event.key}">${escapeHtml(slotName(event.key, event.date))}</button><ul class="summary-lines">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul></article>`).join('');
  box.querySelectorAll('[data-completed-info]').forEach(button => button.addEventListener('click', () => navigateToPrayerDescription(button.dataset.completedInfo)));
}

function renderEclipse() {
  const card = $('eclipseCard');
  if (!card) return;
  if (!hasLocation()) { card.hidden = true; return; }
  const hit = nextEclipse(new Date(), state.lat, state.lon, 24);
  card.hidden = !hit;
  if (!hit) return;
  const bn = lang() === 'bn';
  const name = hit.kind === 'solar' ? (bn ? 'সূর্যগ্রহণ' : 'Solar eclipse') : (bn ? 'চন্দ্রগ্রহণ' : 'Lunar eclipse');
  const note = bn
    ? 'আনুমানিক হিসাব, পঞ্জিকার সঙ্গে মেলানো হয়নি। ইবাদতের আগে একটি নির্ভরযোগ্য সূত্র দেখে নিন।'
    : 'Approximate only. Not checked against an almanac. Confirm with a published source before worship.';
  card.innerHTML = `<strong>${escapeHtml(name)}</strong><span>${escapeHtml(fmt(hit.at))} · ${escapeHtml(note)}</span>`;
}

function getAllFardForDate(date) {
  const times = getTimes(date);
  const nextTimes = getTimes(addDays(date, 1));
  return getFardEvents(date, times, nextTimes);
}

function getNextPrayer(now = new Date()) {
  const today = startOfDay(now);
  const todayTimes = getTimes(today);
  const tomorrow = addDays(today, 1);
  const tomorrowTimes = getTimes(tomorrow);
  if (!todayTimes || !tomorrowTimes) return null;
  const events = getFardEvents(today, todayTimes, tomorrowTimes).concat(getFardEvents(tomorrow, tomorrowTimes, getTimes(addDays(tomorrow, 1))));
  return events.find(event => event.start > now) || null;
}


const ORIGINAL_TEXT = new WeakMap();
const LAST_TRANSLATED_TEXT = new WeakMap();
const BN_TEXT = {
  'Mark Complete':'সম্পন্ন করুন','Prayer':'নামাজ','Esc':'এসক','Home':'হোম','Page Up':'পেজ আপ','Page Down':'পেজ ডাউন','End':'এন্ড','Tab':'ট্যাব','Enter / Space':'এন্টার / স্পেস','Begins in':'শুরু হতে বাকি',
  'NEXT PRAYER':'পরবর্তী নামাজ','NEXT EVENT':'এরপর যা আসছে','SUNNAH & SEERAH':'সুন্নাহ ও সীরাত','The countdown to the next event begins at the displayed local time.':'এরপরের সময়ের কাউন্টডাউন দেখানো স্থানীয় সময়ে শুরু হবে।','TODAY\'S PROGRESS':'আজকের অগ্রগতি','AVAILABLE RIGHT NOW':'এখন যা পড়া যায়','Prayer events':'এখনকার নামাজ','Mark a prayer after its time begins':'ওয়াক্ত শুরু হলে নামাজ পড়ে টিক দিন','THE FIVE OBLIGATORY PRAYERS':'পাঁচ ওয়াক্ত ফরজ নামাজ','Daily prayers':'দৈনিক নামাজ','ADDITIONAL WORSHIP':'অতিরিক্ত ইবাদত','Voluntary prayers':'নফল নামাজ','ISLAMIC HISTORY':'ইসলামের ইতিহাস','On this day':'আজকের দিনে','Hijri calendar':'হিজরি ক্যালেন্ডার','Weekly Prayer History':'সাপ্তাহিক নামাজের ইতিহাস','Weekly Prayer Progress':'সাপ্তাহিক নামাজের অগ্রগতি','Saturday to Friday':'শনিবার থেকে শুক্রবার','REFERENCE':'নির্দেশিকা','Prayer descriptions':'নামাজের বিবরণ','YOUR RECORD':'আপনার রেকর্ড','Prayer history':'নামাজের ইতিহাস','PREFERENCES':'পছন্দসমূহ','Settings':'সেটিংস','Your configuration is saved locally on this device.':'আপনার সেটিংস এই ডিভাইসেই সংরক্ষিত হয়।','YOUR LOCATION':'আপনার অবস্থান','Prayer location':'নামাজের অবস্থান','On-device':'ডিভাইসে সংরক্ষিত','Use a Google Maps share link or enter coordinates manually. No login or automatic location detection is used.':'Google Maps শেয়ার লিংক দিন অথবা স্থানাঙ্ক লিখুন। লগইন বা স্বয়ংক্রিয় অবস্থান শনাক্তকরণ ব্যবহৃত হয় না।','Google Maps sharing link':'Google Maps শেয়ার লিংক','Use link':'লিংক ব্যবহার করুন','Save location':'অবস্থান সংরক্ষণ','APPEARANCE':'চেহারা','Personalise Prayer Times':'অ্যাপের চেহারা','Colour theme':'রঙের থিম','Compact desktop mode':'কমপ্যাক্ট ডেস্কটপ মোড','Language':'ভাষা','TIME ADJUSTMENTS':'সময়ের সমন্বয়','Fine-tune local timings':'স্থানীয় সময় সূক্ষ্মভাবে সমন্বয়','WINDOWS INTEGRATION':'উইন্ডোজ সংযোগ','Desktop behaviour':'ডেস্কটপ আচরণ','YOUR DATA':'আপনার তথ্য','Private by default':'ডিফল্টভাবে ব্যক্তিগত','Export backup':'ব্যাকআপ রপ্তানি','Reset local data':'স্থানীয় তথ্য মুছুন','Back to prayers':'নামাজের পাতায় ফিরুন','Completed':'সম্পন্ন','Obligatory prayer':'ফরজ নামাজ','Voluntary':'নফল','OBLIGATORY':'ফরজ','VOLUNTARY':'নফল','TIME LEFT':'বাকি সময়','No prayer event is currently in its time window.':'এই মুহূর্তে কোনো নামাজের নির্ধারিত সময় চলছে না।','Prayer times are unavailable.':'নামাজের সময় পাওয়া যায়নি।','No additional voluntary prayer period is scheduled for this date.':'এই তারিখে অতিরিক্ত নফল নামাজের সময় নির্ধারিত নেই।','Keep going':'চালিয়ে যান','Good Job!':'চমৎকার!','Great Job!':'অসাধারণ!','Sunrise':'সূর্যোদয়','Zawal exclusion':'জাওয়ালের নিষিদ্ধ সময়','Fard':'ফরজ','Previous day':'আগের দিন','Next day':'পরের দিন','Start Prayer Times when Windows starts':'উইন্ডোজ চালু হলে প্রেয়ার টাইমস চালু করুন','Enable Windows prayer notifications':'উইন্ডোজে নামাজের বিজ্ঞপ্তি চালু করুন','Play a short pentatonic sound when a prayer is marked complete':'নামাজ সম্পন্ন করলে ছোট পেন্টাটনিক সুর বাজান','Start Prayer Times when Windows starts':'উইন্ডোজ চালু হলে অ্যাপ চালু করুন','Calculation profile':'হিসাবের প্রোফাইল','Calculation method':'হিসাবের পদ্ধতি','Asr method':'আসরের পদ্ধতি','Time zone':'সময় অঞ্চল','Device':'ডিভাইস','Zawal exclusion':'জাওয়ালের নিষিদ্ধ সময়','Your location':'আপনার অবস্থান','Latitude':'অক্ষাংশ','Longitude':'দ্রাঘিমাংশ','Place name':'স্থানের নাম','Save location':'অবস্থান সংরক্ষণ','Fine-tune local timings':'স্থানীয় সময় সমন্বয় করুন','Export backup':'ব্যাকআপ রপ্তানি','Reset local data':'স্থানীয় তথ্য মুছুন','Prayer reminders disabled':'নামাজের বিজ্ঞপ্তি বন্ধ','Prayer reminders enabled':'নামাজের বিজ্ঞপ্তি চালু','Location saved':'অবস্থান সংরক্ষিত','Saved location':'সংরক্ষিত অবস্থান','Current:':'বর্তমান:','Begins in':'শুরু হতে বাকি','Time remaining':'বাকি সময়','This prayer period has ended':'এই নামাজের সময় শেষ হয়েছে','Prayer Times':'নামাজের সময়','Fajr':'ফজর','Dhuhr':'যোহর','Asr':'আসর','Maghrib':'মাগরিব','Isha':'ইশা','Sunset':'সূর্যাস্ত','Obligatory':'ফরজ','Prayer times are calculated on this device':'নামাজের সময় এই ডিভাইসেই হিসাব করা হয়','Complete the five obligatory prayers to earn your daily achievement.':'দৈনিক লক্ষ্য পূরণে পাঁচ ওয়াক্ত ফরজ নামাজ আদায় করুন।','Time until the next prayer':'পরবর্তী নামাজের বাকি সময়','Calculated on this device · Prayer records stay on this device':'এই ডিভাইসে হিসাব করা হয় · নামাজের রেকর্ড এই ডিভাইসেই থাকে','Expanded Google Maps links with coordinates work offline. Shortened share links cannot be expanded offline; copy coordinates from Maps or enter them below.':'স্থানাঙ্কসহ Google Maps লিংক অফলাইনে পড়া যায়। সংক্ষিপ্ত লিংক অফলাইনে খোলা যায় না; Maps থেকে স্থানাঙ্ক কপি করে লিখুন।','Currently saved location':'বর্তমানে সংরক্ষিত অবস্থান','University of Islamic Sciences, Karachi · Fajr 18° / Isha 18°':'ইউনিভার্সিটি অব ইসলামিক সায়েন্সেস, করাচি · ফজর ১৮° / ইশা ১৮°','Hanafi · shadow factor 2':'হানাফি · ছায়ার অনুপাত ২','True solar noon · six-minute prohibited interval':'প্রকৃত সৌর মধ্যাহ্ন · ছয় মিনিটের নিষিদ্ধ সময়',"Prayer calculations follow the device's local time zone. Location coordinates do not change Windows time-zone settings.":'নামাজের সময় ডিভাইসের স্থানীয় সময় অঞ্চল অনুযায়ী হিসাব হয়। অবস্থানের স্থানাঙ্ক উইন্ডোজের সময় অঞ্চল পরিবর্তন করে না।','Personalise Prayer Times':'নামাজের সময় অ্যাপ সাজান','English':'ইংরেজি','Bangla':'বাংলা','Optional minute offsets are applied after the calculation. Use these only when you have a trusted local timetable to compare against.':'হিসাবের পরে ঐচ্ছিক মিনিট সমন্বয় প্রয়োগ হয়। নির্ভরযোগ্য স্থানীয় সময়সূচির সঙ্গে মিলিয়ে তবেই ব্যবহার করুন।','When enabled, Prayer Times starts quietly in the system tray. This setting is optional and stays off until you enable it.':'চালু করলে অ্যাপটি সিস্টেম ট্রেতে নীরবে চালু হবে। আপনি নিজে চালু না করা পর্যন্ত সেটিংটি বন্ধ থাকবে।','Windows notification permission is requested only when you enable reminders. Prayer calculations and tracking work without it.':'আপনি স্মরণিকা চালু করলেই শুধু উইন্ডোজের বিজ্ঞপ্তির অনুমতি চাওয়া হবে। অনুমতি ছাড়াও সময় হিসাব ও নামাজ ট্র্যাকিং চলবে.',"Prayer history, preferences, themes and location stay in this application's local profile. Nothing is uploaded or synchronised.":'নামাজের ইতিহাস, পছন্দ, থিম ও অবস্থান অ্যাপের স্থানীয় প্রোফাইলে থাকে। কোনো তথ্য আপলোড বা সিঙ্ক করা হয় না।','Umm al-Qura estimate; local moon-sighting may differ.':'উম্মুল কুরা পদ্ধতির আনুমানিক তারিখ; স্থানীয় চাঁদ দেখার কারণে পার্থক্য হতে পারে।','The dawn prayer, performed after true dawn begins and before sunrise.':'সুবহে সাদিক শুরু হওয়ার পর এবং সূর্যোদয়ের আগে আদায় করা হয়।','The midday prayer, after the sun has passed its zenith and the prohibited solar-noon interval has ended.':'সূর্য মধ্যাকাশ অতিক্রম ও নিষিদ্ধ সময় শেষ হওয়ার পর আদায় করা হয়।','The afternoon prayer. This application uses the Hanafi shadow-factor-two criterion.':'বিকেলের নামাজ। এই অ্যাপে হানাফি ছায়ার অনুপাত দুই অনুসরণ করা হয়।','The sunset prayer, beginning after the sun has set.':'সূর্যাস্তের পর মাগরিবের সময় শুরু হয়.',"The night prayer, beginning when the selected calculation method's twilight criterion is reached.":'নির্বাচিত হিসাব পদ্ধতির গোধূলির মান পূর্ণ হলে ইশার সময় শুরু হয়।','A morning voluntary prayer after sunrise, once the short prohibited interval after sunrise has passed, and before solar noon.':'সূর্যোদয়ের নিষিদ্ধ সময় পার হওয়ার পর থেকে সৌর মধ্যাহ্নের আগে আদায় করা সকালের নফল নামাজ.',"A voluntary prayer commonly performed after Maghrib and before Isha. Its classification and recommended rak'ahs vary among scholarly traditions.":'মাগরিবের পর ও ইশার আগে প্রচলিত নফল নামাজ। এর শ্রেণিবিন্যাস ও রাকাতসংখ্যা নিয়ে আলেমদের মতভেদ রয়েছে।','Voluntary night prayer after Isha and before Fajr.':'ইশার পর থেকে ফজরের আগে পর্যন্ত নফল রাতের নামাজ.','Night prayer performed after sleep; this application highlights the final third of the night as a practical time window.':'ঘুমিয়ে উঠে আদায় করা রাতের নামাজ; অ্যাপে রাতের শেষ এক-তৃতীয়াংশকে বিশেষ সময় হিসেবে দেখানো হয়.',"Night prayer associated with Ramadan, performed after Isha. It is shown only when the device's built-in Islamic date calculation indicates a Ramadan night.":'রমজানের রাতে ইশার পর আদায় করা রাতের নামাজ। ডিভাইসের হিজরি হিসাব রমজান দেখালেই এটি দেখানো হয়।','The special congregational prayer on Eid al-Fitr and Eid al-Adha, within its morning time window.':'ঈদুল ফিতর ও ঈদুল আজহার বিশেষ জামাত; শুধু সকালের নির্ধারিত সময়ে আদায় করা হয়।','The regular Sunnah prayers associated with the five obligatory prayers.':'পাঁচ ওয়াক্ত ফরজ নামাজের সঙ্গে সংশ্লিষ্ট নিয়মিত সুন্নাত নামাজ.','Friday congregational prayer in place of Dhuhr for those upon whom it is obligatory.':'যাদের ওপর ফরজ, তাদের জন্য শুক্রবার যোহরের পরিবর্তে জামাতে আদায় করা নামাজ.'
};
Object.assign(BN_TEXT, {
  'Other voluntary prayers':'অন্যান্য নফল নামাজ','WHEN PRAYER IS PERMITTED':'নামাজ বৈধ থাকলে','+2 rak‘ahs':'+২ রাকাত','Undo prayer':'নামাজ বাতিল','0 nafl rak‘ahs':'০ রাকাত নফল','Reflection of time':'সময়ের ভাবনা','PREFERRED TIME':'উত্তম সময়','Preferred window is ahead':'উত্তম সময় আসছে','Preferred window is open':'উত্তম সময় চলছে','Preferred window has passed':'উত্তম সময় পার হয়েছে','No separate preferred period':'আলাদা উত্তম সময় নেই','MAIN PRAYER COUNTDOWN':'নামাজের গণনা','No separate preferred period is recorded for this event.':'এই ইভেন্টের জন্য আলাদা উত্তম সময় লিপিবদ্ধ নেই।','ASTROLABE':'আসট্রোলেব','CELESTIAL OBSERVATORY':'আসট্রোলেব','Solar and lunar positions':'সূর্য ও চাঁদের অবস্থান','Alhamdulillah':'আলহামদুলিল্লাহ',
  'Prayer times are calculated on this device':'নামাজের সময় এই ডিভাইসেই হিসাব করা হয়',
  'Complete the five obligatory prayers to earn your daily achievement.':'দৈনিক লক্ষ্য পূরণে পাঁচ ওয়াক্ত ফরজ নামাজ আদায় করুন।',
  'Time until the next prayer':'পরবর্তী নামাজের বাকি সময়','Calculated on this device · Prayer records stay on this device':'এই ডিভাইসে হিসাব করা হয় · নামাজের রেকর্ড এই ডিভাইসেই থাকে',
  'Expanded Google Maps links with coordinates work offline. Shortened share links cannot be expanded offline; copy coordinates from Maps or enter them below.':'স্থানাঙ্কসহ Google Maps লিংক অফলাইনে পড়া যায়। সংক্ষিপ্ত লিংক অফলাইনে খোলা যায় না; Maps থেকে স্থানাঙ্ক কপি করে লিখুন।',
  'Currently saved location':'বর্তমানে সংরক্ষিত অবস্থান',
  'University of Islamic Sciences, Karachi · Fajr 18° / Isha 18°':'ইউনিভার্সিটি অব ইসলামিক সায়েন্সেস, করাচি · ফজর ১৮° / ইশা ১৮°',
  'Hanafi · shadow factor 2':'হানাফি · ছায়ার অনুপাত ২','True solar noon · six-minute prohibited interval':'প্রকৃত সৌর মধ্যাহ্ন · ছয় মিনিটের নিষিদ্ধ সময়',
  "Prayer calculations follow the device's local time zone. Location coordinates do not change Windows time-zone settings.":'নামাজের সময় ডিভাইসের স্থানীয় সময় অঞ্চল অনুযায়ী হিসাব হয়। অবস্থানের স্থানাঙ্ক উইন্ডোজের সময় অঞ্চল পরিবর্তন করে না।',
  'Personalise Prayer Times':'নামাজের সময় অ্যাপ সাজান','English':'ইংরেজি','Bangla':'বাংলা',
  'Optional minute offsets are applied after the calculation. Use these only when you have a trusted local timetable to compare against.':'হিসাবের পরে ঐচ্ছিক মিনিট সমন্বয় প্রয়োগ হয়। নির্ভরযোগ্য স্থানীয় সময়সূচির সঙ্গে মিলিয়ে তবেই ব্যবহার করুন।',
  'When enabled, Prayer Times starts quietly in the system tray. This setting is optional and stays off until you enable it.':'চালু করলে অ্যাপটি সিস্টেম ট্রেতে নীরবে চালু হবে। আপনি নিজে চালু না করা পর্যন্ত সেটিংটি বন্ধ থাকবে।',
  'Windows notification permission is requested only when you enable reminders. Prayer calculations and tracking work without it.':'আপনি স্মরণিকা চালু করলেই শুধু উইন্ডোজের বিজ্ঞপ্তির অনুমতি চাওয়া হবে। অনুমতি ছাড়াও সময় হিসাব ও নামাজ ট্র্যাকিং চলবে।',
  "Prayer history, preferences, themes and location stay in this application's local profile. Nothing is uploaded or synchronised.":'নামাজের ইতিহাস, পছন্দ, থিম ও অবস্থান অ্যাপের স্থানীয় প্রোফাইলে থাকে। কোনো তথ্য আপলোড বা সিঙ্ক করা হয় না।',
  'Predicted by crescent visibility':'নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী',
  'Umm al-Qura estimate; local moon-sighting may differ.':'উম্মুল কুরা পদ্ধতির আনুমানিক তারিখ; স্থানীয় চাঁদ দেখার কারণে পার্থক্য হতে পারে।',
  'The dawn prayer, performed after true dawn begins and before sunrise.':'সুবহে সাদিক শুরু হওয়ার পর এবং সূর্যোদয়ের আগে আদায় করা হয়।',
  'The midday prayer, after the sun has passed its zenith and the prohibited solar-noon interval has ended.':'সূর্য মধ্যাকাশ অতিক্রম ও নিষিদ্ধ সময় শেষ হওয়ার পর আদায় করা হয়।',
  'The afternoon prayer. This application uses the Hanafi shadow-factor-two criterion.':'বিকেলের নামাজ। এই অ্যাপে হানাফি ছায়ার অনুপাত দুই অনুসরণ করা হয়।',
  'The sunset prayer, beginning after the sun has set.':'সূর্যাস্তের পর মাগরিবের সময় শুরু হয়।',
  "The night prayer, beginning when the selected calculation method's twilight criterion is reached.":'নির্বাচিত হিসাব পদ্ধতির গোধূলির মান পূর্ণ হলে ইশার সময় শুরু হয়।',
  'A morning voluntary prayer after sunrise, once the short prohibited interval after sunrise has passed, and before solar noon.':'সূর্যোদয়ের নিষিদ্ধ সময় পার হওয়ার পর থেকে সৌর মধ্যাহ্নের আগে আদায় করা সকালের নফল নামাজ।',
  "A voluntary prayer commonly performed after Maghrib and before Isha. Its classification and recommended rak'ahs vary among scholarly traditions.":'মাগরিবের পর ও ইশার আগে প্রচলিত নফল নামাজ। এর শ্রেণিবিন্যাস ও রাকাতসংখ্যা নিয়ে আলেমদের মতভেদ রয়েছে।',
  'Voluntary night prayer after Isha and before Fajr.':'ইশার পর থেকে ফজরের আগে পর্যন্ত নফল রাতের নামাজ।',
  'Night prayer performed after sleep; this application highlights the final third of the night as a practical time window.':'ঘুমিয়ে উঠে আদায় করা রাতের নামাজ; অ্যাপে রাতের শেষ এক-তৃতীয়াংশকে বিশেষ সময় হিসেবে দেখানো হয়।',
  "Night prayer associated with Ramadan, performed after Isha. It is shown only when the device's built-in Islamic date calculation indicates a Ramadan night.":'রমজানের রাতে ইশার পর আদায় করা রাতের নামাজ। ডিভাইসের হিজরি হিসাব রমজান দেখালেই এটি দেখানো হয়।',
  'The special congregational prayer on Eid al-Fitr and Eid al-Adha, within its morning time window.':'ঈদুল ফিতর ও ঈদুল আজহার বিশেষ জামাত; শুধু সকালের নির্ধারিত সময়ে আদায় করা হয়।',
  'The regular Sunnah prayers associated with the five obligatory prayers.':'পাঁচ ওয়াক্ত ফরজ নামাজের সঙ্গে সংশ্লিষ্ট নিয়মিত সুন্নাত নামাজ।',
  'Friday congregational prayer in place of Dhuhr for those upon whom it is obligatory.':'যাদের ওপর ফরজ, তাদের জন্য শুক্রবার যোহরের পরিবর্তে জামাতে আদায় করা নামাজ।'
});


Object.assign(BN_TEXT, {
  'PRAYER COUNTDOWN':'নামাজের কাউন্টডাউন','Sunrise':'সূর্যোদয়','Zawal exclusion':'জাওয়ালের নিষিদ্ধ সময়','Sunset':'সূর্যাস্ত',
  'Ishraq / Duha':'ইশরাক / দুহা','Awwabin':'আওয়াবিন','Qiyam al-Layl':'কিয়ামুল লাইল','Tahajjud':'তাহাজ্জুদ','Tarawih':'তারাবিহ','Eid prayer':'ঈদের নামাজ','Witr':'বিতর','Jumu’ah':'জুমুআ','Regular Sunnah prayers (Rawatib)':'নিয়মিত সুন্নাতে রাতিবাহ','Tahiyyat al-Masjid':'তাহিয়্যাতুল মসজিদ','Salat al-Istikhara':'সালাতুল ইস্তিখারা','Salat al-Tawbah':'নামাজুত তওবা',
  'No specific historical event is listed for today':'আজকের জন্য নির্দিষ্ট কোনো ঐতিহাসিক ঘটনা তালিকাভুক্ত নেই','Continue regular worship; no special prayer is assigned without reliable evidence.':'নিয়মিত ইবাদতই যথেষ্ট; নির্ভরযোগ্য দলিল ছাড়া বিশেষ নামাজ নির্ধারণ করা হয়নি।',
  'No additional voluntary prayer period is scheduled for this date.':'এই তারিখে অতিরিক্ত নফল নামাজের সময় নির্ধারিত নেই।','events':'ইভেন্ট','event':'ইভেন্ট',
  'Prayer marked complete':'নামাজ পড়া হলো, টিক পড়ল','This prayer event is not currently available.':'এই নামাজের সময় এখন উপলভ্য নয়।',
  'Could not save local data. Check available disk space.':'স্থানীয় তথ্য সংরক্ষণ করা যায়নি। ডিভাইসে পর্যাপ্ত জায়গা আছে কি না দেখুন।',
  'Paste a Google Maps share link first.':'প্রথমে Google Maps শেয়ার লিংক পেস্ট করুন।','Enter a valid Google Maps HTTPS link.':'সঠিক Google Maps HTTPS লিংক দিন অথবা সরাসরি স্থানাঙ্ক লিখুন।',
  'Short-link lookup is available in the installed desktop app. You can always enter coordinates manually.':'সংক্ষিপ্ত লিংক যাচাই শুধু ইনস্টল করা ডেস্কটপ অ্যাপে সম্ভব। চাইলে স্থানাঙ্ক সরাসরি লিখতে পারেন।',
  'Following the Google Maps redirect once. No account sign-in is used.':'Google Maps লিংকটি একবার যাচাই করা হচ্ছে। কোনো অ্যাকাউন্টে সাইন-ইন করা হবে না।',
  'Could not resolve this share link. Open it in Maps, copy the coordinates, or enter them manually.':'এই শেয়ার লিংক থেকে অবস্থান পাওয়া যায়নি। Maps-এ খুলে স্থানাঙ্ক কপি করুন অথবা হাতে লিখুন।',
  'The link did not contain valid coordinates.':'লিংকে বৈধ স্থানাঙ্ক পাওয়া যায়নি।','Location saved locally on this device.':'অবস্থান এই ডিভাইসে সংরক্ষিত হয়েছে।',
  'Enter valid coordinates: latitude −90 to 90, longitude −180 to 180.':'সঠিক স্থানাঙ্ক দিন: অক্ষাংশ −৯০ থেকে ৯০, দ্রাঘিমাংশ −১৮০ থেকে ১৮০।',
  'Location saved':'অবস্থান সংরক্ষিত','Prayer reminders disabled':'নামাজের স্মরণিকা বন্ধ','Prayer reminders enabled':'নামাজের স্মরণিকা চালু',
  'Windows startup disabled':'উইন্ডোজ চালুর সঙ্গে অ্যাপ চালু বন্ধ করা হয়েছে','Could not update Windows startup setting':'উইন্ডোজ স্টার্টআপ সেটিং পরিবর্তন করা যায়নি',
  'Windows notification permission was not granted':'উইন্ডোজ বিজ্ঞপ্তির অনুমতি দেওয়া হয়নি','Send test notification':'পরীক্ষামূলক বিজ্ঞপ্তি পাঠান','HOME PAGE':'হোম পেজ','Sections on the home page':'হোম পেজের বিভাগ','Show Prayer descriptions':'নামাজের বিবরণ দেখান','Show the Qur’an':'কুরআন দেখান','Show Sunnah and Seerah':'সুন্নাহ ও সীরাত দেখান','Show On this day in Islamic history':'ইসলামের ইতিহাসে আজকের দিন দেখান','Hidden sections are not drawn and do no work. All are shown by default; your choice is remembered on this device.':'লুকানো বিভাগ আঁকা হয় না এবং কোনো কাজ করে না। ডিফল্টে সবই দেখানো হয়; আপনার পছন্দ এই ডিভাইসে মনে রাখা হয়।',"Today's prohibited intervals":'আজকের নিষিদ্ধ সময়','Shows a real Windows notification now, with the reason if Windows refuses it.':'এখনই একটি আসল উইন্ডোজ বিজ্ঞপ্তি দেখায়; উইন্ডোজ না দেখালে কারণসহ জানায়।','Will start with Windows':'উইন্ডোজ চালুর সঙ্গে অ্যাপ চালু হবে',
  'Adjustment must be between −30 and +30 minutes':'সমন্বয় −৩০ থেকে +৩০ মিনিটের মধ্যে হতে হবে','Local data reset':'স্থানীয় তথ্য মুছে ফেলা হয়েছে',
  'Delete all locally stored settings and prayer history? The application will return to its default location.':'স্থানীয়ভাবে সংরক্ষিত সব সেটিংস ও নামাজের ইতিহাস মুছবেন? অ্যাপটি ডিফল্ট অবস্থানে ফিরে যাবে।',
  'Prayer times are unavailable':'নামাজের সময় পাওয়া যায়নি','Begins':'শুরু','Ends':'শেষ','Time remaining':'বাকি সময়','Begins in':'শুরু হতে বাকি','This prayer period has ended':'এই নামাজের সময় শেষ হয়েছে',
  'Hanafi':'হানাফি','Karachi':'করাচি','Device local time':'ডিভাইসের স্থানীয় সময়','Device':'ডিভাইস'
});


Object.assign(BN_TEXT, {
  "TODAY'S PROGRESS":'আজকের অগ্রগতি','METHOD':'হিসাবের পদ্ধতি','6 min':'৬ মিনিট',
  'Obsidian':'অবসিডিয়ান','Midnight':'মিডনাইট','Forest':'ফরেস্ট','Burgundy':'বারগান্ডি','Graphite':'গ্রাফাইট','Porcelain':'পর্সেলিন','Ivory':'আইভরি','Mist Blue':'মিস্ট ব্লু','Sage':'সেজ','Rose':'রোজ','dark':'গাঢ়','light':'হালকা',
  'Islamic New Year':'ইসলামি নববর্ষ','Start of Muharram':'মুহাররমের শুরু','Day before Ashura (Tasu’a)':'আশুরার আগের দিন (তাসুআ)','9 Muharram':'৯ মুহাররম','Day of Ashura':'আশুরার দিন','10 Muharram':'১০ মুহাররম','Mawlid an-Nabi':'মাওলিদুন্নবী','Observance varies among Muslim communities':'মুসলিম সম্প্রদায়ভেদে পালন ভিন্ন','Isra and Mi’raj':'ইসরা ও মিরাজ','27 Rajab':'২৭ রজব','Mid-Sha’ban':'মধ্য শাবান','15 Sha’ban':'১৫ শাবান','Start of Ramadan':'রমজানের শুরু','The month of fasting':'সিয়ামের মাস','Battle of Badr':'বদরের যুদ্ধ','17 Ramadan':'১৭ রমজান','Laylat al-Qadr (commonly observed)':'লাইলাতুল কদর (প্রচলিত তারিখ)','The Night of Decree; the exact night is not fixed':'শবে কদর; নির্দিষ্ট রাত নিশ্চিত নয়','Eid al-Fitr':'ঈদুল ফিতর','1 Shawwal':'১ শাওয়াল','Six days of Shawwal':'শাওয়ালের ছয় রোজা','Optional fasting; dates may vary by local practice':'নফল রোজা; স্থানীয় আমলভেদে তারিখ ভিন্ন হতে পারে','Day of Arafah':'আরাফার দিন','9 Dhul Hijjah':'৯ জিলহজ','Eid al-Adha':'ঈদুল আজহা','10 Dhul Hijjah':'১০ জিলহজ','Last ten nights of Ramadan':'রমজানের শেষ দশ রাত','Seek Laylat al-Qadr in the odd-numbered nights':'বিজোড় রাতে লাইলাতুল কদর অনুসন্ধান করুন','First ten days of Dhul Hijjah':'জিলহজের প্রথম দশ দিন','Among the most significant days of the Islamic year':'ইসলামি বছরের সর্বাধিক মর্যাদাপূর্ণ দিনগুলোর অন্তর্ভুক্ত',
  'Day before Ashura (Tasu’a) · 9 Muharram':'আশুরার আগের দিন (তাসুআ) · ৯ মুহাররম',
  'Time left':'বাকি সময়','Prayer countdown':'নামাজের কাউন্টডাউন'
});

Object.assign(BN_TEXT, {
  'Obligatory prayers':'ফরজ নামাজ','Daily voluntary prayers':'দৈনিক নফল নামাজ','Situational voluntary prayers':'পরিস্থিতিভিত্তিক নফল নামাজ','Seasonal prayer events':'মৌসুমি নামাজ','Sunnah and Seerah':'সুন্নাহ ও সীরাত','Sunnah & Seerah':'সুন্নাহ ও সীরাত',
  'On this day in Islamic history':'ইসলামের ইতিহাসে আজকের দিন','Islamic History':'ইসলামের ইতিহাস',
  'Dated events and historical context':'তারিখভিত্তিক ঘটনা ও ঐতিহাসিক প্রেক্ষাপট',
  'Prophetic guidance and daily life':'নববী নির্দেশনা ও দৈনন্দিন জীবন',
  'The beginning of Qur’anic revelation':'কুরআনের প্রথম ওহি',
  'The first revelation':'প্রথম ওহি','Exact historical date match':'নির্দিষ্ট ঐতিহাসিক তারিখের মিল',
  'Historical match by week of the month':'মাসের একই সপ্তাহের ঐতিহাসিক মিল',
  'Historical match by month':'মাসভিত্তিক ঐতিহাসিক মিল',
  'Closest documented historical period':'নিকটতম নথিভুক্ত ঐতিহাসিক সময়',
  'Matches today’s Hijri date.':'আজকের হিজরি তারিখের সঙ্গে মিলে গেছে।',
  'No event is documented for today’s exact date; this is the nearest verified historical anniversary, not a claim that it happened today.':'আজকের নির্দিষ্ট তারিখে কোনো ঘটনা নথিভুক্ত নেই; এটি নিকটতম যাচাইযোগ্য ঐতিহাসিক বার্ষিকী, আজ ঘটেছে এমন দাবি নয়।',
  'Recite in the name of your Lord who created.':'পড়ুন আপনার রবের নামে, যিনি সৃষ্টি করেছেন।',
  'Continue with Surah al-‘Alaq 96:2–5.':'এরপর সূরা আল-আলাক ৯৬:২–৫ পড়তে পারেন।',
  '© 2026–2027':'© ২০২৬–২০২৭','Salman Reza Amit':'সালমান রেজা অমিত','© 2026–2027 Salman Reza Amit':'© ২০২৬–২০২৭ সালমান রেজা অমিত',
  'Calculated on this device · Prayer records stay on this device':'এই ডিভাইসে হিসাব করা হয় · নামাজের রেকর্ড এই ডিভাইসেই থাকে',
  'Keyboard shortcuts':'কিবোর্ড শর্টকাট','Toggle fullscreen':'পূর্ণপর্দা চালু বা বন্ধ করুন',
  'Exit fullscreen or close this panel':'পূর্ণপর্দা থেকে বের হন অথবা এই প্যানেল বন্ধ করুন',
  'Return to the top of the home page':'মূল পাতার একদম ওপরে যান','Scroll up one screen':'এক পর্দা ওপরে যান',
  'Scroll down one screen':'এক পর্দা নিচে যান','Go to the bottom of the page':'পাতার একদম নিচে যান',
  'Show these shortcuts':'এই শর্টকাটগুলো দেখান',
  'Exit fullscreen, go back, or close this panel':'পূর্ণপর্দা থেকে বের হন, পেছনে যান অথবা এই প্যানেল বন্ধ করুন',
  'Show or hide these shortcuts':'এই শর্টকাটগুলো দেখান বা লুকান',
  'Previous or next item in a focused card':'নির্বাচিত কার্ডে আগের বা পরের বিষয়',
  'Activate the focused button or tick circle':'নির্বাচিত বোতাম বা টিক-বৃত্ত চালু করুন',
  'Move between controls':'নিয়ন্ত্রণগুলোর মধ্যে সরে যান',
  'Close shortcuts':'শর্টকাট বন্ধ করুন','Sunnah':'সুন্নাত','Clock format':'ঘড়ির ধরন','Font':'ফন্ট','24-hour (17:05)':'২৪ ঘণ্টা (১৭:০৫)','12-hour (5:05 PM)':'১২ ঘণ্টা (বিকাল ৫:০৫)','Calculation method':'হিসাব পদ্ধতি','School (Asr method)':'মাযহাব (আসর পদ্ধতি)','High-latitude rule':'উচ্চ অক্ষাংশ নিয়ম','Calculation profile updated':'হিসাব প্রোফাইল হালনাগাদ হয়েছে','Date-specific':'বিশেষ দিনের নামাজ','Tick sound':'টিক শব্দ','Wooden':'কাঠের','Soft':'নরম','Crystal':'স্ফটিক','Nafl':'নফল','Other voluntary':'অন্যান্য নফল ইবাদত','Sunnah marked complete':'সুন্নাত সম্পন্ন হিসেবে চিহ্নিত','Nafl marked complete':'নফল সম্পন্ন হিসেবে চিহ্নিত','All Sunnah prayers complete':'সব সুন্নাত সম্পন্ন','All prayer-linked Nafl complete':'নামাজ-সংশ্লিষ্ট সব নফল সম্পন্ন',
  'Remind me before a prayer begins':'নামাজের সময় শুরুর আগে মনে করিয়ে দিন',
  'Enter any whole number of minutes from 0 to 180 for each obligatory prayer. 0 turns that reminder off.':'প্রতিটি ফরজ নামাজের জন্য ০ থেকে ১৮০-এর মধ্যে যেকোনো পূর্ণ সংখ্যায় মিনিট লিখুন। ০ দিলে সেই স্মরণিকা বন্ধ থাকবে।',
  'Enter whole minutes from 0 to 180':'০ থেকে ১৮০-এর মধ্যে পূর্ণ সংখ্যায় মিনিট লিখুন','Previous item':'আগেরটি','Next item':'পরেরটি',
  'Fullscreen mode is unavailable':'পূর্ণপর্দা মোড উপলভ্য নয়',
  'Play a short tick sound when a prayer is marked complete':'নামাজ সম্পন্ন চিহ্নিত করলে ছোট টিক শব্দ বাজান',
  'Prayer completion progress':'নামাজ সম্পন্নের অগ্রগতি',
  'Date-specific prayers':'তারিখভিত্তিক নামাজ',
  'Islamic history items':'ইসলামের ইতিহাসের বিষয়সমূহ','Qur’anic verses':'কুরআনের আয়াতসমূহ',
  'Sunnah observances':'সুন্নাহ আমলসমূহ','Seerah glimpses':'সীরাতের ঝলক','Seasonal prayer descriptions':'মৌসুমি নামাজের বিবরণ',
  'Set your location with a Google Maps link or coordinates first.':'প্রথমে Google Maps লিংক বা স্থানাঙ্ক দিয়ে আপনার অবস্থান নির্ধারণ করুন।'
});

Object.assign(BN_TEXT, {
  'Remind me before a prayer period ends':'নামাজের সময় শেষ হওয়ার আগে স্মরণ করান',
  'Choose a separate lead time for each event. Select Off to disable an individual reminder.':'প্রতিটি নামাজের জন্য আলাদা সময় নির্ধারণ করুন। বন্ধ করলে সেই স্মরণিকা নিষ্ক্রিয় থাকবে।',
  'Off':'বন্ধ','min before':'মিনিট আগে','Qur’anic revelation on this date':'এই তারিখে নাজিল হওয়া কুরআনের আয়াত',
  'Only exact, historically documented revelation dates are shown.':'শুধু নির্দিষ্ট ও ঐতিহাসিকভাবে নথিভুক্ত অবতরণের তারিখ দেখানো হয়।',
  'No exact revelation date is reliably documented for this date':'এই তারিখে ওহি নাজিলের নির্দিষ্ট ও নির্ভরযোগ্য তারিখ নথিভুক্ত নেই',
  'A surah’s general chronology or its association with an event is not treated as proof of the exact day of revelation.':'কোনো সূরার সাধারণ অবতরণ-ক্রম বা ঘটনার সঙ্গে সম্পর্ককে নির্দিষ্ট দিনের প্রমাণ হিসেবে ধরা হয় না।',
  'Mark prayer event complete':'নামাজের ইভেন্ট সম্পন্ন করুন',
  'LOCAL TIME':'স্থানীয় সময়',
  'Open the time and preferred period':'সময় ও উত্তম সময়ের পাতা খুলুন',
  'Open prayer countdown':'নামাজের কাউন্টডাউন খুলুন',
  'Location not set':'অবস্থান নির্ধারণ করুন',
  'Location not configured':'অবস্থান সেট করা হয়নি',
  'Local timetable · Hanafi Asr':'স্থানীয় সময়সূচি · হানাফি আসর',
  'No recorded prayers':'কোনো রেকর্ড নেই',
  'No completed prayer records are stored for this day.':'এই দিনের জন্য কোনো সম্পন্ন সালাত রেকর্ড করা হয়নি।',
  'OBLIGATORY PRAYER':'ফরজ নামাজ',
  'DAILY VOLUNTARY PRAYER':'দৈনিক নফল নামাজ',
  'SITUATIONAL PRAYER':'পরিস্থিতিভিত্তিক সালাত',
  'OTHER VOLUNTARY NAFL':'অন্যান্য নফল',
  'Undo record':'রেকর্ড সংশোধন',
  'Recording only. The prayer time has ended.':'শুধু রেকর্ড। নামাজের সময় শেষ।',
  'TIME LEFT':'বাকি সময়',
  'ENDS IN':'শেষ হতে বাকি',
  'FORBIDDEN TIME':'নিষিদ্ধ সময়',
  'DISLIKED TIME':'মাকরুহ সময়',
  'RECORDED TODAY':'আজ যা রেকর্ড হয়েছে',
  'Completion summaries':'সম্পন্নের সারাংশ',
  'DAILY RECORD':'দৈনিক রেকর্ড',
  'Prayer record':'নামাজের রেকর্ড',
  'No rak‘ahs':'রাকাত প্রযোজ্য নয়',
  'All praise is due to Allah':'সমস্ত প্রশংসা আল্লাহর',
  'Thanks be to Allah':'আল্লাহর শুকরিয়া',
  'What Allah has willed':'আল্লাহ যা চেয়েছেন',
  'Blessed is Allah':'আল্লাহ কত বরকতময়',
  'Glory be to Allah':'আল্লাহ পবিত্র',
  'Allah is the Greatest':'আল্লাহ সবচেয়ে মহান',
  'May Allah reward you with goodness':'আল্লাহ আপনাকে উত্তম প্রতিদান দিন',
  'Shukran Lillah':'শুকরান লিল্লাহ',
  'Mashallah':'মাশাআল্লাহ',
  'Tabarakallah':'তাবারাকাল্লাহ',
  'Subhanallah':'সুবহানাল্লাহ',
  'Allahu Akbar':'আল্লাহু আকবার',
  'Jazakallahu Khayran':'জাযাকাল্লাহু খাইরান',
  'Settings':'সেটিংস',
  'RECOGNITION':'প্রশংসার বাক্য',
  'RECOVERY':'পুনরুদ্ধার',
  'Close prayer information':'নামাজের তথ্য বন্ধ করুন',
  'Close shortcuts':'শর্টকাট বন্ধ করুন',
  'Use link':'লিংক ব্যবহার করুন',
  'Choose backup':'ব্যাকআপ বাছাই',
  'Replace':'প্রতিস্থাপন',
  'Merge':'মিলিয়ে নিন',
  'Hold to recover a record':'রেকর্ড ফেরাতে চেপে ধরুন',
  'Record it':'রেকর্ড করুন',
  'Send test notification':'পরীক্ষামূলক বিজ্ঞপ্তি পাঠান',
  'I performed this prayer but forgot to record it.':'আমি এই নামাজ পড়েছি, কিন্তু রেকর্ড করতে ভুলে গেছি।',
  'How long a non-Fard phrase stays':'ফরজ ছাড়া বাক্য কতক্ষণ থাকবে',
  'Fard phrases keep their fixed times. These two numbers are seconds, and they apply only to Sunnah and Nafl phrases.':'ফরজের বাক্যের সময় নির্দিষ্ট। এই দুটি সংখ্যা সেকেন্ড, শুধু সুন্নাত ও নফলের বাক্যের জন্য।',
  'Seconds per Sunnah':'প্রতি সুন্নাতে সেকেন্ড',
  'Seconds per Nafl':'প্রতি নফলে সেকেন্ড',
  'Prayer Completion Recovery':'নামাজের রেকর্ড পুনরুদ্ধার',
  'Only for a prayer you performed and forgot to record. It is not a missed-prayer tool. The two Fard prayers just before it must already be recorded. Press and hold for three seconds, then confirm.':'শুধু সেই নামাজের জন্য যা আপনি পড়েছেন কিন্তু রেকর্ড করতে ভুলে গেছেন। এটি ছুটে যাওয়া নামাজের হিসাব নয়। ঠিক আগের দুই ফরজ আগেই রেকর্ড থাকতে হবে। তিন সেকেন্ড চেপে ধরে তারপর নিশ্চিত করুন।',
  'Locked prayer':'লক হওয়া নামাজ',
  'Remind me before a prayer period ends':'নামাজের সময় শেষ হওয়ার আগে স্মরণ করান',
  'Remind me before a prayer begins':'নামাজের সময় শুরুর আগে মনে করিয়ে দিন',
  'Start Prayer Times when Windows starts':'উইন্ডোজ চালু হলে প্রেয়ার টাইমস চালু করুন',
  'Enable Windows prayer notifications':'উইন্ডোজে নামাজের বিজ্ঞপ্তি চালু করুন',
  'Play a short tick sound when a prayer is marked complete':'নামাজ সম্পন্ন চিহ্নিত করলে ছোট টিক শব্দ বাজান',
  'Colour theme':'রঙের থিম',
  'Compact desktop mode':'কমপ্যাক্ট ডেস্কটপ মোড',
  'High-latitude rule':'উচ্চ অক্ষাংশ নিয়ম',
  'School (Asr method)':'মাযহাব (আসর পদ্ধতি)',
  'Google Maps sharing link':'Google Maps শেয়ার লিংক',
  'Expanded Google Maps links containing coordinates are read offline. Shortened share links cannot be expanded offline; copy the coordinates from Maps or enter them below. Location data is stored only on this device.':'স্থানাঙ্কসহ Google Maps লিংক অফলাইনে পড়া যায়। সংক্ষিপ্ত লিংক অফলাইনে খোলা যায় না; Maps থেকে স্থানাঙ্ক কপি করে নিচে লিখুন। অবস্থানের তথ্য শুধু এই ডিভাইসে থাকে।',
  'e.g. 23.8103':'যেমন ২৩.৮১০৩',
  'e.g. 90.4125':'যেমন ৯০.৪১২৫',
  'https://maps.app.goo.gl/…':'https://maps.app.goo.gl/…',
  'Rak‘ahs':'রাকাত',
  'Today':'আজ',
  'Prayer times are unavailable':'নামাজের সময় পাওয়া যায়নি',
  'No prayer event is currently in its time window.':'এই মুহূর্তে কোনো নামাজের নির্ধারিত সময় চলছে না।',
  'The next event is shown just below.':'এরপরেরটা নিচের কার্ডে দেখা যাচ্ছে।',
  'Solar and lunar positions':'সূর্য ও চাঁদের অবস্থান',
  'Astrolabe':'আসট্রোলেব',
  'OBLIGATORY':'ফরজ',
  'VOLUNTARY':'নফল',
  'Good Job!':'সাবাশ!',
  'Great Job!':'খুব ভালো!',
  'Keep going':'এগিয়ে যান',
  'Before sunset':'সূর্যাস্তের আগে',
  'Before sunset (disliked)':'সূর্যাস্তের আগে (মাকরুহ)',
  'Sunrise (disliked)':'সূর্যোদয় (মাকরুহ)',
  'Zawal (disliked)':'জাওয়াল (মাকরুহ)',
  'OPENS IN':'শুরু হতে',
  "RAK'AH COUNT":'রাকাত সংখ্যা',
  "RAK'AH SETS":'রাকাতের সেট',
  'Confirm rakah':'রাকাত নিশ্চিত',
  'Enter count':'সংখ্যা লিখুন',
  'Saved location':'সংরক্ষিত অবস্থান',
  'Fard':'ফরজ',
  'Current':'এখন',
  'No obligatory prayer window is active':'কোনো ফরজ নামাজের সময় চলছে না'
});

/* v2.0.1 */
Object.assign(BN_TEXT, {
  'Mark completed':'সম্পন্ন করুন',
  'Add extra nafl in sets of two rak‘ahs whenever prayer is permitted.':'নামাজ বৈধ থাকলে যেকোনো সময়ে দুই রাকাতের সেটে অতিরিক্ত নফল যোগ করুন।'
});

function roughBangla(text) {
  let out = text;
  const keys = Object.keys(BN_TEXT).filter(key => key.length >= 4).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    let from = 0;
    const value = BN_TEXT[key];
    if (!value || value === key) continue;
    while (out.includes(key, from)) {
      const at = out.indexOf(key, from);
      const before = at > 0 ? out[at - 1] : '';
      const after = out[at + key.length] || '';
      if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) { from = at + 1; continue; }
      out = `${out.slice(0, at)}${value}${out.slice(at + key.length)}`;
      from = at + value.length;
    }
  }
  return out.replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
}

/* v2.1.0 interface strings */
Object.assign(BN_TEXT, {
  'Preferred prayer time reminders':'উত্তম সময়ের রিমাইন্ডার',
  'For prayers that have a preferred time inside their window. Times come from your calculation profile; each reminder has its own switch and its own tab.':'যে নামাজের ওয়াক্তের ভেতরে উত্তম সময় আছে, শুধু সেগুলোর জন্য। সময় আপনার হিসাব-পদ্ধতি থেকে আসে; প্রতিটি রিমাইন্ডারের নিজস্ব সুইচ ও নিজস্ব ট্যাব আছে।',
  'Before preferred time begins':'উত্তম সময় শুরুর আগে',
  'Before preferred time ends':'উত্তম সময় শেষের আগে',
  'Remind me before the preferred time begins':'উত্তম সময় শুরুর আগে আমাকে মনে করিয়ে দিন',
  'Remind me before the preferred time ends':'উত্তম সময় শেষের আগে আমাকে মনে করিয়ে দিন',
  'Fard phrases keep their fixed times. These numbers are seconds, and they apply only to Sunnah, Nafl and voluntary prayers.':'ফরজের বাক্য নির্দিষ্ট সময়ই থাকে। এই সংখ্যাগুলো সেকেন্ড, আর শুধু সুন্নাত, নফল ও ঐচ্ছিক নামাজে প্রযোজ্য।',
  'Recognition seconds per voluntary prayer':'প্রতিটি ঐচ্ছিক নামাজের জন্য স্বীকৃতির সেকেন্ড',
  'How long the reward text for a voluntary prayer stays after you press Mark Complete. Whole seconds from 1 to 120. It does not change Fard recognition.':'সম্পন্ন করুন চাপার পর ঐচ্ছিক নামাজের পুরস্কারের লেখা কত সময় থাকবে। ১ থেকে ১২০ পর্যন্ত পূর্ণ সেকেন্ড। এটি ফরজের স্বীকৃতি বদলায় না।',
  'REWARD TEXT':'পুরস্কারের লেখা',
  'Reward phrases':'পুরস্কারের বাক্য',
  'Show reward text':'পুরস্কারের লেখা দেখান',
  'A BLESSED REMINDER':'একটি বরকতময় স্মরণ',
  'Qur’an reading':'কুরআন পাঠ',
  'Show the reading progress line under the reminder':'স্মরণের নিচে পাঠের অগ্রগতি দেখান',
  'The whole Qur’an is read once each Hijri year: its 2,739 passages in mushaf order, about 7–8 a day, from 1 Muharram to the last day of Dhul Hijjah. A passage counts as read only when you mark it. The reading day changes at midnight in the time zone of your saved location.':'প্রতি হিজরি বছরে পুরো কুরআন একবার পড়া হয়: ২,৭৩৯টি অংশ মুসহাফের ক্রমে, দিনে প্রায় ৭–৮টি, ১ মুহাররম থেকে জিলহজের শেষ দিন পর্যন্ত। আপনি চিহ্ন দিলে তবেই একটি অংশ পড়া হয়েছে বলে গণ্য হয়। পড়ার দিন বদলায় সংরক্ষিত অবস্থানের সময় অঞ্চলের মধ্যরাতে।',
  'When this is on, a short phrase appears after you record a prayer, and the verse of the day appears on the progress disc once all five Fard are done.':'এটি চালু থাকলে নামাজ রেকর্ড করার পর একটি সংক্ষিপ্ত বাক্য দেখা যায়, আর পাঁচ ওয়াক্ত ফরজ হয়ে গেলে আজকের আয়াতটি অগ্রগতির বৃত্তে দেখা যায়।',
  'When this is on, a short phrase appears after you record a prayer. Once all five Fard are done, Qur’an 23:1 appears in its own card and then leaves.':'এটি চালু থাকলে নামাজ রেকর্ড করার পর একটি সংক্ষিপ্ত বাক্য দেখা যায়। পাঁচ ওয়াক্ত ফরজ হয়ে গেলে কুরআন ২৩:১ নিজের কার্ডে আসে, তারপর চলে যায়।',
  'Reward seconds':'পুরস্কার কতক্ষণ থাকবে',
  'How long the reward phrase stays after you record a prayer. Whole seconds from 1 to 120.':'নামাজ রেকর্ড করার পর পুরস্কারের বাক্য কতক্ষণ থাকবে। ১ থেকে ১২০ পর্যন্ত পূর্ণ সেকেন্ড।',
  'All five Fard verse':'পাঁচ ওয়াক্তের আয়াত',
  'How long Qur’an 23:1 stays after the fifth Fard is recorded. Whole seconds from 1 to 120.':'পঞ্চম ফরজ রেকর্ড হওয়ার পর কুরআন ২৩:১ কতক্ষণ থাকবে। ১ থেকে ১২০ পর্যন্ত পূর্ণ সেকেন্ড।',
  'Enter any whole number of minutes from 0 to 180. 0 turns that reminder off. Voluntary prayers appear here when they have their own start time. Sunnah Rawatib does not, because it is prayed with the five prayers.':'০ থেকে ১৮০ পর্যন্ত যেকোনো পূর্ণসংখ্যা লিখুন। ০ মানে সেই রিমাইন্ডার বন্ধ। নিজস্ব শুরুর সময় আছে এমন নফল নামাজ এখানে আসে। সুন্নাতে রাতিবাহ আসে না, কারণ সেটি পাঁচ ওয়াক্তের সঙ্গে পড়া হয়।',
  'Remaining in this prohibited time':'এই নিষিদ্ধ সময়ে বাকি',
  'Time left in this prohibited time':'এই নিষিদ্ধ সময়ে বাকি',
  'Back to prayers':'নামাজে ফিরে যান',
  "QUR'AN":'কুরআন',
  'HADITH':'হাদিস',
  "RAK'AHS":'রাকাত',
  'TODAY':'আজ মোট',
  'rak‘ahs recorded':'রাকাত রেকর্ড',
  'More than 11? Enter the total':'১১ রাকাতের বেশি হলে মোট সংখ্যা লিখুন',
  'More than 12 rak‘ahs? Enter the total':'১২ রাকাতের বেশি হলে সংখ্যা লিখুন',
  'Voluntary none yet':'ঐচ্ছিক এখনও নেই',

  'Astrolabe: drag to rotate, hold Shift for fine adjustment, arrow keys and mouse wheel for small steps, double-click to reset':'আসট্রোলেব: ঘোরাতে টানুন, সূক্ষ্ম সমন্বয়ে Shift ধরে রাখুন, ছোট ধাপের জন্য তীর কী ও মাউস হুইল, রিসেটে ডাবল-ক্লিক করুন',
  'Open the expanded clock page':'বড় ঘড়ির পাতা খুলুন',
  'Astrolabe controls':'আসট্রোলেবের নিয়ন্ত্রণ',
  'Rotate the astrolabe':'আসট্রোলেব ঘোরান',
  'Rotate the astrolabe: off (click to turn on)':'আসট্রোলেব ঘোরান: বন্ধ (চালু করতে ক্লিক করুন)',
  'Rotate the astrolabe: on (click to turn off)':'আসট্রোলেব ঘোরান: চালু (বন্ধ করতে ক্লিক করুন)',
  'Flip the astrolabe':'আসট্রোলেব উল্টান',
  'Flip the astrolabe (flipped)':'আসট্রোলেব উল্টান (এখন উল্টানো)',
  'Flip the astrolabe (not flipped)':'আসট্রোলেব উল্টান (এখন সোজা)'
});
Object.assign(BN_TEXT, {
  'Tick sound':'টিক শব্দ',
  'Tick style':'টিকের ধরন',
  'A Blessed Reminder':'একটি বরকতময় স্মরণ',
  'ABOUT THE TEXTS':'লেখার উৎস',
  'Sources and licences':'উৎস ও লাইসেন্স',
  'A Blessed Reminder shows the Saheeh International English translation and Muhiuddin Khan’s Bangla translation, stored in the app so it works offline. Its passages follow the 556 ruku’ sections and the juz’ boundaries of the Tanzil Quran Metadata (CC BY 3.0, tanzil.net). The English fonts (Inter, Manrope, Outfit, Plus Jakarta Sans, Fraunces, Lato, Nunito, Source Sans 3, IBM Plex Sans, Lora) and Hind Siliguri, Noto Sans Bengali, Noto Serif Bengali, Anek Bangla and Tiro Bangla are under the SIL Open Font License. Kalpurush, SolaimanLipi and Bornomala are OFL; Siyam Rupali and AdorshoLipi are GNU GPL. Li Ador Noirrit is not bundled because its licence forbids redistribution. The Hijri date and the sun and moon positions are worked out on this device with moon-sighting by Aric Camarata (MIT licence) and NASA JPL’s DE442S ephemeris, which is stored in the app; the time zone of the saved location is looked up offline with tz-lookup (CC0). Beyond the polar circles (latitude above 66.56° N or S), where some days have no sunset, the Hijri date is not predicted from the crescent: the Umm al-Qura calendar is used, without the “Predicted by crescent visibility” label. Full notices are in the LICENSES file.':'একটি বরকতময় স্মরণে সাহিহ ইন্টারন্যাশনালের ইংরেজি অনুবাদ এবং মুহিউদ্দিন খানের বাংলা অনুবাদ অফলাইনে রাখা হয়েছে। অংশগুলো তাঞ্জিল কুরআন মেটাডেটার ৫৫৬টি রুকু ও পারার সীমা অনুসরণ করে (CC BY 3.0, tanzil.net)। ইংরেজি ফন্টগুলো (Inter, Manrope, Outfit, Plus Jakarta Sans, Fraunces, Lato, Nunito, Source Sans 3, IBM Plex Sans, Lora) এবং হিন্দ শিলিগুড়ি, নোটো সান্স বাংলা, নোটো সেরিফ বাংলা, অনেক বাংলা ও তিরো বাংলা SIL Open Font License-এর আওতায়। কালপুরুষ, সোলায়মানলিপি ও বর্ণমালা OFL; সিয়াম রূপালি ও আদর্শলিপি GNU GPL। লি আদর নৈঋত যুক্ত করা হয়নি, কারণ এর লাইসেন্স পুনর্বিতরণ নিষেধ করে। হিজরি তারিখ এবং সূর্য ও চাঁদের অবস্থান এই ডিভাইসেই হিসাব করা হয় আরিক কামারাতার moon-sighting (MIT লাইসেন্স) এবং অ্যাপে রাখা নাসা জেপিএলের DE442S এফেমেরিস দিয়ে; সংরক্ষিত অবস্থানের সময় অঞ্চল অফলাইনে খোঁজা হয় tz-lookup (CC0) দিয়ে। মেরুবৃত্তের ভেতরে (অক্ষাংশ ৬৬.৫৬° উত্তর বা দক্ষিণের বেশি), যেখানে কিছু দিনে সূর্য অস্ত যায় না, হিজরি তারিখ নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস থেকে হিসাব করা হয় না: উম্মুল কুরা পঞ্জিকা ব্যবহার করা হয়, “নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী” লেবেল ছাড়া। পূর্ণ বিজ্ঞপ্তি LICENSES ফাইলে আছে।',
  'Read more':'আরও পড়ুন',
  'Show less':'সংক্ষেপে দেখুন',
  'Untick Jumu’ah to choose Dhuhr instead':'যোহর বেছে নিতে আগে জুমা আনটিক করুন',
  'Untick Dhuhr to choose Jumu’ah instead':'জুমা বেছে নিতে আগে যোহর আনটিক করুন',
  '2 Jumu’ah':'২ জুমা',
  '4 Dhuhr':'৪ যোহর'
});


function translateRenderedText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue;
    const lastTranslated = LAST_TRANSLATED_TEXT.get(node);
    if (!ORIGINAL_TEXT.has(node) || (lastTranslated !== undefined && raw !== lastTranslated)) ORIGINAL_TEXT.set(node, raw);
    const original = ORIGINAL_TEXT.get(node);
    const trimmed = original.trim();
    if (!trimmed) continue;
    if (lang() !== 'bn') { node.nodeValue = original; LAST_TRANSLATED_TEXT.set(node, original); continue; }
    let translated = node.parentElement?.dataset?.bn || BN_TEXT[trimmed];
    if (!translated && lang() === 'bn') translated = roughBangla(trimmed);
    if (!translated) translated = trimmed;
    node.nodeValue = original.replace(trimmed, translated);
    LAST_TRANSLATED_TEXT.set(node, node.nodeValue);
  }
  for (const element of document.querySelectorAll('[title], [placeholder]')) {
    for (const attr of ['title','placeholder']) {
      if (!element.hasAttribute(attr)) continue;
      const store = `original${attr[0].toUpperCase()}${attr.slice(1)}`;
      if (!element.dataset[store]) element.dataset[store] = element.getAttribute(attr) || '';
      const original = element.dataset[store];
      element.setAttribute(attr, lang() === 'bn' ? (BN_TEXT[original] || roughBangla(original)) : original);
    }
  }
  for (const element of document.querySelectorAll('[aria-label]')) {
    if (!element.dataset.originalAriaLabel) element.dataset.originalAriaLabel = element.getAttribute('aria-label') || '';
    const label = element.dataset.originalAriaLabel;
    if (lang() === 'bn') {
      const adjustment = /^(Fajr|Sunrise|Dhuhr|Asr|Maghrib|Isha) adjustment in minutes$/.exec(label);
      element.setAttribute('aria-label', adjustment ? `${BN_TEXT[adjustment[1]] || adjustment[1]} মিনিটে সমন্বয়` : (BN_TEXT[label] || roughBangla(label)));
    }
    else element.setAttribute('aria-label', label);
  }
}

/* Carousels: every matching item for the date, paged with ‹ › buttons or the
   Left/Right arrow keys while the card is focused. Controls hide for one item. */
const carouselState = new Map();

function renderCarousel(box, id, slides, label) {
  if (!box) return;
  const signature = slides.map(slide => slide.key).join('|');
  const index = reconcileIndex(carouselState.get(id), signature, slides.length);
  carouselState.set(id, { signature, index });
  const controls = showsControls(slides.length);
  box.dataset.carousel = id;
  box.classList.add('carousel-host');
  box.classList.toggle('has-carousel', controls);
  if (controls) {
    box.tabIndex = 0;
    box.setAttribute('role', 'region');
    box.setAttribute('aria-roledescription', lang() === 'bn' ? 'ক্যারোসেল' : 'carousel');
    box.setAttribute('aria-label', label);
    delete box.dataset.originalAriaLabel;
  } else {
    box.removeAttribute('tabindex');
    box.removeAttribute('role');
    box.removeAttribute('aria-roledescription');
    box.removeAttribute('aria-label');
    delete box.dataset.originalAriaLabel;
  }
  const nav = controls ? `<div class="carousel-nav"><button class="carousel-button" type="button" data-carousel-step="-1" aria-label="Previous item">‹</button><span class="carousel-counter" aria-live="polite">${counterLabel(index, slides.length, lang())}</span><button class="carousel-button" type="button" data-carousel-step="1" aria-label="Next item">›</button></div>` : '';
  box.innerHTML = nav + slides.map((slide, n) => `<div class="carousel-slide"${n === index ? '' : ' hidden'} data-slide-index="${n}">${slide.html}</div>`).join('');
}

function showCarouselSlide(host, index) {
  if (!host) return;
  const id = host.dataset.carousel;
  const slides = [...host.querySelectorAll(':scope > .carousel-slide')];
  if (!slides.length) return;
  const target = wrapIndex(index, slides.length);
  slides.forEach((slide, n) => { slide.hidden = n !== target; });
  const entry = carouselState.get(id);
  if (entry) entry.index = target;
  const counter = host.querySelector(':scope > .carousel-nav .carousel-counter');
  if (counter) counter.textContent = counterLabel(target, slides.length, lang());
}

function stepCarousel(host, delta) {
  if (!host) return;
  const id = host.dataset.carousel;
  const count = host.querySelectorAll(':scope > .carousel-slide').length;
  if (!showsControls(count)) return;
  showCarouselSlide(host, stepIndex(carouselState.get(id)?.index || 0, delta, count));
}

function scheduleFoldFit() {
  if (scheduleFoldFit.queued) return;
  scheduleFoldFit.queued = true;
  requestAnimationFrame(() => {
    scheduleFoldFit.queued = false;
    fitAboveFold();
  });
}

/* (v2.2.0) The UI is never scaled down to fit more events on the opening view. Several prayer events at once simply make the
   page longer and it scrolls at the normal size (the old 2.0.1 fit-to-window zoom, down to 70 %, is gone). */
function fitAboveFold() {
  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.zoom = '';
}

function render() {
  setLanguage();
  sealLocks();
  prunePending();
  currentTimes = getTimes(selectedDate);
  liveTimes = getTimes(startOfDay(new Date()));
  const today = startOfDay(new Date());
  const occasion = occasionFor(today);
  const notice = $('occasionBanner');
  notice.hidden = !occasion;
  notice.innerHTML = occasion ? `<strong>${escapeHtml(occasion[0])}</strong><span>${escapeHtml(occasion[1])} · ${hijriByCrescent(today) ? 'Predicted by crescent visibility' : 'Umm al-Qura estimate; local moon-sighting may differ.'}</span>` : ''; // v3.0.6 H
  renderProgress();
  renderLiveEvents();
  renderCompletedToday();
  renderEclipse();
  renderFard(currentTimes);
  renderVoluntary(selectedDate, currentTimes);
  renderSituational();
  updateCardCountdowns();
  applySectionVisibility();
  renderWeeklyReview();
  renderNextPrayer();
  renderSettingsSummary();
  translateRenderedText();
  if (currentPage === 'countdown') renderCountdownView();
  if (currentPage === 'time') renderTimeView();
  if (currentPage === 'astro') renderAstroView();
  if (currentPage === 'weekly-day') renderWeeklyDayView();
  if (currentPage === 'prayer') renderPrayerPage();
  scheduleFoldFit();
  updateTrayTooltip();
  armBoundary();
}

/* Forbidden-time card (v1.3.3). Shown ONLY while a prohibited interval is in progress: there is no
   advance notice and an interval is never a "Next event" target (see src/forbidden-times.js). */
function forbiddenCardHtml(item) {
  const bn = lang() === 'bn';
  const school = state.profile.school;
  const label = PROHIBITED_LABELS[item.key][bn ? 'bn' : 'en'];
  const nb = value => String(value).replace(/ /g, '\u00a0');
  const until = nb(fmt(new Date(item.end)));
  const range = `${nb(fmt(new Date(item.start)))} – ${until}`;
  // v2.1.1: a calm "pause" state. Same steel finish as the other cards with a thin amber edge; no alert colours, no icon.
  let main, detail = '';
  if (school === 'jafari') {
    main = bn ? `${until} থেকে নফল নামাজ শুরু করা যাবে` : `Voluntary prayers may begin again at ${until}`;
    detail = bn ? 'এই সময়ে নফল শুরু করা মাকরুহ; ফরজ নামাজ আদায় করা যায়।' : 'Starting voluntary prayers is disliked now; an obligatory prayer may be offered.';
  } else if (school !== 'hanafi') {
    main = bn ? `${until} থেকে নফল নামাজ পড়া যাবে` : `Voluntary prayers resume at ${until}`;
    detail = bn ? 'ফরজ নামাজের নিজস্ব ওয়াক্ত হলে সেটি আদায় করা যায়।' : 'An obligatory prayer may be offered in its own time.';
  } else {
    main = bn ? `${until} থেকে নামাজ পড়া যাবে` : `Prayer resumes at ${until}`;
    if (item.key === 'sunset') detail = bn ? 'শুধু আজকের অনাদায়ী আসর এখন আদায় করা যায়।' : "Only today's Asr, if not yet prayed, may be offered now.";
  }
  const lead = `${bn ? 'বিরতি' : 'PAUSE'} · ${bn ? label : label.toUpperCase()}`;
  const eventDate = new Date(item.start);
  const nextKey = item.key === 'zawal' ? 'dhuhr' : item.key === 'sunset' ? 'maghrib' : 'duha';
  const nextName = nextKey === 'duha' ? prayerName('duha') : slotName(nextKey, eventDate);
  const nextLine = `${bn ? 'পরবর্তী' : 'Next'}: ${nextName} · ${until}`;
  const span = Math.max(1, item.end - item.start);
  const pct = Math.min(100, Math.max(0, ((Date.now() - item.start) / span) * 100));
  return `<div class="forbidden-card" role="status" data-prohibited="${item.key}"><div class="forbidden-main"><div class="forbidden-type">${escapeHtml(lead)}</div><strong class="forbidden-line">${escapeHtml(main)}</strong><small class="forbidden-range">${escapeHtml(range)}</small>${detail ? `<small class="forbidden-detail">${escapeHtml(detail)}</small>` : ''}</div><div class="forbidden-side"><div class="forbidden-left-box countdown-card"><span class="countdown-card-label">${bn ? 'শেষ হতে বাকি' : 'ENDS IN'}</span><strong class="forbidden-left countdown-card-value" data-live-countdown="true" data-until="${item.end}">${countdown(item.end - Date.now())}</strong></div><div class="forbidden-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" data-start="${item.start}" data-end="${item.end}"><i style="width:${pct.toFixed(2)}%"></i></div><small class="forbidden-next">${escapeHtml(nextLine)}</small></div></div>`;
}

/** Prohibited intervals in progress at `now` (from the neighbouring days too, so midnight-spanning edges stay right). */
function activeProhibited(now) {
  const today = startOfDay(now);
  return activeIntervals([-1, 0, 1].flatMap(offset => prohibitedIntervals(getTimes(addDays(today, offset)))), now);
}

function liveHeadingText(active) {
  const bn = lang() === 'bn';
  if (!active.length) return bn ? 'এখনকার নামাজ' : 'Prayer events';
  return state.profile.school === 'jafari' ? (bn ? 'মাকরুহ সময়' : 'Disliked time') : (bn ? 'নিষিদ্ধ সময়' : 'Forbidden time');
}

function renderLiveEvents() {
  const box = $('liveEvents');
  const focusedRakah = document.activeElement?.matches?.('[data-rakah-input]') ? { key: document.activeElement.dataset.rakahInput, date: document.activeElement.dataset.recordDate, value: document.activeElement.value } : null;
  box.innerHTML = '';
  const events = getActiveEvents(new Date()).filter(event => !eventClosed(event));
  const forbidden = activeProhibited(new Date());
  const heading = $('liveHeading');
  if (heading) heading.textContent = liveHeadingText(forbidden);
  box.classList.toggle('is-forbidden', forbidden.length > 0);
  box.dataset.count = String(Math.max(1, events.length + forbidden.length));
  const intervalRows = forbidden.map(forbiddenCardHtml).join('');
  const revise = reviseEvents(new Date());
  if (!events.length) {
    // The calm empty state only appears when nothing else is shown; the next event lives in the hero card below, so it is not repeated here.
    const bnEmpty = lang() === 'bn';
    box.innerHTML = intervalRows || (revise.length ? '' : `<div class="live-empty"><span class="empty-mark">✦</span><div><strong>${bnEmpty ? 'এখন কোনো নামাজের সময় চলছে না।' : 'No prayer event is currently in its time window.'}</strong><small>${bnEmpty ? 'এরপরেরটা নিচের কার্ডে দেখা যাচ্ছে।' : 'The next event is shown just below.'}</small></div></div>`);
    // v3.0.4 G: Revise previous prayer cards flow in the same grid as the cards available now.
    for (const event of revise) box.append(eventCardElement(event, true));
    if (revise.length) bindEventCards(box);
    translateRenderedText();
    return;
  }
  for (const event of events) box.append(eventCardElement(event, false));
  for (const event of revise) box.append(eventCardElement(event, true));
  if (intervalRows) box.insertAdjacentHTML('afterbegin', intervalRows);
  bindEventCards(box);
  if (focusedRakah) {
    const input = box.querySelector(`[data-rakah-input="${focusedRakah.key}"][data-record-date="${focusedRakah.date}"]`);
    if (input) { input.value = focusedRakah.value; input.focus({ preventScroll: true }); }
  }
  translateRenderedText();
}

/* One prayer event card. `late` = under "Revise previous prayer" (v3.0.4): the time has ended,
   so there is no countdown; the circles and Mark Complete work as on the live card. */
function eventCardElement(event, late) {
  const record = dayRecord(event.date, false);
  const done = event.kind === 'fard' ? fardSlotDone(record.fard, event.key, event.date) : !!record[event.kind]?.[event.key];
  const lockText = done ? lockTipFor(event.kind, event.key, event.date) : '';
  const item = document.createElement('article');
  item.className = `live-event ${event.kind === 'voluntary' ? 'voluntary' : 'obligatory'}${done ? ' is-done' : ''}${late ? ' late-event' : ''}`;
  const kindLabel = event.kind === 'fard' ? 'OBLIGATORY' : 'VOLUNTARY';
  const displayName = slotName(event.key, event.date);
  const eventGuidance = event.key === 'dhuhr' && event.date.getDay() === 5 ? PRAYER_GUIDANCE.jumuah : PRAYER_GUIDANCE[event.key];
  const isVol = event.kind === 'voluntary';
  const bnLive = lang() === 'bn';
  item.innerHTML = `${late ? `<div class="revise-heading" data-revise-heading="true">${bnLive ? 'আগের নামাজ সংশোধন করুন' : 'Revise previous prayer'}</div>` : ''}
    <header class="live-event-head">
      <div class="live-event-identity">
        <div class="live-event-type">${kindLabel}</div>
        <button class="live-name" type="button" data-live-description="${event.kind}:${event.key}">${escapeHtml(displayName)}</button>
        <small class="live-time">${escapeHtml(fmt(event.start))} – ${escapeHtml(fmt(event.end))}</small>
      </div>
      ${late ? '' : `<button class="event-countdown countdown-card" type="button" data-event-countdown="true" data-kind="${event.kind}" data-key="${event.key}" data-date="${dateKey(event.date)}" data-start="${event.start.getTime()}" data-end="${event.end.getTime()}"><span class="countdown-card-label">TIME LEFT</span><strong class="countdown-card-value" data-live-countdown="true" data-until="${event.end.getTime()}">${countdown(event.end.getTime() - Date.now())}</strong></button>`}
    </header>
    <div class="live-event-evidence">${leadEvidenceHtml(event.key, event.date)}</div>
    <section class="live-event-tracking" aria-label="${isVol ? (bnLive ? 'রাকাতের অগ্রগতি' : 'Rak‘ah progress') : (bnLive ? 'নামাজের অগ্রগতি' : 'Prayer progress')}">
      ${isVol ? voluntaryTicksHtml(event) : partsHtml(event.key, event.date, true, { includeFard: true })}
    </section>
    <footer class="live-event-footer">
      <button class="square-button is-complete mark-event-complete" type="button" data-mark-complete="${event.kind}" data-mark-key="${event.key}" data-mark-date="${dateKey(event.date)}"${late ? ' data-mark-late="1"' : ''} title="Mark Complete" aria-label="Mark Complete">Mark Complete</button>
    </footer>`;
  return item;
}

function bindEventCards(box) {
  box.querySelectorAll('[data-live-kind]').forEach(button => button.addEventListener('click', () => {
    togglePrayer(button.dataset.liveKind, button.dataset.liveKey, button.dataset.liveDate);
  }));
  box.querySelectorAll('[data-mark-complete]').forEach(button => button.addEventListener('click', () => {
    markEventComplete(button.dataset.markComplete, button.dataset.markKey, button.dataset.markDate, { late: button.dataset.markLate === '1' });
  }));
  box.querySelectorAll('[data-live-description]').forEach(button => button.addEventListener('click', () => {
    navigateToPrayerDescription(button.dataset.liveDescription.split(':')[1]);
  }));
  box.querySelectorAll('[data-event-countdown]').forEach(button => button.addEventListener('click', () => openEventCountdown(button.dataset)));
  bindVoluntaryTicks(box);
}

/* v3.0.4 E: "Revise previous prayer". A prayer undone on the Prayer record page after its time has ended
   (pendingStore.reopened) gets its card back here, and only that prayer, until its record window closes
   (e.g. Fajr at Asr start). Nothing else appears on its own when a time ends (F1). */
function reviseEvents(now = new Date()) {
  const out = [];
  let changed = false;
  for (const id of Object.keys(pendingStore.reopened)) {
    const [day, kind, key] = id.split('|');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
    const event = match && (kind === 'fard' || kind === 'voluntary') ? findRecordableEvent(kind, key, new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
    if (!event || eventClosed(event) || dayIsLocked(day, dateKey(progressDate(now)), state.lockWatermark) || !reviseOpen(event, now)) {
      delete pendingStore.reopened[id];
      changed = true;
      continue;
    }
    if (now >= event.end) out.push(event);
  }
  if (changed) savePending();
  return out.sort((a, b) => a.start - b.start);
}

/* The record window of a prayer: Fard (with its Sunnah and Nafl) until its two-period lock; a voluntary prayer while it can be edited. */
function reviseOpen(event, now = new Date()) {
  if (event.kind === 'voluntary') return voluntaryCanEdit(event, dayRecord(event.date, false));
  const ctx = lockContext(event.date);
  const fardLock = lockInstant(lockItem('fard', event.key), ctx.events, ctx.nextFajr);
  return recordingOpen(event.start, event.end, fardLock?.at, now);
}
/* A tick saved after the event's time ended is quietly marked "recorded after its time" in the daily record. */
function noteLate(record, id, event, ticked, now = Date.now()) {
  if (ticked && event && now >= event.end.getTime()) (record.late ||= {})[id] = true;
  else if (!ticked && record.late) {
    delete record.late[id];
    if (!Object.keys(record.late).length) delete record.late;
  }
}



function renderFard(times) {
  const grid = $('prayerGrid');
  grid.innerHTML = '';
  if (!times) return;
  const record = dayRecord(selectedDate, false);
  const today = dateKey(selectedDate) === dateKey(new Date());
  const active = today ? getActiveEvents().find(event => event.kind === 'fard' && dateKey(event.date) === dateKey(selectedDate))?.key : null;
  for (const prayer of FARD) {
    const card = document.createElement('article');
    const done = fardSlotDone(record.fard, prayer.key, selectedDate);
    const guidance = prayer.key === 'dhuhr' && selectedDate.getDay() === 5 ? PRAYER_GUIDANCE.jumuah : PRAYER_GUIDANCE[prayer.key];
    card.className = `prayer-card card-obligatory${done ? ' done' : ''}${active === prayer.key ? ' active' : ''}`;
    // v3.0.2: description cards carry no record button; recording happens on the event cards.
    card.innerHTML = `<div class="prayer-card-head"><button class="prayer-name-button" type="button" data-card-info="${prayer.key}">${escapeHtml(isFridayDhuhr(prayer.key, selectedDate) ? slotName(prayer.key, selectedDate) : text(prayer))}</button><span class="prayer-index">${String(FARD.indexOf(prayer) + 1).padStart(2, '0')}</span></div>${leadEvidenceHtml(prayer.key, selectedDate)}<div class="prayer-time">${escapeHtml(fmt(times[prayer.key]))}</div><div class="prayer-status">${done ? (lang()==='bn'?'সম্পন্ন':'Completed') : (lang()==='bn'?'ফরজ নামাজ':'Obligatory prayer')}${done && lockTipFor('fard', prayer.key, selectedDate) ? lockMarkHtml(lockTipFor('fard', prayer.key, selectedDate)) : ''}</div>${shiaMode() ? '' : `<div class="rakah-line">${escapeHtml(lang()==='bn'?guidance.bn:guidance.rakahs)}</div>`}${prayerNoteHtml(prayer.key)}<div class="prayer-eta" data-eta="${prayer.key}" hidden></div>`;
    grid.append(card);
  }
  grid.querySelectorAll('[data-card-info]').forEach(button => button.addEventListener('click', () => toggleCardInfo(button)));
  grid.querySelectorAll('.prayer-eta').forEach(el => el.addEventListener('click', () => { if (el.dataset.start) openEventCountdown(el.dataset); }));
  updateCardCountdowns();
}

/* Daily prayers cards: "in 3h 54m" / "ends in 25m" / nothing once passed. Hours and minutes only;
   called from render() and the 15 s interval, so the text refreshes every minute without re-rendering the card. */
function updateCardCountdowns(now = new Date()) {
  const today = startOfDay(now);
  const events = dateKey(selectedDate) === dateKey(today) ? getFardEvents(today) : [];
  document.querySelectorAll('.prayer-eta[data-eta]').forEach(el => {
    const event = events.find(item => item.key === el.dataset.eta);
    const result = event ? cardCountdown({ now, start: event.start, end: event.end, lang: lang() }) : { kind: 'passed', text: '' };
    if (event) { el.dataset.start = String(event.start.getTime()); el.dataset.end = String(event.end.getTime()); el.dataset.key = event.key; el.dataset.kind = 'fard'; el.dataset.date = dateKey(event.date); }
    if (el.dataset.etaText !== result.text) { el.dataset.etaText = result.text; el.textContent = result.text; }
    el.hidden = !result.text;
    el.classList.toggle('is-current', result.kind === 'current');
    const pref = event ? preferredWindow(event.key, event.start, event.end, state.profile.school, { friday: event.key === 'dhuhr' && event.date.getDay() === 5 }) : null;
    el.classList.toggle('is-best', !!(pref && now >= pref.start && now < pref.end));
  });
  // Standalone and date-specific voluntary cards use the same quiet, minute-based
  // countdown as the five obligatory cards: no seconds and no separate expansion.
  document.querySelectorAll('.prayer-eta[data-compact-eta]').forEach(el => {
    const start = Number(el.dataset.start), end = Number(el.dataset.end);
    const result = cardCountdown({ now, start, end, lang: lang() });
    if (el.dataset.etaText !== result.text) { el.dataset.etaText = result.text; el.textContent = result.text; }
    el.hidden = !result.text;
    el.classList.toggle('is-current', result.kind === 'current');
    const pref = preferredWindow(el.dataset.key, new Date(start), new Date(end), state.profile.school, { eid: el.dataset.eid || '' });
    el.classList.toggle('is-best', !!(pref && now >= pref.start && now < pref.end));
  });
}

function renderVoluntary(date, times) {
  const list = $('voluntaryList');
  list.innerHTML = '';
  if (!times) { appendOtherVoluntaryCard(list); return; }
  let events = getVoluntaryEvents(date, times, getTimes(addDays(date, 1)));
  if (dateKey(date) === dateKey(new Date())) {
    const now = new Date();
    events = events.filter(event => {
      if (!['eid_prayer', 'tarawih'].includes(event.key)) return true;
      const ctx = lockContext(date);
      const lock = lockInstant({ kind: 'voluntary', key: event.key }, ctx.events, ctx.nextFajr);
      return recordingOpen(event.start, event.end, lock?.at, now);
    });
  }
  $('voluntaryCount').textContent = lang() === 'bn' ? `${localizeDigits(events.length)}টি ইভেন্ট` : `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  if (!events.length) {
    list.innerHTML = '<div class="voluntary-empty">No additional voluntary prayer period is scheduled for this date.</div>';
    appendOtherVoluntaryCard(list);
    return;
  }
  const record = dayRecord(date, false);
  const rowHtml = (event, done) => {
    const kind = DATE_SPECIFIC_VOLUNTARY.includes(event.key) ? 'card-special' : 'card-daily';
    const eid = event.eid ? ` data-eid="${event.eid}"` : '';
    return `${leadEvidenceHtml(event.key, date)}<div class="voluntary-summary-main"><button class="prayer-name-button" type="button" data-card-info="${event.key}">${escapeHtml(prayerName(event.key))}</button><small>${escapeHtml(fmt(event.start))} – ${escapeHtml(fmt(event.end))}${done ? (lang() === 'bn' ? ' · সম্পন্ন' : ' · Completed') : ''}${done && lockTipFor('voluntary', event.key, date) ? lockMarkHtml(lockTipFor('voluntary', event.key, date)) : ''}</small></div><button class="prayer-eta voluntary-eta" type="button" data-event-countdown="true" data-compact-eta="true" data-kind="voluntary" data-key="${event.key}" data-date="${dateKey(date)}" data-start="${event.start.getTime()}" data-end="${event.end.getTime()}"${eid} hidden></button>${referenceCardHtml(event.key, prayerName(event.key))}`;
  };
  // Date-specific prayers (Eid, Tarawih) share one carousel card so every one
  // that applies can be paged through; daily voluntary prayers stay as before.
  const dateSpecific = events.filter(event => DATE_SPECIFIC_VOLUNTARY.includes(event.key));
  if (dateSpecific.length) {
    const holder = document.createElement('div');
    holder.className = 'voluntary-carousel';
    list.append(holder);
    renderCarousel(holder, `voluntary-date-specific:${dateKey(date)}`, dateSpecific.map(event => {
      const done = !!record.voluntary?.[event.key];
      return { key: event.key, html: `<article class="voluntary-item card-special${done ? ' done' : ''}">${rowHtml(event, done)}</article>` };
    }), 'Date-specific prayers');
  }
  for (const event of events.filter(item => !DATE_SPECIFIC_VOLUNTARY.includes(item.key))) {
    const done = !!record.voluntary?.[event.key];
    const row = document.createElement('article');
    row.className = `voluntary-item card-daily${done ? ' done' : ''}`;
    row.innerHTML = rowHtml(event, done);
    list.append(row);
  }
  list.querySelectorAll('[data-card-info]').forEach(button => button.addEventListener('click', () => toggleCardInfo(button)));
  list.querySelectorAll('[data-event-countdown]').forEach(button => button.addEventListener('click', () => openEventCountdown(button.dataset)));
  appendOtherVoluntaryCard(list);
}

const SITUATIONAL_KEYS = Object.freeze(['tahiyyatul_masjid','istikhara','tawbah','wudu_prayer','kusuf','khusuf','istisqa','janazah','nafl_mutlaq']);
const SITUATIONAL_PLANS = Object.freeze({
  tahiyyatul_masjid: { mode: 'pair' }, istikhara: { mode: 'pair' }, tawbah: { mode: 'pair' }, wudu_prayer: { mode: 'pair' },
  kusuf: { mode: 'sets', max: 12, step: 2 }, khusuf: { mode: 'sets', max: 12, step: 2 }, istisqa: { mode: 'pair' }, janazah: { mode: 'occasion', rakahs: 0 }, nafl_mutlaq: { mode: 'custom', step: 2 }
});
function otherNaflCount(record) {
  return Math.max(0, Math.floor(Number(record?.otherNafl) || 0));
}
/* The sixth Voluntary prayers card (v2.0.1): free +2 rak‘ah nafl for any permitted time. It replaces the old
   horizontal strip, is always the last card of the grid, and is rebuilt with the list on every render. */
function appendOtherVoluntaryCard(list) {
  const card = document.createElement('article');
  card.className = 'voluntary-item card-daily other-voluntary-card';
  card.id = 'otherVoluntaryBar';
  card.innerHTML = `<div class="voluntary-summary-main"><div class="eyebrow">WHEN PRAYER IS PERMITTED</div><h3 class="other-voluntary-title">Other voluntary prayers</h3><small>Add extra nafl in sets of two rak‘ahs whenever prayer is permitted.</small></div><div class="other-voluntary-actions"><button class="square-button is-complete" id="otherVoluntaryAdd" type="button">+2 rak‘ahs</button><button class="square-button is-complete mark-event-complete" id="otherVoluntaryComplete" type="button" title="Mark Complete" aria-label="Mark Complete" disabled>Mark Complete</button></div><small class="other-pending" id="otherVoluntaryPending" aria-live="polite" hidden></small>`;
  list.append(card);
  card.querySelector('#otherVoluntaryAdd').addEventListener('click', () => recordOtherNafl(2));
  card.querySelector('#otherVoluntaryComplete').addEventListener('click', () => completeOtherNafl());
}
function renderSituational(date = selectedDate) {
  const bar = $('otherVoluntaryBar');
  if (!bar) return;
  const dateText = dateKey(date);
  const locked = startOfDay(date) > startOfDay(new Date()) || dayIsLocked(dateText, dateKey(progressDate(new Date())), state.lockWatermark);
  const add = $('otherVoluntaryAdd');
  if (add) add.disabled = locked;
  bar.classList.toggle('is-locked', locked);
  // v3.0.4 C4: unsaved "+2 rak‘ahs" taps show here and count only after Mark Complete.
  const count = locked ? 0 : otherPendingCount(dateText);
  const pending = $('otherVoluntaryPending');
  if (pending) {
    pending.hidden = !count;
    pending.textContent = !count ? '' : lang() === 'bn' ? `${localizeDigits(count)} রাকাত আদায়` : `${count} rak‘ahs performed`;
  }
  const complete = $('otherVoluntaryComplete');
  if (complete) complete.disabled = locked || !count;
}
function otherPendingCount(dateText) {
  const count = Math.floor(Number(pendingStore.other[dateText]) || 0);
  return count > 0 ? count - (count % 2) : 0;
}
/* v3.0.4 C4: "+2 rak‘ahs" only adds to the card's unsaved count, with the tick sound. */
function recordOtherNafl(delta) {
  const date = selectedDate;
  const dateText = dateKey(date);
  if (startOfDay(date) > startOfDay(new Date()) || dayIsLocked(dateText, dateKey(progressDate(new Date())), state.lockWatermark)) return;
  const next = otherPendingCount(dateText) + delta;
  if (next < 0 || next % 2) return;
  if (next) pendingStore.other[dateText] = next; else delete pendingStore.other[dateText];
  savePending();
  playSelectSound('voluntary', delta > 0, next / 2);
  render();
  if (delta > 0) {
    const bar = $('otherVoluntaryBar');
    if (!bar) return;
    bar.classList.remove('is-glow');
    void bar.offsetWidth;
    bar.classList.add('is-glow');
    setTimeout(() => bar.classList.remove('is-glow'), 500);
  }
}
/* Mark Complete on the Other voluntary prayers card saves the unsaved count as its own timed entry. */
function completeOtherNafl() {
  const date = selectedDate;
  const dateText = dateKey(date);
  if (startOfDay(date) > startOfDay(new Date()) || dayIsLocked(dateText, dateKey(progressDate(new Date())), state.lockWatermark)) return;
  const count = otherPendingCount(dateText);
  if (!count) return;
  const before = dayLayers(date);
  const record = dayRecord(date);
  const entries = otherEntries(record);
  entries.push({ at: Date.now(), rakahs: count });
  writeOtherEntries(record, entries);
  delete pendingStore.other[dateText];
  save();
  savePending();
  const after = dayLayers(date);
  playLayerSound('voluntary', true, before, after);
  noteRecognition(before, after, ['voluntary']);
  render();
  showToast('Prayer marked complete');
}
/* Other voluntary entries (v3.0.4 C5): record.otherEntries = [{ at, rakahs }], one per Mark Complete.
   record.otherNafl / record.rakahs.other_nafl stay the total, so totals, charts and older code read it as before.
   A total saved before v3.0.4 (no entries) shows as one entry without a time. */
function otherEntries(record) {
  const total = otherNaflCount(record);
  const list = (Array.isArray(record?.otherEntries) ? record.otherEntries : [])
    .filter(entry => entry && Math.floor(Number(entry.rakahs)) > 0)
    .map(entry => ({ at: Number(entry.at) > 0 ? Number(entry.at) : null, rakahs: Math.floor(Number(entry.rakahs)) }));
  let sum = list.reduce((acc, entry) => acc + entry.rakahs, 0);
  while (sum > total && list.length) {
    const last = list[list.length - 1];
    const cut = Math.min(last.rakahs, sum - total);
    last.rakahs -= cut;
    sum -= cut;
    if (!last.rakahs) list.pop();
  }
  if (total > sum) list.unshift({ at: null, rakahs: total - sum });
  return list;
}
function writeOtherEntries(record, entries) {
  const clean = entries.filter(entry => entry.rakahs > 0).map(entry => ({ at: entry.at, rakahs: entry.rakahs }));
  const total = clean.reduce((acc, entry) => acc + entry.rakahs, 0);
  record.otherNafl = total;
  record.rakahs ||= {};
  if (total) record.rakahs.other_nafl = total;
  else delete record.rakahs.other_nafl;
  if (clean.length) record.otherEntries = clean;
  else delete record.otherEntries;
}
/* An entry follows the record window: it locks when the second Fard period after its time begins
   (the lock of the Fard period it was saved in: 10 AM -> Asr, Maghrib -> next Fajr, Isha/night -> next Dhuhr). */
function otherEntryLockAt(at) {
  const time = new Date(at);
  let period = null;
  for (const day of [addDays(startOfDay(time), -1), startOfDay(time)]) {
    for (const event of getFardEvents(day)) if (event.start.getTime() <= at && (!period || event.start > period.start)) period = event;
  }
  if (!period) return null;
  const ctx = lockContext(period.date);
  const lock = lockInstant(lockItem('fard', period.key), ctx.events, ctx.nextFajr);
  return lock?.at ? new Date(lock.at).getTime() : null;
}
function otherEntryLocked(entry, date, now = new Date()) {
  if (startOfDay(date) > startOfDay(now) || dayIsLocked(dateKey(date), dateKey(progressDate(now)), state.lockWatermark)) return true;
  if (entry.at == null) return false;
  const lockAt = otherEntryLockAt(entry.at);
  return lockAt != null && now.getTime() >= lockAt;
}
/* Lowering only: an entry can go down (to 0 = removed), never up. */
function lowerOtherEntry(dateText, index, total) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return false;
  const date = new Date(`${dateText}T12:00:00`);
  const record = dayRecord(date, false);
  const entries = otherEntries(record);
  const entry = entries[index];
  if (!entry || otherEntryLocked(entry, date)) return false;
  if (!Number.isInteger(total) || total < 0 || total % 2 || total >= entry.rakahs) return false;
  entry.rakahs = total;
  writeOtherEntries(dayRecord(date), entries);
  save();
  playSelectSound('voluntary', false);
  render();
  return true;
}
function otherEntryHtml(entry, index, date) {
  const bn = lang() === 'bn';
  const dateText = dateKey(date);
  const locked = otherEntryLocked(entry, date);
  const when = entry.at ? fmt(new Date(entry.at)) : (bn ? 'আগে সংরক্ষিত' : 'Saved earlier');
  const amount = bn ? `${localizeDigits(entry.rakahs)} রাকাত` : `${entry.rakahs} rak‘ahs`;
  const lockTip = locked ? (bn ? 'রেকর্ডের সময় শেষ, এটি আর বদলানো যাবে না' : 'The record window has closed; this entry can no longer change') : '';
  let control;
  if (entry.rakahs <= TICK_LIMIT) {
    const top = Math.ceil(entry.rakahs / 2) - 1;
    control = `<div class="prayer-parts vol-ticks other-entry-ticks${locked ? ' is-closed' : ''}" role="group" aria-label="${bn ? 'দুই রাকাতের সেট' : 'Sets of two rak‘ahs'}">${Array.from({ length: TICK_LIMIT / 2 }, (_, j) => {
      const upTo = (j + 1) * 2;
      const done = upTo <= entry.rakahs;
      const usable = !locked && j === top;
      const label = bn ? `মোট ${localizeDigits(upTo)} রাকাত` : `${upTo} rak‘ahs in total`;
      return `<button type="button" class="part-tick voluntary${done ? ' done' : ''}${locked && done ? ' is-locked' : ''}" data-other-tick="${index}" data-other-date="${dateText}" data-other-index="${j}" aria-pressed="${done}" aria-label="${escapeHtml(label)}" title="${escapeHtml(lockTip || label)}"${usable ? '' : ' disabled'}><i aria-hidden="true">${done ? '✓' : ''}</i><span>${bn ? localizeDigits(upTo) : upTo}</span></button>`;
    }).join('<span class="part-link" aria-hidden="true"></span>')}</div>`;
  } else {
    control = `<form class="vol-extra other-extra" data-other-extra="${index}" data-other-date="${dateText}" novalidate><label for="otherExtra-${index}">${bn ? '১২ রাকাতের বেশি হলে সংখ্যা লিখুন' : 'More than 12 rak‘ahs? Enter the total'}</label><span class="vol-extra-field"><input id="otherExtra-${index}" type="text" inputmode="numeric" autocomplete="off" value="${bn ? localizeDigits(entry.rakahs) : entry.rakahs}"${locked ? ' disabled' : ''}><button class="secondary-button vol-extra-set" type="submit"${locked ? ' disabled' : ''}>${bn ? 'নিশ্চিত করুন' : 'Set total'}</button></span><small class="vol-extra-msg" role="alert"></small></form>`;
  }
  return `<div class="other-entry" data-other-entry="${index}"><p class="other-entry-line">${escapeHtml(when)} · ${escapeHtml(amount)}${locked ? lockMarkHtml(lockTip) : ''}</p>${control}</div>`;
}
function bindOtherEntries(root) {
  root.querySelectorAll('[data-other-tick]').forEach(button => button.addEventListener('click', () => {
    lowerOtherEntry(button.dataset.otherDate, Number(button.dataset.otherTick), Number(button.dataset.otherIndex) * 2);
  }));
  root.querySelectorAll('[data-other-extra]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    const index = Number(form.dataset.otherExtra);
    const entry = otherEntries(dayRecord(new Date(`${form.dataset.otherDate}T12:00:00`), false))[index];
    const raw = String(input?.value || '').trim().replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const total = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!entry || !lowerOtherEntry(form.dataset.otherDate, index, total)) {
      const msg = form.querySelector('.vol-extra-msg');
      const max = entry ? entry.rakahs - 2 : 0;
      if (msg) msg.textContent = lang() === 'bn' ? `${localizeDigits(max)} বা তার কম একটি জোড় সংখ্যা লিখুন (০ দিলে মুছে যাবে)` : `Enter an even number up to ${max} (0 removes the entry)`;
      input?.setAttribute('aria-invalid', 'true');
    }
  }));
}

/* v2.1.0 voluntary events: only Mark Complete and up to six two-rak‘ah ticks. More than 12 rak‘ahs are typed into one
   validated box instead of generating more ticks. State lives in the existing record.rakahSets / record.rakahs fields. */
function voluntaryCanEdit(event, record) {
  const ctx = lockContext(event.date);
  const lock = lockInstant({ kind: 'voluntary', key: event.key }, ctx.events, ctx.nextFajr);
  return !record.closed?.[`voluntary:${event.key}`] && recordingOpen(event.start, event.end, lock?.at, new Date());
}

function extraErrorText(error, check = {}) {
  return extraErrorMessage(error, lang(), { key: check.key, count: check.count });
}

/* v3.0.5: the night of a prayer day: Qiyam start (Isha), Tahajjud start and Fajr, in ms. */
function nightTimes(day) {
  const events = getVoluntaryEvents(startOfDay(day));
  const qiyam = events.find(event => event.key === 'qiyam');
  const tahajjud = events.find(event => event.key === 'tahajjud');
  if (!qiyam || !tahajjud) return null;
  return { qiyamStart: qiyam.start.getTime(), tahajjudStart: tahajjud.start.getTime(), fajr: tahajjud.end.getTime() };
}
/* v3.0.5: do the Qiyam card's rak‘ahs count as Tahajjud? Recorded: from the record (qiyamPart or its saved
   time). Only selected: as Mark Complete would record them now. */
function qiyamInTahajjud(day, record = dayRecord(day, false)) {
  const night = nightTimes(day);
  if (!night) return false;
  if (record.voluntary?.qiyam) return qiyamRecordInTahajjud(record, night);
  return inTahajjudTime(Date.now(), night.tahajjudStart, night.fajr);
}
/* v3.0.5: progress and stats follow the same split. All Tahajjud and Witr are Qiyam al-Layl, so Qiyam counts
   as done when any night prayer is recorded; Tahajjud also counts when the Qiyam card was recorded in its time. */
function voluntaryEventDone(record, key, day) {
  if (record.voluntary?.[key]) return true;
  if (key === 'qiyam') return !!(record.voluntary?.tahajjud || record.voluntary?.witr);
  if (key === 'tahajjud') return !!record.voluntary?.qiyam && qiyamInTahajjud(day, record);
  return false;
}

/* "Qiyam al-Layl 9 rak‘ahs: Tahajjud 4, Witr 3, other 2" (C2); v3.0.5: Qiyam rak‘ahs in Tahajjud time are Tahajjud. */
function qiyamBreakdownText(record, day) {
  const b = qiyamBreakdown(record.rakahs, { qiyamInTahajjud: !!day && qiyamInTahajjud(day) });
  if (lang() === 'bn') {
    const n = localizeDigits;
    return `কিয়ামুল লাইল ${n(b.total)} রাকাত: তাহাজ্জুদ ${n(b.tahajjud)}, বিতর ${n(b.witr)}, অন্যান্য ${n(b.other)}`;
  }
  return `Qiyam al-Layl ${b.total} rak‘ah${b.total === 1 ? '' : 's'}: Tahajjud ${b.tahajjud}, Witr ${b.witr}, other ${b.other}`;
}

function voluntaryTicksHtml(event) {
  const key = event.key;
  const bn = lang() === 'bn';
  const record = selectionView(event.date); // v3.0.4: recorded + selected
  const plan = tickPlan(key);
  const ticks = normalizeTicks(key, record.rakahSets?.[key]);
  const total = Number(record.rakahs?.[key] || 0);
  const canEdit = voluntaryCanEdit(event, dayRecord(event.date, false));
  const dateText = dateKey(event.date);
  const witr = isWitr(key);
  const running = tickLabels(key);
  const buttons = plan.map((rakahs, index) => {
    const upTo = running[index];
    const label = witr
      ? (bn ? `${localizeDigits(rakahs)} রাকাত` : `${rakahs} rak‘ah${rakahs === 1 ? '' : 's'}`)
      : (bn ? `সেট ${localizeDigits(index + 1)}: মোট ${localizeDigits(upTo)} রাকাত` : `Set ${index + 1}: ${upTo} rak‘ahs in total`);
    const locked = canEdit && !tickAllowed(ticks, index);
    return `<button type="button" class="part-tick voluntary${ticks[index] ? ' done' : ''}${locked ? ' is-locked' : ''}" data-vol-tick="${key}" data-vol-index="${index}" data-vol-date="${dateText}" aria-pressed="${ticks[index]}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${canEdit && !locked ? '' : ' disabled'}${locked ? ' aria-disabled="true" data-locked="true"' : ''}><i aria-hidden="true">${ticks[index] ? '✓' : ''}</i><span>${bn ? localizeDigits(upTo) : upTo}</span></button>`;
  }).join('<span class="part-link" aria-hidden="true"></span>');
  const count = key === 'qiyam'
    ? `<small class="vol-count qiyam-breakdown" data-vol-count="${key}">${escapeHtml(qiyamBreakdownText(record, event.date))}</small>`
    : `<small class="vol-count" data-vol-count="${key}">${bn ? `${localizeDigits(total)} রাকাত` : `${total} rak‘ah${total === 1 ? '' : 's'}`}</small>`;
  let extra = '';
  if (allowsExtraInput(key)) {
    const draft = rakahDrafts.get(`${dateText}:${key}`);
    const tickCap = witr ? 11 : TICK_LIMIT;
    const shown = draft === undefined ? (total > tickCap ? String(total) : '') : draft;
    const label = witr
      ? (bn ? '১১ রাকাতের বেশি হলে মোট সংখ্যা লিখুন' : 'More than 11? Enter the total')
      : (bn ? '১২ রাকাতের বেশি হলে সংখ্যা লিখুন' : 'More than 12 rak‘ahs? Enter the total');
    const placeholder = witr ? (bn ? 'যেমন ১৩, ১৫' : 'e.g. 13, 15') : (bn ? 'যেমন ১৪, ২০' : 'e.g. 14, 20');
    extra = `<form class="vol-extra" data-vol-extra="${key}" data-record-date="${dateText}" novalidate><label for="volExtra-${key}">${label}</label><span class="vol-extra-field"><input id="volExtra-${key}" type="text" inputmode="numeric" autocomplete="off" data-rakah-input="${key}" data-record-date="${dateText}" value="${escapeHtml(shown)}" placeholder="${placeholder}" aria-describedby="volExtraMsg-${key}"${canEdit ? '' : ' disabled'}><button class="secondary-button vol-extra-set" type="submit"${canEdit ? '' : ' disabled'}>${bn ? 'নিশ্চিত করুন' : 'Set total'}</button></span><small class="vol-extra-msg" id="volExtraMsg-${key}" role="alert"></small></form>`;
  }
  const group = witr ? (bn ? 'বিতরের মোট রাকাত' : 'Witr totals') : (bn ? 'দুই রাকাতের সেট' : 'Sets of two rak‘ahs');
  return `<div class="vol-block"><div class="prayer-parts vol-ticks${canEdit ? '' : ' is-closed'}" role="group" aria-label="${group}">${buttons}</div>${count}${extra}</div>`;
}

function bindVoluntaryTicks(root) {
  root.querySelectorAll('[data-vol-tick]').forEach(button => button.addEventListener('click', () => toggleVoluntaryTick(button.dataset.volTick, button.dataset.volDate, Number(button.dataset.volIndex))));
  root.querySelectorAll('[data-rakah-input]').forEach(input => input.addEventListener('input', () => {
    rakahDrafts.set(`${input.dataset.recordDate}:${input.dataset.rakahInput}`, input.value);
    const msg = input.closest('form')?.querySelector('.vol-extra-msg');
    if (msg) msg.textContent = '';
    input.removeAttribute('aria-invalid');
  }));
  root.querySelectorAll('[data-vol-extra]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    confirmExtraRakahs(form.dataset.volExtra, form.dataset.recordDate, form.querySelector('input')?.value, form);
  }));
}

function toggleVoluntaryTick(key, dateText, index) {
  const date = new Date(`${dateText}T12:00:00`);
  const event = findRecordableEvent('voluntary', key, date);
  if (!event) return;
  if (!voluntaryCanEdit(event, dayRecord(event.date, false))) { showToast('This prayer event is not currently available.'); render(); return; }
  // v3.0.4 C: a tick only selects; the record changes on Mark Complete.
  const view = selectionView(event.date);
  const current = normalizeTicks(key, view.rakahSets?.[key]);
  if (!tickAllowed(current, index)) return;
  const result = toggleTick(key, current, index, view.rakahs?.[key]);
  const pend = pendingDay(event.date);
  pend.rakahSets ||= {};
  pend.rakahs ||= {};
  pend.rakahSets[key] = result.ticks;
  rakahDrafts.delete(`${dateText}:${key}`);
  // a typed total above 12 is replaced by what the ticks now say
  if (result.total) pend.rakahs[key] = result.total; else delete pend.rakahs[key];
  savePending();
  playSelectSound('voluntary', !!result.ticks[index], result.ticks.filter(Boolean).length);
  render();
}

function confirmExtraRakahs(key, dateText, raw, form) {
  const date = new Date(`${dateText}T12:00:00`);
  const event = findRecordableEvent('voluntary', key, date);
  const input = form?.querySelector('input');
  const msg = form?.querySelector('.vol-extra-msg');
  const check = validateExtraRakahs(key, raw);
  if (!check.ok) {
    if (msg) msg.textContent = extraErrorText(check.error, { key, count: check.count });
    if (input) input.setAttribute('aria-invalid', 'true');
    return false;
  }
  if (!event) return false;
  if (!voluntaryCanEdit(event, dayRecord(event.date, false))) { showToast('This prayer event is not currently available.'); render(); return false; }
  // v3.0.4 C: the typed total is a selection too; Mark Complete records it.
  const result = applyExtra(key, check.count);
  const pend = pendingDay(event.date);
  pend.rakahSets ||= {}; pend.rakahs ||= {};
  pend.rakahSets[key] = result.ticks;
  pend.rakahs[key] = result.total;
  rakahDrafts.delete(`${dateText}:${key}`);
  savePending();
  playSelectSound('voluntary', true, result.ticks.filter(Boolean).length);
  render();
  return true;
}


function toggleCardInfo(button) {
  const key = button?.dataset?.cardInfo;
  if (key) navigateToPrayerDescription(key);
}

const DATE_SPECIFIC_VOLUNTARY = ['eid_prayer', 'tarawih'];

/* Before Fajr, the active prayer day is still the previous civil date
   (Isha, Witr, Qiyam and Tahajjud belong to it), so Today's progress follows it. */
function progressDate(now = new Date()) {
  const today = startOfDay(now);
  const times = getTimes(today);
  return times?.fajr && now < times.fajr ? addDays(today, -1) : today;
}

/* Layered state for one prayer day, in prayer-time order on every ring:
   white Fard, green Sunnah, black Nafl, striped standalone voluntary and
   (on days that have them) saffron date-specific prayers. */
function dayLayers(day) {
  const record = dayRecord(day, false);
  const fardFlags = FARD.map(prayer => fardSlotDone(record.fard, prayer.key, day));
  const fardDone = fardFlags.filter(Boolean).length;
  const events = getVoluntaryEvents(day);
  const { standalone, seasonal } = splitVoluntary(events);
  const voluntaryFlags = standalone.map(event => voluntaryEventDone(record, event.key, day));
  const seasonalFlags = seasonal.map(event => voluntaryEventDone(record, event.key, day));
  const doneFlags = events.map(event => voluntaryEventDone(record, event.key, day));
  const voluntaryDone = doneFlags.filter(Boolean).length;
  // The green/black rings follow the Hanafi rawatib; in Ja'fari mode they are not drawn or required.
  const empty = { flags: [], done: 0, total: 0, complete: false };
  const sunnah = shiaMode() ? empty : layerState(record, 'sunnah');
  const nafl = shiaMode() ? empty : layerState(record, 'nafl');
  const flags = { fard: fardFlags, sunnah: sunnah.flags, nafl: nafl.flags, voluntary: voluntaryFlags, seasonal: seasonalFlags };
  const count = list => ({ done: list.filter(Boolean).length, total: list.length });
  const summary = progressSummary({ fard: count(fardFlags), sunnah: count(sunnah.flags), nafl: count(nafl.flags), voluntary: count(voluntaryFlags), seasonal: count(seasonalFlags) });
  return { record, fardDone, events, standalone, seasonal, doneFlags, voluntaryDone, totalVoluntary: events.length, sunnah, nafl, flags, summary };
}

/** Which progress layer a tick belongs to (for colours and sounds). */
function layerOf(kind, key) {
  if (kind === 'fard') return 'fard';
  if (kind === 'voluntary') return isSeasonal(key) ? 'seasonal' : 'voluntary';
  return kind === 'sunnah' || kind === 'nafl' ? kind : 'voluntary';
}

// Last rendered figure state, so only a newly ticked segment sweeps and only
// a ring that has just closed glows in.
let lastFigure = { day: '', flags: null, reward: false };

/* Calculation profile selects (method, school, high-latitude rule), bilingual. */
function renderProfileSettings() {
  const bn = lang() === 'bn';
  const fill = (id, table, value) => {
    const select = $(id);
    if (!select) return;
    select.innerHTML = Object.entries(table).map(([key, item]) => `<option value="${key}">${escapeHtml(bn ? item.bn : item.en)}</option>`).join('');
    select.value = value;
  };
  fill('methodSelect', CALCULATION_METHODS, state.profile.method);
  fill('schoolSelect', SCHOOLS, state.profile.school);
  fill('highLatSelect', HIGH_LATITUDE_RULES, state.profile.highLatitude);
  const method = CALCULATION_METHODS[state.profile.method];
  const summary = $('profileSummary');
  if (summary) summary.textContent = `${bn ? (state.profile.method === 'karachi' ? 'করাচি' : method.bn.split(' (')[0]) : (state.profile.method === 'karachi' ? 'Karachi' : method.en.split(' (')[0])} · ${schoolShort()}`;
  const note = $('profileNote');
  if (note) {
    note.textContent = shiaMode()
      ? (bn ? 'জাফরি মোড: মাগরিব পূর্ব আকাশের লালিমা মিলিয়ে যাওয়ার পর (কোণভিত্তিক), আসর এক গুণ ছায়ায়, এশার শেষ মধ্যরাতে (সূর্যাস্ত ও ফজরের মাঝামাঝি)। যোহর-আসর এবং মাগরিব-এশা একসাথে আদায় করা যায়। হানাফি সুন্নাত/বিতর নির্দেশনা এ মোডে লুকানো থাকে।'
        : 'Ja‘fari mode: Maghrib after the eastern redness disappears (angle-based), Asr at shadow factor 1, Isha ends at midnight (halfway between sunset and Fajr). Dhuhr with Asr and Maghrib with Isha may be combined. Hanafi Sunnah/Witr guidance is hidden in this mode.')
      : (bn ? 'ম্যানুয়াল মিনিট সমন্বয় নির্বাচিত পদ্ধতির ওপর প্রয়োগ হয়। পরিবর্তন সঙ্গে সঙ্গে হিসাব হয় এবং এই ডিভাইসে সংরক্ষিত থাকে; ইতিহাস অপরিবর্তিত থাকে।'
        : 'Manual minute adjustments apply on top of the selected method. Changes recompute immediately and are saved on this device; history is not affected.');
  }
}

/* Day-aware status line under Today's Progress (see src/day-status.js). */
function progressStatus(day, fardDone, now = new Date()) {
  const times = getTimes(day);
  return dayStatus({
    lang: lang(),
    shia: shiaMode(),
    weekday: day.getDay(),
    dayHijri: hijriParts(day),
    nightHijri: currentHijriDate(now),
    fardDone,
    maghribTime: times?.maghrib ? fmt(times.maghrib) : null,
    ishaTime: times?.isha ? fmt(times.isha) : null,
    afterMaghrib: !!(times?.maghrib && now >= times.maghrib),
    hasTimes: !!times
  });
}

/* Conversational line for the card (src/progress-lines.js), kept stable between
   events: the chosen line is remembered per situation, and recent lines are
   remembered (capped) so wording stays fresh for weeks. */
const LINE_MEMORY_KEY = 'prayer-times-line-memory';
/* Today's Progress line on reopen (v1.3.3). While the window stays visible the line changes only on events.
   Each time it is shown again after being hidden to the tray, ONE new line is chosen (never the one on screen).
   Tauri 2 signals this two ways, and both are handled: the Rust side emits `main-window-shown` / `main-window-hidden`
   (window.hide() on close-to-tray does not reliably raise visibilitychange in WebView2), and the page's own
   visibilitychange / focus events cover minimise and restore. A reopen raises several signals; one wins. */
let pendingLineRefresh = 0;
let lineRefreshCount = 0;
let windowWasHidden = false;
let lastReopenAt = 0;
function onWindowReopened(source) {
  if (source !== 'rust' && !windowWasHidden) return; // plain focus changes while visible never change the line
  const now = Date.now();
  windowWasHidden = false;
  if (now - lastReopenAt < 2000) return;
  lastReopenAt = now;
  pendingLineRefresh = ++lineRefreshCount;
  renderProgress();
  pendingLineRefresh = 0;
}

function readLineMemory() {
  try { const m = JSON.parse(localStorage.getItem(LINE_MEMORY_KEY) || '{}'); return { recent: Array.isArray(m.recent) ? m.recent.slice(-400) : [], current: m.current || null, sugg: m.sugg || {} }; }
  catch { return { recent: [], current: null, sugg: {} }; }
}
function writeLineMemory(memory) {
  try { localStorage.setItem(LINE_MEMORY_KEY, JSON.stringify({ ...memory, recent: memory.recent.slice(-400) })); } catch { /* storage full: keep working without memory */ }
}
function conversationalLine(day, now = new Date()) {
  const times = getTimes(day);
  if (!times) return null;
  const record = dayRecord(day, false);
  const fard = getAllFardForDate(day).map(e => {
    const partsAll = prayerParts(e.key).filter(part => !shiaMode() || part.layer === 'fard');
    const ticked = part => (part.layer === 'fard' ? fardSlotDone(record.fard, e.key, day) : !!record[part.layer]?.[part.slot.key]);
    const rak = part => (part.layer === 'fard'
      ? (e.key === 'dhuhr' && day.getDay() === 5 ? fridayFardRakahs(record) || FARD_RAKAHS[e.key] : FARD_RAKAHS[e.key])
      : parseInt(part.slot.en, 10) || 0);
    const at = record.at?.[`fard:${e.key}`];
    const fridayChoice = e.key === 'dhuhr' && day.getDay() === 5 ? fridayFardChoice(record) : null;
    return {
      key: e.key, start: e.start.getTime(), end: e.end.getTime(), done: fardSlotDone(record.fard, e.key, day),
      tickedAt: Array.isArray(at) && Number.isFinite(at[0]) ? e.start.getTime() + at[0] * 60000 : null,
      parts: partsAll.filter(ticked).map(rak).filter(Boolean),
      full: partsAll.length > 0 && partsAll.every(ticked),
      fridayChoice
    };
  });
  const today = dateKey(day);
  const habits = analyzeHabits(state.history, today);
  const memory = readLineMemory();
  // a Sunnah/Nafl suggestion: rare, with a short heads-up shortly before it opens and again while it is open (see src/habits.js)
  const candidates = shiaMode() ? [] : getVoluntaryEvents(day)
    .filter(e => ['duha', 'awwabin'].includes(e.key) && now.getTime() >= e.start.getTime() - VOLUNTARY_HEADS_UP_MINUTES * 60000 && now < e.end)
    .map(e => ({ kind: 'voluntary', key: e.key, phase: now >= e.start ? 'open' : 'soon', name: { en: e.key === 'duha' ? 'Duha' : 'Awwabin', bn: e.key === 'duha' ? 'দুহা' : 'আওয়াবিন' } }));
  const picked = shiaMode() ? null : pickSuggestion({ candidates, history: state.history, todayKey: today, memory: memory.sugg, shia: false });
  const voluntary = getVoluntaryEvents(day).map(e => {
    const at = record.at?.[`voluntary:${e.key}`];
    const rakahs = Number(record.rakahs?.[e.key] || 0);
    const tickedAt = Array.isArray(at) && Number.isFinite(at[2]) ? at[2]
      : (Array.isArray(at) && Number.isFinite(at[0]) ? e.start.getTime() + at[0] * 60000 : null);
    return {
      key: e.key, start: e.start.getTime(), end: e.end.getTime(), done: !!record.voluntary?.[e.key],
      tickedAt,
      rakahs, parts: rakahs ? [rakahs] : []
    };
  }).filter(v => v.done);
  const result = progressLine({
    lang: lang(), dateKey: today, now: now.getTime(), friday: day.getDay() === 5,
    fmt: ms => fmt(new Date(ms)), fard, voluntary, habits, memory: { ...memory, recent: recentIdsWithin(memory.recent, now.getTime()) }, refresh: pendingLineRefresh, suggestion: picked ? { name: picked.name, phase: picked.phase } : null,
    banIds: recentIdsWithin(memory.recent, now.getTime())
  });
  pendingLineRefresh = 0;
  if (!result) return null;
  if (!memory.current || memory.current.sig !== result.sig || memory.current.id !== result.id) {
    memory.recent.push({ id: result.id, at: now.getTime() });
    memory.current = { sig: result.sig, id: result.id };
  }
  if (picked && result.suggested && memory.sugg.day !== today) memory.sugg = { day: today, key: picked.key };
  writeLineMemory(memory);
  return result;
}

let recognitionShow = null;
let verseShow = null;
let blessedSignature = '';
function kindsJustRecorded(before, after) {
  const kinds = [];
  for (const layer of ['fard', 'sunnah', 'nafl', 'voluntary', 'seasonal']) {
    const was = before?.summary?.layers?.[layer]?.done || 0;
    const nowDone = after?.summary?.layers?.[layer]?.done || 0;
    if (nowDone > was) kinds.push(layer === 'seasonal' ? 'voluntary' : layer);
  }
  return kinds;
}
function noteRecognition(before, after, explicitKinds) {
  lastRecordAt = Date.now(); // A Blessed Reminder: the gratitude moment follows a tick
  if (state.showRewardText === false) return;
  const key = highestKind(explicitKinds && explicitKinds.length ? explicitKinds : kindsJustRecorded(before, after));
  if (!key) return;
  const seconds = rewardSeconds(state.recognitionPace);
  recognitionShow = { key, until: Date.now() + seconds * 1000 };
  noteFardVerse(before, after);
  scheduleRewardClear(Math.max(seconds, verseShow ? verseSeconds(state.recognitionPace) : 0));
}
function noteFardVerse(before, after) {
  if (state.showRewardText === false) return;
  if (!after?.summary?.fardDisc || before?.summary?.fardDisc) return;
  const seconds = verseSeconds(state.recognitionPace);
  verseShow = { until: Date.now() + seconds * 1000 };
}
/* A reward is never left on screen after its time is up: repaint just after it expires. */
function scheduleRewardClear(seconds) {
  window.setTimeout(() => renderProgress(), seconds * 1000 + 120);
}
function activeRecognition() {
  if (state.showRewardText === false) return null;
  if (!recognitionShow || Date.now() > recognitionShow.until) return null;
  return phraseLines(recognitionShow.key, lang());
}
function voluntaryRakahTotal(day) {
  const record = dayRecord(day, false);
  let total = 0;
  for (const value of Object.values(record.rakahs || {})) total += Number(value) || 0;
  return total;
}

/* ---- A Blessed Reminder: passages of the lunar-year plan (v3.0.6 D) ---- */
let lastRecordAt = 0;
let blessedFardDone = null;
let blessedView = { index: -1, expanded: false, full: false };
let blessedMomentPick = null; // { key, moment, index }: the themed passage a moment brought up, until it is read
let blessedShown = null;      // { key, index }: the passage on the card, kept while it is unread
let blessedJustRead = null;   // { index, until }: "Read ✓" stays on the button for a moment
/* G: the reading day changes at midnight in the time zone of the saved location (offline lookup with
   tz-lookup; the device time zone only if the location has none). The day's Hijri date is the one
   current during that civil day's daytime, so a Maghrib change does not move the portion. */
function locationTimeZone() {
  if (!hasLocation()) return null;
  try { return tzlookup(Number(state.lat), Number(state.lon)) || null; } catch { return null; }
}
function readingCivilDate(now = new Date()) {
  const zone = locationTimeZone();
  if (zone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now);
      const get = type => Number(parts.find(part => part.type === type)?.value);
      if (get('year') && get('month') && get('day')) return new Date(get('year'), get('month') - 1, get('day'), 12);
    } catch { /* unknown zone in this WebView: device date */ }
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}
function readingContext(now = new Date()) {
  const R = readingLoaded();
  if (!R) return null;
  const civil = readingCivilDate(now);
  const hijri = hijriParts(civil);
  if (!hijri) return null;
  const days = hijriYearDays(hijri.year);
  const dayOfYear = Math.min(days, hijriDayOfYear(hijri));
  const portion = todaysPortion(R.passages, R.quran, { hijri, dayOfYear, days });
  const store = readStore();
  const indices = portion.items.map(item => item.index);
  const read = readCount(store, hijri.year, indices);
  return { R, civil, hijri, days, dayOfYear, portion, store, key: `${hijri.year}-${dayOfYear}`, read, total: indices.length, juz: planJuz(R.passages, portion.range) };
}
function blessedMoment(now, fardDone) {
  const times = getTimes(startOfDay(now));
  const justTicked = Date.now() - lastRecordAt < 60000;
  const allFardJustDone = fardDone === 5 && blessedFardDone !== null && blessedFardDone < 5;
  blessedFardDone = fardDone;
  const jumuahWindow = now.getDay() === 5 && !!times && now >= times.dhuhr && now < times.asr;
  const fajrFirst30 = !!times && now >= times.fajr && now.getTime() < times.fajr.getTime() + 30 * 60000;
  return momentTheme({ justTicked, allFardJustDone, jumuahWindow, fajrFirst30 });
}
/* A: the card shows the first unread passage of today's portion (a featured passage first). A moment
   (gratitude, Jumu'ah, dawn) may bring up an unread passage of today's portion with that theme, the
   tagged verses first, as before; it stays until it is read. Only "Mark as read" marks a passage. */
function chooseBlessedForNow(fardDone) {
  const now = new Date();
  const moment = blessedMoment(now, fardDone);
  const ctx = readingContext(now);
  if (!ctx) return null;
  const { R, portion, store, hijri, key } = ctx;
  const unread = portion.items.map(item => item.index).filter(i => !isRead(store, hijri.year, i));
  if (blessedJustRead && Date.now() < blessedJustRead.until) return { ...ctx, index: blessedJustRead.index, justRead: true, allRead: unread.length === 0 };
  blessedJustRead = null;
  if (!unread.length) {
    const last = blessedShown && blessedShown.key === key ? blessedShown.index : portion.items[portion.items.length - 1]?.index;
    return { ...ctx, index: last ?? null, allRead: true };
  }
  if (blessedMomentPick && (blessedMomentPick.key !== key || !unread.includes(blessedMomentPick.index))) blessedMomentPick = null;
  if (moment && (!blessedMomentPick || blessedMomentPick.moment !== moment)) {
    const P = R.passages;
    const themed = unread.find(i => hasTagged(P, i, moment)) ?? unread.find(i => hasTheme(P, i, moment));
    if (themed != null) blessedMomentPick = { key, moment, index: themed };
  }
  const index = blessedMomentPick ? blessedMomentPick.index : unread[0];
  blessedShown = { key, index };
  return { ...ctx, index, allRead: false, mode: blessedMomentPick ? 'moment' : 'order' };
}
function markButtonHtml(index, read) {
  const L = lang();
  return `<button class="blessed-more blessed-mark${read ? ' is-read' : ''}" type="button" data-blessed-mark="${index}" data-read="${read ? '1' : '0'}">${escapeHtml((read ? PLAN_TEXT.undoRead : PLAN_TEXT.markRead)[L])}</button>`;
}
function passageHtml(view, where, extra = {}) {
  const L = lang();
  const more = view.truncated || view.expanded
    ? `<button class="blessed-more" type="button" data-blessed-toggle="1">${escapeHtml((view.expanded ? READ_LESS : READ_MORE)[L])}</button>` : '';
  const full = view.sectionIsPassage && !view.full ? '' : `<button class="blessed-more blessed-full" type="button" data-blessed-full="1">${escapeHtml((view.full ? READ_LESS : FULL_SECTION)[L])}</button>`;
  const portion = where === 'note' ? `<button class="blessed-more blessed-portion" type="button" data-blessed-portion="1">${escapeHtml(TODAYS_PORTION[L])}</button>` : '';
  let mark = '';
  if (where === 'note') {
    if (extra.justRead) mark = `<button class="blessed-more blessed-mark is-read" type="button" disabled data-blessed-done="1">${escapeHtml(PLAN_TEXT.readDone[L])}</button>`;
    else if (extra.allRead) mark = `<span class="blessed-all-read" data-blessed-all-read="1">${escapeHtml(PLAN_TEXT.allRead[L])}</span>`;
    else mark = `<button class="blessed-more blessed-mark" type="button" data-blessed-mark="${view.index}" data-read="0">${escapeHtml(PLAN_TEXT.markRead[L])}</button>`;
  }
  const note = extra.featured ? `<p class="blessed-featured" data-featured="${escapeHtml(extra.featured.id)}">${escapeHtml(extra.featured.note[L])}</p>` : '';
  const verses = view.verses.map(v => `<span class="blessed-verse"><sup class="blessed-num">${escapeHtml(L === 'bn' ? localizeDigits(v.ayah) : v.ayah)}</sup> ${escapeHtml(v.text)}</span>`).join(' ');
  return `${note}<p class="blessed-subject">${escapeHtml(view.subject)}</p><p class="blessed-tr" lang="${L}">${verses}</p><p class="blessed-ref">${escapeHtml(view.full ? view.sectionRef : view.ref)}</p><div class="blessed-actions">${more}${full}${portion}${mark}</div>`;
}
function bindPassageButtons(root, view, rerender) {
  root.querySelector('[data-blessed-toggle]')?.addEventListener('click', () => {
    const same = blessedView.index === view.index;
    blessedView = { index: view.index, expanded: !(same && blessedView.expanded), full: false };
    rerender();
  });
  root.querySelector('[data-blessed-full]')?.addEventListener('click', () => {
    const same = blessedView.index === view.index;
    blessedView = { index: view.index, expanded: false, full: !(same && blessedView.full) };
    rerender();
  });
}
/* A/B: mark or unmark one passage for the Hijri year of today's reading day. */
function setPassageRead(index, read) {
  const ctx = readingContext(new Date());
  if (!ctx) return false;
  const done = setRead(undefined, ctx.hijri.year, index, read);
  if (done) renderReadingSettings(); // F: the Settings year line follows each mark at once (not only after a reload)
  return done;
}
/* Today's portion: the day's passages (a featured passage first, with its note). Each passage has its own
   Mark as read / Undo read; opening one only shows it. "X passages behind this year" opens the earlier
   unread passages of the plan, oldest first, with the same buttons (F). */
let portionOpen = -1;
let portionMode = 'today'; // 'today' | 'behind'
let behindIndices = [];
function openTodaysPortion() {
  const dialog = $('portionDialog');
  if (!dialog) return;
  portionOpen = -1;
  portionMode = 'today';
  renderTodaysPortion();
  if (!dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.hidden = false; }
}
function renderTodaysPortion() {
  const ctx = readingContext(new Date());
  const list = $('portionList');
  if (!ctx || !list) return;
  const { R, portion, store, hijri } = ctx;
  const L = lang();
  const bn = L === 'bn';
  $('portionClose')?.setAttribute('aria-label', bn ? 'বন্ধ করুন' : 'Close');
  const behindNow = behindList(R.passages, store, { year: hijri.year, dayOfYear: ctx.dayOfYear, days: ctx.days });
  const nav = $('portionNav');
  let entries;
  if (portionMode === 'behind') {
    $('portionTitle').textContent = PLAN_TEXT.behindTitle[L];
    $('portionSummary').textContent = behindLine(behindNow.length, L);
    entries = behindIndices.map(index => ({ index, featured: null }));
    if (nav) { nav.hidden = false; nav.innerHTML = `<button class="blessed-more" type="button" data-portion-back="1">${escapeHtml(PLAN_TEXT.behindBack[L])}</button>`; }
  } else {
    $('portionTitle').textContent = TODAYS_PORTION[L];
    $('portionSummary').textContent = planProgressLine({ juz: ctx.juz, read: ctx.read, total: ctx.total }, L);
    entries = portion.items;
    if (nav) {
      nav.hidden = behindNow.length === 0;
      nav.innerHTML = behindNow.length ? `<button class="blessed-more blessed-behind" type="button" data-portion-behind="1">${escapeHtml(behindLine(behindNow.length, L))}</button>` : '';
    }
  }
  const items = [];
  for (const { index: i, featured } of entries) {
    const read = isRead(store, hijri.year, i);
    const opened = portionOpen === i;
    const view = presentPassage(R, i, L, { expanded: opened && blessedView.index === i && blessedView.expanded, full: opened && blessedView.index === i && blessedView.full });
    const note = featured ? `<span class="portion-featured" data-featured="${escapeHtml(featured.id)}">${escapeHtml(featured.note[L])}</span>` : '';
    const head = `<button class="portion-head" type="button" data-portion-open="${i}" aria-expanded="${opened}"><span class="portion-ref">${escapeHtml(view.ref)}</span><span class="portion-subject">${escapeHtml(view.subject)}</span>${read ? '' : `<span class="portion-unread">${bn ? 'অপঠিত' : 'Unread'}</span>`}</button>`;
    items.push(`<li class="portion-item${read ? ' is-read' : ' is-unread'}${opened ? ' is-open' : ''}${featured ? ' is-featured' : ''}" data-portion="${i}">${note}${head}<div class="portion-mark">${markButtonHtml(i, read)}</div>${opened ? `<div class="portion-body">${passageHtml(view, 'portion')}</div>` : ''}</li>`);
  }
  list.innerHTML = items.join('');
  const rerender = () => { const keep = list.scrollTop; renderTodaysPortion(); list.scrollTop = keep; if (currentPage === 'home') renderProgress(); };
  list.querySelectorAll('[data-portion-open]').forEach(button => button.addEventListener('click', () => {
    const i = Number(button.dataset.portionOpen);
    portionOpen = portionOpen === i ? -1 : i;
    rerender();
  }));
  list.querySelectorAll('[data-blessed-mark]').forEach(button => button.addEventListener('click', () => {
    setPassageRead(Number(button.dataset.blessedMark), button.dataset.read !== '1');
    rerender();
  }));
  nav?.querySelector('[data-portion-behind]')?.addEventListener('click', () => { behindIndices = behindNow; portionMode = 'behind'; portionOpen = -1; list.scrollTop = 0; renderTodaysPortion(); });
  nav?.querySelector('[data-portion-back]')?.addEventListener('click', () => { portionMode = 'today'; portionOpen = -1; list.scrollTop = 0; renderTodaysPortion(); });
  const body = list.querySelector('.portion-item.is-open');
  if (body) bindPassageButtons(body, presentPassage(R, portionOpen, L), () => { const keep = list.scrollTop; renderTodaysPortion(); list.scrollTop = keep; });
}
function renderReadingSettings() {
  const R = readingLoaded();
  const line = $('blessedMonthLine');
  if (line && R) {
    const ctx = readingContext(new Date());
    if (ctx) {
      const L = lang();
      const years = [...new Set([ctx.hijri.year, ...storedYears(ctx.store).filter(y => y < ctx.hijri.year)])];
      line.innerHTML = years.map(y => `<span class="blessed-year-line">${escapeHtml(yearLine(y, yearReadCount(ctx.store, y), L))}</span>`).join('<br>');
    }
  }
  if ($('blessedProgressToggle')) $('blessedProgressToggle').checked = state.blessedProgress !== false;
}

function renderProgress() {
  const day = progressDate(new Date());
  const { fardDone, standalone, seasonal, sunnah, nafl, flags, summary } = dayLayers(day);
  const key = dateKey(day);
  const previous = lastFigure.day === key ? lastFigure.flags : null;
  const changes = previous ? figureChanges(previous, flags) : { sweep: new Set(), closing: new Set() };
  const showText = state.showRewardText !== false;
  const verse = null; // v2.5.3: the all-Fard ayah is a timed card, not a permanent disc inscription
  const verseCard = showText && verseShow && Date.now() <= verseShow.until ? dayVerseLines(lang()) : null;
  const rewardFade = summary.fardDisc && !!previous && !lastFigure.fardDisc;
  const figure = $('progressFigure');
  figure.innerHTML = figureSvg(flags, { sweep: changes.sweep, closing: changes.closing, rewardFade, showVerse: !!verse });
  lastFigure = { day: key, flags, reward: summary.reward, fardDisc: summary.fardDisc };
  const core = $('progressCore');
  // v2.1.1: the phrase never goes inside the (small) disc any more; it is shown in the reward panel next to it.
  const recognition = activeRecognition();
  core.textContent = `${fardDone}/5`;
  core.classList.remove('is-recognition');
  core.hidden = !!verse;
  const visual = $('progressVisual');
  visual.classList.toggle('all-done', summary.good);
  visual.classList.toggle('great-done', summary.great);
  visual.classList.toggle('disc-done', summary.fardDisc);
  visual.classList.toggle('has-seasonal', summary.hasSeasonal);
  visual.classList.toggle('is-phrase', !!recognition);
  $('legendSeasonal').hidden = !summary.hasSeasonal;
  const status = progressStatus(day, fardDone);
  const line = status ? null : conversationalLine(day);
  const plainTitle = lang() === 'bn' ? 'আজ' : 'Today';
  $('progressTitle').textContent = summary.great ? 'Great Job!' : summary.good ? 'Good Job!' : status ? status.title : plainTitle;
  const statusEl = $('progressStatus');
  // Once Good/Great Job takes the title, a date headline moves into the line.
  statusEl.textContent = status ? (summary.good && status.key !== 'all-done' ? `${status.title} · ${status.detail}` : status.detail) : (line?.text || '');
  statusEl.dataset.tier = status ? String(status.tier) : 'line';
  statusEl.dataset.key = status ? status.key : (line?.state || 'none');
  statusEl.hidden = !statusEl.textContent;
  const bn = lang() === 'bn';
  const n = value => bn ? localizeDigits(value) : value;
  const L = summary.layers;
  const seasonalText = summary.hasSeasonal
    ? (bn ? ` · বিশেষ দিনের নামাজ ${n(L.seasonal.done)}/${n(L.seasonal.total)}` : ` · date-specific ${L.seasonal.done}/${L.seasonal.total}`)
    : '';
  const volRak = voluntaryRakahTotal(day);
  const volText = volRak
    ? (bn ? `ঐচ্ছিক ${n(volRak)} রাকাত` : `Voluntary ${volRak} rak‘ahs`)
    : (bn ? 'ঐচ্ছিক এখনও নেই' : 'Voluntary none yet');
  const caption = summary.great
    ? (bn ? 'আজকের ফরজ, সুন্নাত, নফল ও সব নফল ইবাদত সম্পন্ন হয়েছে।' : 'All Fard, Sunnah, Nafl and every voluntary prayer for today are complete.')
    : bn
      ? `ফরজ ${n(fardDone)}/৫ · সুন্নাত ${n(sunnah.done)}/${n(sunnah.total)} · নফল ${n(nafl.done)}/${n(nafl.total)} · ${volText}${seasonalText}`
      : `Fard ${fardDone}/5 · Sunnah ${sunnah.done}/${sunnah.total} · Nafl ${nafl.done}/${nafl.total} · ${volText}${seasonalText}`;
  const captionEl = $('progressCaption');
  const extraNafl = otherNaflCount(dayRecord(day, false));
  const extraText = extraNafl
    ? (bn ? ` · অন্যান্য নফল ${n(extraNafl)} রাকাত` : ` · other nafl ${extraNafl} rak‘ahs`)
    : '';
  const verseText = verse ? ` · ${verse.tr} — ${verse.meaning} (${verse.ref})` : '';
  captionEl.textContent = `${caption}${extraText}${verseText}`;
  const rewardEl = $('progressReward');
  if (rewardEl) rewardEl.hidden = true; // legacy in-disc overlay: the SVG disc text and the reward panel replace it
  const aria = bn
    ? `${captionEl.textContent}`
    : `${captionEl.textContent}`;
  visual.dataset.originalAriaLabel = aria;
  visual.setAttribute('aria-label', aria);
  void standalone; void seasonal;
  const reflectionSignature = `${key}|${status ? status.key : (line?.sig || line?.id || 'none')}|${lineRefreshCount}`;
  const reflectionChoice = chooseBlessedForNow(fardDone);
  const reflection = reflectionChoice && reflectionChoice.index != null && readingLoaded()
    ? presentPassage(readingLoaded(), reflectionChoice.index, lang(), { expanded: blessedView.index === reflectionChoice.index && blessedView.expanded, full: blessedView.index === reflectionChoice.index && blessedView.full })
    : null;
  blessedSignature = reflectionSignature;
  const rewardBox = $('voluntaryReward');
  let showingReward = false;
  if (rewardBox) {
    const phrase = recognition;
    const parts = [];
    if (phrase) parts.push(`<div class="reward-phrase"><b class="recog-ar" lang="ar" dir="rtl">${escapeHtml(phrase.ar)}</b><span class="recog-tr">${escapeHtml(phrase.tr)}</span><small class="recog-mean">${escapeHtml(phrase.meaning)}</small></div>`);
    rewardBox.hidden = parts.length === 0;
    rewardBox.dataset.kind = phrase && recognitionShow ? recognitionShow.key : '';
    rewardBox.innerHTML = parts.join('');
    showingReward = parts.length > 0;
  }
  const verseEl = $('fardVerseCard');
  if (verseEl) {
    verseEl.hidden = !verseCard;
    verseEl.innerHTML = verseCard
      ? `<div class="reward-phrase"><b class="recog-ar" lang="ar" dir="rtl">${escapeHtml(verseCard.ar)}</b><span class="recog-tr">${escapeHtml(verseCard.tr)}</span><small class="recog-mean">${escapeHtml(verseCard.meaning)} · ${escapeHtml(verseCard.ref)}</small></div>`
      : '';
  }
  const dailyNote = $('dailyNote');
  if (dailyNote) {
    dailyNote.hidden = showingReward;
    if (!reflection) {
      dailyNote.innerHTML = '';
    } else {
      const L = bn ? 'bn' : 'en';
      const featured = reflectionChoice.portion.items.find(item => item.index === reflectionChoice.index)?.featured || null;
      dailyNote.innerHTML = `<div class="eyebrow">${escapeHtml(BLESSED_TITLE[L])}</div>${passageHtml(reflection, 'note', { featured, allRead: reflectionChoice.allRead, justRead: reflectionChoice.justRead })}${state.blessedProgress === false ? '' : `<p class="blessed-progress" data-blessed-progress="1">${escapeHtml(planProgressLine({ juz: reflectionChoice.juz, read: reflectionChoice.read, total: reflectionChoice.total }, L))}</p>`}`;
      bindPassageButtons(dailyNote, reflection, () => renderProgress());
      dailyNote.querySelector('[data-blessed-portion]')?.addEventListener('click', openTodaysPortion);
      dailyNote.querySelector('[data-blessed-mark]')?.addEventListener('click', event => {
        const index = Number(event.currentTarget.dataset.blessedMark);
        if (!setPassageRead(index, true)) return;
        blessedJustRead = { index, until: Date.now() + 1200 };
        if (blessedMomentPick && blessedMomentPick.index === index) blessedMomentPick = null;
        renderProgress();
        window.setTimeout(() => { if (currentPage === 'home') renderProgress(); }, 1250);
      });
    }
  }
  translateRenderedText();
}

/* A prayer's parts in performance order (e.g. Dhuhr: 4 Sunnah before, Fard,
   2 Sunnah after, 2 Nafl): large white Fard circle, smaller green Sunnah and
   black Nafl circles, joined by short connectors. Clickable only while that
   prayer's window is open, like the main tick; correctable by unticking. */
/* v3.0.5: tick chronology. The prayer's circles in card order (recorded + selected); an empty circle with a
   ticked circle after it is locked until the later ones are unticked. Returns a Map "layer:key" -> locked. */
function partOrderLocks(prayerKey, date, record = selectionView(date)) {
  const ordered = prayerParts(prayerKey).filter(part => !shiaMode() || part.layer === 'fard');
  const friday = prayerKey === 'dhuhr' && date.getDay() === 5;
  const flags = ordered.map(part => part.layer === 'fard'
    ? (friday ? !!fridayFardChoice(record) : !!record.fard?.[prayerKey])
    : !!record[part.layer]?.[part.slot.key]);
  const locks = orderLocks(flags);
  return new Map(ordered.map((part, i) => [part.layer === 'fard' ? 'fard' : `${part.layer}:${part.slot.key}`, locks[i]]));
}

function partsHtml(prayerKey, date, enabled, { includeFard = true } = {}) {
  const record = selectionView(date); // v3.0.4: recorded + selected
  const saved = dayRecord(date, false);
  const bn = lang() === 'bn';
  const L = bn ? 'bn' : 'en';
  const order = partOrderLocks(prayerKey, date, record);
  const orderAttr = ' disabled aria-disabled="true" data-locked="true" data-order-locked="true"';
  // Ja'fari mode shows only the Fard (the Sunnah/Nafl here follow Hanafi rawatib).
  const parts = prayerParts(prayerKey).filter(part => (includeFard || part.layer !== 'fard') && (!shiaMode() || part.layer === 'fard'));
  const items = parts.map(part => {
    if (part.layer === 'fard') {
      if (prayerKey === 'dhuhr' && date.getDay() === 5) {
        const choice = fridayFardChoice(record);
        const shown = choice === 'dhuhr' ? 'dhuhr' : choice ? 'jumuah' : null;
        const timeLock = shownFridayFard(saved) ? lockTipFor('fard', prayerKey, date) : '';
        return FRIDAY_FARD_OPTIONS.map(opt => {
          const done = shown === opt.key;
          const exclusive = !!(shown && shown !== opt.key);
          const ordered = !shown && order.get('fard');
          const locked = !!(timeLock && done) || exclusive || ordered;
          const label = fridayFardOptionLabel(opt.key, L);
          const tip = exclusive
            ? (bn ? (shown === 'jumuah' ? 'যোহর বেছে নিতে আগে জুমা আনটিক করুন' : 'জুমা বেছে নিতে আগে যোহর আনটিক করুন')
              : (shown === 'jumuah' ? 'Untick Jumu’ah to choose Dhuhr instead' : 'Untick Dhuhr to choose Jumu’ah instead'))
            : (timeLock || label);
          const aria = exclusive ? tip : (bn ? `${label} সম্পন্ন হিসেবে চিহ্নিত করুন` : `Mark ${label} complete`);
          return `<button type="button" class="part-tick fard${done ? ' done' : ''}${locked ? ' is-locked' : ''}${exclusive ? ' is-exclusive' : ''}" data-sub-layer="fard" data-sub-key="${opt.key}" data-sub-prayer="${prayerKey}" data-sub-date="${dateKey(date)}" aria-pressed="${done}"${ordered && enabled ? orderAttr : locked ? ` aria-disabled="true" data-locked="true"` : ''} aria-label="${escapeHtml(aria)}" title="${escapeHtml(tip)}"${enabled ? '' : ' disabled'}><i aria-hidden="true">${done ? '✓' : ''}</i><span>${escapeHtml(label)}</span>${timeLock && done ? lockMarkHtml(timeLock, true) : ''}</button>`;
        }).join('<span class="part-link" aria-hidden="true"></span>');
      }
      const done = !!record.fard?.[prayerKey];
      const lk = saved.fard?.[prayerKey] ? lockTipFor('fard', prayerKey, date) : '';
      const ordered = !done && order.get('fard');
      const label = fardPartLabel(prayerKey, date, L);
      const aria = bn ? `${slotName(prayerKey, date)} ফরজ সম্পন্ন হিসেবে চিহ্নিত করুন` : `Mark ${slotName(prayerKey, date)} Fard complete`;
      return `<button type="button" class="part-tick fard${done ? ' done' : ''}${lk ? ' is-locked' : ''}${ordered && enabled ? ' is-locked' : ''}" data-sub-layer="fard" data-sub-key="${prayerKey}" data-sub-prayer="${prayerKey}" data-sub-date="${dateKey(date)}" aria-pressed="${done}"${ordered && enabled ? orderAttr : lk ? ` aria-disabled="true" data-locked="true"` : ''} aria-label="${escapeHtml(aria)}" title="${escapeHtml(label)}"${enabled ? '' : ' disabled'}><i aria-hidden="true">${done ? '✓' : ''}</i><span>${escapeHtml(label)}</span>${lk ? lockMarkHtml(lk, true) : ''}</button>`;
    }
    const { layer, slot } = part;
    const done = !!record[layer]?.[slot.key];
    const lk = saved[layer]?.[slot.key] ? lockTipFor(layer, slot.key, date) : '';
    const ordered = !done && order.get(`${layer}:${slot.key}`);
    const label = slotShortLabel(slot, date, L);
    const full = slotLabel(slot, date, L);
    const kind = layer === 'sunnah' ? (bn ? 'সুন্নাত' : 'Sunnah') : (bn ? 'নফল' : 'Nafl');
    return `<button type="button" class="part-tick ${layer}${done ? ' done' : ''}${lk ? ' is-locked' : ''}${ordered && enabled ? ' is-locked' : ''}" data-sub-layer="${layer}" data-sub-key="${slot.key}" data-sub-prayer="${prayerKey}" data-sub-date="${dateKey(date)}" aria-pressed="${done}"${ordered && enabled ? orderAttr : lk ? ` aria-disabled="true" data-locked="true"` : ''} aria-label="${escapeHtml(`${slotName(prayerKey, date)} · ${kind}: ${full}`)}" title="${escapeHtml(`${kind}: ${full}`)}"${enabled ? '' : ' disabled'}><i aria-hidden="true">${done ? '✓' : ''}</i><span>${escapeHtml(label)}</span>${lk ? lockMarkHtml(lk, true) : ''}</button>`;
  });
  if (!items.length) return '';
  return `<div class="prayer-parts${enabled ? '' : ' is-closed'}" role="group" aria-label="${bn ? 'সুন্নাত, ফরজ ও নফল' : 'Sunnah, Fard and Nafl'}">${items.join('<span class="part-link" aria-hidden="true"></span>')}</div>`;
}

/* Note on a Daily prayers card, by school (src/prayer-card-notes.js). The Sunnah/Nafl
   sub-ticks stay available on the "available right now" card of the open prayer,
   which is the only time they can be ticked anyway. */
function prayerNoteHtml(prayerKey) {
  const note = cardNote(prayerKey, lang(), shiaMode() ? 'jafari' : state.profile.school);
  if (!note) return '';
  return `<p class="prayer-note">${escapeHtml(note.text)} <span class="prayer-note-ref">${escapeHtml(note.ref)}</span></p>`;
}

/** Sound cues for a tick/untick on one layer of a prayer day. */
function playLayerSound(layer, ticked, before, after) {
  if (!state.sound || state.tickSound === false) return;
  const step = Math.max(1, after.summary.layers[layer]?.done || 1);
  const cues = soundCues({
    layer,
    ticked,
    step,
    ringClosed: ticked && !!after.summary.complete[layer] && !before.summary.complete[layer],
    dayComplete: ticked && after.summary.reward && !before.summary.reward
  });
  playCues(cues, state.tickStyle, window);
}

function applyFridayFard(record, choice) {
  record.fard ||= {};
  if (choice === 'jumuah') {
    record.fard.jumuah = true;
    delete record.fard.dhuhr;
    record.fridayFard = 'jumuah';
  } else if (choice === 'dhuhr') {
    record.fard.dhuhr = true;
    delete record.fard.jumuah;
    record.fridayFard = 'dhuhr';
  } else {
    delete record.fard.dhuhr;
    delete record.fard.jumuah;
    delete record.fridayFard;
  }
}

function shownFridayFard(record) {
  const choice = fridayFardChoice(record);
  return choice === 'dhuhr' ? 'dhuhr' : choice ? 'jumuah' : null;
}

function toggleFridayOrFard(key, prayerKey, dateText) {
  if (prayerKey === 'dhuhr') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
    if (match) {
      const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (eventDate.getDay() === 5 && (key === 'jumuah' || key === 'dhuhr')) return toggleFridayFard(key, dateText);
    }
  }
  return togglePrayer('fard', prayerKey, dateText);
}

function toggleFridayFard(choice, dateText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
  if (!match) return;
  const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // v3.0.4 C: a recorded choice changes only from the Prayer record page (Undo).
  if (shownFridayFard(dayRecord(eventDate, false))) return;
  const shown = pendingDay(eventDate, false).fridayFard || null;
  if (shown && shown !== choice) return; // mutually exclusive: no sound
  const event = findRecordableEvent('fard', 'dhuhr', eventDate);
  const lock = event ? lockInstant(lockItem('fard', 'dhuhr'), lockContext(eventDate).events, lockContext(eventDate).nextFajr) : null;
  if (!event || !recordingOpen(event.start, event.end, lock && lock.at, new Date())) {
    showToast('This prayer event is not currently available.');
    render();
    return;
  }
  if (!shown && partOrderLocks('dhuhr', eventDate).get('fard')) return; // v3.0.5: a later circle is ticked
  const pend = pendingDay(eventDate);
  if (shown === choice) delete pend.fridayFard; else pend.fridayFard = choice;
  savePending();
  playSelectSound('fard', shown !== choice);
  render();
}

function toggleSubPrayer(layer, key, prayerKey, dateText) {
  if (layer === 'fard') return toggleFridayOrFard(key, prayerKey, dateText);
  const slot = findSlot(layer, key);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
  if (!slot || slot.prayer !== prayerKey || !match) return;
  const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const saved = dayRecord(eventDate, false);
  if (saved[layer]?.[key]) return; // v3.0.4 C: recorded parts change only from the Prayer record page
  const parent = findRecordableEvent('fard', prayerKey, eventDate);
  // Sunnah before: until the Fard is recorded. Sunnah/Nafl after: once the Fard is selected or recorded.
  const fardDone = slot.position === 'before' ? !!saved.fard?.[prayerKey] : !!selectionView(eventDate).fard?.[prayerKey];
  const partLock = parent ? lockInstant(lockItem(layer, key), lockContext(eventDate).events, lockContext(eventDate).nextFajr) : null;
  // v3.0.5: an empty circle with a later circle ticked stays locked; a selected circle can always be unticked
  // while its window is open (so unticking the Fard never strands a ticked Sunnah/Nafl after it).
  const unticking = !!pendingDay(eventDate, false)[layer]?.[key];
  if (!unticking && partOrderLocks(prayerKey, eventDate).get(`${layer}:${key}`)) return;
  const open = unticking
    ? !!parent && partRecordable({ position: 'after', fardDone: true, start: parent.start, end: parent.end, now: new Date(), lockAt: partLock && partLock.at })
    : !!parent && partRecordable({ position: slot.position, fardDone, start: parent.start, end: parent.end, now: new Date(), lockAt: partLock && partLock.at });
  if (!parent || !open) {
    showToast('This prayer event is not currently available.');
    render();
    return;
  }
  const pend = pendingDay(eventDate);
  const target = pend[layer] || (pend[layer] = {});
  const on = !target[key];
  if (on) target[key] = true; else delete target[key];
  savePending();
  playSelectSound(layer, on, Object.keys(target).length);
  render();
}

function completionCount(record) {
  return ['fard', 'voluntary', 'sunnah', 'nafl', 'situational'].reduce((sum, layer) => sum + Object.keys(record[layer] || {}).length, 0);
}


function openWeeklyDay(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return;
  leaveClockPage(false);
  homeScrollTop = window.scrollY || 0;
  weeklyDetailDate = dateText;
  currentPage = 'weekly-day';
  $('homeView').hidden = true;
  $('countdownView').hidden = true;
  $('timeView').hidden = true;
  $('astroView').hidden = true;
  $('settingsView').hidden = true;
  $('weeklyDayView').hidden = false;
  $('prayerView').hidden = true;
  $('settingsToggle').hidden = true;
  renderWeeklyDayView();
  window.scrollTo(0, 0);
}

function weeklyUndoButton(layer, key, date) {
  const locked = layer === 'prayer' ? prayerUndoLocked(key, date) : lockState(layer, key, date).locked;
  const tipLayer = layer === 'prayer' ? 'fard' : layer;
  const tip = locked ? lockTipFor(tipLayer, key, date) : '';
  return `<button class="square-button is-undo undo-corner" type="button" data-week-undo="${layer}" data-week-key="${escapeHtml(key)}" data-week-date="${dateKey(date)}"${locked ? ' disabled' : ''}${tip ? ` title="${escapeHtml(tip)}"` : ''}>${lang() === 'bn' ? 'নামাজ বাতিল' : 'Undo prayer'}</button>`;
}
/* v3.0.4 D1: the recorded parts of one Fard prayer ([layer, key] pairs: its Fard and every Sunnah/Nafl). */
function prayerRecordIds(prayerKey, date, record = dayRecord(date, false)) {
  const ids = [];
  if (fardSlotDone(record.fard, prayerKey, date)) ids.push(['fard', prayerKey]);
  for (const part of prayerParts(prayerKey)) if (part.layer !== 'fard' && record[part.layer]?.[part.slot.key]) ids.push([part.layer, part.slot.key]);
  return ids;
}
function prayerUndoLocked(prayerKey, date) {
  return prayerRecordIds(prayerKey, date).some(([layer, key]) => lockState(layer, key, date).locked);
}
/* v3.0.4 E: after an Undo, a prayer whose time has ended comes back under "Revise previous prayer"
   (until its record window closes); one whose time is still open simply returns to its normal card. */
function reopenAfterUndo(kind, key, date) {
  clearPendingEvent(kind, key, date);
  const event = findRecordableEvent(kind, key, date);
  if (event && new Date() >= event.end && reviseOpen(event)) pendingStore.reopened[`${dateKey(date)}|${kind}|${key}`] = true;
  savePending();
}

function undoWeeklyRecord(layer, key, dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || '')) return;
  const date = new Date(`${dateText}T12:00:00`);
  const eventDate = startOfDay(date);
  if (layer === 'prayer') {
    // v3.0.4 D1: one Undo removes the whole prayer (its Sunnah, Fard and Nafl).
    if (prayerUndoLocked(key, date)) return;
    const record = dayRecord(date);
    for (const [partLayer, partKey] of prayerRecordIds(key, date, record)) {
      const id = `${partLayer}:${partKey}`;
      if (partLayer === 'fard' && key === 'dhuhr' && date.getDay() === 5) applyFridayFard(record, null); // either Friday choice comes back
      else if (record[partLayer]) delete record[partLayer][partKey];
      if (record.late) delete record.late[id];
      if (record.at) delete record.at[id];
      if (record.locked) delete record.locked[lockKey(partLayer, partKey)];
    }
    if (record.late && !Object.keys(record.late).length) delete record.late;
    if (record.closed) delete record.closed[`fard:${key}`];
    save();
    reopenAfterUndo('fard', key, eventDate);
    render();
    return;
  }
  if (lockState(layer, key, date).locked) return;
  const record = dayRecord(date);
  if (layer === 'situational') {
    if (record.situational) delete record.situational[key];
    if (record.situationalOccurrences) delete record.situationalOccurrences[key];
  } else if (record[layer]) delete record[layer][key];
  if (record.closed) delete record.closed[`${layer}:${key}`];
  if (record.rakahSets) delete record.rakahSets[key];
  if (record.late) { delete record.late[`${layer}:${key}`]; if (!Object.keys(record.late).length) delete record.late; }
  if (record.rakahs) delete record.rakahs[key];
  if (layer === 'voluntary' && key === 'qiyam') delete record.qiyamPart; // v3.0.5
  if (record.at) delete record.at[`${layer}:${key}`];
  if (record.locked) delete record.locked[lockKey(layer, key)];
  save();
  if (layer === 'voluntary') reopenAfterUndo('voluntary', key, eventDate);
  render();
}

function recordedRakahTotal(date) {
  const record = dayRecord(date, false);
  let total = 0;
  for (const prayer of FARD) {
    if (fardSlotDone(record.fard, prayer.key, date)) total += prayer.key === 'dhuhr' && date.getDay() === 5 ? (fridayFardRakahs(record) || 2) : (FARD_RAKAHS[prayer.key] || 0);
    for (const part of prayerParts(prayer.key)) {
      if (part.layer === 'fard' || !record[part.layer]?.[part.slot.key]) continue;
      const n = parseInt(part.slot.en, 10);
      if (n) total += n;
    }
  }
  for (const value of Object.values(record.rakahs || {})) total += Number(value) || 0;
  return total;
}

/* v3.0.2: a quiet note on a record saved after its time ended (v3.0.4: under Revise previous prayer). */
function lateNoteHtml(record, id) {
  if (!record.late?.[id]) return '';
  return ` <span class="late-note" data-late="${escapeHtml(id)}">· ${lang() === 'bn' ? 'সময়ের পরে রেকর্ড' : 'recorded after its time'}</span>`;
}

function renderWeeklyDayView() {
  const root = $('weeklyDayCards');
  if (!root || !weeklyDetailDate) return;
  const date = new Date(`${weeklyDetailDate}T12:00:00`);
  const record = dayRecord(date, false);
  const bn = lang() === 'bn';
  $('weeklyDayTitle').textContent = dayName(date);
  const cards = [];
  // v3.0.4 D1: one card per Fard prayer with its Sunnah, Fard and Nafl, and one Undo for the whole prayer.
  for (const prayer of FARD) {
    const ids = prayerRecordIds(prayer.key, date, record);
    if (!ids.length) continue;
    const title = prayer.key === 'dhuhr' && date.getDay() === 5 && fridayFardChoice(record) === 'dhuhr' ? prayerName('dhuhr')
      : prayer.key === 'dhuhr' && date.getDay() === 5 ? prayerName('jumuah') : slotName(prayer.key, date);
    const prayerTime = getTimes(date)?.[prayer.key];
    const timeText = prayerTime ? ` · ${escapeHtml(fmt(prayerTime))}` : '';
    const rows = prayerParts(prayer.key).map(part => {
      if (part.layer === 'fard') {
        if (!fardSlotDone(record.fard, prayer.key, date)) return '';
        return `<p class="weekly-part-line" data-part="fard:${prayer.key}">${bn?`${escapeHtml(fardPartLabel(prayer.key, date, 'bn'))} সম্পন্ন`:`${escapeHtml(fardPartLabel(prayer.key, date, 'en'))} completed`}${timeText}${lateNoteHtml(record, `fard:${prayer.key}`)}</p>`;
      }
      if (!record[part.layer]?.[part.slot.key]) return '';
      return `<p class="weekly-part-line" data-part="${part.layer}:${part.slot.key}">${escapeHtml(slotLabel(part.slot, date, bn?'bn':'en'))} · ${bn?'সম্পন্ন':'Completed'}${lateNoteHtml(record, `${part.layer}:${part.slot.key}`)}</p>`;
    }).join('');
    // The Sunnah evidence (rawatib) that the separate Sunnah cards carried before v3.0.4 is kept, once per prayer.
    const sunnahRef = prayerParts(prayer.key).filter(part => part.layer === 'sunnah' && record.sunnah?.[part.slot.key]).slice(0, 1)
      .map(part => referenceCardHtml(part.slot.key, title, 'weekly-part', { date, evidenceKey: part.layer === 'sunnah' ? 'rawatib' : prayer.key })).join('');
    cards.push(`<article class="page-card panel weekly-record-card weekly-prayer-card" data-week-prayer="${prayer.key}"><div class="eyebrow">${bn?'ফরজ':'OBLIGATORY PRAYER'}</div><h2>${escapeHtml(title)}</h2>${referenceCardHtml(prayer.key, title, 'weekly-fard', { date })}${rows}${sunnahRef}${weeklyUndoButton('prayer', prayer.key, date)}</article>`);
  }
  const scheduledVoluntary = new Map(getVoluntaryEvents(date).map(event => [event.key, event]));
  // v3.0.5: the Qiyam al-Layl split is shown once, on the Qiyam card (or the first Tahajjud/Witr card without one).
  const nightKey = ['qiyam', 'tahajjud', 'witr'].find(key => record.voluntary?.qiyam ? key === 'qiyam' : record.voluntary?.[key]);
  for (const [key, value] of Object.entries(record.voluntary || {})) if (value) {
    const event = scheduledVoluntary.get(key);
    const count = Number(record.rakahs?.[key] || 0);
    const when = event ? ` · ${escapeHtml(fmt(event.start))}–${escapeHtml(fmt(event.end))}` : '';
    const split = key === nightKey ? `<p class="qiyam-breakdown" data-record-split="${key}">${escapeHtml(qiyamBreakdownText(record, date))}</p>` : '';
    cards.push(`<article class="page-card panel weekly-record-card"><div class="eyebrow">${bn?'দৈনিক নফল':'DAILY VOLUNTARY PRAYER'}</div><h2>${escapeHtml(prayerName(key))}</h2>${referenceCardHtml(key, prayerName(key), 'weekly-voluntary', { date })}<p>${count ? (bn?`${localizeDigits(count)} রাকাত আদায়`:`${count} rak'ahs performed`) : (bn?'সম্পন্ন':'Completed')}${when}${lateNoteHtml(record, `voluntary:${key}`)}</p>${split}${weeklyUndoButton('voluntary', key, date)}</article>`);
  }
  for (const key of SITUATIONAL_KEYS) if (record.situational?.[key]) { const count = Number(record.rakahs?.[key] || 0); const occasions = Number(record.situationalOccurrences?.[key] ?? 1); cards.push(`<article class="page-card panel weekly-record-card"><div class="eyebrow">${bn?'পরিস্থিতিভিত্তিক সালাত':'SITUATIONAL PRAYER'}</div><h2>${escapeHtml(prayerName(key))}</h2>${referenceCardHtml(key, prayerName(key), 'weekly-situational', { date })}<p>${count ? `${count} ${bn?'রাকাত':'rak‘ahs'}` : (bn?'রাকাত প্রযোজ্য নয়':'No rak‘ahs')} · ${occasions} ${bn?'বার':'occasion(s)'}</p>${weeklyUndoButton('situational', key, date)}</article>`); }
  const extraNafl = otherNaflCount(record);
  const entries = otherEntries(record);
  if (entries.length) cards.push(`<article class="page-card panel weekly-record-card other-record-card"><div class="eyebrow">${bn?'অন্যান্য নফল':'OTHER VOLUNTARY NAFL'}</div><h2>${bn?'অন্যান্য নফল নামাজ':'Other voluntary prayers'}</h2><p>${bn ? `${localizeDigits(extraNafl)} রাকাত নফল` : `${extraNafl} nafl rak‘ahs`}</p>${entries.map((entry, index) => otherEntryHtml(entry, index, date)).join('')}</article>`);
  const totalRak = recordedRakahTotal(date);
  const totalCard = `<article class="rakah-total-card"><span class="rakah-total-kicker">${bn ? 'আজ মোট' : 'TODAY'}</span><strong class="rakah-total-num">${bn ? localizeDigits(totalRak) : totalRak}</strong><span class="rakah-total-label">${bn ? 'রাকাত রেকর্ড' : 'rak‘ahs recorded'}</span></article>`;
  root.innerHTML = `${totalCard}${cards.length ? cards.join('') : `<article class="page-card panel"><h2>${bn?'কোনো রেকর্ড নেই':'No recorded prayers'}</h2><p class="muted">${bn?'এই দিনের জন্য কোনো সম্পন্ন সালাত রেকর্ড করা হয়নি।':'No completed prayer records are stored for this day.'}</p></article>`}`;
  bindOtherEntries(root);
  root.querySelectorAll('[data-week-undo]').forEach(button => button.addEventListener('click', () => undoWeeklyRecord(button.dataset.weekUndo, button.dataset.weekKey, button.dataset.weekDate)));
}

function seasonalDescriptionWindows(now = new Date()) {
  if (!hasLocation()) return [];
  const windows = [];
  // Find the Ramadan-night cluster around now and the next cycle. The scan
  // uses the following daytime Hijri date, not the civil date at Isha.
  const clusters = [];
  let cluster = null;
  let previousDate = null;
  for (let offset = -35; offset <= 380; offset++) {
    const date = addDays(now, offset);
    const times = getTimes(date);
    if (!times) continue;
    if (isRamadanNight(times.isha)) {
      if (!cluster || (date.getTime() - previousDate.getTime()) > 36 * 60 * 60 * 1000) {
        if (cluster) clusters.push(cluster);
        cluster = { first: { date, times }, last: { date, times } };
      } else cluster.last = { date, times };
      previousDate = date;
    } else if (cluster) {
      clusters.push(cluster); cluster = null; previousDate = null;
    }
  }
  if (cluster) clusters.push(cluster);
  const nowMs = now.getTime();
  const ramadan = clusters.find(item => {
    const start = item.first.times.isha.getTime() - 24 * 60 * 60 * 1000;
    const nextTimes = getTimes(addDays(item.last.date, 1));
    const end = nextTimes?.fajr?.getTime() || item.last.times.isha.getTime() + 12 * 60 * 60 * 1000;
    return nowMs >= start && nowMs <= end;
  });
  if (ramadan) {
    const nextTimes = getTimes(addDays(ramadan.last.date, 1));
    windows.push({ key: 'tarawih', start: new Date(ramadan.first.times.isha.getTime() - 24 * 60 * 60 * 1000), end: nextTimes?.fajr || addMinutes(ramadan.last.times.isha, 12 * 60) });
  }
  // Eid descriptions are shown only from 24 hours before the calculated local
  // Eid prayer window until the start of Zawal.
  for (let offset = -1; offset <= 370; offset++) {
    const date = addDays(now, offset);
    const hijri = hijriParts(date);
    if (!hijri || !((hijri.month === 10 && hijri.day === 1) || (hijri.month === 12 && hijri.day === 10))) continue;
    const times = getTimes(date);
    if (!times) continue;
    const start = addMinutes(times.sunrise, 20);
    const end = times.zawalStart;
    const visibleFrom = start.getTime() - 24 * 60 * 60 * 1000;
    if (nowMs >= visibleFrom && nowMs <= end.getTime()) windows.push({ key: 'eid_prayer', start: new Date(visibleFrom), end });
  }
  return windows;
}

/* Reference card for one prayer: the Qur'an verse or hadith is the focus (quote
   treatment with its reference line); rak'ahs and guidance sit below, quieter.
   The evidence set follows the school (src/prayer-evidence.js).
   referenceCardHtml outputs Qur'an first, then the school-specific hadith, then rak'ah guidance.
   On screen only the Qur'an is shown when a verse exists. Hadith is shown only when that prayer has no Qur'an. */
function shownEvidenceItems(key, date, forcedKey) {
  const bn = lang() === 'bn';
  const school = shiaMode() ? 'jafari' : state.profile.school;
  const evidenceKey = forcedKey || (key === 'dhuhr' && date?.getDay?.() === 5 ? 'jumuah' : key);
  const evidence = evidenceFor(evidenceKey, school, bn ? 'bn' : 'en');
  const items = evidence?.items || [];
  const quran = items.filter(item => item.kind === 'quran');
  return { evidence, items: quran.length ? quran : items.filter(item => item.kind === 'hadith') };
}

function leadEvidenceHtml(key, date) {
  const item = shownEvidenceItems(key, date).items[0];
  if (!item) return '';
  return `<p class="lead-evidence" data-kind="${item.kind}"><q>${escapeHtml(item.text)}</q> <cite>${escapeHtml(item.ref)}</cite></p>`;
}

function referenceCardHtml(key, titleText, suffix = '') {
  const options = arguments[3] || {};
  const bn = lang() === 'bn';
  const date = options.date instanceof Date ? options.date : selectedDate;
  const guidanceKey = options.guidanceKey || key;
  const evidenceKey = options.evidenceKey || (key === 'dhuhr' && date.getDay() === 5 ? 'jumuah' : key);
  const jumuah = evidenceKey === 'jumuah' || (guidanceKey === 'dhuhr' && date.getDay() === 5);
  const guidance = jumuah && guidanceKey === 'dhuhr' ? PRAYER_GUIDANCE.jumuah : PRAYER_GUIDANCE[guidanceKey];
  const { evidence, items } = shownEvidenceItems(evidenceKey, date, evidenceKey);
  if (!guidance && !evidence) return '';
  const quotes = items.map((item, n) => `<figure class="ref-quote${n ? ' ref-quote-minor' : ''}" data-kind="${item.kind}"><blockquote>${escapeHtml(item.text)}</blockquote><figcaption>${escapeHtml(item.ref)}</figcaption></figure>`).join('');
  const note = evidence?.note ? `<p class="ref-note">${escapeHtml(evidence.note)}</p>` : '';
  const guideText = guidance ? (bn ? guidance.guideBn : guidance.guide) : '';
  const showGuide = !!guidance && (!shiaMode() || !/Hanafi|mu’akkadah|হানাফি|মুয়াক্কাদা/.test(`${guidance.guide || ''} ${guidance.rakahs || ''}`));
  const rakahLine = guidance && !(shiaMode() && !showGuide) ? `<p class="ref-rakahs"><strong>${bn ? 'রাকাত' : 'Rak‘ahs'}:</strong> ${escapeHtml(bn ? guidance.bn : guidance.rakahs)}</p>` : '';
  const guide = showGuide && guideText ? `<p class="ref-guide">${escapeHtml(guideText)}</p>` : '';
  const below = rakahLine || guide ? `<div class="ref-practical">${rakahLine}${guide}</div>` : '';
  const titleHtml = `<h4 class="ref-title">${escapeHtml(titleText)}</h4>`;
  return `<article class="ref-card" id="description-${key}${suffix ? `-${suffix}` : ''}">${quotes}${titleHtml}${note}${below}</article>`;
}

/* Settings > Home page sections: a hidden section is `hidden` and is not rendered at all (no DOM, no work). */
function applySectionVisibility() {
  for (const id of ['prayerDetails', 'quranSection', 'quranReader', 'onThisDaySection', 'sunnahSection', 'descriptionList']) {
    const el = $(id);
    if (!el) continue;
    el.hidden = true;
    if (id !== 'prayerDetails') el.textContent = '';
  }
}

function renderPrayerGuidance() {
  const root = $('descriptionList');
  if (!root) return;
  const bn = lang() === 'bn';
  const groups = [
    { title: 'Obligatory prayers', keys: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] },
    { title: 'Daily voluntary prayers', keys: ['duha', 'awwabin', 'qiyam', 'tahajjud', 'witr', 'rawatib'] },
    { title: 'Situational voluntary prayers', keys: ['tahiyyatul_masjid', 'istikhara', 'tawbah', 'wudu_prayer', 'kusuf', 'khusuf', 'istisqa', 'janazah', 'nafl_mutlaq'] }
  ];
  const hidden = shiaMode() ? JAFARI_HIDDEN : [];
  const seasonal = seasonalDescriptionWindows(new Date()).filter(item => !hidden.includes(item.key));
  if (seasonal.length) groups.push({ title: 'Seasonal prayer events', keys: seasonal.map(item => item.key) });
  const seasonalTitle = 'Seasonal prayer events';
  const groupCard = { 'Obligatory prayers': 'obligatory', 'Daily voluntary prayers': 'daily', 'Situational voluntary prayers': 'situational', 'Seasonal prayer events': 'seasonal' };
  const rendered = groups.filter(group => state.cards[groupCard[group.title]] !== false).map(group => {
    const cards = group.keys.filter(key => !hidden.includes(key)).map(key => referenceCardHtml(key, slotName(key, selectedDate))).join('');
    const heading = escapeHtml(bn ? ({'Obligatory prayers':'ফরজ নামাজ','Daily voluntary prayers':'দৈনিক নফল নামাজ','Situational voluntary prayers':'পরিস্থিতিভিত্তিক নফল নামাজ','Seasonal prayer events':'মৌসুমি নামাজ'}[group.title]) : group.title);
    const tone = { obligatory: 'card-obligatory', daily: 'card-daily', situational: 'card-situational', seasonal: 'card-special' }[groupCard[group.title]] || '';
    if (group.title === seasonalTitle) return cards ? `<section class="description-group ${tone}"><h3>${heading}</h3><div id="seasonalDescriptionCarousel" class="seasonal-carousel"></div></section>` : '';
    return cards ? `<section class="description-group"><h3>${heading}</h3><div class="ref-grid">${cards}</div></section>`.replace('description-group"', `description-group ${tone}"`) : '';
  }).join('');
  root.innerHTML = rendered;
  // Seasonal events that overlap (for example the last Tarawih and the coming
  // Eid prayer) are paged in one carousel instead of being stacked.
  const seasonalHost = $('seasonalDescriptionCarousel');
  if (seasonalHost) {
    renderCarousel(seasonalHost, 'seasonal-descriptions', seasonal.map(item => {
      const html = referenceCardHtml(item.key, prayerName(item.key));
      return html ? { key: item.key, html } : null;
    }).filter(Boolean), 'Seasonal prayer descriptions');
  }
}

function weeklyAnchor(now = new Date()) {
  return weekStart(now);
}

/* Weekly Prayer Progress: Saturday to Friday, full days, 5 Fard cells per day
   (35 per week) and a Nafl ring per day. Friday is highlighted and its
   midday cell reads Dhuhr/Jumu’ah. */
function renderWeeklyReview() {
  const root = $('weeklyReview');
  if (!root) return;
  const now = new Date();
  const anchor = weeklyAnchor(now);
  const bn = lang() === 'bn';
  const L = bn ? 'bn' : 'en';
  const num = value => bn ? localizeDigits(value) : String(value);
  const dates = sevenCycleDates(anchor);
  const fard = weeklyFardTally(dates, date => dayRecord(date, false));
  let naflTotal = 0, naflPossible = 0, sunnahTotal = 0, sunnahPossible = 0, linkedTotal = 0, linkedPossible = 0;
  const today = startOfDay(now);
  const days = fard.days.map(({ date, cells, count }, i) => {
    const record = dayRecord(date, false);
    const events = getVoluntaryEvents(date);
    const naflCount = events.filter(event => voluntaryEventDone(record, event.key, date)).length;
    naflTotal += naflCount; naflPossible += events.length;
    const layers = dayLayers(date);
    const sunnah = layers.sunnah;
    const linked = layers.nafl;
    sunnahTotal += sunnah.done; sunnahPossible += sunnah.total;
    linkedTotal += linked.done; linkedPossible += linked.total;
    const isToday = dateKey(date) === dateKey(now);
    const future = date > today;
    const friday = date.getDay() === FRIDAY;
    // Per-cell Fard states (Friday's Dhuhr/Jumu’ah slot included) for the day's tooltip.
    const fardStates = cells.map(cell => `${slotName(cell.key, date)}: ${cell.done ? (bn ? 'সম্পন্ন' : 'done') : (bn ? 'বাকি' : 'not marked')}`).join(' · ');
    const fardLabel = bn ? `${num(count)}/৫ ফরজ` : `${count}/5 Fard`;
    const naflLabel = bn ? `সুন্নাত ${num(sunnah.done)}/${num(sunnah.total)}, নফল ${num(linked.done)}/${num(linked.total)}, নফল ইভেন্ট ${num(naflCount)}/${num(events.length)}` : `Sunnah ${sunnah.done}/${sunnah.total}, Nafl ${linked.done}/${linked.total}, voluntary ${naflCount}/${events.length}`;
    const dayLocked = dayIsLocked(dateKey(date), dateKey(progressDate(now)), state.lockWatermark);
    const dayTitle = `${dayName(date)}${friday ? ` · ${FRIDAY_DHUHR_LABEL[L]}` : ''}\n${fardStates}${dayLocked && count ? `\n${lockTip(null, L)}` : ''}`;
    return `<button type="button" class="week-day${dayLocked ? ' is-locked' : ''}${isToday ? ' today' : ''}${friday ? ' friday' : ''}${future ? ' future' : ''}${count === 5 ? ' day-complete' : ''}" data-week-date="${dateKey(date)}" title="${escapeHtml(dayTitle)}" aria-label="${escapeHtml(`${dayName(date)}: ${fardLabel}, ${naflLabel}`)}"${future ? ' disabled' : ''}>`
      + `<strong>${WEEK_DAY_LABELS[L][i]}</strong><span class="week-date">${escapeHtml(new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { day: 'numeric' }).format(date))}</span>`
      + `<span class="week-figure" aria-hidden="true" title="${escapeHtml(naflLabel)}">${figureSvg(layers.flags, { mini: true })}</span>`
      + `<small>${future ? '—' : `${num(count)}/${num(5)} · ${num(naflCount)}/${num(events.length)}`}</small>`
      + `${friday ? `<em class="week-jumuah">${escapeHtml(FRIDAY_DHUHR_LABEL[L])}</em>` : ''}</button>`;
  });
  const fardPct = fard.possible ? Math.round(fard.done / fard.possible * 100) : 0;
  const naflPct = naflPossible ? Math.round(naflTotal / naflPossible * 100) : 0;
  const range = `${new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' }).format(dates[0])} – ${new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' }).format(dates[6])}`;
  const foot = bn
    ? `সপ্তাহ শনিবার থেকে শুক্রবার · প্রতিদিন ৫ ওয়াক্ত ফরজ (সপ্তাহে ৩৫) · শুক্রবারের যোহর/জুমা—যেকোনোটি আদায় করলেই সম্পন্ন`
    : `Week runs Saturday to Friday · 5 Fard every day (35 a week) · Friday’s Dhuhr/Jumu’ah slot is complete with either prayer`;
  root.innerHTML = `<div class="week-summary"><div><span>${bn ? 'সাপ্তাহিক ফরজ' : 'WEEKLY FARD'}</span><strong>${num(fard.done)}/${num(fard.possible)} <small>· ${num(fardPct)}%</small></strong></div><div><span>${bn ? 'সাপ্তাহিক সুন্নাত' : 'WEEKLY SUNNAH'}</span><strong>${num(sunnahTotal)}/${num(sunnahPossible)}</strong></div><div><span>${bn ? 'সাপ্তাহিক নফল' : 'WEEKLY NAFL'}</span><strong>${num(linkedTotal)}/${num(linkedPossible)}</strong></div><div><span>${bn ? 'নফল ইভেন্ট' : 'VOLUNTARY EVENTS'}</span><strong>${num(naflTotal)}/${num(naflPossible)} <small>· ${num(naflPct)}%</small></strong></div><div class="week-range"><span>${bn ? 'এই সপ্তাহ' : 'THIS WEEK'}</span><strong>${escapeHtml(range)}</strong></div></div><div class="week-constellation">${days.join('')}</div><p class="week-foot">${escapeHtml(foot)}</p>`;
  root.querySelectorAll('[data-week-date]').forEach(button => button.addEventListener('click', () => openWeeklyDay(button.dataset.weekDate)));
}

/* Settings > Calculation profile keeps today's prohibited intervals (moved from the old home-page timetable). */
function renderSettingsIntervals() {
  const box = $('settingsIntervals');
  if (!box) return;
  const times = hasLocation() ? getTimes(startOfDay(new Date())) : null;
  if (!times) { box.textContent = '—'; return; }
  const bn = lang() === 'bn';
  const names = shiaMode() ? { sunrise: bn ? 'সূর্যোদয় (মাকরুহ)' : 'Sunrise (disliked)', zawal: bn ? 'জাওয়াল (মাকরুহ)' : 'Zawal (disliked)', sunset: bn ? 'সূর্যাস্তের আগে (মাকরুহ)' : 'Before sunset (disliked)' }
    : { sunrise: bn ? 'সূর্যোদয়' : 'Sunrise', zawal: bn ? 'জাওয়াল' : 'Zawal', sunset: bn ? 'সূর্যাস্তের আগে' : 'Before sunset' };
  const lines = prohibitedIntervals(times).map(item => `${names[item.key]}: ${fmt(item.start)} – ${fmt(item.end)}`);
  if (shiaMode() && times.midnight) lines.push(`${bn ? 'মধ্যরাত (ইশার শেষ)' : 'Midnight (end of Isha)'}: ${fmt(times.midnight)}`);
  box.textContent = lines.join('\n');
}

/* The hero counts down to the next EVENT of any kind: an obligatory or voluntary
   prayer, the start or end of a prohibited (Ja'fari: disliked) interval, or the
   Ja'fari midnight, from one ordered timeline (src/day-timeline.js). */
function dayTimelineFor(now) {
  const today = startOfDay(now);
  const days = [];
  for (const offset of [-1, 0, 1]) {
    const date = addDays(today, offset);
    const times = getTimes(date);
    const nextTimes = getTimes(addDays(date, 1));
    if (!times || !nextTimes) continue;
    days.push({
      fard: getFardEvents(date, times, nextTimes),
      voluntary: getVoluntaryEvents(date, times, nextTimes),
      prohibited: prohibitedIntervals(times),
      midnight: shiaMode() ? times.midnight : null
    });
  }
  return buildTimeline(days);
}

function getNextEvent(now = new Date()) {
  // Next event = the soonest PRAYER event (obligatory or voluntary). Prohibited intervals and midnight are never targets.
  const timeline = dayTimelineFor(now);
  const next = nextPrayerEventAfter(timeline, now);
  if (!next) return null;
  const following = nextPrayerEventAfter(timeline, next.at);
  const start = new Date(next.at);
  const date = next.date || startOfDay(start);
  return { ...next, start, end: new Date(following ? following.at : next.at + 60000), date };
}

function renderNextPrayer() {
  const next = getNextEvent(new Date());
  nextPrayer = next;
  const card = document.querySelector('.next-card');
  if (!next) {
    $('nextName').textContent = '—';
    $('nextCountValue').textContent = '—';
    $('nextMeta').textContent = 'Prayer times are unavailable';
    const emptyEvidence = $('nextEvidence');
    if (emptyEvidence) emptyEvidence.innerHTML = '';
    card?.classList.remove('is-interval');
    return;
  }
  const label = eventLabel(next, { lang: lang(), shia: shiaMode(), prayerName: key => slotName(key, next.date) });
  next.title = label.name;
  card?.classList.remove('is-interval');
  $('nextEyebrow').textContent = 'NEXT EVENT';
  $('nextCountLabel').textContent = lang() === 'bn' ? 'শুরু হতে' : 'STARTS IN';
  $('nextName').textContent = label.name;
  $('nextName').dataset.kind = next.kind;
  const evidence = $('nextEvidence');
  if (evidence) evidence.innerHTML = next.key ? leadEvidenceHtml(next.key, next.date) : '';
  $('nextMeta').textContent = `${label.verb} ${fmt(next.start)} · ${state.place || (lang() === 'bn' ? 'সংরক্ষিত অবস্থান' : 'Saved location')}`;
  const activeFard = getActiveEvents().find(event => event.kind === 'fard');
  const school = schoolShort();
  $('currentMeta').textContent = activeFard
    ? (lang() === 'bn' ? `এখন: ${prayerName(activeFard.key)} · ${school}` : `Current: ${prayerName(activeFard.key)} · ${school}`)
    : (lang() === 'bn' ? `কোনো ফরজ নামাজের সময় চলছে না · ${school}` : `No obligatory prayer window is active · ${school}`);
  updateTopCountdown();
}

function updateTopCountdown() {
  if (!nextPrayer) return;
  $('nextCountValue').textContent = countdown(nextPrayer.start.getTime() - Date.now());
}

function openNextCountdown() {
  if (!nextPrayer) return;
  const real = findRecordableEvent(nextPrayer.kind, nextPrayer.key, nextPrayer.date);
  countdownState = {
    key: nextPrayer.key,
    kind: nextPrayer.kind,
    title: nextPrayer.title,
    start: real?.start || nextPrayer.start,
    end: real?.end || nextPrayer.end,
    date: dateKey(nextPrayer.date),
    eid: nextPrayer.eid || '',
    friday: nextPrayer.key === 'dhuhr' && nextPrayer.date?.getDay?.() === 5,
    description: 'The countdown to the next event begins at the displayed local time.'
  };
  openCountdownView();
}

function openEventCountdown(dataset) {
  const start = Number(dataset.start);
  const end = Number(dataset.end);
  const key = dataset.key || dataset.eta;
  if (!key || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
  const kind = dataset.kind || (FARD.some(item => item.key === key) ? 'fard' : 'voluntary');
  countdownState = {
    key,
    kind,
    title: slotName(key, new Date(start)),
    start: new Date(start),
    end: new Date(end),
    date: dataset.date || dateKey(new Date(start)),
    eid: dataset.eid || '',
    friday: key === 'dhuhr' && new Date(start).getDay() === 5,
    description: 'Time remaining in this available prayer period.'
  };
  openCountdownView();
}

function openCountdownView() {
  if (!countdownState) return;
  leaveClockPage(false);
  homeScrollTop = window.scrollY || 0;
  currentPage = 'countdown';
  $('homeView').hidden = true;
  $('settingsView').hidden = true;
  $('timeView').hidden = true;
  $('astroView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('prayerView').hidden = true;
  $('countdownView').hidden = false;
  $('settingsToggle').hidden = true;
  $('countdownTitle').textContent = countdownState.title;
  $('countdownEyebrow').textContent = 'PRAYER COUNTDOWN';
  $('countdownDescription').textContent = countdownState.description;
  renderCountdownView();
  window.scrollTo(0, 0);
}

function countdownEventDate() {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(countdownState?.date || '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : startOfDay(countdownState.start);
}

function renderCountdownDetails() {
  const rootR = $('eventRakahCard');
  const rootC = $('eventCompletionCard');
  const rootT = $('eventTimingCard');
  if (!rootR || !rootC || !rootT || !countdownState) return;
  const bn = lang() === 'bn';
  const key = countdownState.key;
  const date = countdownEventDate();
  // The prayer information card follows the selected madhab and historical event date.
  // referenceCardHtml outputs Qur'an first, then the school-specific hadith, then rak'ah guidance.
  rootR.innerHTML = referenceCardHtml(key, countdownState.title, 'countdown', { date }) || `<h2>${escapeHtml(countdownState.title)}</h2><p class="muted">${bn ? 'এই ইভেন্টের জন্য আলাদা দলিল সংরক্ষিত নেই।' : 'No separate evidence is stored for this event.'}</p>`;
  const recordEvent = findRecordableEvent(countdownState.kind, key, date);
  const lock = recordEvent ? lockInstant(lockItem(countdownState.kind === 'fard' ? 'fard' : countdownState.kind, key), lockContext(date).events, lockContext(date).nextFajr) : null;
  const open = !!recordEvent && recordingOpen(recordEvent.start, recordEvent.end, lock && lock.at, new Date());
  const parts = countdownState.kind === 'fard' ? partsHtml(key, date, open, { includeFard: true }) : '';
  const record = dayRecord(date, false);
  const done = countdownState.kind === 'fard' ? fardSlotDone(record.fard, key, date) : !!record[countdownState.kind]?.[key];
  // v3.0.4 K: once Mark Complete has recorded this event, the middle card (evidence, rak‘ahs, circles and
  // Mark Complete) leaves; the countdown and Event timing close the gap. Undo (closed flag cleared) brings it back.
  const recorded = !!record.closed?.[`${countdownState.kind}:${key}`];
  const prayerCard = $('eventPrayerCard');
  if (prayerCard) prayerCard.hidden = recorded;
  rootC.closest('.page-cards')?.classList.toggle('is-recorded', recorded);
  const now = new Date();
  const inWindow = !!recordEvent && now >= recordEvent.start && now < recordEvent.end;
  const ticks = countdownState.kind === 'fard' ? parts : (recordEvent && open ? voluntaryTicksHtml(recordEvent) : '');
  const mark = `<button class="square-button is-complete mark-event-complete" type="button" data-mark-complete="${countdownState.kind}" data-mark-key="${key}" data-mark-date="${dateKey(date)}" title="Mark Complete" aria-label="Mark Complete"${inWindow ? '' : ' disabled'}>Mark Complete</button>`;
  const body = (ticks || inWindow)
    ? `<div class="completion-row">${ticks || ''}${mark}</div>`
    : `<p class="muted">${bn ? 'এই মুহূর্তে রেকর্ড করা যাচ্ছে না।' : 'Recording is not open for this event right now.'}</p>`;
  const lines = summaryLines({ ...countdownState, date, kind: countdownState.kind });
  rootC.innerHTML = `<div class="eyebrow">${bn ? 'রেকর্ড' : 'COMPLETION'}</div><h2>${bn ? 'সম্পন্নের তথ্য' : 'Completion & recording'}</h2>${body}${lines.length ? `<ul class="summary-lines">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : `<p class="muted">${bn ? 'এখনো কোনো অংশ রেকর্ড হয়নি।' : 'No part is recorded yet. Sunnah and Nafl are not assumed.'}</p>`}`;
  rootT.innerHTML = `<div class="eyebrow">${bn ? 'সময়' : 'EVENT TIMING'}</div><h2>${escapeHtml(fmt(countdownState.start))} – ${escapeHtml(fmt(countdownState.end))}</h2><p>${escapeHtml(dayName(countdownState.start))}</p><p class="muted">${escapeHtml(open && recordEvent && new Date() >= recordEvent.end ? (bn ? 'শুধু রেকর্ড। নামাজের সময় শেষ।' : 'Recording only. The prayer time has ended.') : (bn ? 'গণনা নির্বাচিত পদ্ধতি ও মাজহাব অনুসরণ করে।' : 'Times follow the selected calculation profile and madhab.'))}</p>`;
  bindVoluntaryTicks(rootC);
  rootC.querySelectorAll('[data-mark-complete]').forEach(button => button.addEventListener('click', () => {
    markEventComplete(button.dataset.markComplete, button.dataset.markKey, button.dataset.markDate, { late: button.dataset.markLate === '1' });
  }));
}

function updateCountdownViewLive(now = new Date()) {
  if (!countdownState || currentPage !== 'countdown') return;
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  let labelText;
  let remaining;
  if (timestamp < countdownState.start.getTime()) {
    labelText = 'Begins in';
    remaining = countdownState.start.getTime() - timestamp;
  } else if (timestamp < countdownState.end.getTime()) {
    labelText = 'Time remaining';
    remaining = countdownState.end.getTime() - timestamp;
  } else {
    labelText = 'This prayer period has ended';
    remaining = null;
  }
  $('countdownLarge').textContent = remaining == null ? '—' : countdown(remaining);
  $('countdownDescription').textContent = lang() === 'bn' ? (BN_TEXT[labelText] || labelText) : labelText;
  $('countdownStart').textContent = lang() === 'bn'
    ? `শুরু ${fmt(countdownState.start)} · শেষ ${fmt(countdownState.end)} · ${dayName(countdownState.start)}`
    : `Begins ${fmt(countdownState.start)} · Ends ${fmt(countdownState.end)} · ${dayName(countdownState.start)}`;
  const best = $('bestBlock');
  const pref = preferredWindow(countdownState.key, countdownState.start, countdownState.end, state.profile.school, { friday: countdownState.friday, eid: countdownState.eid });
  const phase = preferredState(pref, timestamp);
  // (v2.2.0) with no preferred-time card the information card is centred under the countdown panel
  if (best) best.parentElement.classList.toggle('no-best', phase === 'none' || phase === 'expired');
  const hero = $('eventHero');
  if (hero) hero.classList.toggle('is-best', phase === 'active');
  $('countdownLarge').classList.toggle('is-gold', phase === 'active');
  if (best) {
    if (phase === 'none' || phase === 'expired') {
      best.hidden = true;
    } else {
      best.hidden = false;
      const before = phase === 'upcoming';
      const target = before ? pref.start.getTime() : pref.end.getTime();
      $('bestCountdown').textContent = countdown(target - timestamp);
      $('bestNote').textContent = `${before ? (lang()==='bn' ? 'উত্তম সময় শুরু হতে' : 'Preferred window begins in') : (lang()==='bn' ? 'উত্তম সময় বাকি' : 'Preferred window remaining')} · ${lang()==='bn' ? pref.bn : pref.en}`;
    }
  }
}

function renderCountdownView() {
  if (!countdownState || currentPage !== 'countdown') return;
  updateCountdownViewLive(new Date());
  renderCountdownDetails();
  translateRenderedText();
}

function navigateToPrayerDescription(key) {
  openPrayerPage(key);
}

function renderPrayerPage() {
  const root = $('prayerViewBody');
  const key = prayerPageKey;
  if (!root || !key) return;
  const bn = lang() === 'bn';
  const date = selectedDate instanceof Date ? selectedDate : new Date();
  const evidenceKey = key === 'dhuhr' && date.getDay() === 5 ? 'jumuah' : key;
  const school = shiaMode() ? 'jafari' : state.profile.school;
  const evidence = evidenceFor(evidenceKey, school, bn ? 'bn' : 'en');
  const guidance = (evidenceKey === 'jumuah' ? PRAYER_GUIDANCE.jumuah : PRAYER_GUIDANCE[key]) || null;
  const title = slotName(key, date);
  const titleEl = $('prayerViewTitle');
  if (titleEl) titleEl.textContent = title;
  const items = (evidence?.items || []).slice(0, 4);
  const quotes = items.map(item => `<article class="page-card panel prayer-source-card" data-kind="${item.kind}"><div class="eyebrow">${item.kind === 'quran' ? (bn ? 'কুরআন' : "QUR'AN") : (bn ? 'হাদিস' : 'HADITH')}</div><blockquote class="prayer-source-quote">${escapeHtml(item.text)}</blockquote><p class="prayer-source-ref">${escapeHtml(item.ref)}</p></article>`).join('');
  const note = evidence?.note ? `<article class="page-card panel"><p class="muted">${escapeHtml(evidence.note)}</p></article>` : '';
  const showGuide = guidance && (!shiaMode() || !/Hanafi|mu’akkadah|হানাফি|মুয়াক্কাদা/.test(`${guidance.guide || ''} ${guidance.rakahs || ''}`));
  const practical = showGuide ? `<article class="page-card panel"><div class="eyebrow">${bn ? 'রাকাত' : "RAK'AHS"}</div><h2>${escapeHtml(bn ? guidance.bn : guidance.rakahs)}</h2><p>${escapeHtml(bn ? guidance.guideBn : guidance.guide)}</p></article>` : '';
  root.innerHTML = quotes || note || practical
    ? `${quotes}${note}${practical}`
    : `<article class="page-card panel"><p class="muted">${bn ? 'এই নামাজের জন্য যাচাই করা আলাদা বর্ণনা রাখা নেই।' : 'No separate verified passage is stored for this prayer.'}</p></article>`;
  translateRenderedText();
}

function openPrayerPage(key) {
  if (!key) return;
  if (currentPage === 'home') homeScrollTop = window.scrollY || 0;
  prayerPageKey = key;
  leaveClockPage(false);
  currentPage = 'prayer';
  $('homeView').hidden = true;
  $('countdownView').hidden = true;
  $('settingsView').hidden = true;
  $('timeView').hidden = true;
  $('astroView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('prayerView').hidden = false;
  $('settingsToggle').hidden = true;
  renderPrayerPage();
  window.scrollTo(0, 0);
}

function fardLookback(now = new Date()) {
  const events = [];
  for (let offset = -8; offset <= 1; offset++) {
    const date = addDays(startOfDay(now), offset);
    const times = getTimes(date);
    const next = getTimes(addDays(date, 1));
    if (!times || !next) continue;
    for (const event of getFardEvents(date, times, next)) events.push({ ...event, dateKey: dateKey(date) });
  }
  return events;
}

/* v2.1.0 expanded clock page. The astrolabe card moves into the top bar and the analog clock grows into the centre of the
   page; both are the same live elements (never copies), so rotation, hands and updates simply carry on. The move is a FLIP
   transition: each square instrument glides from where it was to where it lands. */
function flipMove(nodes, mutate) {
  const first = nodes.map(node => node.getBoundingClientRect());
  mutate();
  if (prefersReducedMotion() || typeof nodes[0]?.animate !== 'function') return;
  nodes.forEach((node, index) => {
    const from = first[index], to = node.getBoundingClientRect();
    if (!to.width) return;
    // v3.0.4 L: an instrument that was not laid out where it started (zero-size rect) still glides in at its destination.
    if (!from.width || !from.height) {
      node.animate([
        { transformOrigin: 'center', transform: 'translateY(-24px) scale(.82)', opacity: 0 },
        { transformOrigin: 'center', transform: 'none', opacity: 1 }
      ], { duration: 620, easing: 'cubic-bezier(.22,.72,.2,1)' });
      return;
    }
    const sx = from.width / to.width, sy = from.height / to.height;
    node.animate([
      { transformOrigin: 'top left', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})` },
      { transformOrigin: 'top left', transform: 'none' }
    ], { duration: 620, easing: 'cubic-bezier(.22,.72,.2,1)' });
  });
}

function fadeIn(node) {
  if (!node || prefersReducedMotion() || typeof node.animate !== 'function') return;
  node.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'ease-out', delay: 140, fill: 'backwards' });
}

function moveInstrumentsToClockPage() {
  if (document.body.classList.contains('clock-expanded')) return;
  document.body.classList.add('clock-expanded');
  $('topbarAstro').append($('skyPanel'));
  $('clockBigSlot').append($('analogClockButton'));
  $('clockBigSlot').append(document.querySelector('.clock-readout'));
}

function leaveClockPage(animate = false) {
  if (!document.body.classList.contains('clock-expanded') && !document.body.classList.contains('astro-expanded')) return;
  const restore = () => {
    document.body.classList.remove('clock-expanded', 'astro-expanded');
    const row = $('instrumentRow');
    row.prepend($('skyPanel'));
    const card = $('clockCard');
    card.prepend($('analogClockButton'));
    card.append(document.querySelector('.clock-readout'));
  };
  if (animate) flipMove([$('astroStage'), $('analogClockButton')], restore); else restore();
}

/* v3.0.4 L: before the glide, bring the instruments into view (top of the page) so they glide from where the reader
   sees them, from any page and any scroll position. */
function leaveOtherPageForInstruments() {
  if ((window.scrollY || 0) > 0) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function openTimeView() {
  if (currentPage === 'time') return;
  if (!hasLocation()) { openSettings(); return; }
  if (currentPage === 'home') homeScrollTop = window.scrollY || 0;
  leaveOtherPageForInstruments();
  currentPage = 'time';
  $('homeView').hidden = true;
  $('countdownView').hidden = true;
  $('settingsView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('prayerView').hidden = true;
  $('settingsToggle').hidden = true;
  $('timeView').hidden = false;
  $('astroView').hidden = true;
  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.zoom = '';
  flipMove([$('astroStage'), $('analogClockButton')], () => {
    if (document.body.classList.contains('astro-expanded')) leaveClockPage(false);
    moveInstrumentsToClockPage();
    renderTimeView();
  });
  fadeIn($('clockHero'));
  fadeIn($('timeCards'));
  window.scrollTo(0, 0);
}

/* ---- v2.1.1 expanded astrolabe page ------------------------------------------------------------------------------
   A plain click on the astrolabe opens it large in the centre of its own page, the way the clock does. The live clock moves
   into the top bar; every figure the small instrument used to print (sun, moon, pause windows, prayers, coordinates) is
   shown once, in cards around it. Same live elements, never copies. */
const COMPASS = [['N', 'উত্তর'], ['NE', 'উত্তর-পূর্ব'], ['E', 'পূর্ব'], ['SE', 'দক্ষিণ-পূর্ব'], ['S', 'দক্ষিণ'], ['SW', 'দক্ষিণ-পশ্চিম'], ['W', 'পশ্চিম'], ['NW', 'উত্তর-পশ্চিম']];
const compassName = (azimuth, bn) => COMPASS[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8][bn ? 1 : 0];

function moveInstrumentsToAstroPage() {
  if (document.body.classList.contains('astro-expanded')) return;
  document.body.classList.add('astro-expanded');
  $('astroBigSlot').append($('skyPanel'));
  $('topbarClock').append($('analogClockButton'));
  $('topbarClock').append(document.querySelector('.clock-readout'));
}

function openAstroView() {
  if (currentPage === 'astro') return;
  if (!hasLocation()) { openSettings(); return; }
  // v3.0.4 L: opens from every page (it used to return early unless the page was home or the clock page).
  if (currentPage === 'home') homeScrollTop = window.scrollY || 0;
  leaveOtherPageForInstruments();
  currentPage = 'astro';
  $('homeView').hidden = true;
  $('countdownView').hidden = true;
  $('settingsView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('timeView').hidden = true;
  $('prayerView').hidden = true;
  $('settingsToggle').hidden = true;
  $('astroView').hidden = false;
  const shell = document.querySelector('.app-shell');
  if (shell) shell.style.zoom = '';
  flipMove([$('astroStage'), $('analogClockButton')], () => {
    if (document.body.classList.contains('clock-expanded')) leaveClockPage(false);
    moveInstrumentsToAstroPage();
    renderAstroView();
  });
  fadeIn($('astroHeroLeft'));
  fadeIn($('astroHeroRight'));
  fadeIn($('astroCards'));
  window.scrollTo(0, 0);
}

let astroViewKey = '';
function renderAstroView() {
  const left = $('astroHeroLeft'), right = $('astroHeroRight'), below = $('astroCards');
  if (!left || !right || !below || !hasLocation()) return;
  const now = new Date();
  const bn = lang() === 'bn';
  const n = value => (bn ? localizeDigits(value) : String(value));
  const deg = value => `${n(Math.round(value))}°`;
  const times = getTimes(startOfDay(now));
  const okTimes = !!times && Number.isFinite(times.sunrise?.getTime()) && Number.isFinite(times.sunset?.getTime());
  const sun = sunPosition(now, state.lat, state.lon);
  const moon = moonPosition(now, state.lat, state.lon);
  const phase = moonPhase(now);
  const pass = moonPass(now, state.lat, state.lon);
  const row = (k, v, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></li>`;
  const card = (eyebrow, body, cls = '') => `<article class="page-card panel astro-info${cls ? ` ${cls}` : ''}"><div class="eyebrow">${escapeHtml(eyebrow)}</div>${body}</article>`;
  // Sun
  const sunRows = [
    row(bn ? 'উচ্চতা' : 'Height', deg(sun.altitude)),
    row(bn ? 'দিক' : 'Direction', `${deg(sun.azimuth)} ${compassName(sun.azimuth, bn)}`),
    okTimes ? row(bn ? 'সূর্যোদয়' : 'Sunrise', fmt(times.sunrise)) : '',
    times?.solarNoon ? row(bn ? 'সৌর মধ্যাহ্ন' : 'Solar noon', fmt(times.solarNoon)) : '',
    okTimes ? row(bn ? 'সূর্যাস্ত' : 'Sunset', fmt(times.sunset)) : ''
  ].join('');
  // Moon
  const phaseText = PHASE_NAMES[phaseName(phase)][bn ? 1 : 0];
  const moonRows = [
    row(bn ? 'উচ্চতা' : 'Height', deg(moon.altitude)),
    row(bn ? 'দিক' : 'Direction', `${deg(moon.azimuth)} ${compassName(moon.azimuth, bn)}`),
    row(bn ? 'দশা' : 'Phase', phaseText),
    row(bn ? 'আলোকিত অংশ' : 'Illumination', `${n(Math.round(phase.illumination * 100))}%`),
    pass?.rise ? row(bn ? 'চাঁদ ওঠে' : 'Moonrise', fmt(pass.rise)) : '',
    pass?.set ? row(bn ? 'চাঁদ ডোবে' : 'Moonset', fmt(pass.set)) : ''
  ].join('');
  left.innerHTML = card(bn ? 'সূর্য' : 'SUN', `<ul class="fact-list">${sunRows}</ul>`) + card(bn ? 'চাঁদ' : 'MOON', `<ul class="fact-list">${moonRows}</ul>`);
  // Pause windows (the three times when prayer is paused) and the prayers
  const intervals = okTimes ? prohibitedIntervals(times) : [];
  const pauseRows = intervals.map(item => {
    const active = now >= item.start && now < item.end;
    const name = PROHIBITED_LABELS[item.key][bn ? 'bn' : 'en'];
    return `<li class="${active ? 'is-now' : ''}"><span>${escapeHtml(name)}${active ? ` · <b class="astro-live" data-live-countdown="true" data-until="${item.end.getTime()}">${countdown(item.end.getTime() - now.getTime())}</b>` : ''}</span><strong>${escapeHtml(fmt(item.start))}–${escapeHtml(fmt(item.end))}</strong></li>`;
  }).join('');
  const { active, next } = focusPrayer(now);
  const nowBlock = active
    ? `<p class="astro-prayer-name">${escapeHtml(slotName(active.key, active.date))}</p><p class="muted">${escapeHtml(fmt(active.start))} – ${escapeHtml(fmt(active.end))} · ${bn ? 'বাকি' : 'left'} <strong class="astro-live" data-live-countdown="true" data-until="${active.end.getTime()}">${countdown(active.end.getTime() - now.getTime())}</strong></p>`
    : `<p class="astro-prayer-name">${bn ? 'এখন কোনো নামাজের সময় চলছে না' : 'No prayer time is in progress'}</p>`;
  const nextBlock = next
    ? `<p class="astro-prayer-name">${escapeHtml(slotName(next.key, next.date))}</p><p class="muted">${bn ? 'শুরু' : 'Begins'} ${escapeHtml(fmt(next.start))} · ${bn ? 'আর' : 'in'} <strong class="astro-live" data-live-countdown="true" data-until="${next.start.getTime()}">${countdown(next.start.getTime() - now.getTime())}</strong></p>`
    : '<p class="muted">—</p>';
  right.innerHTML = card(liveHeadingText([{}]), `<ul class="fact-list">${pauseRows || `<li><span>—</span></li>`}</ul>`) +
    card(bn ? 'এখনকার ও পরবর্তী নামাজ' : 'CURRENT AND NEXT PRAYER', `<div class="astro-prayer-block"><div class="eyebrow">${bn ? 'এখন' : 'NOW'}</div>${nowBlock}</div><div class="astro-prayer-block"><div class="eyebrow">${bn ? 'পরবর্তী' : 'NEXT'}</div>${nextBlock}</div>`);
  // Below: coordinates and the instrument controls
  const lat = Math.abs(state.lat).toFixed(4), lon = Math.abs(state.lon).toFixed(4);
  const lst = ((localSiderealDegrees(now, state.lon) % 360) + 360) % 360 / 15;
  const lstText = `${pad(Math.floor(lst))}:${pad(Math.floor((lst % 1) * 60))}`;
  below.innerHTML = card(bn ? 'স্থানাঙ্ক' : 'COORDINATES', `<ul class="fact-list">${[
    row(bn ? 'অক্ষাংশ' : 'Latitude', `${n(lat)}° ${state.lat >= 0 ? (bn ? 'উত্তর' : 'N') : (bn ? 'দক্ষিণ' : 'S')}`),
    row(bn ? 'দ্রাঘিমাংশ' : 'Longitude', `${n(lon)}° ${state.lon >= 0 ? (bn ? 'পূর্ব' : 'E') : (bn ? 'পশ্চিম' : 'W')}`),
    state.place ? row(bn ? 'স্থান' : 'Place', state.place) : '',
    row(bn ? 'স্থানীয় নাক্ষত্র সময়' : 'Local sidereal time', n(lstText)),
    row(bn ? 'সময় অঞ্চল' : 'Time zone', timezoneText())
  ].join('')}</ul>`) + card(bn ? 'যন্ত্র নিয়ন্ত্রণ' : 'INSTRUMENT', `<ul class="fact-list astro-help">${[
    row(bn ? 'ঘোরান' : 'Rotate', bn ? '“ঘোরান” চালু করুন, তারপর টানুন' : 'Turn on Rotate, then drag'),
    row(bn ? 'সূক্ষ্ম সমন্বয়' : 'Fine adjustment', bn ? 'শিফট ধরে টানুন' : 'Hold Shift and drag'),
    row(bn ? 'উল্টান' : 'Flip', bn ? 'কোণার বোতাম' : 'Corner button'),
    row(bn ? 'ঘূর্ণন রিসেট' : 'Reset rotation', bn ? 'ডাবল-ক্লিক বা হোম' : 'Double-click or Home')
  ].join('')}</ul>`);
  astroViewKey = `${Math.floor(now.getTime() / 60000)}|${lang()}`;
  translateRenderedText();
}

function updateAstroViewLive() {
  if (currentPage !== 'astro') return;
  const key = `${Math.floor(Date.now() / 60000)}|${lang()}`;
  if (key !== astroViewKey) renderAstroView();
}

function focusPrayer(now = new Date()) {
  const next = getNextPrayer(now);
  const active = getActiveEvents(now).find(event => event.kind === 'fard') || getActiveEvents(now)[0] || null;
  const focus = active || next || null;
  const pref = focus?.start instanceof Date && focus?.end instanceof Date
    ? preferredWindow(focus.key, focus.start, focus.end, state.profile.school, { friday: focus.key === 'dhuhr' && focus.date?.getDay() === 5, eid: focus.eid || '' })
    : null;
  return { now, next, active, focus, pref, phase: preferredState(pref, now) };
}

function preferredCopy(pref, phase, bn, now = new Date()) {
  if (!pref) {
    return {
      title: bn ? 'আলাদা উত্তম সময় নেই' : 'No separate preferred period',
      count: '—',
      gold: false,
      note: bn ? 'এই ইভেন্টের জন্য আলাদা উত্তম সময় লিপিবদ্ধ নেই।' : 'No separate preferred period is recorded for this event.',
      range: ''
    };
  }
  const range = `${fmt(pref.start)} – ${fmt(pref.end)}`;
  if (phase === 'upcoming') {
    return { title: bn ? 'উত্তম সময় আসছে' : 'Preferred window is ahead', count: countdown(pref.start.getTime() - now.getTime()), gold: false, note: bn ? pref.bn : pref.en, range };
  }
  if (phase === 'active') {
    return { title: bn ? 'উত্তম সময় চলছে' : 'Preferred window is open', count: countdown(pref.end.getTime() - now.getTime()), gold: true, note: bn ? pref.bn : pref.en, range };
  }
  return { title: bn ? 'উত্তম সময় পার হয়েছে' : 'Preferred window has passed', count: range, gold: false, note: bn ? pref.bn : pref.en, range: '' };
}

function paintPreferred(now = new Date()) {
  const card = $('timePreferred');
  if (!card) return;
  const { pref, phase } = focusPrayer(now);
  const copy = preferredCopy(pref, phase, lang() === 'bn', now);
  card.classList.toggle('is-best', copy.gold);
  const title = $('timePreferredTitle');
  const count = $('timePreferredCount');
  const note = $('timePreferredNote');
  const range = $('timePreferredRange');
  if (title) title.textContent = copy.title;
  if (count) { count.textContent = copy.count; count.classList.toggle('is-gold', copy.gold); }
  if (note) note.textContent = copy.note;
  if (range) range.textContent = copy.range;
}

function renderTimeView() {
  const root = $('timeCards');
  if (!root) return;
  const now = new Date();
  const bn = lang() === 'bn';
  const n = value => (bn ? localizeDigits(value) : String(value));
  const times = getTimes(startOfDay(now));
  const { next, active, focus, phase } = focusPrayer(now);
  const paused = activeProhibited(now)[0] || null;
  const activeFard = getActiveEvents(now).find(event => event.kind === 'fard') || null;
  const nextName = next ? slotName(next.key, next.date) : '';
  const pauseName = paused ? PROHIBITED_LABELS[paused.key][bn ? 'bn' : 'en'] : '';
  // Left: where we are now. A prohibited interval replaces "remaining in this prayer".
  const left = [];
  left.push(`<div class="eyebrow">${bn ? 'বর্তমান অবস্থা' : 'CURRENT STATUS'}</div>`);
  if (paused) {
    left.push(`<h2 class="clock-status-name">${escapeHtml(pauseName)}</h2><p class="clock-status-range">${escapeHtml(fmt(new Date(paused.start)))} – ${escapeHtml(fmt(new Date(paused.end)))}</p><p class="clock-status-line">${bn ? 'এই নিষিদ্ধ সময়ে বাকি' : 'Time left in this prohibited time'} <strong data-time-until="${paused.end.getTime()}" id="clockStatusCount">${escapeHtml(countdown(paused.end.getTime() - now.getTime()))}</strong></p>`);
    if (active) left.push(`<p class="muted">${escapeHtml(bn ? `${slotName(active.key, active.date)}-এর ওয়াক্ত চলছে, কিন্তু এই বিরতিতে নামাজ বন্ধ।` : `${slotName(active.key, active.date)} is still in its window, but prayer is paused for this interval.`)}</p>`);
  } else if (active) {
    left.push(`<h2 class="clock-status-name">${escapeHtml(slotName(active.key, active.date))}</h2><p class="clock-status-range">${escapeHtml(fmt(active.start))} – ${escapeHtml(fmt(active.end))}</p><p class="clock-status-line">${bn ? 'এই ওয়াক্ত শেষ হতে' : 'Time left in this prayer'} <strong data-time-until="${active.end.getTime()}" id="clockStatusCount">${escapeHtml(countdown(active.end.getTime() - now.getTime()))}</strong></p>`);
  } else {
    left.push(`<h2 class="clock-status-name">${bn ? 'এখন কোনো নামাজের সময় চলছে না' : 'No prayer time is in progress'}</h2>`);
    if (next) left.push(`<p class="clock-status-range">${bn ? 'পরবর্তী: ' : 'Next: '}${escapeHtml(nextName)} · ${escapeHtml(fmt(next.start))}</p>`);
  }
  left.push(`<article class="clock-preferred preferred-period${phase === 'active' ? ' is-best' : ''}" id="timePreferred"><div class="eyebrow">${bn ? 'উত্তম সময়' : 'PREFERRED TIME'}</div><h3 id="timePreferredTitle"></h3><div class="clock-preferred-count" id="timePreferredCount"></div><p id="timePreferredRange"></p><p class="muted" id="timePreferredNote"></p></article>`);
  $('clockHeroLeft').innerHTML = left.join('');
  // Right: the countdown that matters and the day's timings
  const until = paused ? paused.end.getTime() : (active ? active.end.getTime() : (next ? next.start.getTime() : NaN));
  const label = paused
    ? (bn ? 'এই নিষিদ্ধ সময়ে বাকি' : 'Remaining in this prohibited time')
    : active ? (bn ? 'এই ওয়াক্ত শেষ হতে বাকি' : 'Remaining in this prayer') : (bn ? 'পরবর্তী ফরজ শুরু হতে' : 'Until the next obligatory prayer');
  const countName = paused ? pauseName : (active ? slotName(active.key, active.date) : nextName);
  const timing = [];
  if (times) for (const key of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) if (times[key]) timing.push(`<li${next && next.key === key ? ' class="is-next"' : ''}${activeFard && activeFard.key === key ? ' class="is-now"' : ''}><span>${escapeHtml(key === 'sunrise' ? (bn ? 'সূর্যোদয়' : 'Sunrise') : prayerName(key))}</span><strong>${escapeHtml(fmt(times[key]))}</strong></li>`);
  if (times?.zawalStart) timing.push(`<li><span>${bn ? 'জাওয়াল' : 'Zawal'}</span><strong>${escapeHtml(fmt(times.zawalStart))}–${escapeHtml(fmt(times.zawalEnd))}</strong></li>`);
  $('clockHeroRight').innerHTML = `<div class="eyebrow">${bn ? 'প্রধান গণনা' : 'MAIN COUNTDOWN'}</div><p class="clock-count-label">${escapeHtml(label)}</p><div class="clock-count-big${phase === 'active' && !paused ? ' is-gold' : ''}" id="timeMainCount" data-until="${Number.isFinite(until) ? until : ''}">${escapeHtml(Number.isFinite(until) ? countdown(until - now.getTime()) : '—')}</div><p class="clock-count-name">${escapeHtml(countName)}</p><ul class="fact-list clock-timings">${timing.join('')}</ul>`;
  $('clockHeroCount').innerHTML = '';
  // Below: information that does not repeat the hero
  const guide = focus ? (focus.key === 'dhuhr' && focus.date.getDay() === 5 ? PRAYER_GUIDANCE.jumuah : PRAYER_GUIDANCE[focus.key]) : null;
  const sun = hasLocation() ? sunPosition(now, state.lat, state.lon) : null;
  const moon = hasLocation() ? moonPosition(now, state.lat, state.lon) : null;
  const pass = hasLocation() ? moonPass(now, state.lat, state.lon) : null;
  const sky = [];
  if (times?.solarNoon) sky.push(`<li><span>${bn ? 'সৌর মধ্যাহ্ন' : 'Solar noon'}</span><strong>${escapeHtml(fmt(times.solarNoon))}</strong></li>`);
  if (sun) sky.push(`<li><span>${bn ? 'সূর্য' : 'Sun'}</span><strong>${escapeHtml(bn ? localizeDigits(Math.round(sun.altitude)) + '° / ' + localizeDigits(Math.round(sun.azimuth)) + '°' : Math.round(sun.altitude) + '° alt · ' + Math.round(sun.azimuth) + '° az')}</strong></li>`);
  if (moon) sky.push(`<li><span>${bn ? 'চাঁদ' : 'Moon'}</span><strong>${escapeHtml(bn ? localizeDigits(Math.round(moon.altitude)) + '° / ' + localizeDigits(Math.round(moon.azimuth)) + '°' : Math.round(moon.altitude) + '° alt · ' + Math.round(moon.azimuth) + '° az')}</strong></li>`);
  if (pass?.rise) sky.push(`<li><span>${bn ? 'চাঁদ ওঠে' : 'Moonrise'}</span><strong>${escapeHtml(fmt(pass.rise))}</strong></li>`);
  if (pass?.set) sky.push(`<li><span>${bn ? 'চাঁদ ডোবে' : 'Moonset'}</span><strong>${escapeHtml(fmt(pass.set))}</strong></li>`);
  const recordCard = focus ? (() => {
    const lines = summaryLines(focus);
    const openDataset = `data-kind="${focus.kind}" data-key="${focus.key}" data-date="${dateKey(focus.date)}" data-start="${focus.start.getTime()}" data-end="${focus.end.getTime()}"`;
    return `<article class="page-card panel"><div class="eyebrow">${bn ? 'রেকর্ড' : 'COMPLETION'}</div><h2>${escapeHtml(slotName(focus.key, focus.date))}</h2>${lines.length ? `<ul class="summary-lines">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : `<p class="muted">${bn ? 'এখনো কিছু রেকর্ড হয়নি।' : 'Nothing is recorded for this event yet.'}</p>`}<button class="secondary-button" type="button" id="timeOpenEvent" ${openDataset}>${bn ? 'পুরো পৃষ্ঠা খুলুন' : 'Open the full event page'}</button></article>`;
  })() : '';
  root.innerHTML = `<article class="page-card panel"><div class="eyebrow">${bn ? 'রাকাত' : "RAK'AH"}</div><h2>${escapeHtml(guide ? (bn ? guide.bn : guide.rakahs) : '—')}</h2><p class="muted">${escapeHtml(guide ? (bn ? guide.guideBn : guide.guide) : '')}</p></article>${recordCard}<article class="page-card panel"><div class="eyebrow">${bn ? 'জ্যোতির্বিজ্ঞান' : 'SKY NOW'}</div><ul class="fact-list">${sky.join('')}</ul></article>`;
  const opener = $('timeOpenEvent');
  if (opener) opener.addEventListener('click', () => { leaveClockPage(false); openEventCountdown(opener.dataset); });
  paintPreferred(now);
  void n;
}

function openSettings() {
  leaveClockPage(false);
  homeScrollTop = window.scrollY || 0;
  currentPage = 'settings';
  $('homeView').hidden = true;
  $('countdownView').hidden = true;
  $('timeView').hidden = true;
  $('astroView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('prayerView').hidden = true;
  $('settingsView').hidden = false;
  $('settingsToggle').hidden = false;
  $('settingsToggle').innerHTML = homeIcon;
  $('settingsToggle').setAttribute('aria-label', 'Home');
  $('settingsToggle').title = 'Home';
  syncSettingsControls();
  translateRenderedText();
  window.scrollTo(0, 0);
}

function openHome() {
  if (!hasLocation()) {
    showToast('Set your location with a Google Maps link or coordinates first.');
    openSettings();
    return;
  }
  const previous = currentPage;
  currentPage = 'home';
  leaveClockPage(previous === 'time' || previous === 'astro');
  $('settingsView').hidden = true;
  $('countdownView').hidden = true;
  $('timeView').hidden = true;
  $('astroView').hidden = true;
  $('weeklyDayView').hidden = true;
  $('prayerView').hidden = true;
  $('homeView').hidden = false;
  $('settingsToggle').hidden = false;
  $('settingsToggle').innerHTML = gearIcon;
  $('settingsToggle').setAttribute('aria-label', 'Settings');
  $('settingsToggle').title = 'Settings';
  countdownState = null;
  render();
  if (previous !== 'home') window.setTimeout(() => window.scrollTo(0, homeScrollTop), 0);
}

function renderEventReminderSettings() {
  const root = $('eventReminderSettings');
  if (!root) return;
  const labels = Object.fromEntries([...FARD, ...REMINDER_VOLUNTARY].map(item => [item.key, lang() === 'bn' ? (item.bn || item.en) : item.en]));
  const options = [0, 5, 10, 15, 20, 30, 40, 50, 60];
  const hijriNow = currentHijriDate(new Date());
  root.innerHTML = [...FARD, ...REMINDER_VOLUNTARY].filter(item => reminderRowVisible(item.key, hijriNow)).map(item => {
    const value = Number(state.reminders[item.key] || 0);
    return `<div class="event-reminder-row"><label for="reminder-${item.key}">${escapeHtml(labels[item.key])}</label><select id="reminder-${item.key}" data-reminder-key="${item.key}" aria-label="${escapeHtml(labels[item.key])} ${lang() === 'bn' ? 'রিমাইন্ডার' : 'reminder'}"><option value="0">${lang() === 'bn' ? 'বন্ধ' : 'Off'}</option>${options.slice(1).map(min => `<option value="${min}" ${value === min ? 'selected' : ''}>${lang() === 'bn' ? localizeDigits(min) : min} ${lang() === 'bn' ? 'মিনিট আগে' : 'min before'}</option>`).join('')}</select></div>`;
  }).join('');
  root.querySelectorAll('[data-reminder-key]').forEach(select => select.addEventListener('change', event => {
    state.reminders[event.target.dataset.reminderKey] = Number(event.target.value) || 0;
    save();
  }));
}

/* Minutes before a scheduled prayer begins: any whole number 0–180 (0 = off).
   The five prayers, and voluntary prayers that have their own start (not Rawatib). */
function preBeginItems() {
  const hijriNow = currentHijriDate(new Date());
  const excluded = shiaMode() ? SHIA_EXCLUDED_VOLUNTARY : [];
  return [...FARD, ...REMINDER_VOLUNTARY].filter(item => !excluded.includes(item.key) && reminderRowVisible(item.key, hijriNow));
}
function renderPreReminderSettings() {
  const root = $('preReminderSettings');
  if (!root) return;
  const bn = lang() === 'bn';
  root.innerHTML = preBeginItems().map(item => {
    const label = bn ? (item.bn || item.en) : item.en;
    const value = Number(state.preReminders[item.key] || 0);
    return `<div class="event-reminder-row"><label for="pre-reminder-${item.key}">${escapeHtml(label)}</label><span class="pre-reminder-field"><input id="pre-reminder-${item.key}" class="pre-reminder-input" type="number" inputmode="numeric" min="0" max="${PRE_REMINDER_MAX}" step="1" value="${value}" data-pre-reminder-key="${item.key}" aria-label="${escapeHtml(bn ? `${label}-এর কত মিনিট আগে স্মরণ করাবে` : `Minutes before ${label} begins`)}"><small>${bn ? 'মিনিট আগে' : 'min before'}</small></span></div>`;
  }).join('');
  root.querySelectorAll('[data-pre-reminder-key]').forEach(input => input.addEventListener('change', event => {
    const key = event.target.dataset.preReminderKey;
    const minutes = parseReminderMinutes(event.target.value);
    if (minutes === null) {
      event.target.value = Number(state.preReminders[key] || 0);
      showToast('Enter whole minutes from 0 to 180');
      return;
    }
    if (minutes) state.preReminders[key] = minutes; else delete state.preReminders[key];
    event.target.value = minutes;
    save();
  }));
}

/* Preferred-time reminders (src/preferred-reminders.js). Two tabs, each with its own switch and a lead time per prayer that
   really has a preferred period on today's schedule (Ja'fari mode and the date decide which rows exist). */
let prefTab = 'begin';
function prefScheduleEvents(now = new Date()) {
  const today = startOfDay(now);
  const out = [];
  for (const date of [addDays(today, -1), today, addDays(today, 1)]) {
    const times = getTimes(date);
    const nextTimes = getTimes(addDays(date, 1));
    if (!times || !nextTimes) continue;
    out.push(...getFardEvents(date, times, nextTimes), ...getVoluntaryEvents(date, times, nextTimes));
  }
  return out;
}

function renderPrefReminderSettings() {
  const bn = lang() === 'bn';
  const todayEvents = prefScheduleEvents().filter(event => dateKey(event.date) === dateKey(new Date()));
  const keys = supportedKeys(todayEvents, state.profile.school);
  const school = state.profile.school;
  for (const kind of ['begin', 'end']) {
    const Kind = kind === 'begin' ? 'Begin' : 'End';
    const enable = $(`prefEnable${Kind}`);
    if (enable) enable.checked = !!state.prefReminders[kind].enabled;
    const rows = $(`prefRows${Kind}`);
    if (!rows) continue;
    rows.classList.toggle('is-off', !state.prefReminders[kind].enabled);
    rows.innerHTML = keys.length ? keys.map(key => {
      const event = todayEvents.find(item => item.key === key);
      const pref = event ? preferredWindow(key, event.start, event.end, school, { friday: key === 'dhuhr' && event.date.getDay() === 5, eid: event.eid || '' }) : null;
      const label = prayerName(key);
      const stored = state.prefReminders[kind].minutes;
      const has = Object.prototype.hasOwnProperty.call(stored, key);
      const value = has ? Number(stored[key]) : '';
      const when = pref ? `${fmt(pref.start)} – ${fmt(pref.end)}` : '';
      return `<div class="event-reminder-row pref-row"><label for="pref-${kind}-${key}"><span class="pref-name">${escapeHtml(label)}</span><small class="pref-window">${bn ? 'উত্তম সময়' : 'Preferred'} ${escapeHtml(when)}</small></label><span class="pre-reminder-field"><input id="pref-${kind}-${key}" class="pre-reminder-input" type="number" inputmode="numeric" min="0" max="180" step="1" value="${has ? value : ''}" placeholder="${PREF_DEFAULT_MINUTES}" data-pref-kind="${kind}" data-pref-key="${key}"${state.prefReminders[kind].enabled ? '' : ' disabled'} aria-label="${escapeHtml(bn ? `${label}: ${kind === 'begin' ? 'উত্তম সময় শুরুর কত মিনিট আগে' : 'উত্তম সময় শেষের কত মিনিট আগে'}` : `${label}: minutes before the preferred time ${kind === 'begin' ? 'begins' : 'ends'}`)}"><small>${bn ? 'মিনিট আগে' : 'min before'}</small></span></div>`;
    }).join('') : `<p class="form-note">${bn ? 'আজ কোনো নামাজের উত্তম সময় নেই।' : 'No prayer has a preferred period today.'}</p>`;
    rows.querySelectorAll('[data-pref-key]').forEach(input => input.addEventListener('change', event => {
      const k = event.target.dataset.prefKind, key = event.target.dataset.prefKey;
      const raw = String(event.target.value).trim();
      if (raw === '') {
        delete state.prefReminders[k].minutes[key];
        event.target.value = '';
        save();
        return;
      }
      const minutes = parseReminderMinutes(raw);
      if (minutes === null) {
        const prev = state.prefReminders[k].minutes;
        event.target.value = Object.prototype.hasOwnProperty.call(prev, key) ? String(prev[key]) : '';
        showToast(bn ? 'এখানে ০ থেকে ১৮০ পর্যন্ত পূর্ণসংখ্যা লিখুন' : 'Enter whole minutes from 0 to 180');
        return;
      }
      state.prefReminders[k].minutes[key] = minutes;
      event.target.value = String(minutes);
      save();
    }));
  }
  setPrefTab(prefTab);
}

function setPrefTab(kind) {
  prefTab = kind === 'end' ? 'end' : 'begin';
  document.querySelectorAll('[data-pref-tab]').forEach(tab => {
    const on = tab.dataset.prefTab === prefTab;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  $('prefPanelBegin').hidden = prefTab !== 'begin';
  $('prefPanelEnd').hidden = prefTab !== 'end';
}

function initPrefReminderSettings() {
  if (!$('prefReminders') || $('prefReminders').dataset.ready) return;
  $('prefReminders').dataset.ready = '1';
  document.querySelectorAll('[data-pref-tab]').forEach(tab => {
    tab.addEventListener('click', () => setPrefTab(tab.dataset.prefTab));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setPrefTab(prefTab === 'begin' ? 'end' : 'begin');
      $(prefTab === 'begin' ? 'prefTabBegin' : 'prefTabEnd').focus();
    });
  });
  document.querySelectorAll('[data-pref-enable]').forEach(box => box.addEventListener('change', event => {
    state.prefReminders[event.target.dataset.prefEnable].enabled = event.target.checked;
    save();
    renderPrefReminderSettings();
  }));
}

function syncSettingsControls() {
  $('themeSelect').value = state.theme;
  $('languageSelect').value = state.language;
  $('soundToggle').checked = state.sound;
  const tickSound = $('tickSoundToggle');
  if (tickSound) tickSound.checked = state.tickSound !== false;
  $('tickStyleSelect').value = state.tickStyle;
  $('clockFormatSelect').value = state.clock;
  renderUiFontSelect();
  renderProfileSettings();
  $('compactToggle').checked = state.compact;
  $('notificationsToggle').checked = state.notifications;
  if ($('showDescriptionsToggle')) $('showDescriptionsToggle').checked = state.sections.descriptions;
  if ($('showSunnahToggle')) $('showSunnahToggle').checked = state.sections.sunnah;
  if ($('showOnThisDayToggle')) $('showOnThisDayToggle').checked = state.sections.onThisDay;
  document.querySelectorAll('[data-card]').forEach(box => { box.checked = state.cards[box.dataset.card] !== false; });
  document.querySelectorAll('.card-toggles').forEach(group => { const on = state.sections[{ showDescriptionsToggle: 'descriptions', showSunnahToggle: 'sunnah', showOnThisDayToggle: 'onThisDay' }[group.dataset.tab]]; group.querySelectorAll('input').forEach(input => { input.disabled = !on; }); });
  renderEventReminderSettings();
  renderPreReminderSettings();
  renderPrefReminderSettings();
  renderHijriAdjust();
  if ($('blessedProgressToggle')) $('blessedProgressToggle').checked = state.blessedProgress !== false;
  $('latitude').value = hasLocation() ? state.lat : '';
  $('longitude').value = hasLocation() ? state.lon : '';
  $('startupToggle').checked = !!state.startup;
  if ($('showRewardText')) $('showRewardText').checked = state.showRewardText !== false;
  if ($('voluntarySeconds')) $('voluntarySeconds').value = state.recognitionPace.voluntary;
  if ($('verseSeconds')) $('verseSeconds').value = verseSeconds(state.recognitionPace);
  $('savedLocationText').textContent = hasLocation() ? 'Saved location' : 'Location not configured';
  $('savedCoordinates').textContent = hasLocation() ? `${state.lat.toFixed(6)}, ${state.lon.toFixed(6)}` : '—';
  for (const [key, value] of Object.entries(state.adjustments)) {
    const input = $(`adjust-${key}`);
    if (input) input.value = value;
  }
}

function renderSettingsSummary() {
  renderSettingsIntervals();
  renderReadingSettings();
  renderHijriAdjust();
  if ($('savedLocationText')) {
    $('savedLocationText').textContent = hasLocation() ? 'Saved location' : 'Location not configured';
    $('savedCoordinates').textContent = hasLocation() ? `${state.lat.toFixed(6)}, ${state.lon.toFixed(6)}` : '—';
  }
}

function useMapLink() {
  const text = $('mapsLink').value.trim();
  if (!text) {
    setTranslatedText('mapLinkNote', 'Paste a Google Maps share link first.');
    return;
  }
  if (!isGoogleMapsUrl(text)) {
    setTranslatedText('mapLinkNote', 'Enter a valid Google Maps HTTPS link.');
    return;
  }
  const coords = parseCoordinates(text);
  if (!coords) {
    setTranslatedText('mapLinkNote', 'This Maps link does not contain readable coordinates. Shortened links cannot be expanded offline; copy the latitude and longitude from Maps and enter them below.');
    return;
  }
  $('latitude').value = coords.lat;
  $('longitude').value = coords.lon;
  setTranslatedText('mapLinkNote', `Coordinates found: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}. Select Save location to store them on this device.`);
}

function saveLocation() {
  const latText = $('latitude').value.trim();
  const lonText = $('longitude').value.trim();
  const lat = Number(latText);
  const lon = Number(lonText);
  if (!latText || !lonText || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    setTranslatedText('locationStatus', 'Enter valid coordinates: latitude −90 to 90, longitude −180 to 180.');
    return;
  }
  state.lat = lat;
  state.lon = lon;
  state.place = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  save();
  setTranslatedText('locationStatus', 'Location saved locally on this device.');
  translateRenderedText();
  showToast('Location saved');
  openHome();
}

/* ---- Locking of marked events (src/tick-lock.js) ------------------------- */
function lockContext(date) {
  const times = getTimes(date);
  const nextTimes = getTimes(addDays(date, 1));
  const afterTimes = getTimes(addDays(date, 2));
  if (!times || !nextTimes) return { events: [], nextFajr: null };
  const events = [...getFardEvents(date, times, nextTimes), ...getVoluntaryEvents(date, times, nextTimes)];
  if (afterTimes) events.push(...getFardEvents(addDays(date, 1), nextTimes, afterTimes));
  return { events, nextFajr: nextTimes.fajr };
}

function lockItem(layer, key) {
  const slot = layer === 'sunnah' || layer === 'nafl' ? findSlot(layer, key) : null;
  return { kind: layer, key, prayer: slot ? slot.prayer : undefined };
}

/** Is this ticked item locked now, and which event's start locked it. */
function lockState(layer, key, date, now = new Date()) {
  const dayStr = dateKey(date);
  const ctx = lockContext(startOfDay(date));
  const lock = lockInstant(lockItem(layer, key), ctx.events, ctx.nextFajr);
  const sealed = !!dayRecord(date, false).locked?.[lockKey(layer, key)];
  const locked = sealed || dayIsLocked(dayStr, dateKey(progressDate(now)), state.lockWatermark) || (!!lock && now.getTime() >= lock.at);
  return { locked, by: lock ? lock.by : null };
}

/** "Locked after Dhuhr began" in the current language, or '' when not locked. */
function lockTipFor(layer, key, date, now = new Date()) {
  const { locked, by } = lockState(layer, key, date, now);
  if (!locked) return '';
  const byDate = by === 'fajr' ? addDays(startOfDay(date), 1) : startOfDay(date);
  return lockTip(by ? slotName(by, byDate) : null, lang());
}

/** Small lock icon with a tooltip. Inside a button it is decoration only (the button itself is focusable and carries the text). */
function lockMarkHtml(tip, inButton = false) {
  return inButton
    ? `<span class="lock-mark" aria-hidden="true" data-lock-tip="${escapeHtml(tip)}"></span>`
    : `<span class="lock-mark" role="img" tabindex="0" aria-label="${escapeHtml(tip)}" data-lock-tip="${escapeHtml(tip)}"></span>`;
}

/** Remember locks as they happen (so a clock set back never re-opens them) and advance the date watermark. */
function sealLocks(now = new Date()) {
  const day = progressDate(now);
  const times = getTimes(day);
  const dhuhrStarted = !!(times?.dhuhr && now >= times.dhuhr);
  let changed = false;
  const watermark = nextWatermark(state.lockWatermark, dateKey(day), addDaysKey, dhuhrStarted);
  if (watermark !== state.lockWatermark) { state.lockWatermark = watermark; changed = true; }
  for (const target of [addDays(day, -1), day]) {
    const record = state.history[dateKey(target)];
    if (!record) continue;
    const ctx = lockContext(target);
    changed = sealRecord(record, (layer, key) => ({ item: lockItem(layer, key), events: ctx.events, nextFajr: ctx.nextFajr }), now) || changed;
  }
  if (changed) save();
}

function togglePrayer(kind, key, dateText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
  if (!match) return;
  const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // v3.0.4 C: a recorded tick changes only from the Prayer record page (no toast, no sound).
  if (dayRecord(eventDate, false)[kind]?.[key]) return;
  const event = findRecordableEvent(kind, key, eventDate);
  const lock = event ? lockInstant(lockItem(kind, key), lockContext(eventDate).events, lockContext(eventDate).nextFajr) : null;
  if (!event || !recordingOpen(event.start, event.end, lock && lock.at, new Date())) {
    showToast('This prayer event is not currently available.');
    renderLiveEvents();
    return;
  }
  // A tick only selects: the tick sound plays, nothing counts until Mark Complete.
  const pend = pendingDay(eventDate);
  const target = pend[kind] || (pend[kind] = {});
  const on = !target[key];
  if (on && kind === 'fard' && partOrderLocks(key, eventDate).get('fard')) return; // v3.0.5: a later circle is ticked
  if (on) target[key] = true; else delete target[key];
  savePending();
  playSelectSound(layerOf(kind, key), on);
  render();
}

function markEventComplete(kind, key, dateText, { late = false } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText || '');
  if (!match) return;
  const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const event = findRecordableEvent(kind, key, eventDate);
  const now = new Date();
  // v3.0.4 E: under "Revise previous prayer" the same completion flow runs after the time has ended,
  // until the existing record-window lock; what it records is marked "recorded after its time".
  const lateOk = late && event && now >= event.end && !eventClosed(event)
    && !dayIsLocked(dateKey(event.date), dateKey(progressDate(now)), state.lockWatermark) && reviseOpen(event, now);
  if (!event || (!lateOk && (now < event.start || now >= event.end))) {
    showToast('This prayer event is not currently available.');
    renderLiveEvents();
    return;
  }
  const before = dayLayers(eventDate);
  const record = dayRecord(eventDate);
  const pend = pendingDay(eventDate, false);
  // Mark Complete records the event's main tick (if it is not recorded yet) and, v3.0.4 C, everything
  // selected on the card; then it closes the card. Circles left empty stay empty.
  const layer = layerOf(kind, key);
  const bucket = record[layer] || (record[layer] = {});
  const friday = kind === 'fard' && key === 'dhuhr' && eventDate.getDay() === 5;
  let newlyTicked = false;
  if (friday) {
    if (!shownFridayFard(record)) {
      if (pend.fridayFard === 'dhuhr') applyFridayFard(record, 'dhuhr'); else applyFridayFard(record, 'jumuah'); // the selected choice; Jumu’ah when none
      newlyTicked = true;
    }
  } else if (!bucket[key]) {
    bucket[key] = true;
    newlyTicked = true;
  }
  if (lateOk && newlyTicked) noteLate(record, `${kind}:${key}`, event, true);
  if (friday) {
    (record.at || (record.at = {}))['fard:dhuhr'] = [Math.max(0, Math.round((Date.now() - event.start.getTime()) / 60000)), now.getHours() * 60 + now.getMinutes()];
  } else if (record[layer]?.[key]) {
    (record.at || (record.at = {}))[`${layer}:${key}`] = [Math.max(0, Math.round((Date.now() - event.start.getTime()) / 60000)), now.getHours() * 60 + now.getMinutes()];
  }
  if (kind === 'fard') {
    for (const part of prayerParts(key)) {
      if (part.layer === 'fard' || !pend[part.layer]?.[part.slot.key]) continue;
      const target = record[part.layer] || (record[part.layer] = {});
      if (target[part.slot.key]) continue;
      target[part.slot.key] = true;
      noteLate(record, `${part.layer}:${part.slot.key}`, event, true);
    }
  } else if (pend.rakahSets?.[key] && Number(pend.rakahs?.[key]) > 0) {
    record.rakahSets ||= {};
    record.rakahs ||= {};
    record.rakahSets[key] = pend.rakahSets[key];
    record.rakahs[key] = Number(pend.rakahs[key]);
  }
  if (kind === 'voluntary' && key === 'qiyam' && newlyTicked) {
    // v3.0.5: Qiyam rak‘ahs recorded from Tahajjud start until Fajr are Tahajjud; before it, Qiyam "other" only.
    const night = nightTimes(eventDate);
    record.qiyamPart = night && inTahajjudTime(now.getTime(), night.tahajjudStart, night.fajr) ? 'tahajjud' : 'other';
  }
  (record.closed ||= {})[`${kind}:${key}`] = true;
  clearPendingEvent(kind, key, eventDate);
  save();
  savePending();
  const after = dayLayers(eventDate);
  playLayerSound(layerOf(kind, key), true, before, after);
  noteRecognition(before, after, [kind === 'voluntary' ? 'voluntary' : layerOf(kind, key)]);
  render();
  const { summary } = after;
  if (summary.great) showToast('Great Job!');
  else if (summary.good) showToast('Good Job!');
  else showToast('Prayer marked complete');
}

/* Gregorian and Hijri date inside the Local time card. The two Intl formatters are built once per
   language and the text is only rewritten when the day (or language) changes, so the 1 s tick stays cheap. */
let clockDateStamp = '';
function paintClockDate(now, force = false) {
  const hijriDay = islamicCalendarDateAt(now);
  const stamp = `${lang()}|${dateKey(now)}|${dateKey(hijriDay)}|${hijriShift()}|${ephemerisReady()}|${state.lat}|${state.lon}`;
  if (!force && stamp === clockDateStamp) return;
  clockDateStamp = stamp;
  $('dateLabel').textContent = dayName(now);
  const bn = lang() === 'bn';
  const parts = hijriParts(hijriDay);
  const hijri = parts ? hijriDateText(parts, bn) : '—';
  $('hijriDateLabel').textContent = bn ? hijri.replace(/\s*যুগ$/, ' হিজরি') : hijri;
  const source = $('hijriSourceLabel');
  if (source) {
    const crescent = hijriByCrescent(hijriDay);
    source.hidden = !crescent;
    source.textContent = crescent ? HIJRI_SOURCE_LABEL[bn ? 'bn' : 'en'] : '';
  }
  paintClockTicks();
}

function updateClock() {
  const now = new Date();
  $('liveClock').textContent = formatClock(new Date(), { lang: lang(), clock: state.clock, seconds: true });
  paintClockDate(now);
  paintAnalogClock(now);
  updateSky();
}

/* Smooth sweep: the analog hands are repainted every animation frame (three transform writes), so the second hand glides. */
let analogSweep = 0;
function ensureAnalogSweep() {
  if (analogSweep) return;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  const step = () => { analogSweep = requestAnimationFrame(step); if (!document.hidden) paintAnalogClock(new Date()); };
  analogSweep = requestAnimationFrame(step);
}

function paintAnalogClock(now = new Date()) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  $('clockHour')?.setAttribute('transform', `rotate(${hourAngle.toFixed(2)} 100 100)`);
  $('clockMinute')?.setAttribute('transform', `rotate(${minuteAngle.toFixed(2)} 100 100)`);
  $('clockSecond')?.setAttribute('transform', `rotate(${secondAngle.toFixed(2)} 100 100)`);
}

/* Swiss dial (src/clock-dial.js): static artwork is rebuilt only when the language changes; the date window is a text node. */
let clockArtLang = '';
let clockNumeralKey = '';
let clockMeasure = null;
/* Optical placement of the 6 and 9: measure each glyph's real ink with the font actually in use and put it the same clear
   distance from its baton, centred on the hour axis (so a tall 6 and a narrow 9 look equally spaced; English and Bangla digits). */
function placeClockNumerals() {
  const nodes = document.querySelectorAll('#clockDial .ck-num');
  if (!nodes.length) return;
  const style = getComputedStyle(nodes[0]);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const key = `${lang()}|${font}`;
  if (key === clockNumeralKey) return;
  clockMeasure ||= document.createElement('canvas').getContext('2d');
  if (!clockMeasure) return;
  clockMeasure.font = font;
  clockMeasure.textAlign = 'center';
  clockMeasure.textBaseline = 'alphabetic';
  for (const node of nodes) {
    const m = clockMeasure.measureText(node.textContent);
    const ink = { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, top: -m.actualBoundingBoxAscent, bottom: m.actualBoundingBoxDescent };
    const at = placeNumeral(Number(node.dataset.hour), ink);
    node.setAttribute('x', at.x.toFixed(2));
    node.setAttribute('y', at.y.toFixed(2));
  }
  clockNumeralKey = key;
}
if (document.fonts?.ready) document.fonts.ready.then(() => { clockNumeralKey = ''; placeClockNumerals(); });
function paintClockTicks() {
  if ($('clockDial') && clockArtLang !== lang()) {
    clockArtLang = lang();
    $('clockDefs').innerHTML = clockDefs();
    $('clockDial').innerHTML = clockDialMarkup(lang());
    const hands = clockHandsMarkup();
    $('clockHour').innerHTML = hands.hour;
    $('clockMinute').innerHTML = hands.minute;
    $('clockSecond').innerHTML = hands.second;
    $('clockCap').innerHTML = clockCapMarkup();
    $('clockGlass').innerHTML = clockGlassMarkup();
    clockNumeralKey = '';
  }
  placeClockNumerals();
  const win = $('clockDateWin');
  if (win) win.textContent = clockDigits(new Date().getDate(), lang());
}
function paintClockNumerals() { paintClockTicks(); }

/* Sky panel under the header/clock: the sun crosses a dashed arc from sunrise to sunset, the moon from
   moonrise to moonset in its current phase (faint while the sun is up); sky colour, stars and clouds follow the
   sun's altitude. Offline maths (src/sky.js) from the saved latitude/longitude; redrawn only when the minute
   changes or the panel is resized. Twinkle and drift are CSS (transform/opacity only). */
let lastSkyKey = '';
let skyGeom = null;
const PHASE_NAMES = {
  new: ['New moon', 'অমাবস্যা'], full: ['Full moon', 'পূর্ণিমা'],
  'first-quarter': ['First quarter', 'প্রথম অর্ধচন্দ্র'], 'last-quarter': ['Last quarter', 'শেষ অর্ধচন্দ্র'],
  'waxing-crescent': ['Waxing crescent', 'বর্ধমান সরু চাঁদ'], 'waxing-gibbous': ['Waxing gibbous', 'বর্ধমান, প্রায় পূর্ণ'],
  'waning-gibbous': ['Waning gibbous', 'ক্ষীয়মাণ, প্রায় পূর্ণ'], 'waning-crescent': ['Waning crescent', 'ক্ষীয়মাণ সরু চাঁদ']
};
const avDial = new DialPhysics();
avDial.angle = state.astro.angle;
avDial.target = state.astro.angle;
const glideSky = createGlide();
let skyMotion = 0;
let skyMotionAt = 0;
let skyPlaced = false;
let avArtKey = '';
let avStarList = [];
let avDetailed = false;
let avMirrored = false;
let avMoonRadiusKey = '';
const avEl = id => document.getElementById(id);
const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Static artwork (case, plate, rete, sun, rule) is rebuilt only when the language or latitude changes. All of it is
   English or Bangla (src/astrolabe-view.js); there is no other script anywhere on the instrument. */
function buildAstrolabeArt(now) {
  const key = `${lang()}|${state.lat}`;
  if (avArtKey === key) return;
  avArtKey = key;
  avMoonRadiusKey = '';
  avEl('avDefs').innerHTML = defsMarkup();
  avEl('skyMater').innerHTML = materMarkup(lang());
  avEl('skyPlate').innerHTML = plateMarkup(state.lat, lang());
  avEl('skyReteBody').innerHTML = reteMarkup(lang());
  avEl('skyRule').innerHTML = ruleMarkup();
  avEl('skySun').innerHTML = sunMarkup();
  avEl('avPivot').innerHTML = pivotMarkup();
  avEl('avOverlay').innerHTML = overlayMarkup();
  avEl('avDetailFixed').innerHTML = detailMarkup(state.lat, lang());
  avEl('skyReteDetail').innerHTML = reteDetailMarkup();
  avEl('avStarLabels').innerHTML = starLabelsMarkup(lang());
  avStarList = starLabelList(lang());
  applyAstroMirror();
  void now;
}

function rotateAstrolabeRete(now) {
  const rete = avEl('skyRete');
  if (!rete) return;
  rete.setAttribute('transform', `rotate(${localSiderealDegrees(now, state.lon).toFixed(3)} ${AV.cx} ${AV.cy})`);
}

/* The whole instrument turns as one piece under the user's hand; the sky inside it keeps its true positions. */
function applyAstrolabeAngle() {
  const body = avEl('avBody');
  if (body) body.setAttribute('transform', `rotate(${avDial.angle.toFixed(3)} ${AV.cx} ${AV.cy})`);
  const stage = avEl('astroStage');
  if (stage) stage.dataset.angle = avDial.angle.toFixed(2);
  placeStarLabels();
}

/* ---- v2.1.1: coin flip, saved orientation, enlarged detail ---------------------------------------------------------
   Flipping shows the instrument from the other side: its whole drawing is mirrored left to right (the printed words and
   numbers are turned back so they still read normally) and the drag direction follows the hand. Rotation and flip are
   independent and both are saved. */
const FLIP_MIRROR = `translate(${AV.size} 0) scale(-1 1)`;
function applyAstroMirror() {
  const mirror = avEl('avMirror');
  if (!mirror) return;
  avMirrored = state.astro.flipped;
  if (avMirrored) mirror.setAttribute('transform', FLIP_MIRROR); else mirror.removeAttribute('transform');
  // text is turned back about its own anchor so it never reads backwards
  for (const text of avEl('avBody').querySelectorAll('text:not(.av-star-label)')) {
    if (text.dataset.t0 === undefined) text.dataset.t0 = text.getAttribute('transform') || '';
    const x = text.getAttribute('x'), y = text.getAttribute('y');
    const base = text.dataset.t0;
    if (avMirrored) text.setAttribute('transform', `${base} translate(${x} ${y}) scale(-1 1) translate(${-x} ${-y})`.trim());
    else if (base) text.setAttribute('transform', base); else text.removeAttribute('transform');
  }
  const stage = avEl('astroStage');
  if (stage) { stage.dataset.flipped = avMirrored ? '1' : '0'; stage.classList.toggle('is-flipped', avMirrored); }
  const btn = avEl('astroFlipBtn');
  if (btn) btn.setAttribute('aria-pressed', String(avMirrored));
  updateAstroToolLabels();
  placeStarLabels();
}

/* Named star pointers (large sizes only): kept upright on screen whatever the turn of the instrument or the flip. */
function placeStarLabels() {
  if (!avDetailed) return;
  const group = avEl('avStarLabels');
  if (!group || !avStarList.length) return;
  const rete = localSiderealDegrees(new Date(), state.lon) * Math.PI / 180;
  const sin = Math.sin(rete), cos = Math.cos(rete);
  const up = -avDial.angle;
  for (const text of group.children) {
    const star = avStarList.find(item => item.name === text.dataset.star);
    if (!star) continue;
    const dx = star.x - AV.cx, dy = star.y - AV.cy;
    const x = AV.cx + dx * cos - dy * sin, y = AV.cy + dx * sin + dy * cos;
    text.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${up.toFixed(2)})${avMirrored ? ' scale(-1 1)' : ''} translate(3.4 -3)`);
  }
}

let astroSaveHandle = 0;
function persistAstro() {
  window.clearTimeout(astroSaveHandle);
  astroSaveHandle = window.setTimeout(() => {
    state.astro = { angle: Number((((avDial.angle + 180) % 360 + 360) % 360 - 180).toFixed(2)), flipped: state.astro.flipped };
    save();
  }, 350);
}

/* (v2.2.0) Rotation is locked until the user turns on "Rotate astrolabe". The on/off state is never saved (it always starts off);
   the angle itself is saved as before. */
let avRotateOn = false;
function setAstroRotate(on) {
  avRotateOn = !!on;
  const stage = avEl('astroStage');
  if (stage) { stage.classList.toggle('rotate-on', avRotateOn); stage.dataset.rotate = avRotateOn ? '1' : '0'; }
  const btn = avEl('astroRotateBtn');
  if (btn) btn.setAttribute('aria-pressed', String(avRotateOn));
  updateAstroToolLabels();
}

/* (v2.3.0) Tooltip and aria-label of Rotate and Flip, in the chosen language and with the on/off state. The English text is also stored as the
   "original" the generic translator works from, so a language switch (or the expanded page re-translating the DOM) can never bring English back. */
function updateAstroToolLabels() {
  const bn = lang() === 'bn';
  const set = (id, en) => {
    const el = avEl(id);
    if (!el) return;
    const text = bn ? (BN_TEXT[en] || en) : en;
    el.dataset.originalTitle = en; el.dataset.originalAriaLabel = en;
    el.title = text; el.setAttribute('aria-label', text);
  };
  set('astroRotateBtn', avRotateOn ? 'Rotate the astrolabe: on (click to turn off)' : 'Rotate the astrolabe: off (click to turn on)');
  set('astroFlipBtn', avMirrored ? 'Flip the astrolabe (flipped)' : 'Flip the astrolabe (not flipped)');
}

let flipBusy = false;
function flipAstrolabe() {
  if (flipBusy) return;
  state.astro = { angle: state.astro.angle, flipped: !state.astro.flipped };
  const flip = avEl('astroFlip');
  const finish = () => { applyAstroMirror(); persistAstro(); };
  if (prefersReducedMotion() || typeof flip?.animate !== 'function') { finish(); return; }
  flipBusy = true;
  const stage = avEl('astroStage');
  stage.classList.add('is-flipping');
  // A coin toss: it lifts, turns edge-on (the view swaps there), and settles face-up from the other side.
  const half = flip.animate([
    { transform: 'perspective(900px) translateY(0) rotateY(0deg) scale(1)' },
    { transform: 'perspective(900px) translateY(-6%) rotateY(90deg) scale(1.04)' }
  ], { duration: 260, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
  half.onfinish = () => {
    finish();
    const rest = flip.animate([
      { transform: 'perspective(900px) translateY(-6%) rotateY(-90deg) scale(1.04)' },
      { transform: 'perspective(900px) translateY(0) rotateY(0deg) scale(1)' }
    ], { duration: 300, easing: 'cubic-bezier(.1,.5,.3,1)' });
    rest.onfinish = rest.oncancel = () => { half.cancel(); stage.classList.remove('is-flipping'); flipBusy = false; };
  };
}

/* (v2.2.0) Crispness. The drawing is pure SVG, so it is sharp at any scale as long as (a) no pinned GPU layer keeps an old raster scale,
   (b) hairlines are not thinner than a device pixel (the 0.3-0.9 unit rules of the plate and rete came out at 0.2-0.5 px on screen and were
   anti-aliased into faint grey smears, unlike the clock whose rules are a pixel or more), and (c) the smallest printed text is not
   smaller than about 6.4 CSS px. Re-run whenever the instrument changes size, the art is rebuilt, or the display scaling changes. */
let avSharpKey = '';
function sharpenAstrolabe(force = false) {
  const stage = avEl('astroStage'), svg = avEl('skySvg');
  if (!stage || !svg) return;
  const dpr = window.devicePixelRatio || 1;
  const css = stage.offsetWidth * (parseFloat(document.querySelector('.app-shell')?.style.zoom) || 1);
  if (!css) return;
  const key = `${Math.round(css)}|${dpr}|${avArtKey}`;
  if (!force && key === avSharpKey) return;
  avSharpKey = key;
  const devicePerUnit = css * dpr / AV.size;
  const floor = 0.8 / devicePerUnit;                       // 0.8 device px, in drawing units
  for (const el of svg.querySelectorAll('[stroke-width]')) {
    if (el.dataset.sw0 === undefined) el.dataset.sw0 = el.getAttribute('stroke-width');
    const base = parseFloat(el.dataset.sw0);
    if (!(base > 0)) continue;
    el.setAttribute('stroke-width', Math.min(Math.max(base, floor), base * 2.5).toFixed(3));
  }
  const factor = Math.max(1, Math.min(1.4, 6.4 / (4.3 * css / AV.size)));   // smallest text (4.3 units) reaches about 6.4 CSS px
  stage.style.setProperty('--av-tf', factor.toFixed(3));
}
if (typeof matchMedia === 'function') {
  const watchScale = () => { const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); mq.addEventListener?.('change', () => { sharpenAstrolabe(true); watchScale(); }, { once: true }); };
  watchScale();
}

function updateAstroDetail() {
  const stage = avEl('astroStage');
  if (!stage) return;
  sharpenAstrolabe();
  const size = stage.offsetWidth * (parseFloat(document.querySelector('.app-shell')?.style.zoom) || 1); // layout size: unaffected by the move animation
  const on = size >= 330;
  if (on === avDetailed && stage.classList.contains('is-detailed') === on) return;
  avDetailed = on;
  stage.classList.toggle('is-detailed', on);
  placeStarLabels();
}

function ensureSkyGlide() {
  if (skyMotion) return;
  const step = stamp => {
    skyMotion = requestAnimationFrame(step);
    const dt = skyMotionAt ? Math.min(0.05, (stamp - skyMotionAt) / 1000) : 0;
    skyMotionAt = stamp;
    if (!dt) return;
    if (avDial.moving) { avDial.step(dt); applyAstrolabeAngle(); if (!avDial.moving) persistAstro(); }
    const panel = $('skyPanel');
    if (!panel || panel.hidden || !hasLocation() || !skyGeom) return;
    placeSkyBodies(new Date(), dt);
  };
  skyMotion = requestAnimationFrame(step);
}

/* Mouse interaction: a vault-lock dial. 1:1 with the hand while held (grab near the rim for the finest control,
   Shift/Alt/right button for fine mode), momentum on release, wheel and arrow keys for small glides, double-click to reset. */
function initAstrolabeDial() {
  const stage = avEl('astroStage');
  if (!stage || stage.dataset.dialReady) return;
  stage.dataset.dialReady = '1';
  const svg = avEl('skySvg');
  // Screen angle of the pointer. When flipped, the drawing is mirrored, so the hand's turn is read the other way round.
  const angleOf = event => {
    const r = svg.getBoundingClientRect();
    const dx = event.clientX - (r.left + r.width / 2), dy = event.clientY - (r.top + r.height / 2);
    return { angle: (avMirrored ? -1 : 1) * Math.atan2(dx, -dy) * 180 / Math.PI, radius: Math.hypot(dx, dy) / (r.width / 2) };
  };
  let active = null;
  let press = null;       // where and when the current press began, to tell a click from a drag
  let openTimer = 0;
  const isButton = event => !!event.target.closest?.('.astro-tools');
  stage.addEventListener('pointerdown', event => {
    if (isButton(event)) return;
    if (event.pointerType === 'mouse' && event.button > 2) return;
    press = { x: event.clientX, y: event.clientY, moved: false };
    if (!avRotateOn) return; // locked: dragging does nothing until Rotate is switched on
    const a = angleOf(event);
    if (a.radius < 0.06 || a.radius > 1.04) return;
    active = event.pointerId;
    stage.setPointerCapture?.(event.pointerId);
    stage.classList.add('is-turning');
    avDial.grab(a.angle, event.timeStamp);
    event.preventDefault();
  });
  stage.addEventListener('pointermove', event => {
    if (press && !press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.moved = true;
    if (active !== event.pointerId) return;
    const a = angleOf(event);
    if (a.radius < 0.06) return;
    avDial.drag(a.angle, event.timeStamp, event.shiftKey || event.altKey || (event.buttons & 2) === 2);
    applyAstrolabeAngle();
  });
  const end = event => {
    if (active !== event.pointerId) return;
    active = null;
    stage.classList.remove('is-turning');
    if (prefersReducedMotion()) avDial.velocity = 0;
    avDial.release(event.timeStamp);
    if (!avDial.moving) persistAstro();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('contextmenu', event => event.preventDefault());
  // A plain click (no drag) opens the astrolabe page. It waits a moment so a double-click (reset) is not mistaken for it.
  stage.addEventListener('click', event => {
    if (isButton(event) || event.button > 0) return;
    if (press?.moved) { press = null; return; }
    press = null;
    if (currentPage === 'astro' || avRotateOn) return;
    window.clearTimeout(openTimer);
    openTimer = window.setTimeout(openAstroView, 260);
  });
  stage.addEventListener('dblclick', event => {
    if (isButton(event)) return;
    window.clearTimeout(openTimer);
    if (avRotateOn) avDial.reset();
  });
  stage.addEventListener('wheel', event => {
    if (!avRotateOn) return; // locked: the wheel scrolls the page as usual
    event.preventDefault();
    const delta = Math.max(-100, Math.min(100, event.deltaY || event.deltaX));
    avDial.nudge(delta * (event.shiftKey ? 0.05 : 0.005) * (avMirrored ? -1 : 1));
  }, { passive: false });
  stage.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    const step = (event.shiftKey ? 5 : 0.5) * (avMirrored ? -1 : 1);
    if (!avRotateOn && event.key !== 'Enter') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') avDial.nudge(-step);
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') avDial.nudge(step);
    else if (event.key === 'Home' || event.key === '0') avDial.reset();
    else if (event.key === 'Enter' && currentPage !== 'astro') openAstroView();
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
  const rotateBtn = avEl('astroRotateBtn');
  if (rotateBtn) {
    rotateBtn.addEventListener('pointerdown', event => event.stopPropagation());
    rotateBtn.addEventListener('click', event => { event.stopPropagation(); setAstroRotate(!avRotateOn); });
    rotateBtn.addEventListener('dblclick', event => event.stopPropagation());
  }
  const flipBtn = avEl('astroFlipBtn');
  if (flipBtn) {
    flipBtn.addEventListener('pointerdown', event => event.stopPropagation());
    flipBtn.addEventListener('click', event => { event.stopPropagation(); flipAstrolabe(); });
    flipBtn.addEventListener('dblclick', event => event.stopPropagation());
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => updateAstroDetail()).observe(stage);
  updateAstroDetail();
  ensureSkyGlide();
}

function updateSky(force = false) {
  const panel = $('skyPanel');
  if (!panel) return;
  if (!hasLocation()) { panel.hidden = true; return; }
  panel.hidden = false;
  const now = new Date();
  const key = `${Math.floor(now.getTime() / 60000)}|${lang()}|${state.clock}|${state.lat}|${state.lon}|${state.adjustments.sunrise}`;
  if (!force && key === lastSkyKey) return;
  lastSkyKey = key;
  const bn = lang() === 'bn';
  const times = getTimes(startOfDay(now));
  const sun = sunPosition(now, state.lat, state.lon);
  const phase = moonPhase(now);
  const pass = moonPass(now, state.lat, state.lon);
  const priorMoon = moonPass(new Date(now.getTime() - 24 * 3600000), state.lat, state.lon);
  const okTimes = !!times && Number.isFinite(times.sunrise?.getTime()) && Number.isFinite(times.sunset?.getTime()) && times.sunset > times.sunrise;
  panel.dataset.mode = sun.altitude > -0.833 ? 'day' : 'night';
  buildAstrolabeArt(now);
  sharpenAstrolabe();
  rotateAstrolabeRete(now);
  initAstrolabeDial();

  const intervals = okTimes ? prohibitedIntervals(times) : [];
  const footer = $('skyObservatoryFooter');
  footer.innerHTML = intervals.map(item => {
    const label = PROHIBITED_LABELS[item.key][bn ? 'bn' : 'en'];
    const active = now >= item.start && now < item.end;
    return `<span class="sky-zone-chip${active ? ' is-active' : ''}"><i></i><b>${escapeHtml(label)}</b><small>${escapeHtml(fmt(item.start))}–${escapeHtml(fmt(item.end))}</small></span>`;
  }).join('');
  const percent = Math.round(phase.illumination * 100);
  const phaseText = PHASE_NAMES[phaseName(phase)][bn ? 1 : 0];
  const moon = moonPosition(now, state.lat, state.lon);
  const noon = okTimes && times.solarNoon ? fmt(times.solarNoon) : '';
  $('skyHeading').textContent = bn ? 'আসট্রোলেব' : 'ASTROLABE';
  $('skyPosition').textContent = bn
    ? `সূর্য ${localizeDigits(Math.round(sun.altitude))}° · দিগন্ত ${localizeDigits(Math.round(sun.azimuth))}° · চাঁদ ${localizeDigits(Math.round(moon.altitude))}° · ${localizeDigits(percent)}% · ${phaseText}${noon ? ` · মধ্যাহ্ন ${noon}` : ''}`
    : `SUN ${Math.round(sun.altitude)}° · AZ ${Math.round(sun.azimuth)}° · MOON ${Math.round(moon.altitude)}° · ${percent}% · ${phaseText.toUpperCase()}${noon ? ` · NOON ${noon}` : ''}`;
  const parts = [
    bn ? 'আসট্রোলেব' : 'Astrolabe',
    bn ? `সূর্যের উচ্চতা ${localizeDigits(Math.round(sun.altitude))}° দিগন্ত ${localizeDigits(Math.round(sun.azimuth))}°` : `Sun altitude ${Math.round(sun.altitude)}° azimuth ${Math.round(sun.azimuth)}°`,
    bn ? `চাঁদ ${localizeDigits(percent)}% আলোকিত, ${phaseText}` : `Moon ${percent}% lit, ${phaseText}`
  ];
  if (okTimes) parts.push(`${bn ? 'সূর্যোদয়' : 'Sunrise'} ${fmt(times.sunrise)}`, `${bn ? 'সূর্যাস্ত' : 'Sunset'} ${fmt(times.sunset)}`);
  if (pass.rise && pass.set) parts.push(`${bn ? 'চাঁদ ওঠে' : 'Moonrise'} ${fmt(pass.rise)}`, `${bn ? 'চাঁদ ডোবে' : 'Moonset'} ${fmt(pass.set)}`);
  if (priorMoon?.set && moon.altitude < 0) parts.push(bn ? 'চাঁদ দিগন্তের নিচে' : 'Moon below the horizon');
  updateAstroToolLabels();
  avEl('astroStage').setAttribute('aria-label', bn ? 'আসট্রোলেব: ঘোরাতে টানুন, সূক্ষ্ম সমন্বয়ে শিফট ধরুন, তীর কী ও মাউস হুইলে অল্প ঘোরান, ডাবল-ক্লিকে রিসেট, ক্লিক করে বড় করুন' : 'Astrolabe: drag to rotate, hold Shift for fine adjustment, arrow keys and mouse wheel for small steps, double-click to reset, click to open the large page');
  panel.setAttribute('aria-label', parts.join(' · '));
  panel.title = parts.join(' · ');
  skyGeom = { cx: AV.cx, cy: AV.cy, plateR: AV.plateR, times, okTimes, pass, priorMoon, phase, lat: state.lat, lang: lang(), day: dateKey(now) };
  if (!skyPlaced) { placeSkyBodies(now, 0); skyPlaced = true; }
  applyAstrolabeAngle();
  sharpenAstrolabe(true); // the sun, moon and trails are redrawn here: give them the same hairline floor
  ensureSkyGlide();
}

/* Sun, moon, rule and trails at their calculated places. The sun and moon are drawn at their true apparent size ratio;
   the moon is turned so its lit side faces the sun; the sun's rays turn with the sidereal angle. */
function placeSkyBodies(now = new Date(), dt = 0) {
  const g = skyGeom;
  const panel = $('skyPanel');
  if (!g || !panel) return;
  const reduced = prefersReducedMotion();
  const sun = sunPosition(now, state.lat, state.lon);
  const moon = moonPosition(now, state.lat, state.lon);
  const sunPos = glideSky('sun', platePoint(sun.declination, sun.hourAngle, g.cx, g.cy, g.plateR), dt, { reduced });
  const moonPos = glideSky('moon', platePoint(moon.declination, moon.hourAngle, g.cx, g.cy, g.plateR), dt, { reduced });
  const radii = bodyRadii(now, g.plateR);
  const sunEl = avEl('skySun');
  const moonEl = avEl('skyMoon');
  rotateAstrolabeRete(now);
  const rule = avEl('skyRule');
  if (rule) rule.setAttribute('transform', `rotate(${(((sun.hourAngle + 180) % 360) - 180).toFixed(3)} ${g.cx} ${g.cy})`);
  if (sunEl) {
    sunEl.setAttribute('transform', `translate(${sunPos.x.toFixed(2)} ${sunPos.y.toFixed(2)}) scale(${(radii.sun / 10.7).toFixed(3)})`);
    const rays = sunEl.querySelector('.av-sun-rays');
    if (rays) rays.setAttribute('transform', `rotate(${localSiderealDegrees(now, state.lon).toFixed(2)})`);
  }
  if (moonEl) {
    const radiusKey = radii.moon.toFixed(1);
    if (avMoonRadiusKey !== radiusKey) { avMoonRadiusKey = radiusKey; moonEl.innerHTML = moonMarkup(radii.moon); }
    const toSun = Math.atan2(sunPos.y - moonPos.y, sunPos.x - moonPos.x) * 180 / Math.PI;
    moonEl.setAttribute('transform', `translate(${moonPos.x.toFixed(2)} ${moonPos.y.toFixed(2)})`);
    const turn = moonEl.querySelector('.av-moon-turn');
    if (turn) turn.setAttribute('transform', `rotate(${toSun.toFixed(2)})`);
    moonEl.style.opacity = moon.altitude < -6 ? '0.8' : '1';
    moonEl.classList.toggle('is-below', moon.altitude < 0);
    const phase = g.phase || moonPhase(now);
    avEl('avMoonClipPath')?.setAttribute('d', moonLitPath(phase.illumination, true, 0, 0, radii.moon, false));
  }
  const trails = avEl('avTrails');
  const stamp = Math.floor(now.getTime() / 20000);
  if (trails && trails.dataset.stamp !== `${stamp}|${avArtKey}`) {
    trails.dataset.stamp = `${stamp}|${avArtKey}`;
    const arc = (dec, ha, span, cls, width) => {
      const r = plateRadiusOf(dec) * g.plateR;
      const a0 = platePoint(dec, ha - span, g.cx, g.cy, g.plateR), a1 = platePoint(dec, ha, g.cx, g.cy, g.plateR);
      return `<circle cx="${g.cx}" cy="${g.cy}" r="${r.toFixed(2)}" class="${cls}-day" stroke-dasharray="1 3.4"/><path d="M${a0.x.toFixed(2)} ${a0.y.toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${a1.x.toFixed(2)} ${a1.y.toFixed(2)}" class="${cls}-trail" stroke-width="${width}" stroke-linecap="round"/>`;
    };
    trails.innerHTML = arc(sun.declination, sun.hourAngle, 75, 'av-sun', 2) + arc(moon.declination, moon.hourAngle, 45, 'av-moon', 1.6);
  }
  panel.style.setProperty('--sky-i', sunIntensity(sun.altitude, 90 - Math.abs(state.lat - sun.declination)).toFixed(3));
  panel.dataset.mode = sun.altitude > -0.833 ? 'day' : 'night';
}

function fardDisplayName(event) {
  return slotName(event.key, event.date);
}

/* Tray tooltip: next obligatory prayer and time left. Updated from render()
   and the 15-second tick (which keeps running while hidden to the tray); the
   tray API is only called when the text actually changes (about once a minute). */
let trayIcon = null;
let trayLookup = null;
let lastTrayTooltip = '';
function getTray() {
  if (trayIcon) return Promise.resolve(trayIcon);
  if (!window.__TAURI_INTERNALS__) return Promise.resolve(null);
  if (!trayLookup) {
    trayLookup = TrayIcon.getById('main')
      .then(icon => { trayIcon = icon; return icon; })
      .catch(() => null)
      .finally(() => { trayLookup = null; });
  }
  return trayLookup;
}

function updateTrayTooltip(now = new Date()) {
  let payload = { lang: lang() };
  if (hasLocation()) {
    const available = getActiveEvents(now).map(event => ({
      name: event.kind === 'fard' ? fardDisplayName(event) : prayerName(event.key),
      msLeft: event.end.getTime() - now.getTime(),
      kind: event.kind
    })).sort((a, b) => (a.kind === 'fard' ? 0 : 1) - (b.kind === 'fard' ? 0 : 1));
    const next = getNextPrayer(now);
    payload = { lang: lang(), available, next: next ? { name: fardDisplayName(next), ms: next.start.getTime() - now.getTime() } : null };
  }
  const text = trayTooltipText(payload);
  if (text === lastTrayTooltip) return;
  lastTrayTooltip = text;
  getTray()
    .then(icon => icon?.setTooltip(text))
    .catch(() => { lastTrayTooltip = ''; });
}

/* Windows toasts (v1.3.3). Root cause of "no notifications on Windows 10": the notification plugin tags toasts with
   the app identifier and ignores the result, and Windows 10 silently drops a toast whose AppUserModelID is not
   registered by a Start Menu shortcut (portable EXE, installer run with /NS, shortcut removed). The native command
   `notify_native` (src-tauri/src/main.rs) toasts with the app's identity when that shortcut exists, otherwise with the
   always-registered PowerShell identity, and returns the real error. The plugin remains the fallback when the command
   does not exist (older shell, browser preview). Resolves to { ok, how, error }. */
function playNotificationSound() {
  if (state.sound) playCues([{ type: 'notify' }], state.tickStyle, window); // v1.3.4: louder, stronger version of the tick
}

async function deliverNotification(title, body) {
  try {
    const how = await invoke('notify_native', { title, body });
    playNotificationSound();
    return { ok: true, how: typeof how === 'string' ? how : '' };
  } catch (error) {
    const message = String((error && error.message) || error || '');
    if (!/not found|unknown command|not allowed/i.test(message)) return { ok: false, error: message };
  }
  try {
    // sendNotification() from the plugin returns nothing (not a Promise); tolerate both forms.
    const result = sendNotification({ title, body });
    if (result && typeof result.then === 'function') await result;
    playNotificationSound();
    return { ok: true, how: 'plugin' };
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error || '') };
  }
}

function sendReminder(id, title, body) {
  const forget = () => { delete state.reminderSent[id]; save(); };
  deliverNotification(title, body).then(result => { if (!result.ok) forget(); }, forget);
}

async function sendTestNotification() {
  const status = $('notificationStatus');
  const bn = lang() === 'bn';
  const say = message => { status.textContent = message; };
  say(bn ? 'পাঠানো হচ্ছে…' : 'Sending…');
  try {
    if (!(await isPermissionGranted())) await requestPermission();
  } catch { /* desktop always grants; ignore */ }
  const result = await deliverNotification(bn ? 'প্রার্থনার সময়' : 'Prayer Times', bn ? 'এটি একটি পরীক্ষামূলক বিজ্ঞপ্তি।' : 'This is a test notification. Prayer reminders will look like this.');
  let details = [];
  try { const lines = await invoke('notification_diagnostics'); if (Array.isArray(lines)) details = lines; } catch { /* browser preview */ }
  if (result.ok) say(`${bn ? 'পাঠানো হয়েছে। দেখতে না পেলে উইন্ডোজ সেটিংসে Notifications ও Focus assist (Do not disturb) পরীক্ষা করুন।' : 'Sent. If you do not see it, check Windows Settings > System > Notifications and Focus assist (Do not disturb).'}${details.length ? `\n${details.join('\n')}` : ''}`);
  else say(`${bn ? 'পাঠানো যায়নি: ' : 'Could not send: '}${result.error || ''}${details.length ? `\n${details.join('\n')}` : ''}`);
}

function checkNotifications() {
  if (!state.notifications || !liveTimes || !hasLocation()) return;
  const now = Date.now();
  const today = startOfDay(new Date());
  const dates = [addDays(today, -1), today, addDays(today, 1)];
  const events = [];
  for (const date of dates) {
    const times = getTimes(date);
    const nextTimes = getTimes(addDays(date, 1));
    if (!times || !nextTimes) continue;
    events.push(...getFardEvents(date, times, nextTimes));
    events.push(...getVoluntaryEvents(date, times, nextTimes));
  }
  for (const event of events) {
    const leadMinutes = Number(state.reminders[event.key] || 0);
    if (!leadMinutes) continue;
    const record = dayRecord(event.date, false);
    if (record[event.kind]?.[event.key]) continue;
    const id = `${dateKey(event.date)}:${event.key}`;
    const fireAt = event.end.getTime() - leadMinutes * 60000;
    // Never notify before a short event has actually begun.
    if (fireAt < event.start.getTime()) continue;
    // A short grace window prevents missed reminders after a brief sleep/wake or app resume.
    // The grace window covers sleep/wake, app resume and the roughly once-a-minute
    // timer throttling of a window hidden to the tray (see reminder-schedule.js).
    if (isReminderDue(now, fireAt, event.end.getTime()) && !state.reminderSent[id]) {
      state.reminderSent[id] = Date.now();
      const title = lang() === 'bn' ? `${prayerName(event.key)}-এর সময় শেষ হচ্ছে` : `${prayerName(event.key)} period is ending`;
      const body = lang() === 'bn'
        ? `আর ${localizeDigits(leadMinutes)} মিনিট বাকি। ${prayerName(event.key)} সম্পন্ন করুন।`
        : `${leadMinutes} minutes remain before the ${prayerName(event.key)} period ends.`;
      sendReminder(id, title, body);
      save();
    }
  }
  // Reminders before a scheduled prayer begins: one per event per day.
  for (const event of events) {
    const minutes = Number(state.preReminders[event.key] || 0);
    if (!minutes) continue;
    const id = `${dateKey(event.date)}:${event.key}:before`;
    const startAt = event.start.getTime();
    const fireAt = preReminderFireAt(event.start, minutes);
    if (!isReminderDue(now, fireAt, startAt) || state.reminderSent[id]) continue;
    state.reminderSent[id] = Date.now();
    const name = event.kind === 'fard' ? fardDisplayName(event) : prayerName(event.key);
    const left = Math.max(1, Math.ceil((startAt - now) / 60000));
    const title = lang() === 'bn' ? `${name} ${localizeDigits(left)} মিনিট পরে` : `${name} in ${left} minute${left === 1 ? '' : 's'}`;
    const body = lang() === 'bn' ? `${name}-এর সময় শুরু হবে ${fmt(event.start)}-এ।` : `${name} begins at ${fmt(event.start)}.`;
    sendReminder(id, title, body);
    save();
  }
  // Preferred-time reminders (two independent kinds). Deduplicated by prayer and day, persisted across restarts.
  for (const due of dueReminders({ now, events, config: state.prefReminders, sent: state.reminderSent, school: state.profile.school, dayKeyOf: dateKey })) {
    state.reminderSent[due.id] = Date.now();
    const bnNow = lang() === 'bn';
    const text = reminderText(due, { bn: bnNow, name: prayerName(due.key), time: fmt, num: localizeDigits });
    sendReminder(due.id, text.title, text.body);
    save();
  }
  pruneSent(state.reminderSent, Date.now());
  const starting = [];
  const ending = [];
  for (const event of events) {
    const day = dateKey(event.date);
    const startId = `edge:${day}:${event.key}:start`;
    const endId = `edge:${day}:${event.key}:end`;
    if (isReminderDue(now, event.start.getTime(), event.start.getTime() + 120000) && !state.reminderSent[startId]) starting.push(event);
    if (isReminderDue(now, event.end.getTime(), event.end.getTime() + 120000) && !state.reminderSent[endId]) ending.push(event);
  }
  if (starting.length || ending.length) {
    for (const event of starting) state.reminderSent[`edge:${dateKey(event.date)}:${event.key}:start`] = Date.now();
    for (const event of ending) state.reminderSent[`edge:${dateKey(event.date)}:${event.key}:end`] = Date.now();
    const bn = lang() === 'bn';
    const names = list => list.map(event => prayerName(event.key)).join(', ');
    const next = getNextPrayer(new Date());
    const nextLine = next ? (bn ? `এরপর ${fardDisplayName(next)} ${fmt(next.start)}-এ।` : `Next is ${fardDisplayName(next)} at ${fmt(next.start)}.`) : '';
    const title = bn ? 'নামাজের সময়' : 'Prayer times';
    const body = [
      starting.length ? (bn ? `শুরু: ${names(starting)}` : `Starting: ${names(starting)}`) : '',
      ending.length ? (bn ? `শেষ: ${names(ending)}` : `Ending: ${names(ending)}`) : '',
      nextLine
    ].filter(Boolean).join(' · ');
    sendReminder(`edge:${Date.now()}`, title, body);
    save();
  }
  // Keep the local sent-marker map bounded while retaining recent duplicate protection.
  const cutoff = Date.now() - 10 * 86400000;
  for (const [key, timestamp] of Object.entries(state.reminderSent)) if (timestamp < cutoff) delete state.reminderSent[key];
}

function requestPrayerNotifications(enabled) {
  if (!enabled) {
    state.notifications = false;
    save();
    showToast('Prayer reminders disabled');
    return;
  }
  (async () => {
    try {
      let granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission()) === 'granted';
      if (!granted) throw new Error('Permission not granted');
      state.notifications = true;
      save();
      showToast('Prayer reminders enabled');
    } catch {
      state.notifications = false;
      $('notificationsToggle').checked = false;
      showToast('Windows notification permission was not granted');
    }
  })();
}

function updateCountdownWidgets() {
  const now = new Date();
  document.querySelectorAll('[data-event-countdown]').forEach(button => {
    const start = Number(button.dataset.start), end = Number(button.dataset.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    const t = now.getTime();
    const until = t < start ? start : end;
    const strong = button.querySelector('[data-live-countdown]');
    if (strong) strong.dataset.until = String(until);
    const span = button.querySelector('span');
    if (span && !button.classList.contains('prayer-eta')) span.textContent = t < start ? (lang() === 'bn' ? 'শুরু হতে' : 'OPENS IN') : (lang() === 'bn' ? 'বাকি সময়' : 'TIME LEFT');
    const pref = preferredWindow(button.dataset.key, new Date(start), new Date(end), state.profile.school, { friday: button.dataset.key === 'dhuhr' && new Date(start).getDay() === 5, eid: button.dataset.eid || '' });
    button.classList.toggle('is-best', !!(pref && t >= pref.start.getTime() && t < pref.end.getTime()));
  });
  document.querySelectorAll('[data-live-countdown]').forEach(element => {
    element.textContent = countdown(Number(element.dataset.until) - Date.now());
  });
  document.querySelectorAll('.forbidden-progress').forEach(bar => {
    const start = Number(bar.dataset.start), end = Number(bar.dataset.end);
    const pct = Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(1, end - start)) * 100));
    const fill = bar.firstElementChild;
    if (fill) fill.style.width = `${pct.toFixed(2)}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  });
  updateTopCountdown();
  updateCountdownViewLive(now);
  updateTimeViewLive();
  updateAstroViewLive();
}

function updateTimeViewLive() {
  if (currentPage !== 'time') return;
  const now = new Date();
  const { active, next } = focusPrayer(now);
  const count = $('timeMainCount');
  const paused = activeProhibited(now)[0] || null;
  const until = paused ? paused.end.getTime() : (active ? active.end.getTime() : next?.start?.getTime());
  if (count && Number.isFinite(until)) {
    // The main target changes when a prayer starts or ends: rebuild the page then, otherwise just tick the numbers.
    if (count.dataset.until && Number(count.dataset.until) !== until) { renderTimeView(); return; }
    count.textContent = countdown(until - now.getTime());
  }
  const status = $('clockStatusCount');
  if (status) status.textContent = countdown(Number(status.dataset.timeUntil) - now.getTime());
  paintPreferred(now);
}

/* v3.0.3 Settings › Time adjustments: "Hijri date adjustment" / "হিজরি তারিখ সমন্বয়", -2..+2 days. */
function renderHijriAdjust() {
  const select = $('hijriAdjustSelect');
  if (!select) return;
  const bn = lang() === 'bn';
  const label = $('hijriAdjustLabel');
  if (label) label.textContent = bn ? 'হিজরি তারিখ সমন্বয়' : 'Hijri date adjustment';
  const note = $('hijriAdjustNote');
  if (note) note.textContent = bn
    ? 'স্থানীয় চাঁদ দেখার সঙ্গে মেলাতে অ্যাপের সব হিজরি তারিখ পুরো দিন হিসেবে সরায়। নামাজের সময় বদলায় না।'
    : 'Moves every Hijri date in the app by whole days to match your local moon sighting. Prayer times do not change.';
  const text = n => {
    const d = bn ? localizeDigits(Math.abs(n)) : String(Math.abs(n));
    if (n === 0) return bn ? '০ (হিসাব অনুযায়ী)' : '0 (as calculated)';
    const sign = n < 0 ? '−' : '+';
    return bn ? `${sign}${d} দিন` : `${sign}${d} day${Math.abs(n) === 1 ? '' : 's'}`;
  };
  select.innerHTML = HIJRI_ADJUST_OPTIONS.map(n => `<option value="${n}"${n === sanitizeHijriAdjust(state.hijriAdjust) ? ' selected' : ''}>${escapeHtml(text(n))}</option>`).join('');
  select.value = String(sanitizeHijriAdjust(state.hijriAdjust));
}

function renderAdjustmentControls() {
  const grid = $('adjustmentGrid');
  const fields = [
    ['fajr', 'Fajr'], ['sunrise', 'Sunrise'], ['dhuhr', 'Dhuhr'],
    ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']
  ];
  grid.innerHTML = fields.map(([key, label]) => `<label class="adjustment-item"><span>${label}</span><input id="adjust-${key}" type="number" min="-30" max="30" step="1" value="${Number(state.adjustments[key]) || 0}" aria-label="${label} adjustment in minutes"></label>`).join('');
  for (const [key] of fields) $(`adjust-${key}`).addEventListener('change', event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value < -30 || value > 30) {
      event.target.value = state.adjustments[key];
      showToast('Adjustment must be between −30 and +30 minutes');
      return;
    }
    state.adjustments[key] = value;
    save();
    render();
  });
}

/* Every window start/end around now (yesterday, today, tomorrow), so the view is
   rebuilt the moment a prayer opens or closes (src/prayer-boundary.js). */
let boundaryAt = null;
let boundaryTimer = null;
let lastTickAt = null;
let lastRenderedDay = dateKey(new Date());

function boundaryEvents(now) {
  const today = startOfDay(now);
  const events = [];
  for (const offset of [-1, 0, 1]) {
    const date = addDays(today, offset);
    const times = getTimes(date);
    const nextTimes = getTimes(addDays(date, 1));
    if (!times || !nextTimes) continue;
    const fard = getFardEvents(date, times, nextTimes);
    const voluntary = getVoluntaryEvents(date, times, nextTimes);
    events.push(...fard, ...voluntary, ...prohibitedIntervals(times));
    for (const event of [...fard, ...voluntary]) {
      const pref = preferredWindow(event.key, event.start, event.end, state.profile.school, { friday: event.key === 'dhuhr' && date.getDay() === 5, eid: event.eid || '' });
      if (pref) events.push({ start: pref.start, end: pref.start }, { start: pref.end, end: pref.end });
    }
    if (times.midnight) events.push({ start: times.midnight, end: times.midnight });
    // heads-up moments for the progress line (the 20-45 minute window before each prayer, every 5 minutes; 10 minutes before Duha/Awwabin)
    for (const f of getFardEvents(date, times, nextTimes)) for (let lead = 20; lead <= 45; lead += 5) { const at = addMinutes(f.start, -lead); events.push({ start: at, end: at }); }
    for (const v of getVoluntaryEvents(date, times, nextTimes)) if (v.key === 'duha' || v.key === 'awwabin') { const at = addMinutes(v.start, -VOLUNTARY_HEADS_UP_MINUTES); events.push({ start: at, end: at }); }
  }
  return events;
}

function armBoundary() {
  clearTimeout(boundaryTimer);
  const now = new Date();
  lastRenderedDay = dateKey(now);
  boundaryAt = hasLocation() ? nextBoundary(boundaryEvents(now), now) : null;
  boundaryTimer = setTimeout(refreshIfStale, boundaryDelay(boundaryAt, now.getTime()));
}

/** Rebuild the view when a boundary, a day change, a sleep/wake or a clock jump made it stale. */
function refreshIfStale() {
  const now = Date.now();
  if (needsRefresh({ now, boundaryAt, lastTickAt, todayKey: dateKey(new Date(now)), lastDateKey: lastRenderedDay })) {
    const todayKey = dateKey(new Date(now));
    if (todayKey !== lastScheduleDate) {
      const wasFollowingToday = dateKey(selectedDate) === lastScheduleDate;
      lastScheduleDate = todayKey;
      if (wasFollowingToday) selectedDate = startOfDay(new Date(now));
    }
    lastTickAt = now;
    render();
    checkNotifications();
  } else {
    lastTickAt = now;
    clearTimeout(boundaryTimer);
    boundaryTimer = setTimeout(refreshIfStale, boundaryDelay(boundaryAt, now));
  }
}

function startVisibleTick() {
  if (tickHandle || document.hidden) return;
  updateClock();
  updateCountdownWidgets();
  lastTickAt = Date.now();
  tickHandle = setInterval(() => {
    refreshIfStale();
    updateClock();
    updateCountdownWidgets();
    if (currentPage === 'home') updateCardCountdowns(); // writes only when the minute text changes
  }, 1000);
}

function stopVisibleTick() {
  if (!tickHandle) return;
  clearInterval(tickHandle);
  tickHandle = null;
  lastTickAt = null;
}

/* One-time upgrade step (v2.0.1): events that were already fully ticked before the Mark completed rule
   existed stay closed instead of re-opening in "Prayer events". */
function seedClosedFlags() {
  if (state.closeFlagsSeeded) return;
  try {
    for (const event of getActiveEvents(new Date())) {
      if (eventComplete(event)) (dayRecord(event.date).closed ||= {})[`${event.kind}:${event.key}`] = true;
    }
  } catch { /* no location yet: nothing to seed */ }
  state.closeFlagsSeeded = true;
  save();
}

function init() {
  seedClosedFlags();
  const brandMark = $('brandMark');
  if (brandMark) brandMark.innerHTML = BRAND_MARK_SVG;
  paintVersionLabel();
  loadReading().then(() => { if (currentPage === 'home') renderProgress(); renderReadingSettings(); }).catch(() => {});
  applyTheme();
  document.body.classList.toggle('compact-mode', !!state.compact);
  $('themeSelect').innerHTML = themePickerOrder().map(theme => `<option value="${escapeHtml(theme[0])}">${escapeHtml(themeOptionLabel(theme, lang()))}</option>`).join('');
  renderAdjustmentControls();
  syncSettingsControls();

  $('themeSelect').addEventListener('change', event => {
    state.theme = event.target.value;
    save();
    applyTheme();
    $('themePreview').innerHTML = '';
  });
  $('languageSelect').addEventListener('change', event => { state.language = event.target.value; save(); render(); updateClock(); syncSettingsControls(); });
  $('soundToggle').addEventListener('change', event => { state.sound = event.target.checked; save(); });
  const tickSoundToggle = $('tickSoundToggle');
  if (tickSoundToggle) tickSoundToggle.addEventListener('change', event => { state.tickSound = event.target.checked; save(); });
  $('uiFontSelect').addEventListener('change', event => { state.font = sanitizeFont(event.target.value); save(); applyUiFont(); });
  $('clockFormatSelect').addEventListener('change', event => { state.clock = sanitizeClockFormat(event.target.value); save(); render(); updateClock(); });
  const changeProfile = patch => {
    state.profile = sanitizeProfile({ ...state.profile, ...patch });
    save();
    // Recompute immediately; history is keyed by date and is not touched.
    liveTimes = null;
    render();
    renderProfileSettings();
    showToast('Calculation profile updated');
  };
  $('methodSelect').addEventListener('change', event => changeProfile({ method: event.target.value }));
  $('schoolSelect').addEventListener('change', event => changeProfile({ school: event.target.value, method: presetForSchool(event.target.value, state.profile.method) }));
  $('highLatSelect').addEventListener('change', event => changeProfile({ highLatitude: event.target.value }));
  $('tickStyleSelect').addEventListener('change', event => {
    state.tickStyle = sanitizeTickStyle(event.target.value);
    save();
    // Preview the chosen style once (if sound is on).
    if (state.sound && state.tickSound !== false) playCues([{ type: 'tick', layer: 'sunnah', step: 1 }], state.tickStyle, window);
  });
  $('compactToggle').addEventListener('change', event => {
    state.compact = event.target.checked;
    document.body.classList.toggle('compact-mode', state.compact);
    save();
  });
  $('notificationsToggle').addEventListener('change', event => requestPrayerNotifications(event.target.checked));
  [['showDescriptionsToggle', 'descriptions'], ['showSunnahToggle', 'sunnah'], ['showOnThisDayToggle', 'onThisDay']].forEach(([id, key]) => { const control = $(id); if (!control) return; control.addEventListener('change', event => {
    state.sections[key] = event.target.checked;
    save();
    applySectionVisibility();
    syncSettingsControls();
    translateRenderedText();
  }); });
  document.querySelectorAll('[data-card]').forEach(box => box.addEventListener('change', event => {
    state.cards[box.dataset.card] = event.target.checked;
    save();
    applySectionVisibility();
    translateRenderedText();
  }));
  $('testNotification').addEventListener('click', () => { sendTestNotification(); });
  $('startupToggle').addEventListener('change', async event => {
    try {
      if (event.target.checked) await enableAutostart();
      else await disableAutostart();
      state.startup = event.target.checked;
      save();
      showToast(state.startup ? 'Will start with Windows' : 'Windows startup disabled');
    } catch {
      event.target.checked = false;
      showToast('Could not update Windows startup setting');
    }
  });
  $('locationLabel').addEventListener('click', () => {
    if (currentPage !== 'settings') openSettings();
    requestAnimationFrame(() => document.querySelector('.location-settings')?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  });
  $('settingsToggle').addEventListener('click', () => {
    if (currentPage === 'settings') openHome();
    else if (currentPage === 'home') openSettings();
  });
  $('nextName').addEventListener('click', () => { if (nextPrayer && (nextPrayer.kind === 'fard' || nextPrayer.kind === 'voluntary')) navigateToPrayerDescription(nextPrayer.key); });
  $('nextCountdownOpen').addEventListener('click', openNextCountdown);
  $('countdownBack').addEventListener('click', openHome);
  $('parseMapLink').addEventListener('click', useMapLink);
  $('saveLocation').addEventListener('click', saveLocation);
  $('prevDay').addEventListener('click', () => { selectedDate = addDays(selectedDate, -1); render(); });
  $('nextDay').addEventListener('click', () => { selectedDate = addDays(selectedDate, 1); render(); });
  $('exportData').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), data: { ...state, reading: readStore() } }, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = 'prayer-times-backup.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('analogClockButton')?.addEventListener('click', openTimeView);
  $('liveClock').addEventListener('click', event => { event.stopPropagation(); openTimeView(); });
  $('liveClock').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTimeView(); } });
  document.querySelector('.clock-readout')?.addEventListener('click', openTimeView);
  paintClockTicks();
  ensureAnalogSweep();
  $('timeBack').addEventListener('click', openHome);
  $('astroBack').addEventListener('click', openHome);
  $('weeklyDayBack')?.addEventListener('click', openHome);
  $('prayerBack')?.addEventListener('click', openHome);
  if ($('voluntarySeconds')) {
    $('voluntarySeconds').value = state.recognitionPace.voluntary;
    const savePace = () => {
      const typed = $('voluntarySeconds').value;
      const voluntary = sanitizeVoluntarySeconds(typed, state.recognitionPace.voluntary);
      if (String(voluntary) !== String(typed).trim()) showToast(lang() === 'bn' ? 'এখানে ১ থেকে ১২০ পর্যন্ত পূর্ণসংখ্যা লিখুন' : 'Enter whole seconds from 1 to 120');
      $('voluntarySeconds').value = voluntary;
      state.recognitionPace = { ...state.recognitionPace, voluntary };
      save();
    };
    $('voluntarySeconds').addEventListener('change', savePace);
  }
  if ($('verseSeconds')) {
    $('verseSeconds').value = verseSeconds(state.recognitionPace);
    $('verseSeconds').addEventListener('change', () => {
      const typed = $('verseSeconds').value;
      const verse = verseSeconds({ verse: typed });
      const parsed = Math.floor(Number(String(typed).trim()));
      if (parsed !== verse) showToast(lang() === 'bn' ? 'এখানে ১ থেকে ১২০ পর্যন্ত পূর্ণসংখ্যা লিখুন' : 'Enter whole seconds from 1 to 120');
      $('verseSeconds').value = verse;
      state.recognitionPace = { ...state.recognitionPace, verse };
      save();
    });
  }
  $('hijriAdjustSelect')?.addEventListener('change', event => {
    state.hijriAdjust = sanitizeHijriAdjust(event.target.value);
    save();
    clockDateStamp = '';
    render();
    renderReadingSettings();
  });
  if ($('blessedProgressToggle')) {
    $('blessedProgressToggle').checked = state.blessedProgress !== false;
    $('blessedProgressToggle').addEventListener('change', event => {
      state.blessedProgress = event.target.checked;
      save();
      renderProgress();
    });
  }
  $('portionClose')?.addEventListener('click', () => { const dialog = $('portionDialog'); if (dialog?.open) dialog.close(); else if (dialog) dialog.hidden = true; });
  if ($('showRewardText')) {
    $('showRewardText').checked = state.showRewardText !== false;
    $('showRewardText').addEventListener('change', event => {
      state.showRewardText = event.target.checked;
      save();
      renderProgress();
    });
  }
  initPrefReminderSettings();
  let pendingBackup = null;
  let recoveryHoldTimer = null;
  $('importFile').addEventListener('change', async () => {
    const file = $('importFile').files && $('importFile').files[0];
    if (!file) return;
    const parsed = parseBackup(await file.text());
    pendingBackup = parsed.ok ? parsed.backup : null;
    $('backupStatus').textContent = parsed.ok ? (lang() === 'bn' ? 'ব্যাকআপ প্রস্তুত। Replace অথবা Merge বেছে নিন।' : 'Backup ready. Choose Replace or Merge. A safety copy is kept first.') : parsed.error;
  });
  const keepSafety = () => localStorage.setItem('prayer-times-safety', JSON.stringify({ savedAt: new Date().toISOString(), data: { ...state, reading: readStore() } }));
  $('replaceBackup').addEventListener('click', () => {
    if (!pendingBackup) { $('backupStatus').textContent = lang() === 'bn' ? 'আগে একটি ব্যাকআপ ফাইল বেছে নিন।' : 'Choose a backup file first.'; return; }
    keepSafety();
    const { unknown, clean } = splitBackup(pendingBackup.data);
    if (clean.history) state.history = migrateHistory(clean.history);
    for (const key of ['profile', 'language', 'theme', 'clock', 'notifications', 'reminders', 'preReminders', 'adjustments', 'sections', 'cards', 'recognitionPace', 'showRewardText', 'lat', 'lon', 'place', 'lockWatermark']) {
      if (key in clean) state[key] = clean[key];
    }
    Object.assign(state, settingsFromBackup(clean)); // v3.0.3: progress-line switch and Hijri adjustment (defaults when absent)
    // v3.0.5: the single font; a backup from v3.0.4 or older carries uiFont (and maybe enFont) instead
    if ('font' in clean || 'uiFont' in clean || 'enFont' in clean) state.font = migrateFont({ language: state.language, ...clean });
    // v3.0.6 F: read marks travel with the backup; a backup without them (v3.0.5 or older) leaves them as they are
    if ('reading' in clean) { const reading = sanitizeReadingBackup(clean.reading); if (reading) writeStore(undefined, reading); }
    save();
    $('backupStatus').textContent = unknown.length
      ? `Replaced. Not available in this version: ${unknown.join(', ')}. The previous data is in the safety copy.`
      : 'Replaced. The previous data is in the safety copy.';
    syncSettingsControls();
    openHome();
  });
  $('mergeBackup').addEventListener('click', () => {
    if (!pendingBackup) { $('backupStatus').textContent = lang() === 'bn' ? 'আগে একটি ব্যাকআপ ফাইল বেছে নিন।' : 'Choose a backup file first.'; return; }
    keepSafety();
    const { unknown, clean } = splitBackup(pendingBackup.data);
    const merged = mergeHistory(state.history, clean.history);
    state.history = migrateHistory(merged.history);
    // v3.0.6 F: a passage stays read if either side has it read
    if ('reading' in clean) { const reading = sanitizeReadingBackup(clean.reading); if (reading) writeStore(undefined, mergeReading(readStore(), reading)); }
    save();
    const conflictText = merged.conflicts.length ? ` Kept the existing record where ${merged.conflicts.length} item${merged.conflicts.length === 1 ? '' : 's'} disagreed.` : '';
    const unknownText = unknown.length ? ` Not available in this version: ${unknown.join(', ')}.` : '';
    $('backupStatus').textContent = `Merged.${conflictText}${unknownText} A safety copy was kept.`;
    render();
  });
  $('recoveryHold').addEventListener('pointerdown', () => {
    clearTimeout(recoveryHoldTimer);
    recoveryHoldTimer = setTimeout(() => {
      const now = new Date();
      const events = fardLookback(now);
      const isRecorded = event => !!dayRecord(event.date, false).fard?.[event.key];
      const isLocked = event => {
        const lockAt = lockInstant({ kind: 'fard', key: event.key }, lockContext(event.date).events, lockContext(event.date).nextFajr)?.at;
        if (recordingOpen(event.start, event.end, lockAt, now)) return false;
        return lockState('fard', event.key, event.date, now).locked || (!!lockAt && now.getTime() >= lockAt);
      };
      const preceding = twoPrecedingFard(events, now);
      if (!recoveryEligible(preceding, isRecorded)) {
        $('recoveryStatus').textContent = lang() === 'bn' ? 'এখন আনা যাবে না। ঠিক আগের দুই ফরজ নামাজ আগে থেকে রেকর্ড থাকতে হবে।' : 'Not available. The two immediately preceding Fard prayers must both already be recorded.';
        $('recoveryPanel').hidden = true;
        return;
      }
      const list = recoverableFards(events, now, { isRecorded, isLocked });
      if (!list.length) {
        $('recoveryStatus').textContent = lang() === 'bn' ? 'লক হওয়া কোনো পুরনো ফরজ খালি নেই।' : 'There is no older locked Fard still unrecorded.';
        $('recoveryPanel').hidden = true;
        return;
      }
      $('recoverySelect').innerHTML = list.map(event => `<option value="${dateKey(event.date)}|${event.key}">${escapeHtml(prayerName(event.key))} · ${escapeHtml(dateKey(event.date))}</option>`).join('');
      $('recoveryConfirm').checked = false;
      $('recoveryPanel').hidden = false;
      $('recoveryStatus').textContent = lang() === 'bn' ? RECOVERY_CONFIRM.bn : RECOVERY_CONFIRM.en;
    }, 3000);
  });
  const cancelRecoveryHold = () => clearTimeout(recoveryHoldTimer);
  $('recoveryHold').addEventListener('pointerup', cancelRecoveryHold);
  $('recoveryHold').addEventListener('pointerleave', cancelRecoveryHold);
  $('recoverySave').addEventListener('click', () => {
    if (!$('recoveryConfirm').checked) {
      $('recoveryStatus').textContent = lang() === 'bn' ? RECOVERY_CONFIRM.bn : RECOVERY_CONFIRM.en;
      return;
    }
    const [day, key] = String($('recoverySelect').value || '').split('|');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
    if (!match || !key) return;
    const eventDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const now = new Date();
    const event = findRecordableEvent('fard', key, eventDate);
    const lockAt = event ? lockInstant({ kind: 'fard', key }, lockContext(eventDate).events, lockContext(eventDate).nextFajr)?.at : null;
    if (dayRecord(eventDate, false).fard?.[key]) { $('recoveryStatus').textContent = lang() === 'bn' ? 'এই নামাজ আগেই রেকর্ড করা আছে।' : 'This prayer is already recorded.'; return; }
    if (!event || recordingOpen(event.start, event.end, lockAt, now) || !lockState('fard', key, eventDate, now).locked) {
      $('recoveryStatus').textContent = lang() === 'bn' ? 'রেকর্ডের নিয়ম এড়িয়ে যাওয়া যাবে না। খোলা জানালায় সাধারণ টিক ব্যবহার করুন।' : 'Recovery cannot bypass the recording rules. Use the normal tick while the window is open.';
      return;
    }
    const still = twoPrecedingFard(fardLookback(now), now);
    if (!recoveryEligible(still, item => !!dayRecord(item.date, false).fard?.[item.key])) {
      $('recoveryStatus').textContent = lang() === 'bn' ? 'এখন আনা যাবে না। ঠিক আগের দুই ফরজ নামাজ আগে থেকে রেকর্ড থাকতে হবে।' : 'Not available. The two immediately preceding Fard prayers must both already be recorded.';
      return;
    }
    const record = dayRecord(eventDate);
    record.fard = record.fard || {};
    record.fard[key] = true;
    save();
    $('recoveryPanel').hidden = true;
    $('recoveryConfirm').checked = false;
    $('recoveryStatus').textContent = lang() === 'bn' ? 'রেকর্ড হয়েছে। যোগ্যতা আবার দেখা হয়েছে।' : 'Recorded. Eligibility was checked again.';
    render();
  });
  $('resetData').addEventListener('click', async () => {
    if (!confirm('Delete all locally stored settings, location and prayer history? You will need to enter a Google Maps link or coordinates again.')) return;
    try { await disableAutostart(); } catch { /* reset remains local even if Windows registration cannot be changed */ }
    localStorage.removeItem('prayer-times-data');
    Object.assign(state, DEFAULTS, { history: {}, reminders: {}, preReminders: {}, reminderSent: {}, adjustments: { ...DEFAULTS.adjustments }, profile: { ...DEFAULT_PROFILE } });
    save();
    syncSettingsControls();
    applyTheme();
    openSettings();
    showToast('Local data reset');
  });

  $('timezoneLabel').textContent = timezoneText();
  render();
  if (!hasLocation()) openSettings();
  startVisibleTick();
  // Small, deliberate keyboard set: navigation plus fullscreen and help.
  let desktopWindow = null;
  try { desktopWindow = getCurrentWindow(); } catch { desktopWindow = null; /* plain browser preview */ }
  const keyboardHelp = $('keyboardHelp');
  const toggleKeyboardHelp = () => { if (keyboardHelp.open) keyboardHelp.close(); else keyboardHelp.showModal(); };
  $('closeKeyboardHelp').addEventListener('click', () => keyboardHelp.close());
  keyboardHelp.addEventListener('click', event => { if (event.target === keyboardHelp) keyboardHelp.close(); });
  // Native <dialog> closes itself on Escape; keep our handler from also exiting fullscreen.
  let helpClosedByEscapeAt = 0;
  keyboardHelp.addEventListener('cancel', () => { helpClosedByEscapeAt = Date.now(); });
  const isFullscreen = async () => {
    if (desktopWindow) return desktopWindow.isFullscreen();
    return !!document.fullscreenElement;
  };
  const setFullscreen = async value => {
    if (desktopWindow) {
      // v1.3.4: Rust leaves the maximised state first (fixes the stuck/offset mouse after F11); the plugin call is the fallback
      try { await invoke('set_window_fullscreen', { fullscreen: value }); }
      catch { await desktopWindow.setFullscreen(value); }
      document.documentElement.classList.toggle('is-fullscreen', value);
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); // re-measure and re-hit-test the page
      return;
    }
    if (value) return document.documentElement.requestFullscreen?.();
    return document.fullscreenElement ? document.exitFullscreen?.() : undefined;
  };
  // Sunnah (blue) / Nafl (gold) sub-ticks in the prayer list and live events.
  $('eventInfoClose')?.addEventListener('click', () => { const dialog = $('eventInfo'); if (dialog?.open) dialog.close(); else if (dialog) dialog.hidden = true; });
  document.addEventListener('click', event => {
    const tick = event.target instanceof Element ? event.target.closest('[data-sub-layer]') : null;
    if (!tick || tick.disabled) return;
    toggleSubPrayer(tick.dataset.subLayer, tick.dataset.subKey, tick.dataset.subPrayer, tick.dataset.subDate);
  });
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-carousel-step]') : null;
    if (!button) return;
    stepCarousel(button.closest('[data-carousel]'), Number(button.dataset.carouselStep) || 0);
  });
  document.addEventListener('keydown', async event => {
    const target = event.target;
    // Left/Right page a carousel when focus is on the card or its buttons.
    const carouselHost = target instanceof Element ? target.closest('[data-carousel].has-carousel') : null;
    const arrowDelta = carouselHost ? carouselArrowDelta(event) : 0;
    if (arrowDelta) {
      event.preventDefault();
      stepCarousel(carouselHost, arrowDelta);
      return;
    }
    const action = shortcutFor(event, { helpOpen: keyboardHelp.open });
    if (!action) return;
    if (action === 'fullscreen') {
      event.preventDefault();
      try { await setFullscreen(!(await isFullscreen())); } catch { showToast('Fullscreen mode is unavailable'); }
      return;
    }
    if (action === 'escape') {
      if (keyboardHelp.open) { keyboardHelp.close(); return; }
      if (Date.now() - helpClosedByEscapeAt < 250) return;
      try {
        if (await isFullscreen()) { await setFullscreen(false); return; }
      } catch { /* ignore outside fullscreen */ }
      // Existing Back behaviour: leave the countdown screen; Settings returns home.
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ($('eventInfo')?.open) { $('eventInfo').close(); return; }
      if ($('portionDialog')?.open) { $('portionDialog').close(); return; }
      if (currentPage === 'countdown' || currentPage === 'time' || currentPage === 'astro' || currentPage === 'weekly-day' || currentPage === 'prayer') openHome();
      else if (currentPage === 'settings' && !typing && hasLocation()) openHome();
      return;
    }
    event.preventDefault();
    if (action === 'help') {
      toggleKeyboardHelp();
    } else if (action === 'home') {
      // Home goes to the home page (from Settings or a countdown) and to its top.
      if (currentPage !== 'home' && hasLocation()) {
        openHome();
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
      } else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'pageUp') {
      window.scrollBy({ top: -pageScrollDistance(window.innerHeight), behavior: 'smooth' });
    } else if (action === 'pageDown') {
      window.scrollBy({ top: pageScrollDistance(window.innerHeight), behavior: 'smooth' });
    } else if (action === 'end') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });
  document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('page-hidden', document.hidden); });
  window.addEventListener('resize', () => requestAnimationFrame(() => { updateSky(true); scheduleFoldFit(); }));
  window.addEventListener('focus', () => onWindowReopened('focus'));
  try { // Rust-side signals from src-tauri/src/main.rs (tray click, tray menu, second launch, close-to-tray)
    listen('main-window-hidden', () => { windowWasHidden = true; }).catch(() => {});
    listen('main-window-shown', () => onWindowReopened('rust')).catch(() => {});
  } catch { /* browser preview: no Tauri event bridge */ }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      windowWasHidden = true;
      stopVisibleTick();
    } else {
      onWindowReopened('visibility'); // a new Today's Progress line once per reopen (before render() re-reads the lock)
      render(); // Refresh after a tray restore or Windows wake.
      startVisibleTick();
      checkNotifications();
    }
  });
  checkNotifications();
  renderHandle = setInterval(() => {
    const todayKey = dateKey(new Date());
    if (todayKey !== lastScheduleDate) {
      const wasFollowingToday = dateKey(selectedDate) === lastScheduleDate;
      lastScheduleDate = todayKey;
      if (wasFollowingToday) selectedDate = startOfDay(new Date());
      render();
    } else {
      if (currentPage === 'home') {
        renderLiveEvents();
        renderProgress();
        updateCardCountdowns();
      }
    }
    checkNotifications();
    updateTrayTooltip();
  }, 15000);
  isAutostartEnabled().then(enabled => { state.startup = enabled; $('startupToggle').checked = enabled; }).catch(() => {});
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// v3.0.6: the bundled ephemeris is read first so the first render already shows the crescent-based Hijri date.
clearLegacyReading(); // C: the reminder's old automatic read counts are cleared
loadEphemeris().finally(() => init());
