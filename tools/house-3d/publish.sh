#!/bin/bash
# publish.sh ABSOLUTE_SRC_DIR [QUALITY]  -> converts bake output into public/lab/house-3d
set -e
SRC="$1"; Q="${2:-82}"
DST="$(cd "$(dirname "$0")/../../public/lab/house-3d" && pwd)"
for f in "$SRC"/*.png; do
  b=$(basename "$f" .png)
  cwebp -quiet -q "$Q" -m 6 -sharp_yuv -af "$f" -o "$DST/$b.webp"
done
cp "$SRC/meta.json" "$DST/meta.json"
cd "$(dirname "$0")"
npx --yes @gltf-transform/cli meshopt "$SRC/house.glb" "$DST/house.glb" --level medium >/dev/null 2>&1
ls -la "$DST"
