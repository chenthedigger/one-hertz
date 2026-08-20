# inventory.py — headless USDZ import + full inventory dump (one-hertz asset QA)
# Usage: Blender -b --factory-startup -P inventory.py -- --in <file.usdz> --out <dir>
import bpy, sys, json, os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src = argv[argv.index("--in") + 1]
outdir = argv[argv.index("--out") + 1]
os.makedirs(os.path.join(outdir, "textures"), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src)

inv = {"source": src, "objects": [], "materials": [], "images": [], "armatures": []}

for ob in bpy.data.objects:
    if ob.type == "MESH":
        me = ob.data
        bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        mn = [min(v[i] for v in bb) for i in range(3)]
        mx = [max(v[i] for v in bb) for i in range(3)]
        mods = [(m.type, getattr(m.object, "name", None) if m.type == "ARMATURE" else None) for m in ob.modifiers]
        parent_chain = []
        p = ob.parent
        while p:
            parent_chain.append(p.name)
            p = p.parent
        inv["objects"].append({
            "name": ob.name, "data": me.name,
            "verts": len(me.vertices), "faces": len(me.polygons),
            "materials": [ms.material.name if ms.material else None for ms in ob.material_slots],
            "bbox_min": [round(v, 5) for v in mn], "bbox_max": [round(v, 5) for v in mx],
            "center": [round((mn[i] + mx[i]) / 2, 5) for i in range(3)],
            "dims": [round(mx[i] - mn[i], 5) for i in range(3)],
            "modifiers": mods,
            "vgroups": len(ob.vertex_groups),
            "parents": parent_chain,
        })
    elif ob.type == "ARMATURE":
        inv["armatures"].append({"name": ob.name, "bones": len(ob.data.bones),
                                 "bone_names": [b.name for b in ob.data.bones][:20]})

for m in bpy.data.materials:
    nodes = []
    if m.use_nodes:
        for n in m.node_tree.nodes:
            e = {"type": n.type, "name": n.name}
            if n.type == "TEX_IMAGE" and n.image:
                e["image"] = n.image.name
            if n.type == "BSDF_PRINCIPLED":
                e["base_color"] = [round(v, 4) for v in n.inputs["Base Color"].default_value[:]]
                e["metallic"] = round(n.inputs["Metallic"].default_value, 4)
                e["roughness"] = round(n.inputs["Roughness"].default_value, 4)
            nodes.append(e)
    users = sorted({o["name"] for o in inv["objects"] if m.name in o["materials"]})
    inv["materials"].append({"name": m.name, "nodes": nodes, "used_by": users})

for img in bpy.data.images:
    if img.name in ("Render Result", "Viewer Node"):
        continue
    entry = {"name": img.name, "size": list(img.size), "filepath": img.filepath,
             "colorspace": img.colorspace_settings.name}
    # extract
    safe = img.name.replace("/", "_")
    dst = os.path.join(outdir, "textures", safe if safe.lower().endswith((".png", ".jpg", ".jpeg")) else safe + ".png")
    try:
        img.save(filepath=dst)
        entry["extracted"] = os.path.basename(dst)
    except Exception as ex:
        entry["extract_error"] = str(ex)
    inv["images"].append(entry)

# scene bbox over all meshes
if inv["objects"]:
    mn = [min(o["bbox_min"][i] for o in inv["objects"]) for i in range(3)]
    mx = [max(o["bbox_max"][i] for o in inv["objects"]) for i in range(3)]
    inv["scene_bbox"] = {"min": mn, "max": mx, "dims": [round(mx[i] - mn[i], 5) for i in range(3)]}

with open(os.path.join(outdir, "inventory.json"), "w") as f:
    json.dump(inv, f, indent=1)
print("INVENTORY_OK", len(inv["objects"]), "meshes", len(inv["materials"]), "materials", len(inv["images"]), "images")
