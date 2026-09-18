"""AD2A.1 Lade humanoid-base pipeline: shared Blender helpers (local-only).

Method (selected per Phase 2 audit; see DECISIONS.md AD2A.1 entry):
local-only Blender-built-in humanoid base. The bundled Rigify human
meta-rig proportions inform the joint table below (measurement reference
only; no Rigify generate step, so no GPL rig code is embedded in any
export). The body is ONE continuous Skin-modifier mesh grown from a
script-authored anatomical skeleton graph, shaped with scripted
anatomical corrections, and smoothed -- never assembled primitives.

All geometry is original and authored by this script. No reference image
is loaded, traced, textured, or embedded at any point.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

BASE = os.path.dirname(os.path.abspath(__file__))
LADE_LIB = os.path.join(os.path.dirname(BASE), "lade")
if LADE_LIB not in sys.path:
    sys.path.insert(0, LADE_LIB)
if BASE not in sys.path:
    sys.path.insert(0, BASE)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORK_DIR = os.path.join(REPO_ROOT, "assets-dev", "lade-ad2a1")
RENDER_DIR = os.path.join(WORK_DIR, "renders")
BLEND_NEUTRAL = os.path.join(WORK_DIR, "lade_ad2a1_neutral.blend")
BLEND_READY = os.path.join(WORK_DIR, "lade_ad2a1_ready.blend")
GLB_NEUTRAL = os.path.join(WORK_DIR, "lade_ad2a1_neutral.glb")
GLB_READY = os.path.join(WORK_DIR, "lade_ad2a1_ready.glb")
REVIEW_DIR = os.path.join(REPO_ROOT, "public", "model-review")
GLB_REVIEW_NEUTRAL = "lade-ad2a1-neutral.glb"
GLB_REVIEW_READY = "lade-ad2a1-ready.glb"

COLLECTION = "LadeH"
SOCKET_COLLECTION = "LadeH_Sockets"
RIG_NAME = "LadeH_Rig"

FORWARD_IS_PLUS_Y = True

# ---------------------------------------------------------------------------
# Anatomical joint table (metres, Z-up, face toward +Y).
# +X is the character's RIGHT (dominant) side, -X the LEFT (support) side.
# Heights target ~1.86 m with a slight tactical crouch baked in.
# ---------------------------------------------------------------------------

# name -> (position, skin radius (rx, ry))
SKIN_VERTS = [
    ("pelvis", (0.0, 0.0, 1.005), (0.160, 0.120)),
    ("waist", (0.0, 0.005, 1.175), (0.135, 0.105)),
    ("chest", (0.0, 0.010, 1.355), (0.165, 0.115)),
    ("neck", (0.0, 0.008, 1.505), (0.062, 0.058)),
    ("headB", (0.0, 0.012, 1.585), (0.058, 0.055)),
    ("skull", (0.0, 0.015, 1.715), (0.100, 0.105)),
    ("crown", (0.0, -0.005, 1.805), (0.070, 0.072)),
    # Dominant (right, +X) arm chain.
        ("shoD", (0.220, 0.005, 1.440), (0.062, 0.058)),
    ("elbD", (0.270, 0.030, 1.215), (0.054, 0.050)),
    ("wriD", (0.285, 0.060, 0.995), (0.042, 0.040)),
    ("palmD", (0.285, 0.075, 0.925), (0.046, 0.036)),
    ("thumbD1", (0.260, 0.095, 0.900), (0.020, 0.018)),
    ("thumbD2", (0.240, 0.115, 0.875), (0.016, 0.014)),
    ("indexD1", (0.300, 0.095, 0.895), (0.017, 0.015)),
    ("indexD2", (0.305, 0.110, 0.830), (0.014, 0.012)),
    ("midD1", (0.285, 0.100, 0.890), (0.017, 0.015)),
    ("midD2", (0.287, 0.115, 0.825), (0.014, 0.012)),
    ("ringD1", (0.270, 0.098, 0.888), (0.016, 0.014)),
    ("ringD2", (0.267, 0.112, 0.828), (0.013, 0.011)),
    ("pinkyD1", (0.257, 0.092, 0.885), (0.014, 0.012)),
    ("pinkyD2", (0.253, 0.102, 0.835), (0.011, 0.010)),
    # Support (left, -X) arm chain (mirror).
        ("shoS", (-0.220, 0.005, 1.440), (0.062, 0.058)),
    ("elbS", (-0.270, 0.030, 1.215), (0.054, 0.050)),
    ("wriS", (-0.285, 0.060, 0.995), (0.042, 0.040)),
    ("palmS", (-0.285, 0.075, 0.925), (0.046, 0.036)),
    ("thumbS1", (-0.260, 0.095, 0.900), (0.020, 0.018)),
    ("thumbS2", (-0.240, 0.115, 0.875), (0.016, 0.014)),
    ("indexS1", (-0.300, 0.095, 0.895), (0.017, 0.015)),
    ("indexS2", (-0.305, 0.110, 0.830), (0.014, 0.012)),
    ("midS1", (-0.285, 0.100, 0.890), (0.017, 0.015)),
    ("midS2", (-0.287, 0.115, 0.825), (0.014, 0.012)),
    ("ringS1", (-0.270, 0.098, 0.888), (0.016, 0.014)),
    ("ringS2", (-0.267, 0.112, 0.828), (0.013, 0.011)),
    ("pinkyS1", (-0.257, 0.092, 0.885), (0.014, 0.012)),
    ("pinkyS2", (-0.253, 0.102, 0.835), (0.011, 0.010)),
    # Dominant leg chain.
    ("hipD", (0.105, 0.0, 0.975), (0.102, 0.100)),
    ("kneeD", (0.110, 0.030, 0.550), (0.070, 0.072)),
    ("ankD", (0.110, 0.005, 0.135), (0.050, 0.052)),
    ("heelD", (0.110, -0.055, 0.065), (0.044, 0.042)),
    ("toeD", (0.110, 0.105, 0.040), (0.038, 0.034)),
    # Support leg chain (mirror).
    ("hipS", (-0.105, 0.0, 0.975), (0.102, 0.100)),
    ("kneeS", (-0.110, 0.030, 0.550), (0.070, 0.072)),
    ("ankS", (-0.110, 0.005, 0.135), (0.050, 0.052)),
    ("heelS", (-0.110, -0.055, 0.065), (0.044, 0.042)),
    ("toeS", (-0.110, 0.105, 0.040), (0.038, 0.034)),
]

SKIN_EDGES = [
    ("pelvis", "waist"), ("waist", "chest"), ("chest", "neck"),
    ("neck", "headB"), ("headB", "skull"), ("skull", "crown"),
    ("chest", "shoD"), ("shoD", "elbD"),
    ("elbD", "wriD"), ("wriD", "palmD"),
    ("palmD", "thumbD1"), ("thumbD1", "thumbD2"),
    ("palmD", "indexD1"), ("indexD1", "indexD2"),
    ("palmD", "midD1"), ("midD1", "midD2"),
    ("palmD", "ringD1"), ("ringD1", "ringD2"),
    ("palmD", "pinkyD1"), ("pinkyD1", "pinkyD2"),
    ("chest", "shoS"), ("shoS", "elbS"),
    ("elbS", "wriS"), ("wriS", "palmS"),
    ("palmS", "thumbS1"), ("thumbS1", "thumbS2"),
    ("palmS", "indexS1"), ("indexS1", "indexS2"),
    ("palmS", "midS1"), ("midS1", "midS2"),
    ("palmS", "ringS1"), ("ringS1", "ringS2"),
    ("palmS", "pinkyS1"), ("pinkyS1", "pinkyS2"),
    ("pelvis", "hipD"), ("hipD", "kneeD"), ("kneeD", "ankD"),
    ("ankD", "heelD"), ("heelD", "toeD"),
    ("pelvis", "hipS"), ("hipS", "kneeS"), ("kneeS", "ankS"),
    ("ankS", "heelS"), ("heelS", "toeS"),
]

# Project-owned test-armature bones: name -> (head, tail).
BONES = [
    ("root", (0.0, 0.0, 0.05), (0.0, 0.0, 0.35)),
    ("pelvis", (0.0, 0.0, 1.005), (0.0, 0.005, 1.175)),
    ("spine", (0.0, 0.005, 1.175), (0.0, 0.010, 1.355)),
    ("chest", (0.0, 0.010, 1.355), (0.0, 0.008, 1.505)),
    ("neck", (0.0, 0.008, 1.505), (0.0, 0.012, 1.585)),
    ("head", (0.0, 0.012, 1.585), (0.0, 0.015, 1.790)),
    ("clavicle_D", (0.0, 0.005, 1.455), (0.145, 0.005, 1.455)),
    ("upperarm_D", (0.145, 0.005, 1.455), (0.270, 0.030, 1.215)),
    ("forearm_D", (0.270, 0.030, 1.215), (0.285, 0.060, 0.995)),
    ("hand_D", (0.285, 0.060, 0.995), (0.285, 0.080, 0.900)),
    ("clavicle_S", (0.0, 0.005, 1.455), (-0.145, 0.005, 1.455)),
    ("upperarm_S", (-0.145, 0.005, 1.455), (-0.270, 0.030, 1.215)),
    ("forearm_S", (-0.270, 0.030, 1.215), (-0.285, 0.060, 0.995)),
    ("hand_S", (-0.285, 0.060, 0.995), (-0.285, 0.080, 0.900)),
    ("thigh_D", (0.105, 0.0, 0.975), (0.110, 0.030, 0.550)),
    ("shin_D", (0.110, 0.030, 0.550), (0.110, 0.005, 0.135)),
    ("foot_D", (0.110, 0.005, 0.135), (0.110, 0.105, 0.040)),
    ("thigh_S", (-0.105, 0.0, 0.975), (-0.110, 0.030, 0.550)),
    ("shin_S", (-0.110, 0.030, 0.550), (-0.110, 0.005, 0.135)),
    ("foot_S", (-0.110, 0.005, 0.135), (-0.110, 0.105, 0.040)),
]

BONE_PARENTS = {
    "pelvis": "root", "spine": "pelvis", "chest": "spine",
    "neck": "chest", "head": "neck",
    "clavicle_D": "chest", "upperarm_D": "clavicle_D",
    "forearm_D": "upperarm_D", "hand_D": "forearm_D",
    "clavicle_S": "chest", "upperarm_S": "clavicle_S",
    "forearm_S": "upperarm_S", "hand_S": "forearm_S",
    "thigh_D": "pelvis", "shin_D": "thigh_D", "foot_D": "shin_D",
    "thigh_S": "pelvis", "shin_S": "thigh_S", "foot_S": "shin_S",
}

REQUIRED_OBJECTS = [
    "Lade_Body", "Lade_Head", "Lade_Mask", "Lade_Lenses", "Lade_Helmet",
    "Lade_Headlamp", "Lade_Scarf", "Lade_Vest", "Lade_Backpack",
    "Lade_Rifle", "Lade_BackBlade", "Lade_Armor", "Lade_Boot_L",
    "Lade_Boot_R", "Lade_Coat",
]

REQUIRED_SOCKETS = [
    "Socket_Root", "Socket_Head", "Socket_Hand_Dominant",
    "Socket_Hand_Support", "Socket_RifleGrip", "Socket_RifleSupport",
    "Socket_Muzzle", "Socket_Backpack", "Socket_Blade",
    "Socket_AttackOrigin",
]


def deselect_all():
    bpy.ops.object.select_all(action="DESELECT")


def activate(obj):
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def move_to_collection(obj, name):
    from lade_lib import move_to_collection as _move

    return _move(obj, name)


def finish_part(obj, mat_name, shade_smooth=True):
    from lade_lib import finish_part as _finish

    return _finish(obj, mat_name, shade_flat=not shade_smooth)


def world_pos(obj, local=(0.0, 0.0, 0.0)):
    return obj.matrix_world @ Vector(local)


def selected_meshes(collection_name):
    collection = bpy.data.collections.get(collection_name)
    if collection is None:
        return []
    return [o for o in collection.objects if o.type == "MESH"]
