# Final Evidence

## Verdict

**M2 Felagi · Lade is technically complete in the working tree with tests and evidence, but is not director-accepted. M1 Tololo and M1.1 controls remain the director-accepted baseline at commit `1eb21e6`. Nothing in M2 was committed, pushed, deployed, or published.**

Acceptance covers kit wiring, corrected movement/camera behavior, and the recorded tests and evidence.

M0/M0.1 stand provisionally accepted as the character-integration baseline (2026-09-11, commit `3d0966e`). M1 adds no simulation mechanics and rebalances nothing: the AK-Alfa, Lightspike rhythm, three skills, L2/L3/L4 guarantees, and damage/attachment math are preserved exactly, with HUD slots, enriched cards, placeholder VFX/audio, kit diagnostics, and full kit tests and evidence layered on top. Animation stays procedural, the rifle stays an explicitly temporary proxy, all coefficients stay PROVISIONAL, redistribution permission is unverified, and all such items remain provisional under the 2026-09-12 director acceptance recorded in `docs/DECISIONS.md`.

## Environment

- Date: 2026-09-11.
- Platform: Windows, desktop-browser-first target.
- Node: 24.12.0.
- npm: 11.7.0.
- Browser automation: Playwright 1.63.0, Chromium channel.
- GPU observed by WebGL: `ANGLE (AMD, AMD Radeon RX 9070 (0x00007550) Direct3D11 vs_5_0 ps_5_0, D3D11)`.
- GPU vendor: `Google Inc. (AMD)`.
- Rendering mode: hardware accelerated; software rendering was not detected.
- Runtime versions: React 19.2.8, Three.js 0.186.0, R3F 9.7.0, Drei 10.7.8, Rapier 2.2.0, Zustand 5.0.15, Vite 8.3.0, TypeScript 6.0.3, Vitest 5.0.0, three-stdlib 2.36.1.
- Local URLs used: production evidence via `http://127.0.0.1:4173/?e2e=1` (preview `dist/` plus local-only `/__local-mmd/` middleware); `probe:tololo` additionally requires the dev server at `http://127.0.0.1:5173/` because it imports the TypeScript source module. No remote deployment.

These measurements describe this machine and browser only. They do not establish compatibility or performance on other hardware.

## M2 Felagi · Lade Verification (2026-09-12, Technical, Not Director Acceptance)

| Check                     | Exact result                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`       | Passed, `tsc -b --pretty false`, zero diagnostics                                                                            |
| `npm run lint`            | Passed after removing one unused capture-script binding; zero diagnostics on the final run                                   |
| `npm run format:check`    | Passed, all matched files use Prettier code style                                                                            |
| `npm run test:run`        | Passed, 10 files and 95 tests, including 18 Lade simulation tests                                                            |
| `npm run build`           | Passed, Vite 8.3.0 transformed 613 modules                                                                                   |
| `npm run test:e2e`        | Passed, 32 tests in 2.4 minutes across desktop and narrow Chromium projects, 16 per project                                  |
| Focused stability         | Passed, full desktop Lade duel 5 consecutive times after replacing stale-ray sustained fire with re-aimed real-input bursts  |
| `npm run inspect:canvas`  | Passed, active third-person canvas nonblank with 252 sampled colors, luminance span 238, hardware rendering, and zero errors |
| `npm run profile:runtime` | Passed, two 10-second hardware-accelerated normal-roster samples with zero errors                                            |
| `npm run capture:lade`    | Passed, 4 WebM clips, 4 PNG screenshots, compact JSON diagnostics, and zero console/page errors                              |
| `npm audit --omit=dev`    | Passed, 0 vulnerabilities                                                                                                    |

The production build retains the known non-fatal main-chunk warning:

- HTML: 0.62 kB, 0.36 kB gzip.
- CSS: 35.80 kB, 7.42 kB gzip.
- JavaScript: 3,660.26 kB, 1,252.95 kB gzip.
- Source map: 8,126.68 kB.

## M2 Behavior And Coverage

- Felagi · Lade is a data-driven Threat Level 2 role and remains test/evidence-hook-only. The accepted encounter-director roster is unchanged.
- Fixed-step behavior covers deterministic spawn state, clamped pursuit, separation, 0.7-second `ladeSlash` anticipation, one 13-damage frame, 1.7-second recovery, stagger interruption, one-time 30 EXP/5 Sardis rewards, authoritative removal, and disposal counters.
- The 18 Lade simulation tests cover spawn bounds/distance, pursuit, separation, telegraph/damage/recovery, stagger freeze, reward/disposal idempotence, post-death safety, pause/level-up/retry, camera parity, seeded repeatability, AK-Alfa/Hydro/Tidal Step/Starfall interactions, attachments, and dodge invulnerability.
- The 15-step Playwright duel covers approach, readable telegraph, received hit, real-input dodge, stagger, Hydro damage, real-mouse AK-Alfa kill, Starfall follow-up kill, exact reward accounting, camera continuity, pause freeze, death/retry cleanup, and menu disposal. A second narrow-viewport flow checks approach, telegraph, kill, rewards, and nonblank rendering.
- Rendering reads snapshots only. The procedural proxy supplies locomotion, anticipation, strike, hit, and stagger poses; parent rendering supplies spawn and short post-removal death bursts. Debug-only collider/range/origin/awareness geometry is gated by `?ladeDebug=1`.

## M2 Asset Audit

- Local appearance reference: `assets-source/GFL2 Enemies References/FelagiㆍLade.webp`, 54,654 bytes, SHA-256 `61B92856656776FF2712E4358753E9F7720BA5AC9B2716961F81AF57ED75D454`.
- Seven local WebP references were inventoried with exact hashes in `docs/ASSET_MANIFEST.md`. Original Unicode filenames remain unchanged and ignored by Git.
- No usable Lade or other enemy `.glb`, `.gltf`, `.fbx`, `.obj`, `.blend`, `.bvh`, `.vmd`, `.vpd`, `.pmx`, or `.pmd` asset was found. The only known 3D source packages are unrelated Doll PMX files.
- `LadeEnemy.tsx` is an original code-authored procedural proxy. The WebP is not loaded, copied, transformed, included in evidence, or represented as a runtime texture/model.
- Reference provenance and redistribution permission remain unverified. The files are local-only and may not be committed, deployed, published, redistributed, or used for external generation without explicit authorization.

## M2 Visual And Motion Evidence

Source: `artifacts/performance/m2-lade.json`, zero errors. All clips are 1280x720 WebM captures; all stills are 1280x720 PNGs.

| Clip                        | Duration |        Size | Evidence                                                                                      |
| --------------------------- | -------: | ----------: | --------------------------------------------------------------------------------------------- |
| `lade-m2-inspection.webm`   |   9.80 s | 1,048,332 B | Paused in-world debug turntable, collider/range/origin helpers, stable six-meter placement    |
| `lade-m2-third-person.webm` |  10.97 s | 1,400,422 B | Approach, `ladeSlash` telegraph, 13-damage hit, dodge, AK-Alfa kill, defeat/disposal counters |
| `lade-m2-top-down.webm`     |   6.22 s |   805,668 B | Same role/attack in top-down, real-input kill, 30 EXP and 5 Sardis, disposal                  |
| `lade-m2-skills.webm`       |   7.29 s |   933,770 B | Tidal Step stagger, Hydro damage/mark flow, Starfall defeat                                   |

Screenshots: `lade-front-inspection.png`, `lade-side-inspection.png`, `lade-third-person-combat.png`, `lade-top-down-combat.png`, and (M2.1) `lade-preview-banner.png`. They prove visible in-world rendering and dual-camera readability, not final model fidelity or artistic acceptance.

Renderer evidence in the capture session:

- Paused empty debug scene: 89 calls, 90,806 triangles, 57 geometries, 17 textures.
- One Lade plus debug helpers: 148 calls, 93,720 triangles, 77 geometries, 17 textures. Delta: +59 calls, +2,914 triangles, +20 geometries, zero textures.
- Normal third-person Lade samples: 142-145 calls and 93,136-93,360 triangles before defeat; post-removal burst sample 144 calls and 93,122 triangles.
- Normal top-down Lade samples: 138-139 calls and 93,728-93,808 triangles.

Normal-roster runtime profile compared with protected baseline `1eb21e6`: desktop ~154.03 FPS / 6.50 ms now versus ~153.44 / 6.52 ms; narrow ~164.70 / 6.07 ms now versus ~164.71 / 6.07 ms. This is within run-to-run noise on this machine. The short post-GC heap deltas were +1,744,757 bytes desktop and +1,488,199 bytes narrow; they are not long-soak leak clearance.

## M2 Limitations And Review Gate

- The Lade proxy, materials, animation, VFX, attack/reward values, encounter role, and screenshots are provisional. No claim of final-art fidelity or tuned game feel is made.
- The debug stills are in-world turntable views rather than an isolated model viewer; they retain HUD, Tololo, and terrain context.
- Lade is deliberately absent from normal Grassland spawning until Ian reviews and accepts the slice. Medisin and all remaining Varjager threats are unimplemented.
- Technical completion does not grant visual, balance, encounter, milestone, asset, redistribution, release, or director acceptance.

## M2.1 Lade Fidelity And Preview Mode (2026-09-12, Technical, Not Director Acceptance)

| Check                    | Exact result                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `npm run typecheck`      | Passed, zero diagnostics                                                                             |
| `npm run lint`           | Passed, zero diagnostics                                                                             |
| `npm run format:check`   | Passed, all matched files use Prettier code style                                                    |
| `npm run test:run`       | Passed, 11 files and 101 tests, including 6 preview-director simulation tests                        |
| `npm run build`          | Passed, Vite 8.3.0, 614 modules (known non-fatal chunk-size warning retained)                        |
| `npm run test:e2e`       | Passed, 34 tests in 2.6 minutes across desktop and narrow Chromium (16 game + 1 preview per project) |
| `npm run inspect:canvas` | Passed, nonblank (252 sampled colors, luminance span 238), hardware rendering, no errors             |
| `npm run capture:lade`   | Passed, 4 clips, 5 screenshots including the preview banner, zero console/page errors                |
| `npm audit --omit=dev`   | Passed, 0 vulnerabilities                                                                            |

- Fidelity pass restyles the same original procedural proxy (lens rims, canister ridges, helmet band and cable, pauldron marking, arm wrap, front scarf drape, coat flap, larger back blade, boot cuffs, rifle furniture). Grounding, scale, and snapshot authority are unchanged.
- `?enemyPreview=lade` arms supplemental director spawns (first Lade within ~2.5 s, at most two live, 12 s cadence) without touching the normal roster; the snapshot carries `enemyPreview`, retry resets it, and production builds without the harness resolve it to null.
- Evidence: `lade-preview-banner.png` shows the banner over a real director-spawned encounter; the focused `enemy-preview.spec.ts` proves no-query disarm, banner, first-10-seconds spawn, movement, shooting, and both cameras with real inputs only.
- Lade remains out of normal progression and unaccepted; this completion grants no visual, balance, encounter, or director acceptance.

## Verification

| Check                     | Exact result                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`       | Passed, `tsc -b --pretty false`, zero diagnostics                                                                        |
| `npm run lint`            | Passed, `eslint .`, zero diagnostics                                                                                     |
| `npm run format:check`    | Passed, `prettier --check .`, all matched files use Prettier code style                                                  |
| `npm run test:run`        | Passed, 8 test files and 55 tests (32 prior + 23 Tololo kit)                                                             |
| `npm run build`           | Passed, Vite 8.3.0 transformed 611 modules                                                                               |
| `npm run test:e2e`        | Passed, 18 tests in 1.2 minutes across desktop and mobile Chromium projects                                              |
| `npm run inspect:canvas`  | Passed, active third-person canvas nonblank with 252 sampled colors, luminance span 238, and no errors                   |
| Inspector state probes    | Passed for menu, third-person, top-down, level-up, attachment, boss break, extraction, and death; no console/page errors |
| `npm run profile:runtime` | Passed, two 10-second hardware-accelerated samples with no console/page errors                                           |
| `npm run capture:motion`  | Passed, 8 separate correction clips plus sampled animation states with no console/page errors                            |
| `npm run capture:kit`     | Passed, 9 separate kit clips plus sampled kit states with no console/page errors                                         |
| `npm run audit:mmd`       | Passed, 10 PMX files inventoried with hashes, bounds, materials, bones, morphs                                           |
| `npm run probe:tololo`    | Passed on the dev server, 515 ms load, 30,905 vertices, 409 bones, zero resource errors                                  |
| `npm run inspect:tololo`  | Passed, Tololo loaded with zero missing bones and zero resource/console/page errors                                      |
| `npm audit --omit=dev`    | Passed, 0 vulnerabilities reported                                                                                       |

The production build emitted one non-fatal warning because the main JavaScript chunk exceeds 500 kB:

- HTML: 0.62 kB, 0.36 kB gzip.
- CSS: 34.97 kB, 7.29 kB gzip.
- JavaScript: 3,648.47 kB, 1,250.10 kB gzip.
- Source map: 8,089.36 kB.

## M1.1 Movement and Camera Correction (2026-09-12, Technical, Not Director Acceptance)

Root causes were traced through keyboard axis construction, yaw-based basis extraction, cross-product order, pointer-delta signs, facing math, cursor raycast approximation, the fixed top-down offset, and switch handling before any sign changed. Third-person `A`/`D` used the mirror of screen-right at every yaw; top-down `A`/`D` and left/right aiming used world `+X` where the fixed camera makes screen-right `-X`; `W`/`S`, up/down aiming, and mouse signs were already conventional and mouse behavior is unchanged; no invert setting exists. Fixes live in `src/platform/input/InputController.ts` (exported pure basis helpers with corrected signs, top-down mouse-orbit gating, pointer-lock release in top-down), `src/render/animation/tololoAnimation.ts` (same corrected right vector for direction classification and dodge capture; gait and posing untouched), and a temporary `controls` basis readout in `src/platform/browser/diagnostics.ts`. No weapon, ability, cooldown, progression, enemy, damage, model, rifle, material, environment, asset, or release change.

Verification on this pass (same machine and browser as above):

- `npm run typecheck`: passed, zero diagnostics.
- `npm run lint`: passed, zero diagnostics.
- `npm run format:check`: passed, all matched files use Prettier code style.
- `npm run test:run`: passed, 9 files and 77 tests (55 prior plus compass/pitch/fallback/mouse-decoupling basis tests, pitch-invariance and switch-matrix simulation tests, and corrected animation expectations).
- `npm run build`: passed, Vite 8.3.0, 612 modules; JS 3,651.25 kB minified, 1,251.14 kB gzip (same known chunk-size warning).
- `npm run test:e2e`: passed, 28 tests in 1.6 minutes across desktop and mobile Chromium projects (14 per project), including real-input WASD/diagonal direction, deterministic mouse look, switch-while-moving, overlay gating, and the full M1 kit flow. One earlier full-suite attempt under heavy concurrent load on this machine showed transient timing failures in unrelated polls plus one over-tight new-test window (since widened); a clean re-run passed 28/28 with no game-code change.
- `npm run inspect:canvas`: passed, active third-person canvas nonblank (253 sampled colors, luminance span 238), hardware-accelerated AMD Radeon RX 9070, no errors.
- `npm run profile:runtime`: passed, two 10-second hardware-accelerated samples with no errors; desktop ~153.44 FPS (6.52 ms avg), mobile ~164.71 FPS (6.07 ms avg).
- `npm run capture:controls`: passed, 3 clips plus 2 screenshots plus `artifacts/performance/m11-controls.json`, zero console/page errors.
- `npm audit --omit=dev`: 0 vulnerabilities.

## M1.1 Control Evidence (Compact)

Source: `artifacts/performance/m11-controls.json` (real keyboard/mouse input, `?controlsDebug=1` overlay visible in every frame).

- Third-person (yaw 0): W displacement `(0, +4.14)` dot-forward `1.0`; S `(0, -4.14)` dot-forward `-1.0`; A `(+4.14, 0)` dot-right `-1.0`; D `(-4.14, 0)` dot-right `1.0`; W+D diagonal `(-2.927, +3.004)`, length `4.195` (normalized, no speed gain). Mouse by real pointer-lock input: right yaw delta `-0.528`, up pitch delta `+0.288`.
- Top-down: W `(0, +4.217)`, S `(0, -4.14)`, A `(+4.217, 0)`, D `(-4.217, 0)`; cursor quadrants aim right `-1.571`, left `+1.571`, above `0`, below `3.142` radians.
- Switch: held W advances `+Z` through third-person, top-down, and back (`+4.6`, `+4.523` legs, no reversal).
- Videos: `artifacts/videos/tololo-m11-third-person.webm`, `tololo-m11-top-down.webm`, `tololo-m11-switch.webm` (1280x720, VP8). Screenshots: `artifacts/screenshots/desktop-controls-third-person.png` (1280x720), `artifacts/screenshots/mobile-controls-top-down.png` (390x844).

## Automated Coverage

Vitest coverage in `tests/unit/` and `tests/simulation/` verifies:

- Fixed timestep, deterministic replay, resume clamp, and pause freezing.
- Camera switching while preserving authoritative player/combat state.
- Dodge cooldown/invulnerability and combat/projectile behavior.
- Data definitions, attachment rarity/affix rules, and compatibility.
- Level thresholds, guaranteed Level 2/3/4 skill offers, caps, and rerolls.
- Seeded pedestal validity, boss phases/core break/death, and extraction transitions.
- Sardis purchases, insufficient funds, extraction reset, death, and retry.
- Tololo rig mapping, rest-relative poses, arm CCD grip convergence, state selection/lifecycle, aim clamps, recoil recovery, hit-event consumption, pause freeze, death lock, retry reset, and model disposal.
- Tololo kit: starting loadout, L2/L3/L4 priority unlocks, skip returns, no duplicate guarantees, skill valid/invalid activation, cooldown start/completion, level-up freeze, death lock, retry reset, exact reload sizing, Lightspike rhythm/reset/persistence, weapon/attachment/crit math, camera parity, dodge+skill simultaneity, and seeded determinism.

Playwright coverage in `tests/e2e/game.spec.ts` verifies on desktop and Pixel 7 viewport projects:

- Live menu preview and reduced-motion state.
- Real keyboard/mouse movement, fire, reload, shared-world camera switching, and Tololo walk/sprint/dodge/reload animation states.
- Tololo PMX load-once identity (30,905 vertices, 409 bones, zero resource errors, zero missing bones), grounding error ~0 m, muzzle error 0 m, dominant grip below 0.03 m, support grip below 0.04 m, uniqueness on retry, and disposal on menu return.
- Full Tololo kit flow: locked Q/E/F, L2/L3/L4 unlocks via real card clicks, per-skill activation with cooldowns and target damage, cooldown non-reset, camera switch mid-kit, pause freeze, death retry reset, and menu disposal.
- Debug query enables helpers while normal mode publishes a zero helper count.
- Pause freezes procedural animation phase while rendering continues nonblank.
- Framing keeps Tololo NDC-visible on desktop and narrow portrait; both cameras report identical player positions.
- Level-up choice, attachment actions, boss break, extraction/results, death, and retry.
- Pedestal activation through the real interact input.
- Nonblank canvas checks plus page and console error inspection.

The mobile project is responsive/browser regression evidence, not touch-control acceptance. The project decision remains desktop browser first.

## M0.1 Audit Findings

- Embedded weapon search: no weapon-like material among the 21 Tololo materials, no weapon-like bone among the 409 bones, no display frames, no `.vmd`/animation/standalone-weapon files in the 248-file supplied package. The visible hip prop is clothing-geometry with no weapon material or bone. Direct PMX is therefore kept; no GLB conversion was needed.
- Embedded license terms (read-only): no redistribution, no commercial use, no hostile/adult/extremist/gore use; Sunborn Network Technology model, DesmondChan rig/fix. Release stays blocked.
- Berserker provenance: `assets-source/GFL2 Enemies References/250px-Berserker_S.png` is recorded as an official-game Berserker boss reference, local-only, permission unverified. No Varjager model exists in the supplied package, so there is nothing further to preserve and nothing is implemented.

## M1 Kit Implementation

- Simulation mechanics unchanged: the only gameplay-code touchpoint is the pre-existing observational `sprinting` flag. Added projections are skill event identity (`value`), hydro projectile kind, and player-anchored skill positions in `src/render/snapshot.ts`.
- HUD (`GameplayHUD.tsx`, `ui/types.ts`, `ui.css`): all three slots always render with Locked/Ready/cooldown/Held states, Ultimate-ready gold accent, Lightspike rhythm pips (`hits/hitsToCrit`), ammo/reload; names and cooldowns come from static `TOLOLO` data, states from the snapshot.
- Cards (`LevelUpOverlay.tsx`): static effect/cooldown/PROVISIONAL lines for the four M1 cards plus New-unlock versus Rank-up labeling; no authority moved into UI.
- Placeholder VFX (`CombatEffects.tsx`): cyan hydro tracers, per-skill ground rings anchored at Tololo (gold + 6-tetra burst for the Ultimate only), bounded counts, reduced-motion flattening, visually distinct from debug helpers.
- Placeholder audio (`AudioFeedback.ts`): distinct synth pitches for Skill 1/2/Ultimate; no approved assets involved.
- Diagnostics (`diagnostics.ts`): development-only kit block (weapon, passive hits, unlocks/ranks/cooldowns, last skill/damage ticks, derived aim target, seed, camera) plus deterministic `grantExperience`/`spawnEnemy` hooks, all gated behind `?e2e=1`.
- Skill rules (provisional, documented in `GAMEPLAY_SYSTEMS.md`/`CHARACTERS_AND_LOOT.md`): instant abilities valid while moving/dodging/reloading; invalid while locked, cooling, dead, or paused; same-step dodge+skill allowed as extra-action rhythm; cooldowns/buffs advance only inside fixed steps.

## Visual Evidence

The M1 screenshot set is indexed in `artifacts/evidence-manifest.json` under run ID `tololo-m1-kit-20260911` (M0.1 captures retained under `tololo-m01-correction-20260911`).

- Front: `artifacts/screenshots/tololo-model-front.png` — slim proxy rifle, both hands on the weapon, torso no longer obscured.
- Side: `artifacts/screenshots/tololo-model-side.png` — rifle at shoulder height, stock near shoulder, grounded, no torso clipping.
- Grips: `artifacts/screenshots/tololo-model-grips.png` — tight crop of both hands on the proxy.
- Face/material: `artifacts/screenshots/tololo-model-face.png` — readable eyes/brows, hair toon banding, cloth textures.
- Normal mode: `artifacts/screenshots/tololo-model-normal.png` — default framing with zero debug helpers (count 0).
- Debug mode: `artifacts/screenshots/tololo-model-debug.png` — skeleton/bounds overlay present only under the explicit flag.
- Detail: `artifacts/screenshots/tololo-model-detail.png` — full-torso crop.
- Gameplay: desktop/mobile third-person and top-down captures from the browser suite.
- Mobile portrait: `artifacts/screenshots/mobile-portrait-check.png` — Tololo visible at NDC ~(0.50, -0.53).
- M1 kit: `*-kit-locked.png` (three Locked slots, Lightspike 0/6), `*-kit-skill1-card.png`, `*-kit-skill2-card.png`, `*-kit-ultimate-card.png` (effect, cooldown, PROVISIONAL, New-unlock lines), `*-kit-ultimate-ready.png` (gold accent), `*-kit-third-person.png` and `*-kit-top-down.png` (combat with unlocked kit), each for desktop and mobile projects.

Visual review findings:

- The oversized black slab is gone; the proxy reads as an assault rifle without covering the character.
- Hands converge on the proxy in front, side, and grip views; measured residuals are 0.031 m support and 0.009 m dominant.
- Materials are modestly improved; residual paleness under the bright sun plus loader-detected transparency on hair/lashes/socks is documented approximation, not redesign.
- Normal gameplay frames show no skeleton, wireframe, collider, marker, or label geometry.
- Mobile third-person keeps the silhouette on-screen with a usable centered crosshair; lower legs can sit behind the bottom-right weapon panel.
- Screenshots and metrics are evidence only; Ian determines visual and game-feel acceptance.

## Motion Evidence

Source samples: `artifacts/performance/m01-motion-clips.json` with zero errors. All clips are VP8 WebM, 1280x720, 25 FPS (mobile clip 390x844).

| Clip                                | Duration |        Size | Sampled states                                          |
| ----------------------------------- | -------: | ----------: | ------------------------------------------------------- |
| `tololo-m01-locomotion.webm`        |  14.24 s | 1,571,443 B | idle, walk, sprint                                      |
| `tololo-m01-aim-fire.webm`          |   9.00 s |   689,348 B | aim-center, aim-right, firing, recoil-settle            |
| `tololo-m01-reload.webm`            |   7.48 s |   643,285 B | after-fire, reload, return-to-aim                       |
| `tololo-m01-dodge.webm`             |   8.80 s |   936,487 B | dodge-forward, dodge-left, dodge-right                  |
| `tololo-m01-hit-death-retry.webm`   |   8.04 s |   731,971 B | hit, death (grip release by design), retry back to idle |
| `tololo-m01-camera-continuity.webm` |   9.76 s | 1,073,364 B | third-person walk, top-down, top-down walk              |
| `tololo-m01-mobile-framing.webm`    |   7.16 s |   682,201 B | mobile idle/walk, player NDC on-screen both samples     |
| `tololo-m01-pause-freeze.webm`      |   8.48 s |   801,182 B | paused (phase frozen at 15.0639), resumed               |

Dominant-hand grip error holds ~0.009 m across locomotion, aim, reload, dodge, camera, and pause samples. Death releases arm IK by design (grip ~0.75 m) while the death lock holds until retry, which returns the controller to idle. These recordings are procedural proof, not authored-clip proof; foot planting and game feel remain director-reviewed.

## M1 Kit Motion Evidence

Source samples: `artifacts/performance/m1-kit-clips.json` with zero errors. All clips are VP8 WebM, 1280x720, 25 FPS (mobile clip 390x844).

| Clip                               | Duration |        Size | Sampled states                                                        |
| ---------------------------------- | -------: | ----------: | --------------------------------------------------------------------- |
| `tololo-m1-firing-reload.webm`     |  10.68 s | 1,012,771 B | ready, firing (30→26), reloading (0.28), reloaded (30)                |
| `tololo-m1-passive.webm`           |   9.88 s | 1,082,487 B | pips 0→2→4→0 reset →2→4→0 with advancing damage ticks                 |
| `tololo-m1-skill1.webm`            |   8.88 s |   924,993 B | unlocked, activated (CD 5.98, lastSkill tick 114, 5 hydro hits)       |
| `tololo-m1-skill2.webm`            |   8.44 s |   947,285 B | unlocked, buffed (CD 10.02), cooling-down                             |
| `tololo-m1-ultimate.webm`          |  10.12 s | 1,164,043 B | ultimate-ready, starfall (CD 26.72, damage same tick)                 |
| `tololo-m1-unlocks.webm`           |   8.48 s |   876,856 B | level-2/3/4 cards, kit-complete (all unlocked)                        |
| `tololo-m1-camera-abilities.webm`  |   7.64 s |   921,882 B | third-person cooldown, top-down cooldown, back                        |
| `tololo-m1-pause-death-retry.webm` |  10.12 s |   906,200 B | paused (CD frozen), pause-check equal, dead, retried (idle, relocked) |
| `tololo-m1-mobile-framing.webm`    |   7.28 s |   715,096 B | mobile idle/walk, player NDC on-screen, skill fired while walking     |

The pause-check sample records identical cooldown values across the frozen window; the retried sample records all skills relocked with full ammo and zero passive hits. These recordings prove kit wiring, not balance; all values remain provisional.

## Performance Evidence

### Static Render Probes

Production preview, seeded active third-person combat:

| Configuration                  | DPR | Calls |         Triangles | Geometries |  Textures | Luminance contrast | Reference budget   |
| ------------------------------ | --: | ----: | ----------------: | ---------: | --------: | -----------------: | ------------------ |
| Desktop third-person, 1440x900 | 1.0 |   164 |            93,834 |         88 |        17 |                238 | Pass               |
| Tololo model bounds            |   — |     — | 40,000 model tris |          — | 11 unique |                  — | Within scene total |

Inspector reference limits were 300 calls/750,000 triangles on desktop and 150 calls/300,000 triangles on mobile. These are starting-point budgets, not a guarantee of final populated-scene performance.

### Runtime Profile

Source: `artifacts/performance/runtime-profile.json`. State: seeded active third-person combat with five enemies and no scripted player input during each 10-second sample.

| Metric               | Desktop 1440x900, DPR 1 | Mobile 390x664, DPR 1.75 |
| -------------------- | ----------------------: | -----------------------: |
| Average FPS          |                  151.72 |                   163.62 |
| Average frame time   |                 6.60 ms |                  6.12 ms |
| P50 frame time       |                 6.10 ms |                  6.10 ms |
| P95 frame time       |                 6.20 ms |                  6.20 ms |
| P99 frame time       |                 6.20 ms |                  6.20 ms |
| Frames over 20 ms    |                       4 |                        1 |
| Frames over 33.34 ms |                       2 |                        1 |
| DOM content loaded   |               256.10 ms |                162.80 ms |
| Load event           |               256.20 ms |                162.90 ms |
| Post-GC heap before  |       101,796,768 bytes |        101,692,289 bytes |
| Post-GC heap after   |       103,520,845 bytes |        103,492,940 bytes |
| Heap delta           |        +1,724,077 bytes |         +1,800,651 bytes |

Tololo model load is ~515 ms on the dev server and ~585-592 ms on warmed preview, with zero resource errors. The samples exceed the 60 FPS target on this 165 Hz-capable test environment. The positive short-run heap deltas require longer soak testing once production assets and representative populations exist; they are not by themselves proof of a leak.

### Baseline Comparison (M0.1 Run `tololo-m01-correction-20260911`)

- FPS/frame time: desktop 153.92 FPS / 6.50 ms then versus 151.72 / 6.60 ms now; mobile 164.74 / 6.07 ms then versus 163.62 / 6.12 ms now. Within run-to-run noise on this machine; no material regression indicated.
- Draw calls: 157 then versus 164 now on desktop (+7 from skill rings, hydro lights, and HUD-driven state only while abilities resolve); sampled triangles 93,306 then versus 93,834 now. Textures: 17, unchanged.
- Heap deltas: +1.68/+1.46 MiB then, +1.64/+1.72 MiB now; same short-run behavior, not leak clearance.
- Grip errors unchanged (~0.031/0.009 m); muzzle error still 0 m.
- No new resource, rendering, or lifecycle issues were introduced.

### Restart And Disposal

- E2E Tololo test: one runtime instance after load, one instance after pause-menu restart, zero instances and at least one disposal after return to menu.
- Unit disposal test covers geometry, materials, textures, and skeleton disposal.

## Asset And License Status

- Selected source: `assets-source/Character MMD/Tololo (Default)/GirlsFrontline TololoDefault.pmx`, 2,670,878 bytes, SHA-256 `F8F3C0C6D8EC5B54576A91620DEBFC44B9D010EE3DC3E29DD3861A8C7BB4BE44`.
- Supplied package: 248 files, 428,154,185 bytes; 10 PMX Doll packages plus six enemy reference PNGs; no VMD/animation or standalone AK-Alfa assets.
- Full source record: `docs/ASSET_MANIFEST.md`, including Berserker provenance and embedded license terms.
- Runtime audio: code-authored WebAudio oscillator/noise cues, treated as placeholders.
- npm dependency versions are pinned in `package-lock.json`; `npm audit --omit=dev` reported zero vulnerabilities, but this is not a legal license audit.
- Tololo source, texture, and redistribution permission remain unverified for our purposes. Everything is local-only: originals are never modified/copied into tracked runtime paths/committed, and `dist/` contains no PMX.
- Final font licenses remain a pending director decision; no remote font files are loaded by the current implementation.

No unreviewed production asset is represented as redistributable final art.

## Blockers And Deferred Work

- M1 is director-accepted, but provisional balance values, representative ability names, residual paleness, foot planting, narrow-portrait HUD overlap, proxy simplicity, and procedural motion quality remain reviewable exclusions.
- M0.1 is provisionally accepted as the character-integration baseline; residual paleness, foot planting, narrow-portrait HUD overlap, proxy simplicity, and procedural motion quality remain reviewable exclusions.
- Redistribution/release remains blocked by unverified permission plus explicit embedded no-redistribution/no-commercial-use terms.
- Authored animation acceptance is impossible without supplied clips; procedural motion is provisional.
- Production AK-Alfa integration is blocked without a standalone weapon asset.
- Final Grassland art, production enemies (including any Varjager/Berserker work), authored audio, final VFX, and director-level encounter/game-feel tuning remain deferred.
- Touch controls, cross-browser coverage, long-duration memory soak, denser representative populations, and JavaScript code splitting remain deferred.
- Rapier integration currently provides collision proxies while the deterministic simulation owns combat collision; production physics integration requires later evidence without surrendering simulation authority.

## Prior Baseline Preservation

M0 run `tololo-m0-procedural-20260911` (2026-09-11): 7 files / 32 Vitest tests passing, 10 Playwright tests passing in 32.3 s, single motion video `artifacts/videos/tololo-m0-procedural-motion.webm` (13.48 s) with `artifacts/performance/tololo-motion-states.json` (pause frozen, grip ~0.089/0.063 m). That video and states file are preserved on disk; the M0 model screenshots were superseded in place by the M0.1 captures above.

## Acceptance And Release

- Technical implementation handoff: complete in the working tree for the M1 combat-kit and M1.1 controls milestones.
- M0 acceptance: provisionally accepted as the character-integration baseline (2026-09-11).
- M0.1 acceptance: provisionally accepted as part of the same baseline (2026-09-11).
- M1 acceptance: director-accepted by Ian (2026-09-12); provisional items unchanged.
- M1.1 acceptance: director-accepted by Ian (2026-09-12); provisional items unchanged.
- Flat Grassland director acceptance: not granted.
- Commit/push/deploy/publish: not performed.
