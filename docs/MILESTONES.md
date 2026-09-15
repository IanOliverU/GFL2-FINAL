# Milestones

Each milestone ends with evidence and director review. Completion does not equal acceptance.

## M0 — Clean Foundation and Asset Proof

- React/TypeScript/Vite/R3F/Rapier project.
- Clean architecture and fixed-step simulation shell.
- Tololo PMX or converted GLB proof: material, skeleton, weapon, aim, muzzle, disposal.
- Basic test, lint, typecheck, build, and Playwright configuration.

Exit: character pipeline and empty runtime remain stable.

Recorded 2026-09-11: M0 and the M0.1 visual correction are provisionally accepted as the character-integration baseline (commit `3d0966e`); acceptance excludes animation quality, the temporary rifle proxy, final materials, VFX, audio, and game art. The active Tololo combat-kit milestone proceeds under the direct instruction recorded in `DECISIONS.md`.

## M1 — Main Menu and Dual-Camera Movement Lab

- GFL2-derived token system.
- Rotating live Grassland preview with reduced-motion/static fallback.
- Menu flow and settings shell.
- Third-person/top-down movement, aiming, sprint, dodge, collision, camera switching, pause/focus behavior.

Exit: menu is readable and camera switching never alters simulation state.

## M2 — One-Doll Combat Slice

- Tololo firearm, reload, recoil, hit response, damage, health, death, retry.
- Temporary representative passive, Skill 1, Skill 2, and Ultimate pending final kit approval.
- Basic melee, ranged, fast, heavy, and elite enemies.

Exit: combat is enjoyable enough to build upon in both cameras.

Status 2026-09-11: the Tololo-only combat-kit milestone is active under the direct M1 instruction (see `DECISIONS.md` mapping); evidence lands in `artifacts/` under the M1 run identifier.

Status 2026-09-12: the M1.1 dual-camera controls correction is technically complete in the working tree under the same mapping (no M2 work begun); direction evidence lands in `artifacts/` under run `tololo-m11-controls-20260912`. Neither M1 nor M1.1 is director-accepted.

Director acceptance 2026-09-12: Ian manually verified and accepted the M1 Tololo Complete Playable Combat Kit and the M1.1 Dual-Camera Controls Correction as the playable-combat baseline. Acceptance covers kit wiring, corrected movement/camera behavior, and the recorded tests and evidence. It explicitly excludes provisional balance values, representative ability names, procedural animation quality, the temporary rifle proxy, placeholder VFX/audio, non-final materials, and unverified asset redistribution permission, all of which remain director-reviewable.

Status 2026-09-12: the first enemy sub-slice, Felagi · Lade, is implemented in the working tree for technical review only. It is a deterministic Threat Level 2 pursuer with a provisional procedural proxy, telegraphed attack/recovery, Tololo-kit interactions, one-time rewards, dual-camera tests, lifecycle diagnostics, and compact evidence. It is not in the normal encounter-director roster and is not director-accepted; Medisin and all higher threats remain unimplemented.

Status 2026-09-12 (M2.1): Lade receives a visual fidelity correction over the same procedural proxy plus a development-only `?enemyPreview=lade` review mode that runs controlled encounters through the real director with an explicit non-progression banner. Normal Grassland spawning is unchanged and Lade remains unaccepted; no permanent roster change is authorized without Ian's review.

Status 2026-09-15 (AD0): rendering-direction comparison prototype is technically complete in the working tree for review only. Cel-shaded 3D, pixel-styled 3D, and 2D/2.5D pixel treatments share one isolated study scene with matched content, cameras, and timing; evidence is four contact sheets, 36 screenshots, three videos, and scored comparison reports. The grey aiming line and white endpoint circle are removed from normal gameplay (crosshair and authoritative aiming unchanged); a red laser sight is reserved as a future attachment with a development-only preview. No art direction is selected and Medisin remains deferred until the visual workflow is decided.

Director acceptance 2026-09-16 (AD0): Ian manually tested and accepts the corrected enemy hit volumes, bullet collision and damage registration, crosshair alignment, third-person/ADS/top-down aiming, removal of the obsolete aiming line and endpoint circle, and preservation of the normal crosshair. AD0 is technically accepted as a rendering-comparison checkpoint. No final art direction has been selected and Lade's current visual remains temporary.

Status 2026-09-16 (AD1): cel-shaded 3D selected by Ian as the final base rendering direction. Reusable foundation in `src/render/cel/` (palette, bands, families, lighting, fog, outline policy) integrated into normal Grassland; authoritative reference is `docs/ART_DIRECTION.md`. Third-person camera centers on the character and level-up releases the pointer lock (per Ian's instruction). Review evidence (4 contact sheets, 4 videos, style/performance/capture reports) is in `artifacts/art-direction/`. Not director-accepted; no commit/push/deploy without explicit instruction.

## M3 — Progression

- EXP, level curve, paused three-card selection.
- Guaranteed Skill 1/Skill 2/Ultimate sequence.
- Weapon and general upgrades, caps, and rerolls.

Exit: deterministic tests prove card eligibility and guarantees.

## M4 — Loot and Sardis

- Attachment compatibility, rarity, rolls, compare/equip/salvage.
- Sardis sources and post-boss spending.

Exit: no invalid equipment or impossible economy state.

## M5 — Complete Grassland Loop

- Intentional Grassland art treatment.
- Seeded pedestal placement and discovery aids.
- Multi-phase boss, weak point, break window, extraction, results.
- Complete start-to-extraction browser test.

Exit: director accepts the full vertical slice.

## M6 — Remaining Dolls

- Qiongjiu, Mosin-Nagant, Sabrina, Peritya, and Vepley.
- Character-specific resources, skills, weapon feel, UI, VFX, and tests.

## M7 — Four-Stage Run

- Desert, Rain, and Winter stages.
- Stage-specific weather/mechanics, enemies, bosses, transitions, and final completion.

## M8 — Balance, Performance, and Polish

- Full-run balance and accessibility.
- Quality presets, LOD/culling/pooling, load-time and memory work.
- Cross-browser regression, credits, asset/license review, and release readiness.

No milestone authorizes automatic deployment.
