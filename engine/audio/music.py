"""Music library from Incompetech (Kevin MacLeod, CC-BY 4.0), via its machine-readable catalog.

  <audio venv python> -I engine/audio/music.py search [--feel Mysterious,Humorous] [--bpm 80-130] [--len 60-240] [--text drone] [-n 15]
  <audio venv python> -I engine/audio/music.py add "Sneaky Snitch" [--tags whimsical,sneaky]
  <audio venv python> -I engine/audio/music.py starter        # the curated starter set below
  [--refresh] re-downloads the catalog (cached at assets/library/music/incompetech_pieces.json)
Files go to assets/library/music/<slug>.mp3 with a manifest entry {type: "music", title, tags, bpm, length, credit}.
cues.json can then use {"music": {"file": "investigations"}} or {"query": "tension drone"} (all words must match
the title/tags). The CC-BY credit line is written to out/credits.txt by make.mjs, so it must go in the description.
"""
import json, os, re, sys, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LIB, rel, manifest_add

BASE = "https://incompetech.com/music/royalty-free/"
DIR = LIB / "music"
CATALOG = DIR / "incompetech_pieces.json"
# role tags -> title. Chosen from the catalog by feel/length for narrated story Shorts (see research/audio-tools.md).
STARTER = {
    "Investigations": "curious whimsical bed light",
    "Sneaky Snitch": "whimsical sneaky curious bed",
    "Fluffing a Duck": "whimsical comedic bright bed",
    "Ossuary 6 - Air": "tension drone dark eerie",
    "Drums of the Deep": "tension suspense pulse dark",
    "Bittersweet": "emotional sad piano calm",
    "Myst on the Moor": "spooky eerie mystical",
    "Heroic Age": "triumphant heroic action bright",
    "Our Story Begins": "triumphant epic uplifting",
}
get = lambda url: urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=120).read()
secs = lambda l: sum(int(x) * m for x, m in zip(l.split(":"), (3600, 60, 1)))


def catalog(refresh=False):
    if refresh or not CATALOG.exists():
        DIR.mkdir(parents=True, exist_ok=True)
        CATALOG.write_bytes(get(BASE + "pieces.json"))
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def search(feel="", bpm="", length="", text="", n=15):
    lo, hi = (float(x) for x in bpm.split("-")) if bpm else (0, 1e9)
    llo, lhi = (float(x) for x in length.split("-")) if length else (0, 1e9)
    feels = [f.strip().lower() for f in feel.split(",") if f.strip()]
    hits = [p for p in catalog() if all(f in (p.get("feel") or "").lower() for f in feels)
            and lo <= float(p.get("bpm") or 0 if bpm else 1) <= hi and llo <= secs(p["length"]) <= lhi
            and text.lower() in " ".join(str(p.get(k) or "") for k in ("title", "description", "instruments", "feel")).lower()]
    for p in hits[:n]:
        print(f"{p['title']:34s} {p['length'][3:]}  {str(p.get('bpm') or '-'):>4s} bpm  {p.get('feel')}  [{(p.get('instruments') or '')[:40]}]")
    return hits


def add(title, tags=""):
    p = next((p for p in catalog() if p["title"].lower() == title.lower()), None) or sys.exit(f"not in catalog: {title}")
    slug = re.sub(r"[^a-z0-9]+", "-", p["title"].lower()).strip("-")
    dst = DIR / f"{slug}.mp3"
    if not dst.exists():
        data = get(BASE + "mp3-royaltyfree/" + urllib.parse.quote(p["filename"]))
        if data[:3] != b"ID3" and data[:2] not in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
            sys.exit(f"download is not an MP3: {p['filename']}")
        dst.write_bytes(data)
    credit = (f'"{p["title"]}" Kevin MacLeod (incompetech.com)\n'
              "Licensed under Creative Commons: By Attribution 4.0 License\nhttp://creativecommons.org/licenses/by/4.0/")
    entry = {"id": f"music/{slug}", "type": "music", "name": slug, "title": p["title"], "path": rel(dst),
             "license": "CC-BY-4.0", "author": "Kevin MacLeod", "source": "https://incompetech.com", "credit": credit,
             "tags": tags.replace(",", " ").split() + [f.strip().lower() for f in (p.get("feel") or "").split(",") if f.strip()],
             "bpm": p.get("bpm"), "length": p["length"], "isrc": p.get("isrc")}
    print(f"{p['title']} -> {rel(dst)} ({dst.stat().st_size // 1024} KB); manifest +{manifest_add([entry])}")


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda k, d="": a[a.index(k) + 1] if k in a else d
    if "--refresh" in a: catalog(refresh=True)
    if a[:1] == ["search"]:
        search(opt("--feel"), opt("--bpm"), opt("--len"), opt("--text"), int(opt("-n", "15")))
    elif a[:1] == ["add"] and len(a) > 1:
        add(a[1], opt("--tags"))
    elif a[:1] == ["starter"]:
        for title, tags in STARTER.items(): add(title, tags)
    else:
        sys.exit(__doc__)
