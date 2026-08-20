"""internals_lib — shared kit for A2 internals modeling (one-hertz).

Scale: REAL METERS (battery = 0.030 m tall). Physical light watts + real
macro DOF fall out for free; GLB exports need no rescale.

Shared materials per research/INTERNALS-REF.md §8:
kapton / copper / graphite pouch / resin black / bare steel (+ scene-level
satin steel, brass ENIG, tungsten, blued spring, ink, silkscreen).
"""

import math

import bpy


# ---------------------------------------------------------------- color

def srgb2lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexc(h: str, alpha: float = 1.0):
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb2lin(r), srgb2lin(g), srgb2lin(b), alpha)


# ---------------------------------------------------------------- scene

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block_list in (
        bpy.data.meshes, bpy.data.curves, bpy.data.materials,
        bpy.data.images, bpy.data.lights, bpy.data.cameras,
    ):
        for block in list(block_list):
            if block.users == 0:
                block_list.remove(block)


def setup_cycles(scene, samples=64):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = "GPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"


# ---------------------------------------------------------------- materials

def _principled(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    return mat, bsdf


def _set(bsdf, key, value):
    if key in bsdf.inputs:
        bsdf.inputs[key].default_value = value


def simple_mat(name, color, metallic=0.0, rough=0.5, **kw):
    mat, bsdf = _principled(name)
    _set(bsdf, "Base Color", hexc(color))
    _set(bsdf, "Metallic", metallic)
    _set(bsdf, "Roughness", rough)
    for k, v in kw.items():
        _set(bsdf, k.replace("_", " ").title(), v)
    return mat


def graphite_pouch_mat():
    """Aluminized-polymer pouch laminate: graphite sheen + micro-wrinkle bump."""
    mat, bsdf = _principled("graphite_pouch")
    nt = mat.node_tree
    _set(bsdf, "Base Color", hexc("#3A3C3E"))
    _set(bsdf, "Metallic", 0.65)
    _set(bsdf, "Roughness", 0.42)
    _set(bsdf, "Sheen Weight", 0.15)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    # large soft wrinkles (~1.5 mm features)
    n1 = nt.nodes.new("ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 620.0
    n1.inputs["Detail"].default_value = 6.0
    n1.inputs["Roughness"].default_value = 0.55
    n1.inputs["Distortion"].default_value = 1.4
    # fine laminate grain
    n2 = nt.nodes.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 4200.0
    n2.inputs["Detail"].default_value = 3.0
    b2 = nt.nodes.new("ShaderNodeBump")
    b2.inputs["Strength"].default_value = 0.06
    b2.inputs["Distance"].default_value = 0.00004
    b1 = nt.nodes.new("ShaderNodeBump")
    b1.inputs["Strength"].default_value = 0.28
    b1.inputs["Distance"].default_value = 0.00012

    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
    nt.links.new(n2.outputs["Fac"], b2.inputs["Height"])
    nt.links.new(n1.outputs["Fac"], b1.inputs["Height"])
    nt.links.new(b2.outputs["Normal"], b1.inputs["Normal"])
    nt.links.new(b1.outputs["Normal"], bsdf.inputs["Normal"])

    # roughness rides the wrinkles: sheen concentrates on ridges
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.34, 0.34, 0.34, 1)  # rough 0.34
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.52, 0.52, 0.52, 1)
    nt.links.new(n1.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


def copper_coil_mat(winding_axis="Y", pitch=0.00013):
    """Wound copper: anisotropy hint + winding ribs as wave bump across axis."""
    mat, bsdf = _principled("copper_coil")
    nt = mat.node_tree
    _set(bsdf, "Base Color", hexc("#C97E4F"))
    _set(bsdf, "Metallic", 1.0)
    _set(bsdf, "Roughness", 0.28)
    _set(bsdf, "Anisotropic", 0.6)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    # bands perpendicular to winding_axis = individual turns
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 2.0 * math.pi / pitch
    nt.links.new(sep.outputs[winding_axis], mul.inputs[0])
    sin = nt.nodes.new("ShaderNodeMath")
    sin.operation = "SINE"
    nt.links.new(mul.outputs[0], sin.inputs[0])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.45
    bump.inputs["Distance"].default_value = 0.00005
    nt.links.new(sin.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    # subtle enamel color drift between turns
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = hexc("#B0673F")
    ramp.color_ramp.elements[1].color = hexc("#E2A15C")
    nt.links.new(sin.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def kapton_mat():
    mat, bsdf = _principled("kapton")
    _set(bsdf, "Base Color", hexc("#D9822F"))
    _set(bsdf, "Metallic", 0.0)
    _set(bsdf, "Roughness", 0.32)
    _set(bsdf, "Transmission Weight", 0.12)
    _set(bsdf, "IOR", 1.6)
    return mat


def steel_satin_mat(name="steel_satin", rough=0.35, color="#C6C8CA",
                    streaks=False):
    """streaks=True stretches the roughness noise along X — drawn-shell
    brushing that breaks the plastic-uniform highlight on big faces."""
    mat, bsdf = _principled(name)
    nt = mat.node_tree
    _set(bsdf, "Base Color", hexc(color))
    _set(bsdf, "Metallic", 1.0)
    _set(bsdf, "Anisotropic", 0.25)
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 900.0 if streaks else 2600.0
    n.inputs["Detail"].default_value = 4.0
    if streaks:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0, 90.0, 90.0)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (rough - 0.09,) * 3 + (1,)
    ramp.color_ramp.elements[1].color = (rough + 0.10,) * 3 + (1,)
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


def material_kit():
    return {
        "graphite_pouch": graphite_pouch_mat(),
        "kapton": kapton_mat(),
        "copper_coil": copper_coil_mat(),
        "steel_satin": steel_satin_mat(),
        "steel_bare": simple_mat("steel_bare", "#D7D9DB", 1.0, 0.25),
        "steel_cut": simple_mat("steel_cut", "#DDDFE1", 1.0, 0.18),
        "nickel_tab": simple_mat("nickel_tab", "#CFD2D4", 1.0, 0.30),
        "brass_enig": simple_mat("brass_enig", "#C9A86A", 1.0, 0.32),
        "alu_crimp": simple_mat("alu_crimp", "#B9BCBE", 1.0, 0.38),
        "tungsten": simple_mat("tungsten", "#5A5C60", 1.0, 0.42),
        "blued_spring": simple_mat("blued_spring", "#33415E", 1.0, 0.24),
        "magnet_dark": simple_mat("magnet_dark", "#3B3D42", 1.0, 0.5),
        "resin_black": simple_mat("resin_black", "#17181A", 0.0, 0.6),
        "ink_tape": simple_mat("ink_tape", "#121213", 0.0, 0.85),
        "silkscreen": simple_mat("silkscreen", "#5E5F61", 0.0, 0.45),
        "etch_dark": simple_mat("etch_dark", "#6A6C6E", 1.0, 0.55),
        "weld_dark": simple_mat("weld_dark", "#8E9092", 1.0, 0.5),
        "porcelain": simple_mat("porcelain", "#EDEDEB", 0.0, 0.7),
    }


# ---------------------------------------------------------------- geometry

def _apply_scale(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


def box(name, dims, loc, bevel=None, segments=4, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    obj.scale = (dims[0], dims[1], dims[2])
    _apply_scale(obj)
    if bevel:
        m = obj.modifiers.new("bev", "BEVEL")
        m.width = bevel
        m.segments = segments
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(40)
        bpy.ops.object.modifier_apply(modifier=m.name)
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
        except Exception:
            bpy.ops.object.shade_smooth()
    if mat:
        obj.data.materials.append(mat)
    return obj


def cylinder(name, r, depth, loc, rot=(0, 0, 0), mat=None, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=depth, location=loc, rotation=rot, vertices=verts
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def boolean(obj, cutter, op="DIFFERENCE", keep_cutter=False):
    m = obj.modifiers.new("bool", "BOOLEAN")
    m.operation = op
    m.object = cutter
    m.solver = "EXACT"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=m.name)
    if not keep_cutter:
        bpy.data.objects.remove(cutter, do_unlink=True)


def load_font():
    for path in (
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        try:
            return bpy.data.fonts.load(path)
        except Exception:
            continue
    return None


_FONT = None


def text_mesh(name, body, size, loc, rot=(0, 0, 0), mat=None,
              extrude=0.00001, align="LEFT"):
    global _FONT
    if _FONT is None:
        _FONT = load_font() or False
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.align_x = align
    if _FONT:
        curve.font = _FONT
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    if mat:
        obj.data.materials.append(mat)
    return obj


def s_curve_ribbon(name, points_xy, half_width, thickness, mat=None,
                   resolution=24):
    """Planar bezier (XY, AUTO handles) extruded along Z -> rotate into place."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "NONE"
    curve.resolution_u = resolution
    curve.extrude = half_width
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points_xy) - 1)
    for bp, (x, y) in zip(spline.bezier_points, points_xy):
        bp.co = (x, y, 0)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    m = obj.modifiers.new("sol", "SOLIDIFY")
    m.thickness = thickness
    m.offset = 0
    bpy.ops.object.modifier_apply(modifier=m.name)
    if mat:
        obj.data.materials.append(mat)
    return obj


def weld_dots(name_prefix, centers, r=0.00025, h=0.00005, mat=None):
    dots = []
    for i, c in enumerate(centers):
        d = cylinder(f"{name_prefix}_{i}", r, h, c, mat=mat, verts=20)
        dots.append(d)
    return dots


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    return obj


# ---------------------------------------------------------------- UV + bake

def smart_uv(obj, margin=0.02):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake_normal(obj, img_name, size, out_path):
    """Bake the material's shading normal (incl. procedural bump) to tangent map."""
    smart_uv(obj)
    img = bpy.data.images.new(img_name, size, size)
    img.colorspace_settings.name = "Non-Color"
    nodes_added = []
    for slot in obj.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        nt.nodes.active = node
        node.select = True
        nodes_added.append((nt, node))
    scene = bpy.context.scene
    old_samples = scene.cycles.samples
    scene.cycles.samples = 16
    scene.render.bake.margin = 8
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    scene.cycles.samples = old_samples
    img.filepath_raw = out_path
    img.file_format = "PNG"
    img.save()
    img.pack()
    for nt, node in nodes_added:
        nt.nodes.remove(node)
    return img


def rewire_baked_normal(mat, img):
    """Replace procedural bump chain with the baked tangent normal map."""
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for link in list(nt.links):
        if link.to_node == bsdf and link.to_socket.name == "Normal":
            nt.links.remove(link)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = 1.0
    nt.links.new(tex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])


# ---------------------------------------------------------------- studio

def studio(kit, floor_z=0.0, floor_size=4.0):
    """Porcelain stage + lightformer strips (long horizontal speculars, PLAN §3)."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("studio_world")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.22, 0.225, 0.235, 1.0)
    bg.inputs["Strength"].default_value = 0.35

    bpy.ops.mesh.primitive_plane_add(size=floor_size, location=(0, 0, floor_z))
    floor = bpy.context.active_object
    floor.name = "stage_floor"
    floor.data.materials.append(kit["porcelain"])

    def strip(name, size_xy, loc, rot, power, color=(1, 1, 1)):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.shape = "RECTANGLE"
        light_data.size = size_xy[0]
        light_data.size_y = size_xy[1]
        light_data.energy = power
        light_data.color = color
        obj = bpy.data.objects.new(name, light_data)
        obj.location = loc
        obj.rotation_euler = rot
        bpy.context.collection.objects.link(obj)
        return obj

    # key: long horizontal strip, high front-left, raking down
    strip("key_strip", (0.6, 0.09), (-0.12, -0.22, 0.30),
          (math.radians(38), 0, math.radians(-12)), 9.0, (1.0, 0.985, 0.96))
    # rim: long strip behind, low grazing — draws the long chamfer speculars
    strip("rim_strip", (0.5, 0.05), (0.05, 0.28, 0.14),
          (math.radians(105), 0, math.radians(6)), 7.0, (0.96, 0.98, 1.0))
    # fill: broad soft right, cool + weak
    strip("fill_soft", (0.35, 0.35), (0.30, -0.10, 0.18),
          (math.radians(55), 0, math.radians(55)), 2.5, (0.94, 0.97, 1.0))
    return floor


def macro_key(loc, target, power=3.0, size=0.08):
    """Small dedicated key for macro shots aimed at the detail cluster
    (the studio strips all face -Y; +Y details sit in their shadow)."""
    light_data = bpy.data.lights.new("macro_key", "AREA")
    light_data.shape = "SQUARE"
    light_data.size = size
    light_data.energy = power
    obj = bpy.data.objects.new("macro_key", light_data)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    tgt = bpy.data.objects.new("macro_key_tgt", None)
    tgt.location = target
    bpy.context.collection.objects.link(tgt)
    con = obj.constraints.new("TRACK_TO")
    con.target = tgt
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    return obj


def camera_shot(name, loc, target, lens=85, fstop=None, sensor=36):
    """NOTE: Blender thin-lens DOF degenerates when focus distance < focal
    length. Tight macro framing with a 36mm sensor forces exactly that —
    macro shots must drop `sensor` (e.g. 16) + `lens` (e.g. 40) instead."""
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.sensor_width = sensor
    cam_data.clip_start = 0.001  # default 0.1m would clip a whole 30mm part
    cam_data.clip_end = 100.0
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = loc
    bpy.context.collection.objects.link(cam)
    tgt = bpy.data.objects.new(name + "_tgt", None)
    tgt.location = target
    bpy.context.collection.objects.link(tgt)
    con = cam.constraints.new("TRACK_TO")
    con.target = tgt
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    if fstop:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_object = tgt
        cam_data.dof.aperture_fstop = fstop
    return cam


def render_to(scene, cam, path):
    scene.camera = cam
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"[render] {path}")


def export_glb(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_yup=True,
    )
    print(f"[glb] {path}")
