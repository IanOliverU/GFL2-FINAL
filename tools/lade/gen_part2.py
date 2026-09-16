"""AD2A Lade candidate part 2: helmet, lamp, scarf, pack, blade, rifle,
armor, sockets, parenting, neutral pose, export, manifests.
Executed inside Blender by run_gen.py after gen_part1 (shares globals).
"""

import json
import math
import os
import time

import bmesh
import bpy

from lade_lib import (
    BLEND_PATH,
    GLB_PATH,
    REPO_ROOT,
    WORK_DIR,
    activate,
    add_empty,
    assign_material,
    bbox_of,
    clear_scene,
    deselect_all,
    ensure_collection,
    finish_part,
    get_material,
    join_into,
    move_to_collection,
    move_verts,
    stats_for_objects,
    subdiv_once,
)

COLLECTION = "Lade"
SOCKET_COLLECTION = "Lade_Sockets"
STARTED = time.time()


def apply_all(obj):
    activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def assign_mat_by_selector(obj, mat_name, selector):
    mesh = obj.data
    mat = get_material(mat_name)
    if mat.name not in [m.name if m else "" for m in mesh.materials]:
        mesh.materials.append(mat)
    index = [m.name if m else "" for m in mesh.materials].index(mat.name)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    for face in bm.faces:
        if selector(face.calc_center_median()):
            face.material_index = index
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def make_mark_pale():
    mat = bpy.data.materials.get("M_MarkPale")
    if mat is None:
        mat = bpy.data.materials.new("M_MarkPale")
        mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF")
        principled.inputs["Base Color"].default_value = (0.82, 0.80, 0.73, 1.0)
        principled.inputs["Roughness"].default_value = 0.85
    return mat


# ---------------------------------------------------------------------------
# Helmet, lamp, scarf
# ---------------------------------------------------------------------------


def build_helmet():
    dome = ball("M_Olive", 0.155, (0, -0.005, 1.705), segments=24, rings=14, scale=(1.02, 1.08, 0.85))
    cut_below(dome, -0.035)
    brim = cyl("M_Olive", 0.150, 0.190, 0.055, 20, (0, -0.005, 1.685))
    brim.scale.y = 1.06
    band = ring("M_OliveDark", 0.148, 0.018, (0, -0.005, 1.685), major_seg=20)
    helmet = join_into(dome, [brim, band], "M_Olive")
    helmet.name = "Lade_Helmet"
    set_origin(helmet, (0, 0, 1.60))
    return helmet


def build_headlamp():
    body = cyl(
        "M_Charcoal", 0.026, 0.030, 0.045, 14, (0.095, 0.120, 1.770), rotation=(1.5708, 0, 0)
    )
    apply_all(body)
    lens = ball("M_LampLens", 0.021, (0.095, 0.144, 1.770), scale=(1.0, 0.5, 1.0))
    mount = box("M_Charcoal", 1.0, (0.095, 0.100, 1.754))
    mount.scale = (0.05, 0.04, 0.04)
    lamp = join_into(body, [mount], "M_Charcoal")
    assign_material(lens, "M_LampLens")
    deselect_all()
    lamp.select_set(True)
    lens.select_set(True)
    bpy.context.view_layer.objects.active = lamp
    bpy.ops.object.join()
    finish_part(lamp, "M_Charcoal")
    # Cable: bezier over the helmet shell, converted to a tube mesh.
    deselect_all()
    bpy.ops.curve.primitive_bezier_curve_add(location=(0.095, 0.135, 1.788))
    curve_obj = bpy.context.view_layer.objects.active
    spline = curve_obj.data.splines[0]
    spline.bezier_points[0].co = (0.0, 0.0, 0.0)
    spline.bezier_points[0].handle_left = (-0.05, 0.0, 0.02)
    spline.bezier_points[0].handle_right = (0.05, 0.02, 0.03)
    spline.bezier_points[1].co = (-0.03, -0.02, 0.075)
    spline.bezier_points[1].handle_left = (-0.06, -0.01, 0.05)
    spline.bezier_points[1].handle_right = (0.02, -0.05, 0.03)
    spline.bezier_points.add(1)
    extra = spline.bezier_points[len(spline.bezier_points) - 1]
    extra.co = (-0.17, -0.12, 0.0)
    extra.handle_left = (-0.10, -0.10, 0.04)
    extra.handle_right = (-0.22, -0.14, -0.03)
    curve_obj.data.bevel_depth = 0.008
    curve_obj.data.bevel_resolution = 2
    activate(curve_obj)
    bpy.ops.object.convert(target="MESH")
    cable = bpy.context.view_layer.objects.active
    move_to_collection(cable, COLLECTION)
    lamp = join_into(lamp, [cable], "M_Charcoal")
    lamp.name = "Lade_Headlamp"
    set_origin(lamp, (0, 0, 1.60))
    return lamp


def build_scarf():
    wrap = ring("M_Scarf", 0.122, 0.045, (0, 0, 1.575), major_seg=24)
    wrap.scale = (1.0, 1.0, 0.8)
    deselect_all()
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0.17, 1.43))
    flap = bpy.context.view_layer.objects.active
    assign_material(flap, "M_Scarf")
    move_to_collection(flap, COLLECTION)
    # Stand the sheet upright: local +Y becomes world +Z (top edge first).
    flap.rotation_euler = (1.5708, 0, 0)
    flap.scale = (0.24, 0.30, 1.0)
    apply_all(flap)
    activate(flap)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.subdivide(number_cuts=5)
    bpy.ops.object.mode_set(mode="OBJECT")
    mesh = flap.data
    for vert in mesh.vertices:
        t = (0.15 - vert.co.y) / 0.3
        t = max(0.0, min(1.0, t))
        vert.co.z -= math.sin(t * math.pi) * 0.05
        vert.co.x *= 1.0 + t * 0.5
    mesh.update()
    activate(flap)
    solid = flap.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.012
    bpy.ops.object.modifier_apply(modifier=solid.name)
    cape = ring("M_Scarf", 0.175, 0.045, (0, 0, 1.545), major_seg=24)
    cape.scale = (1.15, 1.0, 0.55)
    scarf = join_into(wrap, [flap, cape], "M_Scarf", shade_flat=False)
    scarf.name = "Lade_Scarf"
    set_origin(scarf, (0, 0, 1.575))
    return scarf


# ---------------------------------------------------------------------------
# Backpack, blade, rifle, armor
# ---------------------------------------------------------------------------


def build_pack():
    main = box("M_Pack", 1.0, (0, -0.27, 1.32))
    main.scale = (0.34, 0.20, 0.42)
    for part in (main,):
        apply_all(part)
    subdiv_once(main)
    bevel(main, width=0.045, segments=3)
    apply_all(main)
    roll = cyl("M_OliveDark", 0.095, 0.095, 0.40, 16, (0, -0.28, 1.565), rotation=(0, 1.5708, 0))
    strap_a = box("M_Brown", 1.0, (-0.10, -0.27, 1.32))
    strap_a.scale = (0.05, 0.21, 0.43)
    strap_b = box("M_Brown", 1.0, (0.10, -0.27, 1.32))
    strap_b.scale = (0.05, 0.21, 0.43)
    pouch = box("M_OliveDark", 1.0, (-0.21, -0.27, 1.22))
    pouch.scale = (0.08, 0.12, 0.20)
    for part in (roll, strap_a, strap_b, pouch):
        apply_all(part)
    pack = join_into(main, [roll, strap_a, strap_b, pouch], "M_Pack")
    assign_mat_by_selector(pack, "M_OliveDark", lambda co: co.z > 1.47)
    assign_mat_by_selector(
        pack, "M_Brown", lambda co: abs(abs(co.x) - 0.10) < 0.035 and co.z < 1.5
    )
    finish_part(pack, "M_Pack")
    pack.name = "Lade_Backpack"
    set_origin(pack, (0, -0.27, 1.18))
    return pack


def build_blade():
    blade = box("M_Rust", 1.0, (0, 0, 0))
    blade.scale = (0.025, 0.15, 0.62)
    apply_all(blade)
    move_verts(blade, lambda co: co.z > 0.22, (0.0, -0.055, 0.02))
    guard = box("M_Charcoal", 1.0, (0, 0, -0.34))
    guard.scale = (0.05, 0.20, 0.05)
    grip = cyl("M_Brown", 0.028, 0.028, 0.16, 10, (0, 0, -0.42))
    apply_all(guard)
    apply_all(grip)
    full = join_into(blade, [guard, grip], "M_Rust")
    assign_mat_by_selector(full, "M_GunSteel", lambda co: co.z > -0.30 and co.y < -0.055)
    assign_mat_by_selector(
        full, "M_Charcoal", lambda co: co.z <= -0.30 and co.z > -0.37 and abs(co.y) < 0.11
    )
    assign_mat_by_selector(full, "M_Brown", lambda co: co.z <= -0.37)
    finish_part(full, "M_Rust")
    full.name = "Lade_BackBlade"
    # Mesh is baked in world space; place it once diagonally across the pack.
    full.location = (-0.17, -0.38, 1.50)
    full.rotation_euler = (0.12, -0.12, 0.80)
    bpy.context.view_layer.update()
    set_origin(full, (-0.14, -0.34, 1.22))
    return full


def build_rifle():
    receiver = box("M_WeaponMetal", 1.0, (0, 0, 0))
    receiver.scale = (0.075, 0.42, 0.10)
    stock = box("M_WeaponMetal", 1.0, (0, -0.30, 0.01))
    stock.scale = (0.06, 0.22, 0.11)
    barrel = cyl("M_GunSteel", 0.016, 0.016, 0.34, 12, (0, 0.36, 0.02), rotation=(1.5708, 0, 0))
    handguard = box("M_Wood", 1.0, (0, 0.17, -0.005))
    handguard.scale = (0.07, 0.20, 0.085)
    mag = box("M_WeaponMetal", 1.0, (0, -0.03, -0.11))
    mag.scale = (0.055, 0.07, 0.20)
    mag.rotation_euler = (0.30, 0, 0)
    grip = box("M_Brown", 1.0, (0, -0.155, -0.085))
    grip.scale = (0.05, 0.06, 0.13)
    grip.rotation_euler = (-0.35, 0, 0)
    sight_f = box("M_GunSteel", 1.0, (0, 0.30, 0.075))
    sight_f.scale = (0.02, 0.03, 0.05)
    sight_r = box("M_GunSteel", 1.0, (0, -0.13, 0.075))
    sight_r.scale = (0.03, 0.04, 0.05)
    rail = box("M_Charcoal", 1.0, (0.052, 0.05, 0.0))
    rail.scale = (0.015, 0.30, 0.03)
    bayonet = box("M_GunSteel", 1.0, (0, 0.30, -0.055))
    bayonet.scale = (0.012, 0.24, 0.045)
    muzzle = cyl("M_Charcoal", 0.026, 0.026, 0.05, 12, (0, 0.52, 0.02), rotation=(1.5708, 0, 0))
    parts = [receiver, stock, barrel, handguard, mag, grip, sight_f, sight_r, rail, bayonet, muzzle]
    for part in parts[1:]:
        apply_all(part)
    apply_all(receiver)
    rifle = join_into(receiver, parts[1:], "M_WeaponMetal")
    assign_mat_by_selector(rifle, "M_GunSteel", lambda co: co.z > 0.06 or (co.y > 0.15 and co.z < -0.03))
    assign_mat_by_selector(
        rifle, "M_Wood", lambda co: abs(co.x) < 0.0355 and abs(co.y - 0.17) < 0.10 and abs(co.z + 0.005) < 0.043
    )
    assign_mat_by_selector(rifle, "M_Brown", lambda co: abs(co.y + 0.155) < 0.08 and co.z < -0.02)
    assign_mat_by_selector(rifle, "M_Charcoal", lambda co: abs(co.x - 0.052) < 0.009)
    finish_part(rifle, "M_WeaponMetal")
    rifle.name = "Lade_Rifle"
    set_origin(rifle, (0, -0.05, -0.02))
    return rifle


def build_armor():
    parts = []
    pauldron_r = ball("M_GreyArmor", 0.10, (0.30, 0, 1.56), segments=20, rings=12, scale=(1.1, 1.0, 0.7))
    pauldron_l = ball("M_GreyArmor", 0.085, (-0.30, 0, 1.56), segments=20, rings=12, scale=(1.0, 1.0, 0.65))
    mark = box("M_MarkPale", 1.0, (0.315, 0.055, 1.60))
    mark.scale = (0.07, 0.02, 0.045)
    mark.rotation_euler = (0.0, 0.0, 0.5)
    parts.extend([pauldron_r, pauldron_l, mark])
    for side in (-1, 1):
        elbow = ball("M_GreyArmor", 0.068, (side * 0.30, -0.01, 1.17), scale=(1.0, 1.0, 0.8))
        knee = box("M_GreyArmor", 1.0, (side * 0.13, 0.085, 0.56))
        knee.scale = (0.11, 0.06, 0.13)
        pouch = box("M_Brown", 1.0, (side * 0.21, 0.04, 0.86))
        pouch.scale = (0.09, 0.10, 0.14)
        parts.extend([elbow, knee, pouch])
    wrap_rings = [
        ring("M_Charcoal", 0.062, 0.013, (-0.30, 0, 0.95 + i * 0.05), major_seg=16)
        for i in range(3)
    ]
    parts.extend(wrap_rings)
    wrap_cuff = cyl("M_Charcoal", 0.070, 0.070, 0.05, 12, (-0.30, 0, 0.885))
    parts.append(wrap_cuff)
    accent = box("M_AccentRed", 1.0, (0.12, 0.205, 1.44))
    accent.scale = (0.05, 0.015, 0.07)
    parts.append(accent)
    for part in parts[1:]:
        apply_all(part)
    apply_all(parts[0])
    armor = join_into(parts[0], parts[1:], "M_GreyArmor")
    make_mark_pale()
    assign_mat_by_selector(
        armor, "M_MarkPale", lambda co: abs(co.x - 0.315) < 0.06 and co.z > 1.57
    )
    assign_mat_by_selector(
        armor, "M_Charcoal", lambda co: (abs(co.x + 0.30) < 0.075 and co.z < 1.12) or co.z < 0.0
    )
    assign_mat_by_selector(
        armor, "M_Brown", lambda co: abs(abs(co.x) - 0.21) < 0.06 and abs(co.z - 0.86) < 0.08
    )
    assign_mat_by_selector(
        armor, "M_AccentRed", lambda co: abs(co.x - 0.12) < 0.035 and co.z > 1.40
    )
    finish_part(armor, "M_GreyArmor")
    armor.name = "Lade_Armor"
    set_origin(armor, (0, 0, 1.18))
    return armor


# ---------------------------------------------------------------------------
# Assembly: parenting, sockets, neutral pose, export, manifests
# ---------------------------------------------------------------------------


def parent_keep(child, parent):
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


NEUTRAL = {
    "Lade_Arm_L": (0.10, 0.0, 0.10),
    "Lade_Arm_R": (0.10, 0.0, -0.10),
    "Lade_Leg_L": (-0.05, 0.0, 0.0),
    "Lade_Leg_R": (0.05, 0.0, 0.0),
    "Lade_Boot_L": (-0.05, 0.0, 0.0),
    "Lade_Boot_R": (0.05, 0.0, 0.0),
    "Lade_Head": (0.0, 0.0, 0.0),
    "Lade_Body": (0.0, 0.0, 0.0),
}

RIFLE_NEUTRAL_LOCATION = (0.30, -0.046, 0.954)
RIFLE_NEUTRAL_ROTATION = (1.45, 0.0, 0.06)


def apply_neutral_pose(objects):
    for name, euler in NEUTRAL.items():
        obj = objects.get(name)
        if obj is not None:
            obj.rotation_euler = euler
    rifle = objects.get("Lade_Rifle")
    if rifle is not None:
        rifle.location = RIFLE_NEUTRAL_LOCATION
        rifle.rotation_euler = RIFLE_NEUTRAL_ROTATION


def build_sockets(objects):
    ensure_collection(SOCKET_COLLECTION)
    defs = [
        ("Socket_Root", (0, 0, 0.02), None, 0.09),
        ("Socket_Head", (0, 0.03, 1.66), "Lade_Head", 0.07),
        ("Socket_Hand_Dominant", (0.30, 0.01, 0.80), "Lade_Arm_R", 0.05),
        ("Socket_Hand_Support", (-0.30, 0.01, 0.80), "Lade_Arm_L", 0.05),
        ("Socket_RifleGrip", (0.30, 0.02, 0.79), "Lade_Rifle", 0.04),
        ("Socket_RifleSupport", (0.30, -0.02, 1.12), "Lade_Rifle", 0.04),
        ("Socket_Muzzle", (0.30, 0.0, 1.50), "Lade_Rifle", 0.05),
        ("Socket_Backpack", (0, -0.30, 1.32), "Lade_Backpack", 0.06),
        ("Socket_Blade", (-0.14, -0.34, 1.30), "Lade_BackBlade", 0.05),
        ("Socket_AttackOrigin", (0, 0.30, 1.30), "Lade_Body", 0.06),
    ]
    sockets = {}
    for name, location, parent_name, radius in defs:
        empty = add_empty(name, location, radius)
        move_to_collection(empty, SOCKET_COLLECTION)
        if parent_name is not None and parent_name in objects:
            parent_keep(empty, objects[parent_name])
        sockets[name] = empty
    return sockets


def collect_objects():
    collection = ensure_collection(COLLECTION)
    return {obj.name: obj for obj in collection.objects}


def write_manifests(objects, sockets, elapsed_s):
    from lade_lib import MATERIAL_SPECS

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
        "generator": "tools/lade (original procedural construction)",
        "blenderVersion": bpy.app.version_string,
        "elapsedSeconds": round(elapsed_s, 1),
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
    with open(os.path.join(WORK_DIR, "model_stats.json"), "w", encoding="utf-8") as h:
        json.dump(stats, h, indent=2)
    used_materials = set()
    for obj in mesh_objects:
        for mat in obj.data.materials:
            if mat is not None:
                used_materials.add(mat.name)
    material_manifest = {
        name: {"ad1Family": spec[5], "color": [round(c, 3) for c in spec[0][:3]]}
        for name, spec in MATERIAL_SPECS.items()
        if name in used_materials
    }
    with open(os.path.join(WORK_DIR, "material_manifest.json"), "w", encoding="utf-8") as h:
        json.dump(material_manifest, h, indent=2)
    with open(os.path.join(WORK_DIR, "object_manifest.json"), "w", encoding="utf-8") as h:
        json.dump({"objects": per_object, "sockets": socket_entries}, h, indent=2)
    fixture = {
        "generator": stats["generator"],
        "height": stats["height"],
        "groundOffset": stats["groundOffset"],
        "totals": stats["totals"],
        "objectNames": sorted(objects),
        "socketNames": sorted(sockets),
        "materialFamilies": {k: v["ad1Family"] for k, v in material_manifest.items()},
        "textureCount": 0,
        "validation": stats["validation"],
    }
    fixture_path = os.path.join(
        REPO_ROOT, "src", "render", "modelreview", "ladeCandidate.fixture.json"
    )
    with open(fixture_path, "w", encoding="utf-8") as h:
        json.dump(fixture, h, indent=2)
    print("MANIFESTS WRITTEN")
    return stats


REQUIRED_OBJECTS = [
    "Lade_Body", "Lade_Head", "Lade_Mask", "Lade_Lenses", "Lade_Helmet",
    "Lade_Headlamp", "Lade_Scarf", "Lade_Vest", "Lade_Backpack", "Lade_Rifle",
    "Lade_BackBlade", "Lade_Armor", "Lade_Boot_L", "Lade_Boot_R",
]

REQUIRED_SOCKETS = [
    "Socket_Root", "Socket_Head", "Socket_Hand_Dominant", "Socket_Hand_Support",
    "Socket_RifleGrip", "Socket_RifleSupport", "Socket_Muzzle",
    "Socket_Backpack", "Socket_Blade", "Socket_AttackOrigin",
]


def export_glb(objects, sockets):
    deselect_all()
    for obj in list(objects.values()) + list(sockets.values()):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = list(objects.values())[0]
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    size = os.path.getsize(GLB_PATH)
    print(f"GLB EXPORTED bytes={size}")
    return size


def main():
    clear_scene()
    builders = [
        ("torso", build_torso),
        ("vest", build_vest),
        ("coat", build_coat),
        ("pack", build_pack),
        ("blade", build_blade),
        ("rifle", build_rifle),
        ("armor", build_armor),
        ("head", build_head),
        ("mask", build_mask),
        ("lenses", build_lenses),
        ("helmet", build_helmet),
        ("lamp", build_headlamp),
        ("scarf", build_scarf),
    ]
    for label, builder in builders:
        builder()
        print(f"BUILT {label}")
    for side in (-1, 1):
        build_leg(side)
        build_boot(side)
        build_arm(side)
    objects = collect_objects()
    torso = objects["Lade_Body"]
    for name in (
        "Lade_Vest", "Lade_Coat", "Lade_Backpack", "Lade_BackBlade",
        "Lade_Armor", "Lade_Head", "Lade_Arm_L", "Lade_Arm_R",
        "Lade_Scarf",
    ):
        parent_keep(objects[name], torso)
    parent_keep(objects["Lade_Helmet"], objects["Lade_Head"])
    parent_keep(objects["Lade_Mask"], objects["Lade_Head"])
    parent_keep(objects["Lade_Lenses"], objects["Lade_Head"])
    parent_keep(objects["Lade_Headlamp"], objects["Lade_Helmet"])
    apply_neutral_pose(objects)
    sockets = build_sockets(objects)
    bpy.context.view_layer.update()
    stats = write_manifests(objects, sockets, time.time() - STARTED)
    export_glb(objects, sockets)
    import shutil

    review_dir = os.path.join(REPO_ROOT, "public", "model-review")
    os.makedirs(review_dir, exist_ok=True)
    shutil.copyfile(GLB_PATH, os.path.join(review_dir, "lade-candidate.glb"))
    print("REVIEW GLB COPIED (local-only, never committed)")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print(f"HEIGHT={stats['height']} TRIS={stats['totals']['triangleCount']} "
          f"VERTS={stats['totals']['vertexCount']}")
    print(f"VALIDATION={stats['validation']}")
    print("AD2A ITERATION 1 BUILD COMPLETE")


main()