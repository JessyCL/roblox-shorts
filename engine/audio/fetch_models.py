"""Download the offline TTS models into the caches tts.py reads (engine/config.json hf_kokoro / hf_whisper).

  <audio venv python> -I engine/audio/fetch_models.py      (setup.ps1 -WithKokoro runs it; re-running only re-checks)

Kokoro-82M weights + the voices this project uses -> <hf_kokoro>/hub; faster-whisper <whisper_model> -> <hf_whisper>/hub.
Needs requirements-kokoro.txt installed.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, CFG

os.environ.update(HF_HOME=str((ROOT / CFG["hf_kokoro"]).resolve()), HF_HUB_DISABLE_XET="1",  # before the hub import
                  HF_HUB_DISABLE_TELEMETRY="1", HF_HUB_DISABLE_SYMLINKS_WARNING="1")
from huggingface_hub import hf_hub_download
from faster_whisper import download_model

VOICES = ["am_fenrir", "am_michael", "am_puck", "af_heart", "af_bella", "bf_emma", "bm_fable", "bm_george"]
for f in ["config.json", "kokoro-v1_0.pth", *[f"voices/{v}.pt" for v in VOICES]]:
    print(hf_hub_download("hexgrad/Kokoro-82M", f))
print(download_model(CFG["whisper_model"], cache_dir=str((ROOT / CFG["hf_whisper"] / "hub").resolve())))
