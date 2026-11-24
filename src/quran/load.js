/* Lazy loader and lookups for the bundled Qur'an translations (6,236 verses).
   English: Saheeh International. Bangla: Muhiuddin Khan. No Arabic text is
   bundled (v3.0.2); section and juz' boundaries come from Tanzil metadata.
   See LICENSES.txt in this folder and the data file's `sources` field. */

let cache = null;
let pending = null;

export async function loadQuran() {
  if (cache) return cache;
  if (!pending) pending = readQuran().then(data => { cache = data; return data; });
  return pending;
}

async function readQuran() {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = fileURLToPath(new URL('./data.json', import.meta.url));
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  const mod = await import('./data.json');
  return mod.default || mod;
}

export function quranLoaded() { return cache; }

/** 0-based index of surah:ayah, or -1 if out of range. */
export function verseIndex(data, surah, ayah) {
  const s = data.surahs[surah - 1];
  if (!s || ayah < 1 || ayah > s.c) return -1;
  return s.start + ayah - 1;
}

export function verseAt(data, surah, ayah) {
  const i = verseIndex(data, surah, ayah);
  return i < 0 ? null : verseByIndex(data, i);
}

export function verseByIndex(data, index) {
  if (!data || index < 0 || index >= data.count) return null;
  const surah = data.surahs.find(s => index >= s.start && index < s.start + s.c);
  if (!surah) return null;
  const ayah = index - surah.start + 1;
  return {
    index, surah: surah.n, ayah,
    en: data.en[index], bn: data.bn[index],
    surahEn: surah.en, surahBn: surah.bn
  };
}


export function refLabel(verse, lang = 'en') {
  if (!verse) return '';
  const name = lang === 'bn' ? verse.surahBn : verse.surahEn;
  const nums = lang === 'bn' ? `${toBn(verse.surah)}:${toBn(verse.ayah)}` : `${verse.surah}:${verse.ayah}`;
  return `${name} ${nums}`;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export function toBn(value) {
  return String(value).replace(/[0-9]/g, d => BN_DIGITS[Number(d)]);
}
