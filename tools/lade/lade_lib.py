"""AD2A Lade candidate: shared Blender helpers (local-only production script).

All geometry is original and authored by this script. No reference image is
loaded, traced, textured, or embedded at any point.
"""

import math
import os
import sys

import bpy

REPO_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

WORK_DIR = os.path.join(REPO_ROOT, "assets-dev", "lade")
RENDER_DIR = os.path.join(WORK_DIR, "renders")
BLEND_PATH = os.path.join(WORK_DIR, "lade_candidate.blend")
GLB_PATH = os.path.join(WORK_DIR, "lade_candidate.glb")

# ---------------------------------------------------------------------------
# Scene setup
# ---------------------------------------------------------------------------


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.armatures,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def deselect_all():
    bpy.ops.object.select_all(action="DESELECT")


def activate(obj):
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


# ---------------------------------------------------------------------------
# Materials (original solid colors mapped to AD1 cel families)
# ---------------------------------------------------------------------------

# name -> (base color RGBA, metallic, roughness, emission color or None,
#           emission strength, ad1 family)
MATERIAL_SPECS = {
    "M_Olive": ((0.32, 0.35, 0.24, 1.0), 0.0, 0.85, None, 0.0, "varjagerCloth"),
    "M_OliveDark": ((0.22, 0.25, 0.17, 1.0), 0.0, 0.9, None, 0.0, "varjagerCloth"),
    "M_Charcoal": ((0.16, 0.16, 0.155, 1.0), 0.0, 0.9, None, 0.0, "varjagerArmor"),
    "M_Brown": ((0.38, 0.29, 0.18, 1.0), 0.0, 0.8, None, 0.0, "envSoil"),
    "M_GreyArmor": ((0.48, 0.49, 0.46, 1.0), 0.15, 0.6, None, 0.0, "varjagerArmor"),
    "M_WeaponMetal": ((0.13, 0.13, 0.14, 1.0), 0.55, 0.45, None, 0.0, "weaponMetal"),
    "M_GunSteel": ((0.55, 0.57, 0.56, 1.0), 0.6, 0.4, None, 0.0, "weaponMetal"),
    "M_Wood": ((0.4, 0.3, 0.19, 1.0), 0.0, 0.75, None, 0.0, "weaponMetal"),
    "M_Pack": ((0.36, 0.34, 0.27, 1.0), 0.0, 0.9, None, 0.0, "varjagerCloth"),
    "M_Lens": ((0.78, 0.86, 0.83, 1.0), 0.35, 0.25, None, 0.0, "interactive"),
    "M_LensRim": ((0.2, 0.22, 0.24, 1.0), 0.5, 0.45, None, 0.0, "weaponMetal"),
    "M_LampLens": ((1.0, 0.9, 0.6, 1.0), 0.0, 0.5, (1.0, 0.85, 0.55), 1.6, "interactive"),
    "M_Rust": ((0.45, 0.26, 0.14, 1.0), 0.1, 0.8, None, 0.0, "weaponMetal"),
    "M_Scarf": ((0.5, 0.48, 0.55, 1.0), 0.0, 0.95, None, 0.0, "varjagerCloth"),
    "M_AccentRed": ((0.72, 0.2, 0.15, 1.0), 0.0, 0.7, None, 0.0, "interactive"),
    "M_MaskBody": ((0.35, 0.4, 0.42, 1.0), 0.05, 0.7, None, 0.0, "varjagerArmor"),
    "M_MarkPale": ((0.82, 0.80, 0.73, 1.0), 0.0, 0.85, None, 0.0, "varjagerArmor"),
}


def get_material(name):
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat
    spec = MATERIAL_SPECS[name]
    color, metallic, roughness, emission, emission_strength, _ = spec
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    # Viewport display color drives the Workbench review renders; keep it
    # identical to the Principled base color so reviews match the export.
    mat.diffuse_color = color
    mat.metallic = metallic
    mat.roughness = roughness
    principled = mat.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission is not None:
        principled.inputs["Emission Color"].default_value = (*emission, 1.0)
        principled.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign_material(obj, name):
    mat = get_material(name)
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


# ---------------------------------------------------------------------------
# Mesh construction helpers
# ---------------------------------------------------------------------------


def finish_part(obj, mat_name, shade_flat=True):
    """Apply scale, bevel-clean, recalc normals, assign material."""
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if shade_flat:
        bpy.ops.object.shade_flat()
    else:
        bpy.ops.object.shade_smooth()
        for poly in obj.data.polygons:
            poly.use_smooth = True
    assign_material(obj, mat_name)
    return obj


def join_into(target, parts, mat_name, shade_flat=True):
    deselect_all()
    target.select_set(True)
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return finish_part(target, mat_name, shade_flat)


def move_verts(obj, selector, offset):
    mesh = obj.data
    for vert in mesh.vertices:
        if selector(vert.co):
            vert.co.x += offset[0]
            vert.co.y += offset[1]
            vert.co.z += offset[2]
    mesh.update()


def look_at(obj, target):
    from mathutils import Vector

    point = Vector(bpy.data.objects[target].location) if isinstance(target, str) else Vector(target)
    direction = point - obj.location
    rot = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = rot.to_euler()


def ensure_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, name):
    """Link obj to the named collection and unlink from all others."""
    target = ensure_collection(name)
    if obj.name not in target.objects:
        target.objects.link(obj)
    for coll in list(obj.users_collection):
        if coll != target:
            coll.objects.unlink(obj)
    return obj


def bake_transforms(obj):
    """Bake location/rotation/scale into the mesh (identity object)."""
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def subdiv_once(obj):
    """One edit-mode subdivision over all faces (density for hero masses)."""
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide()
    bpy.ops.object.mode_set(mode="OBJECT")


def stats_for_objects(objects):
    tris = 0
    verts = 0
    meshes = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        meshes += 1
        mesh = obj.data
        verts += len(mesh.vertices)
        for poly in mesh.polygons:
            tris += max(1, len(poly.vertices) - 2)
    return {"meshCount": meshes, "vertexCount": verts, "triangleCount": tris}


# ---------------------------------------------------------------------------
# Camera / lighting / render presets (review only)
# ---------------------------------------------------------------------------


def setup_workbench():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "studio.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_backface_culling = False
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    return scene


def add_camera(name, location, look_target, ortho=False, ortho_scale=3.0, lens=50.0):
    cam_data = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    look_at(cam, look_target)
    if ortho:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho_scale
    else:
        cam_data.type = "PERSP"
        cam_data.lens = lens
    return cam


def bind_camera(cam):
    bpy.context.scene.camera = cam


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def add_empty(name, location, radius=0.05):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = radius
    empty.location = location
    bpy.context.scene.collection.objects.link(empty)
    return empty


def bbox_of(objects):
    corner_min = [math.inf, math.inf, math.inf]
    corner_max = [-math.inf, -math.inf, -math.inf]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            for vert in mesh.vertices:
                world = obj.matrix_world @ vert.co
                for axis in range(3):
                    corner_min[axis] = min(corner_min[axis], world[axis])
                    corner_max[axis] = max(corner_max[axis], world[axis])
        finally:
            evaluated.to_mesh_clear()
    return corner_min, corner_max
