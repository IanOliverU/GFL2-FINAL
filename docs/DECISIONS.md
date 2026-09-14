# Decision Log

## Locked

- Platform: desktop browser first.
- Genre: solo action roguelite.
- Presentation: switchable third-person and elevated top-down cameras.
- Stack: React, strict TypeScript, Vite, Three.js/R3F, Rapier, Zustand, Vitest, Playwright.
- Foundation: clean implementation rather than extending the Babylon.js one-shot prototype.
- First Doll/asset proof: Tololo.
- First full content target: Flat Grassland vertical slice.
- Menu: live rotating selected-map preview, with reduced-motion/static fallback.
- Run start: signature weapon and passive only.
- Core skills: guaranteed as level-up choices at Levels 2, 3, and 4.
- Attachment rarities: Common/Rare/Epic/Legendary with one through four affixes.
- Initial affixes: Flat ATK, ATK%, Critical Rate, Critical Damage.
- Sardis: run-scoped currency spent after bosses.
- Stage order: Grassland, Desert, Rain, Winter.
- Environment approach: intentional minimal maps before structures and dense props.
- Acceptance: director-gated; no automatic commit, push, or deployment.

## M0 Tololo Integration (2026-09-11, Technical, Not Director Acceptance)

- Direct PMX via `three-stdlib@2.36.1` because Three.js 0.186.0 no longer ships `MMDLoader`; Blender fallback was unnecessary.
- Local-only `/__local-mmd/` Vite/preview middleware; original sources are never copied into tracked runtime paths or committed.
- Presentation-only procedural animation over exact MMD controls with rest-pose restore; weighted `D` leg chains are driven directly; arms use a bounded two-bone CCD solve toward calibrated temporary-rifle grip targets.
- Simulation authority is unchanged except one observational `sprinting` flag; render projection additionally forwards `tick`, `dodgeRemaining`, and `recoil`.
- Temporary AK-Alfa remains procedural and pivots on the authoritative simulation muzzle; muzzle error is 0 m, grip errors are ~0.089 m (left) and ~0.063 m (right) in idle.
- Death locks the procedural controller until retry and releases arm IK; pause freezes phase after React commits the paused snapshot.
- Redistribution permission remains unverified; all supplied assets are local-only and provisional.

## M0.1 Tololo Visual and Animation Correction (2026-09-11, Technical, Not Director Acceptance)

- Deep PMX audit found no usable embedded AK-Alfa: no weapon-like material among the 21, no weapon-like bone among the 409, no display frames, no animation files. The hip prop is clothing-geometry, not a rifle. Direct-PMX route is therefore kept with a procedural proxy; no GLB conversion.
- Rifle proxy: restrained ~0.78 m low-poly AK-Alfa silhouette (gunmetal/polymer, labeled temporary), muzzle tip at the authoritative simulation muzzle, stock landing near the shoulder. Grip errors improved from ~0.089/0.063 m to ~0.031 m support and ~0.009 m dominant, inside the 0.04/0.03 m targets. IK now runs 6 iterations at 0.45 step with mild rest-relative wrist settle; shoulders stay protected.
- Locomotion damped modestly (sway 0.055 to 0.045, bob 0.09 to 0.075, leg swing 0.74 to 0.68). Foot sliding and authored-quality motion remain unclaimed limitations.
- Materials: attenuated additive sphere-map sheen (`envMapIntensity` 0.4 on Add-combine toon materials only); albedo, lighting, tone mapping, and exposure untouched. Residual paleness is bright-sun-on-light-albedo plus loader-detected transparency on hair/lashes/socks, documented as approximation.
- Normal gameplay shows no diagnostic geometry: skeleton/collider/ring/muzzle helpers are gated behind `?modelDebug=1` (verified count 0 in normal mode); dodge invulnerability now reads as a flat cyan ground ring instead of a wireframe capsule.
- Mobile third-person: aspect-gated portrait offset `(0.9, 2.1, -4.6)`, target height 1.25 to 1.0 m, FOV 56 to 60; desktop and top-down paths are byte-equivalent in behavior. Player NDC on a 390x844 viewport is ~(0.50, -0.53) idle and ~(0.46, -0.49) walking. Residual: lower legs can sit behind the bottom-right weapon panel.
- Berserker reference: `250px-Berserker_S.png` recorded as official-game boss reference, local-only, unverified permission; no Varjager model exists in the supplied package, so nothing further to preserve.
- Simulation authority unchanged: no gameplay, balance, progression, economy, boss, or extraction edits in M0.1.

## M0/M0.1 Provisional Owner Acceptance (2026-09-11)

Ian's instruction to proceed with M1 records owner/director acceptance of M0 and M0.1 as the provisional character-integration baseline (commit `3d0966e`, pushed to `origin/main`). This covers direct PMX loading, Tololo's grounded 1.72 m scale, the corrected temporary rifle proxy, the procedural animation baseline, dual-camera integration, the mobile framing correction, and the performance/lifecycle baseline, as verified in run `tololo-m01-correction-20260911` (16 Playwright tests, 32 Vitest tests, zero console/page errors).

This acceptance explicitly does not cover procedural animation quality, the temporary AK-Alfa proxy, final character materials, final VFX, final audio, or final game art, all of which remain provisional and director-reviewable.

Milestone mapping note: the instruction's M1 (Tololo Complete Playable Combat Kit) corresponds to `MILESTONES.md` M2 (One-Doll Combat Slice, Tololo only) plus the M3 skill-guarantee rules already locked above. Per authority order the instruction governs; `MILESTONES.md` structure is left unchanged.

## M1 Tololo Combat Kit (2026-09-11, Technical, Not Director Acceptance)

- No simulation mechanics were added or rebalanced: the AK-Alfa, Lightspike rhythm, three skills, unlock guarantees, and damage/attachment math already existed and are preserved exactly. M1 contributes projections (skill event value, hydro projectile kind, skill-anchored VFX positions), HUD, cards, placeholder VFX/audio, diagnostics, and tests.
- Real-time readings of Tololo's identity line are recorded in `CHARACTERS_AND_LOOT.md`; every coefficient is PROVISIONAL and labeled so in-game on level-up cards. Ability names are representative pending final kit approval.
- Instant-ability interaction rules (usable while moving/dodging/reloading; invalid while locked, cooling, dead, or paused; same-step dodge+skill allowed as extra-action rhythm) are recorded in `GAMEPLAY_SYSTEMS.md`. No separate per-camera mechanics exist; camera parity is proven by test (unlocks, cooldowns within one tick, aim, enemy health, projectile count).
- Cooldowns/buffs advance only inside fixed steps, hence freeze under pause, level-up, and death, and reset exactly on retry (all covered by simulation tests).
- VFX/audio are code-authored placeholders only: hydro projectiles render cyan, skill activations emit ground rings (gold tetra burst for the Ultimate), skill events drive distinct synth pitches. No generated textures, models, or audio.
- critRate affixes are implemented but single-sample unobservable by design (probabilistic threshold); Flat ATK, ATK%, and Crit Damage interactions are covered by exact tests.

## M1.1 Movement and Camera Control Correction (2026-09-12, Technical, Not Director Acceptance)

- Root causes, traced input to render before any sign change: the third-person strafe term used `+(cos yaw, -sin yaw)`, the mirror of screen-right `(-cos yaw, +sin yaw) = forward x up`, so `A`/`D` were swapped at every yaw while `W`/`S` were correct; the top-down move and cursor-aim paths used world `+X` for screen-right, but the fixed camera offset `(0, 18.5, -13.5)` looks toward `+Z`, making screen-right `-X`, so `D`/`A` and left/right aiming were mirrored while `W`/`S` and up/down aiming were correct; mouse yaw/pitch signs were verified conventional (right turns right, up looks up) and left unchanged; no invert-camera setting exists anywhere, so the default is conventional with nothing to persist.
- Fixes, minimal scope: pure exported basis helpers in `src/platform/input/InputController.ts` (`thirdPersonBasis/Move`, `topDownBasis/Move/Aim`, `applyMouseDelta`) with corrected signs, used by `getIntent`; top-down mouse motion no longer orbits the fixed camera or drifts the yaw restored on switch-back, and a carried pointer lock is released in top-down so the aiming cursor stays visible; the procedural animation direction classifier and dodge capture in `src/render/animation/tololoAnimation.ts` use the same corrected right vector (gait, timing, and posing untouched); a temporary `controls` basis readout was added to `src/platform/browser/diagnostics.ts`. No weapon, ability, cooldown, progression, enemy, damage, model, rifle, material, environment, asset, or release change.
- Coverage: new `tests/unit/movement-basis.test.ts` proves direction by dot product at yaw 0, 90, and 180 degrees plus top-down axes, aim quadrants, and mouse signs; the simulation switch test now proves aim/cooldown/projectile/enemy/progression preservation with immediate same-key rebase and no reversal; the mirrored expectations in `tests/unit/tololo-animation.test.ts` were corrected; a real-input WASD direction test runs in both Playwright projects.
- Interaction rules for the corrected controls are recorded in `GAMEPLAY_SYSTEMS.md`.

## M1.1 Expanded Verification (2026-09-12, Technical, Not Director Acceptance)

- The earlier M1.1 correction did persist in the tree (basis helpers in `InputController.ts`, `movement-basis.test.ts`); the re-issued instruction's claim of no edits described the stale pre-M1.1 recovery report, not the working tree. This pass hardens that fix to the expanded bar without changing its signs.
- Unified convention, documented in code and `GAMEPLAY_SYSTEMS.md`: Y-up right-handed world; yaw ground forward `(sin yaw, cos yaw)`; screen-right `forward x up`; both modes share it (top-down is the yaw-0 case); locomotion never reads pitch; `flattenForward` falls back to `+Z` on zero-length input; one `resolveMoveVector` entry normalizes diagonals and replaces the basis immediately on switch. The render layer provides orientation only and never moves the character; no scattered per-component sign fixes exist.
- Mouse verified conventional with exact synthetic deltas through the real handler (right turns right, up looks up, axes decoupled); no Invert Y setting exists, so the default is conventional and a pitch-only invert remains a documented future constraint, not code.
- Evidence: `npm run capture:controls` (`tests/e2e/capture-controls.mjs`) produces one third-person, one top-down, and one switch video plus desktop/narrow screenshots and `artifacts/performance/m11-controls.json` (inputs, bases, displacements, dots, yaw/pitch deltas, zero errors); a `?controlsDebug=1`-only overlay shows camera, keys, forward/right, move, mouse delta, yaw, and pitch, and is asserted absent from normal gameplay.

## M1/M1.1 Director Acceptance (2026-09-12)

Ian manually verified and accepted the M1 Tololo Complete Playable Combat Kit and the M1.1 Dual-Camera Controls and Camera-Direction Correction as the playable-combat baseline. Acceptance covers the kit wiring (unlock guarantees, HUD slots, skill activation/cooldown/reset behavior), the corrected camera-relative/screen-relative movement, conventional mouse look, switch continuity, and the recorded unit/simulation/browser tests and evidence.

The following remain explicitly provisional and director-reviewable, unchanged by this acceptance: all balance coefficients and damage/attachment values, the representative ability names (Hydro Barrage, Tidal Step, Starfall Recursion), procedural animation quality and foot planting, the temporary AK-Alfa rifle proxy, placeholder VFX and generated WebAudio cues, non-final character materials and residual paleness, narrow-portrait HUD overlap, final font licenses, and all asset redistribution/release permissions (embedded no-redistribution terms stand).

## M2 Felagi · Lade Vertical Slice (2026-09-12, Technical, Not Director Acceptance)

- Threat hierarchy is fixed for implementation order: Medisin TL1; Lade TL2; Kaste and Snikskytter TL3; Hagle and Defensiv TL4; Berserker TL5 boss. Lade is first because Medisin's support behavior needs another Varjager target. No other enemy enters the normal Grassland roster in this pass.
- No usable Lade 3D asset was supplied. The local-only `FelagiㆍLade.webp` is a 2D visual reference with unverified redistribution permission; the runtime actor is an original code-authored, explicitly temporary procedural proxy. Reference files remain unchanged, ignored, and excluded from runtime and evidence artifacts.
- Lade reuses the authoritative fixed-step enemy contract with a data-driven `lade` role, seeded spawn state, pursuit/separation, a telegraphed close-range `ladeSlash`, recovery, stagger, one-time EXP/Sardis rewards, immediate authoritative removal, and counted disposal. A short parent-owned death burst preserves readable feedback without retaining a dead combat entity.
- All Lade coefficients are provisional and isolated in `ENEMY_DEFINITIONS`; camera mode does not alter them. Lade remains test/evidence-hook-only until director review, so the accepted encounter director and M0-M1.1 balance remain unchanged.
- Rendering reads snapshots only. Its movement, anticipation, strike, hit, and stagger poses plus spawn/death feedback are presentational; `?ladeDebug=1` gates collider, attack-range, attack-origin, and awareness helpers.
- Technical completion and captured evidence do not constitute visual, balance, encounter, or game-feel acceptance. Ian must review the proxy and duel before Lade may enter normal Grassland progression.

## M2.1 Lade Visual Fidelity Correction and Preview Mode (2026-09-12, Technical, Not Director Acceptance)

- Proxy fidelity pass over the same original procedural actor: blue-grey lens rims, ridged filter canister, wider helmet crown band with lamp cable, pale pauldron marking, pinstriped arm wrap, front-draped scarf, coat skirt flap, enlarged rusted back blade, boot cuff bands, and a rifle with magazine, stock, side panels, and bayonet. Grounding, scale, snapshot authority, and provisional status are unchanged; no reference pixels are loaded or copied.
- Development-only `?enemyPreview=lade` arms controlled Lade encounters through the real encounter director (seeded placement, shared lifecycle, normal roster untouched, supplemental spawns only). The App arms it on every real run start; the simulation exposes `enemyPreview` in the snapshot and resets to null on retry.
- The mode shows `LADE PREVIEW — NOT NORMAL PROGRESSION.` in-game, never arms without the query parameter, and is disabled in production builds unless the local e2e harness flag is also present. Lade stays out of normal Grassland spawning until Ian accepts its visual and gameplay presentation.
- Coverage: deterministic simulation tests plus one focused Playwright test using only the real Start-run flow (banner, first-10-seconds spawn, movement, shooting, both cameras).

## Pending Director Decision

- Final project/repository name.
- Keep jump or use sprint/dodge only.
- Exact real-time skill behavior and values after character information is reviewed.
- Confirmed Varjager model-to-role and model-to-stage assignments.
- Final run duration; current planning target is approximately 25–35 minutes.
- End after Stage 4 or offer a later endless/looping mode.
- Final font licenses and runtime asset redistribution permissions.

## Palette Status

The color tokens are derived approximations based on official GFL2 visual material, not values from a published brand standard. Keep them centralized and label them as project tokens until authoritative source values are available.
