"""AD2A review renders: neutral-studio Workbench views of the candidate.

Usage (Blender background):
  blender --background --python tools/lade/render_review.py -- <view>...
Views: front, side, rear, three-quarter, top, silhouette.
 ortam OT Outputs: assets-dev/lade/renders/review-<view>.png (local-only).
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

bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
scene = setup_workbench()
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1.0)
bg.inputs["Strength"].default_value = 1.0

# Neutral studio floor (review only, never exported).
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

TARGET = (0, 0, 0.95)
# Model faces +Y: front cameras sit on +Y, rear cameras on -Y.
VIEWS = {
    "front": dict(location=(0, 4.6, 1.0), ortho=True, ortho_scale=3.8),
    "side": dict(location=(4.6, 0, 1.0), ortho=True, ortho_scale=3.8),
    "side-left": dict(location=(-4.6, 0, 1.0), ortho=True, ortho_scale=3.8),
    "rear": dict(location=(0, -4.6, 1.0), ortho=True, ortho_scale=3.8),
    "three-quarter": dict(location=(3.3, 3.3, 1.6), ortho=True, ortho_scale=3.8),
    "rear-three-quarter": dict(location=(3.3, -3.3, 1.6), ortho=True, ortho_scale=3.8),
    "top": dict(location=(0, 0, 6.5), ortho=True, ortho_scale=3.8),
}

MACRO = {
    "head": dict(target=(0, 0.05, 1.66), location=(0.9, 1.6, 1.7), ortho_scale=0.9),
    "face": dict(target=(0, 0.10, 1.64), location=(0, 2.0, 1.64), ortho_scale=0.7),
    "hip": dict(target=(0.15, 0.1, 0.9), location=(1.4, 1.8, 1.0), ortho_scale=1.2),
}

wanted = [a for a in sys.argv[sys.argv.index("--") + 1 :] if a in VIEWS] or ["front"]
for view in wanted:
    spec = VIEWS[view]
    cam = add_camera(
        f"Review_{view}",
        spec["location"],
        TARGET,
        ortho=spec["ortho"],
        ortho_scale=spec["ortho_scale"],
    )
    bind_camera(cam)
    render_to(os.path.join(RENDER_DIR, f"review-{view}.png"))
    print(f"RENDERED review-{view}.png")

macro_wanted = [a for a in sys.argv[sys.argv.index("--") + 1 :] if a in MACRO]
for view in macro_wanted:
    spec = MACRO[view]
    cam = add_camera(
        f"Review_{view}", spec["location"], spec["target"], ortho=True,
        ortho_scale=spec["ortho_scale"],
    )
    bind_camera(cam)
    render_to(os.path.join(RENDER_DIR, f"review-{view}.png"))
    print(f"RENDERED review-{view}.png")
