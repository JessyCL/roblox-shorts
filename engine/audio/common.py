"""Shared helpers for engine/audio/*.py: project paths + engine/config.json, ffmpeg runner, loudness
measurement, and the asset library manifest (assets/library/manifest.jsonl, one JSON object per line:
{id, type: music|sfx|font, name, path (project-relative), title, license, author, source, credit, tags}).
Scripts run with the audio venv in isolated mode (python -I), so each adds its own folder to sys.path.
"""
import json, os, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CFG = json.loads((ROOT / "engine" / "config.json").read_text(encoding="utf-8"))


def _first(*paths):
    """First project-relative path that exists, else the first one."""
    return next((p for p in paths if p and (ROOT / p).exists()), paths[0])


def _tool(name):
    """Config value (path or command), else the project-local build setup.ps1 downloads, else PATH."""
    local = f"tools/bin/{name}.exe"
    v = CFG.get(name) or (local if (ROOT / local).exists() else name)
    return str(ROOT / v) if "/" in v or "\\" in v else v


# Auto-detection (same rules as engine/lib/config.mjs); the research/ caches are the original PC's fallback.
CFG["ffmpeg"], CFG["ffprobe"] = _tool("ffmpeg"), _tool("ffprobe")
CFG["hf_kokoro"] = _first(CFG.get("hf_kokoro") or "models/hf-kokoro", "research/audio/dl/hf-kokoro")
CFG["hf_whisper"] = _first(CFG.get("hf_whisper") or "models/hf-whisper", "research/audio/dl/hf-whisper")
LIB = (ROOT / CFG["library"]).resolve()
MANIFEST = LIB / "manifest.jsonl"


def rel(p):
    """Project-relative POSIX path (what the manifest stores)."""
    p = Path(p).resolve()
    return p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.as_posix()


def _short(a):
    """Absolute paths inside the project -> project-relative (ffmpeg runs with cwd=ROOT). Keeps big mixes (100+ inputs)
    under Windows' 32,767-character command-line limit wherever the project folder lives."""
    s = str(a)
    if len(s) > 2 and (s[1] == ":" or s.startswith("\\\\") or s.startswith("/")):
        try:
            r = os.path.relpath(s, ROOT)
            if not r.startswith(".."):
                return r.replace("\\", "/")
        except ValueError:  # different drive
            pass
    return s


def ff(*args, ok_codes=(0,)):
    """Run ffmpeg; return stderr text (filters print measurements there). Exit with the tail of stderr on failure."""
    r = subprocess.run([CFG["ffmpeg"], "-hide_banner", "-nostats", "-y", *map(_short, args)], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=ROOT)
    if r.returncode not in ok_codes:
        sys.exit(f"ffmpeg failed ({r.returncode}):\n{r.stderr[-3000:]}")
    return r.stderr


def json_tail(text):
    return json.loads(text[text.rindex("{"):text.rindex("}") + 1])


def loudness(path, pre="", I=-14.0, TP=-1.0, inputs=()):
    """loudnorm analysis pass -> dict(input_i, input_tp, input_lra, input_thresh, target_offset). `pre` = filters before it."""
    return json_tail(ff(*inputs, "-i", path, "-af", f"{pre}loudnorm=I={I}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"))


def ebur128(path):
    """Independent meter: integrated loudness (LUFS), loudness range (LU), true peak (dBTP)."""
    s = ff("-i", path, "-af", "ebur128=peak=true", "-f", "null", "-").split("Summary:")[-1]
    g = lambda k: float(re.search(rf"{k}:\s+(-?[\d.]+|-inf)", s).group(1).replace("-inf", "-200"))
    return {"I": g("I"), "LRA": g("LRA"), "TP": g("Peak")}


def manifest():
    if not MANIFEST.exists():
        return []
    return [json.loads(l) for l in MANIFEST.read_text(encoding="utf-8").splitlines() if l.strip()]


def manifest_add(entries):
    """Append entries whose id is not in the manifest yet (append-only: other agents write here too)."""
    have = {e.get("id") for e in manifest()}
    new = [e for e in entries if e["id"] not in have]
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST.open("a", encoding="utf-8") as f:
        for e in new:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return len(new)


def find_asset(ref, kind, prod_dir=None):
    """Resolve a cue reference -> (path, manifest entry | None).
    Accepts a file path (relative to the production or the project root), a manifest id/name, or (music) a
    free-text query whose words must all appear in the entry's title + tags."""
    for base in ([Path(prod_dir)] if prod_dir else []) + [ROOT]:
        p = (base / ref)
        if p.is_file():
            hit = [e for e in manifest() if e.get("path") == rel(p)]
            return p.resolve(), (hit[0] if hit else None)
    entries = [{**e, "path": e.get("path") or f"{CFG['library']}/{e.get('file', '')}"} for e in manifest()
               if (e.get("type") or e.get("kind")) == kind]  # other agents use {kind, file (library-relative)}
    q = ref.lower()
    for e in entries:
        if q in (e.get("id", "").lower(), e.get("name", "").lower(), e.get("title", "").lower()):
            return (ROOT / e["path"]).resolve(), e
    words = re.findall(r"[a-z0-9]+", q)
    for e in entries:
        hay = " ".join([e.get("title", ""), e.get("name", ""), *e.get("tags", [])]).lower()
        if words and all(w in hay for w in words):
            return (ROOT / e["path"]).resolve(), e
    sys.exit(f"{kind} not found: {ref!r} (not a file, id, name or tag query in {rel(MANIFEST)})")
