#!/usr/bin/env bash
#
# Turns the recordings from capture.mjs into the README demo GIFs, one per theme.
#
#   node scripts/screenshots/capture.mjs
#   bash scripts/screenshots/makeGif.sh
#
# GitHub will not play a video in a README but will loop a GIF, so a GIF it is.
# The trade is size: a naive conversion of a 25-second 1100px recording lands
# around 20 MB, which is a rude thing to put at the top of a page. Two passes
# with a generated palette, a 10 fps sample and a 760px width keeps each one
# near 2 MB with no visible banding on flat interface colour.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/../../docs/assets/screenshots"
VIDEO_DIR="$OUT/.video"

FPS=10
WIDTH=760
MAX_BYTES=4194304

build() {
  local theme="$1"
  local src
  src="$(find "$VIDEO_DIR/$theme" -name '*.webm' -print -quit 2>/dev/null || true)"
  if [ -z "$src" ]; then
    echo "No $theme recording in $VIDEO_DIR/$theme. Run capture.mjs first." >&2
    return 1
  fi

  local palette="$VIDEO_DIR/palette-$theme.png"
  local target="$OUT/demo-$theme.gif"

  ffmpeg -loglevel error -y -i "$src" \
    -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen=max_colors=160:stats_mode=diff" \
    "$palette"

  ffmpeg -loglevel error -y -i "$src" -i "$palette" \
    -lavfi "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
    "$target"

  rm -f "$palette"

  local size
  size="$(stat -c%s "$target")"
  echo "  demo-$theme.gif  $(du -h "$target" | cut -f1)"
  if [ "$size" -gt "$MAX_BYTES" ]; then
    echo "  warning: over 4 MB. Lower FPS or WIDTH in this script." >&2
  fi
}

echo "Encoding demo GIFs"
build light
build dark
