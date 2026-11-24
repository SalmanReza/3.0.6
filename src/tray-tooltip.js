/* System-tray tooltip text: available prayer events and the next start.
   Pure helpers so the wording, rounding and digits can be tested offline. */
import { toBengaliDigits } from './carousel.js';

export const TRAY_APP_NAME = { en: 'Prayer Times', bn: 'নামাজের সময়' };
// Windows truncates tray tooltips at 127 UTF-16 code units.
export const TRAY_TOOLTIP_MAX = 127;

/* Whole minutes left, rounded up so the tooltip never reads "0m" before the
   prayer has begun (or the window has ended). */
export function minutesLeft(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 60000);
}

export function formatRemaining(ms, lang = 'en') {
  const total = Math.max(1, minutesLeft(ms));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (lang === 'bn') {
    const parts = [];
    if (hours) parts.push(`${toBengaliDigits(hours)} ঘণ্টা`);
    if (minutes || !hours) parts.push(`${toBengaliDigits(minutes)} মিনিট`);
    return parts.join(' ');
  }
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || !hours) parts.push(`${minutes}m`);
  return parts.join(' ');
}

function availableLine(item, lang) {
  const time = formatRemaining(item.msLeft, lang);
  return lang === 'bn' ? `${item.name}: ${time} বাকি` : `${item.name}: ${time} left`;
}

function nextLine(item, lang) {
  const time = formatRemaining(item.ms, lang);
  return lang === 'bn' ? `এরপর: ${item.name} ${time} পরে` : `Next: ${item.name} in ${time}`;
}

function trimToLimit(lines, lang, next) {
  const join = list => list.filter(Boolean).join('\n');
  let kept = [...lines];
  let text = join(kept);
  // Drop voluntary (and later) available lines first; always try to keep Next.
  while (text.length > TRAY_TOOLTIP_MAX && kept.length > (next ? 1 : 0)) {
    const dropAt = next ? kept.length - 2 : kept.length - 1;
    if (dropAt < 0) break;
    kept.splice(dropAt, 1);
    text = join(kept);
  }
  if (text.length > TRAY_TOOLTIP_MAX) text = text.slice(0, TRAY_TOOLTIP_MAX);
  void lang;
  return text;
}

/**
 * Tray hover text. No title line.
 * @param {{ lang?: string, available?: {name:string, msLeft:number, kind?:string}[], next?: {name:string, ms:number}|null, name?: string, ms?: number }} opts
 *   `name`/`ms` are accepted as a shorthand for a lone next event (older callers).
 */
export function trayTooltipText({ name, ms, lang = 'en', available, next } = {}) {
  const L = lang === 'bn' ? 'bn' : 'en';
  const avail = Array.isArray(available) ? available.filter(item => item && item.name && Number.isFinite(item.msLeft)) : [];
  let nxt = next && next.name && Number.isFinite(next.ms) ? next : null;
  if (!nxt && name && Number.isFinite(ms)) nxt = { name, ms };
  const lines = avail.map(item => availableLine(item, L));
  if (nxt) lines.push(nextLine(nxt, L));
  if (!lines.length) return '';
  return trimToLimit(lines, L, nxt);
}
