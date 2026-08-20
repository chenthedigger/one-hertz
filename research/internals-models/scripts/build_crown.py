"""A2 internals — part_crown_asm (Digital Crown assembly, Ultra 3).

Ref: research/INTERNALS-REF.md §2 — a coaxial stack that explodes along
its own axis (the exploded view's best watchmaking beat): knurled cap ->
collar -> orange anodized ring -> gasket washer -> stem -> optical encoder
spindle (striped micro-drum, Apple patents US10655988/US11002572) ->
L-shaped retaining bracket.

Proportions from the A1 hero measurements (profiles/case_top_profile.json
crown_boxes_m): outer knurl ring Ø9.4 x 2.9 mm, cap face Ø7.7, orange
ring Ø7.2, cap dome Ø6.1, gasket Ø6.3. Axis = +X (crown side), origin at
the case-wall plane; the crown cap sits proud (+X), stem/encoder inboard.

GLB: part_crown_asm (cap root) > children crown_gasket, crown_stem,
crown_encoder, crown_bracket — each element a named node so P3 can fan
the stack coaxially.

Run: Blender -b --factory-startup -P build_crown.py
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
for d in (RENDERS, GLB):
    os.makedirs(d, exist_ok=True)

MM = 0.001

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

# ---------------------------------------------------------------- materials
# LOOKBIBLE §1.3 crown row (Cycles renders may keep aniso — real tangents
# offline; the web config re-authors, never copies these values)
ti_crown = lib.simple_mat("ti_crown", "#cfccc6", 1.0, 0.32, anisotropic=0.7)
ti_knurl = lib.simple_mat("ti_knurl", "#c9c6c0", 1.0, 0.36, anisotropic=0.5)
ti_polished = lib.simple_mat("ti_polished", "#dcdad6", 1.0, 0.08)
orange_ring = lib.simple_mat("orange_anodized", "#e04f18", 0.4, 0.42)
gasket_mat = lib.simple_mat("gasket_epdm", "#0E0F10", 0.0, 0.9)
drum_white = lib.simple_mat("encoder_drum", "#E8E9EA", 0.0, 0.28)
stripe_ink = lib.simple_mat("encoder_stripe", "#0B0B0C", 0.0, 0.35)

cap_parts, gasket_parts, stem_parts, enc_parts, bracket_parts = [], [], [], [], []


def along_x(obj):
    """Rotate a +Z-built lathe element so its axis runs along +X."""
    obj.rotation_euler = (0, math.radians(90), 0)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return obj


# ---------------------------------------------------------------- knurled cap
# straight fluting, 72 teeth (REF: fine-pitch fluting, NOT diamond knurl):
# star ring profile -> prism -> ring bore -> rotate onto +X
TEETH, R_OUT, DEPTH = 72, 4.70 * MM, 0.16 * MM
star = []
STEPS = TEETH * 6
for i in range(STEPS):
    a = 2 * math.pi * i / STEPS
    # triangle wave: 1 at tooth crest, 0 in the groove root
    t = (i % 6) / 6.0
    tri = 1.0 - abs(t * 2.0 - 1.0)
    r = R_OUT - DEPTH * (1.0 - tri)
    star.append((r * math.cos(a), r * math.sin(a)))
knurl = lib.prism_from_profile("knurl_ring", star, 2.9 * MM, z0=0.0,
                               mat=ti_knurl)
bore = lib.cylinder("knurl_bore", 3.9 * MM, 4 * MM, (0, 0, 1.45 * MM))
lib.boolean(knurl, bore)
# chamfer the tooth ends: two cone frustum cutters would be heavy — a
# light edge bevel keeps the per-tooth glint crisp
knurl = along_x(knurl)
knurl.location = (0.9 * MM, 0, 0)
cap_parts.append(knurl)

# core fill behind the teeth (brushed circumferential flank)
core = along_x(lib.cylinder("cap_core", 4.02 * MM, 2.9 * MM,
                            (0, 0, 0), mat=ti_crown, verts=96))
core.location = (2.35 * MM, 0, 0)
cap_parts.append(core)

# rear collar: smooth ring stepping down toward the case wall
collar = along_x(lib.cylinder("cap_collar", 4.15 * MM, 0.7 * MM, (0, 0, 0),
                              mat=ti_crown, verts=96))
collar.location = (0.55 * MM, 0, 0)
cap_parts.append(collar)

# end face: brushed disc + ORANGE ANODIZED RING (the loudest accent in the
# whole exploded view, REF §2) + polished ECG electrode dome
face = along_x(lib.cylinder("cap_face", 4.55 * MM, 0.35 * MM, (0, 0, 0),
                            mat=ti_crown, verts=96))
face.location = (3.95 * MM, 0, 0)
cap_parts.append(face)

oring = along_x(lib.cylinder("ring_orange", 3.62 * MM, 0.10 * MM, (0, 0, 0),
                             mat=orange_ring, verts=96))
oring_hole = lib.cylinder("oring_hole", 3.10 * MM, 1.0 * MM, (0, 0, 0))
along_x(oring_hole)
oring.location = (4.16 * MM, 0, 0)
oring_hole.location = (4.16 * MM, 0, 0)
lib.boolean(oring, oring_hole)
cap_parts.append(oring)

# ECG electrode: polished (mirror) end dome vs brushed sides — REF §2
# "beautiful and true"
bpy.ops.mesh.primitive_uv_sphere_add(radius=3.05 * MM, location=(0, 0, 0),
                                     segments=64, ring_count=32)
dome = bpy.context.active_object
dome.name = "cap_dome"
dome.data.name = "cap_dome"
dome.scale = (0.20, 1.0, 1.0)  # squash along X -> shallow dome
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.shade_smooth()
dome.data.materials.append(ti_polished)
dome.location = (4.12 * MM, 0, 0)
cap_parts.append(dome)

# ---------------------------------------------------------------- gasket
bpy.ops.mesh.primitive_torus_add(major_radius=2.9 * MM, minor_radius=0.55 * MM,
                                 location=(0, 0, 0), major_segments=64,
                                 minor_segments=24)
gasket = bpy.context.active_object
gasket.name = "crown_gasket_torus"
gasket.data.name = "crown_gasket_torus"
bpy.ops.object.shade_smooth()
gasket.data.materials.append(gasket_mat)
along_x(gasket)
gasket.location = (-0.75 * MM, 0, 0)
gasket_parts.append(gasket)

# ---------------------------------------------------------------- stem
stem = along_x(lib.cylinder("stem_shaft", 0.95 * MM, 5.6 * MM, (0, 0, 0),
                            mat=kit["steel_bare"], verts=48))
stem.location = (-3.4 * MM, 0, 0)
stem_parts.append(stem)
# flat key at the inboard end (torque coupling)
key = lib.box("stem_key", (1.2 * MM, 1.4 * MM, 0.6 * MM),
              (-6.4 * MM, 0, 0), bevel=0.12 * MM, segments=2,
              mat=kit["steel_bare"])
stem_parts.append(key)

# ---------------------------------------------------------------- encoder
# optical encoder spindle: striped micro-drum + dark read rings at both
# ends (IR emitter + photodiodes read stripes ON the spindle — patents)
drum = along_x(lib.cylinder("enc_drum", 1.7 * MM, 2.4 * MM, (0, 0, 0),
                            mat=drum_white, verts=64))
drum.location = (-8.0 * MM, 0, 0)
enc_parts.append(drum)
for i, ex in enumerate((-9.35, -6.65)):
    ring = along_x(lib.cylinder(f"enc_ring_{i}", 1.78 * MM, 0.30 * MM,
                                (0, 0, 0), mat=stripe_ink, verts=64))
    ring.location = (ex * MM, 0, 0)
    enc_parts.append(ring)
# 24 printed stripes around the drum (geometry, not texture — survives GLB)
for i in range(24):
    a = 2 * math.pi * i / 24
    s = lib.box(f"enc_stripe_{i}", (1.9 * MM, 0.22 * MM, 0.035 * MM),
                (0, 0, 0), mat=stripe_ink)
    s.rotation_euler = (a, 0, 0)
    bpy.ops.object.select_all(action="DESELECT")
    s.select_set(True)
    bpy.context.view_layer.objects.active = s
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    s.location = (-8.0 * MM, -1.72 * MM * math.sin(a), 1.72 * MM * math.cos(a))
    enc_parts.append(s)

# ---------------------------------------------------------------- bracket
# L-shaped stamped-steel retainer under the encoder
b1 = lib.box("bracket_web", (4.6 * MM, 4.6 * MM, 0.25 * MM),
             (-8.0 * MM, 0, -2.6 * MM), bevel=0.08 * MM, segments=2,
             mat=kit["steel_bare"])
b2 = lib.box("bracket_wall", (0.25 * MM, 4.6 * MM, 2.2 * MM),
             (-10.1 * MM, 0, -1.6 * MM), bevel=0.08 * MM, segments=2,
             mat=kit["steel_bare"])
for bx in (-6.6, -9.4):
    hole = along_x(lib.cylinder("bhole", 0.45 * MM, 1.0 * MM, (0, 0, 0)))
    hole.rotation_euler = (0, math.radians(90), 0)
    hole.location = (bx * MM, 1.5 * MM, -2.6 * MM)
    # holes drop through the web plate (drill along Z)
    hole.rotation_euler = (0, 0, 0)
    lib.boolean(b1, hole)
bracket_parts += [b1, b2]
bracket_parts += lib.weld_dots(
    "bracket_weld", [(-7.0 * MM, -1.6 * MM, -2.44 * MM),
                     (-9.0 * MM, -1.6 * MM, -2.44 * MM)],
    r=0.25 * MM, h=0.05 * MM, mat=kit["weld_dark"])

# ------------------------------------------------- instrument rig + renders
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
# rot 0: rim_main + rim_kicker flank the crown axis -> dual knurl glints
# (the council's render-02 jewelry beat)
lib.instrument_world(scene, HDR, rot_deg=0.0, strength=1.0)

# A: three-quarter hero on the end face — orange ring + knurl glints
cam_a = lib.camera_shot("cam_hero", (0.038, -0.030, 0.020),
                        (0.001, 0, -0.0006), lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "crown_a_hero.png"))

# B: face-on — mirror electrode dome inside the orange ring inside knurl
# no DOF: 42 mm standoff < 85 mm focal = thin-lens degenerate (PROGRESS n.1)
cam_b = lib.camera_shot("cam_face", (0.042, -0.007, 0.006),
                        (0.002, 0, 0), lens=85)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "crown_b_face.png"))

# C: profile — the full coaxial stack: cap / gasket / stem / encoder / bracket
cam_c = lib.camera_shot("cam_stack", (-0.004, -0.062, 0.026),
                        (-0.0025, 0, -0.0006), lens=85, fstop=32.0)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "crown_c_stack.png"))

# D: MACRO — per-tooth knurl glints (focus distance > 40 mm focal length)
lib.macro_key((0.030, -0.030, 0.045), (0.003, -0.003, 0.003), power=0.25)
cam_d = lib.camera_shot("cam_macro", (0.030, -0.028, 0.016),
                        (0.0025, -0.002, 0.0008), lens=40, fstop=11.0,
                        sensor=16)
lib.render_to(scene, cam_d, os.path.join(RENDERS, "crown_d_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "crown.blend"))

root = lib.join(cap_parts, "part_crown_asm")
children = [
    lib.join(gasket_parts, "crown_gasket"),
    lib.join(stem_parts, "crown_stem"),
    lib.join(enc_parts, "crown_encoder"),
    lib.join(bracket_parts, "crown_bracket"),
]
for child in children:
    bpy.ops.object.select_all(action="DESELECT")
    child.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
lib.export_glb([root] + children, os.path.join(GLB, "part_crown_asm.glb"))
print("[done] crown build complete")
