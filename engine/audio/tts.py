"""Narration stage: productions/<slug>/script.json -> audio/narration.wav (24 kHz mono) + timing.json.

  <audio venv python> -I engine/audio/tts.py productions/<slug> [--align whisper] [--passes 1|2 | --no-calibrate] [--strict]

Input: the canonical script schema (analysis/story_audio.json -> script_schema; analysis/STORY_AUDIO_FORMULA.md §7):
  voice {engine: kokoro, voice: "am_fenrir" | "a+b" blend, speed, target_wpm, line_gap_ms=150, lead_in_ms=100}
  lines [{id, beat, text, say{token: spoken}, emphasis[w], pause_after_ms, speed?, shots[{w,..}], sfx[{id,w,offset_ms,gain_db,dur_ms}]}]
  music [{id, role: bed|turn|lift|stop, at: {line, w, word?, offset_ms?} | "last_word_end", tail_ms, ...}], plants [...]
Tokens: text.split() (punctuation attached), 0-based per line; every `w` refers to them. Kokoro word timings
(predicted durations, exact) are mapped back to tokens with difflib; a token spoken as several words (`say`
overrides, numbers) spans its first to last spoken word. A line falls back to faster-whisper alignment if most of
its words come back untimed, or always with --align whisper.
Each line is trimmed to its speech, then pause_after_ms (default voice.line_gap_ms) of silence is inserted.
Calibration: wpm outside 255-270 -> re-render (default 1 pass, --passes 2 adds a secant step) at the speed predicted
to hit target_wpm; speech time is modelled as speed^-k (Kokoro rounds phoneme frames, k~2), inserted pauses fixed
(speed clamped 1.2-1.45).
Output timing.json: {duration, wpm, voice, speed, words[{i, line, w, text, start, end}], lines[{id, beat, start, end,
pause_after_ms}], beats{beat: [start, end]}, cues{music[{id, role, t, ..}], sfx[{id, t, gain_db, ..}],
shots[{line, w, t, hint, ..}]}, lint[{rule, ok, level, detail}]}. Word `end` excludes trailing pauses; shot cues
are token start minus 1 frame (1/30 s). Lint (§7 rules) warns; --strict exits non-zero on failed lint.
"""
import os, sys, json, time, re
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, CFG, rel
from narration import norm, resolve_voice, spoken, token_times, silences, snap_to_speech, cues_and_lint, WPM_LO, WPM_HI

args = sys.argv[1:]
if not args: sys.exit(__doc__)
prod = Path(args[0]).resolve()
force_whisper = "--align" in args and args[args.index("--align") + 1] == "whisper"
S = json.loads((prod / "script.json").read_text(encoding="utf-8"))
V = resolve_voice(S.get("voice"))  # {preset: name} -> engine/voices.json
lines = S["lines"]
assert lines and all(l.get("text", "").strip() for l in lines), "script.json needs lines with text"
SR = 24000
SPEED_LO, SPEED_HI = 1.2, 1.45

hf = (ROOT / CFG["hf_kokoro"]).resolve()
os.environ.update(HF_HOME=str(hf), HF_HUB_DISABLE_XET="1", HF_HUB_DISABLE_TELEMETRY="1",
                  HF_HUB_DISABLE_SYMLINKS_WARNING="1", OMP_NUM_THREADS=str(CFG["threads"]))
voice_ids = {v for l in lines for v in str(l.get("voice", V["voice"])).split("+")}
snap = next((hf / "hub/models--hexgrad--Kokoro-82M/snapshots").glob("*"), None)
if snap and all((snap / f"voices/{v}.pt").exists() for v in voice_ids):
    os.environ["HF_HUB_OFFLINE"] = "1"  # all cached: skip network round-trips

t0 = time.perf_counter()
import numpy as np, soundfile as sf, torch
from kokoro import KPipeline

pipes, packs = {}, {}


def pipe_for(lang):
    if lang not in pipes:  # a = American, b = British English; one shared model
        first = next(iter(pipes.values()), None)
        pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M", model=first.model if first else True)
    return pipes[lang]


def voice_pack(voice):
    """'am_fenrir' or a blend 'am_fenrir+af_heart' (mean of style vectors) -> (pipeline, voice arg)."""
    p = pipe_for(voice[0] if voice[0] in "ab" else "a")
    if "+" not in voice: return p, voice
    if voice not in packs: packs[voice] = torch.stack([p.load_voice(v) for v in voice.split("+")]).mean(0)
    return p, packs[voice]


def kokoro(text, voice, speed):
    """-> audio, [(norm, start, end)] spoken-word timings (hyphenated tokens split evenly)."""
    p, v = voice_pack(voice)
    audio, ktoks, off = [], [], 0.0
    for r in p(text, voice=v, speed=speed):
        for t in r.tokens or []:
            if t.start_ts is None or not any(c.isalnum() for c in t.text): continue
            pieces = [x for x in re.split(r"[\-–]+", t.text) if norm(x)]
            d = (t.end_ts - t.start_ts) / max(len(pieces), 1)
            ktoks += [(norm(x), off + t.start_ts + k * d, off + t.start_ts + (k + 1) * d) for k, x in enumerate(pieces)]
        a = r.audio.numpy(); audio.append(a); off += len(a) / SR
    return np.concatenate(audio), ktoks


_whisper = None


def whisper(audio):
    """faster-whisper word timings in the same [(norm, start, end)] form."""
    global _whisper
    from faster_whisper import WhisperModel
    from scipy.signal import resample_poly
    if _whisper is None:
        _whisper = WhisperModel(CFG["whisper_model"], device="cpu", compute_type="int8",
                                download_root=str((ROOT / CFG["hf_whisper"] / "hub").resolve()))
    segs, _ = _whisper.transcribe(resample_poly(audio, 2, 3).astype(np.float32), language="en", word_timestamps=True, beam_size=1)
    return [(norm(w.word), w.start, w.end) for s in segs for w in s.words if norm(w.word)]


def render(speed):
    pad = int(0.03 * SR)
    chunks = [np.zeros(int(V.get("lead_in_ms", 100) / 1000 * SR), np.float32)]
    pos = len(chunks[0]) / SR
    words, lmeta = [], []
    for li, line in enumerate(lines):
        voice = line.get("voice", V["voice"])
        sp = float(line.get("speed", V["speed"])) * speed / float(V["speed"])  # per-line override scales with calibration
        text, sw = spoken(line)
        toks = line["text"].split()
        audio, ktoks = kokoro(text, voice, sp)
        times, ok = token_times(sw, ktoks, len(toks), len(audio) / SR)
        if force_whisper or ok < 0.5:
            print(f"  {line['id']}: whisper alignment (kokoro matched {ok:.0%})", flush=True)
            times, ok = token_times(sw, whisper(audio), len(toks), len(audio) / SR)
        loud = np.flatnonzero(np.abs(audio) > 10 ** (-45 / 20))  # trim to speech (+30 ms)
        s0, s1 = (max(0, loud[0] - pad), min(len(audio), loud[-1] + pad)) if len(loud) else (0, len(audio))
        audio = audio[s0:s1]; L = len(audio) / SR
        for t in times:
            t[0] = min(max(t[0] - s0 / SR, 0.0), L); t[1] = min(max(t[1] - s0 / SR, t[0]), L)
        snap_to_speech(times, silences(audio, SR))
        for w, (tok, (s, e)) in enumerate(zip(toks, times)):
            words.append({"i": len(words), "line": line["id"], "w": w, "text": tok, "start": round(pos + s, 3), "end": round(pos + e, 3)})
        gap = line.get("pause_after_ms", V.get("line_gap_ms", 150)) / 1000 if li < len(lines) - 1 else 0.0
        lmeta.append({"id": line["id"], "beat": line.get("beat"), "start": round(pos + times[0][0], 3),
                      "end": round(pos + times[-1][1], 3), "pause_after_ms": round(gap * 1000)})
        chunks += [audio, np.zeros(int(gap * SR), np.float32)]
        pos += L + int(gap * SR) / SR
    for a, b in zip(words, words[1:]): a["end"] = min(a["end"], b["start"])
    wpm = len(words) / (words[-1]["end"] - words[0]["start"]) * 60
    pauses = sum(l["pause_after_ms"] for l in lmeta) / 1000  # fixed silence inside the measured span
    return np.concatenate(chunks), words, lmeta, wpm, pauses


print(f"import: {time.perf_counter() - t0:.1f}s", flush=True)
speed = float(V["speed"])
wav, words, lmeta, wpm, pauses = render(speed)
print(f"render @ speed {speed:.3f}: {wpm:.0f} wpm ({time.perf_counter() - t0:.0f}s)", flush=True)
# Kokoro rounds every phoneme to whole 25 ms frames after dividing by speed, so speech time falls faster than 1/speed
# (measured k = 2.4-2.9 for am_fenrir at 1.25-1.45). Model: speech = c * speed^-k with fixed pauses;
# then (with --passes 2) a secant on log-log through the two measured points. First guess k = 2.8.
want = len(words) / float(V.get("target_wpm", 262)) * 60
speech = lambda: words[-1]["end"] - words[0]["start"] - pauses
passes = 0 if "--no-calibrate" in args else int(args[args.index("--passes") + 1]) if "--passes" in args else 1
hist, k = [(speed, speech())], 2.8
while passes and not WPM_LO <= wpm <= WPM_HI:
    if len(hist) > 1 and abs(np.log(hist[-1][0] / hist[-2][0])) > 1e-3:
        k = max(0.5, -np.log(hist[-1][1] / hist[-2][1]) / np.log(hist[-1][0] / hist[-2][0]))
    new = min(max(speed * (speech() / max(want - pauses, 0.05)) ** (1 / k), SPEED_LO), SPEED_HI)
    if abs(new - speed) < 0.005: break
    speed, passes = new, passes - 1
    wav, words, lmeta, wpm, pauses = render(speed)
    hist.append((speed, speech()))
    print(f"re-render @ speed {speed:.3f}: {wpm:.0f} wpm (k={k:.2f}, {time.perf_counter() - t0:.0f}s)", flush=True)

# ---- cues (every anchor resolved to seconds) + lint (§7): engine/audio/narration.py ----
cues, duration, beats, lint = cues_and_lint(S, words, lmeta, wpm, f"{wpm:.0f} wpm @ speed {speed:.3f}")
wav = np.concatenate([wav, np.zeros(max(0, int(duration * SR) - len(wav)), np.float32)])[: int(duration * SR)]
n_tok = len(words)

(prod / "audio").mkdir(exist_ok=True)
sf.write(prod / "audio" / "narration.wav", wav, SR, subtype="PCM_16")
timing = {"duration": duration, "wpm": round(wpm, 1), "voice": V["voice"], "speed": round(speed, 3), "words": words,
          "lines": lmeta, "beats": beats, "cues": cues, "lint": lint}
(prod / "timing.json").write_text(json.dumps(timing, indent=1), encoding="utf-8")
for r in lint:
    if not r["ok"]: print(f"  lint {r['level']}: {r['rule']} ({r['detail']})")
print(f"{rel(prod / 'audio' / 'narration.wav')}: {duration:.2f}s, {n_tok} tokens, {wpm:.0f} wpm @ {speed:.3f}, "
      f"{len(cues['sfx'])} sfx, {len(cues['shots'])} shots, total {time.perf_counter() - t0:.0f}s", flush=True)
if "--strict" in args and any(not r["ok"] and r["level"] == "fail" for r in lint): sys.exit("lint failed")
