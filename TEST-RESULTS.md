### v3.0.6 (built on 3.0.5): Mark as read / Undo read, confirmed counts, lunar-year plan, featured passages, per-year read marks, reading day by location, Hijri date by crescent visibility, offline full-precision sun and moon, version

All of the following were run on the unzipped `Prayer-Times-v3.0.6/` folder (fresh unzip of the release zip into an empty folder), after `npm ci`:
- `npm test`: 480 tests, 475 passed, 0 failed, 5 skipped (the same 5 skips as v3.0.5; v3.0.5 had 464/459/0/5). New: tests/v306.test.js (16 tests, lines A–M). Older tests were updated only where v3.0.6 changes behaviour, each marked `[changed in v3.0.6 …]`: version strings (K); the old automatic reading count (C); the whole-Qur'an-every-month plan replaced by the lunar-year plan (D); the backup now carries read marks (F); the Hijri date by crescent visibility (H).
- `npm run check`: passed. `npm run web:build`: passed (the DE442S kernel is copied to `dist/ephemeris/de442s.bsp`, 32,701,440 bytes).
- `scripts/e2e-v306.mjs` against a Vite dev server started from the unzipped folder: 151/151 passed, EN and BN: Mark as read (A), Undo read (B), the confirmed count (C), the lunar-year plan and Juz' (D), featured passages on 9 Dhul-Hijjah, 17 and 27 Ramadan (E), read status per year, the behind list, new year, history and backup (F), the reading day at midnight of the saved location (G), the Hijri date by crescent visibility with its label, Maghrib change, −2..+2 and the polar limit (H), no network request and no sync button (I), privacy text and licences (J), version (K), the kernel read from the app's own files (L) and the astrolabe / Sun-Moon cards on the same DE442S values (M).
- `scripts/e2e-v305.mjs` on the same build: 112/112 passed (v3.0.5: 112). `scripts/e2e-v304.mjs`: 167/167 passed (v3.0.5: 167). `scripts/e2e-v303.mjs`: 73/73 passed (v3.0.5: 73; see the note below about its first run). `scripts/e2e-v302.mjs`: 86/86 passed (v3.0.5: 86).
- Older e2e expectations were changed only where v3.0.6 replaces the behaviour they checked (marked `[changed in v3.0.6 …]`): version labels (K); e2e-v303 [4]/[9] "every verse shown once in a month" now checks the year plan is contiguous and shows every verse exactly once (D); e2e-v303 [5] marks the passages before 2:282 as read through the app's read-status store instead of relying on automatic counting (A/C); e2e-v303 [6] compares ±1 day and the adjustment with the app's own crescent date instead of the Umm al-Qura calendar (D/H); e2e-v303 [8] Juz' label (D); e2e-v302 D9–D15 (automatic counting, monthly juz' plan, progress line) brought to the confirmed-count / year plan / midnight day change (A/C/D/F/G). The test helper's page-load timeout was raised from 30 s to 90 s (the 31 MB kernel makes the first load of a cold dev server slower).
- Side by side with v3.0.5 (same data and clock, 7 views, 1280 and 420, EN/BN, 28 pairs, 0 page errors): every text difference traced to A–M (evidence-v3.0.6/compare-v305-summary.md). The astrolabe drawing code is byte-identical; instrument pixels differ by 0.12–0.17 %, only where the sun/moon markers moved with the precise positions.
- Accuracy: an independent cross-check against astronomy-engine (600 samples) agrees to ≤ 0.031° Sun altitude, ≤ 0.026° Moon altitude, ≤ 0.103° Moon azimuth, ≤ 0.00001 illumination and ≤ 0.21 min moonrise (evidence-v3.0.6/crosscheck-astronomy-engine.txt).
- e2e-v303, first run on the fresh unzip: it stopped after 30 passed / 0 failed with a puppeteer "Navigation timeout of 90000 ms exceeded" (a page load, inside the month-coverage check [4/9] adjust +1) while the box was busy; no check failed. Rerun alone on the same fresh folder (nothing changed): 73/73 passed. Both logs are kept: evidence-v3.0.6/e2e-v303-first-run-timeout.txt and e2e-v303-results.txt. The browser suites were run one at a time after this.
- Also run on the final code in the source folder before zipping (same numbers): `npm test` 480/475/0/5, `check` and `web:build` passed, e2e-v306 151/151, e2e-v305 112/112, e2e-v304 167/167, e2e-v303 73/73, e2e-v302 86/86.
- After the first release zip, `npm test` failed on Windows CI in the “I no internet” unit test (`tests/v306.test.js`): it split file paths on `/src/`, which is undefined on backslash paths. The test now walks with `path.join` and compares `path.relative(...).split(path.sep).join('/')` (same meaning: only `moon-engine.js` has a network API). App code unchanged. Re-checked on Linux: `npm test` 480/475/0/5, `check` and `web:build` passed, e2e-v306 151/151. A win32-path simulation of the new logic yields `moon-engine.js`.
- Crescent chain 1440–1572 AH at 9 cities between 65° N and 55° S: 0 months other than 29/30 days (evidence-v3.0.6/crescent-chain-check.txt).
- Browser results: evidence-v3.0.6/e2e-v306-results.txt and e2e-v305/v304/v303/v302-results.txt (from the same unzipped build).
- The browser tests need `npm i --no-save puppeteer-core` after `npm ci` (it is not an app dependency).

Real bugs found and fixed during the build:
- The "passages behind this year" list ignored passages already marked read (it was not given the Hijri year); fixed before release, covered by e2e [F].
- The Settings year line ("1448 AH: N of 2,739 passages read") stayed stale after Mark as read / Undo read until the app was reloaded; it now updates at once (e2e-v302 / e2e-v306).

Deviations and limits (also in CHECKLIST-v3.0.6.md):
- Beyond the polar circles (|latitude| > 66.56°) the crescent rule cannot be applied reliably (some days have no sunset or moonset), so there the app shows the Umm al-Qura date without the "Predicted by crescent visibility" label. Stated in Settings › About (EN/BN), README and CHANGELOG.
- The crescent chain covers Muharram 1440 (2018) to 2150 CE (the kernel's span); outside it, or with no saved location, the Umm al-Qura date is shown, unlabelled.
- At start-up the app waits at most 15 seconds for the 31 MB kernel; if it is not ready by then the app starts with the Umm al-Qura date and switches when the kernel is loaded, so it can never hang on it.
- The kernel was downloaded from a public mirror because NAIF's server did not connect from the build box; its MD5 (cc49327e06088124c0e39d8dde9f0b58) matches NAIF's official aa_checksums.txt.
- The crescent date is a prediction (Odeh criterion), not a report of an actual sighting; local announcements can differ by a day.

Not done / limitations:
- No Windows installer (it needs Windows and Rust).
- Headless rendering only.

### v3.0.5 (built on 3.0.4): one Font list, tick chronology, Qiyam al-Layl split, version

All of the following were run on the unzipped `Prayer-Times-v3.0.5/` folder, after `npm ci`:
- `npm test`: 464 tests, 459 passed, 0 failed, 5 skipped (the same 5 skips as v3.0.4). New: tests/v305.test.js (14 tests, lines 1–4). Older tests were updated only where v3.0.5 changes behaviour (marked `[changed in v3.0.5 …]`): version strings and the one Font list.
- `npm run check`: passed. `npm run web:build`: passed.
- `scripts/e2e-v305.mjs` against a Vite dev server started from the unzipped folder: 112/112 passed, EN and BN: the one Font list (groups, labels, note, fallback, reload, migration of old settings, old and new backups), tick chronology (lock, aria-disabled, dimmed, forced click, unlock, no dead end, countdown page, Revise previous prayer, Friday Jumu'ah, Mark Complete unchanged, old data), the Qiyam al-Layl split (before / in Tahajjud time, summary, Prayer record, progress and stats, backup, Undo, older records) and the version label.
- `scripts/e2e-v304.mjs` on the same build: 167/167 passed. `scripts/e2e-v303.mjs`: 73/73 passed. Expectations were updated only for the font picker and the version label (marked `[v3.0.5]`).
- `scripts/e2e-v302.mjs`: 86/86 passed. This suite had not been updated for v3.0.4 (on the v3.0.4 build it stopped after 22 checks); its checks for behaviour v3.0.4 replaced (ticks now select until Mark Complete, no automatic late cards) were brought up to date and marked `[v3.0.5 maint]`, so it now has 86 checks instead of 102.
- Side by side with v3.0.4 (same data and clock, 7 views, 1280 and 420, EN/BN): text differences only from line 1 (font picker and note), line 3 (weekly Qiyam count: a recorded Witr now counts Qiyam al-Layl as done) and line 4 (label); other pixel differences are the live clock hands (evidence-v3.0.5/compare-v304-*).
- Browser results: evidence-v3.0.5/e2e-v305-results.txt (and e2e-v304/v303/v302-results.txt from the same unzipped build). Qiyam before/after: evidence-v3.0.5/qiyam-before-v3.0.4.txt. Font migration: evidence-v3.0.5/font-migration.txt.
- The browser tests need `npm i --no-save puppeteer-core` after `npm ci` (it is not an app dependency).

Not done / limitations:
- No Windows installer (it needs Windows and Rust).
- Headless rendering only.
- One Qiyam al-Layl entry per night (the card closes on Mark Complete), so that entry goes wholly to "other" or to Tahajjud by the time it was saved; rak'ahs prayed later in Tahajjud time go on the Tahajjud card.
- The expanded font-list screenshots show the list opened as a box for the picture; a real dropdown is drawn by the operating system.

### v3.0.4 (built on 3.0.3): app font on every clock/countdown, 10 + 10 fonts, ticks select / Mark Complete records, one card per prayer in the Prayer record, Revise previous prayer, no automatic late cards, flowing card grid, dark-then-light themes, countdown card leaves after Mark Complete, astrolabe/clock glide from every page, unused code removed

All of the following were run on the unzipped `Prayer-Times-v3.0.4/` folder, after `npm ci`:
- `npm test`: 450 tests, 445 passed, 0 failed, 5 skipped (the same 5 skips as v3.0.3). New: tests/v304.test.js (one or more per line A–L). Older tests were updated only where v3.0.4 changes behaviour (marked `[changed in v3.0.4 …]`): version strings, ticks select, one Undo per prayer, Revise previous prayer, removed fonts, removed code.
- `npm run check`: passed. `npm run web:build`: passed.
- `scripts/e2e-v304.mjs` against a Vite dev server started from the unzipped folder: 167/167 passed, EN and BN, every line A–L, including the 10 AM / 7 PM scenario, a 20-rak'ah reduction, undo before and after a prayer's time, record-window locks, Recovery still present, layout at 1440/1024/420 light and dark with and without Revise cards, the countdown card at 1280/900/420, and the astrolabe/clock glide from 8 views.
- `scripts/e2e-v303.mjs` on the same build: 73/73 passed. Expectations were updated only for lines v3.0.4 changes (marked `[v3.0.4]`).
- Side by side with v3.0.3 (same data and clock, 7 views, 1280 and 420, EN/BN): text differences only from F (no automatic Record previous prayer card), B (font lists, About credits) and H (label); pixel differences outside those are the clock digits (A) and the label (evidence-v3.0.4/compare-v303-*.{json,txt}).
- Removed code and files: evidence-v3.0.4/I-removed.txt. Browser results: evidence-v3.0.4/e2e-v304-results.txt, e2e-v303-results.txt.
- The browser tests need `npm i --no-save puppeteer-core` after `npm ci` (it is not an app dependency).

Not done / limitations:
- No Windows installer (it needs Windows and Rust).
- Headless rendering only.

### v3.0.3 (built on 3.0.2): Mark Complete on Record previous prayer, undo shows only that prayer, late voluntary cards stay, passages rebalanced, Read more on long verses, Hijri date adjustment, backup

All of the following were run on the unzipped `Prayer-Times-v3.0.3/` folder, after `npm ci`:
- `npm test`: 434 tests, 429 passed, 0 failed, 5 skipped. New: tests/v303.test.js (8 tests, lines 1–8). Older tests were updated only where v3.0.3 changes behaviour: version strings, 2,739 passages, long-verse previews, Mark Complete on late cards.
- `npm run check`: passed. `npm run web:build`: passed.
- `scripts/e2e-v303.mjs` against a Vite dev server started from the unzipped folder: 73/73 passed, EN and BN. It covers:
  - every command line 1–8;
  - 29- and 30-day months at Hijri adjustments 0, +1 and −1, with all 6,236 verses shown exactly once each time;
  - layout at 1280x720 and 420x700, EN/BN, light and dark.
- `scripts/e2e-v302.mjs` on the same build: 102/102 passed. Expectations were updated only for the changed lines.
- Side by side with v3.0.2 (same data and clock, 6 views, wide and narrow, EN/BN): the only differences are the late partly ticked Duha card, the Hijri adjustment control, the new passage ranges and the version label (evidence-v3.0.3/compare-v302-text-diff.json).
- Passages: 2,739. 1 verse 679, 2 verses 1,176, 3 verses 538, 4 verses 259, 5–10 verses 87, over 10 none. 736 split points hand-checked (CHECKLIST-v3.0.3.md).

Not done / limitations:
- No Windows installer (it needs Windows and Rust).
- Headless rendering only.
- ~2,760 passages and ~26 in the 5–10 group cannot be reached without mid-sentence cuts (proof: evidence-v3.0.3/five-to-ten.tsv).

### v3.0.2 (built on 3.0.1): countdown app font, Bornomala, Revise leftovers removed, Record previous prayer, Qiyam umbrella and running-total labels, A Blessed Reminder as a daily juz' reading, version label

Automated verification (all actually run):
- `npm test`: 426 tests, 421 passed, 0 failed, 5 skipped (the same 5 skips as v3.0.1). New: tests/v302.test.js (28 tests, one or more per line). Older assertions that encoded v3.0.1 behaviour were updated on purpose: version strings; the voluntary "Record completion" button is now asserted absent; Lohit → Bornomala; no Arabic in the Qur'an data; the Blessed Reminder and countdown-font checks follow the new rules.
- `npm run check` passed. `npm run web:build` passed (Qur'an data is a lazy 3,022,606-byte JSON chunk, gzip 631 kB; was 4,400,087 bytes with Arabic).
- `node scripts/build-passages.mjs` regenerates src/quran/passages.json and sections.json byte-identically: 2,661 passages, 556 sections, 30 juz'.

Browser verification (headless Chrome, Asia/Dhaka fixed clock, Vite dev server, light theme Pearl Mint):
- scripts/e2e-v302.mjs: 102/102 PASS, English and Bangla, at least one check per line (results: shots302/e2e-v302-results.txt). Includes simulated Jumada II 1448 (29 days) and Rajab 1448 (30 days): each shows all 6,236 verses exactly once; day 29 of the 29-day month reads juz' 29 and 30 (355 passages).
- Layout: 1280×720 and 420×700, EN and BN, day and night: no overflow (8 checks).
- Side-by-side with v3.0.1 (same data and clock; home, settings, countdown page, weekly day, clock; 1280×720 and 420×700; EN and BN; screenshots and DOM text): the only text differences are the approved ones — version label; "Record completion" gone; "Record previous prayer" block; the Blessed Reminder (no Arabic, subject line, verse numbers, Read more, Full section, Today's portion, progress line); Settings: Bornomala in place of Lohit, the Qur'an reading section, the new About text. Countdown, weekly-day and clock pages differ only in the version label, the ticking seconds and (on Windows) the countdown face; on this Linux box Optima/Palatino are not installed, so v3.0.1's countdown already fell back to the same UI font.

Not done / limitations:
- No Windows installer was built (needs Windows and Rust).
- Li Ador Noirrit is still not bundled: its embedded licence and the Lipighor EULA do not permit redistribution. Bornomala (OFL 1.0, Codepotro) replaces Lohit Bengali.
- 2,661 passages, not the estimated ~2,760: the hand-check found 25 of 300 split points cut a sentence (Bangla "।" ends almost every verse), and the stricter rule merged them.
- The app has no Hijri adjustment setting; the day's juz' follows the app's own Hijri date (which changes at Maghrib).
- The reading-progress switch is not part of the backup export, like other recent display settings.
- Older e2e suites (v210–v301) were not rerun or rewritten, as agreed; the v3.0.1 comparison replaces them.

### v3.0.1 (built on 2.5.3): countdown clipping and Mark Complete, Friday Jumu’ah/Dhuhr, tick sound, revise tab removed, countdown font, 0-minute preferred reminders, A Blessed Reminder, 10 themes and new fonts, version label

Automated verification (all actually run):
- `npm test`: 398 tests, 393 passed, 0 failed, 5 skipped (GitHub Actions workflow checks skipped when `.github` is not in the folder; the other skips were already skipped in earlier versions). New: tests/v301.test.js. Version strings, the removed Revise tab, preferred-reminder 0 minutes, font counts, Friday Fard wiring and the Blessed Reminder title were updated in older tests on purpose.
- `npm run check` passed. `npm run web:build` passed (the Qur’an data is a lazy 4,400,087-byte JSON chunk, gzip 905 kB).

Browser verification (headless Chrome, Asia/Dhaka fixed clock, Vite on 127.0.0.1:1420):
- scripts/e2e-v301.mjs: 37/37. Clipping fixed (scrollWidth ≤ clientWidth) and “In Hanafi practice” visible at 1280, 900 and 420 px, English and Bangla; countdown Mark Complete is present and placed to the right (below on 420 px). Friday shows 2 Jumu’ah and 4 Dhuhr; ticking Jumu’ah locks Dhuhr and stores fridayFard “jumuah”; a click on the locked circle does not switch it. Tick sound switch is on by default; a tick starts WebAudio (2 oscillator starts). Revise event record is gone. Time-left digits use Optima/Palatino/Georgia with tabular-nums, not monospace. Preferred reminder fields accept and show 0. A Blessed Reminder title, a verse with a surah:ayah reference, and a remembered cursor in localStorage. All 10 new themes are in the 20-theme picker. English and new Bangla fonts load (Inter and Kalpurush applied). Version label is v3.0.1 / v৩.০.১, pointer-events none, no overlap at 1280×720 and 420×700.
- Focused layout audit (wide 1280×720 and narrow 420×700, English and Bangla): no overflow on the completion card, quote, notes, daily note or version label.
- scripts/e2e-v240.mjs: 38/40. The two failures look for the five-Fard 23:1 inscription on the progress disc; since v2.5.3 that verse is a timed card, not a permanent disc text. This is unchanged in v3.0.1.
- scripts/e2e-v230.mjs: 48/56. The eight failures are home-card tick-size probes that still look for `.round-check` (removed when v2.5.3 put Fard/Sunnah/Nafl on the same part-tick row). Countdown-page and other v2.3.0 checks passed.
- scripts/e2e-v220.mjs: 115/115 (needed `/tmp/e220shots` to exist for screenshots).
- scripts/e2e-v211.mjs and scripts/e2e-v210.mjs throw on `.round-check.layer-fard` (the same v2.5.3 selector change) and were not rewritten.

Screenshots: /workspace/prayer/shots301/ — countdown completion card with Mark Complete (EN and BN), Friday Jumu’ah/Dhuhr card, Blessed Reminder, new-theme contact sheet, font sample, version label, reminders at 0.

Not done / limitations:
- No Windows installer was built (needs Windows and Rust).
- The Qur’an English (Saheeh International) and Bangla (Muhiuddin Khan) texts are bundled with attribution; they are not claimed to be under an open licence. Arabic is Tanzil Uthmani, CC BY 3.0.
- Three requested Bangla fonts were substituted: Li Ador Noirrit → SolaimanLipi (OFL 1.0); Bornomala → Lohit Bengali (OFL 1.1); Noto Sans Bengali UI → AdorshoLipi (GPL). Siyam Rupali and AdorshoLipi are GPL (mere aggregation; GPL-2.0.txt is included).
- The tagged verse pool has 405 unique, verified verses (the brief asked for about 300).
- Headless Linux screenshots of Arabic can show missing glyphs because Amiri/Segoe are not installed on this machine; the app uses an Arabic font stack (Amiri, Noto Naskh/Sans Arabic, Traditional Arabic, Segoe UI) that should resolve on Windows.
- Dead-code cleanup remains deferred.
- Older e2e scripts that still target pre-2.5.3 tick markup were left as they are, except v220’s screenshot directory.

### v2.4.0 (built on 2.3.0): tray hover, smooth Rotate/Flip, sequential voluntary ticks, Witr odd totals, new reward phrases, five-Fard disc verse, centred progress circle, progress-text voluntary lines

Automated verification (all actually run):
- `npm test`: 386 tests, 385 passed, 0 failed, 1 skipped (the GitHub Actions workflow check, skipped when `.github` is not in the folder). New: tests/v240.test.js and tests/tray-tooltip.test.js. Older milestone-reward, caption, version and Witr-tick assertions were updated on purpose. One new unit test covers clearing a custom total (14 → 12, Witr 13 → 11) before the last circle is unticked.
- `npm run check` passed. `npm run web:build` passed.

Browser verification (headless Chrome, Asia/Dhaka fixed clock, Vite on 127.0.0.1:1421):
- scripts/e2e-v240.mjs: 40/40. Sequential Qiyam ticks and locks (EN and BN); old 2+1 Witr migrates to circles 1 and 3 with a total of 3; Witr box rejects 14 (hints 13 or 15) and accepts 13; other voluntary boxes reject 15 (hints 14 or 16), accept 14 and Bangla digits ১৬; each reward phrase (Fard, Sunnah, Nafl, Voluntary) plus Bangla pronunciation; the disc verse قَدْ أَفْلَحَ الْمُؤْمِنُونَ appears with five Fard only (caption carries pronunciation, meaning and Al-Mu'minun 23:1); the “Show reward text” switch hides the verse and tick phrases; the progress circle is centred in the left third and vertically in the card within 2 px; Rotate/Flip use the smooth silver ring; tray examples printed (no screenshot).
- scripts/e2e-v230.mjs 56/56, scripts/e2e-v220.mjs 115/115, scripts/e2e-v211.mjs 104/104, scripts/e2e-v210.mjs 47/47 (phrases, shared reward seconds, even-only extra box from 14, last-circle untick after a custom total returns to 12).
- Layout audit (scripts/audit-layout-v211.mjs): a focused pass of 112 views (EN and BN, system and serif, every built-in scene) at 1280×720 (56 views, 0 issues) and 420×700 (56 views, 1 issue). The 420 issue is a toast overlapping Qur’an quotation marks on the narrow Bangla voluntary Mark Complete view — the toast covers text, it is not a new overflow from the progress-card layout. A full 392-view pass (all seven sizes) was started but stopped after it hung with Chrome using no CPU, likely the O(n²) overlap scan on a large page; the focused pass covers the wide layout and the narrow stacked layout.

Screenshots: /workspace/prayer/shots240/ (EN and BN): Qiyam locks, Witr card, one reward panel, the progress card with the disc verse, and the astrolabe switches close-up.

Not done / limitations: fonts and dead-code cleanup are deferred to v2.5.0. No Windows installer was built (needs Windows and Rust). The unused voluntary-rewards data table and unused sunnah/nafl recognition-seconds fields were left in place for that cleanup. Rendering checked in headless software rendering only.

### v2.3.0 (built on 2.2.0): logo B, ranked tick sizes, smooth settings crown, Bangla Rotate/Flip tooltips

Automated verification (all actually run):
- `npm test`: 376 tests, 375 passed, 0 failed, 1 skipped (the GitHub Actions workflow check, skipped when `.github` is not in the folder). New: tests/v230.test.js (4 tests). Older version-string and logo assertions were updated on purpose.
- `npm run check` passed. `npm run web:build` passed.

Browser verification (headless Chrome, Asia/Dhaka fixed clock):
- scripts/e2e-v230.mjs: tick diameters measured with getBoundingClientRect against Mark Complete on the home Isha card and on the countdown page (Isha and Awwabin), EN and BN, dark and light theme (Fard 90 %, Sunnah 80 %, Nafl, "4 before (optional)" and voluntary sets 70 %; labels fit, ticks do not overlap; the Nafl edge is an inset shadow); Bangla Rotate/Flip tooltips and aria-labels (live switch EN to BN and back, home and astrolabe page, on/off and flipped wording); settings crown (no hard knurl teeth, same size, gear and hover turn kept, captured at 1x, 1.25x, 1.5x and 2x); logo B in header, favicon, icon.svg, PNG sizes 32/128/256/512 and ICO 16-256.
- scripts/e2e-v220.mjs 115/115 (the tick probe now reads the main Fard tick; logo checks point at logo B), scripts/e2e-v211.mjs 104/104, scripts/e2e-v210.mjs 46/46 (its 0.80 tick rule replaced by the ranked sizes).

Not done / limitations: no Windows installer was built (needs Windows and Rust). The Bangla tooltip screenshot overlays the tooltip text next to the button, because headless Chrome does not draw native title tooltips; the title attribute itself was read back by the test. Rendering checked in headless software rendering only.

### v2.2.0 (built on 2.1.1): countdown panel, crisp astrolabe, Rotate toggle, premium buttons, new logo, location plate and crown, never shrink the UI

Automated verification (all actually run):
- `npm test`: 372 tests, 371 passed, 0 failed, 1 skipped (the GitHub Actions workflow check, skipped when `.github` is not in the folder). New: tests/v220.test.js (7 tests). Older tests that asserted retired 2.1.1 details (fit-to-window zoom, old coordinates pill, old logo clauses, version strings) were updated on purpose.
- `npm run check` passed. `npm run web:build` passed.

Browser verification (headless Chrome, Asia/Dhaka fixed clock):
- scripts/e2e-v220.mjs: 115 checks, 115 passed (countdown panel and centred card for Fard and voluntary with and without a preferred card; rotation locked until Rotate is on; flip; clearance from the panel borders; identical sizes with 1, 2, 3 and 4 events in EN and BN at 3 window sizes; sharpness structure at 1x and 2x on home, expanded and the header astrolabe).
- scripts/e2e-v211.mjs: 104/104 passed after enabling Rotate in its drag, expanded and reset steps (and turning it off for the plain-click step). scripts/e2e-v210.mjs: 46/46 passed.
- scripts/audit-layout-v211.mjs: 392 views (EN/BN x 7 window sizes x 2 font families x 14 scenes). Two real findings fixed: at about 1000 px wide the clock card text wrapped letter by letter once the fit-zoom was gone, and at 420 px the Rotate/Flip pair met the Bangla instrument text. Remaining: 4 views where the transient "Prayer marked complete" toast overlaps one line for a moment (known, unchanged from 2.1.1).

Not done / limitations: no Windows installer was built (needs Windows and Rust). Sharpness was verified by measuring stroke and text sizes in device pixels and by before/after crops in headless software rendering; a real GPU on a real Windows display was not available. The home astrolabe is about 219 px, so its smallest labels stay small even though they are now rendered at least 1.4x larger in device terms where they were below the readable floor.

### v2.1.1 (built on 2.1.0): calm pause card, astrolabe page, enlarged detail, coin flip, reward fix, clock 6/9 spacing

Automated verification (all actually run):
- `npm test`: 365 tests, 364 passed, 0 failed, 1 skipped (the GitHub Actions workflow check, skipped when `.github` is not in the folder). New: tests/v211.test.js (6 tests: EN/BN-only detail text, detail structure, astrolabe page/flip/click-vs-drag wiring, forbidden card, reward wiring, clock numeral placement). A few older tests were updated on purpose (version strings, retired wording, the single-SVG sky check).
- `npm run check` passed. `npm run web:build` passed.

Browser verification (headless Chrome, Asia/Dhaka, fixed clock):
- scripts/e2e-v211.mjs: 104 checks, 104 passed. Covers the forbidden card (EN/BN, amber edge, no overflow, progress bar advancing), astrolabe click vs drag vs double-click vs Enter, the astrolabe page (top-bar clock live, cards, Back), detail layers at large size only, the coin flip (3D, mirrored drag direction, upright star labels), rotation and flip saved and restored after reload, Home resetting rotation only, and rewards (fard tick, voluntary Mark Complete, day complete, EN and BN, shown for the Settings seconds and then cleared).
- scripts/e2e-v210.mjs (regression): 46/46 passed.
- scripts/clock-numerals.mjs: measured gap between the baton and the glyph ink for 6 and 9 = 5.2 units for both, EN (6, 9) and BN (৬, ৯), on home and expanded clock; both glyphs centred on the hour axis (offset 0.0). Close-ups in shots211/clock-closeup-*.png.
- scripts/audit-layout-v211.mjs: 280 views (EN/BN x 7 window sizes x 2 font families x 10 scenes). Two real findings, fixed and re-run clean: the top-bar clock digits touched the date line on the astrolabe page at 1920x1080; the Bangla version of the same. Remaining reported item: at 420x700 with the serif font, the transient "Prayer marked complete" toast floats over a list line for about 2.5 s (a toast is an overlay by design).

Not done / limitations: no Windows installer was built (needs Windows + Rust); notifications and autostart need the real Tauri shell; headless Chrome only (no real GPU, no touch hardware). The new voluntary reward wording still needs a qualified religious review. The 6 and 9 have the same gap to their batons; their ink centres differ by about 1 unit because the glyphs differ in height and width.

### v2.1.0 (built on 2.0.1): watch-style astrolabe and clock, expanded clock page, text-safe layout, voluntary ticks, rewards, preferred-time reminders

Automated verification (all actually run):
- `npm test`: 359 tests, 358 passed, 0 failed, 1 skipped (the GitHub Actions workflow check, skipped when `.github` is not in the folder). New: tests/v210-dial-physics (8), v210-preferred-reminders (11), v210-voluntary (6), v210-structure (10).
- 22 older tests asserted 2.0.1 implementation details that v2.1.0 replaces on purpose (old astrolabe CSS classes, 3.3rem Mark Complete, rak‘ah-set controls, line-clamps, 2.0.1 version strings). Version strings were updated; 45 individual obsolete assertions were commented out with the marker "[retired in v2.1.0: superseded 2.0.1 design]" and are listed in the test files. Behavioural replacements are covered by the v210 tests and the browser tests below.
- `npm run check` passed (new modules included). `npm run web:build` passed.

Browser verification (headless Chrome 1920x1080 ... 420x700, Asia/Dhaka, fixed clock; scripts/e2e-v210.mjs, 46 checks, 46 passed):
- Tick diameter measured = 0.800 x Mark Complete height for Fard, Sunnah, Nafl and voluntary ticks at 1280x720@1x, 1366x768@1.25x, 1920x1080@1.5x and 1024x640@1x.
- Astrolabe: mouse drag, flick momentum with smooth stop, Shift fine mode (about 8x smaller rotation for the same drag), wheel and arrow-key glides, double-click reset (smooth, about 0.5 s), stage stays square. Also usable from the top bar on the expanded clock page.
- Clock click opens the expanded page; astrolabe moves to the top bar and is still rotatable; Back restores both instruments.
- Voluntary event: Mark Complete + 6 ticks, no old rak‘ah-set UI; 3 ticks = 6 rak‘ahs; persisted in localStorage and kept after reload; >12 input rejects empty, abc, -4, 12, 13, 3.5, 0, 1000000 and accepts 14 and 20; un-ticking recomputes.
- Reward text for Duha appears on Mark Complete and disappears after the configured 3 s; Fard recognition keeps its own duration with voluntary seconds set to 1; voluntary seconds persist (17) and out-of-range values are clamped.
- Settings: Calculation Profile always open; two preferred-time reminder tabs switch; the "before ends" switch persists independently of "before begins".
- Layout audit (scripts/audit-layout-v210.mjs): 120 views (EN and BN x 6 window sizes x 2 font families x 5 pages) plus 420x700 and the final fixes re-run: text-node rectangles checked for overlap, clipping by overflow ancestors, off-screen text and horizontal scroll. After the fixes the re-runs at 1024, 640 and 420 wide reported 0 issues; the first full pass had been clean for Bangla at every size. The final CSS was not re-audited at every size after the last Bangla/dictionary edit.
- Bangla crawl (home, voluntary, expanded clock, settings with reminder tabs): no Latin text left except font names, "Google Maps", "Dhaka", the Shift key name and a URL placeholder.
- Preferred-time reminders: verified by unit tests with mocked time (fires once, not early/late, restart and clock-change safe, only prayers with preferred periods). The live notification path in the Tauri shell was NOT exercised.

Not done / limitations: no Windows installer was built (needs Windows + Rust); notifications and autostart need the real Tauri shell and were not run; the page may scroll on small windows instead of shrinking below 70 %; Fard recognition phrases in the progress disc are still Arabic script (existing 2.0.1 feature, outside the astrolabe).

### v2.0.1 (rebuilt on the v1.8.1 project): Bangla, Qur’an-first cards, new astrolabe, 60/40 panel, Mark Complete, Undo relocation, reward disc, no-scroll fold

Automated verification:
- `npm test`: 323 tests, 323 passed, 0 failed (new: tests/v201-astrolabe-layout.test.js, tests/v201-evidence-order.test.js; older assertions about the previous layout were updated on purpose).
- `npm run check` (syntax of every module) passed; `npm run web:build` (Vite production build) passed.
- Astronomy checks in the tests: the sun’s declination matches the ecliptic after the rete is turned by sidereal time on five dates across the year; sun and moon drawn with their true angular-diameter ratio; traditional plate orientation.

Browser verification (headless Chrome against the Vite build, Asia/Dhaka, fixed times, English and Bangla):
- Windows 1920x1080, 1280x720, 1024x640, 800x500, 600x800, 420x700 at several prayer times (1 to 4 open events): the bottom of the Today’s progress row is inside the window every time; no horizontal scroll; astrolabe/clock measured at exactly 60 % / 40 % with equal heights.
- Tick leaves the card open; Mark Complete closes it; Undo prayer is absent on the homepage and present bottom-right on every recorded card of the day page reached from Weekly Prayer Progress; +2 rak‘ahs adds nafl; no console errors or page errors.
- Bangla crawl of home, ticks, sub-ticks, +2, description dialog, day page, undo, countdown and settings: no remaining Latin text except proper names the user typed (place), font family names and URLs.

Build note: the Windows installer (`npm run build`, Tauri/NSIS) needs Windows plus the Rust toolchain and was not built here. The ZIP is the full source project.

### v2.0.1 header, 60/40 instruments, sixth voluntary card, Mark completed rule

Automated verification:
- 308 tests: 303 passed, 0 failed, 5 skipped (the 5 skips are the GitHub Actions workflow checks, which skip when `.github/workflows/build-windows.yml` is not inside this project folder, plus 1 older skipped test). Before this update the same 2 workflow checks failed in a copy without the `.github` folder.
- `npm run check` (syntax of every module) passed.
- `npm run web:build` passed (Vite production build).
- New `tests/v201.test.js` (10 tests) covers: version 2.0.1 everywhere; header layout and Coordinates card (English and Bangla digits); new logo, favicon, header mark and Tauri icon sizes; Local time card carrying the date and the 3fr/2fr (60/40) row; the removed strip and the sixth card; the Voluntary legend and Bangla label; rak‘ah sets leaving the Additional worship cards; ticks never closing an event card; square Mark completed / Undo prayer buttons; Bangla strings; `closed` flags in migration and backup merge.
- Older tests that asserted the previous behaviour on purpose were updated (version strings, `Location:` subtitle, the +2 control moved into the voluntary list, rak‘ah controls removed from voluntary cards, square Undo prayer button, `.other-voluntary-card` glow).

Browser verification (headless Chrome against the production build, English and Bangla, fixed time 20:00 Asia/Dhaka):
- Widths 1920, 1280, 1000, 800, 700, 640, 420 and 360 px: astrolabe/clock widths measured at exactly 60% / 40%, equal heights, nothing overflowing either card, no horizontal scroll; Voluntary prayers shows 6 cards (3 columns, 2 columns below 780 px, 1 column below 420 px).
- Ticking the Fard tick, every sub-tick and a voluntary tick left every event card open; Mark completed closed each card and the closed state survived a reload; weekly Undo prayer reopened the card; a revise card offered the rak‘ah count and wrote it back on Confirm record.
- +2 rak‘ahs three times then Undo prayer gave 6 then 4 nafl rak‘ahs and no rak‘ah controls appear in the Voluntary prayers cards.
- No console errors or page errors.

Build note:
- A Windows installer (`npm run build`) needs the Rust/Tauri toolchain and Windows; it was not produced in this environment. The ZIP is the full updated source project.

### v1.7.1 situational prayer tracking and compact window layout

Automated verification:
- 290 tests passed, 1 skipped, 0 failed.
- JavaScript syntax checks passed.
- Situational pair-count accumulation, set registration, custom even rak'ah counts, Janazah's non-rakah handling, migration and backup merge covered by tests.
- Screenshot-targeted transparent-circle removal and frameless title strip covered by source tests.
- Version metadata updated to 1.7.1 across package, Tauri and Rust metadata.

Build note:
- `npm run web:build` could not run because Vite is not installed in this environment (`vite: not found`). The ZIP is the complete updated source project; a compiled Windows installer has not been produced or verified here.

Manual Windows checks still recommended:
- Verify frameless titlebar drag, minimize, maximize/restore and close on Windows 10/11.
- Record multiple two-rakah situational prayers, confirm the sequential 500 ms message and 500 ms golden glow, restart the app and verify totals remain.
- Test backup export/import and historical weekly records.

### v1.6.1 countdown layout, evidence and observatory refinements

- Expanded countdown page now uses three horizontal layers: full-width main countdown; two equal cards for preferred-time countdown and prayer information/completion; full-width event timing.
- Preferred-time countdown is updated independently on every visible one-second tick; static prayer details and interactive completion controls are no longer rebuilt every second.
- Prayer information uses the existing school-specific evidence set, rendering Qur'an first and hadith second when both exist, then rak'ah guidance. Completion and recording controls are in the same visible prayer card.
- Celestial Observatory uses engraved astrolabe-style solar/lunar markers; moon marker scale is 0.58 of the solar marker. Astronomy engine and information are unchanged.
- Removed the transparent radial-glow circle from the home-page SVG.
- `npm test`: **285 passed, 1 skipped, 0 failed** (286 tests total).
- `npm run check`: passed all JavaScript syntax checks.
- HTML parsed successfully with Python HTMLParser; ZIP integrity checked after packaging.
- `npm ci --ignore-scripts --no-audit --no-fund`: timed out in the supplied environment. Vite is therefore unavailable; no production frontend bundle or Windows installer is claimed.
- Manual visual verification in a running WebView/Windows build: not performed in this environment.

### v1.6.1 manual verification checklist

1. Open a main prayer countdown. Confirm the main countdown occupies the full first row.
2. Confirm the preferred-time countdown and prayer information/completion card appear side-by-side at equal width on desktop; verify the preferred countdown changes every second and transitions from upcoming to active to expired.
3. Confirm the prayer information card shows the Qur'an line first when available, hadith second, rak'ah guidance and the completion/recording controls without opening another panel. Check a Friday Dhuhr/Jumu'ah event.
4. Confirm event timing occupies its own full-width horizontal row beneath the two cards.
5. Confirm the sun and smaller moon are fully visible as engraved astrolabe markers, while their positions and paths continue to update; verify the transparent circle is absent.
6. Repeat on a narrow window and in Bangla; confirm the cards stack cleanly and controls remain usable.

### v1.5.1 always-visible worship cards and Abbasid observatory artwork

- `npm test`: **280 passed, 1 skipped, 0 failed** (281 tests total), including new regression coverage for inline voluntary/situational card content, hours-and-minutes countdown wiring, and the vector observatory artwork.
- `npm run check`: passed all JavaScript syntax checks.
- `npm ci --ignore-scripts --no-audit --no-fund`: timed out in the supplied environment. `npm run web:build` therefore remains unavailable because Vite is not installed; no frontend bundle or Windows installer is claimed.
- Manual visual verification in a running WebView/Windows build: not performed in this environment.

### v1.5.1 manual verification checklist

1. Confirm each voluntary prayer card shows its evidence, rak'ah information, countdown and available record action without expanding the card.
2. Confirm countdowns read in hours/minutes only (for example, `in 3h 54m` / `ends in 25m`), update live, disappear after the window and still open the focused countdown page when clicked.
3. Confirm situational cards show their evidence, prescribed rak'ah information and completion checkbox directly in the card.
4. Switch English/Bangla and verify the cards remain readable in both languages.
5. Confirm the observatory shows the hand-drawn sun/moon and geometric manuscript treatment while its numerical positions, phases, path, prohibited intervals and footer information continue to update.

### v1.5.0 compact worship-card refinement

- Automated Node test suite: 277 passed, 0 failed, 1 skipped (278 total).
- JavaScript syntax checks: passed (`npm run check`).
- Vite production build: not run; Vite is not installed in the supplied project environment (`vite: not found`).
- Manual visual verification in a running WebView/Windows build: not performed in this environment.

# Test results — Prayer Times Desktop v1.5.0

## v1.5.0 verification

- `npm test`: **275 passed, 1 skipped, 0 failed** (276 tests total). Added regression coverage for live expanded-clock updates and historical-date/prayer-specific weekly evidence.
- `npm run check`: passed all JavaScript syntax checks.
- `npm run web:build`: not completed because the dependency installation timed out and Vite is unavailable in this environment. No production frontend bundle or Windows installer was generated.
- Windows WebView2 visual QA, native notifications, tray integration and installer execution were not performed in this environment.

### Manual verification checklist for the Windows build

1. Open the main clock from Home. Confirm the clock and countdown update live, and the active/next prayer focus changes at the correct event boundary.
2. Open a weekly day card for a Friday with a recorded Dhuhr/Jumu’ah. Confirm the Friday-specific label and evidence appear even when Home is displaying another date.
3. Open a weekly day containing Fard, Sunnah, Nafl, standalone voluntary and situational completions. Confirm each card identifies the specific prayer and uses its matching evidence.
4. Confirm Qur’an evidence appears before hadith whenever available, for both Sunni and Ja‘fari profiles.
5. Switch English/Bangla and confirm the weekly detail page remains correctly localized.

---

## Historical test results — Prayer Times Desktop v1.3.5

## Windows CI failure (v1.3.0, windows-2022, 88/89)

- Failing test: `tray tooltip is wired cheaply and the tray keeps its menu` (tests/tray-tooltip.test.js).
- Root cause: the test checks source text with a regex that contains `\n`. On Windows, Git checked the files out with CRLF, so the regex did not match. Linux checkouts use LF, which is why it passed there.
- Fix: every test reads files through `tests/helpers/read-text.js`, which strips CRLF and BOM. `.gitattributes` keeps text files LF. The workflow sets `core.autocrlf false` before checkout. `tests/determinism.test.js` fails the suite if a test reads a file without normalising it or uses the real current date.

## Automated checks

- `npm test`: **246/246 passed** (v1.3.3; was 224 in v1.3.1). New test files:
  - sound
  - calculation-methods
  - time-format
  - day-status
  - daily-reflections
  - ui-fonts (10 options, sanitising, files, licences, size, CSS variable)
  - v1.3.2: progress-lines, prayer-evidence, prayer-card-notes, prayer-boundary, day-timeline, tick-lock, interval-rows, sky
  - determinism
  - workflow hardening
- Matrix: all 246 passed in every combination below (with `.gitattributes` present; with the file absent the one `.gitattributes` test skips and the other 245 pass).
  - CRLF copy of the whole project × `LANG=C`.
  - Time zones: UTC, Asia/Dhaka, America/Los_Angeles, Europe/London, Asia/Tehran, Pacific/Kiritimati, America/St_Johns.
  - Faked system clock (a Date preload): Ramadan last-ten night, both Eids, a Friday, the EU DST changes on 29 Mar and 25 Oct 2026, 00:30 before Fajr, and 31 Dec 2028 23:59.
- `npm run check`: passed.
- `npm ci` from the committed lockfile: passed.
- `npm run web:build`: passed.
- `cargo check --locked --target x86_64-pc-windows-msvc` (Rust 1.99.1, on Linux, with a stub resource compiler): passed. This checks that the code compiles only. It does not link a Windows .exe.
- Prayer times were compared with adhan-js and praytimes.org reference values for every method and school, and agree within 1 minute. Every method × school × high-latitude rule gives correctly ordered times across the dates and latitudes tested, including 60°N in June.

## Browser QA (headless Chrome, built frontend, mocked clock, TZ Asia/Dhaka)

- Coverage:
  - Every screen: home, countdown, settings, calculation profile, shortcut guide.
  - All 10 themes × EN/BN × normal/compact, half of them in 12-hour mode.
  - Widths 640–3840 in 12-hour mode.
- Result: **0 console errors and 0 overflowing or ellipsis-truncated elements.**
- Status line / progress card: 21 fake-date scenarios (Ramadan, Eid, Arafah, Ashura, white days, night 27, plain days at several times, Friday, Ja‘fari, no location, EN/BN, 12h/24h) report zero problems. Ordinary days show the conversational progress line; date-specific headlines keep priority.
- Fonts (Settings → Font): all 10 real options, i.e. System default plus the 9 bundled fonts, were run with EN/BN × normal/compact × widths 640/1024/1440/2560 in 12-hour mode, on a long-reflection day, a last-ten-nights day and a Friday (160 page loads; countdown and Settings screens at 640 and 1440). 0 console errors, 0 overflow, 0 ellipsis truncation, status text never overlaps the figure. Each run also checks that the font file actually loaded (no decode or network error) and that body text and buttons use the chosen family. A font choice saves, an unknown saved value falls back to System, and settings saved by older versions load with System.
- Clock: the Settings toggle switches every visible time and is saved. Default 24-hour output is byte-identical to v1.3.0.
- History migration: v1.2.8, v1.2.9, v1.3.0 and malformed saved data all load with no errors. Fard and voluntary records are unchanged, the weekly view draws 7 mini figures, and invalid settings fall back to their defaults.
- Keyboard: ? opens and Esc closes the guide; End, Home and PageDown scroll; F11 calls set_fullscreen; shortcuts are ignored while typing.
- Sound: ticking with sound on creates one AudioContext; with sound off it creates none.

## v1.3.2 browser QA (headless Chrome, fake clock and fake timers, TZ Asia/Dhaka)

- Full-day simulation (`day-sim`): midnight to midnight in 1-minute steps plus every boundary ±1 s, with hide/restore and clock-jump edges, for Hanafi, Shafi‘i and Ja‘fari × EN/BN × 12h/24h, on a Friday, a plain Tuesday, a Ramadan-end night and both Eid days. **0 problems** in 18 scenarios (about 1,500 snapshots each).
  - Checked each step: hero = next event of any kind from one timeline, never 00:00:00; "Current" never stale; live section is first; interval rows; lock state; tray tooltip; reminders.
- Lock QA: tick and untick before the next event, lock after it, persisted flag, click / Enter / Space ignored, tooltip and aria text, old history, weekly view. **ALL OK.**
- Reference section: 10 fonts × themes × normal/compact × EN/BN × widths 640–3840, **0 overflow**. Fonts QA: no problems.
- Sky panel: night, dawn, midday and dusk screenshots in dark and ivory themes; transform/opacity-only animation; paused when hidden.

### Bugs the full-day hunt found and fixed (v1.3.2)

1. Hero stuck at 00:00:00 after an event began, and "Current: Isha" shown after Fajr: refresh now runs at the exact boundary, on a 1 s check, and on gaps, clock-back, day change and visibility change.
2. Hero counted only prayers: now one ordered timeline (prayers, prohibited times, Ja‘fari midnight) with same-instant priority.
3. Tray tooltip, reminders and hero could disagree at a boundary: all use the same timeline.
4. A hard-coded profile label in the hero and untranslated Bangla headings.
5. Bangla "events" text corrupted by a replace.
6. `toggleSubPrayer` untick path referenced an undefined `kind` (now `layer`); `togglePrayer` untick now clears the saved time.
7. Lock QA caught an imported function used as a truthy flag, which marked every live button as locked: replaced with the lock text and a regression test added.
8. Sky panel: star radius compounded on resize; the altitude label could read "−1° above the horizon".
9. Compact Bangla at 3840 px: the live-event note overflowed; it now wraps.
10. Four tests assumed the Dhaka time zone or a longitude beyond ±180°: now independent of the machine zone (Kiritimati UTC+14 included).

### v1.3.2 rule fixes (second pass)

- No wording about missed prayers anywhere in the progress lines (the whole "Missed one" family is gone); a test scans every enumerable line in EN and BN.
- Heads-up cycle: reaction right after a tick, then plain facts, then the next-prayer heads-up only inside its learned 20-45 min window; Duha/Awwabin heads-up only in the 10 minutes before they open; none for batch-tickers. A day-simulation test asserts no heads-up outside its window.
- Variety: 398,054 English and 426,109 Bangla distinct lines (`variantCount`; a test asserts at least 100,000 each).
- Top layout: Available right now (live card and any prohibited-interval row), then one Next event card; the duplicate "next prayer event" row and empty-state card are gone.
- Sky panel: taller strip, large glowing sun (16 rays) and crescent, stepped retro halos, scanlines, 72 brighter stars.
- Checked again: full-day simulation (18 scenarios) 0 problems; CRLF copy, no-`.gitattributes` run and the time zones UTC, Kiritimati and Los Angeles all pass.

### v1.3.5 results

- `npm run check`: passed all JavaScript syntax checks.
- `npm test`: **252/252 passed**, 0 failed (serial test execution; 33.7 seconds).
- CSS parsed with tinycss2: 0 stylesheet parse errors. Project metadata JSON validated.
- The previous star/cloud scene and unused arc/star helpers were removed; the retained astronomy calculations and exact forbidden interval mapping remain covered by tests.
- Not run in this environment: Vite production build (npm dependency installation could not complete), Rust/Cargo and Windows PowerShell checks (toolchains unavailable), Windows WebView2 fullscreen/mouse testing.
- Screenshots were not captured: the available headless Chromium runtime was blocked by the execution environment. A real Windows visual pass remains required before release.

### v1.3.4 results

- `npm run check` passed. `npm test`: **254/254** (LF) and **254/254** on a CRLF copy with `LANG=C`. New/changed tests: v134 (sky colours, zone accuracy, sound, layout, fullscreen wiring), sections-settings (per-card toggles, seasonal reminder rows), progress-lines (Bangla natural-phrasing check; the 100,000-line minimum checks were removed as requested, repeated-word, length and banned-wording checks kept).
- Browser QA (headless Chrome, fake clock, TZ Asia/Dhaka): main screen, sky, forbidden state, Bangla header and settings screenshots with no page errors; `lock-qa`: all checks OK except the one that read the removed 7-day History strip (expected, item 12). `day-sim` and `fonts-qa` were not re-run this round (budget); they last passed on v1.3.3.
- Not verified (Windows only, uncompiled here): the `set_window_fullscreen` Rust command (F11 mouse fix), the v1.3.3 native toast command, and the 20%-larger Fard tick and card ornament on real WebView2 rendering.

## v1.3.3 notes

### v1.3.3 results

- `npm test`: 246/246 (LF); CRLF copy with `LANG=C`: 246/246; without `.gitattributes`: 245 pass + 1 skipped. New: card-countdown, sections-settings, windows-notifications, reopen tests in progress-lines, zone/time-axis tests in sky.
- Browser QA (headless Chrome, fake clock, TZ Asia/Dhaka): `day-sim` (4 groups, Hanafi/Shafi'i/Ja'fari, English/Bangla, 12h/24h, edge dates) found no hero, forbidden-card, heading, reminder or notification problems. Its only findings are 19 daily-countdown readings that are one minute off at a sub-second sampling instant (the line refreshes every second; benign). `fonts-qa` (80 runs): no problems. `lock-qa`: all OK.
- Screenshots: /workspace/mock/v133-*.png.

### Windows 10 notifications

**Root cause (from reading the sources of tauri-plugin-notification 2 and notify-rust 4.19, and the NSIS bundler):**
- A Windows toast is shown only if its AppUserModelID (AUMID) is registered, which for a desktop app means a Start Menu shortcut carrying that AUMID. The NSIS installer's shortcut carries the bundle identifier `com.prayertimes.desktop`.
- The plugin sends every toast with that identifier (unless the exe sits in a `target\debug` or `target\release` folder) and throws away the result of `show()`. With no matching shortcut (portable copy, installer run without shortcuts, deleted shortcut, a stale shortcut from an older identifier) Windows 10 drops the toast without an error. The page also marked the reminder as sent, so it was never retried, and the plugin's permission call always answers "granted" on desktop, so nothing in the app ever showed a problem.

**Fix:** `notify_native` (src-tauri/src/main.rs) sends the toast itself with notify-rust. It uses the app identity when `Prayer Times.lnk` exists in the user or common Start Menu, otherwise the always-registered PowerShell identity (shown under that name, but shown). It returns the real error string. The page calls it first and falls back to the plugin only if the command is missing. A failed reminder is forgotten and retried. "Send test notification" in Settings reports the path used and a diagnosis (shortcut found or not, Focus assist, Windows notification settings).

**Verified here:** the page logic, fallback rules, retry-on-failure and the Settings button (unit tests and fake-clock browser QA with a mocked `invoke`); `Cargo.lock` is consistent (`cargo metadata --locked`); the notify-rust 4.19 API usage (`Notification::app_id(&str)`, `show()` returning a Result) was checked against the crate source.
**Assumed (not verified):** that the Rust compiles on Windows (this Linux box has Rust 1.85 and no Windows target, so `cargo check` cannot run, and the earlier v1.3.2 check does not cover the new code); that the NSIS shortcut is named `Prayer Times.lnk` in the Start Menu Programs folder; the behaviour of Windows 10 itself, including Focus assist.

### Manual test checklist (Windows 10 x64, installed NSIS build)

1. Install with the NSIS installer (not a copy of the exe). Confirm `Prayer Times` appears in the Start Menu.
2. Open Settings > Windows integration > Send test notification. A toast should appear and the status line should say the app's own identity is used.
3. Rename or delete the Start Menu shortcut, restart the app, press the button again: a toast under the name "Windows PowerShell" should appear and the status should say so. Restore the shortcut.
4. Turn Focus assist / Do not disturb on: the toast goes to Action Center (expected); confirm the status text mentions Focus assist when nothing is shown.
5. Settings > Notifications: set a reminder a few minutes ahead and confirm the toast arrives once, while the window is hidden in the tray.
6. Close the window to the tray, click the tray icon and confirm Today's progress shows a different line each time; clicking the tray icon while the window is already visible must not change it.
7. Hide and show Prayer descriptions, Sunnah & Seerah and On this day in Settings; restart the app and confirm the choice is kept.

## Not verified here (needs Windows hardware)

- Native .exe link and NSIS bundling. These are expected from the GitHub workflow.
- WebView2 rendering with Segoe UI / Nirmala UI.
- Tray tooltip, notifications (see the v1.3.3 notes above), the Rust build of the new native commands, F11 and audio output on a real Windows desktop.
- Authenticode signing with a real certificate.


### v1.3.5 update verification

- Automated Node test suite: 252 passed, 0 failed (serial test execution; 33.7 seconds).
- JavaScript syntax check: passed (`npm run check`).
- Vite production build: not run; npm dependency installation could not complete in this environment.
- Rust/Windows build checks: not run; Cargo, Rust and PowerShell are not installed in this environment.
- Manual Windows fullscreen/mouse verification: still requires a Windows 10/11 run.

