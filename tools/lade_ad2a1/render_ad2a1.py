"""AD2A.1 Blender stills: review views, clay, silhouette, wireframe, macros,
poses, and deformation tests (all local-only, never committed).

Usage: blender --background --python tools/lade_ad2a1/render_ad2a1.py -- <job>
Jobs: neutral | ready | poses | deform | all
"""

import math
import os
import sys

import bpy

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)
from humanoid_lib import (  # noqa: E402
    BLEND_NEUTRAL,
    BLEND_READY,
    COLLECTION,
    RENDER_DIR,
    SOCKET_COLLECTION,
)

os.makedirs(RENDER_DIR, exist_ok=True)

TARGET = (0, 0, 0.95)
VIEWS = {
    "front": dict(location=(0, 4.6, 1.0), ortho=True, ortho_scale=3.8),
    "side": dict(location=(4.6, 0, 1.0), ortho=True, ortho_scale=3.8),
    "side-left": dict(location=(-4.6, 0, 1.0), ortho=True, ortho_scale=3.8),
    "rear": dict(location=(0, -4.6, 1.0), ortho=True, ortho_scale=3.8),
    "three-quarter": dict(location=(3.3, 3.3, 1.6), ortho=True, ortho_scale=3.8),
    "top": dict(location=(0, 0, 6.5), ortho=True, ortho_scale=3.8),
}

MACRO = {
    "shoulder": dict(target=(0.25, 0.05, 1.44), location=(1.8, 2.2, 1.7), ortho_scale=1.6),
    "hip": dict(target=(0.12, 0.05, 0.90), location=(1.9, 2.3, 1.2), ortho_scale=1.8),
    "knee": dict(target=(0.11, 0.05, 0.55), location=(1.8, 2.2, 0.8), ortho_scale=1.6),
    "face": dict(target=(0, 0.10, 1.69), location=(0, 2.0, 1.69), ortho_scale=0.7),
}


def setup_workbench():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "studio.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AD2A1_World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    return scene


def setup_cycles_silhouette():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 2
    scene.cycles.use_denoising = False
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AD2A1_World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    return scene


def setup_cycles_wire():
    scene = setup_cycles_silhouette()
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.16, 0.16, 0.17, 1.0)
    return scene


def add_camera(name, location, look_target, ortho=False, ortho_scale=3.0, lens=50.0):
    from mathutils import Vector

    cam_data = bpy.data.cameras.new(name)
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    direction = Vector(look_target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    if ortho:
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = ortho_scale
    else:
        cam_data.type = "PERSP"
        cam_data.lens = lens
    return cam


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED {os.path.basename(path)}")


def override_materials(make_mat):
    saved = {}
    for obj in bpy.data.collections[COLLECTION].objects:
        if obj.type != "MESH":
            continue
        saved[obj] = list(obj.data.materials)
        mat = make_mat(obj)
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return saved


def restore_materials(saved):
    for obj, mats in saved.items():
        obj.data.materials.clear()
        for mat in mats:
            obj.data.materials.append(mat)


def clay_material():
    mat = bpy.data.materials.get("AD2A1_Clay")
    if mat is None:
        mat = bpy.data.materials.new("AD2A1_Clay")
        mat.use_nodes = True
        mat.diffuse_color = (0.60, 0.60, 0.61, 1.0)
        mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
            0.60, 0.60, 0.61, 1.0)
    return mat


def black_material():
    mat = bpy.data.materials.get("AD2A1_Black")
    if mat is None:
        mat = bpy.data.materials.new("AD2A1_Black")
        mat.use_nodes = True
        mat.diffuse_color = (0.01, 0.01, 0.01, 1.0)
        mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
            0.01, 0.01, 0.01, 1.0)
    return mat


def wire_material():
    mat = bpy.data.materials.get("AD2A1_Wire")
    if mat is None:
        mat = bpy.data.materials.new("AD2A1_Wire")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        wire = nodes.new("ShaderNodeWireframe")
        wire.use_pixel_size = True
        wire.inputs["Size"].default_value = 1.0
        emit = nodes.new("ShaderNodeEmission")
        emit.inputs["Color"].default_value = (0.9, 0.95, 0.6, 1.0)
        emit.inputs["Strength"].default_value = 1.0
        links.new(wire.outputs["Fac"], emit.inputs["Strength"])
        links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def hide_collection(name, hide):
    for obj in bpy.data.collections[name].objects:
        obj.hide_render = hide


def job_neutral():
    bpy.ops.wm.open_mainfile(filepath=BLEND_NEUTRAL)
    scene = setup_workbench()
    for view, spec in VIEWS.items():
        cam = add_camera(f"N_{view}", spec["location"], TARGET,
                         ortho=spec["ortho"], ortho_scale=spec["ortho_scale"])
        scene.camera = cam
        render_to(os.path.join(RENDER_DIR, f"h-review-{view}.png"))
    for macro, spec in MACRO.items():
        cam = add_camera(f"N_macro_{macro}", spec["location"], spec["target"],
                         ortho=True, ortho_scale=spec["ortho_scale"])
        scene.camera = cam
        render_to(os.path.join(RENDER_DIR, f"h-macro-{macro}.png"))
    # Clay (Workbench diffuse override).
    saved = override_materials(lambda _o: clay_material())
    cam = add_camera("N_clay", VIEWS["three-quarter"]["location"], TARGET,
                     ortho=True, ortho_scale=3.8)
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-clay.png"))
    cam = add_camera("N_clay_front", VIEWS["front"]["location"], TARGET,
                     ortho=True, ortho_scale=3.8)
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-clay-front.png"))
    restore_materials(saved)
    # Body-only clay: anatomy-without-armor proof (equipment hidden).
    for obj in bpy.data.collections[COLLECTION].objects:
        if obj.type == "MESH" and obj.name not in ("Lade_Body", "Lade_Head"):
            obj.hide_render = True
    hide_collection(SOCKET_COLLECTION, True)
    saved = override_materials(lambda _o: clay_material())
    scene.camera = bpy.data.objects["N_clay_front"]
    render_to(os.path.join(RENDER_DIR, "h-bodyonly-clay-front.png"))
    scene.camera = bpy.data.objects["N_clay"]
    render_to(os.path.join(RENDER_DIR, "h-bodyonly-clay.png"))
    restore_materials(saved)
    for obj in bpy.data.collections[COLLECTION].objects:
        obj.hide_render = False
    hide_collection(SOCKET_COLLECTION, False)
    # Gameplay-distance stand-ins (perspective, far).
    cam = add_camera("N_dist_third", (0, -5.4, 2.5), (0, 0, 1.15))
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-dist-third.png"))
    cam = add_camera("N_dist_top", (0, -5.0, 6.5), (0, 0.5, 0.8))
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-dist-top.png"))
    # Silhouette (Cycles, black on white).
    setup_cycles_silhouette()
    saved = override_materials(lambda _o: black_material())
    scene.camera = bpy.data.objects["N_clay"]
    render_to(os.path.join(RENDER_DIR, "h-silhouette.png"))
    restore_materials(saved)
    # Wireframe (Cycles emission-wire override).
    setup_cycles_wire()
    saved = override_materials(lambda _o: wire_material())
    scene.camera = bpy.data.objects["N_clay"]
    render_to(os.path.join(RENDER_DIR, "h-wireframe.png"))
    for macro, spec in (("shoulder", MACRO["shoulder"]), ("hip", MACRO["hip"]),
                        ("knee", MACRO["knee"])):
        cam = add_camera(f"N_wire_{macro}", spec["location"], spec["target"],
                         ortho=True, ortho_scale=spec["ortho_scale"])
        scene.camera = cam
        render_to(os.path.join(RENDER_DIR, f"h-wire-{macro}.png"))
    restore_materials(saved)


def job_ready():
    bpy.ops.wm.open_mainfile(filepath=BLEND_READY)
    scene = setup_workbench()
    for view in ("front", "three-quarter"):
        spec = VIEWS[view]
        cam = add_camera(f"R_{view}", spec["location"], TARGET,
                         ortho=True, ortho_scale=spec["ortho_scale"])
        scene.camera = cam
        render_to(os.path.join(RENDER_DIR, f"h-ready-{view}.png"))
    cam = add_camera("R_dist_third", (0, -5.4, 2.5), (0, 0, 1.15))
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-ready-dist-third.png"))


def pose_bones(arm, rotations):
    for bone_name, euler in rotations.items():
        pb = arm.pose.bones[bone_name]
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = euler
    bpy.context.view_layer.update()


def job_poses():
    bpy.ops.wm.open_mainfile(filepath=BLEND_NEUTRAL)
    scene = setup_workbench()
    arm = next(o for o in bpy.data.collections[COLLECTION].objects if o.type == "ARMATURE")
    # Attack wind-up study: torso coils, dominant arm cocks back.
    pose_bones(arm, {
        "spine": (0, 0, 0.35), "chest": (-0.08, 0, 0.20),
        "upperarm_D": (-1.10, 0, -0.50), "forearm_D": (-0.60, 0, 0),
        "upperarm_S": (0.25, 0, 0.35), "forearm_S": (-0.40, 0, 0),
        "head": (0.10, 0, -0.25), "thigh_D": (-0.12, 0, 0), "shin_D": (0.18, 0, 0),
    })
    cam = add_camera("P_windup", VIEWS["three-quarter"]["location"], TARGET,
                     ortho=True, ortho_scale=3.8)
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-pose-windup.png"))
    # Stagger study: torso knocked back, knees buckle.
    pose_bones(arm, {
        "spine": (0.30, 0, 0.10), "chest": (0.22, 0, 0.08),
        "head": (0.18, 0, 0), "upperarm_D": (0.45, 0, -0.50),
        "upperarm_S": (0.45, 0, 0.50), "forearm_D": (-0.30, 0, 0),
        "forearm_S": (-0.30, 0, 0), "thigh_D": (-0.28, 0, 0),
        "thigh_S": (-0.22, 0, 0), "shin_D": (0.42, 0, 0), "shin_S": (0.36, 0, 0),
    })
    scene.camera = cam
    render_to(os.path.join(RENDER_DIR, "h-pose-stagger.png"))


def job_deform():
    bpy.ops.wm.open_mainfile(filepath=BLEND_NEUTRAL)
    setup_cycles_wire()
    scene = bpy.context.scene
    arm = next(o for o in bpy.data.collections[COLLECTION].objects if o.type == "ARMATURE")
    saved = override_materials(lambda _o: wire_material())
    tests = {
        "shoulder": ({"upperarm_D": (0, -1.05, 0)},
                     dict(target=(0.30, 0.05, 1.30), location=(2.2, 2.0, 1.7), ortho_scale=2.0)),
        "elbow": ({"upperarm_D": (-0.50, 0, 0), "forearm_D": (-1.50, 0, 0)},
                  dict(target=(0.28, 0.15, 1.10), location=(2.1, 2.1, 1.4), ortho_scale=2.0)),
        "hip": ({"thigh_D": (1.20, 0, 0), "shin_D": (-0.25, 0, 0)},
                dict(target=(0.12, 0.15, 0.70), location=(2.1, 2.2, 1.0), ortho_scale=2.0)),
        "knee": ({"thigh_D": (0.35, 0, 0), "shin_D": (-1.50, 0, 0)},
                 dict(target=(0.12, 0.05, 0.45), location=(2.0, 2.1, 0.7), ortho_scale=2.0)),
        "wrist": ({"upperarm_D": (-0.30, 0, 0), "forearm_D": (-0.50, 0, 0),
                   "hand_D": (-0.70, 0, 0)},
                  dict(target=(0.29, 0.20, 0.95), location=(1.9, 2.0, 1.1), ortho_scale=1.6)),
        "ankle": ({"foot_D": (0.60, 0, 0)},
                  dict(target=(0.11, 0.05, 0.10), location=(1.8, 2.0, 0.3), ortho_scale=1.6)),
    }
    for name, (rotations, spec) in tests.items():
        pose_bones(arm, {b: (0, 0, 0) for b in
                         ("spine", "chest", "upperarm_D", "forearm_D", "hand_D",
                          "upperarm_S", "forearm_S", "hand_S", "thigh_D", "shin_D",
                          "foot_D", "thigh_S", "shin_S", "foot_S")})
        pose_bones(arm, rotations)
        cam = add_camera(f"D_{name}", spec["location"], spec["target"],
                         ortho=True, ortho_scale=spec["ortho_scale"])
        scene.camera = cam
        render_to(os.path.join(RENDER_DIR, f"h-deform-{name}.png"))
    restore_materials(saved)


jobs = [a for a in sys.argv[sys.argv.index("--") + 1:]]
if not jobs or "all" in jobs:
    jobs = ["neutral", "ready", "poses", "deform"]
if "neutral" in jobs:
    job_neutral()
if "ready" in jobs:
    job_ready()
if "poses" in jobs:
    job_poses()
if "deform" in jobs:
    job_deform()
print("AD2A.1 RENDERS COMPLETE")
