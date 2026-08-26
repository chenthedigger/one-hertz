#!/usr/bin/env python3
"""Neutralize the mat_titanium_case noise normal map in ultra-3-draft.glb.

P4 look lane (docs/p4/look-fixes.md): the gate-3/4 "case-flank baked-texture
mottling" (tarnish smudges at Hands 105mm macro, MWR/Curves edges) was NOT a
base-color bake — every mat_titanium_case map is flat EXCEPT the 512x512
noise normal (image 7). That noise, block-compressed by KTX2/UASTC, clumps
the instrument env's dark zones into large tarnish-like reflection patches.
Empirically A/B-proven 2026-08-26 (roughness sweep isolated the channel; flat
normal killed the defect at Hands .5/.75, Curves .5, MWR .5 with dial + all
node names intact).

Same class as LOOKBIBLE material law 1 (case aniso ban): noisy tangent-space
data on the quantized case UVs renders as marbled noise in three.js — the
machined-satin story is carried by roughness + the streak lightformers, and
film texture by post grain (0.048), never by a noise normal.

Surgery is IN-PLACE on the image slot (same byteLength, PNG + zero padding),
so no bufferView offsets move. Pipeline after this script:
  ~/.local/bin/gltfpack -i ultra-3-draft.glb -o ../../public/assets/watch/ultra-3.ktx2.glb -tc -kn -cc
"""
import io
import json
import struct
import sys

from PIL import Image

CASE_NORMAL_IMAGE = 7  # images[7] — sole user: materials[16] mat_titanium_case.normalTexture

def main(path: str) -> None:
    data = bytearray(open(path, "rb").read())
    _, _, length = struct.unpack("<III", data[:12])
    off, spans = 12, {}
    while off < length:
        (clen,) = struct.unpack("<I", data[off : off + 4])
        spans[bytes(data[off + 4 : off + 8])] = (off + 8, clen)
        off += 8 + clen
    joff, jlen = spans[b"JSON"]
    boff, _ = spans[b"BIN\x00"]
    j = json.loads(bytes(data[joff : joff + jlen]))

    img = j["images"][CASE_NORMAL_IMAGE]
    assert img["mimeType"] == "image/png", img
    users = [i for i, im in enumerate(j["images"]) if im.get("bufferView") == img["bufferView"]]
    assert users == [CASE_NORMAL_IMAGE], f"bufferView shared: {users}"
    nrm_texture = j["materials"][16]["normalTexture"]["index"]
    assert j["textures"][nrm_texture]["source"] == CASE_NORMAL_IMAGE
    assert j["materials"][16]["name"] == "mat_titanium_case"

    bv = j["bufferViews"][img["bufferView"]]
    slot_off = boff + bv.get("byteOffset", 0)
    slot_len = bv["byteLength"]

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (128, 128, 255)).save(buf, "PNG")  # flat +Z normal
    png = buf.getvalue()
    assert len(png) <= slot_len, (len(png), slot_len)
    data[slot_off : slot_off + len(png)] = png
    data[slot_off + len(png) : slot_off + slot_len] = b"\x00" * (slot_len - len(png))
    open(path, "wb").write(data)
    print(f"flat normal ({len(png)} B) written into image[{CASE_NORMAL_IMAGE}] slot ({slot_len} B) of {path}")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "research/asset-qa/ultra-3-draft.glb")
