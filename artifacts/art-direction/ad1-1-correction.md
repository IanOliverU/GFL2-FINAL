# AD1.1 Correction Evidence — Cel-Shading Foundation Fix (Technical, Not Director Acceptance)

Scope: narrow AD1.1 only. Cel-shaded 3D direction unchanged; no pixel styling,
no Lade remodel, no Medisin, no Grassland redesign, no gameplay change.

## Audit (traced before any value change)

Tololo washout is four combined factors (three.js r186 `MeshToonMaterial`:
only the directional key is posterized through the gradient; hemisphere and
ambient add linear indirect light on top of every band):

- Hemisphere 1.15: linear wash over all three bands; strongest separator killer.
- Sun 2.3: saturates pale normals into the lit band; flat monochrome.
- STANDARD lit stop 255 (1.0): no headroom; near-white albedo clips under ACES 1.08.
- Rim 0.5: extra edge wash. Exposure, fog, albedo, maps, alpha untouched.

Grass black noise is independent of lighting: `WindGrass` set
`vertexColors` on a plane with no color attribute, so the unbound attribute
reads black and hides the olive instance colors. Cone-tree darkness shares
the toon-floor cause (FLAT shadow stop 150 = 0.588 on dark albedo).

## Numeric before → after

| Parameter                   |                Before |       After | Note                                           |
| --------------------------- | --------------------: | ----------: | ---------------------------------------------- |
| Sun intensity               |                   2.3 |        1.85 | warm key stays dominant                        |
| Hemisphere intensity        |                  1.15 |         0.8 | linear wash lever                              |
| Rim intensity               |                   0.5 |        0.65 | cool edge separation, restrained               |
| Preview sun                 |                  2.25 |         1.8 | same ratio, brighter by design                 |
| Preview hemisphere          |                   1.5 |        1.05 | same ratio, unshadowed by design               |
| Study final sun             |                   2.0 |         1.6 | tracks shipped rig                             |
| Study final hemi            |                  0.95 |        0.65 | tracks shipped rig                             |
| Neutral rig                 |                 storm |       storm | unchanged inspection reference                 |
| STANDARD ramp               |           120/180/255 | 120/170/240 | lit 1.0 → 0.941 headroom                       |
| FLAT ramp                   |               150/255 |     175/255 | floor 0.588 → 0.686                            |
| Grass `vertexColors`        |                  true |       false | root-cause fix; count/placement/wind unchanged |
| Grass instance colors       | `#7d9a58` / `#496e39` |   unchanged | olive variation preserved                      |
| Tone mapping / fog / albedo | ACES 1.08, fog 54/118 |   unchanged | no global multiplier                           |

## Frame metrics (identical views, HUD chrome identical in both)

| View              | Mean lum before → after | Near-black frac before → after | Neutral check     |
| ----------------- | ----------------------: | -----------------------------: | ----------------- |
| Tololo front      | 149.54 → 142.67 (−4.6%) |                0.0018 → 0.0023 | —                 |
| Tololo 3/4        | 145.33 → 137.60 (−5.3%) |                0.0025 → 0.0026 | —                 |
| Tololo neutral    | 155.82 → 155.80 (Δ0.02) |                      unchanged | rig untouched     |
| Study third       |         138.67 → 130.38 |                      unchanged | —                 |
| Gameplay third    |           72.49 → 71.44 |         0.0272 → 0.0086 (−68%) | black noise fixed |
| Gameplay ADS      |           71.30 → 70.81 |         0.0316 → 0.0042 (−87%) | black noise fixed |
| Gameplay top-down |           47.08 → 42.25 |         0.0173 → 0.0053 (−69%) | masses readable   |

Residual near-black is HUD dark panels and the dark weapon proxy, present in
both runs. Raw: `ad1-1-correction.json`.

## Contact sheets (before AD1 left, after AD1.1 right)

- `ad1-1-tololo-lighting.png` — front final, 3/4 final, front neutral.
- `ad1-1-gameplay.png` — third-person, ADS, top-down.
- `ad1-1-grass-distance.png` — near (third), medium (study third), far (top-down).
- `ad1-1-sky-ground.png` — Tololo vs bright sky (third), vs dark ground (top-down).

After shots: `artifacts/screenshots/ad1-1-*.png` (7 frames, zero page errors).

## What the sheets show

- Face (eyes/brows), hair shadow-side volume, scarf, jacket panels, skirt,
  legs, boots, pouches, and the dark rifle separate in final light; whites
  hold gradation instead of clipping to one value.
- Grass renders olive/desaturated-green blades at near range and merges into
  readable masses at distance; foreground no longer competes with Tololo,
  crosshair, or HUD.
- Cones lift out of near-black while staying muted; Tololo stays brighter
  than the environment without glow.
- Neutral views are pixel-identical in treatment (Δ0.02 = capture noise),
  so final-vs-neutral now shows a controlled directional difference.

## Known limits

- Authored MMD albedo is near-monochrome; the style pass will not repaint
  it, so separation gains are deliberately modest, not a re-texture.
- No motion, animation, camera, aiming, balance, or roster change in this pass.
