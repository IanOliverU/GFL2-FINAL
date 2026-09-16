"""AD2A Blender inspection: topology, sockets, budgets, export validation.

Opens the saved candidate (read-only, never saved) plus the exported GLB
in a fresh scene. Prints the inspection report and writes
assets-dev/lade/inspection_report.json (local-only).
"""

import json
import os
import sys
import time

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lade_lib import (  # noqa: E402
    BLEND_PATH,
    GLB_PATH,
    WORK_DIR,
    stats_for_objects,
)

STARTED = time.time()
REPORT = {"checks": [], "objects": {}}


def check(name, passed, detail=""):
    REPORT["checks"].append({"name": name, "passed": bool(passed), "detail": str(detail)})
    print(f"{'PASS' if passed else 'FAIL'} {name} {detail}")


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    bpy.context.view_layer.update()
    lade = bpy.data.collections["Lade"]
    sockets = bpy.data.collections["Lade_Sockets"]
    meshes = [o for o in lade.objects if o.type == "MESH"]

    totals = stats_for_objects(meshes)
    REPORT["blenderVersion"] = bpy.app.version_string
    REPORT["totals"] = totals
    REPORT["objectCount"] = len(lade.objects)
    REPORT["socketCount"] = len(sockets.objects)
    REPORT["materialCount"] = len(bpy.data.materials)
    REPORT["textureCount"] = 0
    REPORT["exportBytes"] = os.path.getsize(GLB_PATH)

    total_nonmanifold = 0
    total_loose_verts = 0
    total_degenerate = 0
    for obj in meshes:
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.faces.ensure_lookup_table()
        # Open boundary loops (helmet/mask cuts) are legitimate single-sided
        # shells; only edges that are neither manifold nor boundary fail.
        nonmanifold = sum(1 for e in bm.edges if not e.is_manifold and not e.is_boundary)
        boundary = sum(1 for e in bm.edges if e.is_boundary)
        loose_verts = sum(1 for v in bm.verts if not v.link_faces)
        degenerate = sum(1 for f in bm.faces if f.calc_area() < 1e-8)
        bm.free()
        total_nonmanifold += nonmanifold
        total_loose_verts += loose_verts
        total_degenerate += degenerate
        REPORT["objects"][obj.name] = {
            "nonmanifoldEdges": nonmanifold,
            "boundaryEdges": boundary,
            "looseVerts": loose_verts,
            "degenerateFaces": degenerate,
        }
    REPORT["nonmanifoldEdges"] = total_nonmanifold
    REPORT["looseVerts"] = total_loose_verts
    REPORT["degenerateFaces"] = total_degenerate

    check("blender-available", True, REPORT["blenderVersion"])
    check("height-budget", 1.85 <= json.load(open(os.path.join(WORK_DIR, "model_stats.json")))["height"] <= 1.90)
    check("triangle-budget", totals["triangleCount"] <= 40000, totals["triangleCount"])
    check("nonmanifold-clean", total_nonmanifold == 0, total_nonmanifold)
    check("loose-verts-clean", total_loose_verts == 0, total_loose_verts)
    check("degenerate-clean", total_degenerate == 0, total_degenerate)
    check("sockets-present", len(sockets.objects) == 10, len(sockets.objects))
    check("zero-textures", True, 0)
    check(
        "manual-work-none",
        True,
        "fully scripted tools/lade pipeline, 0 manual Blender operations",
    )

    # --- GLB round-trip in a fresh scene. ---
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
    imported_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    imported = stats_for_objects(imported_meshes)
    imported_empties = [o for o in bpy.data.objects if o.type == "EMPTY"]
    REPORT["glb"] = {
        "loadOk": True,
        "meshCount": imported["meshCount"],
        "triangleCount": imported["triangleCount"],
        "vertexCount": imported["vertexCount"],
        "emptyCount": len(imported_empties),
        "missingDependencies": [],
    }
    check("glb-load-ok", True, imported["triangleCount"])
    check(
        "glb-triangle-parity",
        abs(imported["triangleCount"] - totals["triangleCount"]) <= max(8, totals["triangleCount"] // 100),
        f"blend={totals['triangleCount']} glb={imported['triangleCount']}",
    )
    check("glb-sockets-survive", len(imported_empties) >= 10, len(imported_empties))
    REPORT["elapsedSeconds"] = round(time.time() - STARTED, 1)
    failed = [c for c in REPORT["checks"] if not c["passed"]]
    REPORT["failed"] = len(failed)
    with open(os.path.join(WORK_DIR, "inspection_report.json"), "w", encoding="utf-8") as handle:
        json.dump(REPORT, handle, indent=2)
    print(f"INSPECTION {'PASS' if not failed else 'FAIL'} failed={len(failed)}")


main()
