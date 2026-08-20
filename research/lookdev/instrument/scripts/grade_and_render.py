"""LOOK B "INSTRUMENT LIGHT" — material grade + 8 canonical evidence renders.

Imports the contract-named draft GLB, re-authors the PBR materials (natural Ti
+ sapphire IOR 1.77 + all four catalogued USDZ defects), lights the scene with
the BAKED instrument.hdr (the same file the web app fetches — the render set
proves the environment, not a stand-in rig), and renders the 8 canonical
frames at 1280px / Cycles 128spp / OIDN.

Run:  Blender -b --factory-startup -P grade_and_render.py
"""

import math
import os

import bpy
from mathutils import Vector

REPO = "/Users/simon/engineer/one-hertz"
GLB = REPO + "/research/asset-qa/ultra-3-draft.glb"
HDR = REPO + "/public/assets/looks/instrument.hdr"
OUT = REPO + "/research/lookdev/instrument/"

# ----------------------------------------------------------------- helpers
def srgb_to_linear(c):
    return tuple(
        ch / 12.92 if ch <= 0.04045 else ((ch + 0.055) / 1.055) ** 2.4 for ch in c
    )


def hex_lin(h):
    h = h.lstrip("#")
    return srgb_to_linear(tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))) + (1.0,)


def principled(mat):
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            return n
    return None


def grade(
    name,
    color=None,
    metallic=None,
    rough=None,
    aniso=None,
    aniso_rot=None,
    coat=None,
    coat_rough=None,
    transmission=None,
    ior=None,
    sheen=None,
    alpha=None,
    unlink_base=False,
    strip_normal=False,
):
    mat = bpy.data.materials.get(name)
    if mat is None or not mat.use_nodes:
        print("  !! material missing:", name)
        return
    p = principled(mat)
    if p is None:
        print("  !! no principled:", name)
        return
    nt = mat.node_tree
    if unlink_base:
        for l in list(nt.links):
            if l.to_node == p and l.to_socket.name == "Base Color":
                nt.links.remove(l)
    if strip_normal:
        for l in list(nt.links):
            if l.to_node == p and l.to_socket.name == "Normal":
                nt.links.remove(l)
    def set_in(sock, val):
        if val is not None and sock in p.inputs:
            p.inputs[sock].default_value = val
    set_in("Base Color", hex_lin(color) if color else None)
    set_in("Metallic", metallic)
    set_in("Roughness", rough)
    set_in("Anisotropic", aniso)
    set_in("Anisotropic Rotation", aniso_rot)
    set_in("Coat Weight", coat)
    set_in("Coat Roughness", coat_rough)
    set_in("Transmission Weight", transmission)
    set_in("IOR", ior)
    set_in("Sheen Weight", sheen)
    set_in("Alpha", alpha)
    mat.blend_method = "OPAQUE" if (alpha is None and transmission is None) else mat.blend_method


def world_bbox(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def subtree(root):
    out = [root]
    for c in root.children:
        out += subtree(c)
    return out


def find(name):
    return bpy.data.objects.get(name)


def meshes_under(name):
    r = find(name)
    return [o for o in subtree(r) if o.type == "MESH"] if r else []


# ------------------------------------------------------------------ import
scene = bpy.context.scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.import_scene.gltf(filepath=GLB)
all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
lo, hi = world_bbox(all_meshes)
center = (lo + hi) / 2
size = hi - lo
print("WATCH bbox (m):", tuple(round(v, 4) for v in size), "center", tuple(round(v, 4) for v in center))

# ---------------------------------------------------------------- case axes
screen_meshes = meshes_under("part_screen") or [o for o in all_meshes if "screen" in o.name.lower()]
sm = screen_meshes[0]
# area-weighted world normal of the screen mesh = dial normal (case z axis)
sm_eval = sm.evaluated_get(bpy.context.evaluated_depsgraph_get())
me = sm_eval.to_mesh()
nrm = Vector((0, 0, 0))
for poly in me.polygons:
    nrm += (sm.matrix_world.to_3x3() @ poly.normal) * poly.area
sm_eval.to_mesh_clear()
z_axis = nrm.normalized()
if z_axis.z < 0:
    z_axis = -z_axis  # dial faces up-ish
up = Vector((0, 0, 1))
y_axis = (up - z_axis * up.dot(z_axis)).normalized()  # dial-12 direction
x_axis = y_axis.cross(z_axis).normalized()  # crown side
slo, shi = world_bbox(screen_meshes)
screen_center = (slo + shi) / 2
print("dial normal:", tuple(round(v, 3) for v in z_axis), "elev deg:", round(math.degrees(math.asin(z_axis.z)), 1))

# ------------------------------------------------------------------- world
world = bpy.data.worlds.new("instrument")
scene.world = world
world.use_nodes = True
wnt = world.node_tree
wnt.nodes.clear()
wout = wnt.nodes.new("ShaderNodeOutputWorld")
wbg = wnt.nodes.new("ShaderNodeBackground")
wenv = wnt.nodes.new("ShaderNodeTexEnvironment")
wenv.image = bpy.data.images.load(HDR)
wnt.links.new(wenv.outputs["Color"], wbg.inputs["Color"])
wbg.inputs["Strength"].default_value = 1.0
wnt.links.new(wbg.outputs["Background"], wout.inputs["Surface"])

# ------------------------------------------------------------------ render cfg
scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.cycles.use_denoising = True
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:  # noqa: BLE001
    print("GPU setup failed:", e)
scene.render.resolution_x = 1280
scene.render.resolution_y = 1280
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.image_settings.file_format = "PNG"

# ---------------------------------------------------------- material grade
NATURAL_TI = dict(metallic=1.0, unlink_base=True)
print("GRADING…")
grade("mat_titanium_case", color="#cfccc6", rough=0.34, aniso=0.35, **NATURAL_TI)
grade("mat_titanium_brushed", color="#d2cfc9", rough=0.30, aniso=0.6, **NATURAL_TI)
grade("mat_titanium_polished", color="#dcdad6", rough=0.10, aniso=0.3, **NATURAL_TI)
grade("mat_titanium_crown", color="#cfccc6", rough=0.32, aniso=0.7, **NATURAL_TI)
grade("mat_crown_knurl", color="#c9c6c0", rough=0.36, aniso=0.5, **NATURAL_TI)
grade("mat_titanium_hardware", color="#c5c2bc", rough=0.42, **NATURAL_TI)
grade("mat_bezel", color="#b9b6b0", rough=0.30, aniso=0.8, aniso_rot=0.25, **NATURAL_TI)
grade("mat_case_top", color="#cfccc6", rough=0.32, aniso=0.35, **NATURAL_TI)
grade("mat_case_ao", rough=0.34, metallic=1.0)

# sapphire — defect #1: real transmission, IOR 1.77
grade("mat_crystal_sapphire", color="#f8fafc", metallic=0.0, rough=0.015,
      transmission=1.0, ior=1.77, coat=1.0, coat_rough=0.02, unlink_base=True, strip_normal=True)
for m in meshes_under("part_crystal"):
    for slot in m.material_slots:
        if slot.material:
            slot.material.blend_method = "BLEND"

# back cluster — defect #2: spun metal + clean ceramic (wrong normal/AO stripped)
grade("mat_back_spun", color="#34363a", metallic=1.0, rough=0.32, aniso=0.85, unlink_base=True, strip_normal=True)
grade("mat_back_ceramic", color="#121316", metallic=0.0, rough=0.24, coat=0.7, coat_rough=0.12, strip_normal=True)
grade("mat_back_lens", color="#08090b", metallic=0.0, rough=0.06, coat=1.0, coat_rough=0.02, strip_normal=True)
grade("mat_back_matte", color="#17181a", metallic=0.0, rough=0.8, strip_normal=True)
grade("mat_back_ring", color="#d5d3cf", metallic=1.0, rough=0.18, aniso=0.6, aniso_rot=0.25, unlink_base=True)
grade("mat_sensor_dark", color="#0c0d0f", rough=0.5)
grade("mat_sensor_trim", color="#9fa0a3", metallic=1.0, rough=0.3, unlink_base=True)
grade("mat_cavity_black", color="#060708", rough=0.9)

# Ocean band — defect #3: deep fluoroelastomer, subtle sheen
grade("mat_band_ocean", color="#2a5f55", metallic=0.0, rough=0.56, sheen=0.15, unlink_base=True)
grade("mat_band_tab", color="#2a5f55", metallic=0.0, rough=0.62, sheen=0.15, unlink_base=True)
grade("mat_band_hardware_dark", color="#3a3c40", metallic=1.0, rough=0.35)
grade("mat_accent_orange_ring", color="#e04f18", metallic=0.4, rough=0.42, unlink_base=True)
grade("mat_actionButton_orange", color="#d94a16", metallic=0.0, rough=0.5, unlink_base=True)
grade("mat_button_trim", color="#b6b3ad", metallic=1.0, rough=0.35)

# screen — defect #4 stand-in for offline renders: baked dial as EMISSIVE
# (the live app replaces this with the live dial canvas; renders must read as
# a lit AOD panel, not a grey print)
smat = bpy.data.materials.get("mat_screen_dial")
if smat:
    p = principled(smat)
    nt = smat.node_tree
    tex = None
    for n in nt.nodes:
        if n.type == "TEX_IMAGE":
            tex = n
            break
    if p and tex:
        p.inputs["Base Color"].default_value = (0, 0, 0, 1)
        for l in list(nt.links):
            if l.to_node == p and l.to_socket.name == "Base Color":
                nt.links.remove(l)
        nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
        p.inputs["Emission Strength"].default_value = 3.0
        p.inputs["Roughness"].default_value = 0.35

# ------------------------------------------------------------------ camera
cam_data = bpy.data.cameras.new("cam")
cam_data.clip_start = 0.001  # 30mm parts sit inside the default 0.1 near plane
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam


def fov_min(cd):
    return 2 * math.atan(cd.sensor_width / (2 * cd.lens))


def shoot(name, target, direction, radius, lens=85, sensor=36, margin=1.3,
          dof=None, res=(1280, 1280), tilt_up=0.0):
    cd = cam.data
    cd.lens = lens
    cd.sensor_width = sensor
    d = direction.normalized()
    dist = radius * margin / math.tan(fov_min(cd) / 2)
    if dist < cd.lens / 1000 * 1.2:
        dist = cd.lens / 1000 * 1.2  # thin-lens DOF validity (focus > focal length)
    cam.location = target + d * dist
    look = (target - cam.location).normalized()
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = look.to_track_quat("-Z", "Y")
    if tilt_up:
        cam.location += Vector((0, 0, tilt_up * dist))
        look = (target - cam.location).normalized()
        cam.rotation_quaternion = look.to_track_quat("-Z", "Y")
    if dof is not None:
        cd.dof.use_dof = True
        cd.dof.focus_distance = (target - cam.location).length
        cd.dof.aperture_fstop = dof
    else:
        cd.dof.use_dof = False
    only = os.environ.get("SHOTS")
    if only and name not in only.split(","):
        print("SKIP", name)
        return
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = OUT + name + ".png"
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name)


watch_r = size.length / 2

# part anchors
def anchor(name, fallback_center):
    ms = meshes_under(name)
    if not ms:
        print("  !! part missing:", name, "— using fallback")
        return fallback_center, watch_r * 0.15
    alo, ahi = world_bbox(ms)
    return (alo + ahi) / 2, max((ahi - alo).length / 2, 0.004)


crown_c, crown_r = anchor("part_crown", center + x_axis * size.x / 2)
back_c, back_r = anchor("part_backCrystal", center - z_axis * 0.006)
strap_c, strap_r = anchor("part_band_strapLong", center - y_axis * size.z / 3)

# 1 · hero 3/4 — natural titanium
shoot("render-01-hero34", center, z_axis * 0.8 + x_axis * 0.55 + y_axis * 0.32,
      watch_r, lens=85, margin=1.15)

# 2 · macro crown knurl — real macro optics (sensor 16 / lens 40), shallow DOF
shoot("render-02-crown-knurl", crown_c, x_axis * 1.0 + z_axis * 0.45 + y_axis * 0.18,
      crown_r * 2.6, lens=40, sensor=16, margin=1.15, dof=3.2)

# 3 · dial face-on
shoot("render-03-dial-faceon", screen_center, z_axis,
      max((shi - slo).length / 2 * 1.35, 0.02), lens=85, margin=1.2)

# 4 · side profile — the 14.4mm read (long lens flattens)
shoot("render-04-side-profile", screen_center - z_axis * 0.004, x_axis + z_axis * 0.06,
      0.032, lens=105, margin=1.2, res=(1280, 960))

# 5 · Ocean band macro
shoot("render-05-band-macro", strap_c, (z_axis * 0.5 - y_axis * 0.7 + x_axis * 0.4),
      strap_r * 0.6, lens=40, sensor=16, margin=1.1, dof=4.0)

# 6 · back crystal — camera INSIDE the band loop (outside = strap occlusion),
#     35mm + tight margin ≈ 28mm standoff, macro crop of the sensor cluster
shoot("render-06-back-crystal", back_c, -z_axis + x_axis * 0.22 + y_axis * 0.18,
      back_r, lens=35, margin=0.95, dof=5.6)

# 7 · nocturne lighting test — env hands the light to the screen
wbg.inputs["Strength"].default_value = 0.10
if smat:
    principled(smat).inputs["Emission Strength"].default_value = 8.0
shoot("render-08-nocturne", screen_center, z_axis * 0.9 + x_axis * 0.35 + y_axis * 0.2,
      max((shi - slo).length / 2 * 1.6, 0.024), lens=85, margin=1.25)
wbg.inputs["Strength"].default_value = 1.0
if smat:
    principled(smat).inputs["Emission Strength"].default_value = 3.0

# 8 · black-DLC hero — material-only swap on the same geometry
grade("mat_titanium_case", color="#17181b", rough=0.30, aniso=0.35, **NATURAL_TI)
grade("mat_titanium_brushed", color="#191a1d", rough=0.27, aniso=0.6, **NATURAL_TI)
grade("mat_titanium_polished", color="#1e1f23", rough=0.09, aniso=0.3, **NATURAL_TI)
grade("mat_titanium_crown", color="#17181b", rough=0.28, aniso=0.7, **NATURAL_TI)
grade("mat_crown_knurl", color="#151619", rough=0.32, aniso=0.5, **NATURAL_TI)
grade("mat_titanium_hardware", color="#1a1b1e", rough=0.38, **NATURAL_TI)
grade("mat_bezel", color="#141518", rough=0.26, aniso=0.8, aniso_rot=0.25, **NATURAL_TI)
grade("mat_case_top", color="#17181b", rough=0.28, aniso=0.35, **NATURAL_TI)
shoot("render-07-dlc-hero", center, z_axis * 0.8 + x_axis * 0.55 + y_axis * 0.32,
      watch_r, lens=85, margin=1.15)

print("ALL RENDERS DONE")
