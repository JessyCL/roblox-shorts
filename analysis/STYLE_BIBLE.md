# Visual Style Bible: Roblox story Shorts (v1.0, 2026-11-14)

This is the single source of truth for how our frames must look. It consolidates measurements of 10 sample Shorts (S1-S10), `research/roblox-look.md` and `research/assets.md`, and it was checked against the evidence images.

Machine-readable companion: `analysis/style_bible.json`, keyed to `engine/runtime` names.

**Rules for reading this document:**
- **Default** = what we do unless a script asks otherwise.
- **Variant** = allowed when the story calls for it.
- **"n/10"** = how many of the 10 sample Shorts show the trait.
- **Legal:** characters, faces, clothing, skies and textures must be **our own original designs**. We match the *design language*, never Roblox assets, logos or catalog items. See `research/assets.md` §1.

## 0. Sources and outliers


**Pipeline consensus (9/10):** Roblox Studio scenes, keyframed in a Moon-Animator-style tool, captured, then edited in CapCut.

**Outliers:**
- **S3:** true motion blur, mirror reflections in water, displaced ocean swells, voronoi shader skins and filmic tone mapping. Its global luma is 89.7 because about half the runtime is night. Use it only for *power or water* effects and as a night reference.
- **S4:** realistic, glossy, rigged animal meshes about 300× human scale carrying instanced towns. Mood is set by per-shot sky presets rather than grading.
- **S5:** one permanent lilac golden hour and soft, lifted blacks.

---

## 1. Characters

### 1.1 Body and proportions (10/10)
- **Rig:** 6 rigid parts: rounded-cylinder head, 2×2×1 torso, and 1×2×1 arms and legs.
- **Joints:** **no elbows or knees**. Limbs pivot only at the shoulder and hip, and the neck turns.
- **Height:** 5.125 studs. The head is ≈1.25 studs across, about 24% of height. Arms are as long as the torso; legs are about 39% of height.
- **Surface:** skin is flat SmoothPlastic with a faint sky sheen. There are no outlines and no cel shading.
- **Legal tolerance for our `original` preset:**
  - head width 0.55–0.7× torso width;
  - limb length equal to torso height ±10%;
  - rigid parts with flat box normals;
  - never trace Roblox's head mesh.
- **Skin, default:** realistic tones (cream, light tan, nougat, brown), mixed in crowds (S6, S8, S5).
- **Skin as kind-coding (variant, 4/10):**
  - S2: blue = lake, green = forest, black = soot, white = sky.
  - S7: vampires pure white, zombies sage green, ghosts mint at 50% transparency.
  - S1: light-blue and purple skins.
  - S10: a pure white head as a plot marker.
- **Classic "noob" yellow:** a one-off gag only (S2 guildmaster).

### 1.2 Role through proportion and colour
| Role | Rule | Evidence |
|---|---|---|
| Child | Uniform scale 0.65–0.75 | S5 Nell 0.65× |
| Baby | 0.4–0.5 scaled rig, or a sphere head with a tuft | S8 doctor's baby; S1 sphere-head baby |
| Tall authority / odd official | Vertical stretch about 1.6×, floor-length coat | S5 Balancer |
| Giant | Uniform ×10 to ×100, shot from low angles against a miniature set | S3 merchant ×10; S9 farmer ×30 and Linda ×100; S4 animals ~300× |
| Ego / statue | Gold-metal replica of a character | S5 statue |

- **Camera reinforces role:** low angles for authority and giants (S6, S9, S5, S8, S3); high or top-down angles for vulnerability (S6, S9, S5, S8).
- **Hero signature colour:** one saturated colour readable at aerial distance.
  - Red or orange in 5/10: S6 red knit, S8 red, S10 red flannel, S5 orange, S4 orange jacket.
  - Others: yellow raincoat (S3), lime hoodie (S7), pink sweater (S9).
  - Never dress extras in the hero colour.
- **Protagonist** is a kid or teen in 10/10.
- **Elder** appears in 9/10 (white hair 7/10, white beard 4/10: S1, S8, S3, S4). This "grandpa" is a must-have template.

### 1.3 Faces
**Style (10/10).** Flat 2D decals on the head front:
- thick, rounded black strokes with no shading;
- eyes are vertical black ovals or dots, with optional 1–2 white glints;
- brows are thick slanted bars;
- open mouths are black with a **red interior**, plus an optional row of white teeth (S6, S8, S9, S7);
- tears are blue (S1).

Two families:
- **Classic decal:** all videos.
- **Anime-ish user-made 2D:** big glossy eyes (S1; S3's hand-drawn faces).

The **"googly shock"** (big white-ringed eyes with small pupils) is the go-to big-shock face in 4/10: S3, S4, S6 (terrified white eyes), S8 (red-pupil shock).

**Required expression set** (consolidated; the videos cited are examples):

| Expression | Seen in |
|---|---|
| neutral / smile / grin | all |
| happy closed-eye ^^ | S9, S1 |
| laugh XD | S8 |
| content closed-eye calm smile | S10, S5 |
| smug half-lidded smirk | S9 (Victor), S10, S3, S5 mayor |
| deadpan / flat line | S9, S8, S7 |
| side-eye | S8 |
| skeptical | — |
| worried | S6, S5 |
| sad frown | S6, S5, S1 |
| cry with blue tears | S1 |
| shock with "O" red mouth | all |
| googly shock | S3, S4 |
| terrified (white eyes and teeth) | S6 |
| shout / yell | S6, S5, S10, S4 |
| one-eye yell / wink | S8 |
| angry | S6, S3 |
| determined squint `>_<` | S2, S10, S5 |
| evil / sly toothy grin | S3 |
| toothy grin | S3 dad, S10 |
| sleepy / sleeping (+ "Zzz" sprite) | S1, S4 |

Special variants: skull (S7), fangs (S7), glowing eyes (S3, S4).

**Swap rules:**
1. **Instant swaps only** (1 frame, no tween or morph), 10/10.
2. Swap **on the cue word's onset** or **on the cut**. Examples: S6 18.33 sad→shocked; S8 28.2 on "emergency"; S2 141.5 on "realized".
3. **At most one swap inside a shot.** About one swap every 8–15 s of runtime (S8: 11 swaps in 110 s), clustered on story beats.
4. **No lip-sync, 10/10.** Speech is a held open-mouth decal for the whole line (S5 70.7, S3). Do not use the engine's `talk_a`/`talk_o` visemes by default.
5. No blinking was reported in any video. Keep blinks off, or at most one per 4 s on very long holds.
6. Draw each face at **≥512²** for extreme close-ups. S7's decals pixelate at 4K; we must not.

### 1.4 Clothing (10/10)
- **Construction:** flat 2D shirt and pants textures with baked shading and **visible box-edge seams**, on the classic layout (`research/assets.md` §4.5).
- **Fabric micro-texture is a signature.** Visible knit or cable-knit appears in 7/10: S6, S9, S7, S10, S3, S4, S8.
- **Recurring garments:**

| Garment | Seen in |
|---|---|
| plaid / flannel / gingham | S8, S10, S3, S4, S6 |
| denim | S6, S8, S10 |
| hoodies | S8, S9, S7, S6 |
| suspenders | S1, S2, S6 |
| overalls | S9, S3, S1 |
| cardigans / sweaters | S4, S3, S6, S9 |
| hi-vis vest | S6 |
| leather apron | S10 |
| uniforms | S9 mail, S4 soldiers |
| lab coats | S3 |
| peasant robes | S10, S3 |
| cape with high collar | S7 |

- **Colour:** saturated primaries; outfits read as solid colour blocks at distance.
- **Premise wearables:** chest label plates (S8: white rounded plate, thin dark border, bold coloured text) and emblem patches (S4 turtle patch). These carry the story rule without overlays.

### 1.5 Hair and accessories (10/10)
- **Hair:** chunky, glossy, rigid meshes, smooth-shaded with a strong specular highlight (S6 Oren's yellow spikes in `evidence/quad_faces_env.jpg`). Common styles:
  - spiky anime (5/10: S6, S8, S10, S2, S9);
  - messy or emo fringe (S1, S7, S3);
  - swept or slick (S6, S3);
  - bob, bun, ponytail or pigtails;
  - long flowing (S2);
  - bald with white side tufts (S10, S3).
- **Beards** are separate meshes: long white for elders (S1, S8, S3, S4) and full brown (S2, S3, S8).
- **Headwear:**

| Item | Seen in |
|---|---|
| flat cap | S8, S5 |
| top hat | S5 |
| beanie | S1 |
| party hats | S8, S9 |
| chef toque | S1 |
| bucket hat | S1, S2 |
| boater | S1 |
| postal cap | S9, S7 |
| plumed helmet | S4 |
| bowler | S4 |
| sun hat | S6 |
| flower crown | S9 |

- **Face items:** round wire glasses (S7, S1), goggles (S6, S5), wolf mask (S7).
- **Never** use recognisable catalog items such as S1's "R" cap.

### 1.6 Held props
- **Style:** simple, chunky and saturated. Examples by video:

| Video | Props |
|---|---|
| S6 | crate, apple, rake, whistle |
| S8 | envelope, phone |
| S9 | rock, plush, sack |
| S5 | clipboard, tape measure, hammer |
| S7 | coins, letters, cup, book, torch |
| S1 | ticket, gold bell, ledger |
| S2 | basket, telescope, quill |
| S3 | rod, jar, fishbowl, bucket |
| S4 | horn, spear |

- **Holding pose:** the arm (or both arms) forward about 90° (S1).
- **Gripping:** props weld to the hand anchor; no finger animation.

### 1.7 Crowds
| Tier | Count | Freq | Videos | How built |
|---|---|---|---|---|
| Mass | 150–1000 visible (implying 10⁴–10⁵) | 4/10 | S6 (~300 column), S1 (hundreds to ~1000 queue), S7 (150–250 torch crowd), S10 (300 grid of 12×25) | Instancing, high camera angles |
| Group | 8–40 | 6/10 | S8 15–25, S9 12–15, S5 8–15, S2 30–40, S3 ~20, S4 soldier squads of 8–12 | Varied avatars, hand-placed |

**Level of detail** (S1 `evidence/t_aerial_crop.jpg`):
1. heroes: full rig and unique outfit;
2. mid: 8–12 outfit variants, recoloured (S10);
3. far: **pawns**, a sphere head on a torso box on a leg box with no arms (S1);
4. top-down: dots (S6 118.6).

**Variation tricks that are on-style:**
- the same frozen pose for everyone (S7, S10, S1);
- recolour by group (S2, S7 knit sweaters in random warm colours);
- run-cycle phase offsets (S6);
- identical props such as chairs (S1 114.7);
- no idle motion in crowds (S1, S7, S9).

**Avoid:** lockstep walk phases, and grey "unloaded" avatars (a S1 artifact).

### 1.8 Animals and creatures (6/10)
| Style | Videos | Rule for us |
|---|---|---|
| Voxel / blocky pets built from parts, square black eyes | S9 (tiger, wolves, owl, deer, goose, puppy) | **Default creature style.** Original and on-brand. |
| Stylized low-poly with googly eyes | S3 fish (the god fish is instanced overlapping spheres) | Default for "magic" creatures |
| Realistic textured animals | S4 giants (turtle, glossy black wolf with emissive red eyes, elephant, bear, eagle, deer); S10 robin and cricket | Variant for giant carriers. Use CC0 meshes only (e.g. Quaternius) with saturated grading. |
| Monster variants of the 6-part rig | S7: vampire (white head, red eyes, cape), werewolf mask and flannel, ghost (50% transparent mint, wispy tail), zombie (sage skin), skeleton (bone legs) | Build as rig skins and accessories |
| Deliberately out-of-style "realistic rock" gag | S9 Pebble | Allowed as a joke prop |

### 1.9 Animation vocabulary and timing
| Element | Spec | Evidence |
|---|---|---|
| Overall | Pose-to-pose keyframes with **long dead holds**. Many close-ups move only the camera and the face. | 10/10 |
| Walk | Rigid scissor swing. Cycle 0.60–0.67 s; legs +66°/−45°; arms −56…+63°; **no body bob**; feet slide; speed 16 studs/s | research §7.2; S6, S2, S7 |
| Run | Cycle ≈0.4 s, ±60° rigid swing, head fixed | S6 `evidence/run_024_6.jpg` |
| Idle | Statue (≤1.5°). S10 adds a small body bob. | — |
| Pose change | Snap in 2–3 frames at 30 fps (S10 85.0), or ease over 0.2–0.4 s (S8) | — |
| Gestures | Point, wave, arms up, cupped hand to mouth or ear, sit, kneel, hug, carry, collar-lift, panic arms straight out | S4, S1, S10 |
| Fall / jump | Arms straight up; keyed trip with no bounce | S6 41–44 |
| Float | T-pose glide with gentle bob; hover a few studs up | S2 |
| Prop drop-in | Falls in from above frame over 0.15–0.25 s with ease-in, hard stop and dust burst | S1 |
| Physics | Keyed or baked rigid motion; whole sets tilt as one group | S5, S8, S9; no live ragdoll |
| Scale change | Root scale tween ×10 over about 3 s | S3 |

---

## 2. Environments

### 2.1 Location archetypes
| Archetype | Freq | Videos | Kit contents |
|---|---|---|---|
| Open grass hills, meadow, forest | 5/10 | S8, S9, S2, S10, S4 | Rolling terrain, low-poly or realistic trees, fences, distant hazy hills |
| Medieval / Tudor village and square | 4/10 | S7, S2, S10, S4 | Half-timber and stone houses, cobbles, slate roofs, lanterns, carts, barrels, bunting |
| Bedroom | 4/10 | S9, S3, S10, S4 | Bed with knit or plaid blankets, window, dresser, lamp |
| School / classroom | 4/10 | S9, S7, S3, S4 | Desks, blackboard with text, yellow walls; brick facade with clock |
| Water (lake, sea, river, pool) | 4/10 | S2, S3, S10, S8 | Dark-teal glossy plane; cyan by day |
| Void / space / cave / abyss | 4/10 | S6, S5, S2, S3 | Black or #211E2D; a single key light on the subject |
| Map / diorama / top-down insert | 4/10 | S7 (×3), S5, S10, S2 | Miniature of the world, often with drawn paths |
| Modern suburban street | 3/10 | S8, S9, S5 (on the plank) | Siding houses, picket fences, lamp posts, mailboxes, asphalt with yellow dashes |
| Hospital / nursery | 3/10 | S8, S1, S3 | Pale walls, beds, monitors with neon waveforms |
| Warm hall / tavern / guild / castle | 3/10 | S7, S2, S3 | Candles, chandeliers, bookshelves, long tables |
| Desert / savanna / canyon | 3/10 | S6, S5, S3 | Tiled ground texture, mesas, eroded orange-red walls |
| Faceted mountains with snow caps | 3/10 | S9, S10, S5 | Smooth-terrain look: grass, rock and snow bands |
| Festive fair / party | 3/10 | S8, S9, S2 | Pennants, string lights, booths, Ferris wheel, cake |
| Brick civic plaza / desk | 1/10 | S1 | Salmon running-bond brick plaza, box buildings with window grids |
| Factory / industrial | 2/10 | S10, S3 (black market) | Brick chimneys, tanks, neon tubes, corrugated walls |
| Graveyard / horror | 1/10 | S7 | Iron gates, tombstones, lanterns, ground fog |

### 2.2 Construction (10/10)
- Worlds are built from **unbevelled primitives** (block, wedge, cylinder, ball) with hard edges and flat normals, plus smooth terrain and a few meshes.
- **Scale is roomy:** doors 8×5 studs, storeys 12–16 studs, roads 20–30 studs wide.
- **Set dressing:** dense in interiors, moderate outdoors. Silhouettes must read at phone size.
- **Depth layering:** foreground occluder or character, then mid subject, then hazed background, then sky.
- **Foreground occluders** sweep past the lens on moving shots: grass blades (S2), a post (S8), a stone wall used as a wipe (S4). Seen in 3/10.

### 2.3 Materials
Use Roblox-like tiled 2022-style textures, tinted by part colour, repeating every 8–10 studs (`research/roblox-look.md` §4.1). Up close they should look **crunchy**.

| Material | Freq |
|---|---|
| Wood / WoodPlanks | 10/10 |
| Neon | 10/10 |
| Brick | 8/10 |
| Grass terrain | 6/10 |
| Cobblestone | 5/10 |
| Slate / rock | 5/10 |
| Fabric (tablecloths, knit) | 4/10 |
| Sand / ground terrain | 4/10 |
| Asphalt | 3/10 |
| Polished gold metal (S5 statue, S1 bell, S3 bathroom) | 3/10 |
| Glass | 3/10 |

Neon is unlit HDR emissive at about 4× its colour. When it should light the scene, add a PointLight (S6's whistle floods the scene red).

### 2.4 Scale tricks and giant set pieces (9/10)
Every premise has a **macro object** shot at three scales: an aerial "diorama", street level, and an extreme close-up of a detail.

| Video | Macro object |
|---|---|
| S6 | Globe with a road ring |
| S5 | Seesaw town on a pillar over a void |
| S4 | Towns on giant animals |
| S10 | 40 chimneys emitting mesh clouds |
| S1 | NOW SERVING neon sign hung from sphere-clouds, plus an endless queue |
| S2 | Cliff carved into a face |
| S9 | Giant farmer and mountain-woman |
| S3 | Colossal god fish |
| S8 | Ferris wheel |

Rules:
- One model serves all scales.
- Miniature towns read as a **dense texture of 100–300 tiny houses** (S4, S5).
- Haze and height fog sell size.
- Introduce the object with a crane or aerial reveal (S5 0–2.6 s, S4 27.5–29.9 s).

### 2.5 Set reuse
- One hero set carries 45–70% of the runtime: S6 savanna ~70%, S10 Hollow ~45%, S4 meadow almost every exterior.
- Sets are re-lit per scene (S2 guild and cliff in day, night and sepia; S1 square day and night; S9 town day and night) and cut between 2–4 angles (S8).
- S3 is the exception, with 14 sets and little reuse. Do not copy that; it is expensive and not needed for the look.

### 2.6 In-world text and displays (8/10)
The story rule is shown **diegetically**: S8, S1, S5, S10, S7, S2, S3, S4.

| Type | Examples |
|---|---|
| Chest labels | S8 |
| Neon sign with emissive number | S1 "NOW SERVING 4": navy panel #1B2238, near-white neon border, gold number #F5D46A |
| Counters and gauges with instant digit swaps (up to ~20 Hz) | S5 tilt counter |
| Cards in marker font with a red pin | S10 yellow card #fbe94a |
| Plaques, emblems, calendars, clocks | S7 (the clock is used 8 times as a chapter divider) |
| Ledgers and registers in serif type | S1 "CLERK", S2 |
| Blackboards | S3 "SHOW & TELL" |
| Building signs | S4 "SCHOOL", red cross on the hospital |

Rules:
- Text is lit by the scene, bold and legible at phone size.
- In inserts, cap height is at least about 4% of frame height.
- Changes happen by texture swap or hard cut.

### 2.7 Sky
- **Default (9/10):** saturated cyan-blue with puffy cumulus. S6 and S10 use painted cumulus skyboxes; S8 and S4 a cloud layer. S10 adds wispy streaks.
- **Night:** navy with stars (S1, S4, S3).
- **Sunset:** a huge sun disc behind flattened pink cloud bands (S10).
- **Variant:** lilac #DBC1DA (S5).
- Skies never glow by themselves; only the sun disc blooms.

---

## 3. Lighting and atmosphere presets

General rules:
- **Sun shadows** are crisp but soft-edged, with softness 0.15–0.35. They are blue-grey from the sky fill and **never black**.
- **Time of day changes by hard cut between presets** (8/10), never by animated time-lapse. Exceptions: S7 clock-hand inserts and S3's 0.5 s storm roll-in.
- **Nights stay legible.** Luma never goes below about 35.

| Look (engine name) | Freq / videos | Sun | Sky / ambient | Haze colour and density (per stud) | Height fog | Bloom (intensity / threshold) | Notes and targets |
|---|---|---|---|---|---|---|---|
| **day** (default) | 10/10 | Elevation 45–60°, #fff1dc, 3.0 | Zenith #1c74e6 → horizon #9fd2f5, cumulus; sky-coloured fill | Pale blue #b6d6f0, 0.002–0.004 (Roblox Atmosphere ~0.3) | — | 0.45–0.6 / 1.0 (neon and sun only) | Luma 120–160, sat 115–165 |
| **golden / sunset** | 7/10: S6, S7, S10, S5, S9, S3, S4 | 8–15°, #ffb46e, 2.7; long shadows | Warm horizon #ffcf9c, big blooming sun disc | Warm #e9cfa6 or pink #e88a7a / #eac6d6, 1.5–2× day density | — | 0.6 / 0.95 | **Used for endings in 5/7.** Luma 100–160, sat 145–195 |
| **pastel** (lilac golden hour) | 1/10: S5 | 13°, behind the subject | Sky #DBC1DA, lilac fill | #e4c4d6, 0.003 | Void below, #211E2D | 0.6 / 0.8, wide (catches sky and gold) | Blacks lifted (1st-percentile luma 48); RGB 172/121/124 |
| **night** | 6/10: S9, S2, S7, S1, S3, S4 | Moon #9db6ff, 0.55 | Navy #030820 → #14295a, stars | Navy, 0.0026 | — | 0.85 / 0.9 | ~30% of windows lit (#f0f4ff / #ffd27a); warm lamps #ffb349. **Saturation stays 150–250**, luma 35–85 |
| menace sky | 1/10: S4 | Day sun on the ground | Starry deep-blue sky (#0b2a6a-ish) | normal | — | Eyes and windows bloom | Luma 66–100; mood set by the sky, not a grade |
| **spooky** | 2/10: S7, S3 black market | Moon 0.4 | Blue-violet #2e2440 | #241e34, 0.012 | **Ground fog 0–3 studs** | 0.7 / 0.9 | Warm torches or teal tank glow plus red eyes; luma 38–95, sat 88–181 |
| storm | 3/10: S10, S7, S3 | Overcast, 1.0, flat | Mauve-brown overcast #8c7470 (day); night + lightning | Mauve, 0.005 | — | Low | Rain, dark smoke #4a4440, cyan glow spot in the clouds; storm-day sat 70–81 |
| **interior** (warm) | 9/10 | Window key, 1.6 | Warm fill | none | — | 0.5–0.7 | Candles and lamps as point lights |
| candle (hyper-warm) | 3/10: S2, S7, S3 | Dim | — | — | — | 1.0 / 0.85 | Sat 150–220; R−B +110…+180 |
| **interior_bright** (high-key) | 4/10: S9, S8, S2, S7 | Bright | Pink or white | none | — | 0.7 / 0.95, window bloom | Luma 160–220, sat 40–110; relief, heaven or payoff |
| teal forest | 1/10: S10 | Soft day | — | Teal #3f8f9c, ~0.006 | Height falloff | 0.4 / 0.85 | Strong DOF on close-ups; floating motes |
| void | 4/10: S5, S2, S6, S3 | Key on the subject only | Black or #211E2D | — | `f = 1 − exp(−k·max(0, y0 − y))`, colour #211E2D | — | Luma 30–75 |
| space | 1/10: S6 | Hard, 3.5 | Black, no stars | 0 | — | 0.6 | Emissive dots; strong DOF on the planet |
| underwater (shallow) | 1/10: S3 | — | Bright refracted surface | none | — | — | Caustics; luma ~200, sat ~50 |

**Bloom (10/10):**
- Applies only to emissive surfaces (Neon at about 4× in HDR), the sun, flashes and specular gold.
- **Sunlit white walls must not bloom.**
- Halo radius 25–60 px at 1080 width:
  - S1 sign 40–60 px;
  - S9 string lights 24–40 px;
  - S3 2–5% of the frame.
- Use the threshold on max(R,G,B), or push neon to ×6, so saturated red and blue neon still blooms.

**Depth of field:**
- Present on close-ups, medium close-ups and inserts in 8/10 videos. It is rare in S2 and S4, which are mostly deep focus.
- **Wide and medium shots are always sharp.**
- Far blur of 6–15 px at 1080 width; default about 10 px.
  - S8 6–10 px; S10 8–15 px; S7 1–2% of frame width (the strongest).
- **No rack focus in 10/10.**

**Haze (9/10):**
- Far geometry fades into the sky's own colour.
- Exteriors only; density as in the table.

**God rays:** gentle sun glow only, intensity 0.05–0.15 (S5, S4; 2/10).

---

## 4. Colour grading

### 4.1 Global statistics
Measured from each video's `motion.csv` at 270×480. Luma is the mean of Y and sat the mean of HSV S, both on 0–255. Contrast is the standard deviation of luma.

| Video | Luma | Sat | Contrast | Mean RGB | R−B | Sharpness median (Laplacian var.) |
|---|---|---|---|---|---|---|
| S1 | 136.4 | 100.1 | 57.6 | 154/130/124 | +29 | 1327 |
| S7 | 116.6 | 132.9 | 57.0 | 135/113/88 | +47 | 971 |
| S6 | 122.4 | 139.2 | 63.6 | 139/120/92 | +46 | 2899 |
| S9 | 117.2 | 155.0 | 54.1 | 120/119/101 | +19 | 942 |
| S3* | 89.7 | 120.5 | 48.8 | 89/89/92 | −3 | 526 |
| S4 | 116.1 | 133.0 | 51.0 | 117/118/101 | +17 | 2013 |
| S5 | 136.8 | 99.2 | 50.5 | 172/121/124 | +48 | 853 |
| S2 | 110.7 | 121.5 | 56.4 | 113/112/97 | +15 | 1216 |
| S8 | 119.8 | 132.6 | 55.3 | 118/120/121 | −3 | 1834 |
| S10 | 120.3 | 147.4 | 63.9 | 135/119/92 | +43 | 2750 |
| **Median (target)** | **118.5** | **132.8** | **55.9** | — | **+24** | — |

\*S3 is half night and looks Blender-rendered.

**Per-video targets:**
- luma 110–137; sat 120–155; contrast 50–64;
- R−B between +15 and +48. **8/10 are warm-biased**; S8 and S3 are neutral.
- Luma 10th–90th percentile ≈ 55–100 → 137–170.

**Grade character:**
- saturated primaries;
- cyan skies against warm ground (complementary contrast);
- full tonal range: deep blacks and near-clipped whites (S8 1st/99th-percentile luma 15/234).

### 4.2 Per-scene grade presets
| Preset | Freq | When | Target stats | Grade parameters (engine finishing) |
|---|---|---|---|---|
| **house_day** (default) | 10/10 | Everything else | Luma 120–160, sat 115–165, R−B +15…+50 | Sat 1.22, vibrance 0.12, contrast 1.04, curve 0.22, sharpen 0.6 |
| **sepia flashback** | 4/10 graded | Past or legend blocks of 2–6 s, on the *same set* | Luma 77–96; RGB ≈ 99/80/51 (S6), 98/84/52 (S2); R−B +40…+75 | `sepia`: sat 0.35, exposure −0.35, tone #9a784c at mix 0.65 |

Sepia flashback details:
- **Default** = sepia (S6, S2).
- **Grey variant** (S1, sat 18–36): sat 0.22, exposure −0.4, contrast 0.9.
- **Amber variant** (S7): gain 1.08/1.0/0.85, sat 0.9.
- 3/10 leave flashbacks ungraded: S8, S5, and S4 (which recolours the model instead).
- 2/10 use a storybook illustration insert instead (S7 sketch page, S3 parchment).

| Preset | Freq | When | Target stats | Grade parameters (engine finishing) |
|---|---|---|---|---|
| **night blue** | 6/10 | Night, menace | Luma 35–85; **sat 150–250 (stays high)**; R−B −35…−110 | Exposure −0.8, temperature −0.55, **sat 1.15**, blue lift +0.035 |
| **black void** | 4/10 | Secret, cave, space, abyss | Luma 30–75; sat 18–80 (S3 abyss is blue, sat 196) | Exposure −0.3, contrast 1.1 |
| **high-key pastel** | 4/10 | Relief, heaven, payoff, dream bedroom | Luma 160–220; sat 40–110 | Exposure +0.35, sat 0.75, contrast 0.85, lift 0.05, sharpen 0.25 |
| **sunset** | 7/10 | Endings, "that evening", warm emotion | Luma 100–160; sat 145–195; pink or red haze | Temperature 0.5, sat 1.08, gain 1.05/0.97/0.86, exposure −0.1 |
| horror night | 2/10 | Monsters, villain lair | Luma 38–95; sat 88–181 | Exposure −0.35, **sat 0.9**, contrast 1.12, temperature −0.25, tint −0.08 |
| storm day | 1/10 (S10) | Weather turn | Sat 70–81 (≈ ×0.5), mauve | Sat 0.55, contrast 0.92 |
| warm hyper-saturated | 3/10 | Home, community, candlelight (S2, S7, S3) | Sat 150–220; R−B +110…+180 | Temperature +0.35, sat 1.3 |
| dreamy pastel | 1/10 (S5) | Whimsical premise, whole video | Luma 102–169, sat 74–124 | Sat 0.92, contrast 0.88, lift 0.08, temperature 0.06, tint 0.05, sharpen 0.25 |
| cool shade | 1/10 (S8 rockslide) | Danger beat | Luma 54–75 | Exposure −0.5, temperature −0.15 |

### 4.3 Sharpening, tone and grain
- **Sharpening:**
  - 5/10 are "crunchy": S6, S10, S4, S8 (with slight halos), S2.
  - S1 sits in the middle.
  - 4/10 are soft: S7, S9, S5, S3. Their softness comes partly from AV1 compression, DOF and night content.
  - **Default unsharp amount 0.6. Use 0.25 for pastel, high-key and dreamy presets.**
- **Tone mapping:** Neutral or linear-like, with no filmic roll-off. S3's ACES look is a variant we do not use.
- **No film grain (10/10). No chromatic aberration (0/10).**
- **Vignette:** only S8 (corners 0.76× centre luma). S3 is low-confidence. **Off by default.**
- **No LUT "film" looks.**

---

## 5. VFX inventory (consolidated)

Categories: cam = camera, post = post-process, 3D = in-scene effect, comp = 2D compositing, edit = editing, anim = animation. Priority is for our engine.

| Effect | Freq (videos) | Typical parameters | Category | Engine hook | Priority |
|---|---|---|---|---|---|
| slow_push_in | 10/10 | 50–80% of shots; **~9 %/s** (range 5–14), +8–15% per shot. Linear by default (5/10); ease-out (S9, S7) and in-out (S3, S2) allowed. Roll drift 2–10° (S2, S10) | cam | camera `push_in` / `ZOOMS.slow` | must |
| Fast emphasis push | 6/10: S5, S4, S2, S7, S9, S3 | +25–60% in 0.7–1.25 s on inserts and reveals | cam | `ZOOMS.emphasis` | must |
| face_decal_swap | 10/10 | Instant, on cue word or cut, ≤1 per shot | anim | actor `face` keys | must |
| bloom_glow + neon_emissive | 10/10 | See §3 | post / shader | `post.bloom`, Neon | must |
| dof_background_blur | 8/10 regular | Close-ups and inserts only; ~10 px far blur | post | `post.dof` | must |
| atmosphere_haze | 9/10 | Sky-coloured; density per §3 | shader | look fog / sky haze | must |
| Per-scene grade shift | 9/10 (not S5) | §4.2 | post | `post.grade` preset / `color_grade_shift` | must |
| Lighting-preset cut (time of day) | 8/10 | Hard cut between looks | 3D | `shot.look` | must |
| In-world text / display | 8/10 | Digit swaps up to 20 Hz | 3D | `S.text` / canvas texture | must |
| Smoke / dust puffs | 7/10: S6, S8, S9, S7, S1, S10, S4 (S3 uses water spray) | 6–20 soft sprites, life 0.5–1.0 s. S9 puff ring: 10 spheres scaling 0.3→1.2 and fading over 0.5 s. S6 dust wall: screen-filling tan billboards #c7a26c | 3D | particles `puff` / `footdust` / `puff_ring` / `smoke` / `dust_wall` | must |
| Intro blur-in (frame 0) | 7/10: S6, S1, S9, S10, S5, S3, S4 | Scale 1.3–1.6→1.0 over 4–8 unique frames (0.13–0.45 s), radial blur 1→0, optional 15° roll (S10). S7 instead holds white 0.28 s, then ramps in over 0.85 s | post | fx `intro_zoom_blur` / `blur_in` | must |
| Glow pulse on a prop | 7/10: S6 whistle, S8 beam and burst, S9 neon crack, S1 sign, S7 emblems, S3 powers, S10 glowing text | Emissive spike plus point light lasting 0.15–0.65 s, decay ~0.2 s (S6 red #ff2a1a). Neon draw-on in 0.15 s (S9). Flicker toggles every 0.10–0.17 s (S1). One element per beat, 0.5 s apart (S7) | 3D | fx `glow_pulse` / `draw_on` | must |
| 4-point star sparkles | 7/10: S6, S1, S9, S7, S2, S3, S4 | 3–30 per burst, life 0.3–0.8 s, additive, into bloom | 3D | particles `sparkle` / fx `sparkles` | must |
| camera_shake_impact | 6/10: S1, S7, S9, S3, S5, S4 | 1.8–3.1% peak-to-peak, 7–11 Hz, decay 0.08–0.2 s. Spring variant (S1): 5 Hz, damping ratio 0.3, 1.3 s | cam | fx `camera_shake_impact` | must |
| camera_shake_handheld | 6/10: S6, S8, S9, S5, S7, S1 | Only on action, walking or running shots: 0.2–1.7% RMS, 3–7 Hz, roll 0.1–0.7°. **Calm shots are stable in 9/10.** S9 sway variant: 0.45° roll, 1.0 s period, reset per shot | cam | camera shake `handheld` | should |
| Keyed physics, falls, debris | 6/10 | Baked rigid tumbles; fracture swap; splinters | anim / 3D | particles `debris` + keyed transforms | should |
| Rings (shockwave / sound) | 5/10: S1, S7, S10, S4 (+ S3 bubble rings) | Thin white or cyan (#bff6ff) rings at alpha ~0.5. A new ring every 0.3 s, life 0.25–0.8 s, scale 0.2→3, anchored to the head or source | 3D / comp | particles `sound_rings` + ring sprite | should |
| Jump-cut reframe / punch-in cuts | 4/10: S6, S3 (18), S9, S10 | Same setup reframed 0.7–1.5×, cut on word beats | edit | Director: 2–3 framings per setup | should |
| Directional / whip blur transition | 4/10: S1, S9, S5 (loop seam), S3 | 6–18 frames, length ~8% of width → 0 | post | fx `directional_blur` | should |
| 2D stickers / overlays | 4/10: S7, S2, S10, S1 | Pop 0.6→1.3→1.0 in 3–5 frames (easeOutBack). Examples: "!", X stamps, heart pulse, "Zzz", speech bubble | comp | fx overlay | should |
| Ambient motes / fireflies | 4/10: S2, S10, S9, S4 | 3–8 px, additive, slow drift | 3D | particles `motes` | should |
| Foreground occluder wipe | 3/10: S8, S2, S4 | A prop passes the lens for 0.1–0.2 s | staging | Set prop on the camera path | should |
| zoom_punch_in | 3/10: S8, S1, S3 | +13–49% in 0.25–0.38 s, easeOutCubic, on an emphasis word | cam / post | fx `zoom_punch_in` | should |
| flash_white | 3/10: S1, S7, S3 | Lightning: 0.1 s, +40–70 luma. Impact: 0.08–0.5 s. **Never used as a cut transition** | post | fx `flash_white` | should |
| Lightning bolt | 3/10: S7, S10, S3 | Jagged emissive polyline with 5–9 segments, visible 0.1–0.33 s | 3D | fx `beam` / emissive polyline | should |
| Rain | 2/10: S7, S3 | Thin streaks at alpha 0.3–0.4, attached to the camera | 3D | particles `rain` | should |
| Silhouette | 2/10: S6, S7 | Flat dark (#262a36 or dark brown) figure, revealed over 0.5 s ease-out or through a white-fog flash | shader | fx `silhouette` | should |
| Beam / ribbon | 3/10: S8, S4, S3 | Additive ribbon into bloom | 3D | fx `beam` | nice |
| Giant scale change | 2/10: S3, S9 | Root scale ×10 over ~3 s | anim | actor scale keys | nice |
| Ghost transparency / x-ray / forcefield dome | 1–2/10: S7, S4 | 50% transparent mint; 4-frame dissolve; hex dome grows in 0.3 s | shader | Material override | nice |
| Speed lines, iris mask, split screen | 1/10 each: S7, S2, S7 | — | comp | overlay | nice |
| Mesh clouds, wind lines, caustics, splash, power swirl, voronoi skin | 1/10 each: S10, S10, S3, S3, S3, S3 | Premise-specific | 3D / shader | build per production | nice |
| Vignette | 1/10: S8 | Corners 0.76× centre luma | post | `post.vignette` | **off by default** |
| Motion blur | 1/10: S3 only | — | post | `post.motionBlur` | **do not** |

**Transitions:** hard cuts are the norm in 10/10. Besides the frame-0 blur-in, the only transitions are:
- whip blur (4/10);
- foreground wipes (3/10);
- one black dip (S3);
- one white fade-in (S7);
- one crossfade-dissolve (S7 x-ray).

No glitch, no chromatic aberration, no lens flare and no letterbox in any video.

**Visual framing parameters** (independent of captions; in `style_bible.json` under `camera_visual`):
- the subject is centred horizontally (10/10);
- faces sit in the 15–45% height band;
- keep faces out of the 60–78% band (the caption zone);
- put nothing important below 80% (YouTube UI);
- dutch angles of 8–35° only for chaos beats (S5, S3, S4, S9).

**Do not reproduce:**

| Artifact | Where |
|---|---|
| Lights popping on 8–10 frames after a cut (the first frames are lit by ambient only) | S7 (9 cuts; `evidence/lightgrid_popin_rows.jpg`) |
| Irregular duplicate frames and render hitches; ~41 unique fps | S7 (228 duplicates), S5 |
| Single-frame 50/50 blends; optical-flow interpolation ghosting | S8 55.6–58.0; S4 (`evidence/interp_artifacts_16_00_4frames.jpg`) |
| A slowed clip with duplicated frames | S2 153.5–156.5 |
| Grey avatars whose clothing has not loaded | S1 19.7 |
| Low-resolution or pixelated textures and decals in close-up | S6 Earth texture at 96.3; S7 faces at 4K |
| Mesh-intersection slivers; stray rope or beam lines | S10 clouds; S6 96 s |
| Compression blocking or sky banding (render clean, encode at high bitrate) | S6 29.77; S2 39–43 |
| Real motion blur, filmic roll-off, mirror-reflective water *as defaults* | S3 |
| Roblox marks: R$ sack, "R" cap, catalog faces | S9, S1 |

**Frame cadence policy:** render **30 unique fps and duplicate to 60** (5/10 samples are 30 fps content, including the top performer S1). Never interpolate or blend frames.

---

## 6. What makes a frame read as this channel (ranked)

1. **A blocky 6-part character with a flat black-ink decal face is on screen** in the large majority of shots. Hero close-ups fill 55–70% of frame width with the head. (10/10)
2. **Saturated, slightly warm, bright image.** Whole-video luma ≈118, sat ≈133, R−B ≈+25. Saturated cyan sky with puffy cumulus. (9/10)
3. **The camera is always moving.** A slow push-in of about 9 %/s, cut before it settles. Locked-off static shots only as deliberate holds. (10/10)
4. **Roblox-style light.** Bright sun, soft-edged blue-grey shadows, sky-tinted fill, a sheen on SmoothPlastic, little ambient occlusion. (9/10)
5. **Glow only where something emits.** Neon, lamps, eyes, sun and gold bloom with 25–60 px halos; white walls don't. (10/10)
6. **Depth.** Exteriors fade into the sky's colour; close-ups have background blur; wides are deep focus. (9–10/10)
7. **Tactile, crunchy surfaces.** Knit, plaid and denim clothing textures; brick, cobble, plank and grass tiles; sharpening at 0.6. (7/10 knit; 5/10 crunchy)
8. **Chunky glossy mesh hair and one hero signature colour.** (10/10)
9. **The premise is visible in the world:** a label, number, sign, counter or giant object, with no overlay needed. (8–9/10)
10. **Literal illustration.** Each clause gets its own literal shot. Scene and time-of-day presets switch by hard cut. Mood comes from per-scene grades. (9/10)
11. **Crisp 30 fps stepping with no motion blur or blends.** (9/10)
12. Captions are owned by the captions module and listed here for completeness only:
    - one lowercase heavy geometric sans word;
    - white (7/10) or neon yellow #EDFF0B–#F2FC0C (3/10);
    - black stroke plus drop shadow;
    - centre at y 62–74%, median ≈69%.

**Common mistakes to avoid:**
1. **Film grain or an always-on vignette.** Grain appears in 0/10 videos and a vignette in 1/10. These are current engine defaults (§8).
2. **Filmic or ACES desaturation, or AgX grey.** Use Neutral tone mapping plus the house grade.
3. **Desaturated or pitch-black nights.** Target-style nights are saturated navy (sat 150–250) at luma ≥35, with warm practical lights.
4. **Motion blur, frame blending or interpolation.**
5. **Heavy ambient occlusion.** It reads as a Blender showreel.
6. **Knees, elbows, tapered limbs, bevelled or smooth-shaded boxes, outlines or cel shading.**
7. **Lip-synced mouths, tweened expression morphs, frequent blinking.**
8. **Static locked-off shots, or DOF on wide shots.**
9. **Handheld shake on calm dialogue shots** (calm shots are stable in 9/10), and **flashes or whips used as routine transitions** (samples use hard cuts).
10. **Crowds walking in lockstep or all wearing the hero colour.** Grey "unloaded" avatars.
11. **Small characters in realistic-scale rooms.** Keep doors 8×5 studs and storeys 12–16 studs.
12. **Pixelated faces or textures in close-ups.** Roblox logos or catalog items.

---

## 7. Reusable assets and kits to build (prioritized by recurrence)

**P0: needed by nearly every video**
1. **Face atlas.** The 23 expressions in §1.3 plus 4 specials, at ≥512² each with red mouth interiors. (10/10)
   - Engine gaps: `googly_shock`, `side_eye`, `wink`, `content_closed_eyes`, `toothy_grin`, and skull and fang variants.
2. **Hair, beard and headwear library.** About 12 hairstyles, 3 beards, about 10 hats, round glasses. (10/10)
3. **Clothing texture generator.** Knit, plaid/flannel/gingham, denim, hoodie, suspenders, overalls, cardigan, hi-vis, apron, lab coat, suit, robe, uniform. (10/10; knit 7/10)
4. **Archetype cast templates.**
   - Hero kid with a signature colour (10/10).
   - Elder or grandpa with white hair and beard, knit or waistcoat (9/10).
   - Parent.
   - Authority figure: mayor, foreman, clerk, guildmaster or balancer.
   - Doctor or nurse.
   - Baby.
   - Villain.
5. **Crowd system** with 4 detail tiers (hero, variant, pawn, dot), plus same-pose, recolour and phase-offset options. Seated and standing. (10/10 have groups of 8 or more; 4/10 have 150 or more)
6. **Look presets** (§3) and **grade presets** (§4.2), plus sky domes: day cumulus, sunset with a big sun, night stars, storm overcast, lilac.
7. **In-world text kit:** chest plate, sign board, neon sign, card with pin, counter or gauge, blackboard, nameplate, emblem plaque. (8/10)
8. **Village kits.**
   - Medieval / Tudor (4/10): half-timber houses, cobbles, lanterns, carts.
   - Suburban (3/10): siding houses, picket fences, lamp posts, mailboxes, asphalt.
   - Shared street furniture: benches, string lights, bunting (5/10).
9. **Interiors:** bedroom (4/10), classroom (4/10), hospital room (3/10), candlelit hall or tavern (3/10).

**P1**
10. **Terrain kit:**
    - grass hills with low-poly trees (5/10);
    - water plane (4/10);
    - desert and canyon (3/10);
    - faceted snow-capped mountains (3/10).
11. **Particle presets** (most already exist in `fx/particles.js`). Tune them to the parameters in §5: puff, dust wall, star sparkle, motes, rings, rain, smoke, torch fire.
12. **Prop library:** clock with animated hands (S7 uses it 8 times), map diorama (4/10), lanterns, low-poly trees and bushes, long tables, beds, desks, bookshelves, envelopes and letters, coins, gold bell, torches, crates.
13. **Creature bases:**
    - voxel quadruped (dog, tiger, deer, wolf);
    - googly-eyed fish;
    - monster variants of the 6-part rig (ghost, skeleton, zombie, vampire, wolf mask).
    (6/10)

**P2**
14. **Macro set-piece helpers:**
    - giant-scale rig (×10–×100);
    - platform-town generator (S5, S4);
    - globe (S6);
    - chimney and mesh-cloud emitter (S10);
    - colossal creature built from instanced spheres (S3).
15. Storybook / sepia illustration insert shader (2/10).

---

## 8. Engine deltas: current defaults that contradict the samples

| File | Current | Set to | Why |
|---|---|---|---|
| `engine/runtime/pipeline.js` | `post.grain` default 0.06 | **0** | No grain in 10/10 |
| `pipeline.js` | Vignette darkness 0.35, always on | **0** (S8 variant on request) | Vignette in 1/10 |
| `pipeline.js` / `world/looks.js` BASE | Ambient occlusion intensity 2.0 / 1.2 | Lower (research suggests 0.4–0.8 equivalent); verify against close-up contact shadows | Heavy AO reads as Blender |
| `pipeline.js` bloom | Luminance threshold | max-RGB threshold, or neon ×6 | Saturated red and blue neon under-blooms |
| `fx/finishing.js` `GRADE_PRESETS.night` | Saturation 0.7 | **≈1.15** | Target-style nights keep sat 150–250 |
| `fx/finishing.js` `GRADE_PRESETS.horror` | Saturation 0.35 | **≈0.9** | Horror nights keep saturation (S7); add `storm` with sat 0.55 for S10-style storms |
| `camera/index.js` `ZOOMS.slow` | Rate 0.14 | **0.09** (range 0.05–0.14) | Median of per-video push-in rates |
| `characters/faces.js` | `talk_a` / `talk_o` visemes; expression list | Unused by default; add the gap faces from §7.1 | No lip-sync in 10/10 |
| `world/looks.js` | — | Add `storm`, `candle`, `teal_forest`, `menace`, `void` (heightFog already exists) | Starting values are in `style_bible.json` |

---
Caveats:
- I did not render-test the new look and grade parameters; tune them against the target stats with `still.mjs`.
- The ambient-occlusion target comes from research, not measurement.
- Sharpness medians mix in DOF and night content, so treat the crunchy/soft split as approximate.