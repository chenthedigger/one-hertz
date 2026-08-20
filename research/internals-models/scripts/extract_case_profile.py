"""A2 internals — extract the A1 hero case top-profile curve.

The shipped hero (public/assets/watch/ultra-3.ktx2.glb) requires
EXT_meshopt_compression + KHR_texture_basisu, which Blender cannot import.
Its direct ancestor research/asset-qa/ultra-3-draft.glb (same geometry,
plain glTF) imports clean — the profile is extracted from there.

Method: PCA on part_crystal world verts -> dial-plane frame (normal = min
variance axis); project crystal + case + crown nodes into that frame;
convex hull of the crystal projection IS the laminate outline (a rounded
rect is convex, so the hull is exact). Scale anchor: part_case long axis
= 49.0 mm lug-to-lug (Apple spec; guard bulge only widens the short axis).

Out: profiles/case_top_profile.json — hull polyline in REAL METERS,
centered, +Y = case long axis (12 o'clock), +X = crown side; plus
measured crown-element boxes in the same frame for build_crown.py.

Run: Blender -b --factory-startup -P extract_case_profile.py
"""

import json
import os
import sys

import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
DRAFT = os.path.join(REPO, "research", "asset-qa", "ultra-3-draft.glb")
OUT_DIR = os.path.join(ROOT, "profiles")
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=DRAFT)


def world_verts(obj):
    mw = np.array(obj.matrix_world)
    n = len(obj.data.vertices)
    co = np.empty(n * 3)
    obj.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    return co @ mw[:3, :3].T + mw[:3, 3]


def collect(name):
    """All mesh verts under the node `name` (self + descendants)."""
    root = bpy.data.objects.get(name)
    if root is None:
        raise RuntimeError(f"node not found: {name}")
    stack, out = [root], []
    while stack:
        o = stack.pop()
        stack.extend(o.children)
        if o.type == "MESH" and len(o.data.vertices):
            out.append(world_verts(o))
    if not out:
        raise RuntimeError(f"no mesh verts under: {name}")
    return np.vstack(out)


def convex_hull_2d(pts):
    """Andrew monotone chain. pts (N,2) -> hull (M,2) CCW."""
    p = pts[np.lexsort((pts[:, 1], pts[:, 0]))]

    def half(seq):
        h = []
        for q in seq:
            while len(h) >= 2 and np.cross(h[-1] - h[-2], q - h[-2]) <= 0:
                h.pop()
            h.append(q)
        return h

    lower = half(p)
    upper = half(p[::-1])
    return np.array(lower[:-1] + upper[:-1])


crystal = collect("part_crystal")
case = collect("part_case")

# PCA frame from the crystal (a flat slab: min-variance axis = dial normal)
c_mean = crystal.mean(axis=0)
cov = np.cov((crystal - c_mean).T)
evals, evecs = np.linalg.eigh(cov)
normal = evecs[:, 0]                      # smallest variance
e1, e2 = evecs[:, 2], evecs[:, 1]         # long, short in-plane axes

case2d = np.stack([(case - c_mean) @ e1, (case - c_mean) @ e2], axis=1)
# orient: +Y = case long axis. e1 is the long axis (largest variance).
cry2d_e = np.stack([(crystal - c_mean) @ e1, (crystal - c_mean) @ e2], axis=1)
case_long_raw = case2d[:, 0].max() - case2d[:, 0].min()
case_short_raw = case2d[:, 1].max() - case2d[:, 1].min()
SCALE = 0.049 / case_long_raw            # lug-to-lug 49.0 mm anchor

# frame: x' = short axis (crown side +), y' = long axis (12 o'clock +)
cry = np.stack([cry2d_e[:, 1], cry2d_e[:, 0]], axis=1) * SCALE
cry -= cry.mean(axis=0)
# crown side: the crown nodes sit at +x' or -x' — flip so crown is +X
crown_pts = collect("part_crown")
crown2d = np.stack([(crown_pts - c_mean) @ e2, (crown_pts - c_mean) @ e1],
                   axis=1) * SCALE
if crown2d[:, 0].mean() < 0:
    cry[:, 0] *= -1.0
    flip_x = True
else:
    flip_x = False

hull = convex_hull_2d(cry)
if flip_x:  # mirroring reverses winding; restore CCW
    hull = hull[::-1]

crystal_w = hull[:, 0].max() - hull[:, 0].min()
crystal_h = hull[:, 1].max() - hull[:, 1].min()


def frame3(pts):
    p = np.stack([(pts - c_mean) @ e2, (pts - c_mean) @ e1,
                  (pts - c_mean) @ normal], axis=1) * SCALE
    if flip_x:
        p[:, 0] *= -1.0
    return p


crown_boxes = {}
for nm in ("crown_cap", "crown_cap_face", "crown_core", "crown_gasket",
           "crown_outer_ring", "crown_ring_orange"):
    try:
        p = frame3(collect(nm))
        crown_boxes[nm] = {
            "min": p.min(axis=0).tolist(),
            "max": p.max(axis=0).tolist(),
            "dims": (p.max(axis=0) - p.min(axis=0)).tolist(),
        }
    except RuntimeError:
        pass

out = {
    "source": "research/asset-qa/ultra-3-draft.glb (hero ancestor, same geometry)",
    "scale_anchor": "part_case long axis = 49.0 mm lug-to-lug",
    "units": "meters",
    "frame": "+Y = case long axis (12 o'clock), +X = crown side, origin = crystal centroid",
    "case_dims_m": [case_short_raw * SCALE, case_long_raw * SCALE],
    "crystal_dims_m": [float(crystal_w), float(crystal_h)],
    "hull": hull.tolist(),
    "hull_points": int(len(hull)),
    "crown_boxes_m": crown_boxes,
}
path = os.path.join(OUT_DIR, "case_top_profile.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
print(f"[profile] {path}")
print(f"[profile] case {case_short_raw*SCALE*1000:.1f} x {case_long_raw*SCALE*1000:.1f} mm")
print(f"[profile] crystal {crystal_w*1000:.1f} x {crystal_h*1000:.1f} mm, {len(hull)} hull pts")
for nm, b in crown_boxes.items():
    d = b["dims"]
    print(f"[profile] {nm}: {d[0]*1000:.2f} x {d[1]*1000:.2f} x {d[2]*1000:.2f} mm")
