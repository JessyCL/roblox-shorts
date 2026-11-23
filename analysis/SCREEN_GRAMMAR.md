# Screen Grammar: turning narration into shots

**Sources.** 10 analysed videos: 1,015 corrected shots, 1,342.5 s. Shake, caption, transition and overlay parameters come from report sections E, F, H and J.

S1-S10 below are the 10 measured sample Shorts.

**Variants to keep separate from the default:**
- **S3** looks like an offline render (Blender-like): it has true motion blur, faster pushes, 27 lightning flashes and 18 jump cuts. Treat it as the high-energy variant.
- **S4** is the giant-scale variant: angles split eye 37%, high 31%, low 27%, and 14% of shots are EWS.

**Machine-readable companion:** `analysis/screen_grammar.json`. Camera specs below use the field names from `engine/runtime/camera/index.js`. Post fields come from `fx/finishing.js` and overlay kinds from `fx/overlay.js`. The fx `type` names are proposals until `fx/index.js` lands (it is a stub today).

---

## 0. Cheat sheet: the 14 rules

1. **One shot per clause.** That is about 5 words or about 1.2 s. Every new noun the narrator names gets its own picture.
2. **Cut on the word onset** of the clause's first word, quantised to 30 fps. Never cut mid-word.
3. **Aim for 7.5 cuts per 10 s.**
   - Steady mode: about 6 cuts per 10 s, median shot about 1.45 s.
   - Fast mode: about 9 cuts per 10 s, median shot about 1.05 s.
4. **Every shot moves.** The default is a linear, centred push-in at +10%/s (about +12% per shot). It restarts on every cut.
5. **Framing mix:** MS is the workhorse (38%), then WS 24%, CU 17%, MCU 11%, EWS 5.5% and ECU 4%. Change framing or angle on every cut.
6. **Angle meaning:** eye level is the default (62%). Low (20%) means power or scale. High (14%) means smallness or sadness. Top-down (3%) is for object inserts and maps.
7. **Hard cuts only (96%).** The only extras are a frame-0 intro and rare whips or jump cuts.
8. **Captions:** one lowercase word, Poppins Bold, white, 7 px black stroke, soft shadow, centred at y 68.7%, hard on and off.
9. **Lists:** 0.45–0.6 s per item, one insert per item, then a resolving shot of about 1.2 s.
10. **Illustrate literally.** Abstract ideas become props (clock, map, book, sign, label). Use 2D stickers only when there is no literal image.
11. **Shake:** none on calm shots. Use `run` for runners, `rumble` for sustained action and `impact` on impact words.
12. **Depth of field** only on CU, ECU and inserts. Wides stay in deep focus. No rack focus, no motion blur.
13. **Hook:** finish the premise sentence by 1.2–3 s, in 2–4 shots, with the camera already moving at frame 0.
14. **Ending:** cut 0–0.3 s after the last word. No call to action, no end card.

---

## 1. Shot length and rhythm

### 1.1 Measured statistics

| Video | Shots | Length (s) | Mean | Median | p10 | p90 | Min | Max | Cuts per 10 s | Words per shot |
|---|---|---|---|---|---|---|---|---|---|---|
| S6 | 70 | 123.5 | 1.75 | 1.67 | 0.82 | 2.72 | 0.12 | 4.88 | 5.6 | 8.1 |
| S8 | 65 | 109.8 | 1.69 | 1.67 | 1.06 | 2.42 | 0.53 | 3.23 | 5.8 | 7.1 |
| S1 | 69 | 118.1 | 1.69 | 1.38 | 0.60 | 3.47 | 0.28 | 5.01 | 5.8 | 8.0 |
| S10 | 101 | 151.4 | 1.48 | 1.35 | 0.62 | 2.45 | 0.48 | 4.05 | 6.6 | 6.7 |
| S2 | 110 | 160.4 | 1.46 | 1.26 | 0.79 | 2.35 | 0.55 | 4.13 | 6.8 | 6.7 |
| S9 | 103 | 117.8 | 1.14 | 1.17 | 0.60 | 1.71 | 0.20 | 2.47 | 8.7 | 5.2 |
| S4 | 124 | 147.6 | 1.19 | 1.13 | 0.74 | 1.66 | 0.45 | 2.47 | 8.3 | 4.4 |
| S5 | 99 | 111.2 | 1.12 | 1.07 | 0.55 | 1.87 | 0.10 | 3.20 | 8.8 | 4.7 |
| S7 | 131 | 158.3 | 1.21 | 0.97 | 0.47 | 2.27 | 0.25 | 4.10 | 8.2 | 5.3 |
| S3 | 143 | 144.5 | 1.01 | 0.97 | 0.54 | 1.58 | 0.17 | 2.40 | 9.8 | 4.1 |
| **Pooled** | **1015** | **1342.5** | **1.32** | **1.18** | **0.60** | **2.22** | 0.10 | 5.01 | **7.56** | **5.7 (median 5; p10–p90 2–10)** |

- **Pooled distribution:**

  | Shot length | Share |
  |---|---|
  | under 0.6 s | 10.2% |
  | 0.6–1.0 s | 24.9% |
  | 1.0–1.5 s | 33.2% |
  | 1.5–2.0 s | 15.9% |
  | 2.0–3.0 s | 13.3% |
  | 3.0 s or more | 2.5% |

  The p95 is 2.59 s.
- **Framing does not set length.** Median length by framing ranges only from 1.08 s (CU) to 1.23 s (WS). The narration sets length.
- **Narration speed:** 4.34 words/s overall (about 260 wpm; 222–283 across videos). So **number of shots ≈ number of words ÷ 5.5** for the house tempo, ÷ 7 for steady mode and ÷ 4.5 for fast mode. A 120 s script of about 520 words gets about 95 shots.
- **Two tempo modes, split 5 and 5:**

  | Mode | Videos | Median shot | Cuts per 10 s | Where cuts fall |
  |---|---|---|---|---|
  | Steady | S6, S8, S1, S10, S2 | 1.26–1.67 s | 5.6–6.8 | At clause boundaries: 70–90% of cuts follow punctuation (S6 90%, S8 about 90%, S1 76%, S2 79%, S10 71%) |
  | Fast | S9, S4, S5, S7, S3 | 0.97–1.17 s | 8.2–9.8 | On every new noun: only 36% (S4) to 54% (S9) of cuts follow punctuation |

  The house default sits between them: median about 1.2 s, about 7.5 cuts per 10 s.

### 1.2 Rules

- **R1 — Segmentation.** Use one shot per clause. Clause boundaries are:
  - punctuation (, . ? ! ; : —);
  - conjunctions when the running clause already has 3 or more words (and, but, so, because, then, until, when, while, which, who);
  - the start of quoted speech.
- **R2 — Split.** If a clause has more than about 9 words or runs over 2.0 s, cut at the onset of its second concrete noun. In fast mode, cut on every concrete noun. S9: "goose" gets a goose, "gold collar" a collar close-up. S4: "school" cuts to the school, "hospital" to the red-cross building.
- **R3 — Merge.** Merge fragments shorter than 0.6 s into a neighbour, except list items, stutters and impact hits.
- **R4 — Cut timing.**
  - `start = round(words[i0].start × 30) / 30`. Measured: median +0.033 s after the onset; 80–98% of cuts fall within 0.1–0.15 s (S4 99/123 within 0.10 s; S2 96% within 0.15 s; S1 62/68). S8 cuts about 0.08 s after the phrase onset.
  - `end` = the next shot's `start`. There are no gaps and no overlaps.
- **R5 — Pauses.** Captions go blank during a pause. The shot carries on: either keep the push running or cut at the next onset. Never cut inside silence. The longest pause measured is 1.1 s (S7).
- **R6 — Tempo bands:**

  | Section | Seconds per shot | Evidence |
  |---|---|---|
  | Hook (0–3 s) | 0.8–1.7; 2–4 shots | All 10; premise finished by 1.2 s (S10), 2.3 s (S8, S2, S4), 2.5–3.0 s (S5, S6, S1, S9) |
  | World-rule montage | 1.0–2.0, one per sentence | S6 2.8–24 s, S8 0–26 s, S2 0–12.5 s |
  | Story | 1.0–1.7 | everywhere |
  | List or triplet | **0.45–0.6 per item** (one-word shots: median 0.483 s, n=40) | S5 "Pianos, / cars, / the church bell," 0.60/0.48/0.60; S10 "No birds, / no wind, / no crickets" 0.58/1.02/0.52 and "lightning, / rain, / no sound" 0.48 each; S7 four monsters 0.45 each |
  | Impact montage | 0.45–0.55 per hit | S7 door slams 70.1–72.1 s (0.48–0.50); S3 action 0.3–0.7 |
  | Stutter or jump-cut burst | 0.12–0.45 | S6 "keep up ×3": 0.42 / 0.25 / 0.12 / 0.45; S1 "7, 8" 0.28 / 0.38 |
  | Climax | tighten to about 0.8× | S7 section medians fall from 0.92 to 0.76; S1 flicker plus 6/7/8 at 0.3–0.5 |
  | Long hold | 2.5–5.0, at most 3% of shots, 2–4 per video | see the list below |

- **Long holds have four uses:**
  - Establishing aerial or reveal: S1 crane 5.0 s; S6 globe pull-out 4.9 s; S5 plank EWS 2.2–2.6 s; S4 scale crane 2.4 s.
  - Reading a document, map or card: S7 map 4.1 s, S10 quota card 4.05 s, S7 book page 3.2 s.
  - The emotional low: S8 "his label just sat there" 3.23 s; S7 "slept on the tracks" 3.12 s; S10 dad 3.1 s.
  - A POV device: S2 telescope iris 4.13 s.

  Every long hold carries a slow move, except a deliberately locked shot on loneliness.
- **R7 — Diversity.** Never place two consecutive shots with the same framing, angle and subject, unless it is a deliberate jump cut. Cut between 2–4 angles of one location before moving on (S8).
- **R8 — Ending.**
  - The last shot is a slow push on the protagonist or a callback image.
  - Cut 0–0.3 s after the last word: S7 +0.3 s, S4 and S2 hard stop, S3 +0.5 s.
  - 0 of 10 videos have a call to action or an end card.
  - Loops are optional: S5 has a true seam, and S6, S2, S10 and S3 loop softly by echoing the first image or line.

---

## 2. Framing, angle and 9:16 composition

### 2.1 Framing distribution (start framing of each shot)

| Video | MS | WS | CU (incl. inserts) | MCU | EWS / aerial | ECU |
|---|---|---|---|---|---|---|
| S6 | 51.4 | 14.3 | 15.7 | 7.1 | 5.7 | 5.7 |
| S8 | 36.9 | 23.1 | 13.8 | 18.5 | 0 | 6.2 |
| S1 | 30.4 | 20.3 | 26.1 | 13.0 | 5.8 | 4.3 |
| S10 | 28.7 | 22.8 | 21.8 | 20.8 | 5.0 | 1.0 |
| S2 | 49.1 | 29.1 | 10.9 | 6.4 | 2.7 | 1.8 |
| S9 | 43.7 | 21.4 | 17.5 | 11.7 | 4.9 | 1.0 |
| S4 | 27.4 | 35.5 | 15.3 | 4.8 | 13.7 | 3.2 |
| S5 | 28.3 | 33.3 | 18.2 | 4.0 | 4.0 | 12.1 |
| S7 | 46.6 | 9.9 | 18.3 | 16.0 | 3.8 | 5.3 |
| S3 | 35.7 | 29.4 | 17.5 | 7.0 | 6.3 | 3.5 |
| **Pooled** | **37.7** | **24.4** | **17.3** | **10.5** | **5.5** | **4.2** |

Also pooled: 6.8% of shots are tagged as inserts, 3.0% as over-the-shoulder (OTS) and under 1% as POV. About 4% start as one framing and end as another (MS→EWS, CU→WS).

**When to use each framing:**

| Framing | Use for | Engine `frame` |
|---|---|---|
| **MS** (default) | A character doing what the clause says. Head at about 30% of frame height. | `ms` |
| **WS** | Places, groups, travel, consequences ("So everybody waits"). | `ws` / `mws` |
| **EWS / aerial** | The premise, "the whole town", big numbers, chapter openers. About 1–2 per 30 s (giant-scale variant: 14%). | `ews` |
| **MCU / CU** | Feelings, reactions, dialogue, names ("My name is Wren"), expression swaps. | `mcu` / `cu` |
| **ECU / insert** | A named prop, number, counter or in-world text (ticket, gauge, clipboard, collar, cake, label). Often high-angle or top-down. | `ecu` / `cu` |
| **OTS** | Someone watching or discovering (S10 Wren over the crowd; S3 Ryan and the merchant). | `ms` + `screen` offset |

### 2.2 Angle distribution and meaning

| Video | Eye | Low | High | Top-down |
|---|---|---|---|---|
| S6 | 80.0 | 11.4 | 7.1 | 1.4 |
| S8 | 63.1 | 26.2 | 9.2 | 1.5 |
| S1 | 60.9 | 18.8 | 15.9 | 4.3 |
| S10 | 75.2 | 12.9 | 8.9 | 3.0 |
| S2 | 57.3 | 22.7 | 13.6 | 6.4 |
| S9 | 63.1 | 26.2 | 8.7 | 1.9 |
| S4 | 37.1 | 30.6 (worm's-eye 4.0) | 30.6 | 1.6 |
| S5 | 54.5 | 27.3 | 15.2 | 3.0 |
| S7 | 83.2 | 4.6 | 8.4 | 3.8 |
| S3 | 54.5 | 25.9 | 16.8 | 2.1 |
| **Pooled** | **62.1** | **20.8 (incl. worm 0.7)** | **14.1** | **3.0** |

Explicitly dutch shots are 0.9%. Most tilt comes from roll drift (§3.2).

The meaning of each angle is consistent across all 10 videos:

| Angle | Use for | Evidence |
|---|---|---|
| **Low** (`angle:'low'`, −15°) | Authority, status, heroes; giants and scale; signs or landmarks overhead; running heroics | S9 Victor shots 11/25 and giants 48/49/61/63/82; S5 mayor, balancer, statue; S6 pacers; S1 sign; S10 chimneys; S4 creature legs |
| **Worm's-eye** (`'worm'`, −35°) | Sky, steeple, floating, towering legs | S2 steeple/sky; S4 0.0 s turtle leg |
| **High** (`'high'`, 30°) | Vulnerability, smallness, sadness, aftermath, crowds | S5 Nell on the plank; S9 58/67/68; S8 baby and doctors; S7 72.1 lonely |
| **Top-down** (`'top'`) | Object inserts (baskets, maps, book pages), a ring of characters, falling, voids | S2 baskets and the 61.6 ring; S7 map 22.9 and book 97.0; S9 75.9 "fell out of my arms"; S5 top-down rise |
| **Dutch** (`roll` 10–35°) | Only when the world itself tilts (S5 55.4/57.6/92.2/95.5) or for one chaos beat (S4 20° then 35° at 81.5–83.2) | |

### 2.3 9:16 composition rules

- **Horizontal placement:** centre the subject horizontally in all 10 videos. Go off-centre only for an OTS foreground block (S10: Wren's head lower right) or a 2-shot.
- **Face band:** put faces and eyes at **15–45% of frame height**.
  - MS head at about 30%: S6 25–35%. The engine's `FRAMES`/`AIM` already does this.
  - CU eyes at 30–45% (S7). Creature heads and eyes at 25–45% (S4).
- **Headroom:** keep it tight. CUs may crop the top of the hair (S7, S9, S8).
- **Caption band:** captions centre at y 62–74% (median 68.7%) and sit over the torso, hands, legs or ground.
  - The samples never reframe to keep this band clear.
  - Our rule is stricter: keep faces above 58% and keep key props out of 62–76%.
- **Bottom edge:** keep key content out of the bottom 20% (y > 80%) because the YouTube title and channel UI sits there (S1, S7).
- **Right edge (guideline, not measured):** the Shorts action buttons cover roughly x > 88% from y 45–85%. Keep key props out of that strip.
- **Wides:** put the subject lower-middle with architecture above (S7). Put the landmark or sign in the upper third, or let it fill the top 40% in low angles (S1). Skies take the top third (S3).
- **Composition:** use strong verticals and diagonals such as pillars, towers, chimneys and the plank diagonal (S5, S10).
- **In-world text:** chest labels sit at 35–60% (S8). Signs sit in the upper third.

---

## 3. Camera moves

### 3.1 How often each move is used

The table pools all 1,015 shots, classified from their move labels.

| Move | Share | Median shot (s) | Engine |
|---|---|---|---|
| Push-in (including "slow push") | **45.3%** | 1.23 | `zoom: 0.10` (FOV) or `move:'push_in'` |
| Static / micro-drift | 12.3% | 1.02 | `move:'static'` (usually still with `zoom`) |
| Track / truck / follow / pan | 11.6% | 1.23 | `truck`, `track` |
| Drift (small push, mostly S7 "gentle drift") | 8.3% | 0.85 | `zoom: 0.05` |
| Pull-out | 5.6% | 1.17 | `zoom: -0.12` / `pull_out` |
| Tilt | 3.6% | 1.10 | `path` with a fixed `pos` (no tilt preset) |
| Crane / pedestal | 3.3% | 1.73 | `crane_up`, `crane_down`, `pedestal` |
| Lead (track-back in front of a mover) | 2.6% | 1.72 | `lead` |
| Orbit / arc | 1.8% | 1.40 | `orbit`, `arc` |
| Handheld | 1.6% | 0.73 | `handheld` |
| Punch-in | 1.2% | 0.58 | `zoom` preset `punch` |
| Whip | 1.2% | 0.81 | `whip` |
| Roll | 0.9% | 1.03 | `from/to: { roll }` |
| Flyover / aerial glide | 0.4% | 1.06 | `flyover` |
| Crash pull-out | 0.1% | 0.72 | `zoom: { from: 1, to: 0.2, ease: 'inCubic' }` |

**Measured zoom on non-travelling shots (n=731):**
- 73.9% push in by at least +3%;
- 8.6% pull out by at least −3%;
- 17.5% stay within ±3%.

Overall, **about 88% of all shots have visible camera motion**. Most "static" shots still carry sway or micro-drift.

**House move targets:**

| Move family | Share of shots |
|---|---|
| Push family (incl. small drift) | 55–70% |
| Travelling moves (track, lead, crane, tilt, orbit, flyover) | 15–25% |
| Pull-out | 4–8% |
| Truly static | 5–12% |
| Punch-in | 1–3% |
| Whip | 0–2% |

### 3.2 Default push-in

**Per-video medians:**

| Video | Push per shot (median) | Rate (%/s) | Non-travelling shots pushing ≥3% |
|---|---|---|---|
| S7 | 5.9 | 6.0 | 60% |
| S1 | 9.0 | 6.5 | 86% |
| S10 | 10.0 | 7.0 | 84% |
| S8 | 15.1 | 7.5 | 81% |
| S9 | 10.1 | 10.0 | 65% |
| S4 | 12.8 | 10.8 | 67% |
| S2 | 14.6 | 11.1 | 82% |
| S5 | 12.2 | 11.3 | 71% |
| S6 | 20.6 | 14.5 | 91% |
| S3 | 20.7 | 21.5 | 75% |
| **Pooled** | **11.5 (p10 4.7, p90 37); median of videos 12.5** | **9.6 (p10 3.8, p90 33); median of videos 10.4** | 74% |

**Curve shape:**
- **Linear, constant rate** in 5 of 10 videos (S6, S8, S1, S10, S7). The push starts at full speed on the cut and is cut off before it settles. **This is the house curve.**
- **Ease-out** in S9: 60% of the zoom happens in the first half, with per-frame rates of 0.25 / 0.18 / 0.10% by thirds. Engine preset `'push'`.
- **Ease-in-out, soft ends** in S2, S3 and S4.

**Mechanism:**
- **Pure magnification (FOV)** dominates: S6 shows pure scaling, S1 has no parallax, and S9 stays sharp through the zoom.
- **Real dolly with parallax** shows up in S10 (near +20.6% vs far +3.8%) and some S8 shots.
- **Rule:** use the camera's `zoom` (FOV) on CU, MCU and MS. On WS and EWS with foreground layers, use `move:'push_in', amount: 0.08–0.15` so parallax appears.
- **Engine caveat:** the engine's `push_in` default `amount: 0.3` gives about +43% magnification. That is emphasis strength, not a default.

**Push strengths:**

| Strength | When | Evidence | Engine |
|---|---|---|---|
| Gentle, +4–8% | Dialogue, calm talk | S7 | `zoom: 0.06` |
| **House, +10–14%** | Default | | **`zoom: 0.10`** (`'slow'` = 0.14 is S6's median) |
| Insert fast push, +15–54% in 0.7–1.25 s | Revealing a prop, number or counter | S5 | `zoom: { to: 1.4, dur: 1.0, ease: 'linear' }` (≈ `'emphasis'`) |
| Emphasis, +20–55% | "Bigger than she was", being dropped in the sack, climaxes; about 8–12% of shots | S9 | `zoom: { to: 1.5, ease: 'outQuad' }` |
| High-energy, +40–70% in 0.5–0.8 s; up to ×2–3 in 0.93 s on a POV push | High-energy variant only | S3 | |

### 3.3 Roll drift

- **Measured |roll| per shot:** median 1.3°, p75 4.0°, p90 9.3°. 41% of shots roll by 2° or more.
- **Three styles:**
  1. **Sway or none:** S9 rolls ±0.45° on a 1.0 s sine on most shots, restarting each cut (engine `shake:'sway'`). S7's median is 0.3°.
  2. **Slow dutch drift of 2–5° per shot (about 2–4°/s)** on roughly a quarter of shots:
     - S10 53.7 s (about 4°/s), then −4°, −5°, −4.5°, +5°, +5°, +4°;
     - S8 shots 2, 30, 34, 42, 60;
     - S2 2–10°, **alternating direction on consecutive inserts** (+3°, −6.5°, +8.6°).
  3. **Big roll on hero moves:**
     - 8–17°: S2 register page +16°, S1 −10°, S7 letter 12°, S3 11–17°, S4 flyover 17° bank;
     - 25–57° on falls, space shots and chaos: S6 globe −15° and −25°, S5 fall −57°, S2 second town −32°, top-down −35°, S4 dutch 35°.
- **House rule:** add roll drift to about 30% of shots: `from:{roll:0}, to:{roll:±(2–4)}`, alternating sign. Use ±6–10° on inserts and top-downs, 8–17° on hero moves and 25–60° only on falls or chaos.

### 3.4 Punch-ins on keywords

| Video | Word | Punch | Extras |
|---|---|---|---|
| S8 28.15 | "emergency" | +25% in 0.25 s (15 frames), easeOutCubic | face swap (engine preset `punch`) |
| S1 109.10 | "8." (end of a countdown) | +13% in 0.38 s | |
| S3 103.47 | "god!" | ×1.49 in 0.27 s | flash and radial blur |
| S3 67.87 | "bite" | ×1.23 step | |

- **Frequency:** 1–3 per video (1.2% of shots).
- **Triggers:** a shouted or quoted word, the reveal noun, the last number of a countdown.
- **Engine:** `zoom: [0.10, { preset: 'punch', t: words[k].start - shot.start }]`.
- **Jump-cut punch burst**, for repetition or counting: keep one set-up and step MS → MCU → CU on each repeat, 0.12–0.45 s per shot.
  - S6 "Keep / up, keep / up, / keep up" at 31.9–33.2 s.
  - S3's 18 reframes (×0.7–1.3) on word beats; S9 pose jump cuts at 32.7–33.7 s.

### 3.5 Pull-outs and reveals

- **Gentle pull:** median −15% per shot (n=45). Engine `zoom: -0.12`.
  - Uses: a subject walking toward the camera (S8 −13.6%/s), isolation, context after a CU.
  - S7 pulls −9 to −15% (storm castle, library, skeleton).
- **Reveal pull, ease-out:**
  - S10 factory: −45% in 1.6 s, slowing down.
  - S9 gate: −45%, settling in 0.4 s.
  - S5 crane pull-out: street MS → EWS aerial in 2.5 s; fast for 0.5–1.2 s, then eases to a near hold by 2.3 s.
  - Engine: `move:'pull_out', amount: 0.8, ease:'outCubic'` or `move:'aerial_reveal'`.
- **Cosmic or scale pull-out:**
  - S6 globe: −91% (about 11.5×) in 2.5 s, ease-out, with −15° roll. Engine `zoom:'reveal'` (`from 11.5, to 1`).
  - S6 second globe: −59% in 4.9 s with −25° roll.
- **Scale crane with orbit:** S4 27.53 s. Starts on an MS of a waving boy, then pulls back, rises and orbits about 50° until the town and the turtle's head fill the frame. The subject shrinks about 25× over 2.4 s, ease-in-out. Use `move:'path'` with smooth keys (recipe in the JSON).
- **Aerial crane:**
  - S1: rise and pull to 0.46× scale over 4.9 s, ease-in-out, then tilt up to the sign ("60,000 people").
  - S2: crane up plus push from the door to the attic window, +64%, eased.
  - S4 city crane: towers fill the frame, then the camera pulls back and descends.
- **Flyover or glide:**
  - S6 aerial glide +89% in 1.2 s over the crowd.
  - S5 flyover 1.45 s (131% of frame width) and the loop flyover.
  - S4 rooftop skim 0.94 s with a 17° bank.
  - Engine `move:'flyover'`.
- **Crash pull-out:** S7 130.45 s, about 5× in 0.45 s with ease-in plus speed lines ("So I watched"). Use at most once per video.

### 3.6 Track, lead and follow (11.6% + 2.6%)

- **Leading track-back:** the camera retreats in front of the walker or runner at the same speed, subject centred in MS.
  - Dominates S6 0–41 s (18.6% of its shots); also S9 1/5/18/20/79, S8 52–54, S3 80.6.
  - Engine `move:'lead'` (defaults to `shake:'run'`).
- **Lateral truck:**
  - S1 ±29–49% of frame width in about 1 s; S1 line track at 73% of frame width per second with 6 Hz handheld.
  - S5 54% pan with −16° roll; S7 background slides 90% of frame width in 2.7 s.
  - S4 eagle pan 118%; S10 slow, 4–19% per shot.
  - Engine `move:'truck', amount: 3–8` (studs).
- **Follow from behind:** S7 +19% while drifting with the walker; S10 79.4 s; S2 tunnel dolly. Engine `move:'track'` (side `back`).

### 3.7 Orbit and arc (1.8%)

- **Measured examples:**
  - S8: about 120° in 2 s around grandpa.
  - S9 23: crane/orbit down onto the crowd, about 65°.
  - S2: orbit around the collar-lift, 2.3 s.
  - S4: chain orbits of about 40° and 80°; top-down yaw orbit 43° in 1.5 s (engine `top_down`, `spin: 43`).
  - S6 61.6 s: fast orbit as the head turns (+73% in 0.87 s).
- **Speed:** about 40–60°/s. Use `move:'orbit', sweep: 60–120`, or `arc` (35°) for a gentle version.

### 3.8 Tilt and pedestal (3.6% + 3.3%)

- **Tilt up** for "up and up", sky and sign reveals:
  - S9 75, 85, 86.
  - S1 3.47 s: a fast 0.3 s tilt followed by a **damped spring settle** (about 5 Hz, decaying over 1.3 s, ζ≈0.3).
  - S10 pedestal: −12% vertical over 2.1 s.
- **Tilt down** onto a page, face or object: S2 rock face −62% of frame height in 1.1 s; S7 book −49% plus a +20% push.
- **Engine gap:** there is no tilt preset. Use `move:'path'` with the same `pos` on both keys and different `target`s, or `pedestal`. There is no spring settle either; fake it with 3–4 overshoot keys.

### 3.9 Whip (1.2%)

- **Measured examples:**
  - S5 fast pans: up to 13% of frame width per frame, **no blur** (82.9, 95.5, 110.3).
  - S1 whip down into the drawer: 30% of frame jump plus haze blur over 0.25 s.
  - S9 82.33: directional-blur whip over 6–18 frames.
  - S3: 0.1–0.4 s whips with motion blur, plus one rotational spin-whip.
- **Uses:** location jumps ("meanwhile", "down in"), grabs.
- **Engine:** `move:'whip', whip:{ dur: 0.2, sweep: 80, dir:'out' }`. Add a directional-blur fx only when the whip acts as a transition.

### 3.10 Follow-the-fall

- **Measured examples:**
  - S5 2.57 s: the camera tilts down about 90° past the plank's underside while rolling −57°, tracking a falling can (1.2 s).
  - S9 76: fast tilt down after the falling rock (5% of frame per frame, no blur).
  - S7 120: handheld follow of a falling page (8% peak-to-peak).
- **Engine:** `move:'path'` with a fixed position. The target follows the object; ease `inQuad`, roll 30–60°.

### 3.11 Dolly zoom

Seen in 0 of 10 videos. The engine supports it, but don't use it, or use it at most once for a dread beat.

### 3.12 Shake

**Which videos use it:**
- **No sustained shake:** S6 (except running wobble), S2, S10.
- **Action beats only:** S8, S5, S1, S7, S3, S4.
- **Global sway on most shots:** S9 only (80 of 103 shots).
- **Pooled:** 11.3% of shots are tagged handheld (3.8% without S9) and 2.4% impact.

**Measured profiles:**

| Profile | Amplitude | Frequency | Roll | Where | Engine preset |
|---|---|---|---|---|---|
| Running wobble | 0.7–1.6% jitter | 2–3 Hz | ±1–2° | S6, tracking beside runners | `run` (0.008, 2.5 Hz, 1.2°) |
| Sway | 1–2% drift | 1.0 Hz | ±0.45° | S9 | `sway` |
| Handheld walk or crowd | 0.2–1.2% RMS | 4–7 Hz | 0.1–0.25° | S5; S1 track (0.6% vertical, 1.7% horizontal, 6 Hz, 0.35°) | `handheld` |
| Action rumble | 0.3–0.9% RMS (peaks 2–5%) | 3–5 Hz | 0.4–1° | S8; S3 0.3–0.8% at 3–7 Hz; S4 0.5–1% and about 1°, whole shot, no decay | `rumble` |
| Monster montage | 2.4–3.9% peak-to-peak | 4–6 Hz | small | S7 3.2–5.0 s | `{type:'handheld', amp:0.015}` |
| Decaying impact | 1.8–2.8% p2p, about 0.2 s decay (S7); 2–6%, 0.6–0.8 s (S9) | about 7 Hz (S7) | | door slams, landings | `impact` |
| Heavy slide | 3.1% RMS horizontal | about 11 Hz | 0.85° | S5 truck slide | `slide` |
| Spring settle | 0.3% RMS | 5 Hz, damped over 1.3 s | | S1 tilt landing | not in the engine |

**House rule:**
- Production default `shake: null`.
- Use `run` on lead or track shots of runners and `handheld` on walking crowds and lateral tracks.
- Use `rumble` for a sustained quake, chase, giant footsteps or chaos.
- Use one `{type:'impact', t: onset}` per impact word.
- Never shake calm, emotional, establishing or dialogue shots.

### 3.13 Depth of field and motion blur

- **Depth of field is used only on CU, ECU and inserts** in all 10 videos. Wides are deep focus. Rack focus appears in 0 of 10. 7.5% of shots are tagged.
- **Strength by video:**
  - S7: strong on almost every CU and MCU (background blur radius 1–2% of frame).
  - S10 forest CUs: 8–15 px.
  - S8: 6–10 px.
  - S9, S5, S1, S3: inserts and macros only.
  - S2 and S4: almost none (S2 has bokeh orbs).
- **House:** `post.dof = { focus: '<subject>.head' | '<prop>', bokeh: 3 }` on CU, ECU and inserts. Use `bokeh: 2` on MCU, optional. Nothing on MS, WS or EWS.
- **Motion blur is absent in 9 of 10 videos.** 60 fps strips of fast pans are crisp. S3 is the exception, and S4's smear is a 30→60 fps interpolation artifact. **Keep motion blur off**, or use 2–3 sub-frames only on S3-style whips.

---

## 4. Transitions

**Pooled `transition_out` across 1,015 shots:**

| Transition | Share |
|---|---|
| Hard cut | **95.8%** |
| Jump cut (18 of them in S3) | 2.2% |
| Whip / blur | 0.6% |
| Dissolve | 0.4% |
| Cut to black | 0.1% |
| Loop seam | 0.1% |

**Intro on frame 0.** In all 10 videos the first frame is already moving:

| Variant | Share | Parameters |
|---|---|---|
| **Zoom-blur** (house) | 4 of 10 | S6: scale 1.6→1.0 with radial blur over 0.13 s (4 unique frames). S10: 1.3→1.0, 15°→0 roll, about 20 px→0 blur in 8 frames (0.13 s), ease-out. S1: 1.35→1.0 over 0.45 s, blur in the first 0.2 s. S9: one radial-blur frame. |
| Directional blur-in at the loop seam | 1 of 10 | S5: 5 frames, smear of 8% of width → 0 |
| White fade-in | 1 of 10 | S7: white hold 0.28 s, then exposure ramps back to normal by 1.1 s |
| None, camera already moving | 4 of 10 | S8, S2, S3, S4 |

The house intro is `fx: [{ type:'intro_zoom_blur', t:0, dur:0.13, zoom:1.3, rotate:15, radialBlur:0.08, ease:'outCubic' }]`. It drives `post.screen` and `post.radialBlur` down to 0.

**Flashes inside shots.** These are not transitions. 7 of 10 videos have none (S6, S9, S5, S2, S8, S10, S4).

| Flash | Spec | Source |
|---|---|---|
| Impact | white, alpha 0.6→0 over 0.08 s (2–3 frames, +35 luma) | S1 bell 95.97 / 108.13, with a shockwave ring |
| Lightning | 0.1 s, +40–70 luma, plus a bolt mesh | S3 (27 flashes), S7 8.9 / 9.3 |
| Big magic or explosion | 0.23–0.5 s, +53 to +137 luma | S3 17.23, 67.87, 103.57, 117.10 |
| Reveal fog-flash | fog-white 0→0.6→0 over 16 frames, model swap at the peak | S7 56.25 (silhouette → "He was bones") |
| Black dip | `flash_black` for 0.17 s, then sunrise | S3 37.1 |

**Other transitions:**
- **Dissolves:** 3–4 frames, only for an x-ray, ghost or transformation (S7 105.8 / 106.7 / 107.3). Never use a dissolve as a scene transition.
- **Day to night:** a hard cut with identical framing and a swapped look preset (S1 7.80 "300 years"; S2 86.0→87.0; S3 presets per scene).
- **Foreground wipe:** an in-camera wall or post passes close to the lens, and the cut lands when it covers more than 90% of the frame (S4 31.40 / 31.93; S8 87.9; S2 grass and fence).
- **Loop seam (optional):** the last shot's move (S5's flyover) continues into frame 0 with the 5-frame blur-in, and the last sentence reads straight into the first.

---

## 5. Captions

### 5.1 Measured per video

| Video | Font | Colour | y centre | Stroke | Shadow | Words | Casing and punctuation | Animation |
|---|---|---|---|---|---|---|---|---|
| S6 | Poppins Bold | white | 69.5% | 7 px | soft, 4–6 px down | 1 (function words grouped) | lowercase; commas and apostrophes kept | none |
| S8 | Poppins Bold / ExtraBold | white | 73.5% | 6 px | soft, 3–4 px down | 1 (2–3) | lowercase; digits | none |
| S1 | **Poppins Bold (verified by render)** | white | 73.9% | 7 px | hard, +3 / +6 | 1–3 | lowercase incl. "i"; commas kept, periods dropped; digits | none |
| S10 | Poppins Bold / SemiBold | white | 70.7% | 7 px | hard, +3 / +6 | 1–3 | lowercase; commas kept | none |
| S5 | Poppins Bold / ExtraBold | #F2FC0C | 68.0% | 8 px | +3 down | 1–3 | lowercase; punctuation kept | none |
| S3 | Poppins ExtraBold-like | #EDFF0B | 68.7% | 6–8 px | hard, 4–6 px down-right | 1–3 | ASR casing; punctuation kept | none, 1-frame gap |
| S4 | Poppins Bold / ExtraBold | #F0FE1A | 68.7% | 6–8 px | hard, 4–6 px down-right | 1 | lowercase incl. names | none |
| S9 | Montserrat Black / ExtraBold | white | 68.4% | 7–9 px | soft, 4–6 px down-right | 1 | lowercase, proper nouns capitalised; punctuation stripped | **pop 84→100% over 5 frames** |
| S2 | Montserrat ExtraBold / Black | white | 62.3% | 6 px | soft, 3–4 px | 1 | lowercase; numbers mixed | **pop 85→100% over 3–4 frames** |
| S7 | Arial Black (Archivo Black is close) | white | 62.2% | 5–6 px | soft, 2–3 px | 1 | lowercase; no punctuation; digits | **fade + scale 75→100% over 4 frames** |

- **Size (consistent across videos):** cap or ascender height 3.1–3.6% of frame height (59–70 px); character width 4.0–5.3% of frame width (median about 4.7%); font size about 82–90 px at 1080 width; x-height 2.2–2.4% of height.
- **Timing (all 10):** the caption appears at the word onset (0–60 ms after), disappears at the next caption, and goes blank during pauses (1–4 frame gaps).
- **Never used:** emphasis colour or size changes (0 of 10), title cards (0 of 10).
- **ASR errors** remain on screen in the samples ("russell", "capitol", "woo"). We caption from the script, so we should not copy them.

### 5.2 House default

| Property | Value |
|---|---|
| Font | Poppins Bold 700, 84 px at 1080 width (cap height ≈3.2% H) |
| Fill | #FFFFFF |
| Stroke | black, 7 px, round joins |
| Shadow | rgba(0,0,0,0.6), offset (3, 6) px, blur 4 |
| Position | x 50%, y **68.7%** (the median of 10; single line) |
| Words | 1 per caption. Group 2–3 words when the extra words are short function words (a, an, the, in, on, of, to, at, for, and, but, so, it, i, my, his, her, was), up to 14 characters. 7 of 10 videos group this way. |
| Casing | lowercase everything, including names and "i" |
| Punctuation | keep , ' ? ! and drop . ; : and quotes |
| Numbers | digits ("300", "60,000", "11") |
| Animation | none: hard on at the onset (30 fps), off at the next onset |
| Pauses | blank when the gap is 0.15 s or more |

### 5.3 Variants (presets in the JSON)

| Variant | Settings | Source |
|---|---|---|
| `pop` | Montserrat ExtraBold 800; scale 0.85→1 over 4 frames, linear; 1 word | S9, S2 |
| `fade_scale` | Archivo Black; 5.5 px stroke; y 62.2%; opacity 0→1 plus scale 0.75→1 over 4 frames; no punctuation | S7 |
| `yellow` | #F0FE1A fill; hard black shadow (4, 5); y 68.7% | S5 #F2FC0C, S3 #EDFF0B, S4 #F0FE1A — 3 of 10 |
| `high` / `low` | y 62.2% / y 73.7% | S7 and S2 / S8 and S1 |

---

## 6. 2D overlays (stickers and editor graphics)

**Usage:**
- **4 of 10 videos** use 2D overlays: S7 (8 kinds), S2 (2), S10 (2–3), S1 (1).
- **6 of 10 use none:** S6, S9, S5, S8, S3, S4.
- They appear on roughly 1–3% of shots in total.
- Exposition always goes into **in-world text and props**: chest labels (S8), clipboard, counters and blueprint (S5), sign, tickets and ledger (S1), marker cards (S10).

| Overlay | Video and time | Parameters | Narration trigger | Engine kind (`fx/overlay.js`) |
|---|---|---|---|---|
| Sweat drop | S7 0.4–1.1 | blue drop grows beside the head | nervous hero in the hook | `sticker` |
| Red "!" | S2 21.0–22.2 | 0→130→100% in 3 frames, follows the push | "the guild has one rule…" (warning, realisation) | `sticker` (text) |
| X stamps + ring | S7 23.3–25.4 | 6 X marks pop in 3–4 frames on words; red ring grows 2× and fades over 0.25 s; 0.5–1° roll jolt | "the districts don't talk" (on a map) | `x_stamp` |
| Split screen | S7 25.5–27.9 | 2 panels, 12 px divider | "haven't spoken in 400 years" | **missing** |
| Speech bubble | S7 40.9, 44.4 | white ellipse, navy outline, pop 0.6→1 in 5 frames | short shout or greeting ("Hi…", "ZOMBIE!") | `bubble` |
| Speed lines | S7 130.2–131.4 | 40–80 wedges, clear centre 45%, reseeded every 1–2 frames | crash pull-out, time rush | `speed_lines` |
| Path draw | S7 153.6–155 | green dotted routes drawing across the map | route or plan | `path_draw` |
| Stars | S7 155.5; S1 106 (3D) | yellow 4-point stars, pulse 0.9–1.1 at 4 Hz | pride, magic, happy ending | `stars` |
| Iris mask | S2 74–78.1, 81.1–82.2 | black frame, circle 94% of width, 6 px gold ring | telescope POV | `iris` |
| Heart pulse | S10 48.1–50.9 | red heart; rings grow to 60% of width every 0.5 s | "you can hear your own heart" | `sticker` + pulse (**ring kind missing**) |
| "Z z" | S1 116.9 | blue letters float up | sleep | `sticker` (text) |
| Sound rings (do in 3D) | S10 ×6; S4 114.6, 118.8 | thin cyan or white rings every 0.3 s, 0.8 s life, at the ear or mouth | hearing, voice, horn | 3D additive sprites |

**Rules:**
- Use an overlay only for what cannot be shown literally in 3D: feelings, sounds, prohibitions, POV devices.
- At most **1 overlay beat per 20 s**, each 1.5 s or shorter.
- Pop it in on the word onset.
- No text overlays beyond speech bubbles. No title cards.

---

## 7. Narration pattern → shot recipe

Times are shot-local. "Onset" means `words[k].start − shot.start`.

| # | Narration pattern (cues) | Shots and length | Framing / angle | Camera (engine spec) | fx / post | Evidence |
|---|---|---|---|---|---|---|
| 1 | **Premise or world rule in the hook** ("In this world, everyone…", "In this town…") | 2–3 shots in 2.3–3.0 s | A: the strangest specific image, MS or CU, eye or low. B: EWS / aerial, high | A: `{move:'static', frame:'ms', zoom:0.14}`. B: `{move:'aerial_reveal', amount:8, ease:'outCubic'}` or flyover | `intro_zoom_blur` at t=0 on A | S6 runner → aerial crowd at 1.6 s; S5 crane MS→EWS 2.57 s; S1 ticket ×2.1 → aerial queue; S10 face → factory −45%; S4 leg → flyover → aerial |
| 2 | **Rule statement mid-video** ("You see,…", "nobody…", "has to") | 1–2 shots, 1.5–2.5 s | WS / EWS, eye or high | `{move:'push_in', frame:'ws', amount:0.1, ease:'linear'}` | haze | S1 3.47 sign reveal; S10 4.03; S2 20.37 (+ "!") |
| 3 | **Character intro** ("My name is…", "Her name is…", "This is…") | 1–2 shots, 1.0–2.8 s | MS or MCU; **low** for a hero or status, eye for an ordinary person | `{move:'static', target:'hero', frame:'ms', angle:'low', yaw:20, zoom:0.10}` | face → smile at the name onset | S9 33.73 "Her name is Pebble"; S10 50.93 Wren; S2 35.93 Dex; S9 Victor low angle |
| 4 | **List of three or enumeration** ("Pianos, cars, the bell"; "no X, no Y, no Z") | one shot per item, **0.45–0.6 s**, then a 1.2 s resolving shot | insert CU or MS; vary the framing for each item | `{move:'static', target:'<item>', frame:'cu', zoom:0.14}`; keep the move direction the same | — | S5 49.07–50.75; S10 41.9–44.1 and 72.6–74.1; S7 monsters 3.2–5.0 (0.45 s, with shake) |
| 5 | **Repetition or chant or countdown** ("keep up ×3", "6, 7, 8") | one shot per repeat, 0.12–0.45 s | one set-up stepping MS → MCU → CU | jump cuts: same camera, tighter `frame` each cut; last one gets a `punch` | — | S6 31.9–33.2; S1 108.8–109.5; S3 18 jump cuts |
| 6 | **Keyword shout or emphasis** ("emergency", "god!", the final number) | 1 shot, 0.6–2.2 s | MS / MCU | `zoom:[0.08, {preset:'punch', t:onset}]` | face swap at the onset; optional `flash_white` 0.1 s | S8 28.15; S1 109.1; S3 102.9 |
| 7 | **Reveal or twist** ("and that's when…", "it was…", "I saw…") | 1–2 shots, 1.2–2.5 s | MS → WS / EWS | `{move:'pull_out', amount:0.8, ease:'outCubic'}` or `aerial_reveal`. Alternatives: silhouette → fog-flash; crash pull `zoom:{from:1,to:0.2,dur:0.45,ease:'inCubic'}` | fog-flash 0.27 s with model swap; speed lines on the crash pull | S10 1.2; S9 2.07; S7 55.9, 130.45; S6 silhouette 72.0 |
| 8 | **Scale or quantity** ("60,000 people", "all the way around the world", "every town") | 1 shot, 2.5–5.0 s | EWS aerial, high | `{move:'crane_up', amount:20, ease:'inOutSine'}`. Scale crane: smooth `path` pull back + rise + 50° orbit. Top-down `spin:43` | haze | S1 28.97 (5.0 s); S6 10.33 globe; S4 27.53, 29.93 |
| 9 | **Authority, giant, power** ("the mayor", "giant", "towering") | 1 shot, 1.0–2.0 s | WS / MS, low or worm's-eye | `{move:'static', target:'giant.head', frame:'ws', angle:'worm', zoom:0.08}` | bloom on neon | S9 giants; S5 statue and mayor; S4 legs; S10 chimneys |
| 10 | **Vulnerability or loneliness** ("alone", "nobody came", "just sat there") | 1 shot, **2.5–3.3 s** | WS / MS, high or top-down | `{move:'static', frame:'ws', angle:'high', zoom:-0.05}` (or locked) | — | S8 79.95 (3.23 s); S7 72.1 (3.12 s, high, static); S5 Nell |
| 11 | **Reaction or emotion** ("froze", "smiled", "my stomach dropped") | 1 shot, 0.7–1.5 s | CU / MCU, eye | `{move:'static', target:'hero.head', frame:'cu', zoom:0.12}` (punch if it is a shock) | **instant face swap at the verb onset**; `dof` bokeh 3 | S8 11 face-swap beats; S1 10 shots; S3 3.07 shock swap; S7 |
| 12 | **Dialogue line** (quoted speech, "said", "yelled") | 1–2 shots, 1.0–2.0 s | MCU on the speaker; reverse shot on the listener for the reply | `{move:'static', target:'speaker.head', frame:'mcu', yaw:25, zoom:0.08}` | face alternates `talk_a`/`talk_o`; a bubble only for a short shout | S3 shot/reverse-shot at the counter; S6 91.0; S7 40.9 |
| 13 | **Running or chase** | 1–3 shots, 1.2–2.4 s | MS, eye or low | `{move:'lead', target:'hero', frame:'ms'}` (`run` shake), alternating with `{move:'track', side:'left', shake:'run'}` | dust at footfalls | S6 0–41 (18.6% of its shots); S8 52–54; S3 80.6 |
| 14 | **Fall or drop** | 1 shot, 0.8–1.5 s | CU → WS, high or top-down | `path`, fixed position, target follows the object, roll 30–60°, ease `inQuad` | no motion blur | S5 2.57 (−57°); S9 75.9; S7 120 |
| 15 | **Impact or slam** ("slammed", "boom", "landed") | one shot per hit, 0.45–0.55 s | MS | `zoom:0.08, shake:{type:'impact', t:onset, amp:0.012, freq:7, decay:0.08}` | optional `flash_white` 0.08 s; dust; shockwave ring | S7 70.1–72.1; S1 95.6 bell; S9 85.6 |
| 16 | **Chaos or destruction** ("the town shook", "houses collapsed", "people screamed") | one shot per clause, 0.5–0.8 s | WS / MS, dutch 20–35° | `{roll:20, to:{roll:35}, zoom:0.12, shake:'rumble'}` | debris, dust cloud | S4 79.4–83.2; S8 52.6–54.5 |
| 17 | **Time passing** ("300 years", "all day and all night", "10 minutes later", "every morning") | 1–2 shots, 0.7–1.3 s | A: two shots with identical framing, day → night hard cut. B: ECU clock insert with spinning hands. C: black 0.17 s → sunrise EWS | `{move:'static', frame:'ws', angle:'low', zoom:0.08}` | look preset swap; `flash_black` 0.17 s | S1 7.80; S2 86→87; S7 52.25 / 121.9 / 130.9; S3 37.1 |
| 18 | **Flashback, legend, history** ("used to", "years ago", "in 1900", "the story goes") | the whole passage, normal pacing | normal grammar | normal | `post.grade:{preset:'sepia'}` (sat ×0.35–0.4, mean RGB ≈99/80/51, luma −15–25%), or `desaturated` −0.4 EV, or warm amber; or an illustrated page / parchment insert (top-down, tilt + push); hard cut in and out | S6 37.13 "He used to be up front" and 92.1; S2 31.45 "in 1900" and 118.98 "in 1851"; S1 18.27 / 88.87 "years ago"; S7 97.0 book "1626" and 100.17 amber; S3 24.63 parchment |
| 19 | **Mystery or forbidden place** ("nobody goes up", "nobody's ever seen", "completely silent") | 1–3 shots, 1.5–4.1 s | EWS / WS, eye or low | `{move:'push_in', amount:0.1, ease:'linear'}`; POV variant: `iris` overlay + push ×3 over 4 s | more fog or haze; saturation 0.85 | S10 39.87; S2 74.0 telescope |
| 20 | **Sound or bodily feeling** ("heard", "heart", "voice") | 1 shot, 1.0–2.4 s | MCU / MS | `{move:'static', target:'hero.head', frame:'mcu', zoom:0.1}` | 3D sound rings at the ear; heart-pulse sticker | S10 48.1, 83.27; S4 114.6 |
| 21 | **Prohibition or separation** ("don't talk", "haven't spoken") | 1–2 shots, 2.0–2.6 s | top-down map insert; split screen | `{move:'top_down', target:'map', frame:'ws', zoom:0.04}` | `x_stamp` on each named item at its onset | S7 22.93, 25.53 |
| 22 | **Number, label or prop** ("born holding a number", "her label says") | 1 shot, 0.7–1.8 s | ECU insert, eye or high | `zoom:{to:1.4, dur:1.0, ease:'linear'}` | `dof` on the prop; the text lives on the prop | S5 counter inserts +15–54%; S1 0.47 ticket ×2.1; S8 labels |
| 23 | **Location jump** ("meanwhile", "across town", "down in") | 1 shot, 0.2–0.4 s, or a hard cut to an establishing shot | — | `{move:'whip', whip:{dur:0.2, sweep:80, dir:'out'}}` or a foreground wall-wipe | optional directional blur | S1 82.1; S5 82.87; S9 82.33; S4 31.4 |
| 24 | **Comparison or pair** ("buying one too", "in pairs") | 2 shots, 1.2–1.9 s | mirrored compositions with the same framing | `{move:'static', frame:'ws', zoom:0.06}` | — | S5 6.47–9.85 couches |
| 25 | **Ending or callback** (the last sentence) | 1 shot, 1.5–3.0 s | MS / MCU of the protagonist, or a callback WS | `{move:'static', frame:'mcu', zoom:0.08}` | cut 0–0.3 s after the last word; optional loop seam | S2 Dex; S7 thumbs up; S5 seam; S10 smile; S3 0.5 s push |

**Fallback when no cue matches:** literal MS of whatever the clause describes, `zoom: 0.10`. Pick framing and angle so the diversity rule holds.

---

## 8. Shot-planning template and procedure

### 8.1 Procedure for Claude, per video

1. **Words.** Load `timing.json` words `{ w, start, end }`.
2. **Clauses.** Segment the words using rules R1–R3 (§1.2). Choose steady or fast mode from the script's energy (default: house).
3. **Patterns.** Tag each clause with a pattern from §7, choose its recipe, and assign a tempo band.
4. **Framing and angle.** Take them from the recipe. Otherwise rotate MS → CU/MCU → WS → insert, using the angle meanings in §2.2. Apply R7 diversity.
5. **Times.**
   - Shot 0: `start = 0`.
   - Shot *i*: `start = round(words[i0].start × 30) / 30`.
   - `end` = the next shot's `start`.
   - Last shot: `end = lastWord.end + 0.2`.
6. **Actors.** Swap faces at emotion-word onsets. Choose animation clips from the verbs. Times are shot-local.
7. **Camera.** Set the production default `camera: { fov: 50, zoom: 0.10, shake: null }`, then override per shot from the recipe. Add roll drift to about 30% of shots, alternating sign.
8. **Effects and grades.** Add the intro on shot 0. Add flashes, overlays and grades only where a recipe calls for them.
9. **Validate** against `screen_grammar.json → validation`:

   | Check | Target |
   |---|---|
   | Median shot length | 1.0–1.45 s |
   | Shots over 3 s | at most 4% |
   | Shots under 0.6 s | 5–20% |
   | Push family | at least 55% |
   | Truly static shots | at most 15% |
   | Hard cuts | at least 95% |
   | Shaken shots | at most 15% |
   | Depth of field | only on ECU / CU / MCU / insert |
   | Overlay beats | at most 1 per 20 s |
   | MS share | 30–50% |
   | Eye-level share | 55–80% (giant-scale stories can drop to about 40%) |
   | Cut offset from onset | at most 0.05 s |

### 8.2 Production-level defaults

```js
camera: { fov: 50, zoom: 0.10, shake: null },   // linear +10 %/s push on every shot (median of 10 videos)
post:   { /* house grade from fx/finishing.js; no motionBlur */ },
captions: 'house'                                // analysis/screen_grammar.json → captions.house
```

### 8.3 Per-shot template (JSON-able; the `plan` key is ignored by the director)

```json
{
  "id": "s012_list_pianos",
  "plan": { "words": [41, 41], "text": "Pianos,", "pattern": "list_item", "recipe": "list_item", "tempo": "list" },
  "set": "street",
  "start": 49.067,
  "end": 49.667,
  "actors": {
    "hero": {
      "at": [0, 0, 0], "yaw": 180,
      "anim": [{ "clip": "idle" }, { "t": 0.25, "clip": "point" }],
      "face": [{ "t": 0, "expr": "neutral" }, { "t": 0.30, "expr": "shock" }]
    }
  },
  "camera": {
    "move": "static", "target": "piano", "frame": "cu", "angle": "high", "yaw": 20, "fov": 50,
    "zoom": 0.14, "from": { "roll": 0 }, "to": { "roll": 3 }, "shake": null
  },
  "fx": [],
  "post": { "dof": { "focus": "piano", "bokeh": 3 } }
}
```

**Field rules:**

- **Timing.** `start` and `end` are absolute seconds on the 30 fps grid, derived from `timing.words`. All `t` values inside actors, camera, fx and shake are shot-local.
- **Camera fields** (from `camera/index.js`):
  - `move`, `target` (`'hero'`, `'hero.head'`, `'set.anchor'`, `[x,y,z]`)
  - `frame`, `side` or `yaw`, `angle` / `pitch` / `height`
  - `fov`, `roll`, `screen`, `pos`, `offset`
  - `from` / `to`, `ease`, `t` / `dur`
  - `zoom` (rate number, preset name, `{from,to,t,dur,ease}`, or an array of these multiplied together)
  - `shake` (preset, object or array)
  - `whip`, `keys` (+ `smooth`) for `path`
  - preset knobs: `amount`, `sweep`, `travel`, `spin`
- **Effects (proposed names until `fx/index.js` exists):**
  - `intro_zoom_blur`, `flash_white`, `flash_black`, `fade_in_white`, `dir_blur_in` → drive `post.flash`, `post.screen`, `post.radialBlur`, `post.dirBlur`.
  - Overlay kinds: `sticker`, `x_stamp`, `bubble`, `speed_lines`, `stars`, `path_draw`, `iris` → `post.overlays`.
- **Post:** `dof { focus, bokeh }`, `grade { preset: 'sepia' | 'desaturated' | 'night' | 'sunset' | …, … }`.

### 8.4 Worked example (house tempo)

Narration: *"In this town, everyone lives on the back of a giant turtle. You see, the school is on its head, the bakery on its tail, and nobody has ever seen it sleep."*

| id | Words | Pattern | Length | Shot |
|---|---|---|---|---|
| s001 | "In this town, everyone lives" | hook A | about 1.3 s | Worm's-eye CU of the turtle leg stepping, with the town above it. `{move:'crane_up', target:'turtle.leg', frame:'cu', angle:'worm', amount:6}` + `intro_zoom_blur`; dust at the footfall. |
| s002 | "on the back of a giant turtle." | hook B / scale | about 1.6 s | `{move:'aerial_reveal', target:'turtle', frame:'ws', amount:6, ease:'outCubic'}`, high, haze |
| s003 | "You see, the school" | rule + noun | about 1.0 s | WS of the school on the head, low, `zoom:0.10`, `to:{roll:-3}` |
| s004 | "is on its head," | literal insert | about 0.7 s | CU of the school sign, high, `zoom:{to:1.4, dur:1.0}`, `dof` bokeh 3 |
| s005 | "the bakery on its tail," | list item / pair | about 1.0 s | WS of the bakery on the tail, mirrored composition of s003, `zoom:0.10`, `to:{roll:3}` |
| s006 | "and nobody has ever seen it sleep." | mystery | about 2.0 s | EWS of the turtle's eye at dusk, eye level, `move:'push_in', amount:0.1`, linear, `look:'golden'` |

Check: 6 shots in about 7.6 s is 7.9 cuts per 10 s, median about 1.15 s, all hard cuts. Captions run one word at a time at y 68.7%.

---

## Appendix A: engine gaps found while mapping the grammar

1. **No tilt preset** (3.6% of shots) and **no spring settle** after a fast tilt (S1). Workaround: `path` with a fixed `pos`.
2. **`push_in` default `amount: 0.3`** gives about +43%, which is emphasis strength. The house push is FOV `zoom: 0.10`. A dolly push wants `amount` 0.08–0.15. Consider adding a `'house'` zoom preset at 0.10; `'slow'` stays at 0.14, S6's median.
3. **`pull_out` default `amount: 0.8`** is reveal strength. Gentle pulls should use `zoom: -0.12`.
4. **`fx/index.js` is a stub.** The intro, flash, black-dip and overlay fx names above are proposals.
5. **Overlay layer:** there is no expanding-rings kind (needed for the heart pulse and 2D shockwave) and no split screen.
6. **`engine/captions/` is empty.** The caption presets live in `screen_grammar.json → captions`.

---

I skipped reading report sections A–D and G in full; I used only targeted greps for narration mapping, flashbacks and hooks. I did not edit any engine code. Risks: the move categories come from free-text labels parsed with keyword rules, so the move-mix shares are approximate (±2–3 points). Some per-shot zoom values in S1 and S10 are parsed from prose. The "cuts after punctuation" figures for S2 and S3 come out low because of how their narration text is written, so the doc quotes the reports' own numbers for those two. The right-edge UI strip is a guideline; the samples never measured it.