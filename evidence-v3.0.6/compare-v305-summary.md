# v3.0.5 vs v3.0.6 side by side (final code, rerun alone 23 Nov 2026 ~20:55 UTC)

Same data, same faked clock (23 Nov 2026 14:00 Asia/Dhaka, Dhaka location), 7 views x 2 widths (1280, 420) x EN/BN = 28 pairs; scripts/compare306.mjs.
v3.0.5 served from the untouched v3.0.5 folder, v3.0.6 from the final build folder. Page errors: 0 in both, every view.

Text differences (text-diff.json), all traced to A–M (identical to the first compare run):
- Hijri date 13 → 12 Jumada II 1448 with "Predicted by crescent visibility" (H). v3.0.5 used Umm al-Qura (13th); the crescent prediction for Dhaka starts Jumada II on 12 Nov, so 23 Nov is the 12th.
  Knock-on of H: the "White Days · 13th of the month" banner is not shown on the 12th (it shows on the 13th–15th as before, now labelled "Predicted by crescent visibility"), so the ordinary "Dhuhr’s here" status line shows instead.
- Sun/Moon line: AZ 220° → 219°, Moon −22° → −23°, 98% → 97%; moonrise 15:50 → 15:52, moonset 05:43 → 05:46 (M, DE442S).
- Blessed Reminder: Juz’ 13 Yusuf 12:53–55 → Juz’ 18 An-Noor 24:11, "Mark as read", "0 of 9 passages read today" (A, C, D). v3.0.5 showed "1 of 69" (automatic count).
- Today’s portion: 9 passages with Mark as read buttons (was 69 = one juz’), "passages behind this year" (B, F).
- Settings: "This month: 0 of 30 parts" → "1448 AH: 0 of 2,739 passages read" (F); plan note rewritten (D/G); About credit for moon-sighting / DE442S / tz-lookup (J) and the polar-limit sentence (H).
- Version label v3.0.5 → v3.0.6 (K).

Astrolabe instrument (instrument-*.png, threshold 24/255): changed pixels 0.12–0.17 % of the instrument, only around the sun/moon markers and pointer lines (positions moved by ~1° with DE442S) and rete anti-aliasing. astro EN 1280 differs in height by 1 px (446 vs 447, layout rounding), not pixel-compared. src/astrolabe-view.js and src/astrolabe.js are byte-identical to v3.0.5.
