"""Mix + master: narration + music layers + SFX -> audio/mix.wav (48 kHz stereo) + audio/mix_report.json.

  <audio venv python> -I engine/audio/mix.py productions/<slug>

Reads audio/narration.wav and timing.json (written by tts.py from script.json), whose cues are already in seconds:
  cues.music [{id, role: bed|turn|lift|stop, t, track?, feel[], mood?, mode: add|replace, level_db_under_voice, fade_in_ms, lift_db?}]
  cues.sfx   [{id, t, gain_db (re voice peak, <= -6), dur_ms?}]
Optional productions/<slug>/cues.json: {"master": {"lufs": -12, "tp": -1}} to override the master target.
Music: `track` (file / manifest id / title) or, if absent, the first library track whose tags contain all `feel` words
(then any of them). bed from 0 s at level_db_under_voice (default 22); the turn either adds a layer (mode add,
default) or replaces the bed after a 150 ms dropout, fading in over fade_in_ms; afterwards the music sits
level_db_under_voice (default 16) under the voice; lift = +lift_db (default 2.5) bus swell; everything stops at the
stop cue (last word + <= 300 ms) with a 50 ms fade. Levels are music-stem vs voice-stem loudness over the speech,
set by gain (up to 2 correction renders), with gentle voice-keyed sidechain (~3-4 dB). Music is high-passed at 35 Hz
Sectioned score (instead of bed/turn): cues with role `section` {track, t, level_db_under_voice (default 16),
offset_s (track position at the section's first audible sample, default 0), transition: {type, dur_ms, gap_ms,
fade_ms, sweep, curve}}; each section plays until the next section's transition (the last until the stop cue):
  crossfade  equal-power (qsin) crossfade of dur_ms (default 1500) ENDING at t; sweep: true also blends the outgoing
             track into a 450 Hz low-passed copy over the crossfade (muffled exit)
  drop       outgoing fades out over fade_ms (default 300, qsin) ending gap_ms (default 250) before t (silence; put
             a hit SFX on t); incoming starts at t and fades in over dur_ms (default 800, qsin)
  cut        outgoing stops dead at t (20 ms de-click); silence for gap_ms (default 500); incoming fades in over
             dur_ms (default 2000, hsin S-curve) from t + gap
`curve` overrides the incoming fade curve (any ffmpeg afade curve). The first section fades in over 0.3 s (from 0 s
if t < 0.5). Each section's level is measured and corrected over its own full-level speech window.
and narrowed (side -12 dB). Voice: HPF 80 / -2 dB @250 / +3 dB @3.5k / de-ess / 3:1 comp -> -16 LUFS, mono centred.
Master: 2-pass linear loudnorm after an oversampled pre-limiter -> -12 LUFS (user preference: louder than the -14 streaming norm), <= -1 dBTP (verified with ebur128).
"""
import json, os, re, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, ff, json_tail, loudness, ebur128, find_asset, manifest, rel

prod = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else sys.exit(__doc__)
timing = json.loads((prod / "timing.json").read_text(encoding="utf-8"))
extra = json.loads((prod / "cues.json").read_text(encoding="utf-8")) if (prod / "cues.json").exists() else {}
I_T = float(extra.get("master", {}).get("lufs", -12)); TP_T = float(extra.get("master", {}).get("tp", -1))
voice, out = prod / "audio" / "narration.wav", prod / "audio"
dur = float(timing["duration"])
w0, w1 = timing["words"][0]["start"], timing["words"][-1]["end"]
VOICE_LUFS = -16.0
VOX = ("highpass=f=80,equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3500:t=q:w=1.0:g=3,deesser=i=0.4:m=0.5:f=0.5,"
       "acompressor=threshold=-21dB:ratio=3:attack=5:release=80:knee=4:makeup=3dB")
gv = VOICE_LUFS - float(loudness(voice, VOX + ",")["input_i"])
VCHAIN = f"aresample=48000,{VOX},volume={gv:.2f}dB"


def pick_track(cue):
    if cue.get("track"): return find_asset(cue["track"], "music", prod)
    feel = [f.lower() for f in cue.get("feel", [])] or re.findall(r"[a-z]+", cue.get("mood", "").lower())
    tracks = sorted((e for e in manifest() if (e.get("type") or e.get("kind")) == "music"), key=lambda e: e["id"])
    for need_all in (True, False):
        for e in tracks:
            tags = {t.lower() for t in e.get("tags", [])}
            if feel and (all(f in tags for f in feel) if need_all else any(f in tags for f in feel)):
                return (ROOT / e["path"]).resolve(), e
    sys.exit(f"no library music for cue {cue.get('id')} (feel {feel}); run engine/audio/music.py add/starter")


# ---- music plan: layers [path, entry, start, end, fade_in, db_under_voice, role, gain_db] ----
mc = sorted(timing.get("cues", {}).get("music", []), key=lambda c: c["t"])
stop = next((c["t"] for c in mc if c["role"] == "stop"), dur)
bed = next((c for c in mc if c["role"] == "bed"), None)
turn = next((c for c in mc if c["role"] == "turn"), None)
lifts = [c for c in mc if c["role"] == "lift"]
sections = [c for c in mc if c["role"] == "section"]
layers, extra = [], []  # extra[k]: level window key, track offset, fade curves, fade-out length (None = legacy rule), sweep
if bed:
    b_end = turn["t"] - 0.15 if turn and turn.get("mode") == "replace" else stop
    layers.append([*pick_track(bed), 0.0 if bed["t"] < 0.5 else bed["t"], b_end, 0.3, bed.get("level_db_under_voice", 22), "bed"])
    extra.append({"key": "pre_turn" if turn else "bed"})
if turn:
    layers.append([*pick_track(turn), turn["t"], stop, turn.get("fade_in_ms", 500) / 1000, turn.get("level_db_under_voice", 16), "turn"])
    extra.append({"key": "post_turn"})
for k, c in enumerate(sections):
    tr = c.get("transition") or {}
    typ = "first" if k == 0 else tr.get("type", "crossfade")
    a, fi, curve = {"first": lambda: (0.0 if c["t"] < 0.5 else c["t"], 0.3, "tri"),
                    "crossfade": lambda: (c["t"] - tr.get("dur_ms", 1500) / 1000, tr.get("dur_ms", 1500) / 1000, "qsin"),
                    "drop": lambda: (c["t"], tr.get("dur_ms", 800) / 1000, "qsin"),
                    "cut": lambda: (c["t"] + tr.get("gap_ms", 500) / 1000, tr.get("dur_ms", 2000) / 1000, "hsin")}.get(
                        typ, lambda: sys.exit(f"music section {c.get('id')}: unknown transition type {typ}"))()
    if k:  # end the previous section according to this transition
        P, x = layers[-1], extra[-1]
        if typ == "crossfade": P[3], x["fo"], x["fo_curve"], x["sweep"] = c["t"], fi, "qsin", bool(tr.get("sweep"))
        elif typ == "drop": P[3], x["fo"], x["fo_curve"] = c["t"] - tr.get("gap_ms", 250) / 1000, tr.get("fade_ms", 300) / 1000, "qsin"
        else: P[3], x["fo"] = c["t"], 0.02
    layers.append([*pick_track(c), a, stop, fi, c.get("level_db_under_voice", 16), "section"])
    extra.append({"key": f"section {c.get('id', k)}", "offset": float(c.get("offset_s", 0)), "curve": tr.get("curve", curve), "fo": 0.05})
for L, x in zip(layers, extra):  # first guess: segment loudness -> target under the voice bus (corrected after measuring the mix)
    L.append(VOICE_LUFS - L[5] - float(loudness(L[0], f"atrim=start={x.get('offset', 0):.3f}:duration={L[3] - L[2]:.3f},", inputs=("-stream_loop", "-1"))["input_i"]))
lift_expr = "*".join(f"(1+({10 ** (c.get('lift_db', 2.5) / 20):.4f}-1)*clip((t-{c['t']:.3f})/0.5,0,1))" for c in lifts) or "1"

# ---- sfx: gain relative to the processed voice peak ----
peak = lambda path, pre="": float(re.search(r"max_volume: (-?[\d.]+)", ff("-i", path, "-af", pre + "volumedetect", "-f", "null", "-")).group(1))
v_peak = peak(voice, VCHAIN + ",")
sfx = []
for c in timing.get("cues", {}).get("sfx", []):
    path, _ = find_asset(c["id"], "sfx", prod)
    sfx.append((path, c["t"], v_peak + c.get("gain_db", -12) - peak(path), c.get("dur_ms")))


def render():
    inputs, ch, buses = ["-i", voice], [], ["[vox]"]
    ch.append(f"[0:a]{VCHAIN},pan=stereo|c0=c0|c1=c0,apad,atrim=0:{dur:.3f},asplit=2[vox][key]")
    if layers:
        for k, ((path, _, a, b, fi, _, role, g), x) in enumerate(zip(layers, extra)):
            n = inputs.count("-i"); inputs += ["-stream_loop", "-1", "-i", path]
            fo = x.get("fo") or (0.05 if b >= stop - 1e-3 else 0.03)  # hard stop / dropout before a replacing turn
            src = (f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start={x.get('offset', 0):.3f}:duration={b - a:.3f},"
                   f"asetpts=PTS-STARTPTS,highpass=f=35,stereotools=slev=0.25")
            if x.get("sweep"):  # muffled exit: blend dry -> 450 Hz low-passed copy across the fade-out (linear: the copies are correlated)
                u = f"clip((t-{b - a - fo:.3f})/{fo:.3f},0,1)"
                ch += [f"{src},asplit=2[d{k}][w{k}]", f"[w{k}]lowpass=f=450,lowpass=f=450,volume='{u}':eval=frame[wl{k}]",
                       f"[d{k}]volume='1-{u}':eval=frame[dl{k}]"]
                src = f"[dl{k}][wl{k}]amix=inputs=2:normalize=0"
            ch.append(f"{src},volume={g:.2f}dB,afade=t=in:d={fi:.3f}:curve={x.get('curve', 'tri')},"
                      f"afade=t=out:st={b - a - fo:.3f}:d={fo:.3f}:curve={x.get('fo_curve', 'tri')},adelay={int(a * 1000)}:all=1[m{k}]")
        mix_in = "".join(f"[m{k}]" for k in range(len(layers)))
        ch.append(f"{mix_in}{f'amix=inputs={len(layers)}:normalize=0:duration=longest,' if len(layers) > 1 else ''}"
                  f"volume='{lift_expr}':eval=frame,apad,atrim=0:{dur:.3f}[mus]")
        # gentle keyed ducking (~3-4 dB under speech); the levels themselves are set by gain, not by the compressor
        ch.append("[mus][key]sidechaincompress=threshold=0.05:ratio=2:attack=20:release=300:knee=4:detection=rms:link=average,asplit=2[duck][stem]")
        buses.append("[duck]")
    else:
        ch.append("[key]anullsink")
    for k, (path, t, g, d) in enumerate(sfx):
        n = inputs.count("-i"); inputs += (["-stream_loop", "-1"] if d else []) + ["-i", path]
        trim = f"atrim=duration={d / 1000:.3f},afade=t=out:st={max(d / 1000 - 0.2, 0):.3f}:d=0.2," if d else ""
        ch.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,{trim}volume={g:.2f}dB,adelay={int(t * 1000)}:all=1[s{k}]")
    if sfx:
        ch.append(f"{''.join(f'[s{k}]' for k in range(len(sfx)))}amix=inputs={len(sfx)}:normalize=0[sfx]")
        buses.append("[sfx]")
    ch.append(f"{''.join(buses)}amix=inputs={len(buses)}:normalize=0:duration=first[pre]" if len(buses) > 1 else "[vox]anull[pre]")
    maps = ["-map", "[pre]", "-c:a", "pcm_f32le", out / "premix.wav"]
    maps += ["-map", "[stem]", "-c:a", "pcm_f32le", out / "music_stem.wav"] if layers else []
    graph, gfile = ";".join(ch), out / "filter_complex.txt"
    if len(graph) > 16000:  # many cues: pass the graph from a file (Windows command lines stop at 32 767 chars)
        gfile.write_text(graph, encoding="utf-8")
    ff(*inputs, *(["-/filter_complex", gfile] if len(graph) > 16000 else ["-filter_complex", graph]), *maps)
    gfile.unlink(missing_ok=True)


def under(a, b):
    """voice-stem loudness minus music-stem loudness over [a, b] s (gated integrated LUFS)."""
    win = f"atrim={a:.3f}:{b:.3f},"
    return float(loudness(voice, win + VCHAIN + ",")["input_i"]) - float(loudness(out / "music_stem.wav", win)["input_i"])


windows = {}  # name -> (from, to, target dB under voice); measured over speech only
if layers and not sections:
    windows["pre_turn" if turn else "bed"] = (w0, turn["t"] if turn else w1, layers[0][5])
    if turn: windows["post_turn"] = (turn["t"] + turn.get("fade_in_ms", 500) / 1000, w1, layers[-1][5])
for L, x in zip(layers, extra):  # sections: full-level span (after the fade-in, before the fade-out) within the speech
    if L[6] == "section": windows[x["key"]] = (max(L[2] + L[4], w0), min(L[3] - x["fo"], w1), L[5])
for it in range(3):
    render()
    if not layers or it == 2: break
    err = {k: under(a, b) - target for k, (a, b, target) in windows.items() if b - a > 1.0}
    if all(abs(e) <= 0.75 for e in err.values()): break
    for L, x in zip(layers, extra):  # err > 0: music too quiet. Each layer follows its own window (bed: pre-turn, turn: post-turn)
        L[7] += err.get(x["key"], 0.0)

# ---- master ----
m = loudness(out / "premix.wav", I=I_T, TP=TP_T)
ceil = min(TP_T - (I_T - float(m["input_i"])) - 0.9, -0.1)
lim = f"aresample=192000,alimiter=limit={ceil:.2f}dB:attack=2:release=60:level=disabled,aresample=48000,"
m2 = loudness(out / "premix.wav", lim, I=I_T, TP=TP_T)
ln = (f"loudnorm=I={I_T}:TP={TP_T}:LRA=11:measured_I={m2['input_i']}:measured_TP={m2['input_tp']}:measured_LRA={m2['input_lra']}:"
      f"measured_thresh={m2['input_thresh']}:offset={m2['target_offset']}:linear=true:print_format=json")
mode = json_tail(ff("-i", out / "premix.wav", "-af", lim + ln + ",aresample=48000", "-c:a", "pcm_s16le", out / "mix.wav"))["normalization_type"]
(out / "premix.wav").unlink()

rep = {"duration": round(dur, 3), "target": {"lufs": I_T, "tp": TP_T}, "loudnorm_mode": mode, "mix": ebur128(out / "mix.wav"),
       "music": [{"role": L[6], "track": rel(L[0]), "from": round(L[2], 2), "to": round(L[3], 2), "gain_db": round(L[7], 1),
                  **({"offset_s": x["offset"], "fade_in_s": round(L[4], 3), "fade_out_s": round(x["fo"], 3), "sweep": bool(x.get("sweep"))}
                     if L[6] == "section" else {})} for L, x in zip(layers, extra)],
       "music_db_under_voice": {k: {"measured": round(under(a, b), 1), "target": t} for k, (a, b, t) in windows.items() if b - a > 1.0},
       "music_stop_after_last_word_ms": round((stop - w1) * 1000) if layers else None,
       "sfx": [{"file": rel(p), "t": t, "gain_db": round(g, 1)} for p, t, g, _ in sfx],
       "credits": list(dict.fromkeys(L[1]["credit"] for L in layers if L[1] and L[1].get("credit")))}
(out / "mix_report.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
print(json.dumps(rep, indent=1))
bad = [f"master {rep['mix']}"] if abs(rep["mix"]["I"] - I_T) > 0.5 or rep["mix"]["TP"] > TP_T + 0.05 else []
bad += [f"music stop {rep['music_stop_after_last_word_ms']} ms after the last word"] if layers and stop - w1 > 0.301 else []
for k, v in rep["music_db_under_voice"].items():
    if abs(v["measured"] - v["target"]) > 3: print(f"warning: music {k} {v['measured']} dB under voice (target {v['target']} +-3)")
sys.exit("; ".join(bad) if bad else 0)
