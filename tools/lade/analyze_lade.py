"""AD2A analysis renders: silhouette, clay, wireframe/topology, material
groups, gameplay-distance perspectives. All in-memory overrides; the file is
never saved. Outputs: assets-dev/lade/renders/analysis-*.png (local-only).
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

VIVID = [
    (0.85, 0.20, 0.20, 1.0), (0.20, 0.70, 0.85, 1.0), (0.95, 0.75, 0.20, 1.0),
    (0.35, 0.80, 0.30, 1.0), (0.75, 0.35, 0.85, 1.0), (0.95, 0.50, 0.15, 1.0),
    (0.30, 0.45, 0.90, 1.0), (0.90, 0.90, 0.30, 1.0), (0.55, 0.25, 0.65, 1.0),
    (0.20, 0.85, 0.65, 1.0), (0.85, 0.55, 0.55, 1.0), (0.45, 0.60, 0.30, 1.0),
    (0.65, 0.65, 0.85, 1.0), (0.80, 0.40, 0.20, 1.0), (0.25, 0.35, 0.55, 1.0),
    (0.70, 0.70, 0.25, 1.0), (0.50, 0.20, 0.40, 1.0),
]


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    scene = setup_workbench()
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    view_layer = bpy.context.view_layer
    lade = bpy.data.collections["Lade"]

    def floor(on=True, shade=(0.55, 0.56, 0.57, 1.0)):
        old = bpy.data.objects.get("AnalysisFloor")
        if old is not None:
            bpy.data.objects.remove(old, do_unlink=True)
        if not on:
            return
        bpy.ops.object.select_all(action="DESELECT")
        bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0, 0, -0.005))
        plane = bpy.context.view_layer.objects.active
        plane.name = "AnalysisFloor"
        mat = bpy.data.materials.get("AnalysisFloorMat")
        if mat is None:
            mat = bpy.data.materials.new("AnalysisFloorMat")
            mat.use_nodes = True
        mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = shade
        plane.data.materials.clear()
        plane.data.materials.append(mat)

    def flat_material(name, color, emission=False):
        mat = bpy.data.materials.get(name)
        if mat is None:
            mat = bpy.data.materials.new(name)
            mat.use_nodes = True
        principled = mat.node_tree.nodes.get("Principled BSDF")
        principled.inputs["Base Color"].default_value = color
        if emission:
            principled.inputs["Emission Color"].default_value = color
            principled.inputs["Emission Strength"].default_value = 1.0
        mat.diffuse_color = color
        return mat

    _swap_store = {}
    for obj in lade.objects:
        if obj.type == "MESH":
            _swap_store[obj.name] = list(obj.data.materials)

    def swap_all_materials(mat):
        for obj in lade.objects:
            if obj.type != "MESH":
                continue
            obj.data.materials.clear()
            obj.data.materials.append(mat)

    def restore_all_materials():
        for name, mats in _swap_store.items():
            obj = bpy.data.objects.get(name)
            if obj is None:
                continue
            obj.data.materials.clear()
            for mat in mats:
                obj.data.materials.append(mat)

    # --- Silhouette runs last: black void, white shadeless mass. ---
    # (First render block in background mode can ignore world/material
    # edits, so the silhouette is captured after all state churn.)
    SILHOUETTE_CAM = ((3.3, 3.3, 1.6), (0, 0, 0.95))

    # --- Clay (neutral grey mass, studio floor). ---
    bg.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1.0)
    floor(True)
    clay = flat_material("AnalysisClay", (0.62, 0.62, 0.63, 1.0))
    swap_all_materials(clay)
    cam = add_camera("Analysis_sil", (3.3, 3.3, 1.6), (0, 0, 0.95), ortho=True, ortho_scale=3.8)
    bind_camera(cam)
    render_to(os.path.join(RENDER_DIR, "analysis-clay.png"))
    print("RENDERED analysis-clay.png")
    restore_all_materials()

    # --- Wireframe full + topology macros (duplicated, never saved). ---
    bpy.ops.object.select_all(action="DESELECT")
    originals = [obj for obj in lade.objects]
    for obj in originals:
        obj.select_set(True)
    view_layer.objects.active = originals[0]
    bpy.ops.object.duplicate()
    dups = list(bpy.context.selected_objects)
    for obj in originals:
        obj.hide_render = True
    wire_mat = bpy.data.materials.get("AnalysisWire")
    if wire_mat is None:
        wire_mat = bpy.data.materials.new("AnalysisWire")
        wire_mat.use_nodes = True
        wire_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (
            0.05, 0.05, 0.05, 1.0,
        )
    wire_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)
    for dup in dups:
        dup.data.materials.clear()
        dup.data.materials.append(wire_mat)
        mod = dup.modifiers.new("Wireframe", "WIREFRAME")
        mod.thickness = 0.004
        mod.use_crease = False
    bg.inputs["Color"].default_value = (0.93, 0.93, 0.94, 1.0)
    render_to(os.path.join(RENDER_DIR, "analysis-wireframe.png"))
    print("RENDERED analysis-wireframe.png")
    macros = {
        "analysis-topology-shoulder": ((1.2, 1.2, 1.7), (0.1, 0.1, 1.5), 0.9),
        "analysis-topology-hip": ((1.2, 1.2, 1.1), (0.0, 0.0, 0.95), 0.9),
        "analysis-topology-knee": ((0.9, 0.9, 0.7), (0.1, 0.0, 0.55), 0.7),
    }
    for name, (location, target, scale) in macros.items():
        macro_cam = add_camera(f"Analysis_{name}", location, target, ortho=True, ortho_scale=scale)
        bind_camera(macro_cam)
        render_to(os.path.join(RENDER_DIR, f"{name}.png"))
        print(f"RENDERED {name}.png")
    for obj in lade.objects:
        obj.hide_render = False
    bpy.ops.object.select_all(action="DESELECT")
    for dup in dups:
        dup.select_set(True)
    bpy.ops.object.delete(use_global=False)

    # --- Material groups (vivid temp colors, restored after). ---
    saved = {}
    for index, mat in enumerate(bpy.data.materials):
        if mat.name.startswith("Lade") or mat.name.startswith("M_"):
            saved[mat.name] = tuple(mat.diffuse_color)
            mat.diffuse_color = VIVID[index % len(VIVID)]
    bg.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1.0)
    bind_camera(cam)
    render_to(os.path.join(RENDER_DIR, "analysis-materials.png"))
    print("RENDERED analysis-materials.png")
    for name, color in saved.items():
        bpy.data.materials[name].diffuse_color = color

    # --- Gameplay distances, neutral stance (perspective). ---
    floor(True)
    distances = {
        "analysis-dist-third": ((0, -5.2, 2.4), (0, 0, 1.0)),
        "analysis-dist-ads": ((0.9, -2.6, 1.8), (0, 0, 1.2)),
        "analysis-dist-top": ((0, -3.5, 8.0), (0, 0, 0.4)),
    }
    for name, (location, target) in distances.items():
        dist_cam = add_camera(f"Analysis_{name}", location, target, ortho=False)
        bind_camera(dist_cam)
        render_to(os.path.join(RENDER_DIR, f"{name}.png"))
        print(f"RENDERED {name}.png")

    bg.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    floor(False)
    bpy.context.view_layer.update()
    white = flat_material("AnalysisWhite", (1.0, 1.0, 1.0, 1.0), emission=True)
    swap_all_materials(white)
    bpy.context.view_layer.update()
    # Cycles single frame: Workbench ignores extreme world/material values
    # in background mode, Cycles honors them (verified pixel deltas).
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    cyc_white = bpy.data.materials.get("AnalysisWhiteCyc")
    if cyc_white is None:
        cyc_white = bpy.data.materials.new("AnalysisWhiteCyc")
        cyc_white.use_nodes = True
        tree = cyc_white.node_tree
        tree.nodes.clear()
        emission = tree.nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
        emission.inputs["Strength"].default_value = 1.0
        output = tree.nodes.new("ShaderNodeOutputMaterial")
        tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    swap_all_materials(cyc_white)
    sil_cam = add_camera(
        "Analysis_sil", SILHOUETTE_CAM[0], SILHOUETTE_CAM[1], ortho=True, ortho_scale=3.8
    )
    bind_camera(sil_cam)
    render_to(os.path.join(RENDER_DIR, "analysis-silhouette.png"))
    print("RENDERED analysis-silhouette.png")
    restore_all_materials()
    scene.render.engine = "BLENDER_WORKBENCH"
    print("ANALYSIS COMPLETE (not saved)")


main()
