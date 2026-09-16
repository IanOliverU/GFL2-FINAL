"""AD2A Lade candidate part 1: legs, boots, torso, vest, coat, arms, head,
mask, lenses. Executed inside Blender by run_gen.py (shares globals).
"""

import bpy

from lade_lib import (
    activate,
    assign_material,
    bake_transforms,
    deselect_all,
    ensure_collection,
    finish_part,
    get_material,
    join_into,
    move_verts,
    subdiv_once,
)

COLLECTION = "Lade"


def new_primitive(op, mat, **kwargs):
    from lade_lib import move_to_collection as _move

    deselect_all()
    op(**kwargs)
    obj = bpy.context.view_layer.objects.active
    assign_material(obj, mat)
    return _move(obj, COLLECTION)


def box(mat, size, location, rotation=(0, 0, 0)):
    return new_primitive(
        bpy.ops.mesh.primitive_cube_add, mat, size=1.0, location=location, rotation=rotation
    )


def cyl(mat, r_top, r_bot, depth, verts, location, rotation=(0, 0, 0)):
    obj = new_primitive(
        bpy.ops.mesh.primitive_cylinder_add,
        mat,
        vertices=verts,
        radius=1.0,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    mesh = obj.data
    top_z = max(v.co.z for v in mesh.vertices)
    bot_z = min(v.co.z for v in mesh.vertices)
    for vert in mesh.vertices:
        t = (vert.co.z - bot_z) / max(1e-6, top_z - bot_z)
        radius = r_bot + (r_top - r_bot) * t
        vert.co.x *= radius
        vert.co.y *= radius
    mesh.update()
    return obj


def ball(mat, radius, location, segments=16, rings=10, scale=(1, 1, 1)):
    obj = new_primitive(
        bpy.ops.mesh.primitive_uv_sphere_add,
        mat,
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=location,
    )
    obj.scale = scale
    return obj


def ring(mat, major, minor, location, rotation=(0, 0, 0), major_seg=20, minor_seg=8):
    return new_primitive(
        bpy.ops.mesh.primitive_torus_add,
        mat,
        major_radius=major,
        minor_radius=minor,
        major_segments=major_seg,
        minor_segments=minor_seg,
        location=location,
        rotation=rotation,
    )


def bevel(obj, width=0.025, segments=2):
    activate(obj)
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=mod.name)


def cut_below(obj, z_cut):
    import bmesh

    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    doomed = [v for v in bm.verts if v.co.z < z_cut]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def set_origin(obj, location):
    bpy.context.scene.cursor.location = location
    activate(obj)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")


def build_leg(side):
    x = side * 0.13
    # Segments overlap (never coplanar, never gapped): caps stay interior.
    thigh = cyl("M_Olive", 0.105, 0.088, 0.36, 14, (x, 0, 0.80))
    knee_band = cyl("M_Olive", 0.088, 0.082, 0.10, 14, (x, 0, 0.60))
    shin = cyl("M_Olive", 0.08, 0.062, 0.42, 14, (x, 0, 0.36))
    move_verts(
        thigh, lambda co: co.z > 0.1 and co.x * side > 0.03, (side * 0.02, 0.0, 0.0)
    )
    leg = join_into(thigh, [knee_band, shin], "M_Olive")
    leg.name = "Lade_Leg_L" if side < 0 else "Lade_Leg_R"
    set_origin(leg, (x, 0, 0.98))
    return leg


def build_boot(side):
    x = side * 0.13
    shaft = cyl("M_Charcoal", 0.088, 0.078, 0.32, 14, (x, 0, 0.285))
    foot = box("M_Charcoal", 1.0, (x, 0.05, 0.08))
    foot.scale = (0.115, 0.27, 0.105)
    move_verts(foot, lambda co: co.y > 0.2, (0.0, 0.02, -0.02))
    move_verts(foot, lambda co: co.y > 0.2 and abs(co.x) > 0.3, (-side * 0.02, 0.0, 0.0))
    sole = box("M_Charcoal", 1.0, (x, 0.05, 0.028))
    sole.scale = (0.125, 0.29, 0.045)
    cuff = cyl("M_OliveDark", 0.098, 0.098, 0.055, 14, (x, 0, 0.43))
    toe_cap = ball("M_GreyArmor", 0.075, (x, 0.16, 0.07), scale=(0.85, 1.0, 0.6))
    boot = join_into(shaft, [foot, sole, cuff, toe_cap], "M_Charcoal")
    boot.name = "Lade_Boot_L" if side < 0 else "Lade_Boot_R"
    set_origin(boot, (x, 0, 0.14))
    return boot


def build_torso():
    pelvis = box("M_OliveDark", 1.0, (0, 0, 1.06))
    pelvis.scale = (0.37, 0.25, 0.24)
    belly = box("M_Olive", 1.0, (0, 0.005, 1.24))
    belly.scale = (0.33, 0.24, 0.22)
    chest = box("M_Olive", 1.0, (0, 0.01, 1.42))
    chest.scale = (0.45, 0.27, 0.24)
    move_verts(chest, lambda co: co.z > 0.08 and abs(co.x) > 0.15, (0.0, 0.0, -0.06))
    torso = join_into(pelvis, [belly, chest], "M_Olive")
    subdiv_once(torso)
    bevel(torso, width=0.03, segments=2)
    torso.name = "Lade_Body"
    set_origin(torso, (0, 0, 1.18))
    return torso


def build_vest():
    front = box("M_Charcoal", 1.0, (0, 0.155, 1.36))
    front.scale = (0.35, 0.07, 0.34)
    back = box("M_Charcoal", 1.0, (0, -0.15, 1.36))
    back.scale = (0.35, 0.07, 0.34)
    pouches = []
    for px in (-0.11, 0.0, 0.11):
        pouch = box("M_Pack", 1.0, (px, 0.20, 1.26))
        pouch.scale = (0.095, 0.06, 0.13)
        pouches.append(pouch)
    strap_l = box("M_Brown", 1.0, (-0.20, 0.0, 1.44))
    strap_l.scale = (0.05, 0.30, 0.06)
    strap_r = box("M_Brown", 1.0, (0.20, 0.0, 1.44))
    strap_r.scale = (0.05, 0.30, 0.06)
    vest = join_into(front, [back, strap_l, strap_r], "M_Charcoal")
    for pouch in pouches:
        assign_material(pouch, "M_Pack")
        deselect_all()
        vest.select_set(True)
        pouch.select_set(True)
        bpy.context.view_layer.objects.active = vest
        bpy.ops.object.join()
    finish_part(vest, "M_Charcoal")
    vest.name = "Lade_Vest"
    set_origin(vest, (0, 0, 1.18))
    return vest


def build_coat():
    skirt = cyl("M_OliveDark", 0.21, 0.30, 0.38, 18, (0, 0, 0.88))
    move_verts(skirt, lambda co: co.z < -0.1 and co.y > 0.1, (0.0, 0.0, -0.035))
    move_verts(skirt, lambda co: co.z < -0.1 and co.y < -0.1, (0.0, 0.0, 0.02))
    collar = ring("M_OliveDark", 0.16, 0.035, (0, 0, 1.56), major_seg=20)
    coat = join_into(skirt, [collar], "M_OliveDark")
    subdiv_once(coat)
    coat.name = "Lade_Coat"
    set_origin(coat, (0, 0, 1.18))
    return coat


def build_arm(side):
    tag = "L" if side < 0 else "R"
    sx = side * 0.30
    upper = cyl("M_Olive", 0.072, 0.06, 0.34, 12, (sx, 0, 1.34))
    elbow = cyl("M_Olive", 0.06, 0.058, 0.08, 12, (sx, 0, 1.17))
    fore = cyl("M_OliveDark", 0.058, 0.048, 0.32, 12, (sx, 0, 1.00))
    mitt = box("M_Charcoal", 1.0, (sx, 0.01, 0.80))
    mitt.scale = (0.075, 0.09, 0.11)
    # Trigger finger reads through a forward mitt extension instead of a
    # separate embedded box (embedded shells create non-manifold junctions).
    move_verts(mitt, lambda co: co.y > 0.3 and co.z < 0.0, (0.0, 0.05, -0.02))
    cuff = cyl("M_Charcoal", 0.068, 0.068, 0.06, 12, (sx, 0, 0.90))
    arm = join_into(upper, [elbow, fore, mitt, cuff], "M_Olive")
    arm.name = f"Lade_Arm_{tag}"
    set_origin(arm, (sx, 0, 1.55))
    return arm


def build_head():
    skull = ball("M_Charcoal", 0.105, (0, -0.01, 1.71), scale=(0.92, 1.02, 1.05))
    jaw = box("M_Charcoal", 1.0, (0, 0.03, 1.63))
    jaw.scale = (0.15, 0.16, 0.10)
    head = join_into(skull, [jaw], "M_Charcoal")
    head.name = "Lade_Head"
    set_origin(head, (0, 0, 1.60))
    return head


def build_mask():
    face = ball("M_MaskBody", 0.115, (0, 0.030, 1.655), segments=24, rings=14, scale=(0.90, 0.78, 1.0))
    cut_below(face, -0.02)
    snout = cyl("M_MaskBody", 0.045, 0.062, 0.13, 14, (0, 0.185, 1.615), rotation=(1.25, 0, 0))
    canister = cyl("M_MaskBody", 0.058, 0.058, 0.10, 18, (0, 0.220, 1.515))
    ridges = [
        ring("M_OliveDark", 0.058, 0.008, (0, 0.220, 1.495 + i * 0.022), major_seg=18)
        for i in range(3)
    ]
    valve_l = cyl("M_OliveDark", 0.02, 0.02, 0.03, 10, (-0.10, 0.10, 1.615), rotation=(0, 1.2, 0))
    valve_r = cyl("M_OliveDark", 0.02, 0.02, 0.03, 10, (0.10, 0.10, 1.615), rotation=(0, -1.2, 0))
    mask = join_into(face, [snout, canister, valve_l, valve_r], "M_MaskBody")
    for ridge in ridges:
        assign_material(ridge, "M_OliveDark")
        deselect_all()
        mask.select_set(True)
        ridge.select_set(True)
        bpy.context.view_layer.objects.active = mask
        bpy.ops.object.join()
    finish_part(mask, "M_MaskBody", shade_flat=True)
    mask.name = "Lade_Mask"
    set_origin(mask, (0, 0, 1.60))
    return mask


def build_lenses():
    parts = []
    for side in (-1, 1):
        rim = ring(
            "M_LensRim",
            0.052,
            0.014,
            (side * 0.062, 0.157, 1.665),
            rotation=(0.15, side * -0.12, 0),
            major_seg=20,
        )
        dome = ball(
            "M_Lens", 0.049, (side * 0.062, 0.150, 1.665), scale=(1.0, 0.30, 1.0)
        )
        dome.rotation_euler = (0.15, side * -0.12, 0)
        bake_transforms(dome)
        parts.append((rim, dome))
    for rim, _ in parts:
        bake_transforms(rim)
    lenses = join_into(parts[0][0], [parts[0][1], parts[1][0], parts[1][1]], "M_LensRim")
    import bmesh

    mesh = lenses.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    lens_mat = get_material("M_Lens")
    if len(lenses.data.materials) < 2:
        lenses.data.materials.append(lens_mat)
    lens_index = list(lenses.data.materials).index(lens_mat)
    for face in bm.faces:
        center = face.calc_center_median()
        # Ellipsoid test around each glass dome: keeps the pale material on
        # the domes while the dark rims stay dark metal.
        dx = (abs(center.x) - 0.062) / 0.049
        dy = (center.y - 0.150) / 0.016
        dz = (center.z - 1.665) / 0.049
        if dx * dx + dy * dy + dz * dz < 1.15:
            face.material_index = lens_index
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    finish_part(lenses, "M_LensRim")
    lenses.name = "Lade_Lenses"
    set_origin(lenses, (0, 0, 1.60))
    return lenses
