# rename_export_turntable.py — rename pass toward GLB naming contract, draft GLB export,
# Cycles CPU turntable QA renders (neutral studio 3-point light).
# Usage: Blender -b --factory-startup -P this.py -- --in <usdz> --map <rename.json> \
#   --glb <out.glb|skip> --renders <dir|skip> --frames 12 --finish natural|black --prefix t
import bpy, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d

src = arg("--in"); mapf = arg("--map"); glb = arg("--glb", "skip")
renders = arg("--renders", "skip"); nframes = int(arg("--frames", "12"))
finish = arg("--finish", "natural"); prefix = arg("--prefix", "t")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src)
rmap = json.load(open(mapf))

renamed = missing = 0
for old, new in rmap["objects"].items():
    ob = bpy.data.objects.get(old)
    if ob:
        ob.name = new
        if ob.type == "MESH":
            ob.data.name = new + "_geo"
        renamed += 1
    else:
        print("MISSING_OBJ", old); missing += 1
for old, new in rmap.get("groups", {}).items():
    ob = bpy.data.objects.get(old)
    if ob:
        ob.name = new
    else:
        print("MISSING_GRP", old)
for old, new in rmap.get("materials", {}).items():
    m = bpy.data.materials.get(old)
    if m:
        m.name = new
    else:
        print("MISSING_MAT", old)
# leftover meshes get structured fallback names
left = 0
for ob in bpy.data.objects:
    if ob.type == "MESH" and ob.name not in rmap["objects"].values() and not ob.name.startswith(("part_", "case_", "crown_", "band_", "back_", "lug_", "cavity_", "sideButton", "actionButton", "bandRelease", "crystal_")):
        left += 1
        ob.name = f"unmapped_{left:02d}"
print("RENAME_OK", renamed, "renamed,", missing, "missing,", left, "unmapped")

for img in bpy.data.images:
    if img.name not in ("Render Result", "Viewer Node") and not img.packed_file:
        try: img.pack()
        except Exception as e: print("PACK_FAIL", img.name, e)

if glb != "skip":
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB")
    print("GLB_OK", glb, os.path.getsize(glb))

if renders != "skip":
    os.makedirs(renders, exist_ok=True)
    if finish == "black":  # black titanium DLC approximation
        for mname in rmap.get("finish_black_materials", []):
            m = bpy.data.materials.get(mname)
            if not m or not m.use_nodes: continue
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    bc = n.inputs["Base Color"]
                    for lk in list(bc.links):  # texture-driven base color: unlink so the swap takes
                        m.node_tree.links.remove(lk)
                    bc.default_value = (0.045, 0.045, 0.048, 1.0)
                    n.inputs["Roughness"].default_value = min(0.45, max(0.25, n.inputs["Roughness"].default_value))
                    n.inputs["Metallic"].default_value = 1.0

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bbs = []
    for o in meshes:
        bbs += [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector((min(v[i] for v in bbs) for i in range(3)))
    mx = Vector((max(v[i] for v in bbs) for i in range(3)))
    ctr = (mn + mx) / 2; rad = (mx - mn).length / 2

    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 32
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 640; sc.render.resolution_y = 640
    sc.render.film_transparent = False

    # neutral studio world (very low, lights carry the scene)
    w = bpy.data.worlds.new("studio"); sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.92, 0.92, 0.92, 1.0)
    bg.inputs[1].default_value = 0.12

    def area(name, loc, rot, size, energy, color=(1, 1, 1)):
        d = bpy.data.lights.new(name, "AREA")
        d.size = size; d.energy = energy; d.color = color
        ob = bpy.data.objects.new(name, d)
        sc.collection.objects.link(ob)
        ob.location = loc; ob.rotation_euler = rot
        return ob
    s = rad * 2
    # 3-point: key (upper left front), fill (right, soft), rim (behind, high)
    area("key",  ctr + Vector((-s * 1.6, -s * 1.8, s * 1.6)), (math.radians(50), 0, math.radians(-40)), s * 2.0, 12)
    area("fill", ctr + Vector((s * 2.0, -s * 1.2, s * 0.6)), (math.radians(70), 0, math.radians(60)), s * 2.6, 5)
    area("rim",  ctr + Vector((0, s * 2.2, s * 2.0)), (math.radians(-35), 0, 0), s * 1.6, 9)
    # ground card for contact grounding
    bpy.ops.mesh.primitive_plane_add(size=rad * 12, location=(ctr.x, ctr.y, mn.z - rad * 0.02))
    gp = bpy.context.active_object
    gm = bpy.data.materials.new("mat_stage"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.855, 0.855, 0.845, 1)
    gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    gp.data.materials.append(gm)

    cam = bpy.data.cameras.new("cam"); cam.lens = 85
    camob = bpy.data.objects.new("cam", cam)
    sc.collection.objects.link(camob); sc.camera = camob

    for f in range(nframes):
        a = 2 * math.pi * f / nframes
        camob.location = ctr + Vector((math.sin(a) * rad * 2.9, -math.cos(a) * rad * 2.9, rad * 1.1))
        look = ctr - camob.location
        camob.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(renders, f"{prefix}-{finish}-{f:02d}.png")
        bpy.ops.render.render(write_still=True)
    print("RENDERS_OK", nframes, finish)
