# Game Progress

## Intent

Build the Flat Grassland one-shot foundation using the locked React/R3F stack and one deterministic fixed-step simulation shared by both cameras.

## Current Status

- Technical placeholder foundation: implemented and passing the available automated gates.
- Asset-ready Flat Grassland vertical slice: blocked.
- M0 Tololo asset proof: blocked.
- Director acceptance: not requested and not recorded.
- Git, commit, push, and deployment: not performed; this directory is not a Git repository.

## Implemented Foundation

- React 19, strict TypeScript, Vite, React Three Fiber, Rapier, Zustand, Vitest, and Playwright project setup.
- One authoritative fixed-60-Hz gameplay simulation outside React with a seeded RNG and a 0.1-second resume-delta clamp.
- Shared player, enemy, projectile, progression, attachment, boss, reward, Sardis, extraction, death, and restart state for both cameras.
- Instant third-person and elevated top-down presentation switching without changing the authoritative world.
- Flat Grassland procedural terrain, lighting, horizon, foliage, weather atmosphere, encounter markers, player/enemy placeholders, and a procedural Warden boss.
- Main menu with a live Grassland preview, reduced-motion behavior, settings, placeholders, and browser return behavior.
- Gameplay HUD, level-up selection and reroll, attachment comparison/actions, pause/settings, extraction terminal, death, retry, and results flow.
- Keyboard/mouse input, generated WebAudio feedback, settings persistence, renderer diagnostics, gated deterministic test hooks, and repeatable visual/performance evidence utilities.

## Verification Summary

- TypeScript: passed.
- ESLint: passed.
- Prettier: passed after final documentation formatting.
- Vitest: 6 files and 21 tests passed.
- Production build: passed with a documented large-chunk warning.
- Playwright production browser suite: 8 tests passed across desktop Chromium and Pixel 7 viewport projects.
- Canvas inspection: nonblank, hardware-accelerated, and within the inspector's reference draw-call/triangle budgets in both cameras and viewport classes.
- Runtime profile: no page/console errors and frame rate above the 60 FPS target on the tested AMD/Chromium machine.
- Motion capture: procedural placeholder gait and rifle reload cue recorded; this is not Tololo animation proof.

See `artifacts/final-evidence.md` and `artifacts/evidence-manifest.json` for exact commands, measurements, captures, and limitations.

## Active Blockers

- No approved Tololo PMX/GLB, textures, rifle, skeleton, animation clips, source record, or redistribution permission was supplied.
- No approved production enemy, environment, VFX, or audio assets were supplied.
- Consequently, material fidelity, final scale/grounding, skeleton access, weapon attachment, upper-body aiming, muzzle origin against the real rig, production run/reload animation, disposal, reload integrity, and MMD performance cannot be accepted.
- Only Ian can review game feel, approve visual quality, and record director acceptance.

## Known Limitations

- All visible Dolls, enemies, foliage cards, and the boss are local procedural placeholders rather than final art.
- Mobile projects validate responsive layout and browser behavior; the locked target is desktop-first and touch movement controls are not implemented.
- Chromium is the only browser exercised in this pass.
- Generated WebAudio cues are functional placeholders, not final authored audio.
- Rapier supplies render-world collision proxies while deterministic gameplay collision remains simulation-authoritative.
- The production JavaScript bundle is approximately 3.47 MB minified and 1.18 MB gzip; code splitting remains deferred.
- The 10-second post-GC heap samples increased by approximately 1.30 MiB on desktop and 1.23 MiB on mobile. This short run is not evidence of a leak, but it is also not a long-duration leak clearance.

## Next Authorized Action

Stop at this gate. Supply approved Tololo source assets and license/redistribution evidence before attempting the real MMD integration and M0 acceptance pass.
