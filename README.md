# Prayer Times — Windows desktop application (v3.0.6)

**Windows 10/11 x64 · Tauri 2 · Rust · WebView2 · NSIS · v3.0.6**

© 2026–2027 Salman Reza Amit

Prayer Times is a local-first Windows prayer companion. It uses a native Tauri desktop shell and a bundled offline interface/calculation engine. It is not a browser extension and does not require Firefox.

## Latest update (v3.0.6)

- Mark as read: under the A Blessed Reminder passage, beside Read more / Full section / Today’s portion, a small “Mark as read” / “পড়েছি” button. Only this button counts a passage as read; showing or opening a passage no longer does. After it is pressed the card shows “Read ✓” / “পড়া হয়েছে ✓”, then the next unread passage of the day; when the whole day is read it shows “Today’s portion read ✓” / “আজকের অংশ পড়া শেষ ✓”.
- Undo read: every passage in Today’s portion has “Mark as read” or “Undo read” / “পড়া চিহ্ন সরান”; undo changes only that passage.
- The progress line reads “N of M passages read today” (e.g. “Juz’ 18 · 2 of 9 passages read today”, Bangla with Bangla digits) and counts only passages you marked; M includes any featured passage. The old automatic read counts are cleared once.
- Lunar-year plan: the 2,739 passages are read in mushaf order once each Hijri year (354 or 355 days), splitting only between passages and balanced by verse count (about 7–8 passages, 13–23 verses a day); the same year always gives the same plan. The Juz’ label shows the juz’ of today’s passages.
- Featured passages on three well-attested dates, shown first with a one-line note and its source: 9 Dhul Hijjah (Day of Arafah) 5:3–4; 17 Ramadan (Badr, labelled approximate) 8:41–44; 27 Ramadan (labelled “commonly held” Laylat al-Qadr) 96:1–5. They do not change the plan and share their read mark with the same passage in the plan.
- Read marks are kept per passage per Hijri year. Today’s portion never grows: “X passages behind this year” opens the earlier unread passages, oldest first, with the same buttons. A new Hijri year starts a fresh plan; earlier years stay as history in Settings. Backup and restore (replace and merge) carry the read marks.
- The reading day changes at midnight in the time zone of the location chosen in Settings (found offline from its coordinates).
- Hijri date by location: predicted from the crescent (moon-sighting by Aric Camarata, MIT, with the Odeh criterion): if the crescent is predicted visible (by eye or with optical aid) on the evening of the 29th, the new month starts at that sunset; otherwise the month runs 30 days. The date still changes at Maghrib, the −2..+2 Hijri adjustment still applies on top, and the date is labelled “Predicted by crescent visibility” / “নতুন চাঁদ দেখা যাওয়ার পূর্বাভাস অনুযায়ী”. It is a prediction, not an announced sighting. Without a saved location, beyond the polar circles (66.56° N/S, where some days have no sunset) or outside 1440 AH–2150 CE the app uses the Umm al-Qura calendar as before, without the label.
- The astrolabe and its Sun/Moon cards (positions, phase, illumination, moonrise/moonset, heights and directions) are computed from NASA JPL’s DE442S ephemeris, bundled in the app (about 31 MB). The look and controls are unchanged. Prayer times are unchanged.
- No internet: everything above works offline; there is no online button. The moon-sighting MIT licence, the DE442S notice and the tz-lookup (CC0) notice are in LICENSES and About.
- The version label reads v3.0.6 / v৩.০.৬.

## Previous update (v3.0.5)

- One Font list: Settings › Appearance has a single “Font” / “ফন্ট” dropdown with all 20 fonts (10 English, 10 Bangla) plus System default, in English and Bangla groups. The chosen font draws every letter it has. English fonts have no Bangla letters, so with an English font Bangla text uses Hind Siliguri (Settings says so); a Bangla font draws its own Latin letters. Saved settings move over on their own: in Bangla the old Bangla font choice is kept, in English the old English font choice (if that was System default, the Bangla font that actually drew the text is kept). Removed fonts still open as before (Lohit → Bornomala; Baloo Da 2, Atma, Mina, Galada → Hind Siliguri). Backups carry the new setting, and older backups are read and converted the same way.
- Circles tick in order, left to right, on every Fard prayer card (home, countdown page, Revise previous prayer). A circle can still be skipped (for example the optional 4 before), but once a later circle is ticked every empty circle before it is locked (dimmed, not clickable); unticking the later circles unlocks it. A selected circle can always be unticked while its time is open. Voluntary circles already tick strictly in order. Mark Complete is unchanged, and older records load as they are.
- Qiyam al-Layl: every Tahajjud and Witr rak‘ah is Qiyam al-Layl, but not every Qiyam rak‘ah is Tahajjud or Witr. Rak‘ahs saved on the Qiyam card before Tahajjud begins count as Qiyam al-Layl “other”; saved from Tahajjud start until Fajr they count as Tahajjud. Witr card rak‘ahs count as Witr. The card reads e.g. “Qiyam al-Layl 7 rak‘ahs: Tahajjud 2, Witr 3, other 2” (Bangla too), and the Prayer record shows the same line. Progress and the weekly stats follow it: Qiyam al-Layl counts as prayed when any night prayer is recorded, and Tahajjud also counts when the Qiyam card was saved in Tahajjud time. Totals still count each rak‘ah once. Older Qiyam records use their saved time; one without a time stays “other”.
- The version label reads v3.0.5 / v৩.০.৫.

## Previous update (v3.0.4)

- Every clock and countdown number (home clock card, expanded clock page, top-bar clock, every countdown) uses the app font, the same English + Bangla stack as the rest of the interface. Optima/Palatino are gone; digits stay tabular and sizes are unchanged.
- Fonts: English has 10 bundled fonts plus System default (new: Lato, Nunito, Source Sans 3, IBM Plex Sans, Lora, all SIL OFL). Bangla is trimmed to 10 plus System default: Hind Siliguri, Noto Sans Bengali, Noto Serif Bengali, Anek Bangla, Tiro Bangla, Kalpurush, Siyam Rupali, SolaimanLipi, Bornomala, AdorshoLipi. A saved Baloo Da 2, Atma, Mina or Galada choice opens as Hind Siliguri.
- Recording: ticking circles on a prayer card only selects (tick sound). Nothing counts toward progress, the ring, history, the tray, the weekly charts or rewards until Mark Complete, which plays the completion sound and the reward. Selections survive a reload and are stored apart from the records (old records load unchanged). The Friday Jumu’ah/Dhuhr rule and the ordered voluntary ticks still apply.
- Other voluntary prayers: “+2 rak‘ahs” adds to an unsaved “N rak‘ahs performed” count with the tick sound; the card’s own Mark Complete saves it as a timed entry. Unsaved taps clear when the prayer day ends. In the Prayer record an entry can only be lowered: circles 2–12 (untick from the top) or, above 12, “More than 12 rak‘ahs? Enter the total” + Set total; 0 removes it. An entry locks when the second Fard period after its time begins (10 AM → Asr, Maghrib → next Fajr, Isha/night → next Dhuhr).
- Prayer record: each Fard prayer is one card with its Sunnah, Fard and Nafl and one Undo for the whole prayer; Duha, Tahajjud, Witr and Qiyam keep one card and one Undo each.
- “Revise previous prayer” / “আগের নামাজ সংশোধন করুন” replaces “Record previous prayer”: it appears only after Undo, only for that prayer, once its time has passed, until its record window closes; what it records is marked “recorded after its time”. Undo while the time is open returns the normal card. A prayer whose time ends unrecorded gets no card on its own; Prayer Completion Recovery in Settings is unchanged.
- All prayer cards (available now and Revise previous prayer) flow in one wrapping row set that fills every row; the Revise heading sits inside its card.
- The theme picker lists all dark themes first, then all light themes (ids and saved choices unchanged).
- Countdown page: after Mark Complete the completion card (verse, rak‘ahs, circles, Mark Complete) leaves and Prayer countdown + Event timing close the gap; Undo while the prayer’s time is open brings it back.
- The astrolabe and the clock open their pages with the glide from every page (home at any scroll position, countdown, Settings, Prayer record, prayer page, clock ↔ astrolabe page), and back. Reduced motion is respected.
- Unused code, styles, strings, scripts and images were removed (no change in behaviour or look).
- The version label reads v3.0.4 / v৩.০.৪.

## Previous update (v3.0.3)

- Cards under “Record previous prayer” / “আগের নামাজ রেকর্ড করুন” now have Mark Complete, the same completion flow as the home event card; what it records is marked “recorded after its time”.
- Unticking a part in the daily record brings back the card of that one prayer only: under the normal heading while its time is open, under “Record previous prayer” after it.
- A voluntary prayer that is partly ticked, or was unticked, stays under “Record previous prayer” until the existing record window closes.
- A Blessed Reminder passages rebalanced to 2,739 (no passage over 10 verses; never across a juz’; never mid-sentence except four long list sentences, cut at an “And …” item). The 232 verses over 350 characters open as a short preview and Read more shows the whole verse, in the reminder and in Today’s portion.
- New Settings › Time adjustments control “Hijri date adjustment” / “হিজরি তারিখ সমন্বয়” (−2 to +2 days, default 0). It shifts every Hijri date in the app, and the day’s juz’ follows it; prayer times are unchanged.
- Backup export and import include the progress-line switch and the Hijri adjustment; older backups still import with the defaults.
- The version label reads v3.0.3 / v৩.০.৩.

## Previous update (v3.0.2)

- All countdown digits (the large countdown, the home next-prayer countdown, the clock card and its preferred countdown, the Time left boxes) use the app font and follow both font pickers. Tabular numbers and sizes are unchanged.
- Bornomala (OFL 1.0, Codepotro) is now bundled in place of its stand-in Lohit Bengali; a saved Lohit choice opens as Bornomala. Li Ador Noirrit is still not bundled: its licence forbids redistribution, so SolaimanLipi stays. AdorshoLipi stays.
- Record completion is removed from the Fard and voluntary description cards. Mark Complete is unchanged.
- When a prayer's time ends with parts unticked, its card stays under “Record previous prayer” / “আগের নামাজ রেকর্ড করুন” until the existing record-window lock. Ticks there are saved and the daily record quietly notes “recorded after its time”. Unticking in the daily record brings the circle back.
- Qiyam al-Layl is the umbrella of the night: its card reads e.g. “Qiyam al-Layl 9 rak‘ahs: Tahajjud 4, Witr 3, other 2”. Each rak‘ah still counts once in every total. Circle labels are running totals (Witr 1, 3, 5…; others 2, 4, 6…).
- A Blessed Reminder reads one juz’ per Hijri day in passages built from the 556 Tanzil ruku’ sections (2,661 passages), each with a subject line, in the selected language only (Arabic removed). Moments pick a fitting unread passage of the day’s juz’. Today’s portion lists the whole day; Full section is one tap away; a progress line (switchable in Settings) and a monthly count are shown.
- The version label reads v3.0.2 / v৩.০.২.

## Previous update (v3.0.1)

- The countdown page no longer clips the opening quote or the rak‘ah note. Mark Complete sits to the right of the completion circles (it wraps below on a narrow window).
- On Friday the Fard row has two circles, 2 Jumu’ah and 4 Dhuhr. Only one can be ticked; the record stores which was prayed and its rak‘ahs. Old Friday records still load.
- A soft synthesised tick plays when a circle is ticked or unticked and on Mark Complete. Settings has a Tick sound switch (on by default). It follows the existing mute.
- The Revise event record tab is removed. Records still save when you tick; leftover review flags from older versions still load.
- The Time left digits use the same face as the live clock, with tabular numbers so the width stays steady.
- Preferred-time reminders accept 0 minutes: 0 notifies when the preferred time begins or ends.
- Reflection of time is now A Blessed Reminder (একটি বরকতময় স্মরণ). It uses the whole Qur’an offline (Tanzil Uthmani Arabic, Saheeh International English, Muhiuddin Khan Bangla — see LICENSES). A tagged verse is chosen when the moment fits; otherwise it walks from 1:1 to 114:6, remembering its place. Long verses have Read more. Daily non-Qur’an reflections are unchanged.
- Ten new themes (five dark, five light). A new English font picker (system default, plus Inter, Manrope, Outfit, Plus Jakarta Sans, Fraunces). Five added Bangla fonts: Kalpurush, Siyam Rupali, SolaimanLipi (in place of Li Ador Noirrit), Lohit Bengali (in place of Bornomala) and AdorshoLipi (in place of Noto Sans Bengali UI).
- The version number sits in tiny type in the bottom-right corner (v3.0.1 / v৩.০.১).

## Previous update (v2.5.3)

- The 24-hour solar scale sits between the degree limb and the tympan.
- A prohibited interval counts down as prohibited time, not as time left in the prayer.
- Qur’an 23:1 appears in its own card after all five Fard, then leaves. Its timer is separate from Reward seconds.
- Home cards show Fard with Sunnah and Nafl, packed to the content. Preferred time is larger. Before-start reminders include voluntary prayers that have their own start. The daily record shows today’s rak‘ah total.

## Previous update (v2.4.0)

- Tray hover lists available events and the next start, with no title, hours and minutes (minutes only in the last hour).
- Rotate and Flip match the smooth settings-crown ring.
- Voluntary ticks fill in order; Witr uses odd totals 1–11, with a “More than 11?” box from 13 up. Other voluntary totals start at 14 and go up in evens.
- Each tick shows one reward phrase (Arabic, pronunciation, meaning) by the highest kind recorded. All five Fard light the 23:1 verse on the disc, even if nothing else is recorded. A setting can turn reward text off.
- Today’s progress circle sits in the left third of the card. The progress line now covers voluntary prayers, and the summary shows a Voluntary rak‘ah count.
- Fonts and dead-code cleanup follow in v2.5.0.

## Previous update (v2.3.0)

- **New logo (option B)**: a gold crescent and star over fine astrolabe rete rings, inside the brushed-silver ring with degree ticks and the dark enamel face. It replaces the mihrab logo in the header, favicon, window/taskbar icon and the Tauri PNG and ICO set (`scripts/gen-logo.mjs` regenerates them from `scripts/logo-b.svg`).
- **Tick sizes show rank**: relative to Mark Complete (100 %), the Fard tick is 90 %, Sunnah 80 %, and Nafl, the optional sunnah ("4 before") and the voluntary sets 70 %, on the home prayer cards and on the countdown page. The Nafl light edge is drawn inside the circle, so the outer diameters are exactly these.
- **Settings crown**: the 120 hard knurl teeth that looked jagged are replaced by a smooth brushed-silver ring with a soft highlight and fine low-contrast grooves; same size, position, engraved gear and hover turn.
- **Bangla tooltips**: the Rotate and Flip tooltips and screen-reader labels were stuck in English on the astrolabe page. They are now translated, change live with the language, and say whether Rotate is on or off and whether the astrolabe is flipped. "Astrolabe controls" is translated too.

## Previous update (v2.2.0)

- **Prayer countdown page**: the countdown is a full-width horizontal panel (name on the left, the large countdown in the centre, begins/ends/date on the right; it stacks below about 900 px). When a prayer has no preferred-time card, the information card (verse, rak‘ah info, Completion & recording) is centred under it, for every Fard, Sunnah and voluntary event.
- **Astrolabe crispness**: hairlines are never thinner than a device pixel, the smallest printed text is at least about 6.4 px, text and shapes use geometric-precision rendering and no permanent GPU layer pins an old raster scale. Same size and design.
- **Rotate and Flip** are a matched pair of premium buttons (knurled silver bezel, dark enamel centre, thin gold ring, engraved icon). Rotation is locked until "Rotate astrolabe" is switched on (never saved, always starts off; the angle is saved). A click opens the astrolabe page unless Rotate is on. The pair sits inside the home panel, at least 16 px from every border; on the astrolabe page it sits at the dial's corner.
- **New logo**: brushed-silver ring with fine ticks, dark enamel face, gold mihrab and crescent (header, favicon, window/taskbar icons, Tauri PNG and ICO set; `scripts/gen-logo.mjs` regenerates them).
- **Coordinates plate and settings crown**: the coordinates read like "23.8103° N  90.4125° E" (Bangla numerals and directions in Bangla) with the place name underneath, and open the location settings; Settings is a knurled watch crown with an engraved gear.
- **Never shrinks**: the old fit-to-window zoom (down to 70 %) is gone. Several prayer events at once make the page longer; it scrolls at the normal size.

## Previous update (v2.1.1)

- **Forbidden-time card** is now a calm "pause" card: the same dark steel finish with a thin muted amber edge (no red or violet, no icon). Small label ("Pause · Zawal"), the headline "Prayer resumes at X", the time range, a countdown in an inner card, a thin progress bar and a "Next: Dhuhr" line. English and Bangla, never clipped.
- **Astrolabe page**: a plain click on the astrolabe opens its own page with a smooth transition (like the clock); a drag only rotates it. The clock moves to the top bar and stays live; sun height and direction, moon position, phase and illumination, the three pause windows, current and next prayer and the coordinates appear once, in cards. Back returns home.
- **Enlarged detail**: when the astrolabe is big it adds a 1° / 5-minute scale, labelled star pointers, a sharper rete and engraved texture (English or Bangla text only). Sun and moon keep their real positions.
- **Coin flip**: a machined button on the astrolabe (home and expanded) flips it in 3D to a mirrored view. Flip and rotation are independent (Home or double-click resets rotation only; the button toggles the flip only) and both are saved and restored.
- **Reward text fix**: the phrase and the voluntary reward were squeezed into the small progress disc (clipped or overlapping), the generic phrase showed beside a voluntary prayer's own reward, and a fard phrase was not cleared when its time ended. Rewards now have their own panel, show the right text (fard tick, voluntary Mark Complete, day complete) for the Settings recognition time, then clear.
- **Clock**: the numerals 6 and 9 now have the same clear gap to their hour batons and are optically centred (measured from the real glyph, English and Bangla digits).

## Previous update (v2.1.0)

- **Astrolabe, redesigned** as a German precision-watch instrument: brushed-steel case with a knurled bezel, blued-steel rete, gold sun and a lit-phase moon at their real positions (sidereal rotation, real declination and hour angle, real apparent-size ratio). Only English or Bangla letters and numerals appear on it; no Arabic/Persian/Urdu script and no text-like ornaments. The whole instrument can be turned with the mouse like a vault dial: 1:1 drag, a finer grip near the rim, Shift/Alt/right button for fine mode, momentum and smooth deceleration, wheel and arrow keys for small glides, double-click or Home to reset. Nothing snaps and the artwork is never distorted.
- **Main clock** is a Swiss-watch face. Click it for a smooth transition to the expanded clock page (the astrolabe moves into the top bar and stays rotatable; prayer status, next prayer, countdown, preferred time and the day's timings). Back returns to the prayers.
- **Layout**: cards flex to their content and text wraps instead of being clipped or overlapped, in English and Bangla, at any window size and display scaling. The page may scroll rather than shrink text below a readable size.
- **Ticks** (Fard, Sunnah, Nafl, voluntary) are exactly 80 % of the Mark Complete button.
- **Voluntary events** show Mark Complete plus up to six two-rak‘ah ticks (12 rak‘ahs) and a validated box for more than 12. The old rak‘ah-set controls are gone.
- **Countdown cards** inside Available Now and Next never overflow.
- **Rewards**: Mark Complete on a voluntary prayer shows reward text specific to that prayer (English and Bangla, with the source). New Settings > Recognition > "Recognition seconds per voluntary prayer" (1–120, default 8) controls how long it stays; Fard recognition is unchanged.
- **Reminders**: two independent preferred-time reminders (before the preferred time begins / before it ends) in Settings > Desktop behaviour, in two tabs. They use the same preferred-time engine as the clock page, fire once per day per prayer, survive restarts and clock changes, and exist only for prayers that really have a preferred period.
- **Settings**: Calculation profile is always expanded; spacing is consistent across all cards.

## Previous update (v2.0.1)

- **Bangla**: the language switch now reaches every label, button, tooltip, toast, dialog, select, astrolabe tooltip and the time-zone line. Bengali digits everywhere; Bangla text is never letter-spaced.
- **Cards**: Qur’an first, then hadith, then other notes. Hadith is only shown when a prayer or event has no verse. Duha, Tarawih, Eid, Witr, Rawatib, Tahiyyat al-Masjid, Istikhara, eclipse, rain and voluntary nafl now carry a verse.
- **Astrolabe**: a faithful planispheric instrument (throne, limb, 24-hour scale, plate, rotating rete with ecliptic and signs, star pointers, alidade). Real sidereal rotation; sun and moon at their astronomical positions and true apparent-size ratio.
- **Panel**: astrolabe 60 % and modern analog clock 40 %, same height, clock never larger. Local time, Gregorian and Hijri date are inside the clock card; the second hand glides.
- **Top bar**: icon + name on the far left, the card “coordinates: (lat, lon)” on the far right. New astrolabe + mihrab icon.
- **Mark Complete** under the main tick closes the card; the white tick only records. **Undo prayer** lives on the day-detail page (click a day in Weekly Prayer Progress), bottom right of each recorded card.
- **Voluntary prayers**: six cards; the sixth is Other voluntary (+2 rak‘ahs). No undo strip; legend says Voluntary.
- **Reward**: recognition phrases and الحمد لله are readable again (original disc size); thresholds and messages unchanged.
- **No-scroll opening view** at any window size.

## Previous update (v1.9.1)

- Bangla covers the whole interface, including new controls, without breaking unmatched sentences.
- A prayer card leads with the Qur’an when a verse exists, and shows hadith only when that prayer has no Qur’an.
- The astrolabe is a circular planispheric plate: limb, tympan, rete stars, and a sun slightly larger than the moon, both moving in real time.
- The main clock is a modern analog face in the same row, on the right. Clicking it still opens the time and preferred-period page.
- Available events have Mark prayer event complete under the main tick. It closes that card even if smaller ticks remain, and the next event takes the space.
- The progress disc shows the recognition phrases and Alhamdulillah again.
- Title, location, astrolabe, clock, available events, next event and today’s progress fit on screen without scrolling.
- Undo prayer is removed from homepage event cards. Each recorded event on a weekly day has Undo prayer at the bottom right.

## Previous update (v1.8.1)

- The preferred period under the main-clock countdown stays visible for the whole prayer: upcoming, open, and after it has passed, and it ticks every second.
- The sky panel is a stereographic planispheric astrolabe. The sun and moon are equal Abbasid-sized jewels and glide with a slight spring.
- Alhamdulillah is shown again in the progress disc and in the progress line when every layer for the day is complete.
- Daily reflection is now Reflection of time. It moves when the progress line moves, and every line is from the Qur’an.
- The custom Windows title strip is gone. The window uses the operating system’s own title bar.
- Situational prayer cards are replaced by Other voluntary prayers: one +2 rak‘ahs control, a half-second gold glow, and Undo prayer. Older situational records still appear in weekly history.
- English and Bangla stay in step for the new controls.

## Previous update (v1.7.1)

- Removed the transparent decorative circle from the Next Event card.
- Replaced the tall native Windows titlebar with a compact frameless title strip and working minimize, maximize/restore and close controls, reducing unused space above the app header.
- Added situational prayer cards for prayer after Wudu, solar and lunar eclipse prayer, rain prayer, funeral prayer and general voluntary prayer, alongside Tahiyyat al-Masjid, Istikhara and Tawbah.
- Each two-rak'ah action now records one occurrence, the number of two-rak'ah sets and the total rak'ahs for that date. The action can be repeated without a cap.
- Eclipse prayers have selectable 2–12 rak'ah sets; general voluntary prayer accepts any even rak'ah count, including counts above 12. Janazah is recorded as an occasion without incorrectly counting rak'ahs.
- After recording, the card displays a short completion message for 0.5 seconds, followed by a golden border glow for 0.5 seconds.
- Daily summaries and weekly day records display the occurrence count and total rak'ahs. Legacy records are retained and migrated safely.

## Previous update (v1.6.1)

- Fixed the expanded main-clock page so its countdown, active/next prayer focus, preferred-time countdown and event cards refresh live instead of becoming stuck after opening the page.
- Fixed weekly day-detail evidence and guidance to use the date of the selected historical record, not the currently selected Home date. Friday Dhuhr/Jumu’ah is resolved against that historical date.
- Weekly Fard cards now use their own prayer evidence; linked Sunnah cards use Rawatib evidence; linked Nafl cards use the corresponding prayer evidence; standalone voluntary and situational cards use their own evidence. Available Qur’an evidence appears before hadith, with school-specific evidence retained.
- Next Event and Today’s Progress now share a responsive row of rounded cards.
- Fard undo opens a persistent **Revise event record** card containing the Fard, Sunnah and Nafl ticks; the same two-following-Fard lock governs its expiry. Daily voluntary events have the same undo/confirm flow.
- Voluntary and situational prayer cards include Qur’an-first evidence and prayer guidance. Situational completions are included in completion summaries.
- Rak‘ah tracking supports selectable sets for Duha/Ishraq and other set-based prayers, custom even counts for Qiyam/Tahajjud, and school-flexible odd counts for Witr.
- Weekly day cards open a detailed daily-record page. Back and Escape return to Home.
- Completion ticks and notification sounds use doubled master gain with a compressor limiter.

## Product rules and privacy

- No calendar screen or calendar module.
- No automatic location detection, Windows location permission, login, user account, analytics, telemetry or cloud synchronisation.
- A fresh installation starts without a preset location. The user must provide a Google Maps link or enter latitude and longitude manually before prayer calculations begin.
- Users can replace the location using manual latitude/longitude or a Google Maps sharing link.
- Expanded Google Maps URLs containing coordinates are parsed locally. Shortened `maps.app.goo.gl` links cannot be expanded offline; copy the coordinates from Google Maps or enter them manually. Only latitude and longitude are stored locally; there is no separate place-name lookup.
- Prayer calculations, prayer history, settings, themes, language preference and location are stored in the app's local WebView2 profile. No cloud or account service is used.
- Prayer calculations, expanded Maps-link parsing, daily Islamic content and prayer history work without internet. The app itself makes no network requests. Windows may need internet during installation if the WebView2 runtime is missing.
- Location coordinates do not silently alter the Windows time zone. The app uses the time zone configured on the device.

## Included features

### Prayer times and daily information

- Daily Islamic content is ordered with **On this day in Islamic history** and the Qur’anic revelation card first, followed by **Sunnah & Seerah**. The former Hijri prayer-event card is grouped under Sunnah & Seerah rather than being called “Hijri Worship”.
- Weekly Prayer History and Weekly Prayer Progress are grouped together under Your Record.
- The Seerah glimpse is sourced and does not claim a general hadith report happened on the exact current date. The Islamic-history card shows every entry for the exact Hijri date, then month-level entries for the month (labelled as such); only when nothing matches does it display the nearest documented anniversary, clearly labelled as a nearest match, not an event occurring today. When several items match, a counter such as **1 / 4** and ‹ › buttons page through them.
- Qur’anic revelation matching checks exact date, then week of month, then month, then the nearest documented period. Every matching record is available through the card's ‹ › controls; each page displays only one verse and suggests the rest of the passage or Surah. The first-revelation record uses a qualified Ramadan month-level match because historical reports differ about both the month and exact day.

- Offline solar prayer-time calculation. Default (unchanged): Karachi 18° Fajr / 18° Isha and Hanafi Asr shadow factor 2. Settings → Calculation method offers Muslim World League, ISNA, Egyptian, Umm al-Qura (Isha +120 min in Ramadan), Karachi, Gulf, Kuwait, Qatar, Singapore, Turkey Diyanet, Tehran and Shia Ithna Ashari; Asr/juristic school Hanafi, Shafi‘i, Maliki, Hanbali or Ja‘fari; and a high-latitude rule (none, middle of the night, one-seventh, angle-based). Ja‘fari mode uses the angle-based Maghrib, Asr factor 1, shows midnight as the end of Isha, notes the combining of Dhuhr+Asr and Maghrib+Isha, and hides Hanafi-specific guidance. Changes recompute immediately; history is unaffected.
- Dhuhr begins after the six-minute Zawal exclusion interval; the prohibited interval is displayed separately.
- Hanafi prohibited times: the timetable shows sunrise → sunrise + 20 min, the Zawal interval, and the last 15 min before sunset in the same gold style, and a subtle bilingual notice appears under Prayer events while one of them is in progress (the sunset notice notes that the day's own unprayed Asr may still be offered). The 20/15-minute values are practical approximations.
- Five obligatory prayers, sunrise, sunset, date navigation and a live HH:MM:SS clock.
- Current/overlapping available prayer events and next obligatory prayer with continuously updating countdowns.
- Separate countdown screen with a Back control. Prayer-name buttons navigate to their reference description; countdown buttons open the focused countdown.
- A Hijri date is displayed alongside the Gregorian date. Since v3.0.6, with a saved location, it is predicted from crescent visibility at that location (Odeh criterion, offline) and labelled so; an actual announced sighting may differ by a day. Without a location the device's Umm al-Qura calendar is used as an estimate.
- The Islamic History and Qur’anic revelation cards sit immediately below Voluntary Prayers; Sunnah & Seerah follows them. The Sunnah & Seerah area contains the Hijri observance guidance and a sourced daily-life glimpse, with disputed dates and practices qualified.
- Recognised days and periods include Ashura/Tasu’a, the first ten days of Dhul Hijjah, Arafah, Eid al-Fitr, Eid al-Adha, Ramadan, the last ten nights, the commonly observed Laylat al-Qadr date, Badr and the commonly cited date of the Conquest of Makkah.
- Date-specific prayer events are time-gated: Eid prayer appears only in its morning window on the two Eids; Tarawih appears only after Isha during Ramadan. They are not presented as everyday prayers.
- Jumu’ah guidance appears in place of the ordinary Dhuhr rak‘ah arrangement on Fridays. The mosque's actual khutbah and congregation time remain local and are not guessed by the app.

### Prayer tracking

- Circular completion controls appear only for events currently inside their calculated time windows.
- Completion marks can be corrected/unchecked. Every layer has its own short synthesised tick from one wooden family on a pentatonic scale (Fard fuller and lowest, Sunnah brighter, Nafl softer, standalone voluntary airy, seasonal festive); closing a ring plays a two-note flourish and completing the day a short rising chime. Settings → Tick sound: Wooden (default), Soft or Crystal. Web Audio only, under 120 ms, respects the sound toggle and reduced motion.
- **Today's progress** is a set of concentric circles, inside out: **white Fard centre** (five thin segments that become a solid white disc after the fifth Fard; soft ivory with a neutral outline on light themes), **green Sunnah ring** (#1E8E5A), **black Nafl ring** (#141414, with a faint light edge on dark themes), **red-and-black striped ring** for the standalone voluntary prayers (Duha, Witr, Tahajjud …), and on days that have them an outermost **saffron ring** (#E8A33D) for date-specific prayers (Tarawih, Eid prayer). The figure keeps the same diameter when the saffron ring appears.
- Each ring fills clockwise from 12 o'clock, one segment per item in prayer-time order; unfinished segments are faded tracks. A tick sweeps in only its own segment (~400 ms), a ring closes with a soft glow only when all its segments are done, and unticking reverts. When every present layer is complete, **الحمد لله** fades into the white centre in green Aref Ruqaa (bundled subset, SIL OFL).
- Each prayer row lists its parts in performance order (e.g. Dhuhr: 4 Sunnah before · 4 Fard · 2 Sunnah after · 2 Nafl): a larger white Fard tick and smaller green Sunnah and black Nafl ticks, labelled with rak‘ah counts; tick colours use the same tokens as the rings. Rows outside their window are faded with an “Opens at” note.
- **Good Job** = all five Fard. **Great Job** and the reward = every layer present that day. Weekly Prayer Progress shows a mini figure per day. Older records keep their marks; nothing is lost.
- **Day-aware status line** under Today's progress, chosen offline in priority order: (1) date-specific days from the Hijri calendar (Eid, Eid eve, Arafah, Days of Tashriq, first ten of Dhul Hijjah, Ramadan day N with the Iftar time, Tarawih after Isha, last ten nights and the commonly observed 27th night, mid-Sha‘ban, Tasu‘a/Ashura, Islamic New Year, the white days 13–15); (2) weekday (Friday: Jumu‘ah Mubarak with al-Kahf and salawat; Monday/Thursday fasting); (3) progress (Bismillah before the first Fard, “3 of 5 Fard done · Next: Asr at 3:38 PM”, Alhamdulillah); (4) the day's reflection. Ja'fari mode leaves out Sunni-specific items (Tarawih, the 27th-night convention, Monday/Thursday and Ashura fasting).
- **Daily reflection**: 365 short lines (200 brief Qur'an paraphrases with surah:ayah, 140 sahih/hasan hadith with their collection, 25 uncited adhkar and good-conduct reminders), each in English and Bangla, chosen by day of the year. Shown as a quiet subtitle (hidden in compact mode) and as the fallback status line.
- Every displayed prayer event has a rak‘ah breakdown, practical performance guidance and a concise history/context note. The guidance is Hanafi-oriented where relevant and explicitly identifies differences among schools or disputed reports.
- The reference includes the five Fard prayers, Friday Jumu’ah, regular Sunnah Rawatib, Duha/Ishraq, Awwabin, Qiyam, Tahajjud, Witr, Tarawih, Eid prayer, Tahiyyat al-Masjid, Istikhara and Tawbah.
- **Weekly Prayer Progress** covers seven full calendar days, **Saturday to Friday**, with Friday last and highlighted. Every day — Friday included — has five Fard cells, so a week has **35 Fard**. Each day keeps its five-cell Fard square and circular Nafl ring; Fard and Nafl totals are reported separately rather than combined into a weighted score, and today is outlined.
- Friday's midday slot is labelled **Dhuhr/Jumu’ah** (যোহর/জুমা) in the daily list, the weekly grid, the next-prayer card, reminders and the tray tooltip. Either prayer completes it: Jumu’ah replaces Dhuhr for those obliged to attend, and anyone who does not attend prays Dhuhr. Existing records keep their keys, so no history is lost.
- Why Saturday to Friday: classical fiqh texts (e.g. al-Nawawi, *al-Majmu‘*) count Saturday as the first day of the week and Friday as its last, citing the creation hadith in Sahih Muslim 2789, and Friday is the Muslim day of gathering (Sahih Muslim 855–856).
- Seven-day completion history and JSON data export/reset.

### Appearance and settings

- Ten colour themes: five dark and five light.
- English and Bangla interface modes, including navigation, settings, prayer guidance, historical notes, notifications, dates, and Bengali numerals/time formatting.
- Compact desktop mode.
- **Font** (Settings → Font, one list since v3.0.5, bilingual labels, English and Bangla groups): System default (Segoe UI Variable / Segoe UI + Nirmala UI) plus ten Bangla fonts: Hind Siliguri, Noto Sans Bengali, Noto Serif Bengali, Anek Bangla, Tiro Bangla (SIL OFL, `src/fonts/ui/`), Kalpurush, Siyam Rupali, SolaimanLipi, Bornomala and AdorshoLipi (`src/fonts/bn-new/`), and ten English fonts: Inter, Manrope, Outfit, Plus Jakarta Sans, Fraunces, Lato, Nunito, Source Sans 3, IBM Plex Sans and Lora (SIL OFL, `src/fonts/latin/`). The chosen font draws all text it can; with an English font, Bangla text falls back to Hind Siliguri. Applied app-wide through one CSS variable and saved locally; an unknown saved value falls back to the default, and a removed one (Baloo Da 2, Atma, Mina, Galada) to Hind Siliguri. The الحمد لله reward keeps Aref Ruqaa.
- **Clock format**: 24-hour (default, as before) or 12-hour, applied everywhere a time appears (live clock, timetable, countdown targets, prohibited-time rows, reminders, “Opens at” notes, the status line). Bangla 12-hour uses Bengali digits with the day-period word first: ভোর ৪:৫২ · সকাল · দুপুর · বিকাল · সন্ধ্যা · রাত ৯:০০.
- Collapsible calculation profile showing the selected method, school, high-latitude rule, device time zone and the Zawal rule.
- Per-prayer manual time adjustments.
- Location and all preferences saved locally.

### Windows integration

- System-tray icon and menu: **Open Prayer Times** and **Exit Prayer Times**.
- Clicking the window's X hides it to the tray; it does not terminate the reminder scheduler.
- Left-clicking the tray icon restores the window. **Exit Prayer Times** fully terminates the app.
- Single-instance handling brings an existing window forward if the app is opened again.
- Optional **Start Prayer Times when Windows starts** setting. Startup launches hidden to the tray; this is disabled by default.
- The tray tooltip shows the next obligatory prayer and the time left, e.g. **Asr in 1h 23m** / **আসর শুরু হতে ১ ঘণ্টা ২৩ মিনিট বাকি**, following the language setting. It is refreshed by the existing 15-second tick, which keeps running while the window is hidden in the tray, and the tray is only updated when the text changes (about once a minute).
- **Remind me before a prayer begins**: for each of the five prayers, any whole number of minutes from 0 (off) to 180. One notification per prayer per day, sent only when Windows prayer notifications are enabled. This is in addition to the existing per-event reminders before a prayer period ends.
- Native Windows prayer notifications are optional and requested only when the user enables them. Notifications run while the app remains running, including in the tray. The app does not wake a sleeping or powered-off computer.

## Desktop sizing and 2160p / 4K displays

- The main window opens maximized on the available desktop work area. Press **F11** to enter true fullscreen mode (Escape exits); on a 3840 × 2160 (2160p/4K) display, fullscreen uses the full panel and the layout expands to the available screen, with a 1500 × 920 logical-pixel restored size.
- The window remains resizable; its minimum size is 640 × 480 logical pixels. F11 toggles native fullscreen mode; Escape exits fullscreen.
- The UI uses viewport-responsive root sizing (up to 28 CSS pixels at large viewports) and rem-based component dimensions, so typography, spacing, cards and controls scale smoothly as the window changes size.
- CSS container queries reflow the live-event cards, voluntary-prayer list, reference descriptions and Settings into wider desktop layouts when there is room. Narrower restored windows return to compact columns without changing prayer logic or hiding features.
- The maximum content width is 3400 CSS pixels, allowing the interface to use 2560 × 1440 and 3840 × 2160 desktops without stretching every text line across the entire screen. Windows/WebView2 logical pixels account for display scaling; the design does not apply a bitmap-style zoom transform.

## Resource use

The UI, fonts, prayer calculations and location settings are local. The one-second clock/countdown refresh is needed while the window is visible; a 15-second reminder check continues in the hidden app window while it remains in the tray. Tauri uses the installed Microsoft WebView2 runtime, so total Windows Task Manager memory use cannot honestly be guaranteed below 10 MB. This project avoids bundling a separate Chromium browser and avoids remote assets.

## Windows x64 build requirements

- Windows 10 x64 (version 1803 or later recommended) or Windows 11.
- Node.js 20+ and npm.
- Rust 1.90+ with the `x86_64-pc-windows-msvc` target.
- Visual Studio 2022 Build Tools with **Desktop development with C++**, MSVC and a Windows SDK.
- WebView2 Runtime. Windows 10 version 1803+ and Windows 11 normally include it.

Tauri's Windows installer uses NSIS. The configured `downloadBootstrapper` mode keeps the installer small and retrieves the WebView2 bootstrapper only if the runtime is missing. The fully offline WebView2 installer option adds approximately 127 MB, so it is not bundled by default. See the [official Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) and [Windows installer guide](https://v2.tauri.app/distribute/windows-installer/).

## Build locally on Windows

1. Extract the project ZIP to a writable folder.
2. Open **Developer PowerShell for VS 2022**.
3. Run:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\BUILD-WINDOWS.ps1
   ```

4. The script first compiles the standalone executable with Tauri's `--no-bundle` option:

   `src-tauri\target\release\prayer-times-desktop.exe`

5. It then prepares the NSIS 3.13 cache, verifies the NSIS executable and utility DLL hashes, and bundles the installer separately:

   `src-tauri\target\release\bundle\nsis\`

If GitHub returns a 504 while NSIS is being downloaded, the script retries with increasing delays. If the installer stage still fails, the standalone EXE has already been compiled and remains available at the path above.

## Build with GitHub Actions

The repository includes `.github/workflows/build-windows.yml`. The workflow locates `package.json` and the Tauri project files before running npm, so it works whether the project files are at the repository root or inside one extracted project folder. Push this project to a GitHub repository and use the **Actions → Build Prayer Times for Windows** workflow (or push to `main`). The workflow builds on a Windows 2022 x64 runner and uploads `Prayer-Times-Windows-x64-Installer`. It also preserves `Prayer-Times-Windows-x64-Executable-Fallback` if the native executable was compiled but NSIS bundling still fails.

## Keyboard

| Key | Action |
| --- | --- |
| F11 | Toggle native fullscreen |
| Esc | Close the shortcut guide, exit fullscreen, leave the countdown screen, or return home from Settings |
| Home | Go to the home page and its top |
| Page Up / Page Down | Scroll by about one screen |
| End | Go to the bottom of the page |
| ? | Show or hide the shortcut guide |
| ← → | Previous / next item in a focused card with several items |
| Tab, Enter, Space | Move between and activate controls (including the tick circles) |

Shortcuts never fire while you are typing in a text field or choosing from a list (F11 and Esc excepted).

## Digital signature (optional Authenticode signing)

The app carries author metadata (`Salman Reza Amit`) in `package.json`, `src-tauri/Cargo.toml` and the Windows bundle (`publisher`, `copyright`). Authenticode signing is optional and is skipped automatically when no certificate is provided. No certificate is stored in the project.

- **Local build:** set `WINDOWS_CERTIFICATE_PATH` (path to a `.pfx`) and, if needed, `WINDOWS_CERTIFICATE_PASSWORD`, then run `BUILD-WINDOWS.ps1`. Both the standalone EXE and the NSIS installer are signed with SHA-256 and an RFC 3161 timestamp (`WINDOWS_TIMESTAMP_URL`, default DigiCert). `signtool.exe` comes from the Windows SDK, or set `SIGNTOOL_PATH`.
- **GitHub Actions:** add the repository secrets `WINDOWS_CERTIFICATE` (Base64 of the `.pfx`, e.g. `[Convert]::ToBase64String([IO.File]::ReadAllBytes('cert.pfx'))`) and `WINDOWS_CERTIFICATE_PASSWORD`. Without these secrets the signing steps print “Code signing skipped” and the build continues unsigned.
- The signing logic lives in `scripts/Sign-Windows.ps1`. Timestamping contacts the timestamp server only during the build; the app itself still makes no network requests.

## Project structure

```text
index.html                         Desktop UI
src/app.js                         UI, local history, progress, events and notifications
src/prayer-engine.js               Offline solar calculation engine
src/location.js                    Local coordinate and Maps URL parsing
src/islamic-content.js              Bilingual rak‘ah, guidance, source and Hijri-history data
src/daily-content.js                Date matching for the history, verse and Seerah carousels
src/weekly-cycle.js                 Saturday-to-Friday week, 35 Fard cells, Dhuhr/Jumu’ah slot
src/tray-tooltip.js                 Bilingual tray tooltip text (next prayer and time left)
src/forbidden-times.js              Hanafi prohibited intervals (sunrise, Zawal, before sunset)
src/reminder-schedule.js            Reminder minutes validation and due-window rules
src/keyboard.js                     Keyboard shortcut rules
src/carousel.js                     Carousel paging and bilingual counters
src/progress-figure.js              Today's progress circles, animation changes and reward rules
src/prayer-layers.js                Fard / Sunnah / Nafl / voluntary / seasonal layers and prayer parts
src/sound.js                        Synthesised per-layer ticks, flourish and chime (Web Audio)
src/time-format.js                  12/24-hour clock formatting (English and Bangla)
src/day-status.js                   Day-aware status line under Today's progress
src/daily-reflections.js            365 bilingual daily reflections with sources
src/branding.js                     Version, author and bilingual copyright
src/ui-fonts.js                    the one Font list (ten Bangla + ten English + System default), migration and sanitising
src/fonts/                          Aref Ruqaa Bold subset (reward phrase); ui/, bn-new/ and latin/ hold the selectable fonts (WOFF2 + licence texts)
src/styles.css                     Ten themes and desktop interface
src-tauri/src/main.rs              Native tray, single instance and local-only desktop integration
src-tauri/tauri.conf.json          Tauri window and NSIS configuration
src-tauri/capabilities/default.json Native plugin permissions
tests/                              Node tests (calculations, location, content, keyboard, progress, carousels, branding)
scripts/Sign-Windows.ps1             Optional Authenticode signing (skips without a certificate)
scripts/Prepare-NSIS.ps1             Retry and SHA-1 verify NSIS 3.13 + utility DLL
.github/workflows/                  Windows x64 build workflow
BUILD-WINDOWS.ps1                   Local Windows build helper
```

## Verification status

v1.5.0: `npm test` passes all 277 Node tests and `npm run check` passes; the Vite frontend build and native Windows checks were not run in the preparation environment (see TEST-RESULTS.md). v1.3.5: `npm test` passes all 252 Node tests and `npm run check` passes; the Vite build and native Windows checks remain unverified in this preparation environment (see TEST-RESULTS.md). v1.3.2: `npm test` passes all Node tests on Linux with LF and CRLF checkouts (see TEST-RESULTS.md); the native Windows executable is still not compiled here. v1.3.1: `npm test` passes all Node tests on Linux with LF and CRLF checkouts, in several time zones and with faked system dates; see TEST-RESULTS.md. v1.3.0: `npm test` passes all 89 Node tests and `npm run check` passes; see TEST-RESULTS.md. v1.2.9: `npm test` passed all 64 Node tests and `npm run check` passes the JavaScript syntax checks. `npm install` and `npm run web:build` (Vite) completed in the preparation environment. The built interface was also loaded in headless Chrome to check the progress figure, carousels, keyboard shortcuts, Bangla switching and the synthesised tick (rendered offline, ~60 ms).

**The native Windows executable has not been compiled in this environment** (no Windows/MSVC toolchain). Run `BUILD-WINDOWS.ps1` on Windows or use the GitHub Actions workflow. A Windows runtime check of F11 fullscreen, the tray and the sound is still recommended before release.

## v1.3.5 additions

- New Celestial Observatory in the existing Sky panel location, with separate solar and lunar day/night tracks, real moon phase, and Sunrise, Zawal and pre-sunset intervals displayed inside the panel.
- Available Right Now cards form a responsive row when the window has room; Next Prayer and Today’s Progress remain side by side on desktop.
- Fard tick indicators are 33% larger than Sunnah/Nafl indicators. Tick colours use the same layer tokens as the progress figure; the existing progress-bar design is preserved.
- Settings cards share the Home page's layered card framework and spacing rhythm; the top date/time display has a more distinct treatment.
- Progress-line grammar: English possessive prayer-name forms, plural rak‘ahs, centralized punctuation/spacing normalization and more natural English phrases; Bangla genitive and offline bilingual generation remain.
- Removed obsolete sky-scene artwork and unused geometry/rendering helpers.

## v1.3.4 additions

- One spacing scale, larger header clock, 'Location: <coordinates>' subtitle, a proportionate and lightly ornamented "Available right now" card (Fard tick 20% larger than Sunnah/Nafl).
- Sky: clean rounded shape, colour driven by the sun's altitude, exact forbidden-time zones, 8-point-star sun and stars.
- Per-card show/hide toggles in Settings; Weekly Prayer History removed (data kept); Tarawih and Eid reminder rows only in season.
- Fullscreen mouse fix (Rust command, Windows-only), louder notification sound, more natural Bangla.

## v1.3.3 additions

- "Available right now" is the most prominent section. A prohibited interval (sunrise, Zawal, before sunset) appears only while it is in progress, as a violet "Forbidden time" card, and is never a Next event target.
- Daily prayer cards show a quiet countdown line ("in 3h 54m" / "ends in 25m", Bangla supported).
- Redesigned sky panel (time-linear sun and moon path, exact prohibited-interval bands, four time-of-day palettes).
- Prayer descriptions: categories are vertical rows. Settings > Home page can hide Prayer descriptions, Sunnah & Seerah and On this day.
- The Local timetable section was removed from the home page; its method, Asr, time zone and interval details are in Settings.
- Today's progress picks a new line each time the window is shown again from the tray.
- Windows 10 notifications: native toast command with the app identity (or the PowerShell identity when the Start Menu shortcut is missing), real error reporting, retry of failed reminders and a "Send test notification" button. The Windows part is not compiled or run here; follow the manual checklist in TEST-RESULTS.md.

## v1.3.2 additions

- Conversational Today's-progress line (offline, bilingual, deterministic), offline habit learning, and the daily reflections moved to the Sunnah & Seerah carousel.
- Madhab-based evidence on the Daily prayers cards and in the reference section (one shared Sunni set; a separate Ja'fari set); reading-oriented reference cards.
- "Next event" hero from one ordered timeline (prayers, voluntary prayers, prohibited intervals, Ja'fari midnight); the stuck 00:00:00 hero is fixed at its root cause.
- "Available right now" is always at the top, followed by the next-event card; prohibited intervals appear as their own row between the available event and the next prayer event.
- Marked events lock when the next prayer event begins (Isha/Witr/Qiyam/Tahajjud at Fajr); standalone voluntary prayers have a single tick.
- Sky panel with the sun, the moon in its phase, stars and clouds, computed fully offline.

## v1.3.1 additions

- Fixed the Windows-only CI failure (88/89): a source-level test regex expected LF but the windows-2022 checkout had CRLF. Tests now read files through a line-ending-normalising helper, `.gitattributes` keeps text files LF, and the workflow disables `core.autocrlf` before checkout. The workflow also uses `npm ci` with the committed lockfile, checks Rust ≥ 1.90, caches npm and Cargo, verifies the EXE exists, and the signing steps end cleanly when no certificate is set.
- New concentric progress circles (white Fard, green Sunnah, black Nafl, red-black striped voluntary, saffron seasonal), per-prayer part ticks in matching colours, per-layer tick sounds with a Tick sound setting, selectable calculation methods / schools / high-latitude rules, a 12/24-hour clock setting, a ten-option font setting, a day-aware status line and 365 daily reflections. See the feature list above.

## v1.3.0 additions

- Tray countdown: the tray tooltip shows the next obligatory prayer and the time left in English or Bangla (Bengali digits), updated about once a minute, including while hidden to the tray. The tray menu (Open / Exit) and click-to-restore are unchanged.
- Pre-prayer reminders: per-prayer minutes before each prayer begins (any whole number 0–180), one notification per prayer per day, respecting the notifications toggle.
- Prohibited times: sunrise (+20 min) and the last 15 min before sunset now join the existing Zawal interval in the timetable, with a subtle live notice during any of them.
- Weekly Prayer Progress redesigned: Saturday-to-Friday full days, 5 Fard per day (35 per week), Friday highlighted with a Dhuhr/Jumu’ah slot, separate Fard, Sunnah, Nafl and voluntary-event totals, and a mini four-layer figure per day.
- Four-layer progress figure: blue Sunnah frame and gold Nafl ring between the black Fard square and the green voluntary ring, with Sunnah/Nafl sub-ticks on each Fard; the reward now needs all four layers.
- Carousels show only genuine matches for the date, with no padding and no cap. The Seerah card had been padded to five items on most days. Day-specific verses now match their own day only, and more history events and verse contexts were added, each with sources.
- Fixed: reminders threw an error after every notification (the notification call returns no Promise), which skipped saving the duplicate-protection marker. End-of-period reminders now use Bengali digits in Bangla. The reminder window now outlasts the roughly once-a-minute timer throttling of a hidden window.

## v1.2.9 additions

- Keyboard: F11 now has the Tauri permission it needs (`core:window:allow-set-fullscreen`); without it, fullscreen silently failed. Esc keeps its behaviour and also acts as Back from the countdown and Settings. Home returns to the home page top; Page Up/Down scroll about one screen; End goes to the bottom; ? toggles the bilingual shortcut guide. Left/Right page focused cards, focus outlines are visible, and keys are never taken while typing.
- Completion sound: replaced the three-note pluck with a crisp wooden tick inspired by a chess-move click, synthesised with Web Audio and stepping through a pentatonic set. Played once per new completion; the sound toggle is unchanged. Windows notifications keep the system sound.
- Today's progress: square stages are drawn exactly (nothing → line → L → three sides → hollow → filled black), sized to about 80% of the ring's inner edge. The voluntary ring no longer looks closed before the last voluntary event (round line caps were filling the gaps); full completion fills a green disc. With every Fard and Nafl done, الحمد لله appears inside the black square in a bundled 11 KB Amiri subset. Before Fajr, Today's progress now follows the prayer day that is still running.
- Carousels: Islamic history, the Qur’anic verse card, both Sunnah & Seerah cards, the date-specific (Eid/Tarawih) voluntary card and the seasonal prayer descriptions show all matching items with a 1 / N counter (Bengali digits in Bangla) and ‹ › buttons; controls hide for a single item. Offline data was expanded with documented events (Farewell Sermon, recovery of Jerusalem, ‘Ayn Jalut, Constantinople, Karbala, the deaths of Abu Bakr, ‘Uthman and ‘Ali, Granada, and month-level Hijrah, Khaybar, Mu’tah, Tabuk, Khandaq, Hunayn, Hudaybiyyah and the Prophet’s ﷺ passing) and verses with documented revelation context (2:185, 97:1, 5:3, 48:1, 2:144). Approximate and disputed dates are labelled.
- A tiny bilingual copyright line (© 2026–2027 Salman Reza Amit / © ২০২৬–২০২৭ সালমান রেজা অমিত) is fixed in the bottom-left corner. Author and copyright metadata, plus optional Authenticode signing, were added to the build.

## v1.2.8 additions

- Reorganised the daily information panels and renamed the old “Hijri Worship” grouping by placing that observance card under Sunnah & Seerah.
- Added a documented-history fallback spanning Prophetic and later Islamic history, including Badr, the Conquest of Makkah, Uhud, Hattin and the fall of Baghdad. When no event matches the exact Hijri day, the card identifies the closest documented anniversary; month-only records are labelled as such and are never presented as events occurring today.
- Qur’anic verse lookup follows exact day → week of month → month → nearest documented period. Only one verse is displayed; the remainder of the passage or Surah is suggested separately. The first-revelation record uses a qualified Ramadan month-level match because historical reports differ about both the month and exact day.
- Prayer descriptions are grouped into exactly five obligatory prayers, daily voluntary prayers, situational voluntary prayers, and dynamically visible seasonal prayer events. Tarawih appears 24 hours before the first Ramadan-night Isha and remains through the final Tarawih window; Eid prayer appears 24 hours before its local prayer window and ends at Zawal.
- Moved Weekly Prayer History and Weekly Prayer Progress together under Your Record, with progress directly below history.
- The displayed Hijri date and daily historical cards follow the local sunset boundary when a location is configured.
- Added F11, Esc, Home, Page Up, Page Down, End and ? keyboard controls.
- Replaced the previous tuck/thunk with a short three-note C-major pentatonic pluck.
- Enlarged the black progress square to sit close to the segmented outer ring. Fard progress draws green around the square; completing all five turns the square fully black. Voluntary completions fill the outer ring green.
- Added a small Bangla-aware visual maker signature and © 2026–2027 Salman Reza Amit at the bottom-left.

## Source provenance

The working Library contained a v1.2.0 desktop source archive and Firefox extension v2.1.13, but no v1.2.7 source archive. This v1.2.8 project uses the archived desktop source and reapplies the later v1.2.7 changes documented in the development history, then adds the current requests. The requested v2.1.16 extension archive was not present, so exact parity with v2.1.16 cannot be certified.
