"""AD2A review videos: turntable, pose-review, camera-distance.

Workbench, 960x540, VP9/WebM, in-memory posing (never saved).
Outputs: assets-dev/lade/renders/ad2a-lade-<name>.webm (local-only).
Usage: blender --background --python tools/lade/video_lade.py -- <name>...
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lade_lib import (  # noqa: E402
    BLEND_PATH,
    RENDER_DIR,
    add_camera,
    bind_camera,
    look_at,
    setup_workbench,
)
from pose_lade import POSES  # noqa: E402


def setup_output(name, fps=24):
    scene = bpy.context.scene
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    frames = os.path.join(RENDER_DIR, f"{name}-frames")
    os.makedirs(frames, exist_ok=True)
    scene.render.filepath = os.path.join(frames, "frame_")
    scene.render.fps = fps
    return scene


def studio_floor():
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0, 0, -0.005))
    floor = bpy.context.view_layer.objects.active
    floor.name = "VideoFloor"
    mat = bpy.data.materials.new("VideoFloorMat")
    mat.use_nodes = True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        0.55, 0.56, 0.57, 1.0,
    )
    floor.data.materials.append(mat)


def apply_pose(pose):
    for name, value in pose.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        if name == "Lade_Rifle":
            location, rotation = value
            obj.location = location
            obj.rotation_euler = rotation
        else:
            obj.rotation_euler = value
    bpy.context.view_layer.update()


def keyframe_pose(pose, frame):
    apply_pose(pose)
    for name in pose:
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)
        if name == "Lade_Rifle":
            obj.keyframe_insert(data_path="location", frame=frame)


def orbit_rig(radius, height, frames):
    bpy.ops.object.empty_add(location=(0, 0, 0.95))
    pivot = bpy.context.view_layer.objects.active
    pivot.name = "OrbitPivot"
    cam = add_camera("VideoCam", (radius, 0, height), (0, 0, 0.95))
    cam.parent = pivot
    bind_camera(cam)
    pivot.rotation_euler = (0, 0, 0)
    pivot.keyframe_insert(data_path="rotation_euler", frame=1)
    pivot.rotation_euler = (0, 0, math.pi * 2)
    pivot.keyframe_insert(data_path="rotation_euler", frame=frames)
    for curve in list(bpy.data.actions)[-1].fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
    return pivot


def video_turntable():
    scene = setup_output("turntable")
    scene.frame_start = 1
    scene.frame_end = 96
    apply_pose(POSES["neutral"])
    orbit_rig(4.4, 1.5, 96)
    bpy.ops.render.render(animation=True)
    print("VIDEO turntable")


def video_pose_review():
    scene = setup_output("pose-review")
    scene.frame_start = 1
    scene.frame_end = 144
    marks = [(1, "neutral"), (37, "tactical"), (73, "windup"), (109, "stagger"), (144, "stagger")]
    for frame, pose_name in marks:
        keyframe_pose(POSES[pose_name], frame)
    orbit_rig(4.4, 1.5, 144)
    bpy.ops.render.render(animation=True)
    print("VIDEO pose-review")


def video_camera_distance():
    scene = setup_output("camera-distance")
    scene.frame_start = 1
    scene.frame_end = 120
    apply_pose(POSES["tactical"])
    cam = add_camera("VideoCam", (0, -5.2, 2.4), (0, 0, 1.0))
    cam.data.lens = 50
    bind_camera(cam)
    stops = {
        1: ((0, -5.2, 2.4), (0, 0, 1.0)),
        45: ((0.9, -2.6, 1.8), (0, 0, 1.2)),
        80: ((0, -3.5, 8.0), (0, 0, 0.4)),
        120: ((0, -3.5, 8.0), (0, 0, 0.4)),
    }
    for frame, (location, target) in stops.items():
        cam.location = location
        look_at(cam, target)
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.keyframe_insert(data_path="rotation_euler", frame=frame)
    bpy.ops.render.render(animation=True)
    print("VIDEO camera-distance")


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    setup_workbench()
    scene = bpy.context.scene
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs["Color"].default_value = (
        0.62, 0.64, 0.66, 1.0,
    )
    studio_floor()
    wanted = [a for a in sys.argv[sys.argv.index("--") + 1 :]] or [
        "turntable",
        "pose-review",
        "camera-distance",
    ]
    if "turntable" in wanted:
        video_turntable()
    if "pose-review" in wanted:
        # Reopen for a clean action state per video.
        bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
        setup_workbench()
        bpy.context.scene.world.node_tree.nodes.get("Background").inputs[
            "Color"
        ].default_value = (0.62, 0.64, 0.66, 1.0)
        studio_floor()
        video_pose_review()
    if "camera-distance" in wanted:
        bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
        setup_workbench()
        bpy.context.scene.world.node_tree.nodes.get("Background").inputs[
            "Color"
        ].default_value = (0.62, 0.64, 0.66, 1.0)
        studio_floor()
        video_camera_distance()
    print("VIDEOS COMPLETE (not saved)")


main()
