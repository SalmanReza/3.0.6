/* What each voluntary prayer is promised or praised for, shown when its event is marked complete (v2.1.0).
   Every line is a Qur'anic verse or a hadith that is reported with a source; none is invented and none is a ranking.
   The Bangla is a translation of the same text. */
export const VOLUNTARY_REWARDS = Object.freeze({
  duha: {
    en: 'Every morning, charity is due on each joint of your body. Two rak‘ahs prayed in Duha are enough to cover all of it.',
    bn: 'প্রতিদিন সকালে তোমাদের প্রত্যেক জোড়ার পক্ষ থেকে সদকা আবশ্যক হয়। দুহার সময়ের দুই রাকাত নামাজ তার সবকিছুর জন্য যথেষ্ট।',
    ref: 'Sahih Muslim 720', refBn: 'সহিহ মুসলিম ৭২০'
  },
  awwabin: {
    en: '“…Indeed, He is ever Forgiving to those who return to Him again and again.”',
    bn: '“…নিশ্চয়ই তিনি বারবার তাঁর দিকে প্রত্যাবর্তনকারীদের প্রতি অতি ক্ষমাশীল।”',
    ref: 'Qur’an 17:25', refBn: 'কুরআন ১৭:২৫'
  },
  qiyam: {
    en: 'The best prayer after the obligatory prayers is the prayer of the night.',
    bn: 'ফরজ নামাজের পর সর্বোত্তম নামাজ হলো রাতের নামাজ।',
    ref: 'Sahih Muslim 1163', refBn: 'সহিহ মুসলিম ১১৬৩'
  },
  tahajjud: {
    en: '“They leave their beds, calling upon their Lord in fear and hope… No soul knows what is hidden for them of comfort for the eyes, as reward for what they used to do.”',
    bn: '“তারা শয্যা ত্যাগ করে ভয় ও আশা নিয়ে তাদের রবকে ডাকে… কেউ জানে না তাদের কৃতকর্মের প্রতিদানস্বরূপ তাদের জন্য চোখজুড়ানো কী লুকিয়ে রাখা হয়েছে।”',
    ref: 'Qur’an 32:16–17', refBn: 'কুরআন ৩২:১৬–১৭'
  },
  tarawih: {
    en: 'Whoever stands in prayer in Ramadan with faith and hoping for the reward, his previous sins are forgiven.',
    bn: 'যে ব্যক্তি ঈমান ও সওয়াবের আশায় রমজানে রাতে নামাজে দাঁড়ায়, তার অতীতের গুনাহ ক্ষমা করে দেওয়া হয়।',
    ref: 'Sahih al-Bukhari 37; Sahih Muslim 759', refBn: 'সহিহ বুখারি ৩৭; সহিহ মুসলিম ৭৫৯'
  },
  eid_prayer: {
    en: '“…so that you complete the period, and proclaim the greatness of Allah for having guided you, and perhaps you will be grateful.”',
    bn: '“…যাতে তোমরা সংখ্যা পূর্ণ করো, আর আল্লাহ তোমাদের পথ দেখিয়েছেন বলে তাঁর মহিমা ঘোষণা করো এবং যাতে তোমরা কৃতজ্ঞ হও।”',
    ref: 'Qur’an 2:185', refBn: 'কুরআন ২:১৮৫'
  },
  witr: {
    en: 'Allah is One and loves the odd-numbered prayer, so pray Witr.',
    bn: 'আল্লাহ বিজোড় এবং তিনি বিজোড় (বিতর) ভালোবাসেন, তাই বিতর পড়ো।',
    ref: 'Sunan Abi Dawud 1416; Jami‘ at-Tirmidhi 453', refBn: 'সুনান আবু দাউদ ১৪১৬; জামে তিরমিজি ৪৫৩'
  },
  other_nafl: {
    en: 'My servant keeps drawing nearer to Me with voluntary acts of worship until I love him.',
    bn: 'আমার বান্দা নফল ইবাদতের মাধ্যমে আমার নিকটবর্তী হতে থাকে, যতক্ষণ না আমি তাকে ভালোবাসি।',
    ref: 'Sahih al-Bukhari 6502', refBn: 'সহিহ বুখারি ৬৫০২'
  }
});

export function rewardFor(key, lang = 'en') {
  const item = VOLUNTARY_REWARDS[key];
  if (!item) return null;
  const bn = lang === 'bn';
  return { text: bn ? item.bn : item.en, ref: bn ? item.refBn : item.ref };
}

export const VOLUNTARY_SECONDS_DEFAULT = 8;
export const VOLUNTARY_SECONDS_MIN = 1;
export const VOLUNTARY_SECONDS_MAX = 120;
/** Whole seconds from 1 to 120; anything else falls back to the default (or the previous value). */
export function sanitizeVoluntarySeconds(value, fallback = VOLUNTARY_SECONDS_DEFAULT) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return fallback;
  const n = Number(text);
  return n >= VOLUNTARY_SECONDS_MIN && n <= VOLUNTARY_SECONDS_MAX ? n : fallback;
}
