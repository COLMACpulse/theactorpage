#!/bin/sh
# tour-voice.zip (from demo/record.html) -> demo/vo/<id>.mp3: mono, 64 kbps, level evened out.
# usage: sh tools/tourvo.sh path/to/tour-voice.zip
set -e
Z="$1"; [ -f "$Z" ] || { echo "usage: sh tools/tourvo.sh tour-voice.zip"; exit 1; }
D=$(mktemp -d); unzip -q "$Z" 'vo/*.wav' -d "$D"
HERE=$(cd "$(dirname "$0")/.." && pwd); n=0
for f in "$D"/vo/*.wav; do id=$(basename "$f" .wav)
  case "$id" in [A-Z][0-9][0-9]) ;; *) continue;; esac
  ffmpeg -v error -y -i "$f" -af "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11" -ac 1 -ar 44100 -b:a 64k "$HERE/demo/vo/$id.mp3"; n=$((n+1))
done
rm -rf "$D"; echo "$n clips in demo/vo/"
