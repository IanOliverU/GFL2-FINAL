# AD2A.1 Lade Humanoid Construction Study — Technical Report (Not Director Acceptance)

One new isolated Felagi · Lade candidate built locally on a continuous
humanoid base with scripted Blender Python. No external service, no
reference upload, no downloaded model, no manual Blender work, no gameplay
integration. The protected reference was viewed locally as reference only:
never renamed, moved, traced, textured, embedded in evidence, or shipped.
The rejected AD2A primitive candidate was not rigged, animated,
integrated, committed, or published; it is preserved untouched in
`assets-dev/lade/` and remains the review-route default.

## 1. Method

Local-only Blender-built-in humanoid-base pipeline
(`tools/lade_ad2a1/`, committed; selected per the Phase 1 audit):

- Anatomical joint table (1.86 m target) guided by the bundled Rigify
  human meta-rig proportions (measurement reference only; no Rigify
  generate step, so no GPL rig code is embedded in any export).
- Body: ONE continuous Skin-modifier mesh grown from a 49-vertex
  anatomical skeleton graph (spine/neck/skull/crown, full arm chains with
  glove-mass fingers, full leg chains with heel/toe), Subdivision 2,
  scripted anatomical shaping (trapezius slope, branch-spike cap, chest
  mass, waist taper, pelvis settle, calf line, sole plane), smooth-shaded.
- Head: separate fitted balaclava mesh (required `Lade_Head` contract);
  neck seam concealed under the scarf wrap (standard practice).
- Equipment: separate fitted shells (helmet + headlamp + cable, face-fit
  gas mask with EMBEDDED round lenses, scarf wrap/drape/cape, vest +
  pouches + red tab, coat skirt, pauldrons + pads + arm wrap + thigh
  pouch, backpack + bedroll + straps, stored back blade, 13-part rifle
  authored with its origin at the trigger grip).
- Test armature: project-owned 20-bone deform rig, automatic weights +
  scripted weight surgery (arm influence stripped beyond 9 cm from arm
  chains, renormalized). Temporary by design; the full animation
  milestone is NOT begun.
- Two variants: neutral (armature + weights preserved = rig proof) and
  rifle-ready (temporary IK bakes both hands onto the across-chest rifle,
  armature removed, sockets re-seated from solved bone worlds).

## 2. Geometry and topology (Blender-measured, inspection PASS 0 failures)

- Neutral 1.86 m / ready 1.8576 m (budget 1.85–1.90), feet at z = 0.
- 15 meshes (+1 test armature in neutral), 21,152 triangles (cap 40,000),
  10,731 vertices, 16 materials, 0 textures.
- GLB bytes: neutral 751,500 (skinned), ready 585,292 (baked).
- 0 non-manifold edges, 0 loose verts/edges, 0 degenerate faces, both variants.
- GLB round-trip: neutral 21,232 tris (0.4% triangulation delta, within
  tolerance), 10/10 sockets, armature survives; ready exact parity.
- Grips (manifest-measured socket worlds): neutral dominant 0.034 m
  (one-handed vertical carry, muzzle up); ready dominant/support 0.010 m
  each (in-solve IK gaps 0.000 m both hands).
- Forward axis: neutral muzzle above grip (+0.57 m z, vertical carry);
  ready muzzle forward (+0.46 m y ahead of grip).
- Weight surgery verified independently: worst stray arm weight on
  torso verts = 0.000.

## 3. Browser review (`?modelReview=lade`, dev-only, extended)

New query surface (defaults preserve the old route exactly):
`variant=base|ad2a1-neutral|ad2a1-ready` (default `base`),
`view=...|side-left`, `shade=material|clay|silhouette|wireframe`,
`sockets=1` (markers hidden unless requested). Production builds render
nothing; normal Grassland never loads any candidate.

Viewer evidence: 18 captures, 0 console/page errors. Frame sample on the
neutral gameplay view (headless Chromium, 1280x720): 120 frames, avg
6.02 ms, p95 6.5 ms; 74 draw calls, 42,352 rendered triangles
(shadow + main pass over 21,152-triangle mesh). Within the AD1 budget;
single-machine evidence only, no broad compatibility claim.

## 4. Quality-gate self-assessment

Passes the study bar with honest limits:

- Immediately reads as a human Varjager soldier at all distances;
  rejected-candidate comparison sheet shows the gap (boxy robot vs
  soldier with sloped shoulders, tapered torso, natural limbs).
- Gas mask reads as military equipment (face-fit shell, embedded round
  lenses, snout, ridged canister, side valves) with helmet, readable
  headlamp + cable, scarf wrap/drape/cape.
- Unarmored body-only clay proves believable standalone anatomy on one
  continuous membrane (no detached limbs, no floating joints).
- Rifle: natural one-hand vertical carry (3.4 cm palm gap) and solved
  two-handed across-chest ready (0.0 cm in-solve, 1.0 cm manifested).
- Deformation: shoulder 60°, elbow 90°+, hip 70°, knee 90°+, wrist and
  ankle flex all hold volume with a stable torso (surgery-verified).
- Tololo scale comparison holds (1.86 m vs 1.72 m, broader tactical mass).

Limits (no fourth iteration permitted): close-up faces/hands show the
procedural heritage (stylized, not sculpted); rigid pads/coat do not
track deep bends (production rig must split pad parenting or add
correctives); back blade reads as antenna in pure silhouette; lens rims
keep a slight goggle slant up close; the skinned neutral GLB trips a
benign upstream `Mesh.validate()` warning at export (geometry verifies
clean; baked ready export is warning-free).

## 5. Deferred (not final)

No gameplay, balance, aiming, camera, Tololo, Lade-behavior, spawning,
or lighting change. No integration, no old-proxy deletion, no Medisin,
no external generators, no downloads. No commit, push, deploy, or
publish in this task. Director acceptance of the candidate is explicitly
NOT recorded.
