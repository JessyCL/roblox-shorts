---
name: roblox-shorts
description: Produce a narrated Roblox-style YouTube Short (1080x1920, 9:16) from a premise, story or script, using the in-repo three.js engine (no Blender) - script, TTS voice with word timings, shot planning, sets and characters, camera, effects, captions, music/SFX mix and the final MP4. Use whenever the user asks to make, write, plan, render, fix or iterate a Roblox short / story video, gives a premise like "Everyone has a ___", or asks to change a shot, voice, caption or effect in an existing production.
---

# Roblox Shorts production

Turns a story into a finished Short in a fast, bright Roblox story style (premise stories, blocky
characters, bright Roblox look, constant push-ins, one-word captions, fast AI narration). three.js renders offline
in headless Chrome, ElevenLabs speaks the narration (default voice in `engine/voices.json`; Kokoro is the offline
fallback), ffmpeg mixes and muxes. Only ElevenLabs (voice, bespoke SFX) and music downloads go online.

**Library first:** before building any character, set, prop, animation, effect, sound or music, search the shared
library (`node engine/cli/library.mjs search <words>`, `node engine/audio/sfx_lib.mjs search "<words>"`) and reuse or
adapt what is there; build new only when nothing fits, then harvest it back into the library (step 9).

Project root: the folder that contains `engine/` (this skill lives in `.claude/skills/roblox-shorts/`). Run every
command from the project root.

## Sources of truth (read the relevant one before each step - do not work from memory)

| Doc | Use it for |
|---|---|
| `analysis/STORY_AUDIO_FORMULA.md` (+ `analysis/story_audio.json` script schema) | writing the script, beats, length, voice/pause/music/SFX/mix rules |
| `analysis/SCREEN_GRAMMAR.md` (+ `analysis/screen_grammar.json`) | turning narration into shots: pacing, framing, camera recipes, transitions, captions, overlays |
| `analysis/STYLE_BIBLE.md` (+ `analysis/style_bible.json`) | how frames must look: characters, sets, lighting looks, grades, effects, do-not-reproduce list |
| `engine/ARCHITECTURE.md` | engine layout, production format, determinism rules |
| module headers: `engine/runtime/{world,characters,camera,fx}/index.js`, `characters/anim.js`, `world/generators.js`, `world/text.js`, `characters/crowd.js`, `fx/overlay.js`, `fx/particles.js` | the exact API (fields, presets, names) |
| `productions/proto_ticket/` | a complete working example (script.json + production.js) |

## Workflow

Create `productions/<slug>/` (lowercase, dashes). Work through these steps in order; each produces files the next uses.

**Approval checkpoints (stop and show the user, continue only after they approve or adjust):**
1. **Script** (`script.json` text + title) - step 1.
2. **Storyboard** - the stills sheets (one still per shot, tiled) from step 6, before the full-resolution render.
3. **Preview** - `out/preview.mp4` or the browser preview player, step 7.
4. **Music** - the audition page, step 7a.
5. **Final** - `out/final.mp4` + title + description credits.
Keep earlier outputs when making new versions (`out/final_v1.mp4`, `final_v2_…`) so the user can compare.

### 1. Script → `script.json`
- If the user gave a finished script, keep their words; otherwise write one with STORY_AUDIO_FORMULA §1-2: "In this
  world, ___" hook finished in ≤4.5 s, "You see," line 2, hero at 15-35 %, inciting line ("Then one…") at 38-47 %,
  twist ("That's when I realized…") at 66-78 %, hero acts in the climax, ≥3 plants paid off, ≥8 numbers, present-tense
  coda + ≤8-word last line. 120-150 s, 520-650 words. Title: `Every(one) [verb] (a) [CAPS noun]... #shorts #roblox #viral`.
- Format: the schema in `analysis/story_audio.json` → `script_schema` (lines with `id`, `beat`, `text`, `emphasis`,
  `pause_after_ms`, `say`, `shots[]` hints, `sfx[]` (at least one per line, step 3); `music[]` = section cues + an
  END stop (step 7a)). Digits only where digits should show in captions; `say` for pronunciation.
- Show the user the script (and title) before spending render time if they did not supply it.
- **Pick the structure per video (owner rule).** The template above ("classic": rules of the world → "My name is…" +
  nickname → Grandma/Dad rule plant → rival → "Then one day…") made the Last Bite and Glass Rain scripts feel alike.
  Before writing, choose the structure that suits the premise and say which one and why; do not default to classic.
  Keep the "In this world, ___" hook in every structure. Alternatives (the beat-percent targets still apply to the
  inciting / twist / hero-acts / last-line beats):
  1. **Cold open, then rewind** - open on the worst moment ("Floor 40. The table came down empty."), then go back
     and explain the world. No "My name is…" line needed.
  2. **Rules that get broken** - the world is a list of rules; each section shows someone breaking one, worse each
     time; the hero breaks the last one.
  3. **Day counter** - Day 1, Day 2, Day 3…; each day adds evidence and the narration gets shorter and more scared.
  4. **Investigation** - a mystery, three clues, each clue re-reads the earlier ones, the last flips the story.
  5. **Told by the thing** - the narrator is the monster/place/object ("we"/"I") and its identity is the twist.
  6. **Reverse order** - show the ending first, then walk backwards.
  7. **Second person ("you")** - no named hero; test once only (the one second-person sample Short flopped).
  Vary the middle too: plant an object or rule (key, bell, number) instead of a relative; make the villain the world
  itself or nobody; make the emotional hit a choice, not a loved one in danger. Classic stays available when it fits.

### 2. Voice → `audio/narration.wav` + `timing.json`
- `node engine/cli/make.mjs productions/<slug> --stage tts`. Default narrator: ElevenLabs (`"voice": {"preset": "<name>"}`
  or no voice = the `default` in `engine/voices.json`; other presets are listed there).
  It uses the user's credits (~1 credit per character, about 3,000 per Short) and caches each line under
  `audio/cache/`, so reruns only bill changed lines. The pace is time-stretched to exactly `target_wpm` (262).
  Old productions with `"engine": "kokoro"` keep Kokoro (`am_fenrir`, auto-calibrated; `--passes 2` if wpm is outside
  255-270). Read the lint list it prints and fix real story issues.
- `timing.json` has `words[{i,line,w,text,start,end}]`, `lines[]`, `beats{}`, `cues{}`, `duration`. Everything
  visual is timed from it - never hard-code seconds.

### 3. Shot plan
- SCREEN_GRAMMAR §1, §7-8: one shot per clause (≈5 words), every new noun gets a literal picture, cut 1 frame before
  the first word of the clause, median shot ≈1.2 s (lists 0.4-0.6 s per item, holds 2.5-5 s only for the opening
  aerial, emotional low, reveal card and final image). Framing mix ≈ MS 38 %, WS 24 %, CU 17 %, MCU 11 %, EWS 5 %, ECU 4 %;
  low angle = power, high = vulnerability.
- Write the plan as a table (shot id, words covered, set, actors, framing/camera recipe, fx) before coding.
- **Show the world, not just faces.** Open every new location (and every time-of-day change) with a WS/EWS/aerial
  establishing shot that shows the surroundings (buildings, sky, crowd, the premise object), then cut closer for
  reactions. Aim for ~35 % wide shots (WS/EWS/aerial), ~40 % medium, ~25 % close; never more than 2 close shots in a
  row. Push-ins start from the framing that shows the context (WS → MWS), they don't start tight. Keep camera height and
  screen direction consistent inside a scene so cuts feel continuous.
- **Frame wide enough to see everyone.** Every character being filmed must be fully in frame (no cropped heads,
  arms or bodies) unless the shot is a deliberate face/prop close-up. Set `camera: { widen: 1.3-1.4, zoom: 0.06 }` in
  the production defaults (optical zoom-out applied last; gentle default push-in) and check the stills for crops.
- **Sound effect on every line (user preference, overrides the samples' sparse SFX).** Every narration line gets
  at least one effect matched to the action visible on screen when it's said (footsteps while walking, the thud when
  something lands, creaks, crowd, impacts…), placed with `w` + `offset_ms` on the exact action time, loud enough to
  hear (gain_db ≈ -4…-8 for actions, -10…-14 for ambience) but never burying a key word. Take effects from the shared
  SFX library first (`node engine/audio/sfx_lib.mjs search "<words>"`); generate with ElevenLabs only when nothing fits
  (step 7b) and reuse an id when an action repeats.
- **Everyone moves.** Every character on screen is animated: `idle`/`look_around` at minimum, `walk`/`run`/`sprint`
  with `to`/`path` whenever the narration implies movement or a character enters, gestures on cue words (`cheer`,
  `point`, `shrug`, `scared`, `jump`, `wave`, `facepalm`, `yell`…), crowds on `idle`/`walk` (never frozen statues unless
  the story says so). Entrances walk into frame; reactions combine a face swap with a body gesture.

### 4. Cast and sets
- **Reuse the shared library first** (`assets/library/`, everything built for earlier videos):
  `node engine/cli/library.mjs search <words> [--type cast|kit|prop|clip|fx|music|sfx|model]` / `list [--type …]`; picture
  previews in `assets/library/thumbs/<type>_sheet.png` (regenerate with `library.mjs thumbs [--type cast|kit|prop]`).
  - Cast presets: `cast: { hero: { preset: 'lenny', shirt: { color: '#2b6cb0' }, attach: ['cookie'] } }` (overrides merge
    one level into the preset; `attach:` = library attachments: cookie, jar, needle, knitting, held_bell, held_boot,
    boot_on_leg, sewn_sleeve, glow_eyes; hide per shot with `hide: [key]`).
  - Environment kits: `sets: { town: (S) => S.kit('tudor_village', { look: 'night' }) }` → `{ anchors }`. Each kit
    registers actor spots and camera spots as set anchors: `camera: { move: 'static', pos: 'set.cam_wide', target:
    'set.cam_wide_at' }`, actors `at: 'set.altar'`. Options/anchors per kit: `library.mjs list --type kit` / the kit's `meta`.
  - Props: `await S.prop('crown', { name: 'crown', pos, yaw, scale, ...opts })` → a group pivoting at `pos`
    (animate via `ctx.set.S.groups.crown`); `S.model` stays for imported CC0 models.
  - FX recipes in a shot's fx list: `{ type: 'recipe', name: 'hand_reveal' | 'bell_tolls' | 'thunder_clap' |
    'monster_entrance' | 'drop_landing', t, ...params }` (params in `engine/runtime/fx/recipes.js`).
  - When a production builds something reusable (set piece, prop, outfit, clip, fx combo), add it to the library
    (kit/prop module with `export const meta` + default builder, cast JSON with a `header`) and run `library.mjs index`.
- Characters: original blocky designs only (`characters/index.js` header): `template:` (grandpa, kid, baby, …),
  `body`, `build` (child/tall/heavy…), `skin`, `shirt`/`pants` patterns, `hair`, `beard`, `hat`, `acc`, `hold`,
  `label`, `animal:`; crowds via `crowd()` (instanced, never lockstep). Give the hero one signature colour.
- Sets: build with the `S` API in studs (`world/index.js` header): `S.part`, generators (`building`, `street`,
  `house`, `tree`, `fence`, `lampPost`, `sign`, `car`, `food`), `S.text` for in-world text (labels, signs, counters),
  `S.terrain`/`S.water`/`S.clouds`/`S.sky`, `S.group` (pivot = the group's world position) for set pieces you animate,
  `S.model` for library props (`assets/library/manifest.jsonl`). Make the premise visible in the world.
- Looks: `day` (default), `golden`, `pastel`, `night` (saturated navy), `spooky`, `storm`, `interior`,
  `interior_bright`, `candle`, `teal_forest`, `menace`, `void`, `space`; change time of day by hard cut between looks.
- Reuse one hero set for 45-70 % of the runtime; re-light it per scene.

### 5. `production.js`
- Copy the structure of `productions/proto_ticket/production.js`: import `timing.json`, a `word(line, w)` helper,
  cut points `T[]` from word starts, `span(i)` per shot, shot-local times for face swaps / drops / fx.
- Per shot: `set`, `actors` (`at`, `yaw`, `face` keys - instant swaps on cue words, `anim` clips/paths, `lookAt`),
  `camera` (always moving: `zoom: 'slow'` push-in by default; recipes in screen_grammar.json; `frame`, `angle`,
  `side`, `move`, `drift`, shake only on action shots), `fx` (intro_zoom_blur on shot 1, punches on emphasis words,
  glow_pulse, particles, sepia/night grades…), `post` (dof only on CU/MCU/inserts), optional `update(ctx, lt)`.
- The last shot must end at `timing.duration`. Shots must be contiguous and start at 0 (the director validates).

### 6. Visual QA with stills (mandatory before any full render)
- `node engine/cli/still.mjs productions/<slug> --t <comma list: ~75 % into every shot>` then look at the PNGs
  (tile them with ffmpeg `xstack` into one sheet to save tokens). Check against the QA checklist below; fix and repeat.
- Interactive: `node engine/cli/preview.mjs productions/<slug>` opens the browser player (scrub, play with audio,
  shot list, caption overlay) - tell the user the URL if they want to watch.
- **Text pass (mandatory, user rule):** list every shot where any in-world text is on screen (signs, boards, plaques,
  book pages, scrolls, counters, newspapers, labels - foreground AND background), render those shots at FULL
  resolution (no `--preview`; preview res hides cut letters), tile them at >= 360 px wide, and check every word with
  the "In-world text" rules below. Fix, re-render those shots, and check again until every one passes. Do this again
  after any camera, framing (`widen`), set or prop change, and before showing the user a preview.

### 7. Preview video, then final
- Run stages one by one (`--stage all` includes `tts` and would re-record the voice): `node engine/cli/make.mjs
  productions/<slug> --stage captions`, then `--stage render`, `--stage mix`, `--stage final`.
- Fast check first: the same `render` and `final` stages with `--preview` → `out/preview.mp4` (540x960, 30 fps).
- Final → `out/final.mp4` (1080x1920, 60 fps by frame duplication, captions burned in, master −12 LUFS / −1 dBTP by
  default, override in `cues.json`) + `out/credits.txt`.
- A ~130 s Short at 30 fps unique frames is ~3,900 frames; expect roughly 10-20 min on an Iris Xe laptop (~6-7 fps).
  Render in the background and keep working; the renderer resumes after Chrome crashes automatically.

### 7a. Music: sectioned score (default) with professional transitions
Score the video by story section instead of one bed. In `script.json` `music[]`, use cues with `role: 'section'`
(one per section, in order) plus a final `{ id: 'END', role: 'stop', at: 'last_word_end', tail_ms: 200 }`:
`{ id, role: 'section', at: { line, w }, track: 'assets/library/music/<name>.mp3', level_db_under_voice,
offset_s, transition: { type, dur_ms, gap_ms, fade_ms, sweep, curve } }` (fields documented in `engine/audio/mix.py`).
- Typical map (from the first video; adapt to the story's beats): funny/weird rules → creepy-funny legend + hero
  intro → **scary** from the inciting line ("Then one night…") → **horror peak** at the false climax → **sad** at the
  twist/backstory → **hopeful** at the hero's climax → the opening track returns as a **bookend** for the payoff/ending.
- Transition types: `crossfade` (equal-power, `dur_ms` ≈ 1500-2500, ENDS on the section's first word; `sweep: true`
  muffles the outgoing track), `drop` (outgoing fades in ~300 ms, `gap_ms` ≈ 250 of silence, a boom/hit SFX on the
  first word, incoming fades in ~800 ms — use it for the scary turn), `cut` (dead stop, `gap_ms` ≈ 500 of silence, the
  incoming swells in over ~2 s — use it on lines like "And it stopped."). Add a riser SFX into a horror section and a
  soft reveal whoosh into a hopeful one. Keep section starts on line starts so transitions never fight words.
- `offset_s` = position in the track where the section's audio begins (for a crossfade that is the fade start, i.e.
  `t - dur_ms`): choose it so the section plays the passage the user approved in the audition.
- Levels: ~14 dB under the voice for comedic/emotional sections, ~12 dB for horror; master −12 LUFS / −1 dBTP via
  `productions/<slug>/cues.json` `{ "master": { "lufs": -12, "tp": -1 } }`. `mix_report.json` shows per-section
  measured vs target levels — check it.
- **Music audition (mandatory before applying):** pick 2-3 candidates per section from the library (favourites first:
  `assets/library/manifest.jsonl` entries tagged `favorite` / `favorite-<role>`, e.g. Waltz of the Carnies (opening),
  Graveyard Shift (creepy-funny), Crypto (scary), Day of Chaos / Malicious (horror peak), Gymnopédie No. 1 (sad),
  Carpe Diem (hopeful); more via `engine/audio/music.py search --feel Dark,Eerie` / `music.py add "<title>"`), build
  clips with `bash tools/auditions.sh productions/<slug> productions/<slug>/auditions/<round> <spec.txt>` (spec lines:
  `name|narration_start|duration|track|track_offset|db_under_voice`; mixes the section's real narration with the
  candidate at its final level), write an `index.html` listing the clips per section with `<audio controls>` players
  (see `productions/everyone-has-one-hand/auditions/v2/index.html`), open it for the user, and apply their picks.
  Tag the picks `favorite` in the manifest (atomic read-merge-write). Never use real Roblox game soundtracks.

### 7b. Changing music or sound effects after the render (no video re-render)
- Edit `script.json` (`music[]`: `track` = a file like `assets/library/music/<name>.mp3`, `level_db_under_voice`;
  line `sfx[]`: `id` = library id like `sfx/<name>` (preferred) or a file path, `w`, `gain_db`, `offset_ms`), then
  `node engine/cli/cues.mjs productions/<slug>` (re-times cues from the existing word timings - never re-run TTS for
  this), then `make --stage mix` and `--stage final`. Master loudness override: `productions/<slug>/cues.json`
  `{ "master": { "lufs": -12, "tp": -1 } }`.
- Audition music before applying: mix 25 s of `audio/narration.wav` with the candidate track into `auditions/*.mp3`
  and let the user listen. Search the CC-BY catalog with `engine/audio/music.py search --feel Dark,Eerie`, add with
  `music.py add "<title>"`. Never use real Roblox game soundtracks (copyright claims).
- SFX library (shared by every video: `assets/library/sfx/{elevenlabs,derived,procedural,kenney-impact-sounds}` +
  tagged manifest entries): `node engine/audio/sfx_lib.mjs search "footsteps snow" [-n 10]` (ranked over tags, title,
  prompt), `list [--source elevenlabs|derived|procedural|kenney]`. Search first, always.
- Bespoke SFX via ElevenLabs only when nothing fits (paid, uses the user's credits; key in the `ELEVENLABS_API_KEY` user
  env var): `sfx_lib.mjs find-or-generate --query "door slam" --name door_slam_wood --prompt "<p>" --duration 1.5 --tags a,b`
  (generates only below the match threshold, `--min 0.6`) or `sfx_lib.mjs generate --name … --prompt … --duration …
  --tags …`; both save the file to the library with a manifest entry. Batch: `node engine/audio/elevenlabs_sfx.mjs
  <list.json> productions/<slug>/sfx` ([{ name, prompt, duration, tags }]) also lands every effect in the library and
  reuses library effects with the same prompt for free. Save locally made variants (loops, trims, compressed copies)
  with `sfx_lib.mjs add <file> --name <n> --from sfx/<source id> --tags a,b --process "<what you did>"`.

### 8. Optional comparison and delivery
- Against another clip: `node engine/cli/compare.mjs --ours productions/<slug>/out/final.mp4 --ref <clip.mp4> --ref-from <s> --dur 15`.
- Deliver `out/final.mp4`, the title, and the description text including every line of `out/credits.txt`
  (music is CC-BY: the credit is mandatory).

### 9. Harvest into the shared library (every video, after the final is approved)
Move everything reusable the production built into `assets/library/` so the next video starts from it:
- Sets / set pieces → `assets/library/kits/<name>.js` (`export const meta` with options + anchors incl. camera spots,
  default `async (S, opts) => ({ anchors })`); objects → `assets/library/props/<name>.js` (built at the local origin).
- Characters → `assets/library/cast/<id>.json` (`{ header: { id, tags: { role, age, mood, story }, description }, spec }`);
  held/worn items → `assets/library/attachments.js`.
- New animation clips → `engine/runtime/characters/anim.js` (named clip, not inline in production.js); fx combos →
  `engine/runtime/fx/recipes.js`.
- Sound: generated SFX are already saved by `sfx_lib.mjs` (check tags); add local variants with `sfx_lib.mjs add`; tag
  approved music `favorite` / `favorite-<role>` in the manifest.
- Switch the production to the library versions (`S.kit`, `S.prop`, `preset:`), re-render a few stills and check they
  match, then `node engine/cli/library.mjs index` and `library.mjs thumbs --type cast|kit|prop`.

## Owner's standing rules (from feedback on The Last Bite / Glass Rain; they override defaults above)
- **Voice:** ElevenLabs `lukas`, `voice_settings.speed` 1.05 and `"target_wpm": null` in script.json `voice` (no
  time-stretch, so the heard pace is the 1.05 voice, about 190-200 wpm). Write about 440-490 words for 130-150 s.
- **Music louder:** `level_db_under_voice` about 8 dB in calm sections and 6 dB in tense/horror ones (12-14 was
  inaudible). Check `mix_report.json` and listen-test a 20 s excerpt if possible.
- **Premium, on-point SFX:** more and better effects (ElevenLabs, detailed prompts, layered where it helps), placed on
  the exact frame of the on-screen action taken from production.js times (door slam = the door's slam time), not just
  on the word. Every line still gets at least one.
- **Framing:** never too tight. Characters about 25-40 % of frame height with their surroundings visible; default
  `widen` 1.4-1.5, gentle `zoom` 0.02-0.03; close-ups at most ~10 % of shots and never two in a row.
- **Text on screen:** the whole text block inside the frame with margin (camera far enough back; check at full res).
- **Nothing blocks the subject:** whatever the narration names must be clear of posts, rails, chains, furniture,
  props, crowds and walls for the whole shot. Run a raycast occlusion check (see
  `productions/the-last-bite/flick/occl.mjs`) on every shot with the hero or the named subject, and hide or move
  blockers per shot.
- **No flicker:** no coplanar faces (separate layers 0.2-0.5 studs, or polygonOffset), camera near plane 1-3 studs
  in big sets, no strong tremble/shake on big set pieces; verify with consecutive frames of the key shots.
- **Big scary monsters:** big, very scary faces, named and shown at the very start of the video.
- **Library:** every new kit, prop, character, clip and SFX goes into `assets/library/` as it is made.
- **Process:** one video at a time (at most 3 agents in parallel within it); stop at the low-quality preview, never
  a full render until the owner approves; uploads to JessyClips private with only the title + thumbnail set.

## QA checklist (frame and edit level)
- A blocky character with a readable face in most shots; faces in the 15-45 % height band; nothing important in
  the caption zone (y 60-78 %) or the bottom 20 % (YouTube UI).
- Each location is established with a wide shot; no run of 3+ close shots; characters visibly animated in every shot
  (scrub the preview: nobody stands frozen unless intended).
- Saturated, slightly warm, bright (day luma ~120-160); nights saturated navy, never black; bloom only on
  neon/emissives; haze on exterior distance; DOF only on close-ups.
- Every shot moves (push-in or a real move); no shake on calm shots; hard cuts only (plus the frame-0 intro blur).
- Literal illustration of the words; premise visible in-world; hero colour readable at distance.
- No grain, no vignette, no motion blur, no lip-sync, no Roblox logos/catalog items, no copied faces/clothing.
- **In-world text (strict, user rule - a shot fails if any of these is broken):**
  1. *Inside its panel:* every line sits inside its sign/board/page with a visible margin; no letter touches or
     crosses the panel edge. `S.text` auto-shrinks lines to fit with a 7 % side margin (`padX`); keep lines short
     (<= ~18 characters on a narrow panel; split long ones into more lines) instead of relying on tiny text.
  2. *Nothing in front of it:* no post, lamp, prop, hand, character or set piece covers any letter. Props with text
     put their supports behind the panel (see `notice_board`). Hand-held text props are offset so the hand sits
     below the words. Characters stand beside signs, not in front of them.
  3. *Whole in frame or out of frame:* a camera shows the complete text block (first and last letters of every line)
     or none of it. Never a sign half out of the 9:16 frame, never a page cropped at the edges, never a punch-in or
     zoom that cuts letters. Inserts on text get `widen: 1.3` and a camera far enough back to hold the full width.
  4. *Background text counts too:* a sign or scroll at the frame edge in an unrelated shot must be fully in or out -
     move the prop, change the camera, or show its text only in the shots that are about it (toggle per shot, as
     born-old does with the Book's rules scroll and fine print).
  5. *Readable digits:* use a font with lining numerals for numbers that matter (serif old-style "0" reads as "o").
  6. *No leftovers:* no text from another video's kit (disable kit options like `gloveShop: false` when not used).
- Audio: voice clear; an audible SFX on every line, on the action; music sections change on line starts with the
  planned transitions (scary turn on the inciting line) and stop at the last word; `mix_report.json` levels on target.

## Rules that are easy to get wrong
- In-world text must pass the strict text rules in the QA checklist, checked on FULL-resolution stills of every shot
  that shows text (step 6 text pass) - the user rejects any cut, covered or overflowing letter.
- ElevenLabs `voice_settings.speed` maxes out at 1.2 (Lukas at 1.2 ~ 230 wpm natural). Pace beyond that comes from
  the time-stretch to `target_wpm`; to slow the narration, lower `target_wpm` in script.json `voice` (free: cached
  lines are re-stretched, not re-billed), then re-run captions/render/mix/final.
- Never run `make --stage all` on a production that already has its voice - it re-records the narration (new timing,
  new credits spend for ElevenLabs). Re-renders: `--stage captions`, `--stage render`, `--stage mix`, `--stage final`.
  Audio-only changes: edit `script.json` → `node engine/cli/cues.mjs` → `--stage mix` → `--stage final` (minutes).
- Full-resolution render speed on this kind of laptop: ~6-7 fps → a 2-minute Short ≈ 10-20 min; the renderer
  relaunches Chrome after crashes and resumes on the same frame automatically.
- Captions keep the script's words exactly (no word→digit conversion): write `13`/`1931` in `text` where digits
  should show and keep words like "one hand" as words.
- Visible hands: character spec `hands: 'left' | 'right' | 'both'` (blocky arms have none by default); hide one in a
  shot with the actor's `hide: ['hand_l_mesh']`.
- Delegated (sub)agents cannot write `.md` files here - have them write plans as `.json` (e.g. `shot_plan.json`,
  `sfx_plan.json`). Good split: one production agent (plan → build → QA → render) and one sound-design agent (SFX
  every line + music sections), with the lead reviewing stills and doing the final mux.
- Determinism: everything visual is a pure function of time (no `Math.random`, `Date.now`); use `rng`/`noise1`
  from `/engine/runtime/api.js`.
- Units are studs (character ≈5 studs tall, doors 8×5, storeys 12-16); +Z faces the default camera; yaw 0 = facing +Z.
- `S.part` `glow`/`emissive` only light up at night; for a daytime lift clone the material and set `emissive`.
- Characters with `yaw: 180` face away from a camera placed at +Z.
- Captions are generated from `timing.json` (house style: Poppins Bold white, 7 px stroke, y ≈ 70 %, 1-3 lowercase
  words, hard cuts); don't draw captions in the 3D scene.
- Legal: Roblox restricts its classic R6/R15 avatars ("and derivatives") in off-platform commercial content and
  forbids exporting Creator Store assets. Keep characters original (`body: 'original'` default), never use Roblox
  logos or marks, and mention this to the user if they plan to monetize.

## Troubleshooting
- `no hardware GPU in Chrome` → Chrome fell back to SwiftShader (60x slower); close other GPU-heavy apps and retry.
- `production: …` errors come from the director's validation (contiguous shots, known sets/actors); unknown
  camera/fx/look names throw with the list of valid names.
- Black or flickering frames → a NaN in geometry or a canvas texture; render a still of the shot alone and bisect.
- Wrong pace → ElevenLabs is stretched to `target_wpm` exactly (change it in the voice preset); Kokoro: re-run
  `--stage tts --passes 2`. Captions and cuts follow after re-running captions/render.
- ElevenLabs `401` / missing key → the `ELEVENLABS_API_KEY` user env var (re-run `setup.ps1` or set it, then open a new
  terminal). Never write the key into files.
- `ffmpeg failed` with a very long command → keep the project at a short path (`C:\RobloxShorts`); paths inside the
  project are already passed relative.
- Tool paths: `engine/config.json` values win when set; empty = auto-detect (`engine/lib/config.mjs`: `tools\bin\`
  ffmpeg, `engine\.venv`, Chrome/Edge, `CHROME_PATH`). Missing tools → re-run `setup.ps1` (it only installs what is missing).

## Install on another PC
- Here: `powershell -ExecutionPolicy Bypass -File tools\package.ps1` → `dist\roblox-shorts-<yyyyMMdd>.zip` (engine,
  skill, analysis docs, the whole asset library, example productions; no renders, venvs or node_modules; self-verifies).
- There: unzip to a short local path (e.g. `C:\RobloxShorts`, not OneDrive), then `powershell -ExecutionPolicy Bypass
  -File .\setup.ps1` (`-WithKokoro` for the offline voice, `-Yes` unattended). It checks each tool first and installs
  only what is missing (Node, npm packages, ffmpeg with libass + rubberband into `tools\bin\`, uv/Python, `engine\.venv`),
  asks for the ElevenLabs key, then runs smoke tests. Open a new terminal in the folder and run `claude`.
- Details and the requirements table: `README.md`.
