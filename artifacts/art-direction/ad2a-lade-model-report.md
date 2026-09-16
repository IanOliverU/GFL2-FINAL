# AD2A Lade Model Production Proof — Technical Report (Not Director Acceptance)

One original Felagi · Lade model candidate built locally with scripted
Blender Python. No external service, no reference upload, no downloaded
model, no manual Blender work. The protected reference
(`assets-source/GFL2 Enemies References/FelagiㆍLade.webp`, filename
preserved byte-for-byte) was viewed as reference only: never renamed,
moved, traced, textured, embedded in evidence, or shipped.

## Production method

- Local Blender 5.2.1 LTS headless (`D:\Blender\blender.exe --background`)
  plus the official Blender Lab MCP add-on (localhost:9876, raw TCP
  null-delimited JSON) for live inspection queries only.
- Committed pipeline in `tools/lade/`: `lade_lib.py` (materials, cameras,
  export helpers), `gen_part1.py` + `gen_part2.py` (construction, sockets,
  neutral pose, GLB export, manifests), `run_gen.py` (driver),
  `pose_lade.py` (4 review poses), `render_review.py` / `analyze_lade.py`
  (Workbench stills; one Cycles silhouette frame), `video_lade.py` (PNG
  sequences) + local ffmpeg 9 VP9 encode, `inspect_lade.py` (topology and
  GLB round-trip validation).
- Three focused iterations: (1) silhouette/proportions (fixed double
  transform, height 3.55 → 1.888 m); (2) equipment/material separation
  (unburied lenses/canister, vertical rifle carry, blade edge, face under
  brim); (3) gameplay-distance readability (browser viewer under real AD1
  lighting beside Tololo).
- Before/after evidence per iteration: `assets-dev/lade/renders/` (local).

## Model description

Composed 19-mesh humanoid, 1.888 m, feet at Z=0, root between feet, slight
forward neutral stance, broader (+16 cm shoulder) than Tololo (1.72 m).
Identity: Stahlhelm-flare helmet + headlamp with cable, twin round goggle
lenses with dark rims, snout + ridged filter canister, lavender-grey scarf
wrap/cape/front drape, layered coat with flared skirt, charcoal vest with
pack pouches and red threat tab, pauldrons (pale right-shoulder marking),
elbow/knee pads, left arm wrap, thigh pouch, tall cuffed boots, backpack
with bedroll + straps, separate rusted back-blade, separate 11-part rifle
(receiver, stock, barrel, wood handguard, magazine, grip, sights, rail,
bayonet, muzzle). 10 empties: Root/Head/Hand-D/Support, RifleGrip,
RifleSupport, Muzzle, Backpack, Blade, AttackOrigin.

## Geometry and topology (Blender-measured)

- Height 1.888 m, bbox X −0.385..0.41, Y −0.533..0.628, ground offset −0.004.
- 19 meshes, 11,996 triangles, 6,191 vertices (preferred 12–30k band edge,
  hard cap 40k respected), 17 materials, 0 textures, GLB 784,288 bytes.
- 0 true non-manifold edges (64 legitimate open boundary edges on
  helmet/mask cuts), 0 loose verts, 0 degenerate faces.
- Overlapping (never coplanar, never gapped) limb segments; joint loops at
  shoulders/elbows/hips/knees; neck/head chain separable; rifle, blade,
  backpack independent objects. Topology macros in evidence.
- GLB round-trip: re-import loads 11,996/11,996 triangles, 10/10 empties,
  zero missing dependencies.

## Materials (all original solid colors, AD1 families)

Olive/olive-dark cloth, charcoal underlayer/armor, brown leather, grey
armor, weapon metal/gun steel, wood, pack canvas, pale lens glass,
charcoal lens rims, restrained lamp emissive (1.6), rust blade, scarf
lavender-grey, pale pauldron marking, red accent. No black masses, no
micro-textures, no glow beyond the lamp lens, no reference pixels.

## Review lighting and views

- Neutral studio (Workbench): front, both sides, rear, both
  three-quarters, top, face/head/hip macros, clay, wireframe, topology
  macros, material groups, silhouette (Cycles), 4 poses.
- AD1 Grassland treatment (browser viewer with `CelLights`): front, side,
  rear, three-quarters, top, third-person, ADS, clay, Tololo comparison.
- Videos (local-only): turntable, pose-review (keyframed holds),
  camera-distance dolly.

## Browser review (`?modelReview=lade`, dev-only)

Isolated route rendering the local GLB only; production builds render
nothing; normal Grassland never loads the candidate; disposal traverses
geometry/materials/textures on unmount. Existing Lade proxy, gameplay,
aiming, cameras, and spawning are untouched (full suites green).

## Quality-gate self-assessment

Passes the proof bar: recognizably Lade beside the reference, believable
1.888 m proportions, plausible two-hand rifle hold (tactical pose), readable
at gameplay distance in both cameras without becoming a dark mass, rig-ready
structure, inside budget. Honest limits: limb/torso surfaces still show
their procedural heritage (faceted rather than sculpted); the neutral stance
is stiff; the posing is joint-pivot approximation, not a rig; automatic
weights were never generated. Recommend a detail/sculpt pass and a real
rigging milestone before any gameplay integration.

## Deferred (not final)

Grass color/density, scenery placeholders, combat VFX, Tololo palette,
Lade proxy replacement, Medisin — all unchanged from the AD1/AD1.1
acceptance. No gameplay integration, no rigging, no animation set, no
commit, push, deploy, or publish in this task. Director acceptance of the
candidate is explicitly NOT recorded.
