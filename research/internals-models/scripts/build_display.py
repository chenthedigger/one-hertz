"""A2 internals — part_display (sapphire / display laminate, Ultra 3).

Ref: research/INTERNALS-REF.md §1. The laminate is THREE visibly distinct
wafers — lid + screen + shield — sharing the A1 hero case top-profile
curve (profiles/case_top_profile.json, extracted from the hero ancestor
GLB by extract_case_profile.py; hull is the crystal outline in REAL
METERS, +Y = 12 o'clock, +X = crown side).

Stack (z up, shield bottom at z=0):
  adhesive bead (underside)  -> ink perimeter ring
  shield plate  0    - 0.35  -> stamped cold-rolled steel, kapton patches,
                                two amber flex tails exiting the crown edge
  OLED wafer    0.42 - 0.97  -> off-state ink black, warm specular
  sapphire lid  1.05 - 2.05  -> transmission glass, IOR 1.77 (Cycles
                                beauty; web re-authors as alpha route)

GLB: part_display (sapphire root) > children display_oled, display_shield —
the P3 explode can fan the laminate (the whole show, REF §1).

Run: Blender -b --factory-startup -P build_display.py
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import internals_lib as lib  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RENDERS = os.path.join(ROOT, "renders")
GLB = os.path.join(ROOT, "glb")
for d in (RENDERS, GLB):
    os.makedirs(d, exist_ok=True)

MM = 0.001

with open(os.path.join(ROOT, "profiles", "case_top_profile.json")) as f:
    PROFILE = json.load(f)
HULL = lib.resample_profile(PROFILE["hull"], 220)  # CCW, meters, centered

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

# ---------------------------------------------------------------- materials
# sapphire: transmission for the Cycles beauty pass (web ships alpha route,
# LOOKBIBLE §1.3 law 3 — GLB material is a hint, not truth)
sapphire = lib.simple_mat("sapphire_lid", "#EFF5F3", 0.0, 0.02)
_bs = next(n for n in sapphire.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_bs.inputs["Transmission Weight"].default_value = 1.0
_bs.inputs["IOR"].default_value = 1.77
_bs.inputs["Coat Weight"].default_value = 1.0
_bs.inputs["Coat Roughness"].default_value = 0.03

# OLED off-state: pure ink, slightly warm specular (REF §1)
oled_ink = lib.simple_mat("oled_ink", "#060608", 0.0, 0.14)
_bo = next(n for n in oled_ink.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_bo.inputs["Specular Tint"].default_value = lib.hexc("#FFF2E2")
_bo.inputs["Coat Weight"].default_value = 0.5
_bo.inputs["Coat Roughness"].default_value = 0.08

# stamped cold-rolled shield: matte streaked steel (REF: rough ~0.4)
shield_steel = lib.steel_satin_mat("shield_steel", rough=0.40,
                                   color="#B9BCBE", streaks=True,
                                   streak_axis="Y")

sapphire_parts, oled_parts, shield_parts = [], [], []

# ---------------------------------------------------------------- wafers
# shield plate (bottom) — inset 1.6 mm from the crystal outline
shield_outline = lib.offset_profile(HULL, 1.6 * MM)
shield = lib.prism_from_profile("shield_plate", shield_outline, 0.35 * MM,
                                z0=0.0, mat=shield_steel,
                                edge_bevel=0.08 * MM, bevel_segments=2)
shield_parts.append(shield)

# adhesive bead: ink perimeter ring on the shield underside
bead = lib.prism_from_profile("adhesive_bead",
                              lib.offset_profile(HULL, 1.7 * MM), 0.12 * MM,
                              z0=-0.12 * MM, mat=kit["ink_tape"])
bead_hole = lib.prism_from_profile("bead_hole",
                                   lib.offset_profile(HULL, 2.4 * MM),
                                   0.5 * MM, z0=-0.3 * MM)
lib.boolean(bead, bead_hole)
shield_parts.append(bead)

# OLED wafer — inset 0.8 mm, top nearly kissing the sapphire underside
# (a visible air gap lets the background read through the glass edges)
oled = lib.prism_from_profile("oled_wafer",
                              lib.offset_profile(HULL, 0.8 * MM), 0.60 * MM,
                              z0=0.42 * MM, mat=oled_ink,
                              edge_bevel=0.12 * MM, bevel_segments=3)
oled_parts.append(oled)

# sapphire lid — the full crystal outline (tiny inset kills coplanar risk)
lid = lib.prism_from_profile("sapphire_wafer",
                             lib.offset_profile(HULL, 0.05 * MM), 1.0 * MM,
                             z0=1.05 * MM, mat=sapphire,
                             edge_bevel=0.3 * MM, bevel_segments=4)
sapphire_parts.append(lid)

# ---------------------------------------------------------------- shield dressing
# kapton patches (underside of the laminate = the teardown's money view)
for i, (px, py, w, h) in enumerate((
        (-6 * MM, 6 * MM, 7 * MM, 5 * MM),
        (5 * MM, -7 * MM, 6 * MM, 8 * MM),
        (9 * MM, 9 * MM, 4 * MM, 4 * MM))):
    patch = lib.box(f"kapton_patch_{i}", (w, h, 0.05 * MM),
                    (px, py, -0.03 * MM), mat=kit["kapton"])
    shield_parts.append(patch)

# stamped stiffening ribs (two shallow raised bars, top side under OLED)
for i, ry in enumerate((-11 * MM, 11 * MM)):
    rib = lib.box(f"shield_rib_{i}", (18 * MM, 1.6 * MM, 0.10 * MM),
                  (0, ry, 0.38 * MM), bevel=0.04 * MM, segments=2,
                  mat=shield_steel)
    shield_parts.append(rib)

# spot welds along the ribs
shield_parts += lib.weld_dots(
    "shield_weld",
    [(x * MM, sy * 11 * MM, -0.02 * MM) for sy in (-1, 1)
     for x in (-7, 0, 7)],
    r=0.28 * MM, h=0.05 * MM, mat=kit["weld_dark"])

# two flex tails (display + touch) exiting the crown edge (+X), folding
# under the shield — kapton film thickness (LOOKBIBLE §9 tune 2)
for i, (fy, hw) in enumerate(((3.5 * MM, 3.0 * MM), (-4.5 * MM, 2.2 * MM))):
    pts = [(15.0 * MM, 0.0), (17.2 * MM, -0.9 * MM),
           (19.0 * MM, -0.4 * MM), (20.6 * MM, -1.1 * MM)]
    flex = lib.s_curve_ribbon(f"display_flex_{i}", pts, half_width=hw,
                              thickness=0.06 * MM, mat=kit["kapton"])
    # built in XY (x = exit direction, y = fold depth); stand it so the
    # ribbon width lies along Y: rotate -90° about X, then place
    flex.rotation_euler = (math.radians(90), 0, 0)
    flex.location = (0, fy, 0.30 * MM)
    shield_parts.append(flex)
    conn = lib.box(f"flex_conn_{i}", (1.8 * MM, hw * 2 - 0.8 * MM, 0.7 * MM),
                   (21.2 * MM, fy, -0.80 * MM), bevel=0.15 * MM, segments=2,
                   mat=kit["resin_black"])
    shield_parts.append(conn)

# laser-etched part string on the shield underside (reads in the teardown pose)
etch = lib.text_mesh("display_etch", "LTPO3 · 422×514 · A3281", 0.9 * MM,
                     (-8.5 * MM, -1.5 * MM, -0.014 * MM),
                     rot=(0, math.radians(180), 0),
                     mat=kit["etch_dark"], extrude=0.012 * MM)
shield_parts.append(etch)

# ------------------------------------------------- instrument rig + renders
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
lib.instrument_world(scene, HDR, rot_deg=25.0, strength=1.0)

# A: three-quarter hero — sapphire gloss over ink, wafer edges visible
cam_a = lib.camera_shot("cam_hero", (0.058, -0.072, 0.054), (0, 0, 0.0012),
                        lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "display_a_hero.png"))

# B: top plate, oblique — near-overhead mirrors the high-elevation formers
# (top_strip el 72° sits near zenith) and the face sheets white; ~35° off
# vertical mirrors dark sky, so the ink OLED reads through the glass
cam_b = lib.camera_shot("cam_top", (0.010, -0.115, 0.150), (0, 0, 0.0012),
                        lens=85, fstop=11.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "display_b_top.png"))

# C: edge-on — the 3-wafer stack reads as distinct layers (the whole show).
# No DOF: at this standoff the focus distance sits near the focal length
# and Blender's thin-lens model degenerates (PROGRESS technique note 1)
cam_c = lib.camera_shot("cam_edge", (0.095, -0.040, 0.012), (0, 0, 0.0012),
                        lens=85)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "display_c_edge.png"))

# D: MACRO — crown-edge corner: flex tails, shield brushing, kapton.
# Focus distance must exceed the 40 mm focal length (thin-lens law)
lib.macro_key((0.045, -0.020, 0.060), (0.018, 0.000, 0.000), power=0.25)
cam_d = lib.camera_shot("cam_macro", (0.044, -0.028, 0.020),
                        (0.017, 0.000, 0.000), lens=40, fstop=16.0,
                        sensor=16)
lib.render_to(scene, cam_d, os.path.join(RENDERS, "display_d_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "display.blend"))

root = lib.join(sapphire_parts, "part_display")
oled_o = lib.join(oled_parts, "display_oled")
shield_o = lib.join(shield_parts, "display_shield")
for child in (oled_o, shield_o):
    bpy.ops.object.select_all(action="DESELECT")
    child.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
lib.export_glb([root, oled_o, shield_o], os.path.join(GLB, "part_display.glb"))
print("[done] display build complete")
