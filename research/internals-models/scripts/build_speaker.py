"""A2 internals — part_speaker (Ultra dual-driver speaker module).

Ref: research/INTERNALS-REF.md §6 — flat oblong cassette with a racetrack
perimeter, black elastomer O-ring tracing the outline (the water seal:
"the speaker is also the pump"), ported face with steel-mesh inserts
(grille as baked normal — the holes NEVER silhouette, REF's preferred
route for the realtime GLB), spring-contact pads instead of a connector.

~22 x 8 x 4 mm, glass-filled black polymer body, seated against the left
case wall behind the machined exterior slots.

GLB: part_speaker (single node).

Run: Blender -b --factory-startup -P build_speaker.py
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
L, W, H = 22 * MM, 8 * MM, 4 * MM   # cassette envelope
R = W / 2                            # racetrack end radius

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

# ---------------------------------------------------------------- materials
# glass-filled polymer: matte, faint glass-fiber speckle in the roughness
polymer = lib.simple_mat("polymer_gf", "#121315", 0.0, 0.55)
nt = polymer.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
tc = nt.nodes.new("ShaderNodeTexCoord")
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 5200.0
noise.inputs["Detail"].default_value = 3.0
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.58, 0.58, 0.58, 1)
ramp.color_ramp.elements[1].color = (0.74, 0.74, 0.74, 1)
nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.05
bump.inputs["Distance"].default_value = 0.00002
nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
# tame the dielectric sheen — the broad env otherwise lifts black polymer
# to space-grey (same grazing-lift class as PROGRESS technique note 8)
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.32

oring_mat = lib.simple_mat("oring_epdm", "#101112", 0.0, 0.9)

# steel mesh insert: woven-wire normal (two crossed gratings), baked below
mesh_mat = lib.simple_mat("grille_mesh", "#33363A", 1.0, 0.45)
nt = mesh_mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
tc = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
weave_add = nt.nodes.new("ShaderNodeMath")
weave_add.operation = "ADD"
for idx, axis in enumerate(("X", "Y")):
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 2.0 * math.pi / 0.00022  # 0.22 mm weave
    nt.links.new(sep.outputs[axis], mul.inputs[0])
    sin = nt.nodes.new("ShaderNodeMath")
    sin.operation = "SINE"
    nt.links.new(mul.outputs[0], sin.inputs[0])
    nt.links.new(sin.outputs[0], weave_add.inputs[idx])
wbump = nt.nodes.new("ShaderNodeBump")
wbump.inputs["Strength"].default_value = 0.5
wbump.inputs["Distance"].default_value = 0.00003
nt.links.new(weave_add.outputs[0], wbump.inputs["Height"])
nt.links.new(wbump.outputs["Normal"], bsdf.inputs["Normal"])

parts = []


# ---------------------------------------------------------------- racetrack
def racetrack(half_len, half_wid, n=120):
    """Closed CCW racetrack: straights ±y, semicircle ends, centered."""
    cx = half_len - half_wid  # arc center offset
    pts = []
    arc = n // 2
    for i in range(arc + 1):   # right end: -90° -> +90°
        a = -math.pi / 2 + math.pi * i / arc
        pts.append((cx + half_wid * math.cos(a), half_wid * math.sin(a)))
    for i in range(arc + 1):   # left end: +90° -> +270°
        a = math.pi / 2 + math.pi * i / arc
        pts.append((-cx + half_wid * math.cos(a), half_wid * math.sin(a)))
    return pts


body = lib.prism_from_profile("body", racetrack(L / 2, W / 2), H, z0=0.0,
                              mat=polymer, edge_bevel=0.5 * MM,
                              bevel_segments=4)
parts.append(body)

# ---------------------------------------------------------------- O-ring
# the water seal traces the same racetrack (shared curve = free precision)
ring_pts = racetrack(L / 2 + 0.3 * MM, W / 2 + 0.3 * MM, 120)
curve = bpy.data.curves.new("oring_path", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 0.5 * MM
curve.bevel_resolution = 8
spline = curve.splines.new("POLY")
spline.points.add(len(ring_pts) - 1)
for p, (x, y) in zip(spline.points, ring_pts):
    p.co = (x, y, 0, 1)
spline.use_cyclic_u = True
oring = bpy.data.objects.new("oring", curve)
bpy.context.collection.objects.link(oring)
oring.location = (0, 0, 2.5 * MM)   # seal bulges proud below the lid bevel
bpy.ops.object.select_all(action="DESELECT")
oring.select_set(True)
bpy.context.view_layer.objects.active = oring
bpy.ops.object.convert(target="MESH")
oring = bpy.context.active_object
bpy.ops.object.shade_smooth()
oring.data.materials.append(oring_mat)
parts.append(oring)

# ---------------------------------------------------------------- ports
# two racetrack port recesses (shallow — they never silhouette), floored
# with the woven-steel mesh inserts
inserts = []
for i, px in enumerate((-4.6 * MM, 4.6 * MM)):
    # cutter spans H-0.5 .. H+0.5 -> a real 0.5 mm recess
    cutter = lib.box(f"port_cut_{i}", (7.4 * MM, 3.4 * MM, 1.0 * MM),
                     (px, 0, H), bevel=1.2 * MM, segments=6)
    lib.boolean(body, cutter)
    ins = lib.box(f"mesh_insert_{i}", (7.0 * MM, 3.0 * MM, 0.15 * MM),
                  (px, 0, H - 0.30 * MM), bevel=0.9 * MM, segments=4,
                  mat=mesh_mat)
    inserts.append(ins)
parts += inserts
# booleans shred the smoothing groups — re-split by angle
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
try:
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
except Exception:
    bpy.ops.object.shade_smooth()

# ---------------------------------------------------------------- contacts
# three gold spring-contact pads on the end wall (+X), short kapton flex
for i, py in enumerate((-2.0 * MM, 0.0, 2.0 * MM)):
    pad = lib.box(f"contact_pad_{i}", (0.25 * MM, 1.1 * MM, 1.6 * MM),
                  (L / 2 + 0.05 * MM, py, 1.6 * MM), bevel=0.08 * MM,
                  segments=2, mat=kit["brass_enig"])
    parts.append(pad)
flex = lib.s_curve_ribbon(
    "spk_flex", [(9.5 * MM, 0.4 * MM), (10.6 * MM, -0.3 * MM),
                 (11.4 * MM, 0.2 * MM)],
    half_width=2.4 * MM, thickness=0.06 * MM, mat=kit["kapton"])
flex.rotation_euler = (math.radians(90), 0, 0)
flex.location = (0, 0, 0.5 * MM)
parts.append(flex)

# ---------------------------------------------------------------- markings
etch = lib.text_mesh("spk_etch", "FG1088 · 86 dB", 0.55 * MM,
                     (-5.2 * MM, -3.55 * MM, H + 0.02 * MM),
                     mat=kit["silkscreen"], extrude=0.012 * MM)
parts.append(etch)
# mold ejector-pin marks (two faint discs — the polymer tell)
parts += lib.weld_dots("ejector",
                       [(-8.5 * MM, 2.2 * MM, H + 0.006 * MM),
                        (8.5 * MM, -2.2 * MM, H + 0.006 * MM)],
                       r=0.5 * MM, h=0.012 * MM, mat=polymer)

# ---------------------------------------------------------------- bake mesh
# the weave must survive the GLB: bake the inserts' shading normal
mesh_join = lib.join(inserts, "mesh_inserts")
parts = [p for p in parts if p not in inserts] + [mesh_join]
img = lib.bake_normal(mesh_join, "spk_mesh_nrm", 1024,
                      os.path.join(TEX, "spk_mesh_nrm.png"))
lib.rewire_baked_normal(mesh_mat, img)

# ------------------------------------------------- instrument rig + renders
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
lib.instrument_world(scene, HDR, rot_deg=115.0, strength=1.0)
lib.macro_key((0.020, -0.030, 0.070), (0, 0, 0.003), power=0.35)

# A: three-quarter hero — O-ring + ported face + polymer speckle
cam_a = lib.camera_shot("cam_hero", (0.034, -0.040, 0.030), (0, 0, 0.0015),
                        lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "speaker_a_hero.png"))

# B: top oblique — both mesh ports + the seal tracing the racetrack
cam_b = lib.camera_shot("cam_top", (0.004, -0.048, 0.066), (0, 0, 0.002),
                        lens=85, fstop=11.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "speaker_b_top.png"))

# C: end-on — gold spring pads + kapton flex + O-ring cross-section read.
# No DOF: 62 mm standoff < 85 mm focal = thin-lens degenerate (PROGRESS n.1)
cam_c = lib.camera_shot("cam_end", (0.062, -0.030, 0.014),
                        (0.0095, 0, 0.0018), lens=85)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "speaker_c_end.png"))

# D: MACRO — woven mesh + O-ring softness (focus dist > 40 mm focal)
cam_d = lib.camera_shot("cam_macro", (0.020, -0.032, 0.024),
                        (-0.0046, -0.0004, 0.0038), lens=40, fstop=16.0,
                        sensor=16)
lib.render_to(scene, cam_d, os.path.join(RENDERS, "speaker_d_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "speaker.blend"))

speaker = lib.join(parts, "part_speaker")
lib.export_glb([speaker], os.path.join(GLB, "part_speaker.glb"))
print("[done] speaker build complete")
