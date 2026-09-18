"""AD2A.1 generator: original Lade candidate on a continuous humanoid base.

Local-only, headless, zero manual operations, zero downloads, zero uploads.
Builds the neutral variant (with project-owned test armature + automatic
weights), exports it, then poses the rifle-ready variant via temporary IK,
bakes it, and exports that too.

Usage: D:\\Blender\\blender.exe --background --python tools/lade_ad2a1/gen_ad2a1.py
"""

import json
import math
import os
import shutil
import sys
import time

import bmesh
import bpy
from mathutils import Vector

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)
from humanoid_lib import (  # noqa: E402
    BLEND_NEUTRAL,
    BLEND_READY,
    BONES,
    BONE_PARENTS,
    COLLECTION,
    GLB_NEUTRAL,
    GLB_READY,
    GLB_REVIEW_NEUTRAL,
    GLB_REVIEW_READY,
    RENDER_DIR,
    REPO_ROOT,
    REQUIRED_OBJECTS,
    REQUIRED_SOCKETS,
    REVIEW_DIR,
    RIG_NAME,
    SKIN_EDGES,
    SKIN_VERTS,
    SOCKET_COLLECTION,
    WORK_DIR,
    activate,
    deselect_all,
    move_to_collection,
)

from lade_lib import (  # noqa: E402
    MATERIAL_SPECS,
    add_empty,
    assign_material,
    bbox_of,
    ensure_collection,
    get_material,
    stats_for_objects,
)

STARTED = time.time()
os.makedirs(WORK_DIR, exist_ok=True)
os.makedirs(RENDER_DIR, exist_ok=True)

GROUND_DZ = [0.0]


# ---------------------------------------------------------------------------
# Small construction helpers (original geometry throughout).
# ---------------------------------------------------------------------------

def new_primitive(op, mat, **kwargs):
    deselect_all()
    op(**kwargs)
    obj = bpy.context.view_layer.objects.active
    if mat is not None:
        assign_material(obj, mat)
    return move_to_collection(obj, COLLECTION)


def box(mat, size, location, rotation=(0, 0, 0)):
    deselect_all()
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.view_layer.objects.active
    obj.scale = size
    if mat is not None:
        assign_material(obj, mat)
    return move_to_collection(obj, COLLECTION)


def cyl(mat, r_top, r_bot, depth, verts, location, rotation=(0, 0, 0)):
    deselect_all()
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=1.0, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.view_layer.objects.active
    mesh = obj.data
    top_z = max(v.co.z for v in mesh.vertices)
    bot_z = min(v.co.z for v in mesh.vertices)
    for vert in mesh.vertices:
        t = (vert.co.z - bot_z) / max(1e-6, top_z - bot_z)
        radius = r_bot + (r_top - r_bot) * t
        vert.co.x *= radius
        vert.co.y *= radius
    mesh.update()
    if mat is not None:
        assign_material(obj, mat)
    return move_to_collection(obj, COLLECTION)


def ball(mat, radius, location, segments=18, rings=12, scale=(1, 1, 1)):
    deselect_all()
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.view_layer.objects.active
    obj.scale = scale
    if mat is not None:
        assign_material(obj, mat)
    return move_to_collection(obj, COLLECTION)


def torus(mat, major, minor, location, rotation=(0, 0, 0), major_seg=24, minor_seg=10):
    deselect_all()
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor,
        major_segments=major_seg, minor_segments=minor_seg,
        location=location, rotation=rotation,
    )
    obj = bpy.context.view_layer.objects.active
    if mat is not None:
        assign_material(obj, mat)
    return move_to_collection(obj, COLLECTION)


def bake_transforms(obj):
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def finish(obj, mat_name=None, smooth=True):
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if smooth:
        bpy.ops.object.shade_smooth()
    else:
        bpy.ops.object.shade_flat()
    if mat_name is not None:
        if obj.data.materials:
            obj.data.materials[0] = get_material(mat_name)
        else:
            obj.data.materials.append(get_material(mat_name))
    return obj


def finish_preserve_mats(obj, smooth=True):
    """Join-friendly finish that keeps pre-assigned multi-material slots."""
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if smooth:
        bpy.ops.object.shade_smooth()
    else:
        bpy.ops.object.shade_flat()
    return obj


def join_into(target, parts):
    deselect_all()
    target.select_set(True)
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return target


def set_origin(obj, location):
    bpy.context.scene.cursor.location = location
    activate(obj)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")


def sculpt(mesh, func):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        func(v)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------------------
# Body: ONE continuous Skin-modifier mesh (torso + arms + legs + hands + feet).
# ---------------------------------------------------------------------------

def build_skin_body():
    index = {name: i for i, (name, _, _) in enumerate(SKIN_VERTS)}
    mesh = bpy.data.meshes.new("Lade_BodyMesh")
    mesh.from_pydata(
        [pos for _, pos, _ in SKIN_VERTS],
        [(index[a], index[b]) for a, b in SKIN_EDGES],
        [],
    )
    mesh.update()
    obj = bpy.data.objects.new("Lade_Body", mesh)
    bpy.context.scene.collection.objects.link(obj)
    move_to_collection(obj, COLLECTION)
    activate(obj)
    skin = obj.modifiers.new("Skin", "SKIN")
    skin.branch_smoothing = 1.0
    skin_data = obj.data.skin_vertices[0].data
    for i, (_, _, radius) in enumerate(SKIN_VERTS):
        skin_data[i].radius = radius
    subsurf = obj.modifiers.new("Subsurf", "SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 2
    bpy.ops.object.modifier_apply(modifier=skin.name)
    # Applying Skin keeps the original cage as loose geometry; the edit-mode
    # delete-loose pass removes stray verts AND edges (a bmesh vert-only
    # pass leaves edge-only strays behind, tripping export validation).
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.modifier_apply(modifier=subsurf.name)

    def shape(v):
        x, y, z = v.co.x, v.co.y, v.co.z
        ax = abs(x)
        if 1.38 <= z <= 1.54 and 0.07 <= ax <= 0.24:  # trapezius slope
            v.co.z -= (ax - 0.07) * 0.45
        if 1.40 <= z <= 1.54 and 0.09 <= ax <= 0.26:  # branch-spike cap
            cap = 1.475 - (ax - 0.09) * 0.25
            if v.co.z > cap:
                v.co.z = cap
        if 1.28 <= z <= 1.46:  # chest mass, flatter depth
            t = max(0.0, 1.0 - abs(z - 1.37) / 0.09)
            v.co.x *= 1.0 + 0.07 * t
            v.co.y = 0.010 + (y - 0.010) * 0.92
        if 1.02 <= z <= 1.26:  # waist taper
            t = max(0.0, 1.0 - abs(z - 1.14) / 0.12)
            v.co.x *= 1.0 - 0.13 * t
        if 0.92 <= z <= 1.06:  # pelvis settle
            v.co.x *= 1.03
            if y < -0.02:  # buttocks
                v.co.y -= 0.018
        if 1.08 <= z <= 1.24 and y > 0.05:  # belly micro-forward
            v.co.y += 0.008
        if 0.28 <= z <= 0.50 and y < -0.01:  # calf line
            v.co.y -= 0.014
        if 0.80 <= z <= 0.96 and 0.20 <= ax <= 0.34:  # glove-mass palms
            v.co.y = 0.06 + (y - 0.06) * 0.72
        if z < 0.055 and ax < 0.20 and -0.13 < y < 0.19:  # sole plane
            v.co.z = max(v.co.z, 0.012)

    sculpt(obj.data, shape)
    # Ground exactly: shift so the lowest foot vertex sits at z = 0.002.
    corner_min, _ = bbox_of([obj])
    GROUND_DZ[0] = 0.002 - corner_min[2]

    def ground(v):
        v.co.z += GROUND_DZ[0]

    sculpt(obj.data, ground)
    finish(obj, "M_OliveDark", smooth=True)
    obj.name = "Lade_Body"
    set_origin(obj, (0, 0, 1.18))
    print(f"BODY verts={len(obj.data.vertices)} groundShift={GROUND_DZ[0]:.4f}")
    return obj


DZ = lambda z: z + GROUND_DZ[0]


# ---------------------------------------------------------------------------
# Head (separate fitted mesh; neck seam concealed under the scarf wrap).
# ---------------------------------------------------------------------------

def build_head():
    head = ball("M_Charcoal", 1.0, (0, 0.012, DZ(1.730)), segments=20, rings=14)
    head.scale = (0.088, 0.098, 0.108)
    bake_transforms(head)

    def jaw(v):
        x, y, z = v.co.x, v.co.y, v.co.z
        if z < 1.71:
            t = min(1.0, (1.71 - z) / 0.10)
            v.co.x *= 1.0 - 0.25 * t
            if y > 0.02:
                v.co.y = 0.02 + (y - 0.02) * (1.0 - 0.15 * t)
            if z < 1.66 and y > 0.03:  # chin forward
                v.co.y += 0.008

    sculpt(head.data, jaw)
    finish(head, "M_Charcoal", smooth=True)
    head.name = "Lade_Head"
    set_origin(head, (0, 0, 1.60))
    return head


# ---------------------------------------------------------------------------
# Equipment: separate fitted shells (never structural substitutes).
# ---------------------------------------------------------------------------

def build_helmet():
    dome = ball("M_OliveDark", 1.0, (0, 0.005, DZ(1.765)), segments=24, rings=14)
    dome.scale = (0.128, 0.138, 0.105)
    bake_transforms(dome)
    mesh = dome.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    doomed = [v for v in bm.verts if v.co.z < DZ(1.730)]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    for v in bm.verts:
        if v.co.z < DZ(1.760):  # brim flare
            f = 1.0 + (DZ(1.760) - v.co.z) * 1.2
            v.co.x *= f
            v.co.y *= f
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    finish(dome, "M_OliveDark", smooth=True)
    dome.name = "Lade_Helmet"
    set_origin(dome, (0, 0, 1.62))
    return dome


def build_headlamp():
    housing = box("M_Charcoal", (0.045, 0.038, 0.042), (0.085, 0.105, DZ(1.785)),
                  rotation=(0, 0, -0.35))
    lens = cyl("M_LampLens", 0.013, 0.013, 0.010, 12, (0.098, 0.126, DZ(1.782)),
               rotation=(1.35, 0, -0.35))
    cable = cyl("M_Charcoal", 0.006, 0.006, 0.16, 6, (0.045, 0.010, DZ(1.830)),
                rotation=(1.25, 0, 0.35))
    lamp = join_into(housing, [lens, cable])
    finish_preserve_mats(lamp, smooth=False)
    lamp.name = "Lade_Headlamp"
    set_origin(lamp, (0, 0, 1.62))
    return lamp


def build_mask():
    face = ball("M_MaskBody", 1.0, (0, 0.045, DZ(1.692)), segments=24, rings=16)
    face.scale = (0.095, 0.080, 0.100)
    bake_transforms(face)
    bm = bmesh.new()
    bm.from_mesh(face.data)
    bm.verts.ensure_lookup_table()
    doomed = [v for v in bm.verts if v.co.y < 0.005]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(face.data)
    bm.free()
    face.data.update()
    solid = face.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.008
    activate(face)
    bpy.ops.object.modifier_apply(modifier=solid.name)
    snout = cyl("M_MaskBody", 0.042, 0.058, 0.10, 14, (0, 0.115, DZ(1.650)),
                rotation=(1.10, 0, 0))
    canister = cyl("M_MaskBody", 0.052, 0.052, 0.085, 18, (0, 0.125, DZ(1.575)))
    ridges = [
        torus("M_OliveDark", 0.052, 0.007, (0, 0.125, DZ(1.555) + i * 0.020), major_seg=18)
        for i in range(3)
    ]
    valve_l = cyl("M_OliveDark", 0.018, 0.018, 0.030, 10, (-0.095, 0.095, DZ(1.645)),
                  rotation=(0, 1.2, 0))
    valve_r = cyl("M_OliveDark", 0.018, 0.018, 0.030, 10, (0.095, 0.095, DZ(1.645)),
                  rotation=(0, -1.2, 0))
    mask = join_into(face, [snout, canister, valve_l, valve_r] + ridges)
    finish_preserve_mats(mask, smooth=True)
    mask.name = "Lade_Mask"
    set_origin(mask, (0, 0, 1.60))
    return mask


def build_lenses():
    parts = []
    for side in (-1, 1):
        rim = torus("M_LensRim", 0.044, 0.009,
                    (side * 0.058, 0.100, DZ(1.700)),
                    rotation=(0.06, side * -0.06, 0), major_seg=22)
        bake_transforms(rim)
        dome = ball("M_Lens", 0.047, (side * 0.058, 0.100, DZ(1.700)))
        dome.scale = (1.0, 0.34, 1.0)
        dome.rotation_euler = (0.06, side * -0.06, 0)
        bake_transforms(dome)
        parts.append((rim, dome))
    lenses = join_into(parts[0][0], [parts[0][1], parts[1][0], parts[1][1]])
    mesh = lenses.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    lens_mat = get_material("M_Lens")
    if len(lenses.data.materials) < 2:
        lenses.data.materials.append(lens_mat)
    lens_index = list(lenses.data.materials).index(lens_mat)
    for face in bm.faces:
        c = face.calc_center_median()
        dx = (abs(c.x) - 0.058) / 0.047
        dy = (c.y - 0.100) / 0.016
        dz = (c.z - DZ(1.700)) / 0.047
        if dx * dx + dy * dy + dz * dz < 1.20:
            face.material_index = lens_index
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    finish_preserve_mats(lenses, smooth=True)
    lenses.name = "Lade_Lenses"
    set_origin(lenses, (0, 0, 1.60))
    return lenses


def build_scarf():
    wrap = torus("M_Scarf", 0.088, 0.034, (0, 0.008, DZ(1.580)), major_seg=24)
    wrap.scale = (1.0, 1.0, 1.15)
    bake_transforms(wrap)
    deselect_all()
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.02, 0.135, DZ(1.400)))
    drape = bpy.context.view_layer.objects.active
    assign_material(drape, "M_Scarf")
    move_to_collection(drape, COLLECTION)
    # Plane primitives lie in XY; rotate flat-to-vertical so X stays width,
    # local Y becomes world height, and sculpt-time Y stays depth.
    drape.rotation_euler = (1.5708, 0, 0)
    drape.scale = (0.16, 0.30, 1.0)
    bake_transforms(drape)
    activate(drape)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide(number_cuts=3)
    bpy.ops.object.mode_set(mode="OBJECT")
    bm = bmesh.new()
    bm.from_mesh(drape.data)
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        v.co.y += math.sin((v.co.x / 0.16 + 0.5) * math.pi) * 0.020
        v.co.y -= (DZ(1.400) - v.co.z) * 0.12
    bm.to_mesh(drape.data)
    bm.free()
    drape.data.update()
    solid = drape.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.006
    activate(drape)
    bpy.ops.object.modifier_apply(modifier=solid.name)
    cape = cyl("M_Scarf", 0.175, 0.225, 0.14, 20, (0, 0, DZ(1.465)))
    scarf = join_into(wrap, [drape, cape])
    finish_preserve_mats(scarf, smooth=True)
    scarf.name = "Lade_Scarf"
    set_origin(scarf, (0, 0, 1.50))
    return scarf


def build_vest():
    front = box("M_Charcoal", (0.31, 0.055, 0.30), (0, 0.150, DZ(1.345)))
    back = box("M_Charcoal", (0.31, 0.055, 0.30), (0, -0.130, DZ(1.345)))
    for plate, sign in ((front, 1.0), (back, -1.0)):
        activate(plate)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.object.mode_set(mode="OBJECT")

        def bend(v, s=sign):
            if abs(v.co.x) > 0.10:
                v.co.y -= s * (abs(v.co.x) - 0.10) * 0.55

        sculpt(plate.data, bend)
    belt = cyl("M_OliveDark", 0.175, 0.185, 0.12, 20, (0, 0.005, DZ(1.200)))
    belt.scale = (1.0, 0.78, 1.0)
    bake_transforms(belt)
    pouches = [
        box("M_Pack", (0.090, 0.055, 0.120), (px, 0.185, DZ(1.270)))
        for px in (-0.105, 0.0, 0.105)
    ]
    tab = box("M_AccentRed", (0.030, 0.014, 0.050), (0.090, 0.190, DZ(1.360)))
    straps = [
        box("M_Brown", (0.055, 0.300, 0.055), (sx, 0.005, DZ(1.500)))
        for sx in (-0.110, 0.110)
    ]
    vest = join_into(front, [back, belt, tab] + pouches + straps)
    finish_preserve_mats(vest, smooth=False)
    vest.name = "Lade_Vest"
    set_origin(vest, (0, 0, 1.30))
    return vest


def build_coat():
    skirt = cyl("M_OliveDark", 0.205, 0.295, 0.44, 20, (0, 0, DZ(0.800)))

    def slit(v):
        if v.co.y > 0.10 and abs(v.co.x) < 0.06 and v.co.z < DZ(0.780):
            v.co.y -= 0.05

    sculpt(skirt.data, slit)
    collar = torus("M_OliveDark", 0.105, 0.030, (0, 0.005, DZ(1.545)), major_seg=22)
    coat = join_into(skirt, [collar])
    finish_preserve_mats(coat, smooth=True)
    coat.name = "Lade_Coat"
    set_origin(coat, (0, 0, 1.30))
    return coat


def build_armor():
    parts = []
    for side in (-1, 1):
        pauldron = ball("M_GreyArmor", 1.0, (side * 0.225, 0.005, DZ(1.455)),
                        segments=18, rings=10)
        pauldron.scale = (0.080, 0.072, 0.065)
        bake_transforms(pauldron)
        bm = bmesh.new()
        bm.from_mesh(pauldron.data)
        bm.verts.ensure_lookup_table()
        doomed = [v for v in bm.verts if v.co.z < DZ(1.420)]
        bmesh.ops.delete(bm, geom=doomed, context="VERTS")
        bm.to_mesh(pauldron.data)
        bm.free()
        pauldron.data.update()
        parts.append(pauldron)
        elbow = ball("M_Charcoal", 1.0, (side * 0.273, 0.020, DZ(1.215)),
                     segments=14, rings=10)
        elbow.scale = (0.062, 0.058, 0.070)
        bake_transforms(elbow)
        parts.append(elbow)
        knee = ball("M_Charcoal", 1.0, (side * 0.110, 0.045, DZ(0.550)),
                    segments=14, rings=10)
        knee.scale = (0.080, 0.070, 0.085)
        bake_transforms(knee)
        parts.append(knee)
    for i, z in enumerate((0.960, 1.000, 1.040)):
        wrap = torus("M_Brown", 0.058, 0.012, (-0.278, 0.045 + i * 0.008, DZ(z)),
                     major_seg=16, minor_seg=8)
        parts.append(wrap)
    pouch = box("M_Pack", (0.070, 0.120, 0.150), (0.225, 0.0, DZ(0.780)))
    parts.append(pouch)
    armor = join_into(parts[0], parts[1:])
    # Pale unit marking on the dominant pauldron crown.
    mesh = armor.data
    mark_mat = get_material("M_MarkPale")
    if len(mesh.materials) < 6:
        mesh.materials.append(mark_mat)
    mark_index = list(mesh.materials).index(mark_mat)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    for face in bm.faces:
        c = face.calc_center_median()
        if c.x > 0.165 and c.z > DZ(1.478) and c.y > -0.03:
            face.material_index = mark_index
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    finish_preserve_mats(armor, smooth=True)
    armor.name = "Lade_Armor"
    set_origin(armor, (0, 0, 1.30))
    return armor


def build_boot(side):
    tag = "L" if side < 0 else "R"
    x = side * 0.11
    shaft = cyl("M_Charcoal", 0.080, 0.068, 0.30, 14, (x, 0.005, DZ(0.280)))
    foot = box("M_Charcoal", (0.105, 0.260, 0.095), (x, 0.045, DZ(0.075)))

    def toe(v):
        if v.co.y > 0.12:
            v.co.x *= 0.88
            v.co.y += 0.015
            v.co.z -= 0.015

    sculpt(foot.data, toe)
    sole = box("M_Charcoal", (0.115, 0.280, 0.040), (x, 0.045, DZ(0.030)))
    cuff = torus("M_OliveDark", 0.082, 0.016, (x, 0.005, DZ(0.420)), major_seg=18)
    cap = ball("M_GreyArmor", 0.070, (x, 0.150, DZ(0.065)), segments=14, rings=10)
    cap.scale = (0.80, 1.0, 0.55)
    bake_transforms(cap)
    boot = join_into(shaft, [foot, sole, cuff, cap])
    finish_preserve_mats(boot, smooth=False)
    boot.name = f"Lade_Boot_{tag}"
    set_origin(boot, (x, 0, 0.14))
    return boot


def build_pack():
    main = box("M_Pack", (0.270, 0.150, 0.340), (0, -0.215, DZ(1.320)))
    activate(main)
    bevel = main.modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.030
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bedroll = cyl("M_OliveDark", 0.068, 0.068, 0.320, 14, (0, -0.215, DZ(1.520)),
                  rotation=(0, 1.5708, 0))
    straps = [
        box("M_Brown", (0.050, 0.160, 0.360), (sx, -0.215, DZ(1.320)))
        for sx in (-0.080, 0.080)
    ]
    flap = box("M_Pack", (0.240, 0.130, 0.060), (0, -0.210, DZ(1.480)))
    side = box("M_Pack", (0.080, 0.120, 0.160), (-0.165, -0.200, DZ(1.240)))
    pack = join_into(main, [bedroll, flap, side] + straps)
    finish_preserve_mats(pack, smooth=False)
    pack.name = "Lade_Backpack"
    set_origin(pack, (0, -0.20, 1.30))
    return pack


def build_blade():
    blade = box("M_Rust", (0.055, 0.018, 0.580), (-0.100, -0.300, DZ(1.300)),
                rotation=(0.12, 0, 0.50))

    def point(v):
        if v.co.z > 0.20:
            v.co.x *= 0.30

    sculpt(blade.data, point)
    grip = cyl("M_Brown", 0.016, 0.016, 0.120, 10, (-0.100, -0.300, DZ(1.300)))
    full = join_into(blade, [grip])
    finish_preserve_mats(full, smooth=False)
    full.name = "Lade_BackBlade"
    set_origin(full, (-0.10, -0.30, 1.30))
    return full


def build_rifle():
    """Rifle authored with its origin at the trigger-grip point, +Y muzzle."""
    parts = []
    receiver = box("M_WeaponMetal", (0.058, 0.300, 0.075), (0, 0.100, 0.060))
    parts.append(receiver)
    stock = box("M_Wood", (0.050, 0.220, 0.090), (0, -0.120, 0.030))
    parts.append(stock)
    butt = box("M_Charcoal", (0.055, 0.030, 0.120), (0, -0.235, 0.020))
    parts.append(butt)
    barrel = cyl("M_GunSteel", 0.012, 0.012, 0.300, 12, (0, 0.380, 0.075),
                 rotation=(1.5708, 0, 0))
    parts.append(barrel)
    handguard = box("M_Wood", (0.055, 0.200, 0.065), (0, 0.300, 0.065))
    parts.append(handguard)
    magazine = box("M_WeaponMetal", (0.045, 0.160, 0.060), (0, 0.060, -0.060),
                   rotation=(0.35, 0, 0))
    parts.append(magazine)
    grip = box("M_Charcoal", (0.040, 0.050, 0.110), (0, -0.010, -0.055),
               rotation=(0.30, 0, 0))
    parts.append(grip)
    front_sight = box("M_GunSteel", (0.012, 0.014, 0.035), (0, 0.500, 0.105))
    parts.append(front_sight)
    rear_sight = box("M_GunSteel", (0.030, 0.020, 0.025), (0, 0.160, 0.105))
    parts.append(rear_sight)
    muzzle = cyl("M_GunSteel", 0.016, 0.016, 0.050, 12, (0, 0.545, 0.075),
                 rotation=(1.5708, 0, 0))
    parts.append(muzzle)
    rail = box("M_WeaponMetal", (0.020, 0.180, 0.012), (0, 0.300, 0.100))
    parts.append(rail)
    bayonet = box("M_GunSteel", (0.020, 0.160, 0.008), (0, 0.520, 0.030))
    parts.append(bayonet)
    rifle = join_into(parts[0], parts[1:])
    finish_preserve_mats(rifle, smooth=False)
    rifle.name = "Lade_Rifle"
    # Origin stays at the grip point by construction.
    return rifle


# ---------------------------------------------------------------------------
# Test armature (project-owned simple deform rig) and parenting.
# ---------------------------------------------------------------------------

def build_armature():
    arm_data = bpy.data.armatures.new(RIG_NAME)
    arm = bpy.data.objects.new(RIG_NAME, arm_data)
    bpy.context.scene.collection.objects.link(arm)
    move_to_collection(arm, COLLECTION)
    activate(arm)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, head, tail in BONES:
        bone = arm_data.edit_bones.new(name)
        bone.head = (head[0], head[1], head[2] + GROUND_DZ[0] * (1 if head[2] > 0.5 else 0))
        bone.tail = (tail[0], tail[1], tail[2] + GROUND_DZ[0] * (1 if tail[2] > 0.5 else 0))
    for child, parent in BONE_PARENTS.items():
        arm_data.edit_bones[child].parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def parent_armature_auto(arm, meshes):
    deselect_all()
    for mesh in meshes:
        mesh.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    deselect_all()


def dist_point_segment(p, a, b):
    ab = b - a
    denom = ab.dot(ab)
    t = 0.0 if denom < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / denom))
    return ((a + ab * t) - p).length


def clean_arm_weights(arm, body):
    """Strip arm-bone influence far from the arm chains and renormalize.

    Heat-diffusion auto-weights bleed across the narrow armpit web, so an
    elbow bend would drag half the torso. Verts further than 9 cm from any
    arm segment keep only torso-group weights; arm verts are untouched.
    """
    segs = []
    for name in ("upperarm_D", "upperarm_S", "forearm_D", "forearm_S",
                 "hand_D", "hand_S"):
        pb = arm.pose.bones[name]
        segs.append((name, arm.matrix_world @ pb.head, arm.matrix_world @ pb.tail))
    names = {name for name, _, _ in segs}
    mesh = body.data
    stripped = 0
    for v in mesh.vertices:
        p = body.matrix_world @ v.co
        if min(dist_point_segment(p, a, b) for _, a, b in segs) > 0.09:
            doomed = [body.vertex_groups[g.group].name for g in v.groups
                      if body.vertex_groups[g.group].name in names]
            for name in doomed:
                body.vertex_groups[name].remove([v.index])
                stripped += 1
    renormalized = 0
    for v in mesh.vertices:
        total = sum(g.weight for g in v.groups)
        if total > 1e-6 and abs(total - 1.0) > 1e-4:
            for g in v.groups:
                g.weight /= total
            renormalized += 1
    mesh.update()
    print(f"WEIGHT SURGERY stripped={stripped} renormalized={renormalized}")


def bone_parent(arm, obj, bone_name):
    # Bone parenting via the operator with an active bone: Blender computes
    # the keep-transform parent inverse itself (verified headless: rest-pose
    # world transforms are preserved exactly; hand-derived MPI math is not).
    deselect_all()
    obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    arm.data.bones.active = arm.data.bones[bone_name]
    bpy.ops.object.parent_set(type="BONE")
    deselect_all()
    bpy.context.view_layer.update()


def parent_equipment(arm, objects):
    head_boned = ["Lade_Head", "Lade_Mask", "Lade_Lenses", "Lade_Helmet",
                  "Lade_Headlamp", "Lade_Scarf"]
    chest_boned = ["Lade_Vest", "Lade_Coat", "Lade_Backpack", "Lade_BackBlade",
                   "Lade_Armor"]
    for name in head_boned:
        bone_parent(arm, objects[name], "head")
    bone_parent(arm, objects["Lade_Vest"], "chest")
    bone_parent(arm, objects["Lade_Coat"], "spine")
    bone_parent(arm, objects["Lade_Backpack"], "chest")
    bone_parent(arm, objects["Lade_BackBlade"], "chest")
    bone_parent(arm, objects["Lade_Armor"], "chest")
    # Neutral carry: rifle in the dominant hand, muzzle up.
    rifle = objects["Lade_Rifle"]
    rifle.location = (0.290, 0.075, DZ(0.930))
    rifle.rotation_euler = (1.42, 0, -0.08)
    bpy.context.view_layer.update()
    bone_parent(arm, rifle, "hand_D")


# ---------------------------------------------------------------------------
# Sockets (static empties placed from live world matrices).
# ---------------------------------------------------------------------------

def socket_positions(objects, arm, posed=None):
    """World-space socket targets. All offsets are WORLD offsets added to
    live bone/object positions (bone-local offsets faced the wrong way).
    `posed` carries evaluated head/tail worlds for the baked variant."""
    bpy.context.view_layer.update()

    def head_world(bone_name):
        if posed is not None:
            return posed[bone_name][0]
        return (arm.matrix_world @ arm.pose.bones[bone_name].head).copy()

    def tail_world(bone_name):
        if posed is not None:
            return posed[bone_name][1]
        return (arm.matrix_world @ arm.pose.bones[bone_name].tail).copy()

    rifle = objects["Lade_Rifle"]
    if posed is not None:
        # Baked variant: the 9.5 cm hand bones overshoot the grip with their
        # tails, so mark the solved wrist heads (independent IK output).
        hand_d = head_world("hand_D") + Vector((0, 0.01, 0))
        hand_s = head_world("hand_S") + Vector((0, 0.01, 0))
    else:
        hand_d = tail_world("hand_D") + Vector((0, 0.01, 0))
        hand_s = tail_world("hand_S") + Vector((0, 0.01, 0))
    positions = {
        "Socket_Root": Vector((0, 0, 0.02)),
        "Socket_Head": head_world("head") + Vector((0, 0, 0.12)),
        "Socket_Hand_Dominant": hand_d,
        "Socket_Hand_Support": hand_s,
        "Socket_AttackOrigin": head_world("chest") + Vector((0, 0.30, 0)),
        "Socket_Backpack": objects["Lade_Backpack"].matrix_world.translation
        + Vector((0, -0.08, 0.05)),
        "Socket_Blade": objects["Lade_BackBlade"].matrix_world.translation
        + Vector((0, 0, 0.20)),
        "Socket_RifleGrip": rifle.matrix_world @ Vector((0, 0, 0)),
        "Socket_RifleSupport": rifle.matrix_world @ READY_SUPPORT_LOCAL,
        "Socket_Muzzle": rifle.matrix_world @ Vector((0, 0.57, 0.075)),
    }
    return positions


def place_sockets(positions):
    ensure_collection(SOCKET_COLLECTION)
    for old in list(bpy.data.collections[SOCKET_COLLECTION].objects):
        bpy.data.objects.remove(old, do_unlink=True)
    sockets = {}
    for name in REQUIRED_SOCKETS:
        empty = add_empty(name, positions[name], radius=0.05)
        move_to_collection(empty, SOCKET_COLLECTION)
        sockets[name] = empty
    bpy.context.view_layer.update()
    return sockets


# ---------------------------------------------------------------------------
# Manifests / fixtures / export.
# ---------------------------------------------------------------------------

def collect_objects():
    return {obj.name: obj for obj in bpy.data.collections[COLLECTION].objects}


def write_manifests(objects, sockets, label, fixture_filename):
    mesh_objects = [o for o in objects.values() if o.type == "MESH"]
    corner_min, corner_max = bbox_of(mesh_objects)
    totals = stats_for_objects(mesh_objects)
    per_object = {}
    for name in sorted(objects):
        obj = objects[name]
        entry = {"type": obj.type, "parent": obj.parent.name if obj.parent else None}
        if obj.type == "MESH":
            entry.update(stats_for_objects([obj]))
            entry["materials"] = [m.name if m else None for m in obj.data.materials]
            entry["vertexGroups"] = len(obj.vertex_groups)
        entry["origin"] = [round(v, 4) for v in obj.location]
        per_object[name] = entry
    socket_entries = {}
    for name, empty in sockets.items():
        socket_entries[name] = {
            "parent": empty.parent.name if empty.parent else None,
            "location": [round(v, 4) for v in empty.matrix_world.translation],
        }
    height = corner_max[2] - corner_min[2]
    stats = {
        "generator": "tools/lade_ad2a1 (local humanoid-base construction, original continuous mesh)",
        "variant": label,
        "blenderVersion": bpy.app.version_string,
        "elapsedSeconds": round(time.time() - STARTED, 1),
        "height": round(height, 4),
        "bboxMin": [round(v, 4) for v in corner_min],
        "bboxMax": [round(v, 4) for v in corner_max],
        "groundOffset": round(corner_min[2], 4),
        "totals": totals,
        "objectCount": len(objects),
        "socketCount": len(sockets),
        "materialCount": len(bpy.data.materials),
        "textureCount": 0,
        "validation": {
            "heightInBudget": 1.85 <= height <= 1.90,
            "grounded": abs(corner_min[2]) < 0.01,
            "triangleBudget": totals["triangleCount"] <= 40000,
            "requiredObjects": all(n in objects for n in REQUIRED_OBJECTS),
            "requiredSockets": all(n in sockets for n in REQUIRED_SOCKETS),
        },
    }
    with open(os.path.join(WORK_DIR, f"model_stats_{label}.json"), "w", encoding="utf-8") as h:
        json.dump(stats, h, indent=2)
    used = set()
    for obj in mesh_objects:
        for mat in obj.data.materials:
            if mat is not None:
                used.add(mat.name)
    material_manifest = {
        name: {"ad1Family": spec[5], "color": [round(c, 3) for c in spec[0][:3]]}
        for name, spec in MATERIAL_SPECS.items()
        if name in used
    }
    with open(os.path.join(WORK_DIR, f"material_manifest_{label}.json"), "w", encoding="utf-8") as h:
        json.dump(material_manifest, h, indent=2)
    with open(os.path.join(WORK_DIR, f"object_manifest_{label}.json"), "w", encoding="utf-8") as h:
        json.dump({"objects": per_object, "sockets": socket_entries}, h, indent=2)
    fixture = {
        "generator": stats["generator"],
        "variant": label,
        "height": stats["height"],
        "groundOffset": stats["groundOffset"],
        "totals": stats["totals"],
        "objectNames": sorted(objects),
        "socketNames": sorted(sockets),
        "materialFamilies": {k: v["ad1Family"] for k, v in material_manifest.items()},
        "textureCount": 0,
        "validation": stats["validation"],
    }
    with open(os.path.join(REPO_ROOT, "src", "render", "modelreview", fixture_filename),
              "w", encoding="utf-8") as h:
        json.dump(fixture, h, indent=2)
    print(f"MANIFESTS WRITTEN variant={label}")
    return stats


def export_glb(objects, sockets, path, apply_modifiers, extra=()):
    deselect_all()
    for obj in list(objects.values()) + list(sockets.values()) + list(extra):
        if obj.type == "MESH":
            obj.data.validate(verbose=False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = list(objects.values())[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=apply_modifiers,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    size = os.path.getsize(path)
    print(f"GLB EXPORTED path={path} bytes={size}")
    return size


# ---------------------------------------------------------------------------
# Ready pose: temporary IK bakes both hands onto the across-chest rifle.
# ---------------------------------------------------------------------------

READY_GRIP = (0.140, 0.180, 1.220)
READY_SUPPORT_LOCAL = Vector((0, 0.32, 0.06))


def pose_ready(objects, arm):
    rifle = objects["Lade_Rifle"]
    # Release the neutral carry before repositioning.
    mw = rifle.matrix_world.copy()
    rifle.parent = None
    rifle.matrix_parent_inverse.identity()
    rifle.matrix_world = mw
    bpy.context.view_layer.update()
    support_target = Vector((-0.060, 0.420, 1.280))
    grip = Vector(READY_GRIP)
    direction = (support_target - grip).normalized()
    rifle.location = grip
    rifle.rotation_euler = direction.to_track_quat("Y", "Z").to_euler()
    bpy.context.view_layer.update()
    handguard = rifle.matrix_world @ READY_SUPPORT_LOCAL
    print(f"READY rifle grip={tuple(round(v, 3) for v in grip)} "
          f"support={tuple(round(v, 3) for v in handguard)}")
    grip_empty = add_empty("IK_Grip_D", grip, radius=0.04)
    support_empty = add_empty("IK_Grip_S", handguard, radius=0.04)
    pole_d = add_empty("IK_Pole_D", (0.500, -0.300, 1.100), radius=0.04)
    pole_s = add_empty("IK_Pole_S", (-0.500, -0.300, 1.100), radius=0.04)
    for side, target, pole in (("D", grip_empty, pole_d), ("S", support_empty, pole_s)):
        pb = arm.pose.bones[f"forearm_{side}"]
        ik = pb.constraints.new("IK")
        ik.target = target
        ik.chain_count = 2
        ik.pole_target = pole
        ik.pole_angle = math.radians(90.0 if side == "D" else -90.0)
    # Slight tactical lean over the rifle (legs untouched, feet stay planted).
    arm.pose.bones["spine"].rotation_mode = "XYZ"
    arm.pose.bones["chest"].rotation_mode = "XYZ"
    arm.pose.bones["spine"].rotation_euler = (-0.06, 0, 0)
    arm.pose.bones["chest"].rotation_euler = (-0.05, 0, 0)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    report = {}
    posed = {}
    eval_arm = arm.evaluated_get(depsgraph)
    for bone_name in ("hand_D", "hand_S", "head", "chest", "spine"):
        eb = eval_arm.pose.bones[bone_name]
        m = arm.matrix_world @ eb.matrix
        posed[bone_name] = (m.translation.copy(),
                            (m @ Vector((0, eb.bone.length, 0))).copy())
    for side, target in (("D", grip), ("S", handguard)):
        tail = posed[f"hand_{side}"][0]
        dist = (tail - target).length
        report[side] = round(dist, 4)
        print(f"READY hand_{side} gap={dist:.4f} m")
    return report, [grip_empty, support_empty, pole_d, pole_s], posed


def bake_ready(objects, arm, ik_helpers):
    for name in ("Lade_Body", "Lade_Head", "Lade_Boot_L", "Lade_Boot_R"):
        obj = objects[name]
        activate(obj)
        for mod in [m for m in obj.modifiers if m.type == "ARMATURE"]:
            bpy.ops.object.modifier_apply(modifier=mod.name)
    for obj in objects.values():
        if obj.parent is not None:
            mw = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_parent_inverse.identity()
            obj.matrix_world = mw
    bpy.context.view_layer.update()
    for helper in ik_helpers:
        bpy.data.objects.remove(helper, do_unlink=True)
    bpy.data.objects.remove(arm, do_unlink=True)
    bpy.context.view_layer.update()
    del objects[RIG_NAME]


# ---------------------------------------------------------------------------
# Main.
# ---------------------------------------------------------------------------

def main():
    bpy.ops.wm.read_homefile(use_empty=True)
    builders = [
        ("body", build_skin_body),
        ("head", build_head),
        ("helmet", build_helmet),
        ("lamp", build_headlamp),
        ("mask", build_mask),
        ("lenses", build_lenses),
        ("scarf", build_scarf),
        ("vest", build_vest),
        ("coat", build_coat),
        ("armor", build_armor),
        ("pack", build_pack),
        ("blade", build_blade),
        ("rifle", build_rifle),
    ]
    for label, builder in builders:
        builder()
        print(f"BUILT {label}")
    for side in (-1, 1):
        build_boot(side)
        print(f"BUILT boot_{side}")
    # Global loose-geometry sweep before skinning: stray verts/edges trip
    # export validation but are invisible in stills, so catch them here.
    for obj in collect_objects().values():
        if obj.type != "MESH":
            continue
        activate(obj)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    deselect_all()
    print("LOOSE SWEEP COMPLETE")
    objects = collect_objects()
    arm = build_armature()
    objects[RIG_NAME] = arm
    parent_armature_auto(arm, [objects[n] for n in
                               ("Lade_Body", "Lade_Head", "Lade_Boot_L", "Lade_Boot_R")])
    clean_arm_weights(arm, objects["Lade_Body"])
    parent_equipment(arm, objects)
    objects = collect_objects()
    objects[RIG_NAME] = arm

    # --- Neutral variant (armature + weights preserved for rig proof). ---
    sockets = place_sockets(socket_positions(objects, arm))
    stats_n = write_manifests(objects, sockets, "neutral", "ladeAd2a1Neutral.fixture.json")
    export_glb(objects, sockets, GLB_NEUTRAL, apply_modifiers=False, extra=[arm])
    os.makedirs(REVIEW_DIR, exist_ok=True)
    shutil.copyfile(GLB_NEUTRAL, os.path.join(REVIEW_DIR, GLB_REVIEW_NEUTRAL))
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_NEUTRAL)
    hand_tail = (arm.matrix_world @ arm.pose.bones["hand_D"].tail)
    hand_gap = ((objects["Lade_Rifle"].matrix_world @ Vector((0, 0, 0)))
                - hand_tail).length
    print(f"NEUTRAL hand-to-grip gap={hand_gap:.4f} m")
    print(f"NEUTRAL HEIGHT={stats_n['height']} TRIS={stats_n['totals']['triangleCount']} "
          f"VERTS={stats_n['totals']['vertexCount']}")

    # --- Ready variant (IK-posed, baked, armature removed). ---
    report, helpers, posed = pose_ready(objects, arm)
    ready_positions = socket_positions(objects, arm, posed)
    bake_ready(objects, arm, helpers)
    objects = collect_objects()
    sockets_r = place_sockets(ready_positions)
    stats_r = write_manifests(objects, sockets_r, "ready", "ladeAd2a1Ready.fixture.json")
    export_glb(objects, sockets_r, GLB_READY, apply_modifiers=True)
    shutil.copyfile(GLB_READY, os.path.join(REVIEW_DIR, GLB_REVIEW_READY))
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_READY)
    print(f"READY HEIGHT={stats_r['height']} TRIS={stats_r['totals']['triangleCount']}")
    print(f"READY gaps={report}")
    print("AD2A.1 BUILD COMPLETE")


main()
