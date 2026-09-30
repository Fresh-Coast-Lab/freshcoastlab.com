#!/bin/bash
# publish.sh ABSOLUTE_SRC_DIR [QUALITY]
# Converts Blender bake output (PNGs + house.glb + meta.json) into public/lab/house-3d.
# Lightmaps are resampled into two sets so decoded GPU memory stays small
# (w x h x 4 bytes x 1.333 for mipmaps, per texture):
#   standard  house_env 1536, house_lamps* 1024, lot_env 1024, lot_lamps* 512   about 37.3 MiB
#   low/      house_env 1024, house_lamps* 512,  lot_env 512,  lot_lamps* 256   about 11.7 MiB
set -e
SRC="$1"; Q="${2:-82}"
DST="$(cd "$(dirname "$0")/../../public/lab/house-3d" && pwd)"
TMP="$(mktemp -d)"
size() { # name tier
  case "$1:$2" in
    house_env:std) echo 1536;; house_lamps*:std) echo 1024;; lot_env:std) echo 1024;; lot_lamps*:std) echo 512;;
    house_env:low) echo 1024;; house_lamps*:low) echo 512;;  lot_env:low) echo 512;;  lot_lamps*:low) echo 256;;
  esac
}
mkdir -p "$DST/low"
for f in "$SRC"/*.png; do
  b=$(basename "$f" .png)
  for tier in std low; do
    px=$(size "$b" "$tier")
    sips -s format png -z "$px" "$px" "$f" --out "$TMP/$b-$tier.png" >/dev/null
    out="$DST/$b.webp"; [ "$tier" = low ] && out="$DST/low/$b.webp"
    cwebp -quiet -q "$Q" -m 6 -sharp_yuv -af "$TMP/$b-$tier.png" -o "$out"
  done
done
rm -rf "$TMP"
cp "$SRC/meta.json" "$DST/meta.json"
cd "$(dirname "$0")"
npx --yes @gltf-transform/cli meshopt "$SRC/house.glb" "$DST/house.glb" --level medium >/dev/null 2>&1
ls -la "$DST" "$DST/low"
