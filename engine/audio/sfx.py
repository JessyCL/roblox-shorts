"""SFX library: procedural sound effects (numpy/scipy, 48 kHz stereo, peak -1 dBFS, deterministic) and Kenney CC0 packs.

  <audio venv python> -I engine/audio/sfx.py procedural            -> assets/library/sfx/procedural/<name>.wav
  <audio venv python> -I engine/audio/sfx.py kenney impact-sounds [--zip file.zip]
                                                                  -> assets/library/sfx/kenney-impact-sounds/<name>.ogg
Every file gets a manifest entry (type "sfx", name = file stem), so cues.json can say {"name": "whoosh"} or
{"name": "impactPunch_heavy_000"}. Procedural set: whoosh, swoosh, riser (3 s, peaks at its end: start it 3 s
before the hit), impact_boom, sub_drop, hit, pop, ui_click, ding, glitch, footsteps, heartbeat, clock_tick.
"""
import io, json, os, re, sys, urllib.request, zipfile
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LIB, rel, manifest_add

SR = 48000
rng = np.random.default_rng(7)  # deterministic output


def t_(dur): return np.arange(int(dur * SR)) / SR
def noise(dur): return rng.standard_normal(int(dur * SR))


def pink(dur):
    n = int(dur * SR); spec = np.fft.rfft(rng.standard_normal(n))
    spec /= np.sqrt(np.maximum(np.arange(len(spec)), 1))
    x = np.fft.irfft(spec, n); return x / np.abs(x).max()


def sweep_sine(f0, f1, dur, curve="exp"):
    tt = t_(dur); k = tt / dur
    f = f0 * (f1 / f0) ** k if curve == "exp" else f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env_ad(dur, attack, decay_tau):
    tt = t_(dur); a = np.clip(tt / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(tt - attack, 0) / decay_tau)


def moving_bandpass(x, fc, q=1.2, block=256):
    """Band-pass with a time-varying centre (fc: array per sample); state carried across blocks."""
    y = np.zeros_like(x); zi = None
    for i in range(0, len(x), block):
        c = float(np.clip(fc[min(i + block // 2, len(fc) - 1)], 40, SR / 2.3))
        sos = signal.butter(2, [c / (1 + 1 / (2 * q)), c * (1 + 1 / (2 * q))], "bandpass", fs=SR, output="sos")
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return y


def lp(x, fc, order=4): return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)
def hp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)


def reverb(x, rt60=1.2, wet=0.25, bright=6000):
    ir = lp(noise(rt60) * np.exp(-6.9 * t_(rt60) / rt60), bright, 2); ir /= np.sqrt((ir ** 2).sum())
    tail = signal.fftconvolve(x, ir)[: len(x) + len(ir)]
    dry = np.pad(x, (0, len(tail) - len(x)))
    return (1 - wet) * dry + wet * tail * 0.5


def pan(x, p):  # p: -1..1 scalar or array, constant-power
    p = np.broadcast_to(p, x.shape); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


def fade(x, ms=5):
    n = int(SR * ms / 1000); x = x.copy(); x[-n:] *= np.linspace(1, 0, n); return x


# ---------- sounds ----------
def whoosh(dur=0.9, f_lo=250, f_hi=3500):
    tt = t_(dur); k = tt / dur
    shape = np.sin(np.pi * k ** 0.7) ** 2                     # swell, peak ~60%
    fc = f_lo * (f_hi / f_lo) ** np.sin(np.pi * k ** 0.8)      # up then back down
    x = moving_bandpass(pink(dur) + 0.3 * noise(dur) / 3, fc, q=1.5) * shape
    return pan(fade(x), np.linspace(-0.7, 0.7, len(x)))       # moves L -> R


def swoosh(): return whoosh(0.35, 600, 6000)


def riser(dur=3.0):
    tt = t_(dur); k = tt / dur
    tone = sum(sweep_sine(f * 180, f * 1400, dur) / f for f in (1, 2, 3, 4))  # saw-ish stack
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * np.cumsum(4 + 20 * k ** 2) / SR)  # tremolo accelerates
    nz = moving_bandpass(noise(dur), 400 * (12000 / 400) ** k, q=0.8)
    x = (0.5 * tone * trem + 0.6 * nz / (np.abs(nz).max() + 1e-9)) * k ** 2.2
    return pan(reverb(fade(x, 2), 1.0, 0.2), 0)


def impact(dur=2.5):
    body = sweep_sine(110, 32, dur) * env_ad(dur, 0.002, 0.55)
    crack = lp(noise(dur), 3500) * env_ad(dur, 0.0005, 0.03)
    x = np.tanh(2.2 * (body + 0.5 * crack))
    x = reverb(x, 1.8, 0.3, 3000)
    return pan(x, 0)


def sub_drop(dur=1.6): return pan(np.tanh(1.5 * sweep_sine(90, 28, dur) * env_ad(dur, 0.01, 0.6)), 0)


def hit(dur=0.35):
    thump = sweep_sine(160, 55, dur) * env_ad(dur, 0.001, 0.07)
    snap = moving_bandpass(noise(dur), np.full(int(dur * SR), 2500), q=0.7) * env_ad(dur, 0.0003, 0.012)
    return pan(np.tanh(3 * (thump + 0.8 * snap / np.abs(snap).max())), 0)


def pop(dur=0.12):
    x = sweep_sine(350, 1100, dur) * env_ad(dur, 0.001, 0.025)
    return pan(x, 0)


def ui_click(dur=0.06):
    imp = np.zeros(int(dur * SR)); imp[0] = 1
    x = moving_bandpass(imp, np.full(len(imp), 3200), q=4) * env_ad(dur, 0, 0.006)
    return pan(x + 0.3 * moving_bandpass(imp, np.full(len(imp), 900), q=3), 0)


def ding(dur=1.4, fc=1320, ratio=1.4):
    tt = t_(dur); idx = 3 * np.exp(-tt / 0.15)
    x = np.sin(2 * np.pi * fc * tt + idx * np.sin(2 * np.pi * fc * ratio * tt)) * env_ad(dur, 0.002, 0.45)
    return pan(reverb(x, 1.2, 0.2), 0)


def glitch(dur=0.7):
    seg = int(0.03 * SR); src = np.concatenate([sweep_sine(220, 880, dur / 2), lp(noise(dur / 2), 6000) * 0.5])
    out = []
    while sum(map(len, out)) < dur * SR:
        i = rng.integers(0, len(src) - seg); s = src[i:i + seg]
        r = rng.random()
        if r < 0.3: s = np.tile(s[: seg // 4], 4)                       # stutter
        elif r < 0.5: s = s[::-1]                                         # reverse
        elif r < 0.7: s = np.round(s * 4) / 4                             # bitcrush
        elif r < 0.85: s = np.repeat(s[::6], 6)[:seg]                     # sample-rate crush
        else: s = np.sign(np.sin(2 * np.pi * rng.integers(80, 400) * np.arange(seg) / SR)) * 0.5  # buzz
        out.append(s * rng.uniform(0.5, 1))
    x = np.concatenate(out)[: int(dur * SR)]
    return pan(fade(x), np.repeat(rng.uniform(-0.6, 0.6, len(x) // seg + 1), seg)[: len(x)])  # random pan per slice


def footsteps(n=4, gap=0.48):
    dur = n * gap + 0.3; x = np.zeros(int(dur * SR))
    for i in range(n):
        st = int((i * gap + rng.uniform(-0.02, 0.02)) * SR); d = 0.18
        heel = lp(noise(d), rng.uniform(700, 1000)) * env_ad(d, 0.002, 0.03)
        thud = np.sin(2 * np.pi * 70 * t_(d)) * env_ad(d, 0.002, 0.04)
        toe = hp(noise(d), 2000) * env_ad(d, 0.0005, 0.008)
        step = heel + 0.6 * thud + 0.15 * np.roll(toe, int(0.06 * SR))
        x[st:st + len(step)] += step * rng.uniform(0.8, 1.0)
    return pan(reverb(x, 0.4, 0.12), 0)


def heartbeat(beats=3, bpm=70):
    gap = 60 / bpm; dur = beats * gap + 0.4; x = np.zeros(int(dur * SR))
    for i in range(beats):
        for off, amp in ((0, 1.0), (0.28, 0.7)):                          # lub-dub
            st = int((i * gap + off) * SR); d = 0.25
            b = sweep_sine(65, 40, d) * env_ad(d, 0.008, 0.06) * amp
            x[st:st + len(b)] += b
    return pan(np.tanh(2 * lp(x, 200)), 0)


def clock_tick(n=4, gap=0.5):
    x = np.zeros(int((n * gap + 0.1) * SR))
    for i in range(n):  # tick / tock alternate in pitch and level
        imp = np.zeros(int(0.06 * SR)); imp[0] = 1 if i % 2 == 0 else 0.7
        c = moving_bandpass(imp, np.full(len(imp), 4500 if i % 2 == 0 else 3600), q=5)
        st = int(i * gap * SR); x[st:st + len(c)] += c
    return pan(x, 0)


SOUNDS = dict(whoosh=whoosh, swoosh=swoosh, riser=riser, impact_boom=impact, sub_drop=sub_drop, hit=hit,
              pop=pop, ui_click=ui_click, ding=ding, glitch=glitch, footsteps=footsteps, heartbeat=heartbeat,
              clock_tick=clock_tick)

TAGS = dict(whoosh="transition swish fast", swoosh="transition swish short", riser="build tension rise", impact_boom="boom hit reveal",
            sub_drop="bass drop reveal", hit="punch hit", pop="pop text appear", ui_click="click ui", ding="ding bell notification",
            glitch="glitch digital error", footsteps="steps walk", heartbeat="heartbeat tension", clock_tick="clock tick countdown")


def procedural():
    out = LIB / "sfx" / "procedural"; out.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, fn in SOUNDS.items():
        x = fn(); x = x / (np.abs(x).max() + 1e-12) * 10 ** (-1 / 20)  # peak -1 dBFS
        assert x.ndim == 2 and x.shape[1] == 2 and np.isfinite(x).all(), name
        sf.write(out / f"{name}.wav", x, SR, subtype="PCM_16")
        entries.append({"id": f"sfx/{name}", "type": "sfx", "name": name, "path": rel(out / f"{name}.wav"), "duration": round(len(x) / SR, 2),
                        "license": "CC0-1.0", "author": "procedural (engine/audio/sfx.py)", "source": "generated", "tags": TAGS[name].split()})
        print(f"{name:12s} {len(x) / SR:5.2f}s")
    print("manifest +", manifest_add(entries))


def kenney(slug, zip_path=None):
    """Kenney.nl CC0 audio pack (signed download link, as the site's own button does) -> OGGs + manifest."""
    if zip_path:
        data = Path(zip_path).read_bytes()
    else:
        req = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Referer": f"https://kenney.nl/assets/{slug}"}), timeout=60).read()
        url = json.loads(req(f"https://kenney.nl/download-link/{f'assets/{slug}'.encode().hex()}"))["url"]
        data = req(url)
    out = LIB / "sfx" / f"kenney-{slug}"; out.mkdir(parents=True, exist_ok=True)
    entries = []
    with zipfile.ZipFile(io.BytesIO(data)) as z:  # untrusted archive: take audio basenames only, never member paths
        for m in z.infolist():
            name = os.path.basename(m.filename)
            if not re.fullmatch(r"[\w\-]+\.(ogg|wav)", name): continue
            (out / name).write_bytes(z.read(m))
            stem = Path(name).stem
            entries.append({"id": f"sfx/kenney/{stem}", "type": "sfx", "name": stem, "path": rel(out / name), "license": "CC0-1.0",
                            "author": "Kenney (kenney.nl)", "source": f"https://kenney.nl/assets/{slug}",
                            "tags": re.sub(r"([a-z])([A-Z])", r"\1 \2", re.sub(r"_\d+$", "", stem)).lower().replace("_", " ").split()})
    print(f"{len(entries)} files -> {rel(out)}; manifest +", manifest_add(entries))


if __name__ == "__main__":
    if sys.argv[1:2] == ["procedural"]:
        procedural()
    elif sys.argv[1:2] == ["kenney"] and len(sys.argv) > 2:
        kenney(sys.argv[2], sys.argv[sys.argv.index("--zip") + 1] if "--zip" in sys.argv else None)
    else:
        sys.exit(__doc__)
