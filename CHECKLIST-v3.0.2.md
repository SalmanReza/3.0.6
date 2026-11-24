# CHECKLIST v3.0.2

One row per line of the approved command. Evidence: `tests/v302.test.js` (unit, `npm test`), `scripts/e2e-v302.mjs` (headless Chrome, EN and BN; results saved to `shots302/e2e-v302-results.txt`), screenshots in `/workspace/prayer/shots302/` (light theme, Pearl Mint), and the v3.0.1 comparison in `/workspace/prayer/compare302/`.

| Line | What | Evidence | Result |
|---|---|---|---|
| A1 | Countdown digits use the app font (`var(--app-font)`), tabular-nums, sizes unchanged; coordinates, keyboard help, progress core label and prayer index stay monospace | unit `A1 every countdown uses var(--app-font)…`; e2e `[A1]` ×10 (EN/BN, default fonts and after switching to Inter + Kalpurush: 7 countdowns each match the body font stack; progress core stays monospace); shots `countdown-page-font-en.png`, `countdown-page-font-bn-kalpurush.png`, `home-countdowns-font-en/bn.png` | PASS |
| A2 | Li Ador Noirrit and Bornomala retried, each licence checked; LICENSES and About updated | Bornomala v1.003 from Codepotro's own webfont host: name table says OFL 1.0, fsType 0, so it is bundled (`src/fonts/bn-new/bornomala.woff2`, `OFL-Bornomala.txt`) and replaces Lohit Bengali (a saved "lohit" opens as Bornomala). Li Ador Noirrit: the font's embedded licence and the Lipighor EULA do not allow redistribution, so it is **not bundled** and SolaimanLipi stays; this is stated in LICENSES and About. unit `A2…`; e2e `[A2]` ×4 | PASS |
| A3 | Unused "Revise event record" strings and code removed | unit `A3…` (strings, stub and CSS gone; old `revise` data still loads); e2e `[A3]` EN/BN | PASS |
| B1 | No "Record completion" on Fard and voluntary description cards | unit `B1…`; e2e `[B1]` EN/BN (0 buttons on 5 cards); shots `fard-card-no-record-en/bn.png` | PASS |
| B2 | Mark Complete stays | unit `B2…`; e2e `[B2]` ×4 (home event card, countdown page enabled while open) | PASS |
| B3 | Circles work as before while the time is open | unit `B3…`; e2e `[B3]` EN/BN (open Dhuhr ticks, no late mark) | PASS |
| B4 | "Record previous prayer" / "আগের নামাজ রেকর্ড করুন"; ticks there save and are quietly marked "recorded after its time" / "সময়ের পরে রেকর্ড" | unit `B4…`; e2e `[B4]` ×8; shots `record-previous-prayer-en/bn.png`, `daily-record-late-note-en.png` | PASS |
| B5 | Unticking in the daily record brings the circle back | unit `B5…`; e2e `[B5]` ×4 (late Fajr returns under Record previous prayer; in-window Dhuhr returns under the normal heading) | PASS |
| B6 | Cards shown until the record-window lock | unit `B6…`; e2e `[B6]` EN/BN (after Asr begins Fajr/Duha are gone) | PASS |
| B7 | Friday rules, tick order, tick sound, rewards the same there | unit `B7…`; e2e `[B7]` ×6 (Jumu'ah locks Dhuhr, WebAudio tick starts, ordered voluntary ticks, reward shown) | PASS |
| B8 | Old records load unchanged | unit `B8…` (late marks survive backup merge); e2e `[B8]` EN/BN: a v3.0.1 record is stored byte-identical to what v3.0.1 itself stores after loading the same record | PASS |
| C1 | Qiyam is an umbrella over Tahajjud and Witr | unit `C1/C2…`; e2e `[C1/C2]` EN/BN | PASS |
| C2 | Qiyam card breakdown "Qiyam al-Layl 9 rak'ahs: Tahajjud 4, Witr 3, other 2" (BN: "কিয়ামুল লাইল ৯ রাকাত: তাহাজ্জুদ ৪, বিতর ৩, অন্যান্য ২") | e2e `[C1/C2]` EN/BN; shots `qiyam-card-en/bn.png` | PASS |
| C3 | Each rak'ah counts once | unit `C3…`; e2e `[C3]` EN/BN (caption "Voluntary 9 rak'ahs") | PASS |
| C4 | Circle labels are running totals: 2,4,6… ; Witr 1,3,5…; ticking order and saved data unchanged | unit `C4…`; e2e `[C4]` ×4; shots `witr-card-en/bn.png` | PASS |
| D1 | No Arabic (data and UI); selected language only, surah name and verse numbers | `src/quran/data.json` has no `ar` (3,022,606 bytes, was 4.4 MB); unit `D1…`; e2e `[D1]` ×4; shots `blessed-reminder-en/bn.png` | PASS |
| D2 | Passages from Tanzil's 556 ruku' sections, credited CC BY 3.0 | `scripts/build-passages.mjs`, `src/quran/LICENSES.txt`, `LICENSES`, About; unit `D2…`; e2e `[D2]` EN/BN | PASS |
| D3 | About 2,760 passages | **2,661** after the hand-check fixes (see below). unit `D3/D4…`; e2e `[D3]` | PASS (count differs from the estimate, stated) |
| D4 | Split at build time; "Full section" / "পুরো অংশ" one tap away; never crosses a juz' | unit `D3/D4…`; e2e `[D4]` ×3 (crossJuz 0, crossSection 0; Full section opens and returns) | PASS |
| D5 | Long single verses shown whole, with Read more | unit `D5…`; e2e `[D5]` ×2 (no verse ever cut; a long passage shows whole leading verses up to 320 characters and Read more shows the rest). Read more appears when a passage has more verses hidden; a single long verse is shown whole, so it needs no Read more | PASS |
| D6 | Hand-check at least 300 split points | 300 (round 1) + 100 more (round 2); see "Hand-check of split points" below and `evidence-v3.0.2/handcheck-*.txt`; e2e `[D6]` | PASS |
| D7 | Subject lines in EN and BN for all 556 sections | `scripts/data/section-subjects.tsv` (556 rows) → `src/quran/sections.json`; unit `D7…`; e2e `[D7]` EN/BN | PASS |
| D8 | Themes per section; the 405 tagged verses are first picks | 11 themes; the 405 verses mark 223 passages; unit `D8…`; e2e `[D8]` | PASS |
| D9 | One juz' per Hijri day; day 29 of a 29-day month reads juz' 29 and 30 | unit `D9…`; e2e `[D9]` ×2: simulated Jumada II 1448 (29 days) and Rajab 1448 (30 days) each show all 6,236 verses exactly once (`evidence-v3.0.2/month-coverage.json`) | PASS |
| D10 | In order, advancing every 10 minutes or when the signature changes | unit `D10/D12…`; e2e `[D10]` (starts at the juz' start, moves to the next unread after 10 minutes through the app's own 15-second render) | PASS |
| D11 | Moments: gratitude, friday, dawn | unit `D11…`; e2e `[D11]` ×3 | PASS |
| D12 | No repeats within a day (per-day bitset) | unit `D10/D12…`; e2e `[D12]` EN/BN (12-character base64 bitset keyed by Hijri date) | PASS |
| D13 | Today's portion list | unit `D13…`; e2e `[D13]` ×4 (scrollable list, unread marked, opening marks read); shots `todays-portion-en/bn.png` | PASS |
| D14 | Progress line "Juz' 7 · 41 of 92 passages read today"; Settings "This month: 7 of 30 parts"; switch on and persisted | unit `D14…`; e2e `[D14]` ×6; shots `settings-reading-en/bn.png` | PASS |
| D15 | New Hijri month restarts at juz' 1; follows the app's Hijri date | unit `D15…`; e2e `[D15]` ×2 (new month → juz' 1; after Maghrib 13 → 14). The app has **no Hijri adjustment setting** (none in v3.0.1 either), so there is nothing extra to follow; the juz' follows the app's own Hijri date | PASS (no adjustment setting exists; stated) |
| D16 | Credits, evidence files and the name unchanged | unit `D16…`; e2e `[D16]` EN/BN; `src/prayer-evidence.js`, `src/prayer-card-notes.js` unchanged vs v3.0.1 | PASS |
| E | Everything 3.0.2; label v3.0.2 / v৩.০.২ | package.json, package-lock.json, tauri.conf.json, Cargo.toml, Cargo.lock, branding.js, README, CHANGELOG, TEST-RESULTS; unit `E…`; e2e `[E]` EN/BN; shots `version-label-en/bn.png` | PASS |
| QA-1 | `npm test`, `npm run check`, `npm run web:build` | see TEST-RESULTS.md (v3.0.2) | PASS |
| QA-2 | `scripts/e2e-v302.mjs`, at least one check per line, EN and BN, 29/30-day months | `shots302/e2e-v302-results.txt` (all PASS) | PASS |
| QA-3 | Side-by-side comparison with v3.0.1 (screenshots and DOM, wide and narrow, EN and BN) | `/workspace/prayer/compare302/` (home, settings, countdown, weekly day, clock × 1280×720 / 420×700 × EN/BN, both versions, `text-diff.json`, `pixel-diff.json`). Every text difference is one of the approved changes; see TEST-RESULTS.md | PASS |
| QA-4 | Layout at 1280×720 and 420×700 | e2e `[Layout]` ×8 (EN/BN, day and night, no overflow); shots `narrow-home-en/bn.png` | PASS |
| QA-5 | Light-theme screenshots in /workspace/prayer/shots302/ | all e2e pages use the Pearl Mint light theme | PASS |
| QA-6 | Zip with top folder Prayer-Times-v3.0.2/, no node_modules/dist; npm test on the unzipped copy | see TEST-RESULTS.md | PASS |

## Hand-check of split points

- Round 1: 300 split points (random, seed 302), each read in English and Bangla (`evidence-v3.0.2/handcheck-round1-300-seed302.txt`). Finding: 25 of the 300 split mid-sentence, because the Bangla "।" ends almost every verse even when the sentence continues. Examples: 8:6, 15:90, 19:3, 20:27, 37:5, 38:38, 44:19, 52:46, 54:5, 55:74, 56:8, 56:26, 56:55, 65:3, 69:16, 76:12, 95:4.
- Fix: never split where either translation visibly continues, and a longer list of lean-back openings. This removed all 25.
- Round 2: 100 more split points from the fixed build (seed 777, `evidence-v3.0.2/handcheck-round2-100-seed777.txt`): no mid-sentence cuts. Mild splits inside a dialogue remain where both translations end a sentence (e.g. 7:89, 7:139, 26:143, 36:25); they read acceptably and Full section shows the whole ruku'.
- Final count: 2,661 passages. Length: 1 verse 663; 2 verses 1,023; 3 verses 552; 4 verses 350; 5–10 verses 69; more than 10 verses 4 (23:1-11, 53:35-52, 70:19-35, 81:1-14).
- Passages per juz' (per Hijri day): 64 52 71 62 62 54 75 67 67 62 61 73 69 94 81 110 81 87 133 75 79 86 148 80 109 89 141 74 171 184 (day 29 of a 29-day month: 355).
