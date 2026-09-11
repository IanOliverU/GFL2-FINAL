# Game Progress

## Intent

Build the Flat Grassland one-shot foundation using the locked React/R3F stack and one deterministic fixed-step simulation shared by both cameras, integrate the supplied Tololo PMX as a presentation-only gameplay proof, then correct its visual integration in the bounded M0.1 pass without touching gameplay.

## Current Status

- Technical placeholder foundation: implemented and passing the available automated gates.
- M0 Tololo procedural integration: technically complete in the working tree, pending director visual/game-feel acceptance.
- M0.1 visual and animation correction: technically complete in the working tree (rifle proxy, posing/IK, materials, debug gating, mobile framing), pending director acceptance.
- Asset-ready Flat Grassland vertical slice: not accepted.
- Director acceptance: not requested and not recorded.
- Git: repository exists on `main` tracking `origin/main`; current milestone changes remain uncommitted, unpushed, undeployed.

## Implemented Foundation

- React 19, strict TypeScript, Vite, React Three Fiber, Rapier, Zustand, Vitest, and Playwright project setup.
- One authoritative fixed-60-Hz gameplay simulation outside React with a seeded RNG and a 0.1-second resume-delta clamp.
- Shared player, enemy, projectile, progression, attachment, boss, reward, Sardis, extraction, death, and restart state for both cameras.
- Instant third-person and elevated top-down presentation switching without changing the authoritative world.
- Flat Grassland procedural terrain, lighting, horizon, foliage, weather atmosphere, encounter markers, player/enemy placeholders, and a procedural Warden boss.
- Main menu with a live Grassland preview, reduced-motion behavior, settings, placeholders, and browser return behavior.
- Gameplay HUD, level-up selection and reroll, attachment comparison/actions, pause/settings, extraction terminal, death, retry, and results flow.
- Keyboard/mouse input, generated WebAudio feedback, settings persistence, renderer diagnostics, gated deterministic test hooks, and repeatable visual/performance evidence utilities.

## M0 Tololo Integration (Working Tree)

- Direct PMX via `three-stdlib@2.36.1` MMDLoader; Blender fallback was unnecessary.
- Local-only `/__local-mmd/` dev/preview middleware; original sources are never renamed, modified, copied into tracked runtime paths, or committed.
- Tololo PMX: 2,670,878 bytes, SHA-256 `F8F3C0C6D8EC5B54576A91620DEBFC44B9D010EE3DC3E29DD3861A8C7BB4BE44`, 30,905 vertices, 40,000 triangles, 21 materials, 11 unique textures, 409 bones, 89 runtime morphs.
- All 28 required rig controls resolve with zero missing; weighted `D` leg chains are driven directly.
- Presentation-only procedural controller: idle, direction-aware walk, sprint, layered aim, recoil, reload, dodge with captured direction, hit reaction, death lock, pause freeze, camera continuity, retry reset.
- Simulation authority is unchanged except one observational `sprinting` flag; render projection additionally forwards `tick`, `dodgeRemaining`, and `recoil`.
- See `docs/ASSET_MANIFEST.md` for exact source identity, hashes, counts, and license/redistribution status (unverified, local-only).

## M0.1 Corrections (Working Tree)

- Deep PMX audit: no usable embedded AK-Alfa exists (no weapon-like material among 21, no weapon-like bone among 409, no display frames, no animation files, no standalone weapon). The hip prop is clothing-geometry. Direct-PMX route kept; no GLB conversion.
- Rifle: oversized black block replaced with a restrained ~0.78 m low-poly AK-Alfa proxy (gunmetal/polymer, explicitly temporary). Muzzle tip stays on the authoritative simulation muzzle (error 0 m); stock lands near the shoulder.
- Posing and IK: 6 CCD iterations at 0.45 step, calibrated primary/support grip targets, mild rest-relative wrist settle, protected shoulders. Idle grip errors are ~0.031 m support and ~0.009 m dominant, inside the 0.04/0.03 m targets. Locomotion modestly damped; death still locks until retry and releases arm IK; pause still freezes.
- Materials: additive sphere-map sheen attenuated (`envMapIntensity` 0.4 on Add-combine toon materials only); albedo, lighting, tone mapping, and exposure untouched.
- Debug gating: skeleton/collider/ring/muzzle helpers appear only under `?modelDebug=1` (normal-mode count is 0); dodge invulnerability is now a flat cyan ground ring instead of a wireframe capsule.
- Mobile third-person: aspect-gated portrait framing (offset, target height, FOV); desktop and top-down behavior unchanged. Player NDC on 390x844 is ~(0.50, -0.53) idle and ~(0.46, -0.49) walking.
- Berserker reference recorded as official-game boss provenance, local-only; no Varjager model exists in the supplied package and none is implemented.
- No gameplay, balance, progression, economy, boss, extraction, or stage edits in M0.1.

## Verification Summary

- TypeScript: passed, `tsc -b --pretty false`, zero diagnostics.
- ESLint: passed, `eslint .`, zero diagnostics.
- Prettier: passed, `prettier --check .`, all matched files use Prettier code style.
- Vitest: 7 files and 32 tests passed (including 11 Tololo animation/rig/disposal tests).
- Production build: passed, Vite 8.3.0 transformed 611 modules; one known non-fatal chunk-size warning (JS ~3,644.32 kB minified, ~1,248.65 kB gzip).
- Playwright production browser suite: 16 tests passed across desktop Chromium and Pixel 7 viewport projects (8 per project), including tightened grip thresholds, debug gating, pause freeze, mobile framing, and camera parity.
- Canvas inspection: nonblank (253 sampled colors, luminance span 238), hardware-accelerated AMD Radeon RX 9070, no software rendering, no errors.
- Runtime profile: two 10-second hardware-accelerated samples with no console/page errors; desktop ~153.92 FPS (6.50 ms avg), mobile ~164.74 FPS (6.07 ms avg).
- Motion evidence: 8 separate slow clips plus sampled animation states with zero errors; pause phase frozen; retry returns to idle.
- Tololo runtime probes: load ~515 ms (dev) / ~585-592 ms (preview warm), zero resource/console/page errors, one runtime instance, disposal on menu return.
- `npm audit --omit=dev`: 0 vulnerabilities.

See `artifacts/final-evidence.md` and `artifacts/evidence-manifest.json` for exact commands, measurements, captures, and limitations.

## Active Blockers

- Redistribution/release of Tololo and related official assets is blocked by unverified permission and explicit embedded no-redistribution/no-commercial-use terms.
- Authored animation acceptance is impossible because no VMD or other animation files were supplied; procedural animation is provisional.
- Production AK-Alfa integration is blocked because no standalone weapon asset exists in the supplied package.
- Residual paleness under bright sun, approximate foot planting, and lower-leg overlap behind the bottom-right HUD panel on narrow portraits remain director-reviewed items.
- Only Ian can review game feel, approve visual quality, and record director acceptance.

## Known Limitations

- Tololo animation is procedural, not authored clips; foot sliding is reduced but not eliminated.
- The rifle proxy is intentionally simple and labeled temporary; it is not final art.
- Enemies, foliage cards, and the boss remain local procedural placeholders rather than final art.
- Mobile projects validate responsive layout and browser behavior; the locked target is desktop-first and touch movement controls are not implemented.
- Chromium is the only browser exercised in this pass.
- Generated WebAudio cues are functional placeholders, not final authored audio.
- Rapier supplies render-world collision proxies while deterministic gameplay collision remains simulation-authoritative.
- The production JavaScript bundle is approximately 3.64 MB minified and 1.25 MB gzip; code splitting remains deferred.
- The 10-second post-GC heap samples increased by approximately 1.68 MiB on desktop and 1.46 MiB on mobile. This short run is not evidence of a leak, but it is also not a long-duration leak clearance.

## Next Authorized Action

Stop at this gate. Await Ian's review of the M0.1 correction evidence, residual paleness, foot planting, narrow-portrait HUD overlap, and redistribution/permission decision before broadening the milestone.
