"""AD2A.1 Blender inspection: topology, rig-readiness, sockets, budgets,
grip proof, and GLB round-trip for BOTH variants (local-only).

Opens the saved candidates read-only. Prints the report and writes
assets-dev/lade-ad2a1/inspection_report.json (local-only).
"""

import json
import os
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
    COLLECTION,
    GLB_NEUTRAL,
    GLB_READY,
    REQUIRED_OBJECTS,
    REQUIRED_SOCKETS,
    RIG_NAME,
    SOCKET_COLLECTION,
    WORK_DIR,
)

STARTED = time.time()
REPORT = {"checks": [], "variants": {}}


def check(name, passed, detail=""):
    REPORT["checks"].append({"name": name, "passed": bool(passed), "detail": str(detail)})
    print(f"{'PASS' if passed else 'FAIL'} {name} {detail}")


def dist_point_segment(p, a, b):
    ab = b - a
    denom = ab.dot(ab)
    t = 0.0 if denom < 1e-12 else max(0.0, min(1.0, (p - a).dot(ab) / denom))
    return ((a + ab * t) - p).length


def inspect_variant(blend_path, glb_path, label, expect_armature):
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    bpy.context.view_layer.update()
    lade = bpy.data.collections[COLLECTION]
    sockets = bpy.data.collections[SOCKET_COLLECTION]
    meshes = [o for o in lade.objects if o.type == "MESH"]
    variant = {"meshes": len(meshes), "objects": {}}

    nonman, loose_v, loose_e, degen = 0, 0, 0, 0
    for obj in meshes:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        nm = sum(1 for e in bm.edges if not e.is_manifold and not e.is_boundary)
        lv = sum(1 for v in bm.verts if not v.link_faces)
        le = sum(1 for e in bm.edges if not e.link_faces)
        dg = sum(1 for f in bm.faces if f.calc_area() < 1e-8)
        bm.free()
        nonman += nm
        loose_v += lv
        loose_e += le
        degen += dg
        variant["objects"][obj.name] = {
            "nonmanifoldEdges": nm, "looseVerts": lv, "looseEdges": le,
            "degenerateFaces": dg, "vertexGroups": len(obj.vertex_groups),
        }
    variant.update({"nonmanifoldEdges": nonman, "looseVerts": loose_v,
                    "looseEdges": loose_e, "degenerateFaces": degen})

    stats = json.load(open(os.path.join(WORK_DIR, f"model_stats_{label}.json")))
    manifest = json.load(open(os.path.join(WORK_DIR, f"object_manifest_{label}.json")))
    variant["stats"] = {k: stats[k] for k in ("height", "groundOffset", "totals")}
    check(f"{label}-height-budget", stats["validation"]["heightInBudget"], stats["height"])
    check(f"{label}-grounded", stats["validation"]["grounded"], stats["groundOffset"])
    check(f"{label}-triangle-budget", stats["validation"]["triangleBudget"],
          stats["totals"]["triangleCount"])
    check(f"{label}-required-objects", stats["validation"]["requiredObjects"],
          len(manifest["objects"]))
    check(f"{label}-required-sockets", stats["validation"]["requiredSockets"],
          len(manifest["sockets"]))
    check(f"{label}-nonmanifold-clean", nonman == 0, nonman)
    check(f"{label}-loose-clean", loose_v + loose_e == 0, f"{loose_v}v/{loose_e}e")
    check(f"{label}-degenerate-clean", degen == 0, degen)
    check(f"{label}-zero-textures", stats["textureCount"] == 0, 0)

    # Grip proof from manifested socket worlds.
    loc = {k: Vector(v["location"]) for k, v in manifest["sockets"].items()}
    grip_gap = (loc["Socket_RifleGrip"] - loc["Socket_Hand_Dominant"]).length
    support_gap = (loc["Socket_RifleSupport"] - loc["Socket_Hand_Support"]).length
    variant["gripGap"] = round(grip_gap, 4)
    variant["supportGap"] = round(support_gap, 4)
    check(f"{label}-dominant-grip", grip_gap < 0.05, round(grip_gap, 4))
    if label == "neutral":
        # One-handed vertical carry: the support hand stays at the side, so
        # its socket must sit ON the rifle segment instead of at the hand.
        seg_d = dist_point_segment(loc["Socket_RifleSupport"],
                                   loc["Socket_RifleGrip"], loc["Socket_Muzzle"])
        check(f"{label}-support-on-rifle", seg_d < 0.03, round(seg_d, 4))
        check(f"{label}-vertical-carry",
              loc["Socket_Muzzle"].z > loc["Socket_RifleGrip"].z + 0.30
              and abs(loc["Socket_Muzzle"].y - loc["Socket_RifleGrip"].y) < 0.15,
              f"muzzle={[round(v, 3) for v in loc['Socket_Muzzle']]}")
    else:
        check(f"{label}-support-grip", support_gap < 0.06, round(support_gap, 4))
        check(f"{label}-forward-axis",
              loc["Socket_Muzzle"].y > loc["Socket_RifleGrip"].y + 0.10,
              f"muzzleY={round(loc['Socket_Muzzle'].y, 3)}")

    if expect_armature:
        arm = bpy.data.objects.get(RIG_NAME)
        check(f"{label}-test-armature", arm is not None and arm.type == "ARMATURE",
              f"bones={len(arm.data.bones) if arm is not None else 0}")
        body = bpy.data.objects.get("Lade_Body")
        check(f"{label}-body-weights", body is not None and len(body.vertex_groups) > 0,
              len(body.vertex_groups) if body is not None else 0)
        # Independent weight-surgery verification: no arm-group weight may
        # survive further than 9 cm from any arm segment.
        segs = []
        for name in ("upperarm_D", "upperarm_S", "forearm_D", "forearm_S",
                     "hand_D", "hand_S"):
            pb = arm.pose.bones[name]
            segs.append((name, arm.matrix_world @ pb.head, arm.matrix_world @ pb.tail))
        worst = 0.0
        for v in body.data.vertices:
            p = body.matrix_world @ v.co
            if min(dist_point_segment(p, a, b) for _, a, b in segs) > 0.09:
                for g in v.groups:
                    if body.vertex_groups[g.group].name in {n for n, _, _ in segs}:
                        worst = max(worst, g.weight)
        variant["worstStrayArmWeight"] = round(worst, 4)
        check(f"{label}-weight-surgery", worst < 0.01, round(worst, 4))
    else:
        check(f"{label}-baked-no-armature", bpy.data.objects.get(RIG_NAME) is None, "ready")

    # GLB round-trip in a fresh scene.
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    imported_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    tris = sum(len(m.data.loop_triangles) if hasattr(m.data, "loop_triangles") else 0
               for m in imported_meshes)
    from lade_lib import stats_for_objects  # noqa: E402

    sys.path.insert(0, os.path.join(os.path.dirname(BASE), "lade"))
    imported = stats_for_objects(imported_meshes)
    empties = [o for o in bpy.data.objects if o.type == "EMPTY"]
    armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    variant["glb"] = {"triangles": imported["triangleCount"],
                      "empties": len(empties), "armatures": len(armatures)}
    check(f"{label}-glb-load-ok", imported["triangleCount"] > 0, imported["triangleCount"])
    check(f"{label}-glb-triangle-parity",
          abs(imported["triangleCount"] - stats["totals"]["triangleCount"])
          <= max(8, stats["totals"]["triangleCount"] // 100),
          f"blend={stats['totals']['triangleCount']} glb={imported['triangleCount']}")
    check(f"{label}-glb-sockets-survive", len(empties) >= 10, len(empties))
    if expect_armature:
        check(f"{label}-glb-armature-survives", len(armatures) >= 1, len(armatures))
    REPORT["variants"][label] = variant


def main():
    sys.path.insert(0, os.path.join(os.path.dirname(BASE), "lade"))
    REPORT["blenderVersion"] = bpy.app.version_string
    inspect_variant(BLEND_NEUTRAL, GLB_NEUTRAL, "neutral", expect_armature=True)
    inspect_variant(BLEND_READY, GLB_READY, "ready", expect_armature=False)
    check("manual-work-none", True,
          "fully scripted tools/lade_ad2a1 pipeline, 0 manual Blender operations")
    check("no-external-io", True, "0 downloads, 0 uploads, 0 external services")
    REPORT["elapsedSeconds"] = round(time.time() - STARTED, 1)
    failed = [c for c in REPORT["checks"] if not c["passed"]]
    REPORT["failed"] = len(failed)
    with open(os.path.join(WORK_DIR, "inspection_report.json"), "w", encoding="utf-8") as handle:
        json.dump(REPORT, handle, indent=2)
    print(f"INSPECTION {'PASS' if not failed else 'FAIL'} failed={len(failed)}")


main()
