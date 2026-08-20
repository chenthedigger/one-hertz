"""A2 internals — part_sip (S-series SiP, S9/S10 class TMQW67, InFO-PoP).

Ref: research/INTERNALS-REF.md §4 (closed resin plate — the honest 2/5
choice) + LOOKBIBLE §9 queue. The entire logic board potted in resin:
~38 x 32 x 2.2 mm charcoal monolith, connector field + bracket, gold ENIG
pad ring around the top-face perimeter, laser-etched white markings, faint
lamination line on the edges, and the EMISSIVE DIE FLOORPLAN authored now
on a second UV set ("floorplan", TEXCOORD_1) — Nocturne needs it.

Run: Blender -b --factory-startup -P build_sip.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import numpy as np  # noqa: E402
import internals_lib as lib  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RENDERS = os.path.join(ROOT, "renders")
GLB = os.path.join(ROOT, "glb")
TEX = os.path.join(ROOT, "textures")
for d in (RENDERS, GLB, TEX):
    os.makedirs(d, exist_ok=True)

MM = 0.001
PLATE_W, PLATE_H, PLATE_T = 38 * MM, 32 * MM, 2.2 * MM

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

parts = []

# ------------------------------------------------- emissive floorplan texture
# Abstracted from the TechInsights S9 (TMQW67) floorplan: 2 Sawtooth
# P-cores, 4-core Neural Engine, GPU, SLC/SRAM banks, fabric strips.
# Texture spans the WHOLE top face (planar UV) so the glow sits at the
# die's true location; everything outside the die stays black.
SIZE = 512
img_px = np.zeros((SIZE, SIZE, 4), dtype=np.float32)
img_px[..., 3] = 1.0
AMBER = np.array([1.0, 0.42, 0.13], dtype=np.float32)  # copper-semantic glow


def rect(u0, v0, u1, v1, level):
    x0, x1 = int(u0 * SIZE), int(u1 * SIZE)
    y0, y1 = int(v0 * SIZE), int(v1 * SIZE)
    img_px[y0:y1, x0:x1, :3] = AMBER * level


# die region ~9 x 8 mm centered slightly crown-side: u 0.38-0.62, v 0.36-0.61
DU0, DV0, DU1, DV1 = 0.38, 0.36, 0.62, 0.61


def die_rect(fu0, fv0, fu1, fv1, level):
    rect(DU0 + fu0 * (DU1 - DU0), DV0 + fv0 * (DV1 - DV0),
         DU0 + fu1 * (DU1 - DU0), DV0 + fv1 * (DV1 - DV0), level)


# CPU: two P-cores, upper left
die_rect(0.04, 0.55, 0.24, 0.94, 0.85)
die_rect(0.27, 0.55, 0.47, 0.94, 0.85)
# SLC/SRAM banks: thin bright stripes under the cores
for i in range(4):
    die_rect(0.05 + i * 0.115, 0.42, 0.145 + i * 0.115, 0.50, 0.55)
# GPU block, right half
die_rect(0.55, 0.42, 0.95, 0.94, 0.70)
# Neural Engine: 4 small cores along the bottom
for i in range(4):
    die_rect(0.05 + i * 0.14, 0.06, 0.16 + i * 0.14, 0.32, 0.90)
# fabric / IO strips
die_rect(0.62, 0.06, 0.95, 0.30, 0.45)
die_rect(0.0, 0.36, 1.0, 0.405, 0.30)   # horizontal bus
die_rect(0.50, 0.06, 0.545, 0.94, 0.30)  # vertical bus

img = bpy.data.images.new("sip_floorplan", SIZE, SIZE, alpha=False)
img.pixels.foreach_set(img_px.ravel())
img.filepath_raw = os.path.join(TEX, "sip_floorplan_emissive.png")
img.file_format = "PNG"
img.save()
img.pack()

# ---------------------------------------------------------------- materials
# dedicated resin (only THIS material carries the emissive floorplan)
resin_sip = lib.simple_mat("resin_sip", "#141517", 0.0, 0.65)
nt = resin_sip.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
uvn = nt.nodes.new("ShaderNodeUVMap")
uvn.uv_map = "floorplan"
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = img
nt.links.new(uvn.outputs["UV"], tex.inputs["Vector"])
nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
# faint ember through the resin (REF §4) — the TEXTURE stays full-range;
# the web runtime cranks emissiveIntensity for the Nocturne beat
bsdf.inputs["Emission Strength"].default_value = 0.35
# whisper of resin sheen so the monolith isn't a dead void
bsdf.inputs["Coat Weight"].default_value = 0.06
bsdf.inputs["Coat Roughness"].default_value = 0.4

lamina = lib.simple_mat("lamina_edge", "#26282B", 0.0, 0.5)
etch_white = lib.simple_mat("etch_white", "#C9CBCD", 0.0, 0.45)

# ---------------------------------------------------------------- plate
plate = lib.box("plate", (PLATE_W, PLATE_H, PLATE_T), (0, 0, PLATE_T / 2),
                bevel=0.5 * MM, segments=4, mat=resin_sip)
# lamination line: thin lighter band around the edge at mid height
ring = lib.box("lamina_ring", (PLATE_W + 0.06 * MM, PLATE_H + 0.06 * MM,
                               0.22 * MM), (0, 0, 0.9 * MM), mat=lamina)
ring_hole = lib.box("lamina_hole", (PLATE_W - 0.6 * MM, PLATE_H - 0.6 * MM,
                                    0.5 * MM), (0, 0, 0.9 * MM))
lib.boolean(ring, ring_hole)
parts += [plate, ring]

# InFO-PoP topography: die mound + DRAM step on top (potted, so subtle)
mound = lib.box("die_mound", (9.2 * MM, 8.0 * MM, 0.14 * MM),
                (0, -0.4 * MM, PLATE_T + 0.06 * MM), bevel=0.45 * MM,
                segments=4, mat=resin_sip)
dram = lib.box("dram_step", (6.4 * MM, 5.6 * MM, 0.10 * MM),
               (0, -0.4 * MM, PLATE_T + 0.16 * MM), bevel=0.4 * MM,
               segments=4, mat=resin_sip)
parts += [mound, dram]

# ---------------------------------------------------------------- gold pad ring
# ENIG test-pad ring around the top-face perimeter (task: "gold pad ring")
pad_z = PLATE_T + 0.02 * MM
for sy in (-1, 1):  # long edges (+-Y): pads elongated along Y
    y = sy * (PLATE_H / 2 - 1.1 * MM)
    for i in range(21):
        x = -15.0 * MM + i * 1.5 * MM
        parts.append(lib.box(f"pad_y{sy}_{i}", (0.8 * MM, 0.4 * MM, 0.04 * MM),
                             (x, y, pad_z), mat=kit["brass_enig"]))
for sx in (-1, 1):  # short edges (+-X): pads rotated
    x = sx * (PLATE_W / 2 - 1.1 * MM)
    for i in range(17):
        y = -12.0 * MM + i * 1.5 * MM
        parts.append(lib.box(f"pad_x{sx}_{i}", (0.4 * MM, 0.8 * MM, 0.04 * MM),
                             (x, y, pad_z), mat=kit["brass_enig"]))

# ---------------------------------------------------------------- connector field
# 4 micro board connectors (resin base + bright contact frame) upper region
CONNS = [
    ("conn_a", (5.4 * MM, 2.4 * MM), (-11 * MM, 10.5 * MM)),
    ("conn_b", (4.2 * MM, 2.0 * MM), (-3.5 * MM, 11.5 * MM)),
    ("conn_c", (6.8 * MM, 2.2 * MM), (5.5 * MM, 10.5 * MM)),
    ("conn_d", (3.2 * MM, 2.0 * MM), (12.5 * MM, 6.0 * MM)),
]
for name, (w, h), (cx, cy) in CONNS:
    base = lib.box(f"{name}_base", (w, h, 0.65 * MM),
                   (cx, cy, PLATE_T + 0.33 * MM), bevel=0.2 * MM, segments=2,
                   mat=kit["resin_black"])
    top = lib.box(f"{name}_top", (w - 0.8 * MM, h - 0.7 * MM, 0.45 * MM),
                  (cx, cy, PLATE_T + 0.75 * MM), bevel=0.15 * MM, segments=2,
                  mat=kit["nickel_tab"])
    parts += [base, top]

# stamped-steel retaining bracket over conn_a/conn_b + spot welds
bracket = lib.box("bracket", (10.5 * MM, 1.4 * MM, 0.25 * MM),
                  (-7.5 * MM, 8.6 * MM, PLATE_T + 0.9 * MM),
                  bevel=0.08 * MM, segments=2, mat=kit["steel_bare"])
b_welds = lib.weld_dots(
    "bracket_weld",
    [(-11.5 * MM, 8.6 * MM, PLATE_T + 1.05 * MM),
     (-3.5 * MM, 8.6 * MM, PLATE_T + 1.05 * MM)],
    r=0.3 * MM, h=0.06 * MM, mat=kit["weld_dark"])
parts += [bracket] + b_welds

# ---------------------------------------------------------------- screw bosses
for i, (bx, by) in enumerate(((-16.2 * MM, -13.2 * MM), (16.2 * MM, -13.2 * MM),
                              (16.2 * MM, 13.2 * MM))):
    boss = lib.cylinder(f"boss_{i}", 1.4 * MM, 0.5 * MM,
                        (bx, by, PLATE_T + 0.25 * MM), mat=kit["resin_black"])
    pad = lib.cylinder(f"boss_pad_{i}", 1.0 * MM, 0.1 * MM,
                       (bx, by, PLATE_T + 0.52 * MM), mat=kit["brass_enig"])
    hole = lib.cylinder(f"boss_hole_{i}", 0.55 * MM, 3 * MM,
                        (bx, by, PLATE_T + 0.3 * MM))
    lib.boolean(boss, hole, keep_cutter=True)
    lib.boolean(pad, hole)
    parts += [boss, pad]

# ---------------------------------------------------------------- markings
# laser-etched white strings (text-as-geometry, PROGRESS technique note 6)
label_lines = [
    ("Apple S10", 1.7 * MM),
    ("TMQW67 · N4P · InFO-PoP", 0.9 * MM),
    ("339S01185  A3281", 0.9 * MM),
]
ty = -8.5 * MM
for i, (line, size) in enumerate(label_lines):
    t = lib.text_mesh(f"sip_label_{i}", line, size,
                      (-16.0 * MM, ty - i * 2.3 * MM, PLATE_T + 0.02 * MM),
                      mat=etch_white, extrude=0.012 * MM)
    parts.append(t)

# ---------------------------------------------------------------- UV sets
# UV0: smart projection (default). UV1 "floorplan": planar top-face map —
# the emissive texture's TEXCOORD_1 contract for the web runtime.
lib.smart_uv(plate)
for obj in (plate, mound, dram):
    me = obj.data
    uv = me.uv_layers.new(name="floorplan")
    for loop in me.loops:
        co = obj.matrix_world @ me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (co.x / PLATE_W + 0.5, co.y / PLATE_H + 0.5)

# ------------------------------------------------- instrument rig + renders
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
lib.instrument_world(scene, HDR, rot_deg=25.0, strength=1.0)

# A: three-quarter hero — plate edge + connector field + pad ring
cam_a = lib.camera_shot("cam_hero", (0.075, -0.085, 0.062), (0, 0, 0.0018),
                        lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "sip_a_hero.png"))

# B: top-down — silkscreen, pad ring, die mound + faint floorplan glow
cam_b = lib.camera_shot("cam_top", (0.010, -0.024, 0.165), (0, 0.000, 0.002),
                        lens=85, fstop=11.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "sip_b_top.png"))

# C: MACRO — connector field + bracket + gold pads, die glow at frame edge
lib.macro_key((0.055, 0.075, 0.075), (-0.006, 0.009, 0.003), power=0.8)
cam_c = lib.camera_shot("cam_macro", (0.020, 0.042, 0.030),
                        (-0.006, 0.009, 0.0028), lens=40, fstop=16.0,
                        sensor=16)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "sip_c_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "sip.blend"))

sip = lib.join(parts, "part_sip")
lib.export_glb([sip], os.path.join(GLB, "part_sip.glb"))
print("[done] sip build complete")
