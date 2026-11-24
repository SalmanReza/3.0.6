import test from 'node:test';
import assert from 'node:assert/strict';
import { minutesLeft, formatRemaining, trayTooltipText, TRAY_TOOLTIP_MAX } from '../src/tray-tooltip.js';
import { readText } from './helpers/read-text.js';

const app = readText('../src/app.js', import.meta.url);
const rust = readText('../src-tauri/src/main.rs', import.meta.url);
const caps = JSON.parse(readText('../src-tauri/capabilities/default.json', import.meta.url));

test('remaining time rounds up to whole minutes and never reads 0m', () => {
  assert.equal(minutesLeft(0), 0);
  assert.equal(minutesLeft(1), 1);
  assert.equal(minutesLeft(60000), 1);
  assert.equal(minutesLeft(60001), 2);
  assert.equal(formatRemaining(30000), '1m');
  assert.equal(formatRemaining(23 * 60000), '23m');
  assert.equal(formatRemaining((83 * 60 - 5) * 1000), '1h 23m');
  assert.equal(formatRemaining(120 * 60000), '2h');
  assert.equal(formatRemaining(42 * 60000), '42m');
});

test('English and Bangla tooltip text, no title, hours and minutes or minutes only', () => {
  assert.equal(
    trayTooltipText({ available: [{ name: 'Isha', msLeft: (5 * 60 + 17) * 60000 }], next: { name: 'Fajr', ms: (6 * 60 + 2) * 60000 }, lang: 'en' }),
    'Isha: 5h 17m left\nNext: Fajr in 6h 2m'
  );
  assert.equal(
    trayTooltipText({ available: [{ name: 'Isha', msLeft: 42 * 60000 }], next: { name: 'Fajr', ms: 50 * 60000 }, lang: 'en' }),
    'Isha: 42m left\nNext: Fajr in 50m'
  );
  assert.equal(
    trayTooltipText({ available: [{ name: 'ইশা', msLeft: (5 * 60 + 17) * 60000 }], next: { name: 'ফজর', ms: (6 * 60 + 2) * 60000 }, lang: 'bn' }),
    'ইশা: ৫ ঘণ্টা ১৭ মিনিট বাকি\nএরপর: ফজর ৬ ঘণ্টা ২ মিনিট পরে'
  );
  assert.doesNotMatch(trayTooltipText({ available: [{ name: 'আসর', msLeft: 600 * 60000 }], lang: 'bn' }), /[0-9]/);
  assert.equal(trayTooltipText({ next: { name: 'Asr', ms: 83 * 60000 }, lang: 'en' }), 'Next: Asr in 1h 23m');
  assert.equal(trayTooltipText({ name: 'Asr', ms: 83 * 60000, lang: 'en' }), 'Next: Asr in 1h 23m');
  assert.equal(trayTooltipText({ lang: 'en' }), '');
  assert.equal(trayTooltipText({ lang: 'bn' }), '');
  const long = trayTooltipText({
    available: [{ name: 'Qiyam-al-Layl-the-night-prayer-with-a-very-long-name', msLeft: 60000 }, { name: 'x'.repeat(80), msLeft: 60000 }],
    next: { name: 'Fajr', ms: 60000 },
    lang: 'en'
  });
  assert.ok(long.length <= TRAY_TOOLTIP_MAX);
  assert.match(long, /Next: Fajr/);
});

test('tray tooltip is wired cheaply and the tray keeps its menu', () => {
  assert.match(rust, /TrayIconBuilder::with_id\("main"\)/);
  assert.match(rust, /\.menu\(&menu\)/);
  assert.match(rust, /"open" =>/);
  assert.match(rust, /"exit" => app\.exit\(0\)/);
  assert.ok(caps.permissions.includes('core:tray:allow-set-tooltip'));
  assert.ok(caps.permissions.includes('core:tray:allow-get-by-id'));
  assert.match(app, /TrayIcon\.getById\('main'\)/);
  assert.match(app, /if \(text === lastTrayTooltip\) return;/);
  assert.match(app, /checkNotifications\(\);\n    updateTrayTooltip\(\);\n  \}, 15000\);/);
  assert.match(app, /window\.__TAURI_INTERNALS__/);
});

test('v2.4.0: the tray tooltip lists available events then the next obligatory prayer, never a forbidden interval', () => {
  const fn = app.slice(app.indexOf('function updateTrayTooltip'), app.indexOf('function updateTrayTooltip') + 900);
  assert.match(fn, /getNextPrayer\(now\)/);
  assert.match(fn, /getActiveEvents\(now\)/);
  assert.doesNotMatch(fn, /prohibit|forbidden|interval/i);
  assert.doesNotMatch(fn, /TRAY_APP_NAME|Prayer Times\\n/);
});
