"""AD2A review poses: neutral, tactical, wind-up, stagger silhouettes.

Object-level posing about joint pivots (no rigging). Opens the saved
candidate, applies each pose, renders ortho 3/4 + front stills, restores
neutral, and quits WITHOUT saving. Outputs: assets-dev/lade/renders/
pose-<name>-<view>.png (local-only).
"""

import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lade_lib import (  # noqa: E402
    BLEND_PATH,
    RENDER_DIR,
    add_camera,
    bind_camera,
    render_to,
    setup_workbench,
)

# Rotations are XYZ Euler radians; rifle entries are location + rotation.
POSES = {
    "neutral": {
        "Lade_Body": (0.0, 0.0, 0.0),
        "Lade_Head": (0.0, 0.0, 0.0),
        "Lade_Arm_L": (0.10, 0.0, 0.10),
        "Lade_Arm_R": (0.10, 0.0, -0.10),
        "Lade_Leg_L": (-0.05, 0.0, 0.0),
        "Lade_Leg_R": (0.05, 0.0, 0.0),
        "Lade_Boot_L": (-0.05, 0.0, 0.0),
        "Lade_Boot_R": (0.05, 0.0, 0.0),
        "Lade_Rifle": ((0.30, -0.046, 0.954), (1.45, 0.0, 0.06)),
    },
    "tactical": {
        "Lade_Body": (-0.12, 0.0, 0.0),
        "Lade_Head": (0.10, 0.0, 0.0),
        "Lade_Arm_L": (0.70, -0.25, 0.0),
        "Lade_Arm_R": (0.50, 0.25, 0.0),
        "Lade_Leg_L": (-0.08, 0.0, 0.0),
        "Lade_Leg_R": (0.08, 0.0, 0.0),
        "Lade_Boot_L": (-0.08, 0.0, 0.0),
        "Lade_Boot_R": (0.08, 0.0, 0.0),
        "Lade_Rifle": ((0.11, 0.40, 0.98), (0.06, 0.0, -0.02)),
    },
    "windup": {
        "Lade_Body": (0.10, 0.30, 0.0),
        "Lade_Head": (0.0, -0.40, 0.0),
        "Lade_Arm_L": (0.30, 0.0, -0.50),
        "Lade_Arm_R": (-2.40, 0.30, -0.20),
        "Lade_Leg_L": (-0.10, 0.0, 0.0),
        "Lade_Leg_R": (0.10, 0.0, 0.0),
        "Lade_Boot_L": (-0.10, 0.0, 0.0),
        "Lade_Boot_R": (0.10, 0.0, 0.0),
        "Lade_Rifle": ((0.28, -0.10, 1.35), (2.60, 0.0, 0.25)),
    },
    "stagger": {
        "Lade_Body": (0.16, 0.0, 0.18),
        "Lade_Head": (0.10, 0.50, 0.10),
        "Lade_Arm_L": (-0.30, 0.0, 0.60),
        "Lade_Arm_R": (-0.10, 0.0, -0.70),
        "Lade_Leg_L": (-0.14, 0.0, 0.0),
        "Lade_Leg_R": (0.10, 0.0, 0.0),
        "Lade_Boot_L": (-0.14, 0.0, 0.0),
        "Lade_Boot_R": (0.10, 0.0, 0.0),
        "Lade_Rifle": ((0.32, -0.05, 0.62), (1.10, 0.0, 0.55)),
    },
}


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


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    scene = setup_workbench()
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1.0)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0, 0, -0.005))
    floor = bpy.context.view_layer.objects.active
    floor.name = "ReviewFloor"
    mat = bpy.data.materials.new("ReviewFloorMat")
    mat.use_nodes = True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
        0.55, 0.56, 0.57, 1.0,
    )
    floor.data.materials.append(mat)

    cameras = {
        "three-quarter": ((3.3, 3.3, 1.6), (0, 0, 0.95)),
        "front": ((0, 4.6, 1.0), (0, 0, 0.95)),
    }
    wanted = [a for a in sys.argv[sys.argv.index("--") + 1 :]] or list(POSES)
    for pose_name in [p for p in POSES if p in wanted]:
        apply_pose(POSES[pose_name])
        for view, (location, target) in cameras.items():
            cam = add_camera(
                f"Pose_{pose_name}_{view}", location, target, ortho=True, ortho_scale=3.8
            )
            bind_camera(cam)
            render_to(os.path.join(RENDER_DIR, f"pose-{pose_name}-{view}.png"))
        print(f"POSED {pose_name}")
    apply_pose(POSES["neutral"])
    print("POSES COMPLETE (not saved)")


if __name__ == "__main__":
    main()
