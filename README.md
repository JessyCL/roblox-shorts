# Roblox Shorts

A local pipeline that turns a premise ("Everyone has a ___") into a finished, narrated Roblox-style YouTube Short
(1080x1920, 60 fps, burned-in captions, music + SFX mix, -12 LUFS). It runs on your own Windows PC:

- **three.js engine in headless Chrome** renders blocky characters, sets, camera moves and effects offline, frame by
  frame (deterministic, no Blender, no Roblox Studio).
- **Voice**: ElevenLabs TTS (online, needs an API key) or Kokoro (offline, optional), with word timings that drive
  every cut and caption.
- **ffmpeg** mixes music and SFX, burns the captions and muxes the final MP4.
- **Claude Code + the `roblox-shorts` skill** (`.claude/skills/roblox-shorts/SKILL.md`) runs the whole workflow:
  script, voice, shot plan, sets, stills, preview, music auditions, final.

## Requirements

| What | Why | setup.ps1 |
|---|---|---|
| Windows 10/11 with a hardware GPU (Intel Iris Xe or better) | WebGL rendering; software rendering (SwiftShader) is refused | probes it |
| Node.js >= 20 | engine, CLI | installs LTS via winget if missing |
| Google Chrome or Microsoft Edge | headless renderer | checks (set `CHROME_PATH` to override) |
| ffmpeg + ffprobe with libass and librubberband | captions, mix, encode | downloads a static build into `tools\bin\` if yours lacks them |
| uv + Python 3.12 | audio scripts (`engine\.venv`) | installs per-user only if missing |
| ElevenLabs API key (paid plan for commercial use) | ElevenLabs voice + bespoke SFX | asks and saves it as a user env var |
| Claude Code (recommended), Git for Windows | the skill workflow, `tools/auditions.sh` | checks only |

Disk: ~0.5 GB for the project + ~0.3 GB venv/node_modules (+ ~2 GB with Kokoro).

## Install

1. Download this repo (green **Code** button -> **Download ZIP**, or `git clone https://github.com/JessyCL/roblox-shorts C:\RobloxShorts`) and put it in a short local path, e.g. `C:\RobloxShorts` (not a OneDrive-synced folder). Short paths matter:
   the mix passes one file path per sound effect to ffmpeg, and Windows caps a command line at 32K characters.
2. Open PowerShell in that folder and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup.ps1
   ```

   | Option | Effect |
   |---|---|
   | *(none)* | check everything, ask before each install |
   | `-Yes` | install whatever is missing without asking (skips the API key prompt) |
   | `-WithKokoro` | also install the offline Kokoro TTS (~1.5 GB) and download its models into `models\` |

   setup.ps1 checks first and reports every item as FOUND / INSTALLED / SKIPPED / FAILED. It never uninstalls,
   upgrades or replaces tools you already have (an old Node.js is reported, not replaced; a limited ffmpeg stays on
   your PATH and the project uses its own copy in `tools\bin\`). It ends with smoke tests (a still render of
   `productions\_smoke` and the caption unit tests) and a summary table. Re-run it any time; finished items are skipped.
3. Open a **new** terminal (so the API key and PATH changes apply).

Tool paths live in `engine\config.json` (project-relative; empty = auto-detect: `engine\.venv`, `tools\bin\ffmpeg.exe`,
then PATH). Override a value there only if you need a specific binary.

## Make a video

With Claude Code (recommended): run `claude` in the project folder and ask, e.g.
*"Make a Roblox short: Everyone has a ticket with a number"*. The skill stops for your approval at each checkpoint:

1. **Script** → `productions/<slug>/script.json` (+ title). Approve or edit the words.
2. **Voice** → `audio/narration.wav` + `timing.json` (`node engine/cli/make.mjs productions/<slug> --stage tts`).
3. **Storyboard** → one still per shot (`node engine/cli/still.mjs productions/<slug> --t 1.2,3.4,...`), tiled into a
   sheet. Approve before the full render.
4. **Preview** → `out/preview.mp4` (540x960): `node engine/cli/make.mjs productions/<slug> --stage all --preview`
   for a new production, or `--stage render --preview` then `--stage final --preview` once the voice exists.
   Interactive player: `node engine/cli/preview.mjs productions/<slug>`.
5. **Music auditions** → 2-3 candidate tracks per story section mixed with the real narration
   (`bash tools/auditions.sh productions/<slug> productions/<slug>/auditions/<round> spec.txt`) on an HTML page; pick one per section.
6. **Final** → `--stage captions`, `--stage render`, `--stage mix`, `--stage final` → `out/final.mp4` +
   `out/credits.txt` (paste every line into the YouTube description). A 2-minute Short renders in ~10-20 min on an
   Iris Xe laptop; the renderer resumes automatically after a Chrome crash.

Worked examples: `productions/proto_ticket/` (small) and `productions/everyone-has-one-hand/` (full production with
sets, shot plan, SFX plan and sectioned music).

### Audio-only changes (no video re-render)

Edit `script.json` (`music[]` tracks/levels, line `sfx[]`), then:

```powershell
node engine/cli/cues.mjs productions/<slug>          # re-times cues from the existing word timings
node engine/cli/make.mjs productions/<slug> --stage mix
node engine/cli/make.mjs productions/<slug> --stage final
```

Never run `--stage all` (or `--stage tts`) on a production that already has its voice: it re-records the narration
(new timings, and new ElevenLabs credits).

## Where things live

```
engine/            renderer (runtime/ = browser modules, cli/ = commands, lib/ = Chrome/ffmpeg/config, audio/ = Python + SFX tools,
                   captions/), config.json, ARCHITECTURE.md
.claude/skills/roblox-shorts/SKILL.md   the production workflow and rules
analysis/          the style research the skill follows: STORY_AUDIO_FORMULA, SCREEN_GRAMMAR, STYLE_BIBLE (+ .json)
assets/fonts/      caption fonts (Poppins Bold) + licenses
assets/library/    music (Kevin MacLeod), SFX (Kenney, procedural, ElevenLabs), 3D models and animations (Kenney, KayKit,
                   Quaternius), manifest.jsonl (one entry per asset with license and credit), licenses/
productions/<slug>/  one folder per video: script.json, production.js, timing.json, audio/, sfx/, stills/, renders/, out/
tools/             auditions.sh (music audition clips), package.ps1 (builds the zip), bin/ (ffmpeg, if setup downloaded it)
models/            Kokoro / Whisper model caches (only with -WithKokoro)
```

Add music: `engine\.venv\Scripts\python.exe -I engine/audio/music.py search --feel Dark,Eerie` then `music.py add "<title>"`.
Bespoke SFX: `node engine/audio/elevenlabs_sfx.mjs <list.json> productions/<slug>/sfx` (uses ElevenLabs credits).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `setup.ps1 cannot be loaded ... not digitally signed` | run it as shown above (`-ExecutionPolicy Bypass`), or `Get-ChildItem -Recurse \| Unblock-File` once after downloading |
| `no hardware GPU in Chrome` / setup WARN on SwiftShader | update the GPU driver, don't run over Remote Desktop, close GPU-heavy apps; on laptops set Chrome to "High performance" in Windows Graphics settings |
| Chrome not found | install Chrome, or set the user env var `CHROME_PATH` to `chrome.exe` / `msedge.exe` |
| `No such filter: 'subtitles'` or `'rubberband'` | your ffmpeg lacks libass/librubberband: re-run setup.ps1, it puts a full build in `tools\bin\` |
| `ELEVENLABS_API_KEY is not set` | re-run setup.ps1 (or `[Environment]::SetEnvironmentVariable('ELEVENLABS_API_KEY','<key>','User')`), then open a new terminal / restart Claude Code |
| `[WinError 206] The filename or extension is too long` in the mix | the project path is too long for productions with many SFX: move the folder to e.g. `C:\RobloxShorts` |
| `failed (... ENOENT)` on tts/mix | the audio venv is missing: re-run setup.ps1 |
| Kokoro: `No module named kokoro` | `setup.ps1 -WithKokoro` (Kokoro is optional) |
| npm errors / missing `three` | `cd engine; npm ci` |
| `production: ...` errors | director validation: shots must be contiguous from 0 to `timing.duration`; unknown names list the valid ones |
| Wrong voice pace | `--stage tts --passes 2`, then re-run captions/render |
| Black or flickering frames | render a still of the shot alone and bisect (usually a NaN in geometry) |

## Licenses and credits

- **Music**: Kevin MacLeod (incompetech.com), **CC-BY 4.0**. Attribution is mandatory: every video's
  `out/credits.txt` has the exact lines for its tracks; put them in the YouTube description.
- **3D models and animations**: Kenney (kenney.nl), KayKit by Kay Lousberg, Quaternius (Universal Animation Library), all **CC0**.
  License files in `assets/library/licenses/`.
- **Sound effects**: Kenney (CC0), procedural effects generated by `engine/audio/sfx.py` (no license needed), and
  effects generated with **ElevenLabs**, whose output may be used commercially only on a **paid ElevenLabs plan**
  (this also applies to ElevenLabs TTS voices).
- **Fonts**: Poppins, Montserrat, Archivo Black, SIL Open Font License 1.1 (`assets/fonts/licenses/`).
- **Software**: three.js (MIT), postprocessing (Zlib), n8ao (ISC), puppeteer-core (Apache-2.0), Kokoro-82M (Apache-2.0),
  faster-whisper (MIT), ffmpeg (GPL build, downloaded separately, not redistributed in this repo).
- **Roblox**: this project is not affiliated with Roblox. Roblox restricts its classic R6/R15 avatars "and derivatives"
  in off-platform commercial content and forbids exporting Creator Store assets. The engine's characters are original
  blocky designs (`body: 'original'` default). Keep them original, never use Roblox logos, marks, catalog items or real
  Roblox game soundtracks, and review Roblox's terms before monetizing.
