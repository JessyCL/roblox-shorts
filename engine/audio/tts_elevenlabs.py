"""Narration stage (ElevenLabs): productions/<slug>/script.json -> audio/narration.wav (48 kHz mono) + timing.json.
Same input schema and outputs as tts.py (Kokoro), so captions/render/mix work unchanged.

  <audio venv python> -I engine/audio/tts_elevenlabs.py productions/<slug> [--strict]

voice: {preset: "<name>"} from engine/voices.json (or nothing = its default), or inline
  {engine: elevenlabs, voice_id, model_id=eleven_multilingual_v2, voice_settings{stability, similarity_boost, style,
   use_speaker_boost, speed}, target_wpm=262, line_gap_ms=150, lead_in_ms=100, speed?}.
Each line is one /with-timestamps request (previous_text/next_text = neighbouring lines, for natural prosody), cached
as audio/cache/<hash>.mp3 + .json keyed on (voice_id, model, settings, spoken text) - the context is not in the key,
so editing one line re-bills only that line. Character alignment (letters/digits only: punctuation times include the
pause after it) -> spoken words -> script tokens with the same difflib mapping as tts.py (`say` changes what is spoken,
captions keep the token). Each line is trimmed to its speech, then pause_after_ms (default voice.line_gap_ms) of
silence is inserted. Pace: the line audio (not the pauses) is time-stretched with ffmpeg rubberband (pitch kept) by
one tempo that hits target_wpm exactly (clamped 0.8-1.4; a line `speed` scales its own tempo by speed/voice.speed),
and all word times are scaled with it. Cues + lint: engine/audio/narration.py (shared with tts.py).
voice.continuous: true = untouched mode: lines grouped into long takes (split after pause_after_ms >= 500), kept
exactly as generated (no trim, no inserted gaps, no stretch); word times from the take alignment.
Needs ELEVENLABS_API_KEY (environment, else the Windows user environment) only for lines not in the cache.
"""
import base64, hashlib, json, os, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CFG, rel
from narration import norm, resolve_voice, spoken, token_times, silences, snap_to_speech, cues_and_lint
import numpy as np, soundfile as sf

args = sys.argv[1:]
if not args: sys.exit(__doc__)
prod = Path(args[0]).resolve()
S = json.loads((prod / "script.json").read_text(encoding="utf-8"))
V = resolve_voice(S.get("voice"))
lines = S["lines"]
assert V.get("engine") == "elevenlabs", f"voice engine is {V.get('engine')!r}: use tts.py"
assert lines and all(l.get("text", "").strip() for l in lines), "script.json needs lines with text"
SR, FMT, TEMPO_LO, TEMPO_HI = 48000, "mp3_44100_192", 0.8, 1.4  # mp3_44100_192: best format on Creator (pcm_44100 needs Pro)
MODEL, SETTINGS = V.get("model_id", "eleven_multilingual_v2"), V.get("voice_settings", {})
cache = prod / "audio" / "cache"
cache.mkdir(parents=True, exist_ok=True)
t0, billed, hits = time.perf_counter(), 0, 0


def api_key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and os.name == "nt":  # set as a user variable after this shell started
        import winreg
        try: k = winreg.QueryValueEx(winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment"), "ELEVENLABS_API_KEY")[0]
        except OSError: pass
    return k or sys.exit("ELEVENLABS_API_KEY is not set (user environment variable)")


def request(body):
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{V['voice_id']}/with-timestamps?output_format={FMT}",
                                 json.dumps(body).encode(), {"xi-api-key": api_key(), "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=180).read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(3 * 2 ** attempt); continue
            sys.exit(f"ElevenLabs {e.code}: {e.read()[:400].decode(errors='replace')}")


def synth(text, prev, nxt):
    """-> (audio float32 @ SR, [(norm word, start, end)]) for one line, from the cache when possible."""
    global billed, hits
    body = {"text": text, "model_id": MODEL, "voice_settings": SETTINGS}
    key = hashlib.sha1(json.dumps([V["voice_id"], FMT, body], sort_keys=True).encode()).hexdigest()[:16]
    mp3, aj = cache / f"{key}.mp3", cache / f"{key}.json"
    if mp3.exists() and aj.exists():
        hits += 1
    else:
        d = request({**body, **({"previous_text": prev} if prev else {}), **({"next_text": nxt} if nxt else {})})
        mp3.write_bytes(base64.b64decode(d["audio_base64"]))
        aj.write_text(json.dumps(d["alignment"]), encoding="utf-8")  # written last: marks the entry complete
        billed += len(text)
    pcm = subprocess.run([CFG["ffmpeg"], "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    a = json.loads(aj.read_text(encoding="utf-8"))
    ktoks, cur = [], []
    for ch, s, e in [*zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]), (" ", 0, 0)]:
        if ch.isspace() or ch in "-–":  # same word split as narration.spoken()
            al = [(s0, e0) for c, s0, e0 in cur if c.isalnum()]
            if al: ktoks.append((norm("".join(c for c, _, _ in cur)), al[0][0], al[-1][1]))
            cur = []
        else:
            cur.append((ch, s, e))
    return np.frombuffer(pcm, np.float32).copy(), ktoks


def stretch(audio, tempo):
    if abs(tempo - 1) < 0.002: return audio
    out = subprocess.run([CFG["ffmpeg"], "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                          "-af", f"rubberband=tempo={tempo:.5f}", "-f", "f32le", "-"],
                         input=audio.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()


said = [spoken(l) for l in lines]
CONT = bool(V.get("continuous"))


def passages():
    """continuous mode: consecutive lines grouped into takes, split after planned pauses (>= 500 ms) or ~1200 chars."""
    out, cur, n = [], [], 0
    for li, line in enumerate(lines):
        cur.append(li); n += len(said[li][0])
        if line.get("pause_after_ms", 0) >= 500 or n > 1200 or li == len(lines) - 1:
            out.append(cur); cur, n = [], 0
    return out


if CONT:  # untouched takes: no trimming, no inserted gaps, no time-stretch; word times from the take's alignment
    groups = passages()
    texts = [" ".join(said[li][0] for li in g) for g in groups]
    chunks = [np.zeros(int(V.get("lead_in_ms", 100) / 1000 * SR), np.float32)]
    pos, words, lmeta = len(chunks[0]) / SR, [], []
    for gi, g in enumerate(groups):
        audio, ktoks = synth(texts[gi], texts[gi - 1] if gi else "", texts[gi + 1] if gi + 1 < len(groups) else "")
        flat, offs, n = [], [], 0
        for li in g:
            offs.append(n); flat += [(w, n + wi) for w, wi in said[li][1]]; n += len(lines[li]["text"].split())
        times, ok = token_times(flat, ktoks, n, len(audio) / SR)
        if ok < 0.5: print(f"  take {gi + 1}: only {ok:.0%} of spoken words aligned (times interpolated)", flush=True)
        snap_to_speech(times, silences(audio, SR))
        for k, li in enumerate(g):
            toks = lines[li]["text"].split(); seg = times[offs[k]: offs[k] + len(toks)]
            for w, (tok, (s, e)) in enumerate(zip(toks, seg)):
                words.append({"i": len(words), "line": lines[li]["id"], "w": w, "text": tok, "start": round(pos + s, 3), "end": round(pos + e, 3)})
            lmeta.append({"id": lines[li]["id"], "beat": lines[li].get("beat"), "start": round(pos + seg[0][0], 3), "end": round(pos + seg[-1][1], 3), "pause_after_ms": 0})
        chunks.append(audio); pos += len(audio) / SR
    for x, y in zip(lmeta, lmeta[1:]): x["pause_after_ms"] = max(0, round((y["start"] - x["end"]) * 1000))
    for x, y in zip(words, words[1:]): x["end"] = min(x["end"], y["start"])
    wav = np.concatenate(chunks); tempo = 1.0
    wpm = wpm0 = len(words) / (words[-1]["end"] - words[0]["start"]) * 60
    print(f"  continuous: {len(groups)} takes, untouched (no trim, no stretch)", flush=True)
else:
    # ---- synthesize + align every line (unstretched) ----
    items = []
    for li, line in enumerate(lines):
        text, sw = said[li]
        toks = line["text"].split()
        audio, ktoks = synth(text, said[li - 1][0] if li else "", said[li + 1][0] if li + 1 < len(lines) else "")
        times, ok = token_times(sw, ktoks, len(toks), len(audio) / SR)
        if ok < 0.5: print(f"  {line['id']}: only {ok:.0%} of spoken words aligned (times interpolated)", flush=True)
        pad = int(0.03 * SR)
        loud = np.flatnonzero(np.abs(audio) > 10 ** (-45 / 20))  # trim to speech (+30 ms)
        s0, s1 = (max(0, loud[0] - pad), min(len(audio), loud[-1] + pad)) if len(loud) else (0, len(audio))
        audio = audio[s0:s1]; L = len(audio) / SR
        for t in times:
            t[0] = min(max(t[0] - s0 / SR, 0.0), L); t[1] = min(max(t[1] - s0 / SR, t[0]), L)
        snap_to_speech(times, silences(audio, SR))
        gap = line.get("pause_after_ms", V.get("line_gap_ms", 150)) / 1000 if li < len(lines) - 1 else 0.0
        items.append((line, toks, audio, times, gap, float(line.get("speed", V.get("speed", 1.0))) / float(V.get("speed", 1.0))))


    def assemble(tempo):
        chunks = [np.zeros(int(V.get("lead_in_ms", 100) / 1000 * SR), np.float32)]
        pos, words, lmeta = len(chunks[0]) / SR, [], []
        for line, toks, audio, times, gap, rel_speed in items:
            a = stretch(audio, tempo * rel_speed)
            k = len(a) / max(len(audio), 1)  # actual stretch: word times follow the audio exactly
            for w, (tok, (s, e)) in enumerate(zip(toks, times)):
                words.append({"i": len(words), "line": line["id"], "w": w, "text": tok, "start": round(pos + s * k, 3), "end": round(pos + e * k, 3)})
            lmeta.append({"id": line["id"], "beat": line.get("beat"), "start": round(pos + times[0][0] * k, 3),
                          "end": round(pos + times[-1][1] * k, 3), "pause_after_ms": round(gap * 1000)})
            chunks += [a, np.zeros(int(gap * SR), np.float32)]
            pos += len(a) / SR + int(gap * SR) / SR
        for a, b in zip(words, words[1:]): a["end"] = min(a["end"], b["start"])
        wpm = len(words) / (words[-1]["end"] - words[0]["start"]) * 60
        return np.concatenate(chunks), words, lmeta, wpm


    wav, words, lmeta, wpm0 = assemble(1.0)
    # inserted pauses stay fixed; the speech part of the measured span scales with 1/tempo
    pauses = sum(l["pause_after_ms"] for l in lmeta) / 1000
    speech = words[-1]["end"] - words[0]["start"] - pauses
    # "target_wpm": null in script.json = no time-stretch: keep ElevenLabs' own voice_settings.speed as the heard pace
    tw = V.get("target_wpm", 262)
    tempo = speech / max(len(words) / float(tw) * 60 - pauses, 0.05) if tw else 1.0
    if not TEMPO_LO <= tempo <= TEMPO_HI:
        print(f"  tempo {tempo:.3f} clamped to {TEMPO_LO}-{TEMPO_HI}: change voice_settings.speed or the voice", flush=True)
        tempo = min(max(tempo, TEMPO_LO), TEMPO_HI)
    wav, words, lmeta, wpm = assemble(tempo)

cues, duration, beats, lint = cues_and_lint(S, words, lmeta, wpm, f"{wpm:.0f} wpm (natural {wpm0:.0f}, tempo {tempo:.3f})")
wav = np.concatenate([wav, np.zeros(max(0, int(duration * SR) - len(wav)), np.float32)])[: int(duration * SR)]
sf.write(prod / "audio" / "narration.wav", np.clip(wav, -1, 1), SR, subtype="PCM_16")
timing = {"duration": duration, "wpm": round(wpm, 1), "engine": "elevenlabs", "voice": V.get("preset", V["voice_id"]),
          "voice_id": V["voice_id"], "model": MODEL, "speed": SETTINGS.get("speed", 1.0), "tempo": round(tempo, 4),
          "natural_wpm": round(wpm0, 1), "words": words, "lines": lmeta, "beats": beats, "cues": cues, "lint": lint}
(prod / "timing.json").write_text(json.dumps(timing, indent=1), encoding="utf-8")
for r in lint:
    if not r["ok"]: print(f"  lint {r['level']}: {r['rule']} ({r['detail']})")
print(f"{rel(prod / 'audio' / 'narration.wav')}: {duration:.2f}s, {len(words)} tokens, {wpm:.0f} wpm (natural {wpm0:.0f}, "
      f"tempo {tempo:.3f}), {len(cues['sfx'])} sfx, {len(cues['shots'])} shots; ElevenLabs {V.get('preset', V['voice_id'])}/{MODEL}: "
      f"{billed} characters billed, {hits}/{len(lines)} lines from cache, total {time.perf_counter() - t0:.0f}s", flush=True)
if "--strict" in args and any(not r["ok"] and r["level"] == "fail" for r in lint): sys.exit("lint failed")
