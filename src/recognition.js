/* Reward phrases shown after a tick or Mark Complete (v2.4.0).
   One phrase per action, chosen by the highest-ranked kind recorded
   (Fard > Sunnah > Nafl > Voluntary). Not a religious ranking. */

export const PHRASE_RANK = Object.freeze(['fard', 'sunnah', 'nafl', 'voluntary']);

export const PHRASES = Object.freeze({
  fard: {
    ar: 'لَا إِلٰهَ إِلَّا اللّٰه', tr: 'La ilaha illallah',
    trBn: 'লা ইলাহা ইল্লাল্লাহ', en: 'There is no god but Allah',
    bn: 'আল্লাহ ছাড়া কোনো উপাস্য নেই'
  },
  sunnah: {
    ar: 'اللّٰهُ أَكْبَر', tr: 'Allahu Akbar',
    trBn: 'আল্লাহু আকবার', en: 'Allah is the Greatest',
    bn: 'আল্লাহ সর্বশ্রেষ্ঠ'
  },
  nafl: {
    ar: 'الْحَمْدُ لِلّٰه', tr: 'Alhamdulillah',
    trBn: 'আলহামদুলিল্লাহ', en: 'All praise is for Allah',
    bn: 'সকল প্রশংসা আল্লাহর'
  },
  voluntary: {
    ar: 'سُبْحَانَ اللّٰه', tr: 'SubhanAllah',
    trBn: 'সুবহানাল্লাহ', en: 'Glory be to Allah',
    bn: 'আল্লাহ পবিত্র'
  }
});

export const DAY_VERSE = Object.freeze({
  ar: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ',
  tr: "Qad aflaha al-mu'minun",
  trBn: "কাদ আফলাহাল মু'মিনূন",
  en: 'Certainly, the believers have succeeded',
  bn: 'নিশ্চয়ই মুমিনগণ সফলকাম হয়েছে',
  ref: "Al-Mu'minun 23:1",
  refBn: 'আল-মুমিনুন ২৩:১'
});

export function phraseLines(key, lang = 'en') {
  const phrase = PHRASES[key];
  if (!phrase) return null;
  const bn = lang === 'bn';
  return { ar: phrase.ar, tr: bn ? phrase.trBn : phrase.tr, meaning: bn ? phrase.bn : phrase.en };
}

export function dayVerseLines(lang = 'en') {
  const bn = lang === 'bn';
  return {
    ar: DAY_VERSE.ar,
    tr: bn ? DAY_VERSE.trBn : DAY_VERSE.tr,
    meaning: bn ? DAY_VERSE.bn : DAY_VERSE.en,
    ref: bn ? DAY_VERSE.refBn : DAY_VERSE.ref
  };
}

/** Highest-ranked kind among those just recorded. Unknown names are ignored. */
export function highestKind(kinds = []) {
  const set = new Set(Array.isArray(kinds) ? kinds : [kinds]);
  return PHRASE_RANK.find(key => set.has(key)) || null;
}

export const REWARD_SECONDS_DEFAULT = 8;
export const VERSE_SECONDS_DEFAULT = 12;
export const REWARD_SECONDS_MIN = 1;
export const REWARD_SECONDS_MAX = 120;

export function rewardSeconds(pace = {}) {
  const value = pace && typeof pace === 'object' ? pace.voluntary : pace;
  const n = Math.floor(Number(value));
  return n >= REWARD_SECONDS_MIN && n <= REWARD_SECONDS_MAX ? n : REWARD_SECONDS_DEFAULT;
}

/** How long the all-five-Fard verse card stays. Separate from the phrase timer. */
export function verseSeconds(pace = {}) {
  const value = pace && typeof pace === 'object' ? pace.verse : pace;
  const n = Math.floor(Number(value));
  return n >= REWARD_SECONDS_MIN && n <= REWARD_SECONDS_MAX ? n : VERSE_SECONDS_DEFAULT;
}
