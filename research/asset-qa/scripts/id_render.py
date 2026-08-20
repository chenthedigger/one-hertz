# id_render.py — group-colored flat ID renders for mesh mapping verification
# Usage: Blender -b --factory-startup -P id_render.py -- --in <usdz> --out <dir>
import bpy, sys, os, json, math, colorsys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src = argv[argv.index("--in") + 1]
outdir = argv[argv.index("--out") + 1]
os.makedirs(outdir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src)

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
groups = sorted({o.parent.name if o.parent else "ROOT" for o in meshes})
legend = {}
for i, g in enumerate(groups):
    h = (i * 0.6180339887) % 1.0
    r, gg, b = colorsys.hsv_to_rgb(h, 0.85, 1.0)
    legend[g] = [round(r, 3), round(gg, 3), round(b, 3)]
for o in meshes:
    g = o.parent.name if o.parent else "ROOT"
    c = legend[g]
    o.color = (c[0], c[1], c[2], 1.0)

with open(os.path.join(outdir, "id-legend.json"), "w") as f:
    json.dump(legend, f, indent=1)

# scene bbox
bbs = []
for o in meshes:
    bbs += [o.matrix_world @ Vector(c) for c in o.bound_box]
mn = Vector((min(v[i] for v in bbs) for i in range(3)))
mx = Vector((max(v[i] for v in bbs) for i in range(3)))
ctr = (mn + mx) / 2
rad = max((mx - mn).length / 2, 0.01)

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "FLAT"
sc.display.shading.color_type = "OBJECT"
sc.render.resolution_x = 640
sc.render.resolution_y = 640
sc.render.film_transparent = False
sc.world = bpy.data.worlds.new("W")

cam = bpy.data.cameras.new("cam")
camob = bpy.data.objects.new("cam", cam)
sc.collection.objects.link(camob)
sc.camera = camob
cam.lens = 80

views = {
    "front": (0, -1, 0.25), "back": (0, 1, 0.25),
    "right": (1, -0.15, 0.25), "left": (-1, -0.15, 0.25),
    "top": (0.01, -0.3, 1.2), "bottom": (0.01, -0.3, -1.2),
}
for name, d in views.items():
    dv = Vector(d).normalized()
    camob.location = ctr + dv * rad * 3.0
    look = ctr - camob.location
    camob.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(outdir, f"id-{name}.png")
    bpy.ops.render.render(write_still=True)
print("ID_RENDER_OK", len(groups), "groups")
