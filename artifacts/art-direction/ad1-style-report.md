# AD1 Style Report — Cel-Shaded 3D Lock (Technical, Not Director Acceptance)

Ian selected cel-shaded 3D. This report records the reusable foundation,
the integration, the measured performance, and the review evidence. No
final-art claim is made; Lade's visual remains a temporary proxy.

## Direction

Authoritative reference: `docs/ART_DIRECTION.md`. AD0 comparison complete;
pixel-styled 3D and 2D/2.5D pixel rejected as the primary direction. Risk of
Rain 2 principles are inspiration only — no external assets, shaders, or
values copied.

## Reusable system (`src/render/cel/`)

- `celPalette.ts` — 25 provisional tokens: muted environment set, actor
  sets, gameplay accents shared with UI tokens (cyan/gold/red/green/
  orange/amber). Nothing claimed as canonical GFL2 values.
- `celBands.ts` — exactly two shared gradient ramps: 3-band actors
  (stops 120/180/255), 2-band environment (150/255), NearestFilter.
- `celMaterial.ts` — 12 families (`CEL_MATERIAL_FAMILIES`) with band
  assignment; `createCelToonMaterial` factory; `applyCelToMmdMaterials`
  audit (unifies the ramp, preserves albedo/alpha/transparency, keeps the
  EyeShadow rule and the 0.4 additive-sheen attenuation).
- `celLighting.ts` — overcast late-afternoon rig: sun `#ffe9c4` 2.3,
  hemi 1.15, cool rim `#bcd4ff` 0.5, fog `#c3cfc6` 54/118.
- `CelSurface.tsx` — the only styled lit-surface component; exposes no
  roughness/metalness props by design; forwards material refs for
  presentational pulses (Lade lens glow preserved).
- `CelLights.tsx` — rig component shared by game and menu preview.
- `outlinePolicy.ts` + `ContextualOutline.tsx` — no global pass; one gated
  hull on the Warden core (gold while vulnerable, faint red while
  telegraphing, absent otherwise).
- `CelStyleTag.tsx` — publishes `window.__GFL2_CEL_STYLE__` for browser
  regression tests.

## Normal Grassland integration

Sky/gradient sun, fog, ground (toon + texture), grass instance colors,
trees, hills, pedestal, extraction device, boundary markers, all standard
enemy bodies, Lade proxy bodies, boss bodies, AK-Alfa proxy, and pickups
run on the shared ramps. Unlit readability surfaces (telegraphs, health
bars, rings, projectiles, bursts, damage numbers) intentionally stay flat
basic materials with existing colors and intensities. Tololo MMD keeps
authored albedo/alpha; the PMX loader path is otherwise untouched.
PlaceholderPlayer (load fallback) and the AD0 study materials are
deliberately unchanged.

## Gameplay fixes landed with AD1 (per Ian's instruction)

- Third-person camera centers horizontally on the character (lateral
  shoulder offset removed in render + analytic twin; measured NDC x = 0 on
  desktop and portrait; crosshair alignment preserved by construction).
- Level-up cursor: modal overlays release a held pointer lock and a pure
  unit-tested `mayAcquirePointerLock` gate refuses re-acquisition while any
  modal owns the cursor. No simulation or card changes.

## Performance (this machine, chromium channel, vsync-capped rAF ~6.2 ms)

| Scenario                 | Avg FPS | 1% low FPS | P95    | Calls |   Tris | Progs | Geo | Tex |  Heap Δ |
| ------------------------ | ------: | ---------: | ------ | ----: | -----: | ----: | --: | --: | ------: |
| third-person 1280x720    |   164.3 |      106.0 | 6.20ms |   163 | 93,796 |    27 |  88 |  17 | +1.29MB |
| ADS 1280x720             |   164.2 |      101.6 | 6.20ms |   160 | 93,672 |    27 |  88 |  17 | +1.42MB |
| top-down 1280x720        |   164.8 |      131.8 | 6.20ms |   158 | 94,376 |    28 |  92 |  17 | +1.37MB |
| narrow third 390x844     |   164.8 |      132.1 | 6.20ms |   150 | 93,464 |    28 |  79 |  17 | +1.44MB |
| controlled Lade 1280x720 |   165.0 |      149.9 | 6.20ms |    88 | 90,768 |    15 |  34 |  17 | +0.14MB |

Raw: `ad1-performance.json` (also carries p99, worst frame, loadMs,
renderer before/after, console/resource errors — all zero). Render
targets are code-determined: one shadow map, zero post passes, zero extra
targets. The capped environment cannot rank GPU cost; all modes clear 60
FPS with headroom (worst 1% low 101 FPS). No 63549e2-vs-AD1 regression
claim beyond shared-ramp reuse and unchanged light/pass counts: same
single shadow map, same three-light rig shape (+rim), zero added passes.

## Evidence

- Contact sheets: `ad1-character-materials.png`,
  `ad1-enemy-readability.png`, `ad1-camera-readability.png`,
  `ad1-effects-readability.png` (21 source shots in
  `artifacts/screenshots/ad1-*.png`, local-only).
- Videos (local-only): `ad1-third-person.webm`, `ad1-ads.webm`,
  `ad1-top-down.webm`, `ad1-controlled-lade.webm`.
- Captures: `ad1-capture.json` (21 shots, zero errors).
- Judges: posterized lighting, no permanent outlines, Tololo identity,
  enemy silhouette, environment contrast, fog, crosshair/weapon
  visibility, telegraphs, skill readability, dual-camera compatibility.

## Known limitations

- Tololo paleness under bright sun persists (authored albedo, by policy).
- Thin tree trunks read near-black in shadow bands (unchanged from
  baseline framing; flagged for Ian's review, not silently fixed).
- PlaceholderPlayer fallback and AD0 study materials are pre-cel.
- Vsync-capped profiling cannot rank GPU cost; needs an uncapped rig.
- No Medisin, no new Doll, no Lade remodel, no balance or aiming changes.
