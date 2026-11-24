/* Interface font choices.
   The original ten options (system + nine bundled Bangla/Latin faces) stay as
   the "Font" / Bangla picker. v3.0.1 adds five English fonts (a separate
   picker, default system so existing users see no change) and five new
   Bangla faces, all bundled offline (v3.0.2: Bornomala replaces Lohit Bengali).
   v3.0.4: ten English fonts and ten Bangla fonts, each plus System default. English text uses the English font;
   Bengali glyphs fall through to the Bangla font via the font stack. */

export const SYSTEM_STACK = '"Segoe UI Variable", "Segoe UI", "Nirmala UI", "Amiri", system-ui, sans-serif';
export const DEFAULT_UI_FONT = 'system';
export const DEFAULT_EN_FONT = 'system';

export const UI_FONTS = Object.freeze([
  { id: 'system',   family: null,                 en: 'System default (Segoe UI)', bn: 'সিস্টেম ডিফল্ট (Segoe UI)' },
  { id: 'hind',     family: 'Hind Siliguri',      en: 'Hind Siliguri · clean sans', bn: 'Hind Siliguri · পরিচ্ছন্ন সানস' },
  { id: 'notosans', family: 'Noto Sans Bengali',  en: 'Noto Sans Bengali · neutral', bn: 'Noto Sans Bengali · নিরপেক্ষ' },
  { id: 'notoserif', family: 'Noto Serif Bengali', en: 'Noto Serif Bengali · book serif', bn: 'Noto Serif Bengali · সেরিফ' },
  { id: 'anek',     family: 'Anek Bangla',        en: 'Anek Bangla · modern', bn: 'Anek Bangla · আধুনিক' },
  { id: 'tiro',     family: 'Tiro Bangla',        en: 'Tiro Bangla · editorial serif', bn: 'Tiro Bangla · সম্পাদকীয় সেরিফ' },
  { id: 'kalpurush', family: 'Kalpurush',         en: 'Kalpurush · clear text', bn: 'কালপুরুষ · স্পষ্ট লেখা' },
  { id: 'siyam',    family: 'Siyam Rupali',       en: 'Siyam Rupali · newspaper', bn: 'সিয়াম রূপালী · সংবাদপত্র' },
  { id: 'solaiman', family: 'SolaimanLipi',       en: 'SolaimanLipi · familiar', bn: 'সোলাইমানলিপি · পরিচিত' },
  { id: 'bornomala', family: 'Bornomala',        en: 'Bornomala · book text', bn: 'বর্ণমালা · বইয়ের লেখা' },
  { id: 'adorsho',  family: 'AdorshoLipi',        en: 'AdorshoLipi · classic', bn: 'আদর্শলিপি · ক্লাসিক' }
]);

export const EN_FONTS = Object.freeze([
  { id: 'system', family: null,                 en: 'System default', bn: 'সিস্টেম ডিফল্ট' },
  { id: 'inter',  family: 'Inter',               en: 'Inter · clean sans', bn: 'Inter · পরিচ্ছন্ন সানস' },
  { id: 'manrope', family: 'Manrope',            en: 'Manrope · geometric', bn: 'Manrope · জ্যামিতিক' },
  { id: 'outfit', family: 'Outfit',              en: 'Outfit · modern', bn: 'Outfit · আধুনিক' },
  { id: 'jakarta', family: 'Plus Jakarta Sans',  en: 'Plus Jakarta Sans · soft', bn: 'Plus Jakarta Sans · কোমল' },
  { id: 'fraunces', family: 'Fraunces',          en: 'Fraunces · soft serif', bn: 'Fraunces · কোমল সেরিফ' },
  // v3.0.4: five more English fonts (SIL OFL 1.1), so English has ten plus System default
  { id: 'lato',   family: 'Lato',                en: 'Lato · warm sans', bn: 'Lato · উষ্ণ সানস' },
  { id: 'nunito', family: 'Nunito',              en: 'Nunito · rounded', bn: 'Nunito · গোলাকার' },
  { id: 'sourcesans', family: 'Source Sans 3',   en: 'Source Sans 3 · readable', bn: 'Source Sans 3 · সহজপাঠ্য' },
  { id: 'plex',   family: 'IBM Plex Sans',       en: 'IBM Plex Sans · technical', bn: 'IBM Plex Sans · প্রযুক্তিগত' },
  { id: 'lora',   family: 'Lora',                en: 'Lora · book serif', bn: 'Lora · বইয়ের সেরিফ' }
]);

// v3.0.2: Bornomala (OFL 1.0, Codepotro) replaces its stand-in Lohit Bengali;
// a saved 'lohit' choice loads as Bornomala.
// v3.0.4: the Bangla list is trimmed to ten; a saved Baloo Da 2, Atma, Mina or Galada choice loads as Hind Siliguri.
export const REMOVED_UI_FONTS = Object.freeze(['baloo', 'atma', 'mina', 'galada']);
export function sanitizeUiFont(value) {
  if (value === 'lohit') return 'bornomala';
  if (REMOVED_UI_FONTS.includes(value)) return 'hind';
  return typeof value === 'string' && UI_FONTS.some(font => font.id === value) ? value : DEFAULT_UI_FONT;
}

export function sanitizeEnFont(value) {
  return typeof value === 'string' && EN_FONTS.some(font => font.id === value) ? value : DEFAULT_EN_FONT;
}

/** CSS font-family list for the Bangla / general picker. */
export function uiFontStack(id) {
  const font = UI_FONTS.find(item => item.id === sanitizeUiFont(id));
  return font.family ? `"${font.family}", ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/** CSS font-family list for Latin text. */
export function enFontStack(id) {
  const font = EN_FONTS.find(item => item.id === sanitizeEnFont(id));
  return font.family ? `"${font.family}", ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/** Combined stack: Latin face first (no Bengali glyphs), then the Bangla face. */
export function combinedFontStack(enId, uiId) {
  const latin = enFontStack(enId);
  const bangla = uiFontStack(uiId);
  if (sanitizeEnFont(enId) === 'system') return bangla;
  if (latin === bangla) return latin;
  const first = EN_FONTS.find(item => item.id === sanitizeEnFont(enId))?.family;
  return first ? `"${first}", ${bangla}` : bangla;
}

export function uiFontLabel(id, lang = 'en') {
  const font = UI_FONTS.find(item => item.id === id);
  return font ? (lang === 'bn' ? font.bn : font.en) : '';
}

export function enFontLabel(id, lang = 'en') {
  const font = EN_FONTS.find(item => item.id === id);
  return font ? (lang === 'bn' ? font.bn : font.en) : '';
}

/* v3.0.5: ONE font picker. All 20 fonts (10 English + 10 Bangla) plus System default share one
   setting, state.font. The chosen face draws every glyph it has. English fonts carry no Bangla
   letters, so Bangla text then falls back to Hind Siliguri; a Bangla font's missing Latin glyphs
   fall back to the system stack. System default keeps the unchanged v1.3.0 stack. */
export const DEFAULT_FONT = 'system';
export const BANGLA_FALLBACK = 'Hind Siliguri';
export const FONT_GROUPS = Object.freeze([
  { id: 'en', en: 'English', bn: 'ইংরেজি', fonts: EN_FONTS.filter(font => font.id !== 'system') },
  { id: 'bn', en: 'Bangla', bn: 'বাংলা', fonts: UI_FONTS.filter(font => font.id !== 'system') }
]);
export const ALL_FONTS = Object.freeze([
  { id: 'system', family: null, en: 'System default', bn: 'সিস্টেম ডিফল্ট' },
  ...FONT_GROUPS[0].fonts,
  ...FONT_GROUPS[1].fonts
]);

export const isEnglishFont = id => EN_FONTS.some(font => font.id === id && font.id !== 'system');

export function sanitizeFont(value) {
  if (value === 'lohit') return 'bornomala';
  if (REMOVED_UI_FONTS.includes(value)) return 'hind';
  return typeof value === 'string' && ALL_FONTS.some(font => font.id === value) ? value : DEFAULT_FONT;
}

/** One saved choice from the two v3.0.4 pickers: in Bangla the Bangla choice wins, in English the English
 *  choice. When that side was "System default", the other side was what actually drew the text in v3.0.4
 *  (combinedFontStack), so it is kept. A saved v3.0.5 `font` always wins. */
export function migrateFont(saved = {}) {
  const source = saved && typeof saved === 'object' ? saved : {};
  if (typeof source.font === 'string' && source.font) return sanitizeFont(source.font);
  const bangla = sanitizeUiFont(source.uiFont);
  const english = sanitizeEnFont(source.enFont);
  if (source.language === 'bn') return bangla !== 'system' ? bangla : english;
  return english !== 'system' ? english : bangla;
}

/** CSS font-family list for the single picker. */
export function fontStack(id) {
  const chosen = sanitizeFont(id);
  const font = ALL_FONTS.find(item => item.id === chosen);
  if (!font.family) return SYSTEM_STACK;
  if (isEnglishFont(chosen)) return `"${font.family}", "${BANGLA_FALLBACK}", ${SYSTEM_STACK}`;
  return `"${font.family}", ${SYSTEM_STACK}`;
}

export function fontLabel(id, lang = 'en') {
  const font = ALL_FONTS.find(item => item.id === id);
  return font ? (lang === 'bn' ? font.bn : font.en) : '';
}
