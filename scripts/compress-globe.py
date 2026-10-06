#!/usr/bin/env python3
"""Compress globe textures: resize to sane dims + jpg quality.
blue-marble stays the hero texture (now used in BOTH themes) so it keeps 2560px;
support maps go 2048px jpg. Saves ~60% of payload."""
from PIL import Image
import os

G = "/home/z/my-project/public/globe"

def convert(src, dst, size, quality):
    im = Image.open(f"{G}/{src}").convert("RGB")
    im = im.resize((size, size // 2), Image.LANCZOS)  # equirect 2:1
    im.save(f"{G}/{dst}", "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"{src} ({os.path.getsize(f'{G}/{src}')//1024} KB) -> {dst} ({os.path.getsize(f'{G}/{dst}')//1024} KB)")

# hero day texture — used for BOTH themes now
convert("earth-blue-marble.jpg", "earth-blue-marble.jpg", 2560, 72)
# bump relief (grayscale-ish) and water mask as jpg
convert("earth-topology.png", "earth-topology.jpg", 2048, 70)
convert("earth-water.png", "earth-water.jpg", 2048, 70)
# starfield sky
convert("night-sky.png", "night-sky.jpg", 2048, 68)

for f in ("earth-night.jpg", "earth-dark.jpg", "earth-topology.png", "earth-water.png", "night-sky.png"):
    p = f"{G}/{f}"
    if os.path.exists(p):
        os.remove(p)
        print(f"removed {f}")
print("total:", sum(os.path.getsize(f"{G}/{f}") for f in os.listdir(G)) // 1024, "KB")
