"""LOOK B "INSTRUMENT LIGHT" — authored lightformer environment bake.

Builds an emissive-plane studio designed around the Ultra 3's geometry story:
  - one HARD key (small bright panel, 5500K neutral) → crisp shadows, hard speculars
  - two LONG thin horizontal streak strips → continuous speculars along case chamfers
  - two cool vertical rim strips (7000K) → crisp edge separation + crown-knurl glints
  - narrow overhead strip → top glints on knurl/bezel
  - one LARGE dim cool fill (7000K) → keeps the porcelain stage from going harsh
  - low floor bounce + near-black gradient background → high micro-contrast,
    reflections stay graphic, contact reads deep

Bakes a 2048x1024 equirect Radiance HDR via a Cycles panorama camera at origin.

Run:  Blender -b --factory-startup -P bake_env.py -- <out.hdr>
"""

import math
import sys

import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]

# ---------------------------------------------------------------- scene reset
scene = bpy.context.scene
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.cycles.use_denoising = True

# Metal GPU if available (falls back silently to CPU)
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
except Exception as e:  # noqa: BLE001
    print("GPU setup failed, CPU fallback:", e)

# ------------------------------------------------------------- world gradient
# Near-black floor -> dark cool grey zenith. Deep env = graphic reflections,
# the lightformers are the only real radiance sources.
world = bpy.data.worlds.new("instrument_bg")
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputWorld")
bg = nt.nodes.new("ShaderNodeBackground")
mixc = nt.nodes.new("ShaderNodeMix")
mixc.data_type = "RGBA"
texco = nt.nodes.new("ShaderNodeTexCoord")
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeMapRange")
ramp.inputs["From Min"].default_value = -1.0
ramp.inputs["From Max"].default_value = 1.0
# floor: near-black warmless ink · zenith: dark cool grey
mixc.inputs[6].default_value = (0.004, 0.0045, 0.005, 1.0)
mixc.inputs[7].default_value = (0.050, 0.056, 0.065, 1.0)
nt.links.new(texco.outputs["Generated"], sep.inputs[0])
nt.links.new(sep.outputs["Z"], ramp.inputs["Value"])
nt.links.new(ramp.outputs["Result"], mixc.inputs[0])
nt.links.new(mixc.outputs[2], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0
nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


# ------------------------------------------------------------- lightformers
def lightformer(name, az_deg, el_deg, dist, w, h, kelvin, radiance):
    """Emissive plane at spherical (az from +Y-forward? no: az from +X? —
    convention: az 0 = +X axis of env space, CCW; el from horizon), aimed at origin."""
    az = math.radians(az_deg)
    el = math.radians(el_deg)
    pos = Vector(
        (
            dist * math.cos(el) * math.cos(az),
            dist * math.cos(el) * math.sin(az),
            dist * math.sin(el),
        )
    )
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(
        [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)],
        [],
        [(0, 1, 2, 3)],
    )
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = pos
    # aim plane's -Z at origin => +Z (normal) faces origin? plane normal is +Z;
    # to_track_quat('Z','Y') points +Z along the (pos->origin?) vector we give.
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (-pos).to_track_quat("-Z", "Y")

    mat = bpy.data.materials.new(name + "_mat")
    mat.use_nodes = True
    mnt = mat.node_tree
    mnt.nodes.clear()
    mout = mnt.nodes.new("ShaderNodeOutputMaterial")
    emi = mnt.nodes.new("ShaderNodeEmission")
    bb = mnt.nodes.new("ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = kelvin
    mnt.links.new(bb.outputs["Color"], emi.inputs["Color"])
    emi.inputs["Strength"].default_value = radiance
    mnt.links.new(emi.outputs["Emission"], mout.inputs["Surface"])
    mesh.materials.append(mat)
    return obj


# Azimuth convention for the rig (env-space): 0° = +X. three.js hero camera sits
# on +Z; equirect u-origin differs — final alignment is the envRotationDeg dial
# in instrument.json, tuned against live screenshots. Design is therefore
# relative: key / streaks / rims hold their SEPARATIONS, the whole rig rotates.

# 1 · KEY — hard, small, 5500K neutral, upper front-left
lightformer("key_hard", 125, 42, 2.2, 0.95, 0.65, 5500, 42.0)

# 2 · CHAMFER STREAK A — long thin horizontal strip, front, just above horizon.
#     This is the strip that draws the continuous spec along the case chamfer.
lightformer("streak_chamfer_a", 90, 9, 3.0, 6.0, 0.11, 5600, 30.0)

# 3 · CHAMFER STREAK B — rear-left grazing streak (flank spec in 3/4 views)
lightformer("streak_chamfer_b", 255, 16, 3.0, 4.0, 0.09, 6500, 22.0)

# 4 · RIM MAIN — thin vertical strip behind-right, 7000K, brightest source edge
lightformer("rim_main", 340, 12, 2.6, 0.14, 2.4, 7000, 55.0)

# 5 · RIM KICKER — opposite vertical strip, dimmer (dual knurl glints)
lightformer("rim_kicker", 195, 8, 2.8, 0.12, 2.0, 7000, 32.0)

# 6 · TOPLIGHT — narrow overhead strip (crown knurl + bezel top glints)
lightformer("top_strip", 100, 72, 2.4, 1.4, 0.18, 5800, 20.0)

# 7 · FILL — large dim cool panel (harshness management on porcelain)
lightformer("fill_soft", 30, 18, 3.4, 3.2, 2.2, 7000, 2.6)

# 8 · BOUNCE — floor return, barely-there, neutral
lightformer("bounce_floor", 90, -58, 3.0, 3.0, 2.0, 5500, 1.2)

# ------------------------------------------------------------- panorama camera
cam_data = bpy.data.cameras.new("pano")
cam_data.type = "PANO"
try:
    cam_data.panorama_type = "EQUIRECTANGULAR"  # Blender 4.x
except Exception:
    cam_data.cycles.panorama_type = "EQUIRECTANGULAR"  # legacy path
cam = bpy.data.objects.new("pano", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, 0, 0)
cam.rotation_euler = (math.radians(90), 0, math.radians(-90))  # look at +X, Z-up
scene.camera = cam

# ------------------------------------------------------------------- render
scene.render.resolution_x = 2048
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "HDR"
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print("BAKED:", OUT)
