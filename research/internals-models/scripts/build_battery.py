"""A2 internals — part_battery (Ultra 3, ~599 mAh / 2.313 Wh pouch in metal carrier).

Ref: research/INTERNALS-REF.md §5 + iFixit Ultra battery photos.
Footprint ~30 x 25 x 5.5 mm vs the 49 mm case. Pipeline smoke for the whole
A2 track: model -> bake -> render (Cycles 64) -> GLB -> gltfpack.

Run: Blender -b -P build_battery.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import internals_lib as lib  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RENDERS = os.path.join(ROOT, "renders")
GLB = os.path.join(ROOT, "glb")
TEX = os.path.join(ROOT, "textures")
for d in (RENDERS, GLB, TEX):
    os.makedirs(d, exist_ok=True)

MM = 0.001

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

parts = []

# ---------------------------------------------------------------- pouch body
# 25 (X) x 30 (Y) x 5.0 (Z) graphite pouch, bottom at z=0
pouch = lib.box("pouch", (25 * MM, 30 * MM, 5.0 * MM), (0, 0, 2.5 * MM),
                bevel=1.3 * MM, segments=5, mat=kit["graphite_pouch"])
# asymmetric pressure-relief notch: chamfer the (-X,+Y) corner 45deg
cutter = lib.box("notch_cut", (6 * MM, 6 * MM, 8 * MM), (-12.5 * MM, 15 * MM, 2.5 * MM))
cutter.rotation_euler = (0, 0, math.radians(45))
lib.boolean(pouch, cutter)
parts.append(pouch)

# terrace fold at +Y edge: thinner crimped ledge where the tabs exit
terrace = lib.box("terrace", (20 * MM, 3.6 * MM, 2.6 * MM),
                  (0.5 * MM, 16.2 * MM, 1.6 * MM),
                  bevel=0.5 * MM, segments=3, mat=kit["graphite_pouch"])
parts.append(terrace)

# crimped side seams: thin flattened flanges along +-X
for sx in (-1, 1):
    seam = lib.box(f"seam_{'l' if sx < 0 else 'r'}",
                   (0.9 * MM, 26 * MM, 0.45 * MM),
                   (sx * 12.9 * MM, -1.0 * MM, 3.6 * MM),
                   bevel=0.15 * MM, segments=2, mat=kit["alu_crimp"])
    parts.append(seam)

# ---------------------------------------------------------------- steel carrier
# satin steel top face (the printed face in the iFixit photo).
# §9 tune 3: dedicated linear-brushed mat, aniso 0 — the kit steel's
# UV-radial tangent gave battery_b_top its spun-metal radial highlight.
steel_carrier = lib.steel_satin_mat("steel_carrier", rough=0.38,
                                    color="#C2C4C6", streaks=True,
                                    aniso=0.0, streak_axis="Y")
carrier = lib.box("carrier", (23.6 * MM, 28.4 * MM, 0.45 * MM),
                  (0, 0, 5.15 * MM), bevel=0.18 * MM, segments=3,
                  mat=steel_carrier)
parts.append(carrier)

# two brass ENIG screw ears on +X edge (spot-welded, Y000 screw holes)
for i, ey in enumerate((8 * MM, -8 * MM)):
    neck = lib.box(f"ear_neck_{i}", (3.2 * MM, 3.0 * MM, 0.4 * MM),
                   (13.0 * MM, ey, 5.15 * MM), bevel=0.12 * MM, segments=2,
                   mat=kit["brass_enig"])
    disc = lib.cylinder(f"ear_disc_{i}", 1.7 * MM, 0.4 * MM,
                        (15.0 * MM, ey, 5.15 * MM), mat=kit["brass_enig"])
    hole = lib.cylinder(f"ear_hole_{i}", 0.7 * MM, 2 * MM, (15.0 * MM, ey, 5.15 * MM))
    lib.boolean(disc, hole)
    # spot welds: 2x2 grid on the neck
    dots = lib.weld_dots(
        f"ear_weld_{i}",
        [(12.4 * MM + dx, ey + dy, 5.40 * MM)
         for dx in (0, 1.2 * MM) for dy in (-0.7 * MM, 0.7 * MM)],
        r=0.28 * MM, h=0.08 * MM, mat=kit["weld_dark"])
    parts += [neck, disc] + dots

# ---------------------------------------------------------------- terminal tab
# nickel terminal plate on the terrace + spot welds
tab = lib.box("terminal_tab", (7 * MM, 2.8 * MM, 0.25 * MM),
              (2 * MM, 16.2 * MM, 3.0 * MM), bevel=0.08 * MM, segments=2,
              mat=kit["nickel_tab"])
tab_welds = lib.weld_dots(
    "tab_weld",
    [(2 * MM + dx, 16.2 * MM + dy, 3.17 * MM)
     for dx in (-2 * MM, 0, 2 * MM) for dy in (-0.6 * MM, 0.6 * MM)],
    r=0.26 * MM, h=0.06 * MM, mat=kit["weld_dark"])
parts += [tab] + tab_welds

# ---------------------------------------------------------------- kapton details
# kapton tape strip riding over the -X edge of the carrier
strip_top = lib.box("kapton_top", (4.5 * MM, 24 * MM, 0.1 * MM),
                    (-9.5 * MM, -1 * MM, 5.45 * MM), mat=kit["kapton"])
strip_side = lib.box("kapton_side", (0.1 * MM, 24 * MM, 3.2 * MM),
                     (-12.6 * MM, -1 * MM, 3.4 * MM), mat=kit["kapton"])
# ink-black assembly tape at the -Y foot (iFixit photo)
ink = lib.box("ink_tape", (18 * MM, 3.5 * MM, 0.1 * MM),
              (0, -12.5 * MM, 5.45 * MM), mat=kit["ink_tape"])
parts += [strip_top, strip_side, ink]

# flex ribbon: kapton S-fall off the terrace to the connector
# §9 tune 2: film thickness (0.06 mm), flattened bend profile
flex = lib.s_curve_ribbon(
    "flex", [(16.8 * MM, 3.0 * MM), (18.8 * MM, 4.0 * MM),
             (20.8 * MM, 2.4 * MM), (22.8 * MM, 1.6 * MM)],
    half_width=2.6 * MM, thickness=0.06 * MM, mat=kit["kapton"])
# built in XY-as-(Y,Z) plane: rotate so S stands vertical along +Y off the terrace
flex.rotation_euler = (math.radians(90), 0, math.radians(90))
flex.location = (2 * MM, 0, 0)
parts.append(flex)

# connector block at flex end (resin base + bright contact block)
conn_base = lib.box("conn_base", (5.2 * MM, 2.6 * MM, 1.0 * MM),
                    (2 * MM, 23.4 * MM, 1.0 * MM), bevel=0.2 * MM, segments=2,
                    mat=kit["resin_black"])
conn_top = lib.box("conn_top", (4.4 * MM, 1.9 * MM, 0.7 * MM),
                   (2 * MM, 23.4 * MM, 1.75 * MM), bevel=0.15 * MM, segments=2,
                   mat=kit["nickel_tab"])
parts += [conn_base, conn_top]

# ---------------------------------------------------------------- spec text
# printed block, rotated 90deg like the real face (reads along Y)
label_lines = [
    "Apple Inc. Rechargeable",
    "Li-ion Battery 3.86V 2.31Wh",
    "599mAh   A3281",
    "Assembled in China",
]
for i, line in enumerate(label_lines):
    t = lib.text_mesh(f"label_{i}", line, 1.15 * MM,
                      (3.6 * MM - i * 1.9 * MM, -9.5 * MM, 5.42 * MM),
                      rot=(0, 0, math.radians(90)),
                      mat=kit["silkscreen"], extrude=0.012 * MM)
    parts.append(t)

# ---------------------------------------------------------------- bake pouch
img = lib.bake_normal(pouch, "battery_pouch_nrm", 2048,
                      os.path.join(TEX, "battery_pouch_nrm.png"))
lib.rewire_baked_normal(kit["graphite_pouch"], img)
# terrace shares the material -> gets the baked map via its own UVs
lib.smart_uv(terrace)

# ------------------------------------------------- instrument rig + renders
# §9 tune 4: instrument.hdr world env (shipped look continuity), ink stage
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
lib.instrument_world(scene, HDR, rot_deg=25.0, strength=1.0)
# no floor: the env's near-black gradient IS the stage (shootout parity)

# A: three-quarter hero (graphite flank + carrier face + ears; DOF reined in)
cam_a = lib.camera_shot("cam_hero", (0.085, -0.095, 0.070), (0, 0, 0.0025),
                        lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "battery_a_hero.png"))

# B: top-front elevation (carrier face + text + ears)
cam_b = lib.camera_shot("cam_top", (0.012, -0.020, 0.155), (0, 0.002, 0.003),
                        lens=85, fstop=11.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "battery_b_top.png"))

# C: MACRO — terrace + terminal welds + kapton S-fall, shallow-but-valid DOF
lib.macro_key((0.075, 0.095, 0.085), (0.002, 0.016, 0.0035), power=1.0)
cam_c = lib.camera_shot("cam_macro", (0.034, 0.056, 0.036),
                        (0.002, 0.016, 0.0038), lens=40, fstop=16.0, sensor=16)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "battery_c_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "battery.blend"))

battery = lib.join(parts, "part_battery")
lib.export_glb([battery], os.path.join(GLB, "part_battery.glb"))
print("[done] battery build complete")
