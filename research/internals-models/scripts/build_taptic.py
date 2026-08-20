"""A2 internals — part_taptic (Ultra Taptic Engine, 9.8 g linear actuator).

Ref: research/INTERNALS-REF.md §3 + iFixit module photos.
~28 x 12 x 6 mm sealed drawn-stainless shell, opened with a 45° section cut
(REF technique note) revealing: copper voice coil wound around a steel core,
tungsten counterweight frame (child node `taptic_mass` — the P3 tick-back
animatable), leaf springs at both ends, magnet stack beneath, kapton patch.

Run: Blender -b -P build_taptic.py
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
# winding advances along the core's long axis (X) on this part
copper_x = lib.copper_coil_mat(winding_axis="X", pitch=0.00014)

shell_parts = []   # joined into part_taptic
mass_parts = []    # joined into taptic_mass (child, animatable)

# ---------------------------------------------------------------- shell
steel_shell = lib.steel_satin_mat("steel_shell", rough=0.42, color="#B4B6B8",
                                  streaks=True)
shell = lib.box("shell", (28 * MM, 12 * MM, 6 * MM), (0, 0, 3 * MM),
                bevel=2.0 * MM, segments=6, mat=steel_shell)
cavity = lib.box("cavity", (27.3 * MM, 11.3 * MM, 5.3 * MM), (0, 0, 3 * MM),
                 bevel=1.7 * MM, segments=6)
lib.boolean(shell, cavity)

# 45° section cut: remove the front-top wedge (plane y + z = 8.0 mm)
# cube center on the plane normal: (cy+cz) = 8.0 + 20/sqrt(2) -> cy=cz=11.07
wedge = lib.box("wedge", (34 * MM, 20 * MM, 20 * MM),
                (0, 11.07 * MM, 11.07 * MM))
wedge.rotation_euler = (math.radians(45), 0, 0)
lib.boolean(shell, wedge, keep_cutter=True)
shell_parts.append(shell)

# ---------------------------------------------------------------- interior statics
base = lib.box("base_plate", (26.5 * MM, 10.6 * MM, 0.5 * MM),
               (0, 0, 0.6 * MM), bevel=0.15 * MM, segments=2,
               mat=kit["steel_bare"])
shell_parts.append(base)

for i, mx in enumerate((-3.5, 3.5)):
    mag = lib.box(f"magnet_{i}", (4.5 * MM, 7.5 * MM, 0.35 * MM),
                  (mx * MM, 0, 1.02 * MM), bevel=0.1 * MM, segments=2,
                  mat=kit["magnet_dark"])
    shell_parts.append(mag)

core = lib.box("core_plate", (13 * MM, 4.8 * MM, 0.8 * MM), (0, 0, 3 * MM),
               bevel=0.2 * MM, segments=2, mat=kit["steel_bare"])
shell_parts.append(core)

# copper voice coil: ring wound around the core, turns advance along X
coil = lib.box("coil", (6 * MM, 6.6 * MM, 3.6 * MM), (0, 0, 3 * MM),
               bevel=1.2 * MM, segments=5, mat=copper_x)
coil_hole = lib.box("coil_hole", (7 * MM, 5.0 * MM, 0.95 * MM), (0, 0, 3 * MM))
lib.boolean(coil, coil_hole)
shell_parts.append(coil)

# kapton insulator patch on the inner back wall
patch = lib.box("kapton_patch", (6 * MM, 0.12 * MM, 3 * MM),
                (2 * MM, -5.5 * MM, 2.4 * MM), mat=kit["kapton"])
shell_parts.append(patch)

# ---------------------------------------------------------------- taptic_mass
# tungsten counterweight carriage: two end blocks + two side rails
for i, bx in enumerate((-9.8, 9.8)):
    blk = lib.box(f"mass_block_{i}", (4.6 * MM, 9.2 * MM, 3.8 * MM),
                  (bx * MM, 0, 3 * MM), bevel=0.7 * MM, segments=4,
                  mat=kit["tungsten"])
    mass_parts.append(blk)
for i, ry in enumerate((-4.05, 4.05)):
    rail = lib.box(f"mass_rail_{i}", (17 * MM, 1.3 * MM, 1.8 * MM),
                   (0, ry * MM, 2.8 * MM), bevel=0.4 * MM, segments=3,
                   mat=kit["tungsten"])
    mass_parts.append(rail)

# leaf springs: compressed S between mass blocks and shell end walls
for sx in (1, -1):
    pts = [(12.1, 0.0), (12.4, 2.6), (12.8, -2.6), (13.2, 0.0)]
    pts = [(sx * x * MM, y * MM) for x, y in pts]
    spring = lib.s_curve_ribbon(f"spring_{'r' if sx > 0 else 'l'}", pts,
                                half_width=1.4 * MM, thickness=0.12 * MM,
                                mat=kit["blued_spring"])
    spring.location = (0, 0, 3 * MM)
    shell_parts.append(spring)

# ---------------------------------------------------------------- flex tail
flex = lib.s_curve_ribbon(
    "flex_tail", [(-14.0 * MM, 1.2 * MM), (-16.2 * MM, 2.4 * MM),
                  (-18.2 * MM, 0.8 * MM), (-20.2 * MM, 1.4 * MM)],
    half_width=1.6 * MM, thickness=0.12 * MM, mat=kit["kapton"])
flex.rotation_euler = (math.radians(90), 0, 0)
flex.location = (0, 2.5 * MM, 0)
conn = lib.box("conn", (2.6 * MM, 3.6 * MM, 1.1 * MM),
               (-21.0 * MM, 2.5 * MM, 0.55 * MM), bevel=0.2 * MM, segments=2,
               mat=kit["resin_black"])
shell_parts += [flex, conn]

# ---------------------------------------------------------------- markings
etch = lib.text_mesh("etch_main", "TAPTIC ENGINE", 1.0 * MM,
                     (0, 6.02 * MM, 1.30 * MM),
                     rot=(math.radians(90), 0, math.radians(180)),
                     mat=kit["etch_dark"], extrude=0.01 * MM, align="CENTER")
etch2 = lib.text_mesh("etch_pn", "FG551251 · 9.8 g", 0.55 * MM,
                      (0, 6.02 * MM, 0.62 * MM),
                      rot=(math.radians(90), 0, math.radians(180)),
                      mat=kit["etch_dark"], extrude=0.01 * MM, align="CENTER")
shell_parts += [etch, etch2]

# spot-weld row along the front-bottom seam
welds = []
for i, wx in enumerate((-11, -8, 8, 11)):
    w = lib.cylinder(f"seam_weld_{i}", 0.28 * MM, 0.06 * MM,
                     (wx * MM, 6.0 * MM, 0.28 * MM),
                     rot=(math.radians(90), 0, 0),
                     mat=kit["weld_dark"], verts=20)
    welds.append(w)
shell_parts += welds

# ---------------------------------------------------------------- section-cut the mass
# the 45° plane passes through the tungsten blocks — the cut face on solid
# tungsten is the "dense metal" beat; apply the same wedge to the mass
for blk in mass_parts[:2]:
    lib.boolean(blk, wedge, keep_cutter=True)
bpy.data.objects.remove(wedge, do_unlink=True)

# ---------------------------------------------------------------- bake coil
img = lib.bake_normal(coil, "taptic_coil_nrm", 1024,
                      os.path.join(TEX, "taptic_coil_nrm.png"))
lib.rewire_baked_normal(copper_x, img)

# ---------------------------------------------------------------- studio + renders
lib.studio(kit, floor_z=0.0)
# interior light: rakes into the 45° window from overhead-front
lib.macro_key((0.015, 0.045, 0.100), (0, 0, 3 * MM), power=0.5, size=0.10)

# A: three-quarter hero into the cutaway
cam_a = lib.camera_shot("cam_hero", (0.040, 0.045, 0.052), (0, 0, 0.0025),
                        lens=85, fstop=16.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "taptic_a_hero.png"))

# B: top-down — shell top, cut edge, coil through the window
cam_b = lib.camera_shot("cam_top", (0.004, 0.018, 0.135), (0, 0.001, 0.003),
                        lens=85, fstop=13.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "taptic_b_top.png"))

# C: MACRO — copper winding + tungsten cut face + spring end
cam_c = lib.camera_shot("cam_macro", (0.026, 0.030, 0.024),
                        (0.006, 0.0005, 0.0032), lens=40, fstop=11.0,
                        sensor=16)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "taptic_c_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "taptic.blend"))

taptic = lib.join(shell_parts, "part_taptic")
mass = lib.join(mass_parts, "taptic_mass")
# parent (keep transform) so the GLB carries part_taptic > taptic_mass
bpy.ops.object.select_all(action="DESELECT")
mass.select_set(True)
taptic.select_set(True)
bpy.context.view_layer.objects.active = taptic
bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
lib.export_glb([taptic, mass], os.path.join(GLB, "part_taptic.glb"))
print("[done] taptic build complete")
