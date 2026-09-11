# Asset Manifest — Tololo M0 / M0.1 Integration

Date: 2026-09-11 (M0.1 correction pass).
Scope: Local development only. No asset is approved for redistribution.

## Selected Runtime Source

- Path: `assets-source/Character MMD/Tololo (Default)/GirlsFrontline TololoDefault.pmx`
- Size: 2,670,878 bytes.
- SHA-256: `F8F3C0C6D8EC5B54576A91620DEBFC44B9D010EE3DC3E29DD3861A8C7BB4BE44`.
- Format: PMX 2.0 (parsed via `three-stdlib` MMDLoader in the browser).
- Geometry: 30,905 vertices, 40,000 triangles, 21 materials.
- Textures: 15 PMX entries (13 real files plus two directory-placeholder entries); 11 unique textures loaded at runtime with zero resource errors.
- Rig: 409 bones, 90 source morphs (89 runtime morph targets), 298 rigid bodies, 408 constraints.
- Raw bounds (PMX units): min `[-7.238325595855713, -0.000019397461073822342, -3.83981990814209]`, max `[7.2383270263671875, 20.002002716064453, 1.7889755964279175]`, size `[14.4766526222229, 20.002022113525527, 5.628795504570007]`.
- Runtime fit: target height 1.72 m, scale `0.08599130579087412`, grounding offset `0.0000016680130067656345`.
- Measured runtime bounds: min `[-0.42627590037727825, -1.3e-16, -0.33019112175264353]`, max `[0.32856614839206033, 1.72, 0.5089375140814942]`; grounding error `-1.3e-16` m (effectively zero).

## Rig Map (Resolved, Zero Missing)

Exact Japanese controls with English fallbacks: `全ての親` (root), `センター`, `グルーブ`, `腰`, `下半身`, `上半身`, `上半身2` (chest), `首`, `頭`, `両目`, `左肩` / `右肩`, `左腕` / `右腕`, `左ひじ` / `右ひじ`, `左手首` / `右手首`, `左ダミー` / `右ダミー` (grip targets), deformation legs `左足D` / `右足D`, `左ひざD` / `右ひざD`, `左足首D` / `右足首D`, `左足先EX` / `右足先EX`.

No bone in the 409-bone set matches weapon, gun, rifle, muzzle, `武器`, or `銃`. The temporary AK-Alfa is a labeled procedural placeholder attached to the authoritative simulation muzzle, not to character geometry. `WalkieTalkie` (index 219, parent `右腕`) is a clothing/accessory bone and is not used as a weapon socket.

## M0.1 Deep Inspection (Read-Only, 2026-09-11)

Parsed with the same `three-stdlib` PMX parser used at runtime; nothing was modified.

- Metadata: `GirlsFrontline TololoDefault`. Embedded comment (261 chars) states, in summary: no redistribution (请勿二次配布）, no commercial use, no 18+/extreme-religious/gore/harassment use; model by Sunborn Network Technology, rigged and fixed by DesmondChan. This confirms redistribution/release stays blocked.
- Materials (21): BodySkin, Clothing ×5 (indices 1, 2, 17, 18 plus Socks sharing cloth textures), Lashes, Brows, Teeth ×2, Tongue, Mouth, Face, EyeWhite (all on the face texture), Eyes, Eyes+, EyeShadow (diffuse alpha 0, placeholder texture entry `Textures\`), Hair ×2, Emotion1/Emotion2 (`extra.png`). No material name matches weapon, gun, rifle, muzzle, holster, magazine, AK, or Alfa.
- Textures (15 entries): 13 real files plus two directory placeholders (`spa\`, `Textures\`); the loader substitutes a 1 px transparent pixel for those. EyeShadow therefore renders as a faint shadow layer (alphaTest 0.01 at runtime).
- Morphs (90 source): 63 vertex morphs (brows, eyes, blink, mouth, emotion, iris) and 27 bone morphs (T/A-pose, elbow/shoulder blends). None are driven at runtime; animation is procedural.
- Display frames: none present in this PMX revision.
- Rigid bodies (298) and constraints (408) are parsed but never simulated; rendering is presentational and gameplay collision stays simulation-authoritative.
- Loader behavior (three-stdlib MMDLoader, verified in `node_modules`): materials become `MeshToonMaterial` with `CustomBlending`; `transparent` is set only when diffuse alpha is not 1, when used UV texels carry alpha below 253 (hair strands, lashes, fishnet socks, emotion decals), or when an alpha morph targets the material. Toon gradient maps come from `spa/toon-1.bmp` or embedded defaults, so banding works; additive sphere maps (`shinetest3.png`, `Socks.png`, `spa-1.bmp` on clothing/socks/hair) add a white sheen that the runtime now attenuates (`envMapIntensity` 0.4, albedo untouched).
- Hip accessory note: the white cylinder plus tan disc visible at her left hip is clothing-geometry (tactical pouch/holster prop). It has no weapon material, no weapon bone, and no muzzle reference, so it is not usable as the equipped AK-Alfa.

Conclusion: the model contains no usable embedded AK-Alfa or related weapon geometry. M0.1 therefore replaces the oversized rifle with a restrained ~0.78 m low-poly rifle proxy (explicitly labeled temporary), keeps the authoritative simulation muzzle as the single source of truth, and calibrates both grip targets onto the proxy (primary/pistol grip, support/handguard).

## Supplied Package (Local Only)

- `assets-source/Character MMD/`: 10 PMX packages — Makiatto, Mosin-Nagant, Papasha, Peritya, Qiongjiu, Sabrina, Suomi, Tololo, Ullrid, Vepley. Full `npm run audit:mmd` inventory (2026-09-11): Makiatto 3,264,453 bytes / 323 bones, Mosin-Nagant 2,410,854 / 433, Papasha 2,498,324 / 313, Peritya 2,307,127 / 250, Qiongjiu 2,422,970 / 347, Sabrina 2,550,330 / 353, Suomi 2,683,690 / 408, Tololo 2,670,878 / 409, Ullrid 3,539,351 / 413, Vepley 2,533,987 / 328.
- `assets-source/GFL2 Enemies References/`: six reference PNGs (`250px-Berserker_S.png`, `250px-Felagi-Hagle_I_S.png`, `250px-Felagi-Kaste_S.png`, `250px-Felagi-Lade_I_S.png`, `250px-Felagi-Medisin_I_S.png`, `250px-Felagi-Snikskytter_I_S.png`).
- Totals: 248 files, 428,154,185 bytes.
- Tololo folder: 25 files, 25,441,094 bytes.
- No `.vmd`, `.vpd`, `.glb`, `.gltf`, `.fbx`, `.obj`, `.blend`, `.bvh`, or standalone animation files were found.
- No standalone AK-Alfa weapon model was found. (Ullrid's folder contains a weapon diffuse texture for Ullrid's own model; it is not reviewed for reuse and is not used.)

## Berserker Reference Provenance (M0.1 Asset Note)

- File: `assets-source/GFL2 Enemies References/250px-Berserker_S.png` (104,020 bytes). It depicts a bulky armored enemy with a bear-like helmet, red eyes, and plated torso, and is recorded here as an official-game Girls' Frontline 2 Berserker boss reference for future boss development only.
- No Varjager model files exist anywhere in the supplied package: filename search and source references for "Varjager" return nothing. There is no Varjager material or directory to preserve beyond this note.
- Redistribution permission for the Berserker image is unverified. It stays local-only, excluded from commits by the existing `/assets-source/GFL2 Enemies References/` ignore rule. Do not alter, delete, rename, publish, or use it as a public runtime texture. No Berserker or Varjager enemy is implemented in this milestone.

## Serving And Separation Rules

- Original MMD sources are never renamed, modified, deleted, copied into tracked runtime paths, or committed.
- `.gitignore` narrows exclusions to `/assets-source/Character MMD/`, `/assets-source/GFL2 Enemies References/`, plus `public/assets/**/*.pmx|pmd|vmd|blend` and `public/assets/**/raw/`.
- Runtime loads the PMX only through local-only Vite/preview middleware at `/__local-mmd/` (see `vite.config.ts`). Production `dist/` contains no PMX.
- `npm run audit:mmd` parses PMX metadata read-only. `npm run probe:tololo` and `npm run inspect:tololo` verify browser loading read-only.

## License And Redistribution

- Source and permission status: the embedded PMX comment names Sunborn Network Technology (model) and DesmondChan (rig/fix) and prohibits redistribution, commercial use, and hostile/adult/extremist/gore use. No separate permission record exists, so the status remains: unverified for our purposes, local-only.
- Status: local development and gameplay-only proof. Never commit, push, redistribute, deploy, or publish the PMX, its textures, or derived runtime copies.
- Animation is procedural and provisional because no authored animation clips were supplied.
- The AK-Alfa representation is a restrained procedural proxy (M0.1), explicitly labeled temporary; no production weapon asset exists in the supplied package.

## Verification Pointers

- `npm run audit:mmd` — reproducible PMX inventory, hashes, bounds, textures, materials, bones, morphs.
- `npm run probe:tololo` — isolated browser load/disposal probe.
- `npm run inspect:tololo` — runtime diagnostics: load state, resolved/missing bones, bounds, grounding error, muzzle error, grip errors, animation state.
- `tests/unit/tololo-animation.test.ts` — bone mapping, rest-relative poses, state selection, pause freeze, death lock, disposal.
- `tests/e2e/game.spec.ts` — Tololo load-once, uniqueness on retry, disposal on menu return, walk/sprint/dodge/reload states, both camera modes, both viewport classes.
