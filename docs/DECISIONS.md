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

## M2.2 Aiming and Damage Alignment Correction (2026-09-15, Technical, Not Director Acceptance)

- Baseline `90df58d` reproduced Ian's defect with trusted Playwright pointer-lock input: the crosshair was aligned on a melee placeholder's head at 20 m, one round was consumed, the projectile cleaned up, and enemy health remained exactly `70.2625`; no console or page error occurred. The reproducible report is `artifacts/performance/aim-defect-baseline.json`.
- Confirmed causes: third-person supplied no screen-space ray or aim point and fired a muzzle projectile parallel to yaw/pitch despite the 4.1 m shoulder camera offset; top-down used a linear ground approximation instead of camera unprojection; every standard enemy used one sphere at `y=0.8`, leaving readable heads and lower legs outside authority; player projectiles selected the first enemy by array order, had no world-cover collision, and expired before checking the final travelled segment. There was no damage invulnerability/filter failure. Presentation-only death bursts could also resemble impacts, while hit events lacked authoritative collision positions.
- One shared contract now forwards the finalized R3F camera ray, resolves closest enemy, boss, or world intersections in the fixed-step simulation, converges muzzle-to-aim, sweeps range-clamped projectile segments, compares collision entry fractions, lets closer cover block, and emits collision-positioned hit/impact events. A one-radius interior convergence point keeps the unchanged spread coefficient symmetric around a selected silhouette instead of aiming at a one-sided tangent surface.
- Standard enemy damage volumes are grounded silhouette capsules. Existing horizontal radii and all combat/balance coefficients are unchanged; only outer height coverage is added per role (1.85-2.60 m, Lade 1.90 m). Rendering consumes snapshots/events only.
- `?aimDebug=1` is development-server-only and observational. Production builds disable it even when the e2e harness is present. Technical verification and evidence do not record final gameplay acceptance; Ian's manual review remains required.

## AD0 Rendering Direction Comparison Prototype (2026-09-15, Technical, Not Director Acceptance)

- Ian requested a fair visual comparison before choosing the base rendering style. Three candidates share one isolated Grassland art study (Tololo at `[0,0,0]`, one Lade at `[1.8,0,6]`, 30x30 m section, matched cameras, lights, timings, muzzle/telegraph/impact events): stylized cel-shaded 3D, pixel-styled 3D, and 2D/2.5D pixel billboards. Evidence is four labeled contact sheets, 36 matching screenshots, three short videos, and `artifacts/art-direction/ad0-comparison.json/md` with 1–5 scores across 24 criteria plus performance. No winner is recorded; Ian decides.
- The Lade visual remains a temporary procedural proxy; Lade gameplay acceptance stays separate from visual acceptance. Medisin remains deferred until the visual workflow is decided.
- Normal-gameplay cleanup: the thin grey aiming line and white endpoint circle (`AimRead`) were removed because they duplicated the HUD crosshair. Crosshair, aim-ray calculation, resolved aim point, muzzle convergence, spread, recoil, collision, and damage are unchanged; enemy ground circles, telegraphs, ability radii, and extraction indicators are untouched. `?aimDebug=1` helpers are unchanged and development-only.
- A red laser sight is reserved as a potential future weapon attachment (muzzle-originated thin red beam to the resolved collision/aim point, small red dot, obstruction-aware, zero gameplay effect). It is not in loot, progression, menus, saves, or balance, and no laser statistics are approved. A development-only `?laserPreview=1` preview exists with an explicit not-equipped label; production builds disable it.

## AD0 Verification Pass (2026-09-15, Technical, Not Director Acceptance)

- Baseline-versus-AD0 Playwright matrix (protected baseline `9c13083`, same machine, `chromium` channel, workers 1, `npm run preview` server mode, Desktop Chrome + Pixel 7 viewports): baseline full suite 2/2 runs green (36 passed, 2 by-design viewport skips); AD0 full suite 2/3 runs green (46 passed, 2 same skips) with one transient desktop aim-alignment failure in the middle run that passes on immediate focused repeat in the same AD0 tree and 2/2 in the baseline tree. No AD0 gameplay change touches that path (only two presentation meshes removed; authoritative aiming proven by 31 simulation aim-contract tests), so no AD0-caused failure stands; no test was weakened, no timeout raised, no test skipped, no gameplay behavior changed.
- The two `react-refresh/only-export-components` warnings are resolved by project structure, not suppression: laser gating (`LASER_PREVIEW_LABEL`, `isLaserPreviewEnabled`) lives in component-free `src/render/laserPreviewState.ts`, and the shared study cameras (`artCameraForView`) live in component-free `src/render/artcompare/artCamera.ts`. Unit-test assertions moved with the code at equal strength.
- Every `profile-ad0.mjs` report now carries `low1FrameMs`/`low1Fps` plus spike forensics (`warmupAverageMs`, `steadyAverageMs`, `steadyP95Ms`, `spikeCount`, `spikeIndices`, `worstFrameMs`). The first-pass pixel3d desktop p95 of 23.6 ms is attributed to isolated GC/compositor hitches (warmup equals steady, fixed viewport/DPR, identical harness clean on cel3d, highest heap in that run), not recurring stutter; full analysis is recorded in `artifacts/art-direction/ad0-comparison.md`.
- `pixel2d` is scoped as a pipeline-feasibility sample only (code-generated placeholder sprites, in-app popping disclaimer); its scores and counts must not be read as finished pixel artwork.
- No art direction selected; no commit, push, or deployment; Lade and Medisin unchanged.

## Post-AD0 Gameplay Fixes (2026-09-16, Per Ian's Direct Instruction)

- Third-person camera centers on the character: the lateral shoulder offset is removed (`THIRD_PERSON_OFFSET`/`THIRD_OFFSET` lateral component `4.1` to `0`, portrait variant `0.9` to `0`; heights, distances, 12 m look-ahead, ADS FOV behavior, and camera-collision pull-in unchanged). The render CameraRig and the analytic `thirdPersonCrosshairRay` twin change in lockstep, so the screen-center ray remains the authoritative aim ray and crosshair alignment is preserved by construction. Measured player NDC is `x = 0` on desktop and narrow portrait (vertical placement stays lower-middle so the crosshair sightline stays clear).
- Level-up cursor fix: a pointer lock held from third-person gameplay hid the cursor and routed clicks to the canvas, making level-up cards unclickable. App now releases the lock whenever a modal overlay opens (paused, pending attachment, reward shop, death, results), and `InputController` refuses re-acquisition through a pure, unit-tested `mayAcquirePointerLock` gate while any modal owns the cursor. No simulation, progression, or card behavior changed.

## AD0 Director Acceptance (2026-09-16)

Ian manually tested and accepts:

- The corrected enemy hit volumes.
- Bullet collision and damage registration.
- Crosshair alignment.
- Third-person, ADS, and top-down aiming.
- Removal of the obsolete aiming line and endpoint circle.
- Preservation of the normal crosshair.

AD0 is technically accepted as a rendering-comparison checkpoint. No final art direction has been selected, and Lade's current visual remains temporary. This acceptance covers aiming behavior and presentation only; balance coefficients, ability names, procedural animation quality, the temporary rifle proxy, placeholder VFX/audio, non-final materials, and asset redistribution permissions remain provisional and director-reviewable as recorded above.

## AD1 Art Direction Selection (2026-09-16, Director Decision)

Ian selected cel-shaded 3D as the final base rendering direction. AD0 comparison completed; pixel-styled 3D and 2D/2.5D pixel are rejected as the primary direction (pixel techniques may still influence UI icons or selected effects later). The direction draws practical visual principles from Risk of Rain 2 (stylized low-poly 3D, posterized lighting, no permanent heavy black outlines, strong silhouettes, muted atmospheric environments, brighter actors and effects, readability in chaotic combat) as inspiration only — never authorization to copy assets, shaders, levels, characters, textures, UI, or exact color values. No global heavy-outline style; contextual outlines remain allowed for targeting, occlusion, accessibility, and important threat states. Lade's gameplay is accepted and its existing visual proxy remains temporary; Medisin remains deferred until Lade passes the later visual pipeline. Authoritative reference: `docs/ART_DIRECTION.md`.

## AD1.1 Cel-Shading Correction (2026-09-16, Technical, Not Director Acceptance)

- Audit before any multiplier change: Tololo's washout is four combined factors, not one. Hemisphere fill (1.15) bypasses the toon gradient as linear indirect light and lifts every band toward white; sun (2.3) saturates pale normals into the lit band; the STANDARD lit stop (255 = 1.0) leaves no headroom so whites clip under ACES 1.08; rim (0.5) adds a further edge wash. No global darkening multiplier is applied; exposure, fog, authored MMD albedo/maps/alpha, and the material architecture are untouched.
- Correction: sun 2.3 to 1.85, hemisphere 1.15 to 0.8, rim 0.5 to 0.65; STANDARD ramp 120/180/255 to 120/170/240 (lit headroom, deeper lit/mid step, unchanged shadow floor); menu-preview intensities track the same ratios (sun 2.25 to 1.8, hemi 1.5 to 1.05); study final light tracks the rig (sun 2.0 to 1.6, hemi 0.95 to 0.65); neutral inspection rig unchanged.
- Grass black-noise root cause is independent of lighting: `WindGrass` enabled `vertexColors` on a plane with no color attribute, so the unbound color attribute reads black and hides the olive instance colors. The flag is removed; density, placement, count, instancing, and the wind shader are unchanged. Cone-tree darkness shares the toon floor cause: the FLAT shadow stop rises 150 to 175 (0.588 to 0.686); no remodel or redistribution.
- Evidence: matching before/after contact sheets plus `ad1-1-correction.json/md` with numeric before/after values. No camera, aiming, projectile, balance, enemy, layout, Lade, or Medisin change.

## AD1/AD1.1 Director Acceptance (2026-09-16)

Ian reviewed the AD1 and AD1.1 evidence and accepts:

- Cel-shaded 3D as the project's final base rendering direction.
- Posterized lighting without permanent heavy outlines.
- Tololo's repaint-free material presentation as the foundation.
- Corrected grass readability.
- Third-person, ADS, and top-down presentation.
- Centered third-person camera framing.
- Level-up cursor behavior.
- Existing aiming, crosshair, projectile, and hit-volume behavior (unchanged, still accepted).

Deferred at acceptance, not final: grass color/density polish (later Grassland environment pass); cone trees and simple scenery (placeholders); combat VFX (provisional); Tololo's authored pale palette (intentionally preserved); Lade's procedural model (temporary gameplay proxy); Medisin (deferred until the Lade visual pipeline is proven).

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
