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
    """Aluminized-polymer pouch laminate: MATTE wrinkled foil (LOOKBIBLE §9
    tune 3 — the old metallic 0.65 / rough 0.42 grade read as clear acrylic
    under a bright env). Sheen rides the wrinkle ridges only."""
    mat, bsdf = _principled("graphite_pouch")
    nt = mat.node_tree
    # metallic-dark: aluminized laminate. Dielectric grades lift milky-white
    # at grazing (frosted-acrylic read); metal fresnel keeps the grazing
    # tint dark. Matte roughness carries the "foil, never gloss" law.
    _set(bsdf, "Base Color", hexc("#35373A"))
    _set(bsdf, "Metallic", 0.55)
    _set(bsdf, "Roughness", 0.60)
    _set(bsdf, "Sheen Weight", 0.06)

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
    b1.inputs["Strength"].default_value = 0.5
    b1.inputs["Distance"].default_value = 0.00016

    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
    nt.links.new(n2.outputs["Fac"], b2.inputs["Height"])
    nt.links.new(n1.outputs["Fac"], b1.inputs["Height"])
    nt.links.new(b2.outputs["Normal"], b1.inputs["Normal"])
    nt.links.new(b1.outputs["Normal"], bsdf.inputs["Normal"])

    # roughness rides the wrinkles: sheen concentrates on ridges,
    # valleys go fully matte (foil, never gloss)
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.50, 0.50, 0.50, 1)  # ridge rough
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.72, 0.72, 0.72, 1)  # valley rough
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


def kapton_film_mat():
    """Polyimide FPC film (LOOKBIBLE §9 tune 2). Transmission renders bubbly
    on thin solids (P1 open debt) -> transmission 0; translucency faked with
    fresnel-driven lightening; fine copper trace lines across the film."""
    mat, bsdf = _principled("kapton")
    nt = mat.node_tree
    _set(bsdf, "Metallic", 0.0)
    _set(bsdf, "Roughness", 0.30)
    _set(bsdf, "IOR", 1.7)
    _set(bsdf, "Sheen Weight", 0.08)

    # facing = lit amber film, grazing = deeper amber edge (fake depth)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    fres = nt.nodes.new("ShaderNodeMix")
    fres.data_type = "RGBA"
    fres.inputs["A"].default_value = hexc("#BC6418")  # facing: lit film
    fres.inputs["B"].default_value = hexc("#8A3F0C")  # grazing: deep edge
    nt.links.new(lw.outputs["Facing"], fres.inputs["Factor"])

    # copper trace lines: stripes across the ribbon width (local Z of the
    # s_curve_ribbon extrusion), pitch 0.4 mm, subtle color + bump
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 2.0 * math.pi / 0.0003
    nt.links.new(sep.outputs["Z"], mul.inputs[0])
    sin = nt.nodes.new("ShaderNodeMath")
    sin.operation = "SINE"
    nt.links.new(mul.outputs[0], sin.inputs[0])
    lvl = nt.nodes.new("ShaderNodeMath")
    lvl.operation = "MULTIPLY_ADD"
    lvl.inputs[1].default_value = 0.03   # +-3% brightness stripes
    lvl.inputs[2].default_value = 0.97
    nt.links.new(sin.outputs[0], lvl.inputs[0])
    comb = nt.nodes.new("ShaderNodeCombineColor")
    for sock in ("Red", "Green", "Blue"):
        nt.links.new(lvl.outputs[0], comb.inputs[sock])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    nt.links.new(fres.outputs["Result"], tint.inputs["A"])
    nt.links.new(comb.outputs["Color"], tint.inputs["B"])
    nt.links.new(tint.outputs["Result"], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.06
    bump.inputs["Distance"].default_value = 0.00001
    nt.links.new(sin.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def steel_satin_mat(name="steel_satin", rough=0.35, color="#C6C8CA",
                    streaks=False, aniso=0.0, streak_axis="X"):
    """streaks=True stretches the roughness noise along streak_axis —
    drawn-shell brushing that breaks the plastic-uniform highlight on big
    faces. aniso defaults 0: Principled anisotropy without an authored
    tangent gives UV-radial tangents on flat plates -> spun-metal radial
    highlight artifact (bit battery_b_top; same law class as LOOKBIBLE
    §1.3 material law 1)."""
    mat, bsdf = _principled(name)
    nt = mat.node_tree
    _set(bsdf, "Base Color", hexc(color))
    _set(bsdf, "Metallic", 1.0)
    _set(bsdf, "Anisotropic", aniso)
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 900.0 if streaks else 2600.0
    n.inputs["Detail"].default_value = 4.0
    if streaks:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        stretch = {"X": (1.0, 90.0, 90.0), "Y": (90.0, 1.0, 90.0),
                   "Z": (90.0, 90.0, 1.0)}[streak_axis]
        mp.inputs["Scale"].default_value = stretch
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (rough - 0.09,) * 3 + (1,)
    ramp.color_ramp.elements[1].color = (rough + 0.10,) * 3 + (1,)
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])
    return mat


def steel_bead_mat(name="steel_bead", color="#B0B6BA", rough_center=0.40,
                   parting_z=None, parting_width=0.00007):
    """Bead-blasted drawn-steel shell (LOOKBIBLE §9 tune 1): metalness 1.0,
    micro roughness variation 0.35-0.45, mild brushed anisotropy along the
    draw direction, granular micro-normal so the streak formers sparkle.
    parting_z (LOCAL-space meters): darkened weld/parting band at that
    height — a material feature so it follows bevels and section cuts."""
    mat, bsdf = _principled(name)
    nt = mat.node_tree
    _set(bsdf, "Base Color", hexc(color))
    _set(bsdf, "Metallic", 1.0)
    _set(bsdf, "Anisotropic", 0.3)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    # isotropic bead-blast grain (~0.3 mm features — survives 800px QA res)
    n1 = nt.nodes.new("ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 3600.0
    n1.inputs["Detail"].default_value = 5.0
    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"])
    r1 = nt.nodes.new("ShaderNodeMapRange")
    r1.inputs["To Min"].default_value = rough_center - 0.05
    r1.inputs["To Max"].default_value = rough_center + 0.05
    nt.links.new(n1.outputs["Fac"], r1.inputs["Value"])
    # faint drawn-direction streaks overlaid (+-0.02)
    n2 = nt.nodes.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 700.0
    n2.inputs["Detail"].default_value = 4.0
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 70.0, 70.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], n2.inputs["Vector"])
    r2 = nt.nodes.new("ShaderNodeMapRange")
    r2.inputs["To Min"].default_value = -0.02
    r2.inputs["To Max"].default_value = 0.02
    nt.links.new(n2.outputs["Fac"], r2.inputs["Value"])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    add.use_clamp = True
    nt.links.new(r1.outputs["Result"], add.inputs[0])
    nt.links.new(r2.outputs["Result"], add.inputs[1])
    rough_out = add

    if parting_z is not None:
        # band mask: 1 at parting_z, 0 beyond parting_width
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], sep.inputs["Vector"])
        sub = nt.nodes.new("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        sub.inputs[1].default_value = parting_z
        nt.links.new(sep.outputs["Z"], sub.inputs[0])
        ab = nt.nodes.new("ShaderNodeMath")
        ab.operation = "ABSOLUTE"
        nt.links.new(sub.outputs[0], ab.inputs[0])
        band = nt.nodes.new("ShaderNodeMapRange")
        band.interpolation_type = "SMOOTHSTEP"
        band.inputs["From Max"].default_value = parting_width
        band.inputs["To Min"].default_value = 1.0
        band.inputs["To Max"].default_value = 0.0
        nt.links.new(ab.outputs[0], band.inputs["Value"])
        # darken color in the band
        mixc = nt.nodes.new("ShaderNodeMix")
        mixc.data_type = "RGBA"
        mixc.inputs["A"].default_value = hexc(color)
        mixc.inputs["B"].default_value = hexc("#4A4D51")
        nt.links.new(band.outputs["Result"], mixc.inputs["Factor"])
        nt.links.new(mixc.outputs["Result"], bsdf.inputs["Base Color"])
        # roughen the band (weld/anneal zone)
        radd = nt.nodes.new("ShaderNodeMath")
        radd.operation = "MULTIPLY_ADD"
        radd.use_clamp = True
        radd.inputs[1].default_value = 0.10
        nt.links.new(band.outputs["Result"], radd.inputs[0])
        nt.links.new(rough_out.outputs[0], radd.inputs[2])
        rough_out = radd

    nt.links.new(rough_out.outputs[0], bsdf.inputs["Roughness"])
    # granular micro-normal (bead-blast glint under raking streak light)
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.16
    bump.inputs["Distance"].default_value = 0.00003
    nt.links.new(n1.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def material_kit():
    return {
        "graphite_pouch": graphite_pouch_mat(),
        "kapton": kapton_film_mat(),
        "copper_coil": copper_coil_mat(),
        "steel_satin": steel_satin_mat(),
        "steel_bare": simple_mat("steel_bare", "#D7D9DB", 1.0, 0.25),
        "steel_cut": simple_mat("steel_cut", "#DDDFE1", 1.0, 0.28),
        "nickel_tab": simple_mat("nickel_tab", "#CFD2D4", 1.0, 0.30),
        "brass_enig": simple_mat("brass_enig", "#C9A86A", 1.0, 0.32),
        "alu_crimp": simple_mat("alu_crimp", "#B9BCBE", 1.0, 0.5),
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


def prism_from_profile(name, pts2d, thickness, z0=0.0, mat=None,
                       edge_bevel=None, bevel_segments=3):
    """Extrude a closed 2D polygon (list of (x, y), CCW) into a prism:
    bottom cap at z0, top cap at z0+thickness, ngon caps + side quads.
    Used for the case-profile laminate wafers, racetrack cassette,
    knurl star ring, annulus-sector foam tiles."""
    n = len(pts2d)
    verts = [(x, y, z0) for x, y in pts2d] + \
            [(x, y, z0 + thickness) for x, y in pts2d]
    faces = [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    faces.append(list(range(n - 1, -1, -1)))          # bottom (faces -Z)
    faces.append(list(range(n, 2 * n)))               # top (faces +Z)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    if edge_bevel:
        m = obj.modifiers.new("bev", "BEVEL")
        m.width = edge_bevel
        m.segments = bevel_segments
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


def offset_profile(pts2d, d):
    """Inward offset (d > 0) of a dense convex CCW polygon by moving each
    vertex along its averaged inward edge normal. Exact for smooth dense
    outlines (the 200+ pt case hull); do not use on sparse sharp polys."""
    n = len(pts2d)
    out = []
    for i in range(n):
        x0, y0 = pts2d[(i - 1) % n]
        x1, y1 = pts2d[i]
        x2, y2 = pts2d[(i + 1) % n]
        # inward normals of the two adjacent edges (CCW -> inward = left)
        ax, ay = x1 - x0, y1 - y0
        bx, by = x2 - x1, y2 - y1
        la = math.hypot(ax, ay) or 1.0
        lb = math.hypot(bx, by) or 1.0
        nxa, nya = -ay / la, ax / la
        nxb, nyb = -by / lb, bx / lb
        nx, ny = nxa + nxb, nya + nyb
        ln = math.hypot(nx, ny) or 1.0
        out.append((x1 + nx / ln * d, y1 + ny / ln * d))
    return out


def resample_profile(pts2d, n):
    """Even arc-length resample of a closed polyline to n points."""
    import numpy as _np
    p = _np.asarray(pts2d, dtype=float)
    closed = _np.vstack([p, p[:1]])
    seg = _np.linalg.norm(_np.diff(closed, axis=0), axis=1)
    s = _np.concatenate([[0.0], _np.cumsum(seg)])
    t = _np.linspace(0.0, s[-1], n, endpoint=False)
    x = _np.interp(t, s, closed[:, 0])
    y = _np.interp(t, s, closed[:, 1])
    return list(zip(x.tolist(), y.tolist()))


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


def instrument_world(scene, hdr_path, rot_deg=0.0, strength=1.0):
    """LOOKBIBLE §9 tune 4: re-shoot under the INSTRUMENT rig, not the white
    void. hdr_path = public/assets/looks/instrument.hdr (the shipped 8-former
    rig, §1.1). The rig is rotation-relative: rot_deg aims the whole rig.

    Camera rays see the AUTHORED near-black gradient (bake_env.py's exact
    stage, §1.1 background law) — the baked HDR contains the emitter cards,
    and any downward camera otherwise frames the 3x2 m bounce_floor card as
    a cream wall. Lighting/reflection rays keep the full HDR untouched."""
    world = bpy.data.worlds.new("instrument_world")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")

    # HDR branch (lighting + reflections)
    bg_env = nt.nodes.new("ShaderNodeBackground")
    bg_env.inputs["Strength"].default_value = strength
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(hdr_path)
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(rot_deg))
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg_env.inputs["Color"])

    # camera-ray branch: bake_env.py's authored near-black -> dark-cool grey
    bg_cam = nt.nodes.new("ShaderNodeBackground")
    mixc = nt.nodes.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = -1.0
    ramp.inputs["From Max"].default_value = 1.0
    mixc.inputs[6].default_value = (0.004, 0.0045, 0.005, 1.0)
    mixc.inputs[7].default_value = (0.050, 0.056, 0.065, 1.0)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], mixc.inputs[0])
    nt.links.new(mixc.outputs[2], bg_cam.inputs["Color"])

    lp = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg_env.outputs["Background"], mix.inputs[1])
    nt.links.new(bg_cam.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return world


def ink_floor(floor_z=0.0, floor_size=3.0):
    """Ink stage ground (--ink #0A0B0D, LOOKBIBLE §2) — grounds the part
    with a real contact shadow under the instrument env."""
    mat = simple_mat("stage_ink", "#0A0B0D", 0.0, 0.75)
    bpy.ops.mesh.primitive_plane_add(size=floor_size, location=(0, 0, floor_z))
    floor = bpy.context.active_object
    floor.name = "stage_floor"
    floor.data.materials.append(mat)
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


def _flatten_linked_scalar(mat, key):
    """glTF-export fix (W1 art-director gate, Disassembly tune 4): the glTF
    exporter DROPS a Principled scalar socket that is LINKED to a procedural
    graph -> the factor ships absent and falls back to the glTF default
    (roughness 1.0), which is how the shipped battery lost its §9 tune-3
    grade (pouch matte 0.6 / carrier satin ~0.39 became rough-1 bright
    metal). Before export: unlink the socket and write an explicit factor —
    the mean of the feeding ColorRamp's endpoints when one exists (that ramp
    IS the authored roughness band), else the socket's default_value."""
    if not mat.use_nodes:
        return
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None or key not in bsdf.inputs:
        return
    sock = bsdf.inputs[key]
    if not sock.is_linked:
        return
    value = sock.default_value
    node = sock.links[0].from_node
    if node.bl_idname == "ShaderNodeValToRGB":
        els = node.color_ramp.elements
        value = sum(e.color[0] for e in els) / len(els)
    mat.node_tree.links.remove(sock.links[0])
    sock.default_value = value
    print(f"[glb] flatten {mat.name}.{key} -> {value:.3f} (linked graph not exportable)")


def export_glb(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
        for slot in o.material_slots:
            if slot.material is not None:
                _flatten_linked_scalar(slot.material, "Roughness")
                _flatten_linked_scalar(slot.material, "Metallic")
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
