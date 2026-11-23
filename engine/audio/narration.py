"""Narration helpers shared by the TTS stages (tts.py = Kokoro, tts_elevenlabs.py = ElevenLabs): voice presets
(engine/voices.json), script tokens -> spoken text, aligning timed spoken words onto script tokens, silence snapping,
and resolving the script's music/SFX/shot cues + the STORY_AUDIO_FORMULA §7 lint into timing.json fields.
"""
import difflib, json, re, sys
from common import ROOT, rel

VOICES = ROOT / "engine" / "voices.json"
FRAME = 1 / 30
WPM_LO, WPM_HI = 255, 270
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def resolve_voice(v):
    """script.json `voice` -> full voice dict. {preset: name}, or no `engine` at all, pulls the preset from
    engine/voices.json (its "default" when no name is given); keys written in the script override the preset's."""
    v = dict(v or {})
    if "preset" in v or "engine" not in v:
        P = json.loads(VOICES.read_text(encoding="utf-8"))
        name = v.pop("preset", None) or P["default"]
        if name not in P["presets"]:
            sys.exit(f"voice preset {name!r} not in {rel(VOICES)} (have: {', '.join(P['presets'])})")
        v = {**P["presets"][name], "preset": name, **v}
    return v


def spoken(line):
    """-> (text to speak, [(norm word, token index)]). `say` keys match the token exactly or without its punctuation."""
    say, words, parts = line.get("say", {}), [], []
    for wi, tok in enumerate(line["text"].split()):
        core = re.sub(r"^\W+|\W+$", "", tok)
        sp = say.get(tok) or (say[core] + tok[len(tok.rstrip(".,!?;:…")):] if core in say else tok)
        parts.append(sp)
        words += [(norm(p), wi) for p in re.split(r"[\s\-–]+", sp) if norm(p)]
    return " ".join(parts), words


def token_times(words, ktoks, n_tokens, length):
    """difflib-align spoken words to timed words -> per-token (start, end); unmatched tokens interpolated."""
    span = [None] * n_tokens
    sm = difflib.SequenceMatcher(None, [k[0] for k in ktoks], [w[0] for w in words], autojunk=False)
    matched = 0
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            _, s, e = ktoks[b.a + k]; wi = words[b.b + k][1]; matched += 1
            span[wi] = (s, e) if span[wi] is None else (min(span[wi][0], s), max(span[wi][1], e))
    i = 0
    while i < n_tokens:
        if span[i] is None:
            j = i
            while j < n_tokens and span[j] is None: j += 1
            lo = span[i - 1][1] if i else 0.0
            hi = span[j][0] if j < n_tokens else length
            for k in range(i, j): span[k] = (lo + (hi - lo) * (k - i) / (j - i), lo + (hi - lo) * (k - i + 1) / (j - i))
            i = j
        else:
            i += 1
    return [list(x) for x in span], matched / max(len(words), 1)


def silences(audio, sr, thr_db=-42.0, min_len=0.12, hop=0.01):
    import numpy as np
    n = int(hop * sr)
    q = 20 * np.log10(np.sqrt((audio[: len(audio) // n * n].reshape(-1, n) ** 2).mean(1)) + 1e-9) < thr_db
    spans, st = [], None
    for k, quiet in enumerate(np.append(q, False)):
        if quiet and st is None: st = k
        if not quiet and st is not None:
            if (k - st) * hop >= min_len: spans.append((st * hop, k * hop))
            st = None
    return spans


def snap_to_speech(times, spans):
    """Boundaries inside silences move to the silence edge (Kokoro ends include the next pause; Whisper starts leak)."""
    for i, t in enumerate(times):
        for a, b in spans:
            if a <= t[0] < b < t[1]: t[0] = b
            elif t[0] < a and b < t[1] and b - a >= 0.25:
                if i: times[i - 1][1] = max(times[i - 1][1], a)
                t[0] = b
            if t[0] < a < t[1] <= b: t[1] = a


def cues_and_lint(S, words, lmeta, wpm, wpm_detail):
    """Resolve the script's cues against the word timings and run the §7 lint.
    -> (cues {music, sfx, shots} in seconds, duration, beats {beat: [start, end]}, lint [{rule, ok, level, detail}])."""
    lines = S["lines"]
    by_line = {l["id"]: [w for w in words if w["line"] == l["id"]] for l in lmeta}
    last_end = words[-1]["end"]
    problems = []

    def at(anchor, what):
        if anchor == "last_word_end": return last_end
        toks = by_line.get(anchor.get("line"))
        if not toks or not 0 <= anchor.get("w", 0) < len(toks):
            sys.exit(f"{what}: anchor {anchor} out of range")
        tok = toks[anchor.get("w", 0)]
        if "word" in anchor and norm(anchor["word"]) != norm(tok["text"]):
            problems.append(f"{what}: anchor word {anchor['word']!r} != token {tok['text']!r}")
        return tok["start"] + anchor.get("offset_ms", 0) / 1000

    music = []
    for m in S.get("music", []):
        t = at(m["at"], f"music {m.get('id')}") + (m.get("tail_ms", 200) / 1000 if m.get("role") == "stop" else 0)
        music.append({**{k: v for k, v in m.items() if k != "at"}, "t": round(t, 3)})
    stop = next((m["t"] for m in music if m.get("role") == "stop"), last_end + 0.2)
    sfx, shots = [], []
    for line in lines:
        for c in line.get("sfx", []):
            t = at({"line": line["id"], "w": c["w"]}, f"sfx {c['id']}") + c.get("offset_ms", 0) / 1000
            sfx.append({**c, "line": line["id"], "t": round(t, 3)})
        for c in line.get("shots", []):
            t = at({"line": line["id"], "w": c["w"]}, f"shot {line['id']}/{c['w']}")
            shots.append({**c, "line": line["id"], "t": round(0.0 if not shots else max(0.0, t - FRAME), 3)})
    duration = round(max(stop, last_end), 3)
    beats = {}
    for l in lmeta:
        if l["beat"]: beats.setdefault(l["beat"], [l["start"], l["end"]])[1] = l["end"]

    lint = []
    def rule(name, ok, detail="", level="warn"): lint.append({"rule": name, "ok": bool(ok), "level": level, "detail": detail})
    pct = lambda t: 100 * t / duration
    first = lambda beat: next((l for l in lmeta if l["beat"] == beat), None)
    n_tok = len(words)
    rule("tokens 520-650 (hard 450-720)", 520 <= n_tok <= 650, f"{n_tok}", "warn" if 450 <= n_tok <= 720 else "fail")
    rule("duration 120-150 s (hard 105-165)", 120 <= duration <= 150, f"{duration:.1f}s", "warn" if 105 <= duration <= 165 else "fail")
    l1 = " ".join(w["text"] for w in by_line[lmeta[0]["id"]])
    rule("L01 starts 'In this world,'/'In this town,' and ends <= 4.5 s", re.match(r"In this (world|town),", l1) and lmeta[0]["end"] <= 4.5, f"ends {lmeta[0]['end']}s")
    rule("line 2 starts 'You see,'", len(lmeta) > 1 and " ".join(w["text"] for w in by_line[lmeta[1]["id"]]).startswith("You see,"))
    inc = [l for l in lmeta if l["beat"] == "inciting"]
    turn_ok = len(inc) == 1 and any(m.get("role") == "turn" and isinstance(m.get("at"), dict) and m["at"].get("line") == inc[0]["id"]
                                     and m["at"].get("w", 0) == 0 for m in S.get("music", []))
    rule("one inciting line at 38-47 % with the turn cue on its token 0", turn_ok and 38 <= pct(inc[0]["start"]) <= 47,
         f"{len(inc)} inciting" + (f" at {pct(inc[0]['start']):.0f}%" if inc else ""))
    for beat, lo, hi in (("twist", 66, 78), ("payoff", 85, 100), ("ending", 94, 100)):
        l = first(beat)
        rule(f"first {beat} at {lo}-{hi} %", l and lo <= pct(l["start"]) <= hi, f"{pct(l['start']):.0f}%" if l else "missing")
    order = [l["id"] for l in lmeta]
    plants = S.get("plants", [])
    rule(">= 3 plants, each set up before paid off", len(plants) >= 3 and all(p["set_up"] in order and p["paid_off"] in order and
         order.index(p["set_up"]) < order.index(p["paid_off"]) for p in plants), f"{len(plants)} plants")
    rule("a climax line with hero_action", any(l.get("beat") == "climax" and l.get("hero_action") for l in lines))
    nums = sum(bool(re.search(r"\d", w["text"])) for w in words)
    rule(">= 8 numeral tokens", nums >= 8, f"{nums}")
    rule("no line > 32 tokens; last line <= 8 tokens", max(len(v) for v in by_line.values()) <= 32 and len(by_line[order[-1]]) <= 8)
    rule("wpm 255-270", WPM_LO <= wpm <= WPM_HI, wpm_detail)
    long_p = [l["pause_after_ms"] for l in lmeta if l["pause_after_ms"] >= 500]
    rule("3-8 pauses >= 500 ms, none > 1600", 3 <= len(long_p) <= 8 and all(p <= 1600 for p in long_p), f"{len(long_p)}")
    rule("<= 10 sfx; music stop <= 300 ms after the last word", len(sfx) <= 10 and stop - last_end <= 0.3 + 1e-6,
         f"{len(sfx)} sfx, stop +{(stop - last_end) * 1000:.0f} ms", "fail" if stop - last_end > 0.3 + 1e-6 else "warn")
    cta = [w["text"] for w in words if norm(w["text"]) in ("subscribe", "like", "comment", "follow")]
    rule("no CTA words", not cta and "part 2" not in " ".join(w["text"].lower() for w in words), ", ".join(cta))
    for p in problems: rule("anchor", False, p, "fail")
    return {"music": music, "sfx": sfx, "shots": shots}, duration, beats, lint
