# v3.0.3 checklist: one row per line of the approved command

Built on v3.0.2. Evidence files are in `evidence-v3.0.3/`. Unit tests: `tests/v303.test.js` (L1–L8). Browser checks: `scripts/e2e-v303.mjs`, run against a Vite dev server started **from the unzipped release folder** (`Prayer-Times-v3.0.3/`, after `npm ci`).

| # | Command line / sub-check | Evidence | Result |
|---|---|---|---|
| 1 | Mark Complete on "Record previous prayer" cards (Fard and voluntary) | `eventCardElement` always renders the footer; late cards carry `data-mark-late="1"`. e2e [1]: every late card has it (EN/BN); screenshot `L1-record-previous-mark-complete-*.png` | PASS |
| 1a | Same completion flow as the home card | `markEventComplete(…, { late: true })` is the same function; it runs only after the end, before the record-window lock, if the card is not closed. e2e [1] | PASS |
| 1b | Records marked "recorded after its time" / "সময়ের পরে রেকর্ড" | e2e [1]: `late['fard:fajr']`, `late['voluntary:duha']`; the daily record shows the note for both (EN/BN) | PASS |
| 1c | Choose rak'ahs on the card, then Mark Complete | e2e [1]: two Duha circles, then Mark Complete, gives `rakahs.duha = 4`, card closed | PASS |
| 1d | Friday rule, ordered ticks, sound, rewards | e2e [1]: Friday records Jumu'ah, not Dhuhr, late. A skipped circle is refused. The oscillator count is above 0. The voluntary reward panel shows. The toast shows. | PASS |
| 2 | Undo shows only that prayer | e2e [2]: Fajr and Duha closed, then undo Fajr: only Fajr comes back (EN/BN); `L2-undo-only-that-prayer-*.png` | PASS |
| 2a | Open time: normal heading; passed: Record previous prayer | e2e [2]: undo of the open Dhuhr re-opens it under the live heading, with nothing under Record previous prayer. The Fajr undo after its time goes under Record previous prayer. | PASS |
| 3 | Partly ticked or unticked late voluntary stays until the window closes, then goes | `lateRecordable` voluntary = `voluntaryCanEdit`. e2e [3]: partly ticked Duha stays (also after a reload); an unticked Duha returns; after the Asr lock it is gone (EN/BN) | PASS |
| 4 | Passages rebalanced toward ~2,760 covering all 6,236 verses | 2,739 passages, 6,236 verses each once (unit L4, e2e [4]). **Deviation: 21 short of ~2,760.** See the passage notes below. | PASS (closest reachable) |
| 4a | No passage over 10 verses | Max 10, 0 over 10 (unit L4, e2e [4]). Four list sentences were cut at an "And …" item boundary: 23:8 \| 23:9, 53:44 \| 53:45, 70:27 \| 70:28, 81:5 \| 81:6 | PASS |
| 4b | 5–10 group close to 26 | **87, not ~26.** `evidence-v3.0.3/five-to-ten.tsv` shows that none of the 87 has a legal split. 43 have no sentence end in both translations; 44 end a sentence only before a verse that leans back. Any further split would cut mid-sentence. | PASS (proved minimum under the rules) |
| 4c | Mid-sentence fixes kept: lean-back rule, never cross a juz', min two verses unless standalone | `scripts/build-passages.mjs` (rules documented in the header); 0 juz' crossings; rebuild = shipped file | PASS |
| 4d | Re-hand-check ≥ 300 split points, EN and BN | 736 points viewed in 6 rounds (see below), EN and BN side by side | PASS |
| 4e | Report count, distribution, per-day spread incl. day 29 of a 29-day month | See the passage notes below and `evidence-v3.0.3/passages-per-day.json` | PASS |
| 5 | Read more on the 232 long verses (> 350 chars): short preview, never cut in the data | `isLongVerse` = 232 (unit L5). The preview is cut at a word boundary with "…" (display only). | PASS |
| 5a | Works in the reminder and in Today's portion, EN and BN | e2e [5]: the 2:282 preview, Read more over 1,000 chars, in both places, EN/BN; `L5-*.png` | PASS |
| 6 | Settings "Hijri date adjustment" / "হিজরি তারিখ সমন্বয়" with −2…+2, default 0 | `#hijriAdjustSelect` in Settings › Time adjustments; e2e [6] (EN/BN); `L6-*.png` | PASS |
| 6a | Persisted | e2e [6]: `hijriAdjust: 1` saved, kept after a reload | PASS |
| 6b | Shifts every Hijri date shown; prayer times unchanged | All Hijri use goes through `hijriParts`; the clock date is shifted too. e2e [6]: −2…+2 match umalqura ± n days; the prayer times text is the same | PASS |
| 6c | Juz' and month restart follow the adjusted date | e2e [6]: juz' 13 becomes 14 (+1) or 12 (−1). e2e [4/9]: day 1 is juz' 1 in each adjusted month | PASS |
| 7 | Backup export/import includes the progress switch and the Hijri adjustment | `KNOWN_STATE_KEYS` and `settingsFromBackup`. e2e [7]: the export contains both; Replace restores both (EN/BN) | PASS |
| 7a | Older backups without them still import (defaults) | e2e [7] + unit L7: switch on, adjustment 0 | PASS |
| 8 | Version 3.0.3 everywhere, label v3.0.3 / v৩.০.৩ | package.json and lock, tauri.conf.json, Cargo.toml and lock, branding.js, index.html, README, CHANGELOG, TEST-RESULTS (unit L8); e2e [8] | PASS |
| 9a | npm test, npm run check, npm run web:build pass | On the unzipped copy: 434 tests, 429 passed, 0 failed, 5 skipped; check exit 0; build exit 0 | PASS |
| 9b | scripts/e2e-v303.mjs against the unzipped build, EN and BN, ≥ 1 check per line 1–8 | 73/73 passed (`evidence-v3.0.3/e2e-v303-results.txt`) | PASS |
| 9c | 29- and 30-day months show all 6,236 verses exactly once, also at +1 and −1 | e2e [4/9]: 6 months simulated day by day in the app (Jumada II 1448: 29 days; Rajab 1448: 30 days) × adjustments 0, +1, −1: all exactly once | PASS |
| 9d | Side-by-side with v3.0.2: same data and clock, wide and narrow, EN and BN | `evidence-v3.0.3/compare303.mjs`, `compare-v302-text-diff.json`. 6 views × 2 sizes × 2 languages; differences are only the lines of this command | PASS |
| 9e | Layout 1280x720 and 420x700, EN/BN, light and dark | e2e [Layout]: 16 checks (home + Settings), no overflow, no page errors | PASS |
| 9f | Light screenshots in /workspace/prayer/shots303/ | 26 PNGs (Pearl Mint light theme), including the progress line EN/BN | PASS |
| 9g | Everything from v3.0.2 keeps working | `scripts/e2e-v302.mjs` on the unzipped v3.0.3: 102/102. Expectations changed only where this command changes behaviour: Mark Complete on late cards, 2,739 passages, previews, per-day counts, version. All 421 older unit tests pass (same kind of edits). | PASS |
| 9h | Zip with top folder Prayer-Times-v3.0.3/, no node_modules, dist or target | `Prayer-Times-v3.0.3.zip` | PASS |

## Passage notes (line 4)

- **Count:** 2,739 passages (v3.0.2 had 2,661), covering 6,236 verses, each exactly once.
- **Distribution:**
  - 1 verse: 679
  - 2 verses: 1,176
  - 3 verses: 538
  - 4 verses: 259
  - 5–10 verses: 87
  - over 10: 0
- **Why not ~2,760:** the build splits only where both the English and the Bangla end a sentence, and never before a verse that leans back. 2,739 is all that these rules allow while keeping the v3.0.2 lean-back rule. A stricter variant that also blocked fresh sentences opening with "they" gave 2,729 passages, with 104 in the 5–10 group. It was not used.
- **The 5–10 group (87):** all 87 are proved unsplittable in `evidence-v3.0.3/five-to-ten.tsv`. Of the 43 with no sentence end, 35 end only with a Bangla dari while the English sentence continues.
- **Forced cuts:** the only cuts inside a continuing sentence are the four list cuts in 4a, made to meet "no passage over 10". Each is at an "And …" list item where the Bangla ends with । or ;. Full section is one tap away.
- **Per-day spread (passages per juz' 1–30):** 69 54 73 65 67 56 81 71 69 67 63 74 69 94 83 110 84 91 133 80 82 87 146 82 112 90 145 76 176 190.
  - Minimum 54, maximum 190, average 91.3.
  - Day 29 of a 29-day month (juz' 29 + 30): 366.

## Hand-check of split points (line 4d)

736 points were viewed in 6 rounds, EN and BN together. Fixes only ever removed splits.

| Round | Points | Bad splits found | Fixed by |
|---|---|---|---|
| R1 | 104 new points | 35:17 "And that is…", 71:23 "And said…" | `leanAnd` |
| R2 | 200 random existing points (seed 303) | 89:9 "And [with] Thamud", 44:7 "Lord of the heavens" | `leanAnd`, also used in pass 1 |
| R3 | 100 random points (seed 3031) | 3:136 "Those -", 25:76 "Abiding…", 109:5 "Nor…" | `strongBack` in the pass-2 fallback |
| R4 | 100 random points (seed 3033) | 3:167 "And that He…", 14:43 "Racing ahead", 77:13 "For the Day…" | rules |
| Final | All 132 points new against v3.0.2 + 100 random points (seed 3031) on the shipped data | No new bad cut. Only the 4 forced list cuts and mild cases (below) | — |

- **Mild cases kept.** These are full sentences, so they are allowed by the rule:
  - next sentence of the same speech: 7:139, 11:122, 26:19, 7:156, 12:29, 26:86, 26:183, 27:55, 22:69, 15:35, 20:106, 36:60
  - question then answer: 56:69
- **Bangla check:** a whole-data scan found 12 splits where the Bangla has no final dari but the English ends a sentence. These are source-text style, apart from the forced 53:44, 70:27 and 81:5.

Files: `evidence-v3.0.3/R1-new-points.txt`, `R2-random200.txt`, `R4-random100-seed3033.txt`, `R1-new-points-final.txt`, `R3-random100-seed3031-final.txt`. The first R3 sample file was overwritten while fixing; its findings are listed above and the final R3 file re-samples seed 3031 on the shipped data.

## Hijri adjustment control (line 6)

- **Where:** Settings › TIME ADJUSTMENTS ("Fine-tune local timings" / "স্থানীয় সময় সূক্ষ্মভাবে সমন্বয়"), below the six minute boxes.
- **Label:** "Hijri date adjustment" / "হিজরি তারিখ সমন্বয়".
- **Control:** a drop-down with −2 days, −1 day, 0 (as calculated), +1 day, +2 days (Bangla: −২ দিন … ০ (হিসাব অনুযায়ী) … +২ দিন).
- **Note under it:** "Moves every Hijri date in the app by whole days to match your local moon sighting. Prayer times do not change."

## Honest limits

- The passage targets are reached only as far as the rules allow: 2,739, not ~2,760, and 87 in the 5–10 group, not ~26. Both are proved above.
- No Windows installer was built (it needs Windows and Rust).
- Rendering was checked in headless Chrome only.
- Backup Replace still reports some settings (tickSound, enFont, prefReminders, astro, closeFlagsSeeded) as "not available" and does not restore them. This is unchanged from v3.0.2 and outside this command.
