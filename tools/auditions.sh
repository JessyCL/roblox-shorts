#!/usr/bin/env bash
# Build music audition clips: narration excerpt of a section + candidate track at the section's level, mastered
# like the final (-12 LUFS, -1 dBTP limiter). Usage: tools/auditions.sh <production dir> <out dir> <spec file>
# spec lines: name|narr_start|dur|track.mp3|track_offset_s|db_under_voice   (short tracks are looped)
set -euo pipefail
PATH="$(cd "$(dirname "$0")" && pwd)/bin:$PATH" # prefer the project-local ffmpeg from setup.ps1 when present
D=$1; OUT=$2; SPEC=$3
mkdir -p "$OUT"
lufs() { ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}'; }
while IFS='|' read -r name ns dur track off under; do
  [ -z "$name" ] && continue
  case "$name" in \#*) continue ;; esac
  tmp="$OUT/_tmp.wav"
  ml=$(awk -v u="$under" 'BEGIN{print -16 - u}')
  ffmpeg -v error -y -ss "$ns" -t "$dur" -i "$D/audio/narration.wav" -stream_loop -1 -ss "$off" -i "$track" -filter_complex \
    "[0:a]aresample=48000,loudnorm=I=-16:TP=-2[v];[1:a]atrim=duration=$dur,aresample=48000,loudnorm=I=$ml:TP=-6,afade=t=in:d=0.6,afade=t=out:st=$(awk -v d="$dur" 'BEGIN{print d-1.2}'):d=1.2[m];[v][m]amix=inputs=2:normalize=0:duration=first,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3dB,alimiter=limit=0.89:level=false[o]" \
    -map "[o]" "$tmp"
  g=$(awk -v l="$(lufs "$tmp")" 'BEGIN{print -12 - l}')
  ffmpeg -v error -y -i "$tmp" -af "volume=${g}dB,alimiter=limit=0.89:level=false" -c:a libmp3lame -b:a 192k "$OUT/$name.mp3"
  echo "$name.mp3"
done < "$SPEC"
rm -f "$OUT/_tmp.wav"
