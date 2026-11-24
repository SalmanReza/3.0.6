#!/usr/bin/env node
/* Build-time passage splitter for A Blessed Reminder (v3.0.2, rebalanced in v3.0.3).
   Input : src/quran/data.json (English + Bangla, 6,236 verses) and the Tanzil
           metadata in scripts/data/tanzil-quran-data.js (Ruku and Juz
           boundaries, CC BY 3.0, tanzil.net).
   Output: src/quran/passages.json, a compact file the app reads as-is:
           { v, count, sections:[startVerse...], juz:[startVerse...],
             starts:[startVerse of every passage...] }
           A passage runs from starts[i] to starts[i+1]-1 (the last one to 6235).
   Also strips the Arabic text from data.json (the app shows the translation
   only) when it is still present.
   Rules (pass 1 = whole sections, pass 2 = soft split of pieces over 4 verses):
   - a new piece starts at every section (ruku') start, surah start and juz' start;
   - pass 1: inside a section, a new piece starts where the previous verse ends a
     sentence in BOTH translations and the next verse does not lean back on it;
   - pass 2: pieces over 4 verses split where the previous verse ends a sentence
     in at least ONE translation and the next verse does not lean back on it with
     a dependent word ('that', 'who', 'they', 'until', ...). A piece starting with
     'And' may start when it begins a new sentence. Each piece keeps at least two
     verses unless a verse stands alone, and no split leaves a 1-verse tail.
   v3.0.3 rebalance (same rule, no new kind of split):
   - pass 3: a 4-verse piece splits 2+2 where the 2nd verse ends a sentence (as above) and
     the 3rd does not lean back; in pieces of 5+ verses a first or last verse that ends its
     sentence, followed by a fresh sentence, stands alone;
   - pass 4: no passage over 10 verses (the 4 list sentences are cut at a list item, see below).
   Run: node scripts/build-passages.mjs [--report] */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataPath = `${root}src/quran/data.json`;
const outPath = `${root}src/quran/passages.json`;

export function loadMetadata() {
  const src = readFileSync(`${root}scripts/data/tanzil-quran-data.js`, 'utf8');
  const QuranData = {};
  new Function('QuranData', src.replace(/var QuranData[^;]*;/, ''))(QuranData);
  return QuranData;
}

export const enEnd = t => /[.!?]["'”’)\]]*\s*$/.test(String(t).trim());
export const bnEnd = t => /[।?!.]["'”’)\]]*\s*$/.test(String(t).trim());
/* v3.0.3 hand-check: "And that is ..." points back at the verse before (35:17-18), and
   "And said, ..." has no subject of its own (71:23-24);
   "And [with] Thamud" (89:9) and "Lord of the heavens" (44:7) continue the list or the
   description before them. */
/* final hand-check: a verse opening with a participle ("Abiding eternally therein", 25:76;
   "Racing ahead", 14:43), "And that ..." (3:167) or "For the Day ..." (77:13)
   or with "Those"/"Nor" (3:136, 109:5) continues the sentence before it. */
const strongBack = t => /^(that|which|who|whom|those|these|until|except|unless|or|nor|while|from|to whom|by which|as|just as|like|lest|because|whether|neither|abiding|reclining|remaining)\b/i.test(String(t).trim()) || /^[a-z(\["“‘'—-]/.test(String(t).trim());
const PARTICIPLE = /^(?!(Nothing|Something|Everything|Anything|Morning|Evening|King|Thing|Spring|Bring|Fighting)\b)[A-Z][a-z]{2,}ing\b/;
const leanAnd = t => PARTICIPLE.test(String(t).trim()) || /^and that\b/i.test(String(t).trim()) || /^For the Day\b/.test(String(t).trim()) || /^(and|but|so) (that|this|such|thus) (is|was|will|has|had)\b/i.test(String(t).trim()) || /^and (said|says)\b/i.test(String(t).trim())
  || /^and \[(with|of|to|for|from|by|in|on|upon)\]/i.test(String(t).trim()) || /^(Lord|Owner|Creator|Knower|Possessor) of\b/.test(String(t).trim());
/* pass 1: any continuation word keeps verses together */
export const back = t => leanAnd(t) || /^(and|then|so|but|or|nor|that|which|who|whom|those|these|they|he|she|it|him|his|her|them|their|its|until|except|unless|when|if|while|nay|rather|thus|such|from|on the day|the day|to whom|by which)\b/i.test(String(t).trim()) || /^[a-z(\["“‘'—-]/.test(String(t).trim());
/* pass 2: only words that lean back on the previous verse block a split */
export const hardBack = t => leanAnd(t) || /^(that|which|who|whom|those|these|they|he|she|it|him|his|her|them|their|its|until|except|unless|while|such|from|to whom|by which|or|nor|when|as|just as|like|lest|because|whether|neither)\b/i.test(String(t).trim()) || /^[a-z(\["“‘'—-]/.test(String(t).trim());

/* v3.0.2 hand-check fix: the Bangla translation closes almost every verse with a
   dari (।), so a Bangla-only sentence end let pieces start mid-sentence (8:6,
   15:90, 20:27, 56:8, 65:3, ...). A soft split is therefore never made where either
   translation visibly continues: English ending in a comma, semicolon, colon,
   dash or no punctuation, or Bangla ending in a comma, semicolon, colon or dash. */
export const enOpen = t => !/([.!?]|\.\.\.)["'”’)\]]*\s*$/.test(String(t).trim());
export const bnOpen = t => /[,;:\-–—]["'”’)\]]*\s*$/.test(String(t).trim());

export function buildPassages(data, meta) {
  const surahStarts = meta.Sura.filter(x => x.length).map(s => s[0]);
  const gi = (s, a) => surahStarts[s - 1] + a - 1;
  const sections = meta.Ruku.filter(x => x.length).map(([s, a]) => gi(s, a));
  const juz = meta.Juz.filter(x => x.length && x[0] <= 114).map(([s, a]) => gi(s, a));
  const hard = new Set([...sections, ...surahStarts, ...juz]);
  const N = data.count;
  // pass 1
  const units = [];
  let cur = [];
  for (let i = 0; i < N; i++) {
    cur.push(i);
    const next = i + 1 < N ? data.en[i + 1] : '';
    const boundary = i === N - 1 || hard.has(i + 1) || (enEnd(data.en[i]) && bnEnd(data.bn[i]) && !back(next));
    if (boundary) { units.push(cur); cur = []; }
  }
  // pass 2
  const out = [];
  for (const u of units) {
    if (u.length <= 4) { out.push(u); continue; }
    let p = [];
    for (let k = 0; k < u.length; k++) {
      const i = u[k];
      p.push(i);
      const next = k + 1 < u.length ? data.en[u[k + 1]] : null;
      const left = u.length - k - 1;
      const ends = (enEnd(data.en[i]) || bnEnd(data.bn[i])) && !enOpen(data.en[i]) && !bnOpen(data.bn[i]);
      if (next !== null && p.length >= 2 && left >= 2 && ends && !hardBack(next)) { out.push(p); p = []; }
      else if (next !== null && p.length >= 4 && left >= 1 && ends && !leanAnd(next) && !strongBack(next)) { out.push(p); p = []; }
    }
    if (p.length) out.push(p);
  }
  // pass 3 (v3.0.3 rebalance): same sentence-end and lean-back rule, applied to more pieces
  const safeEnd = i => (enEnd(data.en[i]) || bnEnd(data.bn[i])) && !enOpen(data.en[i]) && !bnOpen(data.bn[i]);
  const canSplit = (i, j) => safeEnd(i) && !hardBack(data.en[j]);
  const out3 = [];
  for (const p of out) {
    if (p.length === 4 && canSplit(p[1], p[2])) { out3.push(p.slice(0, 2), p.slice(2)); continue; }
    if (p.length >= 5) {
      // a first or last verse that ends its sentence, with a fresh sentence after it, stands alone
      const q = p.slice(); const pre = [], post = [];
      if (canSplit(q[0], q[1])) pre.push([q.shift()]);
      if (q.length >= 5 && canSplit(q[q.length - 2], q[q.length - 1])) post.unshift([q.pop()]);
      out3.push(...pre, q, ...post);
      continue;
    }
    out3.push(p);
  }
  // pass 4 (v3.0.3): no passage over 10 verses. The only such pieces (23:1-11, 53:35-52,
  // 70:19-35, 81:1-14) are single long list sentences with no sentence end inside, so they
  // are cut at a list-item boundary nearest the middle: the next verse opens a new item
  // ("And ...", "And that ...", "And when ...") and the Bangla closes a clause (। or ;).
  const listBreak = (i, j) => /^And\b/.test(String(data.en[j]).trim()) && /[।;]["'”’)\]]*\s*$/.test(String(data.bn[i]).trim());
  const forced = [];
  const out4 = [];
  const cut = p => {
    if (p.length <= 10) { out4.push(p); return; }
    let best = -1, bestScore = Infinity;
    for (let k = 1; k < p.length; k++) {
      if (k > 10 || p.length - k > 10 && p.length <= 20) continue;
      const score = Math.abs(p.length / 2 - k) + (listBreak(p[k - 1], p[k]) ? 0 : 100);
      if (score < bestScore) { bestScore = score; best = k; }
    }
    forced.push(p[best]);
    cut(p.slice(0, best)); cut(p.slice(best));
  };
  for (const p of out3) cut(p);
  return { sections, juz, starts: out4.map(p => p[0]), pieces: out4, forced };
}

export const THEMES = Object.freeze(['gratitude', 'friday', 'dawn', 'night', 'prayer', 'mercy', 'patience', 'hereafter', 'creation', 'prophets', 'law']);
const bit = name => 1 << THEMES.indexOf(name);
/* Keyword evidence per theme, counted over the section's English text; a theme
   applies when it reaches its minimum count. The 405 hand-checked tagged verses
   (src/quran/tags.js) add their own tags on top, and they are what the app picks
   first for a theme. */
const THEME_RULES = [
  ['gratitude', /\b(grateful|gratitude|thank|thankful|ungrateful|appreciative)\b/gi, 1],
  ['dawn', /\b(dawn|daybreak|morning|sunrise|before the rising of the sun|early hours)\b/gi, 1],
  ['night', /\bnights?\b/gi, 1],
  ['prayer', /\b(prayers?|prostrat\w*|bow down|establish prayer|glorify|exalt \[Allah\])\b/gi, 1],
  ['mercy', /\b(merc\w*|forgiv\w*|compassion\w*|kind)\b/gi, 2],
  ['patience', /\b(patien\w*|steadfast\w*|endur\w*|persever\w*)\b/gi, 1],
  ['hereafter', /\b(Hereafter|Day of (Resurrection|Judgement|Recompense|Account)|Paradise|Hell\w*|the Fire|the Hour|gardens beneath|the Garden)\b/gi, 2],
  ['creation', /\b(creat\w*|heavens and (the )?earth|the sun|the moon|rain|the stars|cattle|livestock|mountains)\b/gi, 2],
  ['prophets', /\b(Noah|Abraham|Moses|Jesus|Joseph|Lot|Hud|Salih|Shu'ayb|David|Solomon|Jonah|Job|Zechariah|John|Ishmael|Isaac|Jacob|Aaron|Adam|Idrees|Elias|Elisha|Dhul-Kifl|Luqman|Dhul-Qarnayn|Mary|messengers?|prophets?)\b/gi, 2],
  ['law', /\b(lawful|unlawful|prohibited|divorc\w*|inherit\w*|zakah|fasting|retribution|debt|marr\w*|orphans?|Hajj|wash your faces|penalty|waiting period|ihram|usury|dowr\w*|bequest)\b/gi, 2]
];
export const FRIDAY_SECTIONS = Object.freeze([486]); // 62:9-11, the Jumu'ah prayer

export function sectionThemes(data, sections, tagged, verseRef) {
  const out = [];
  for (let k = 0; k < sections.length; k++) {
    const a = sections[k], b = (sections[k + 1] ?? data.count) - 1;
    let text = '';
    for (let i = a; i <= b; i++) text += ` ${data.en[i]}`;
    let mask = 0;
    for (const [name, re, min] of THEME_RULES) if ((text.match(re) || []).length >= min) mask |= bit(name);
    if (FRIDAY_SECTIONS.includes(k)) mask |= bit('friday');
    for (let i = a; i <= b; i++) for (const t of tagged.get(i) || []) if (THEMES.includes(t)) mask |= bit(t);
    out.push(mask);
  }
  return out;
}

export function distribution(pieces) {
  const d = { 1: 0, 2: 0, 3: 0, 4: 0, '5-10': 0, '>10': 0 };
  for (const p of pieces) {
    const n = p.length;
    if (n <= 4) d[n]++; else if (n <= 10) d['5-10']++; else d['>10']++;
  }
  return d;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const meta = loadMetadata();
  const built = buildPassages(data, meta);
  // integrity: contiguous, complete, no passage crosses a juz' boundary
  const juzSet = new Set(built.juz);
  let covered = 0;
  for (const p of built.pieces) {
    for (let k = 0; k < p.length; k++) {
      if (p[k] !== covered) throw new Error(`gap at ${covered}`);
      if (k > 0 && juzSet.has(p[k])) throw new Error(`crosses juz at ${p[k]}`);
      covered++;
    }
  }
  if (covered !== data.count) throw new Error('not all verses covered');
  // section subjects (hand-written, EN|BN) and themes
  const rows = readFileSync(`${root}scripts/data/section-subjects.tsv`, 'utf8').trim().split('\n').map(line => line.split('|'));
  if (rows.length !== built.sections.length || rows.some((r, k) => Number(r[0]) !== k || r.length !== 3 || !r[1] || !r[2])) throw new Error('section-subjects.tsv must have 556 complete rows');
  const { TAGGED_VERSES } = await import('../src/quran/tags.js');
  const tagged = new Map();
  for (const t of TAGGED_VERSES) {
    const i = data.surahs[t.s - 1].start + t.a - 1;
    tagged.set(i, t.tags);
  }
  const secThemes = sectionThemes(data, built.sections, tagged);
  // passage themes = section themes; tagged = themes of hand-checked verses inside the passage (first picks)
  const sectionOf = i => { let lo = 0, hi = built.sections.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (built.sections[mid] <= i) lo = mid; else hi = mid - 1; } return lo; };
  const pThemes = [], pTagged = [];
  for (const p of built.pieces) {
    let tmask = 0;
    for (const i of p) for (const t of tagged.get(i) || []) if (THEMES.includes(t)) tmask |= bit(t);
    pThemes.push(secThemes[sectionOf(p[0])] | tmask);
    pTagged.push(tmask);
  }
  writeFileSync(outPath, JSON.stringify({ v: 2, count: data.count, themes: THEMES, sections: built.sections, juz: built.juz, starts: built.starts, pt: pThemes, tg: pTagged }));
  writeFileSync(`${root}src/quran/sections.json`, JSON.stringify({ v: 1, en: rows.map(r => r[1]), bn: rows.map(r => r[2]), themes: secThemes }));
  if (data.ar) {
    delete data.ar;
    if (data.sources) delete data.sources.ar;
    for (const s of data.surahs || []) delete s.ar;
    writeFileSync(dataPath, JSON.stringify(data));
  }
  const dist = distribution(built.pieces);
  const themeCounts = Object.fromEntries(THEMES.map(t => [t, secThemes.filter(m => m & bit(t)).length]));
  console.log(JSON.stringify({ forced: built.forced.length, passages: built.pieces.length, sections: built.sections.length, juz: built.juz.length, dist, sectionThemes: themeCounts }));
}
