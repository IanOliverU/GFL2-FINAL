# Milestones

Each milestone ends with evidence and director review. Completion does not equal acceptance.

## M0 — Clean Foundation and Asset Proof

- React/TypeScript/Vite/R3F/Rapier project.
- Clean architecture and fixed-step simulation shell.
- Tololo PMX or converted GLB proof: material, skeleton, weapon, aim, muzzle, disposal.
- Basic test, lint, typecheck, build, and Playwright configuration.

Exit: character pipeline and empty runtime remain stable.

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
