"""A2 internals — part_sensor_array (back-crystal sensor array, Ultra 3).

THE FLAGSHIP (REF §7, difficulty 4/5): the only radial mandala in a
rectangular product, the Nocturne organ (1 Hz heart sensor), and the
exploded view's final layer.

OUTSIDE face (+Z): dark ceramic disc -> engraved spec ring (DIVE 40M /
WR 100M / EN13319, tangential like the bezel numerals) -> sapphire dome
-> 4 LED wells + 4 photodiode windows in an X arrangement under lens
bosses with the iFixit "bubbly" diffusion coating -> depth-gauge port
(the diver-instrument detail).

INSIDE face (−Z): segmented dark blue-grey foam tiles (Ultra 2's
substantial ring), ONE TILE PEELED at rest — the authored cutaway beat —
revealing an arc of the wireless-charging coil (the second copper beat,
rhyming with the Taptic coil). Central shield can + copper jumper wires,
gold contact pads, band-release cutouts, P5 screw holes.

Emissive contract (Nocturne 1 Hz): materials `led_green` (#30D158) and
`led_red` (#FF453A) carry the emission — the web runtime pulses
emissiveIntensity BY MATERIAL NAME, no re-bake needed.

GLB: part_sensor_array > child sensor_foam_peel (hinge origin at its
outer arc — P3 can close/animate the peel; rest pose = peeled).

Run: Blender -b --factory-startup -P build_sensor.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Matrix  # noqa: E402
import internals_lib as lib  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
RENDERS = os.path.join(ROOT, "renders")
GLB = os.path.join(ROOT, "glb")
TEX = os.path.join(ROOT, "textures")
for d in (RENDERS, GLB, TEX):
    os.makedirs(d, exist_ok=True)

MM = 0.001
R_PLATE = 18.0 * MM      # Ø36 disc
PLATE_T = 2.0 * MM

lib.clear_scene()
scene = bpy.context.scene
lib.setup_cycles(scene, samples=64)
kit = lib.material_kit()

# ---------------------------------------------------------------- materials
# LOOKBIBLE §1.3 back set (offline grades of the shipped web values)
# satin, not chrome: the web value (rough .24, coat .7) reads liquid-silver
# at grazing under the 6 m streak formers — offline grade steps rougher
ceramic = lib.simple_mat("back_ceramic", "#121316", 0.0, 0.34)
_b = next(n for n in ceramic.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Coat Weight"].default_value = 0.35
_b.inputs["Coat Roughness"].default_value = 0.22
if "Specular IOR Level" in _b.inputs:
    _b.inputs["Specular IOR Level"].default_value = 0.4

lens_dark = lib.simple_mat("back_lens", "#08090b", 0.0, 0.06)
_b = next(n for n in lens_dark.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Coat Weight"].default_value = 1.0
_b.inputs["Coat Roughness"].default_value = 0.02

ring_etch = lib.simple_mat("ring_etch", "#d5d3cf", 0.3, 0.3)
trim = lib.simple_mat("sensor_trim", "#9fa0a3", 0.3, 0.35)

# sapphire dome — transmission for Cycles beauty (web = alpha route)
dome_glass = lib.simple_mat("dome_sapphire", "#F2F6F4", 0.0, 0.02)
_b = next(n for n in dome_glass.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Transmission Weight"].default_value = 1.0
_b.inputs["IOR"].default_value = 1.77

# lens bosses: frosted — the 240x "bubbly" diffusion coating as micro-normal
boss_mat = lib.simple_mat("lens_boss", "#F4F7F5", 0.0, 0.12)
nt = boss_mat.node_tree
_b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Transmission Weight"].default_value = 1.0
_b.inputs["IOR"].default_value = 1.5
tc = nt.nodes.new("ShaderNodeTexCoord")
bub = nt.nodes.new("ShaderNodeTexNoise")
bub.inputs["Scale"].default_value = 9000.0
bub.inputs["Detail"].default_value = 3.0
bmp = nt.nodes.new("ShaderNodeBump")
bmp.inputs["Strength"].default_value = 0.35
bmp.inputs["Distance"].default_value = 0.00002
nt.links.new(tc.outputs["Object"], bub.inputs["Vector"])
nt.links.new(bub.outputs["Fac"], bmp.inputs["Height"])
nt.links.new(bmp.outputs["Normal"], _b.inputs["Normal"])

# 1 Hz emissive wells — the Nocturne pulse targets, BY NAME
led_green = lib.simple_mat("led_green", "#0B140E", 0.0, 0.3)
_b = next(n for n in led_green.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Emission Color"].default_value = lib.hexc("#30D158")
_b.inputs["Emission Strength"].default_value = 2.5
led_red = lib.simple_mat("led_red", "#160707", 0.0, 0.3)
_b = next(n for n in led_red.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
_b.inputs["Emission Color"].default_value = lib.hexc("#FF453A")
_b.inputs["Emission Strength"].default_value = 2.0


def foam_material(name):
    m = lib.simple_mat(name, "#48505C", 0.0, 0.95)
    ntf = m.node_tree
    bf = next(n for n in ntf.nodes if n.type == "BSDF_PRINCIPLED")
    tcf = ntf.nodes.new("ShaderNodeTexCoord")
    nz = ntf.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2600.0
    nz.inputs["Detail"].default_value = 6.0
    nz.inputs["Roughness"].default_value = 0.7
    bpf = ntf.nodes.new("ShaderNodeBump")
    bpf.inputs["Strength"].default_value = 0.8
    bpf.inputs["Distance"].default_value = 0.0001
    ntf.links.new(tcf.outputs["Object"], nz.inputs["Vector"])
    ntf.links.new(nz.outputs["Fac"], bpf.inputs["Height"])
    ntf.links.new(bpf.outputs["Normal"], bf.inputs["Normal"])
    return m


foam_main_mat = foam_material("foam_tile")
foam_peel_mat = foam_material("foam_tile_peel")
white_carrier = lib.simple_mat("carrier_white", "#DDDEE0", 0.0, 0.5)

parts = []       # -> part_sensor_array

# ---------------------------------------------------------------- plate
plate = lib.cylinder("plate", R_PLATE, PLATE_T, (0, 0, PLATE_T / 2),
                     mat=ceramic, verts=256)
m = plate.modifiers.new("bev", "BEVEL")
m.width = 0.5 * MM
m.segments = 4
m.limit_method = "ANGLE"
m.angle_limit = math.radians(40)
bpy.context.view_layer.objects.active = plate
bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
parts.append(plate)

# raised concentric ring band (r 12.5–16.5) — the engraved text ring zone
band = lib.cylinder("ring_band", 16.5 * MM, 0.3 * MM,
                    (0, 0, PLATE_T + 0.05 * MM), mat=ceramic, verts=256)
band_hole = lib.cylinder("band_hole", 12.5 * MM, 1.0 * MM,
                         (0, 0, PLATE_T + 0.05 * MM))
lib.boolean(band, band_hole)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
parts.append(band)

# engraved spec ring — tangential strings (dial-law: instrument-honest)
for label, ang_deg in (("DIVE 40M", 90), ("WR 100M", 210),
                       ("EN13319", 330), ("49MM · TITANIUM", 30),
                       ("ONE HERTZ", 150), ("GPS · L1 + L5", 270)):
    a = math.radians(ang_deg)
    t = lib.text_mesh(f"ring_txt_{ang_deg}", label, 1.0 * MM,
                      (14.35 * MM * math.cos(a), 14.35 * MM * math.sin(a),
                       PLATE_T + 0.21 * MM),
                      rot=(0, 0, a - math.pi / 2), mat=ring_etch,
                      extrude=0.012 * MM, align="CENTER")
    parts.append(t)

# ---------------------------------------------------------------- optics
# lens deck: dark glossy disc under the dome
deck = lib.cylinder("lens_deck", 10.0 * MM, 0.7 * MM,
                    (0, 0, PLATE_T + 0.35 * MM), mat=lens_dark, verts=192)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
parts.append(deck)
DECK_Z = PLATE_T + 0.7 * MM     # 2.7 mm — deck top

# sensor wells ON the deck, X arrangement (REF: 4 LED + 4 photodiode):
# LEDs at 45/135/225/315, photodiodes at 0/90/180/270, center window
WELL_R = 5.8 * MM
for i in range(4):
    a = math.radians(45 + i * 90)
    mat_i = led_green if i % 2 == 0 else led_red
    well = lib.cylinder(f"led_well_{i}", 1.2 * MM, 0.15 * MM,
                        (WELL_R * math.cos(a), WELL_R * math.sin(a),
                         DECK_Z + 0.02 * MM), mat=mat_i, verts=48)
    ring = lib.cylinder(f"led_ring_{i}", 1.45 * MM, 0.10 * MM,
                        (WELL_R * math.cos(a), WELL_R * math.sin(a),
                         DECK_Z + 0.01 * MM), mat=trim, verts=48)
    rhole = lib.cylinder(f"led_rhole_{i}", 1.22 * MM, 0.5 * MM,
                         (WELL_R * math.cos(a), WELL_R * math.sin(a),
                          DECK_Z))
    lib.boolean(ring, rhole)
    parts += [well, ring]
for i in range(4):
    a = math.radians(i * 90)
    pd = lib.cylinder(f"pd_win_{i}", 1.3 * MM, 0.10 * MM,
                      (WELL_R * math.cos(a), WELL_R * math.sin(a),
                       DECK_Z + 0.01 * MM), mat=lens_dark, verts=48)
    pring = lib.cylinder(f"pd_ring_{i}", 1.5 * MM, 0.08 * MM,
                         (WELL_R * math.cos(a), WELL_R * math.sin(a),
                          DECK_Z + 0.005 * MM), mat=trim, verts=48)
    phole = lib.cylinder(f"pd_rhole_{i}", 1.32 * MM, 0.5 * MM,
                         (WELL_R * math.cos(a), WELL_R * math.sin(a),
                          DECK_Z))
    lib.boolean(pring, phole)
    parts += [pd, pring]
center_win = lib.cylinder("center_win", 1.6 * MM, 0.10 * MM,
                          (0, 0, DECK_Z + 0.01 * MM), mat=lens_dark, verts=64)
center_ring = lib.cylinder("center_ring", 1.85 * MM, 0.08 * MM,
                           (0, 0, DECK_Z + 0.005 * MM), mat=trim, verts=64)
c_hole = lib.cylinder("center_rhole", 1.62 * MM, 0.5 * MM, (0, 0, DECK_Z))
lib.boolean(center_ring, c_hole)
parts += [center_win, center_ring]

# lens bosses: convex frosted caps riding the dome curvature
DOME_R, DOME_H = 9.9 * MM, 1.35 * MM   # squashed-sphere cap
bosses = []
for i in range(8):
    a = math.radians(i * 45)
    zb = DECK_Z + DOME_H * math.sqrt(max(0.0, 1 - (WELL_R / DOME_R) ** 2)) \
        - 0.25 * MM
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=1.75 * MM, segments=48, ring_count=24,
        location=(WELL_R * math.cos(a), WELL_R * math.sin(a), zb))
    boss = bpy.context.active_object
    boss.name = f"lens_boss_{i}"
    boss.data.name = boss.name
    boss.scale = (1, 1, 0.42)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    boss.data.materials.append(boss_mat)
    bosses.append(boss)
parts += bosses

# sapphire dome over everything
bpy.ops.mesh.primitive_uv_sphere_add(radius=DOME_R, segments=128,
                                     ring_count=64, location=(0, 0, DECK_Z))
dome = bpy.context.active_object
dome.name = "dome"
dome.data.name = "dome"
dome.scale = (1, 1, DOME_H / DOME_R)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
# keep only the upper cap (the lower half hides inside the deck anyway,
# but transmission through a closed shell renders cleaner)
bpy.ops.object.shade_smooth()
dome.data.materials.append(dome_glass)
parts.append(dome)

# depth-gauge port — tiny gasketed aperture on the outer flat (diver detail)
a = math.radians(195)
px, py = 17.2 * MM * math.cos(a), 17.2 * MM * math.sin(a)
port_cut = lib.cylinder("port_cut", 0.65 * MM, 1.0 * MM,
                        (px, py, PLATE_T))
lib.boolean(plate, port_cut, keep_cutter=True)
port_cut.location = (px, py, PLATE_T - 0.4 * MM)
lib.boolean(band, port_cut)  # ensure clean if overlapping; harmless else
bpy.ops.mesh.primitive_torus_add(major_radius=0.72 * MM,
                                 minor_radius=0.14 * MM,
                                 location=(px, py, PLATE_T - 0.02 * MM),
                                 major_segments=48, minor_segments=16)
pg = bpy.context.active_object
pg.name = "port_gasket"
pg.data.name = "port_gasket"
bpy.ops.object.shade_smooth()
pg.data.materials.append(lib.simple_mat("port_epdm", "#0E0F10", 0.0, 0.9))
port_win = lib.cylinder("port_win", 0.5 * MM, 0.1 * MM,
                        (px, py, PLATE_T - 0.35 * MM), mat=lens_dark,
                        verts=32)
parts += [pg, port_win]

# ---------------------------------------------------------------- inside face
# band-release cutouts (oblong, top/bottom) — recessed into the plate
release_cutters = []
for sy in (-1, 1):
    rc = lib.box(f"release_cut_{sy}", (7.0 * MM, 2.4 * MM, 2.0 * MM),
                 (0, sy * 13.6 * MM, -0.4 * MM), bevel=1.0 * MM, segments=5)
    lib.boolean(plate, rc, keep_cutter=True)
    release_cutters.append(rc)

# P5 screw holes + bright washer seats (4, diagonal)
for i in range(4):
    a = math.radians(45 + i * 90)
    hx, hy = 16.8 * MM * math.cos(a), 16.8 * MM * math.sin(a)
    hole = lib.cylinder(f"screw_hole_{i}", 0.5 * MM, 6 * MM, (hx, hy, 1 * MM))
    lib.boolean(plate, hole)
    seat = lib.cylinder(f"screw_seat_{i}", 0.85 * MM, 0.08 * MM,
                        (hx, hy, -0.04 * MM), mat=kit["steel_bare"], verts=32)
    s_hole = lib.cylinder(f"seat_hole_{i}", 0.52 * MM, 0.5 * MM,
                          (hx, hy, -0.04 * MM))
    lib.boolean(seat, s_hole)
    parts.append(seat)

# central sensor stack: shield can + white carrier + kapton patch
can = lib.cylinder("shield_can", 4.5 * MM, 1.3 * MM, (0, 0, -0.65 * MM),
                   mat=kit["steel_bare"], verts=96)
carrier = lib.cylinder("carrier", 5.5 * MM, 0.45 * MM, (0, 0, -0.225 * MM),
                       mat=white_carrier, verts=96)
car_hole = lib.cylinder("car_hole", 4.55 * MM, 1.0 * MM, (0, 0, -0.225 * MM))
lib.boolean(carrier, car_hole)
kpatch = lib.box("can_kapton", (3.2 * MM, 2.2 * MM, 0.05 * MM),
                 (1.2 * MM, -1.0 * MM, -1.33 * MM), mat=kit["kapton"])
parts += [can, carrier, kpatch]

# copper jumper wires: shield can rim -> gold pads (fine hand-soldered read)
wire_mat = lib.simple_mat("copper_wire", "#C97E4F", 1.0, 0.25)
for ang_deg in (185, 205, 225):
    a = math.radians(ang_deg)
    ca, sa = math.cos(a), math.sin(a)
    curve = bpy.data.curves.new(f"wire_{ang_deg}", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.14 * MM
    curve.bevel_resolution = 6
    curve.resolution_u = 24
    sp = curve.splines.new("BEZIER")
    sp.bezier_points.add(2)
    for bp, (rr, zz) in zip(sp.bezier_points,
                            ((4.55, -0.9), (7.0, -0.15), (9.3, -0.35))):
        bp.co = (rr * MM * ca, rr * MM * sa, zz * MM)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    w = bpy.data.objects.new(f"wire_{ang_deg}", curve)
    bpy.context.collection.objects.link(w)
    bpy.ops.object.select_all(action="DESELECT")
    w.select_set(True)
    bpy.context.view_layer.objects.active = w
    bpy.ops.object.convert(target="MESH")
    w = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    w.data.materials.append(wire_mat)
    parts.append(w)
    pad = lib.box(f"wire_pad_{ang_deg}", (1.1 * MM, 0.8 * MM, 0.08 * MM),
                  (9.6 * MM * ca, 9.6 * MM * sa, -0.06 * MM),
                  mat=kit["brass_enig"])
    pad.rotation_euler = (0, 0, a)
    parts.append(pad)
# remaining gold contact pads around the rim ring
for ang_deg in (0, 40, 80, 120, 290, 320):
    a = math.radians(ang_deg)
    pad = lib.box(f"rim_pad_{ang_deg}", (1.1 * MM, 0.8 * MM, 0.08 * MM),
                  (9.6 * MM * math.cos(a), 9.6 * MM * math.sin(a),
                   -0.06 * MM), mat=kit["brass_enig"])
    pad.rotation_euler = (0, 0, a)
    parts.append(pad)

# ---------------------------------------------------------------- foam ring
FOAM_R0, FOAM_R1, FOAM_T = 10.8 * MM, 16.4 * MM, 1.2 * MM
GAP_DEG, N_TILES = 4.0, 8
PEEL_INDEX = 1  # sector centered at 67.5°


def annulus_sector(r0, r1, a0, a1, n=28):
    pts = []
    for i in range(n + 1):                       # outer arc, CCW
        a = a0 + (a1 - a0) * i / n
        pts.append((r1 * math.cos(a), r1 * math.sin(a)))
    for i in range(n + 1):                       # inner arc, back
        a = a1 - (a1 - a0) * i / n
        pts.append((r0 * math.cos(a), r0 * math.sin(a)))
    return pts


foam_tiles = []
peel_tile = None
for k in range(N_TILES):
    a0 = math.radians(k * 45 + GAP_DEG / 2)
    a1 = math.radians((k + 1) * 45 - GAP_DEG / 2)
    mat_k = foam_peel_mat if k == PEEL_INDEX else foam_main_mat
    tile = lib.prism_from_profile(f"foam_{k}", annulus_sector(
        FOAM_R0, FOAM_R1, a0, a1), FOAM_T, z0=-FOAM_T,
        mat=mat_k, edge_bevel=0.15 * MM, bevel_segments=2)
    if k == PEEL_INDEX:
        peel_tile = tile
    else:
        foam_tiles.append(tile)

# band-release cutouts pass through the foam exactly as through the plate
for rc in release_cutters:
    for tile in foam_tiles:
        lib.boolean(tile, rc, keep_cutter=True)
for rc in release_cutters:
    bpy.data.objects.remove(rc, do_unlink=True)

# charging-coil arc under the peeled tile (the second copper beat) —
# discrete flattened turns read as individual windings at macro
coil_mat = lib.simple_mat("coil_copper", "#C97E4F", 1.0, 0.22,
                          anisotropic=0.5)
A0, A1 = math.radians(47), math.radians(88)
for i, rr in enumerate((11.6, 12.7, 13.8, 14.9, 16.0)):
    curve = bpy.data.curves.new(f"coil_{i}", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.5 * MM
    curve.bevel_resolution = 6
    sp = curve.splines.new("POLY")
    n = 40
    sp.points.add(n)
    for j in range(n + 1):
        a = A0 + (A1 - A0) * j / n
        sp.points[j].co = (rr * MM * math.cos(a), rr * MM * math.sin(a),
                           0, 1)
    c = bpy.data.objects.new(f"coil_{i}", curve)
    bpy.context.collection.objects.link(c)
    bpy.ops.object.select_all(action="DESELECT")
    c.select_set(True)
    bpy.context.view_layer.objects.active = c
    bpy.ops.object.convert(target="MESH")
    c = bpy.context.active_object
    c.scale = (1, 1, 0.55)                      # flattened ribbon wire
    bpy.ops.object.transform_apply(location=False, rotation=False,
                                   scale=True)
    bpy.ops.object.shade_smooth()
    c.data.materials.append(coil_mat)
    c.location = (0, 0, -0.42 * MM)
    parts.append(c)

# ---------------------------------------------------------------- bakes
# outside optics must survive the GLB: bake boss cluster micro-normal
boss_join = lib.join(bosses, "lens_bosses")
parts = [p for p in parts if p not in bosses] + [boss_join]
img_b = lib.bake_normal(boss_join, "sensor_boss_nrm", 512,
                        os.path.join(TEX, "sensor_boss_nrm.png"))
lib.rewire_baked_normal(boss_mat, img_b)

foam_join = lib.join(foam_tiles, "foam_ring")
img_f = lib.bake_normal(foam_join, "sensor_foam_nrm", 1024,
                        os.path.join(TEX, "sensor_foam_nrm.png"))
lib.rewire_baked_normal(foam_main_mat, img_f)
img_p = lib.bake_normal(peel_tile, "sensor_foam_peel_nrm", 512,
                        os.path.join(TEX, "sensor_foam_peel_nrm.png"))
lib.rewire_baked_normal(foam_peel_mat, img_p)
parts.append(foam_join)

# ---------------------------------------------------------------- peel pose
# hinge origin at the outer-arc midpoint; rest pose = PEELED (the authored
# cutaway state, same language class as the Taptic's 45° open shell)
PEEL_A = math.radians(67.5)
hinge = (FOAM_R1 * math.cos(PEEL_A), FOAM_R1 * math.sin(PEEL_A), -FOAM_T / 2)
peel_tile.data.transform(Matrix.Translation((-hinge[0], -hinge[1],
                                             -hinge[2])))
peel_tile.location = hinge
tangent = (-math.sin(PEEL_A), math.cos(PEEL_A), 0.0)
peel_tile.rotation_mode = "AXIS_ANGLE"
peel_tile.rotation_axis_angle = (math.radians(-72), *tangent)
peel_tile.name = "sensor_foam_peel"
peel_tile.data.name = "sensor_foam_peel"

# ------------------------------------------------- instrument rig + renders
REPO = os.path.abspath(os.path.join(ROOT, "..", ".."))
HDR = os.path.join(REPO, "public", "assets", "looks", "instrument.hdr")
lib.instrument_world(scene, HDR, rot_deg=340.0, strength=1.0)

# A: three-quarter hero — the mandala: dome, bosses, LED glow, spec ring
cam_a = lib.camera_shot("cam_hero", (0.040, -0.050, 0.036), (0, 0, 0.0022),
                        lens=85, fstop=32.0)
lib.render_to(scene, cam_a, os.path.join(RENDERS, "sensor_a_hero.png"))

# B: near-face-on oblique — full radial composition + engraved ring
cam_b = lib.camera_shot("cam_top", (0.008, -0.072, 0.108), (0, 0, 0.002),
                        lens=85, fstop=11.0)
lib.render_to(scene, cam_b, os.path.join(RENDERS, "sensor_b_top.png"))

# C: inside face — foam ring, PEELED TILE + coil arc, shield can, wires.
# Camera below horizon: instrument_world's Light Path split keeps the
# authored gradient behind (the baked HDR's floor card never frames)
# steep from below, near the sector azimuth — past the hanging flap into
# the opened window (the coil is recessed; shallow angles see only flap).
# The inside face points AWAY from every former (all aim high) — it needs
# its own raking key or the copper arc never glints; removed after the shot
inside_key = lib.macro_key((0.030, 0.060, -0.060), (0.004, 0.010, -0.001),
                           power=0.4, size=0.09)
cam_c = lib.camera_shot("cam_inside", (0.024, 0.038, -0.086),
                        (-0.001, 0.001, -0.001), lens=85, fstop=32.0)
lib.render_to(scene, cam_c, os.path.join(RENDERS, "sensor_c_inside.png"))
bpy.data.objects.remove(inside_key, do_unlink=True)

# D: MACRO — lens bosses' bubbly diffusion + green LED well. Key sits at
# an off-specular azimuth (a mirror-direction card reflects as a white
# slab in the glossy deck); focus distance well past the 40 mm focal
lib.macro_key((-0.020, 0.030, 0.048), (0.0041, -0.0041, 0.0032),
              power=0.12, size=0.05)
cam_d = lib.camera_shot("cam_macro", (0.037, -0.033, 0.033),
                        (0.0041, -0.0041, 0.0030), lens=40, fstop=16.0,
                        sensor=16)
lib.render_to(scene, cam_d, os.path.join(RENDERS, "sensor_d_macro.png"))

# ---------------------------------------------------------------- save + export
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "sensor.blend"))

root = lib.join(parts, "part_sensor_array")
bpy.ops.object.select_all(action="DESELECT")
peel_tile.select_set(True)
root.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
lib.export_glb([root, peel_tile], os.path.join(GLB, "part_sensor_array.glb"))
print("[done] sensor array build complete")
