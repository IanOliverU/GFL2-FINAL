# Art Direction Bible — Cel-Shaded 3D (AD1, Authoritative)

Selected by Ian (2026-09-16); AD0 comparison completed; pixel-styled 3D and
2D/2.5D pixel rejected as the primary direction. This document is the
authoritative visual reference for future agents. It describes principles and
the shipped implementation — never a replica of Risk of Rain 2 or any other
game. No assets, shaders, levels, characters, textures, UI, or exact color
values are copied from external works.

Implementation home: `src/render/cel/` (tokens, bands, materials, lighting,
outlines) consumed by `GrasslandWorld`, the actor modules, and the review
scene. Browser facts are published by `CelStyleTag`
(`window.__GFL2_CEL_STYLE__`).

## 1. Visual-direction statement

GFL2 FINAL uses stylized tactical-anime 3D with mostly realistic character
proportions, simplified but recognizable equipment, posterized lighting,
strong silhouettes, muted atmospheric environments, and controlled saturated
gameplay accents. It avoids global black outlines and photorealistic
material noise.

## 2. Visual priorities

1. Combat readability in both cameras at all times.
2. Tololo instantly recognizable (hair mass, outfit, weapon).
3. Threat level readable from silhouette before effects.
4. Muted world, brighter actors, reserved saturated accents.
5. Stable 60+ FPS: shared ramps, shared programs, no full-scene passes.

## 3. Shape language

### Dolls

- Clean, readable human silhouette; recognizable hair mass and primary
  outfit layers; clearly identifiable signature weapon.
- Simplified tiny accessories; controlled cloth and equipment overlap.
- Weapon silhouette readable from gameplay distance.
- Feet and pose grounded correctly (Tololo: 1.72 m, grounded, PMX proof).

### Standard Varjagers

- Human-proportioned base; broader equipment silhouette than Dolls.
- Recognizable headgear, mask, armor, backpack, and weapon per role.
- Clear role-specific silhouette; slight asymmetry where it aids recognition
  (Lade: back blade, lamp cable, draped scarf).
- No featureless black primitive bodies; threat level reads from silhouette
  before effects (mass, armor plates, elite trim, weapon size).

### Bosses

- Clearly larger without destroying human-scale context.
- Strong primary and secondary silhouette masses (Warden: dodecahedron
  hull, armor plates, harvester ring, core).
- Recognizable weak-point presentation (core color + gated outline).
- Reserved high-threat visual accents (gold break torus, red telegraphs).
- Berserker remains Threat Level 5 and is not implemented during AD1.

### Environment

- Large readable masses (hills, ruin wall, rock, landmark) with open
  combat lanes and moderate prop density.
- Simplified geometry at combat distance; memorable landmarks.
- No uniform procedural scattering, no excessive surface noise, no
  featureless flat expanses without composition.

## 4. Character rules

- Tololo's MMD albedo, face, hair, outfit, alpha, and textures are never
  repainted by the style pass. `applyCelToMmdMaterials` unifies only the
  lighting response (shared 3-band ramp) and preserves the EyeShadow alpha
  rule, sRGB maps, transparency, and the attenuated additive sphere-map
  sheen (`envMapIntensity` 0.4). Residual paleness under bright sun is a
  known approximation, not a defect to paint over.
- Doll identity colors stay slightly more saturated than the environment
  with clear separation and no artificial glow.
- Temporary proxies (AK-Alfa, PlaceholderPlayer load fallback) stay
  explicitly labeled and use the weaponMetal family, never final-art claims.

## 5. Varjager rules

- Muted military materials from `celPalette` (olive cloth, charcoal armor).
- Threat accents (warning-red lenses/visors, gold elite trim) never borrow
  Tololo's cyan/gold skill families — elite gold is a rank marker paired
  with red emissive, visually distinct from the Ultimate gold burst context.
- Masks, lenses, weapons, and attack origins stay readable at approach
  distance; lens emissive pulses with wind-up (presentation only).
- Never render enemies as featureless dark silhouettes: mid-tone cloth
  against the darker armor keeps role parts separable.

## 6. Environment rules

- Overcast late-afternoon Grassland: beautiful but abandoned, nature
  reclaiming tactical ruins, post-apocalyptic, marked by localized
  conflict; calm at distance, dangerous during encounters.
- Ground carries the terrain texture through a 2-band toon response;
  grass blades use two instance colors; hills/trees posterize flat.
- Clouds stay soft Lambert puffs; the sky gradient sun disc follows the
  key-light direction.
- No lighting state may let Lade disappear into the grass: actor bands
  plus the rim light guarantee separation (verified in review captures).

## 7. Material rules

- One class: `THREE.MeshToonMaterial`. No PBR sliders on styled surfaces —
  `CelSurface` exposes no roughness/metalness props by design; metal reads
  come from value contrast plus rim light.
- Families (`CEL_MATERIAL_FAMILIES`, `src/render/cel/celMaterial.ts`):
  dollSkin, dollHair, dollCloth, dollMetal, varjagerCloth, varjagerArmor,
  weaponMetal, envConcrete, envSoil, foliage, interactive, skillEmissive.
- Unlit readability surfaces (telegraphs, health bars, ground rings,
  projectiles, rings, bursts, damage feedback) stay `MeshBasicMaterial`
  and are intentionally not families.
- Reuse: exactly two shared gradient textures for the whole game
  (`celGradientMap`), one compiled program family per material feature
  set; per-material dispose never frees the shared ramps.

## 8. Lighting rules

- Key: soft warm directional (`#ffe9c4`, 2.3) from (-22, 31, -18) with a
  single 1024 shadow map over the combat area; characters keep
  `castShadow`, ground keeps `receiveShadow`.
- Fill: broad cool hemisphere (`#cfd8cd` / `#3d4a38`, 1.15).
- Separation: one restrained cool rim (`#bcd4ff`, 0.5) from (6, 3, -8).
- No bloom, no extra real-time lights, no crushed blacks, no washed-out
  characters. Menu preview reuses the same rig (brighter, unshadowed).
- Implementation: `CelLights` (`src/render/cel/CelLights.tsx`), constants
  in `src/render/cel/celLighting.ts`.

## 9. Color hierarchy

Environment (muted): olive `#6b8452`, desaturated greens, weathered grey
`#8b8d86`, dusty brown `#6e5f45`, charcoal `#3a3b39`, blue-grey atmosphere
`#c3cfc6`. Dolls: authored MMD identity, slightly higher saturation than
the world. Varjagers: muted olive/charcoal with red/gold threat accents.
Gameplay accents (shared with UI tokens): skills cyan `#55b9c6`,
Ultimate gold `#d9a441`, hostile telegraphs red `#c93b2f`, support green
`#7e9b63`, interactables orange `#f05a28`, weak-point amber `#ffb347`.
All values are provisional production approximations, not canonical GFL2
values. Full token table: `src/render/cel/celPalette.ts`.

## 10. Fog and atmosphere

- Muted blue-grey fog `#c3cfc6`, near 54, far 118 (preview 45/105):
  distant landmark separation without ever obscuring ordinary combat
  range. Constants in `celLighting.fog`; live values asserted in browser
  via `CelStyleTag`.

## 11. Outline policy

- No permanent heavy black outlines anywhere. No full-scene outline pass,
  now or later, without conclusive justification.
- Allowed: subtle silhouette reinforcement where necessary (none shipped);
  boss weak-point highlight; short hit/threat emphasis; interactable
  highlight; accessibility setting (future); targeted/occluded-enemy
  outlines (future gates, not code).
- Shipped: exactly one gated hull — `ContextualOutline` on the Warden
  core, gold while vulnerable (break window), faint red while
  telegraphing, absent otherwise (`bossWeakPointOutline`).
- Forbidden: thick outlines on every character/object, distance-unstable
  thickness, outlines hiding faces/weapons/small enemies, outlines
  compensating for poor lighting or contrast.

## 12. VFX readability

- Projectiles stay flat bright capsules (hostile red, hydro cyan, heavy
  pale) with small point lights; skill rings cyan, Ultimate gold tetra
  burst; death bursts orange; spawn markers red; dodge trail cyan.
- Telegraph rings stay warm red/orange above all style changes; skill
  effects never hide targets (bounded scale, fading opacity).
- Emissive intensities are data, not style: preserve existing values when
  converting a surface (lenses, visors, cores, scanner rings, pickups).

## 13. UI relationship

- HUD keeps the charcoal/graphite/ivory system with the orange primary
  action; world accents reuse the same tokens so HUD and world speak one
  language (cyan skills, gold rewards/Ultimate, red danger).
- Pixel techniques may later influence UI icons or selected effects only —
  never the primary rendering direction.

## 14. Camera-distance requirements

- Third-person: Tololo horizontally centered, separating from the ground
  at all times; crosshair readable; weapon silhouette visible; enemies
  distinguishable at approach; ADS adds no material/outline artifacts;
  fog never covers combat range.
- Top-down: Tololo identifiable; roles distinguishable; telegraphs
  readable; ground never merges with actors; skill effects never hide
  targets; silhouettes hold at small projected size.

## 15. Performance budget

- Minimum stable 60 FPS on a typical gaming PC/laptop (prefer 60–120).
- No major regression from 63549e2. No unique shader per repeated object
  (shared ramps/programs). No extra render passes (shadow map only; zero
  post passes; zero additional render targets). No extra real-time lights
  versus baseline (key + hemi + rim; projectile lights unchanged).
- Disposal and resource cleanup preserved (shared ramps excluded from
  per-material dispose; `disposeCelGradientMaps` is app-teardown only).
- Every comparison profile reports: average FPS, 1% low FPS, p95 frame
  time, draw calls, triangles, programs, geometries, textures, heap
  delta, scene-load time, console errors, resource errors.

## 16. Asset-review procedure

1. Confirm source and permission status before any asset work.
2. Check the family assignment against sections 4–7.
3. Inspect in the AD1 review scene: neutral light, final light, gameplay
   distances in both cameras, telegraph, hit reaction, skill readability.
4. Capture the required contact-sheet views; record scores and metrics in
   `artifacts/art-direction/ad1-style-report.md`.
5. Director review decides acceptance; technical completion never implies
   acceptance.

## 17. Prohibited approaches

- Copying Risk of Rain 2 (or any external) assets, shaders, levels,
  characters, textures, UI, or exact color values.
- Permanent heavy outlines; full-scene outline/post passes.
- Replacing Lade's model, implementing Medisin or another Doll, or
  redesigning the whole Grassland inside a style task.
- Rebalancing combat, changing aiming or hit volumes, adding the laser
  sight to progression.
- Photorealistic material noise, PBR-slider styling, per-object shader
  forks, unbudgeted real-time lights.

## 18. Acceptance checklist

- [ ] Cel-shaded 3D recorded as Ian's selected direction (done, DECISIONS).
- [ ] Reusable material, color, lighting, fog, and outline policies exist
      in `src/render/cel/` (done).
- [ ] Normal Grassland demonstrates the direction (done).
- [ ] Tololo recognizable; enemies more readable (review evidence).
- [ ] Lade documented as temporary; no new enemy; no Medisin (done).
- [ ] Third-person, ADS, top-down functional; crosshair and aiming intact
      (tests + captures).
- [ ] Performance acceptable with full metric set (ad1-performance.json).
- [ ] All required checks pass; evidence compact and reviewable.
- [ ] No commit/push/deploy without explicit instruction.
