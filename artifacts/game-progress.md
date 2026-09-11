# Game Progress

## Intent

Build the Flat Grassland foundation using the locked React/R3F stack and one deterministic fixed-step simulation shared by both cameras, preserve the accepted M0-M1.1 Tololo baseline, then add the first bounded Varjager vertical slice with Felagi · Lade.

## Current Status

- Technical placeholder foundation: implemented and passing the available automated gates.
- M0 Tololo procedural integration: provisionally accepted as the character-integration baseline (2026-09-11).
- M0.1 visual and animation correction: provisionally accepted as part of the same baseline (2026-09-11).
- M1 Tololo combat kit: director-accepted by Ian (2026-09-12) as the playable-combat baseline; provisional items in `DECISIONS.md` unchanged.
- M1.1 movement and camera correction: director-accepted by Ian (2026-09-12) as part of the same baseline; provisional items in `DECISIONS.md` unchanged.
- M2 Felagi · Lade vertical slice: technically complete in the working tree with deterministic tests and compact evidence; not director-accepted and not in the normal encounter roster.
- Asset-ready Flat Grassland vertical slice: not accepted.
- Git: repository exists on `main` tracking `origin/main`; pushed through protected baseline commit `1eb21e6`; M2 changes are uncommitted.

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

## M1 Combat Kit (Working Tree)

- No simulation mechanics added or rebalanced: AK-Alfa, Lightspike rhythm, three skills, L2/L3/L4 guarantees, and damage/attachment math are preserved exactly as verified in M0/M0.1.
- Render projection now forwards skill event identity, hydro projectile kind, and player-anchored skill positions; projectiles, tracers, flashes, and impacts remain presentation-only.
- HUD shows all three ability slots (Q/E/F) with Locked/Ready/cooldown/disabled states, Lightspike rhythm pips, ammo/reload, and an Ultimate-ready accent; level-up cards show effects, cooldowns, unlock-vs-rank status, and PROVISIONAL labels.
- Placeholder ability feedback is code-authored only: cyan hydro tracers, ground-ring activations (gold tetra burst for the Ultimate), distinct synth pitches per skill. No generated assets.
- Development diagnostics publish a Tololo kit block (weapon, passive, unlocks, cooldowns, last skill/damage ticks, derived aim target, seed, camera); deterministic `grantExperience`/`spawnEnemy` hooks back the Playwright flow.
- Real-time kit readings and every provisional value are recorded in `CHARACTERS_AND_LOOT.md`; interaction rules in `GAMEPLAY_SYSTEMS.md`; milestone mapping and acceptance in `DECISIONS.md`.

## M2 Felagi · Lade Vertical Slice (Working Tree)

- Added a data-driven `lade` role without changing the accepted normal encounter-director roster. Provisional values are 85 health, 3.1 m/s speed, 0.55 m radius, 13 damage, 1.9 m attack range, 0.7-second telegraph, 1.7-second cooldown, 30 EXP, 5 Sardis, and zero armor.
- Authoritative fixed-step behavior covers seeded spawn state, arena clamping, pursuit, separation, `ladeSlash` anticipation/damage/recovery, stagger interruption, defeat, one-time rewards, removal, and disposal counters. Both cameras use the same entity and coefficients.
- `LadeEnemy.tsx` is an original code-authored temporary proxy because no usable Lade 3D model was supplied. It communicates a gas mask, helmet/headlamp, scarf, layered olive clothing, guards, backpack/blade, and rifle silhouette with procedural locomotion/combat poses. Spawn, telegraph, hit/stagger, and short post-removal death-burst feedback are presentational only.
- `?ladeDebug=1` gates collider, attack-range, attack-origin, and awareness helpers plus a turntable. The local `FelagiㆍLade.webp` remains a reference only; its exact hash, source restrictions, and the seven-file inventory are recorded in `docs/ASSET_MANIFEST.md`.
- Added 18 deterministic simulation tests and two production-browser flows. The full duel covers approach, telegraph, receiving damage, dodge, Tidal Step stagger, Hydro damage/mark flow, AK-Alfa and Starfall kills, one-time rewards, camera continuity, pause freeze, death/retry, and disposal.

## Verification Summary

- TypeScript: passed, `tsc -b --pretty false`, zero diagnostics.
- ESLint: passed, `eslint .`, zero diagnostics.
- Prettier: passed, `prettier --check .`, all matched files use Prettier code style.
- Vitest: 10 files and 95 tests passed, including 18 Lade simulation tests.
- Production build: passed, Vite 8.3.0 transformed 613 modules; one known non-fatal chunk-size warning (JS 3,660.26 kB minified, 1,252.95 kB gzip).
- Playwright production browser suite: 32 tests passed in 2.4 minutes across desktop and narrow Chromium projects (16 per project), including the full Lade duel and narrow essential flow.
- Canvas inspection: nonblank (252 sampled colors, luminance span 238), hardware-accelerated AMD Radeon RX 9070, no software rendering, no errors.
- Runtime profile: two 10-second hardware-accelerated normal-roster samples with no console/page errors; desktop ~154.03 FPS (6.50 ms avg), mobile ~164.70 FPS (6.07 ms avg).
- Motion evidence: 8 M0.1 correction clips plus 9 M1 kit clips, each with sampled states and zero errors; pause phase frozen; retry returns to idle.
- M1.1 control evidence: 3 overlay review clips (third-person, top-down, switch) with zero errors, 2 directional screenshots (desktop 1280x720, narrow 390x844), and `artifacts/performance/m11-controls.json` with inputs, bases, displacements, dots, and yaw/pitch deltas.
- M2 Lade evidence: 4 WebM clips, 4 1280x720 gameplay/debug screenshots, and `artifacts/performance/m2-lade.json` with zero errors, dual-camera outcomes, skill interactions, lifecycle counters, and renderer counts.
- Tololo runtime probes: load ~515 ms (dev) / ~585-592 ms (preview warm), zero resource/console/page errors, one runtime instance, disposal on menu return.
- `npm audit --omit=dev`: 0 vulnerabilities.

See `artifacts/final-evidence.md` and `artifacts/evidence-manifest.json` for exact commands, measurements, captures, and limitations.

## Active Blockers

- Redistribution/release of Tololo and related official assets is blocked by unverified permission and explicit embedded no-redistribution/no-commercial-use terms.
- Authored animation acceptance is impossible because no VMD or other animation files were supplied; procedural animation is provisional.
- Production AK-Alfa integration is blocked because no standalone weapon asset exists in the supplied package.
- Production Lade integration is blocked because no licensed runtime model, rig, or authored animation was supplied; the procedural proxy and all coefficients require Ian's review.
- Residual paleness under bright sun, approximate foot planting, and lower-leg overlap behind the bottom-right HUD panel on narrow portraits remain director-reviewed items.
- Only Ian can review game feel, approve visual quality, and record director acceptance.

## Known Limitations

- Tololo animation is procedural, not authored clips; foot sliding is reduced but not eliminated.
- The rifle proxy is intentionally simple and labeled temporary; it is not final art.
- Enemies, foliage cards, and the boss remain local procedural placeholders rather than final art.
- Lade's screenshot views are in-world turntable/debug evidence, not an isolated model viewer or proof of final silhouette/material quality.
- Mobile projects validate responsive layout and browser behavior; the locked target is desktop-first and touch movement controls are not implemented.
- Chromium is the only browser exercised in this pass.
- Generated WebAudio cues are functional placeholders, not final authored audio.
- Rapier supplies render-world collision proxies while deterministic gameplay collision remains simulation-authoritative.
- The production JavaScript bundle is approximately 3.65 MB minified and 1.25 MB gzip; code splitting remains deferred.
- The 10-second post-GC heap samples increased by approximately 1.64 MiB on desktop and 1.72 MiB on mobile. This short run is not evidence of a leak, but it is also not a long-duration leak clearance.
- critRate affixes are implemented but not single-sample testable by design (probabilistic threshold); Flat ATK, ATK%, and Crit Damage interactions are covered by exact tests.

## Next Authorized Action

Present the technically complete M2 Felagi · Lade slice to Ian for visual, balance, encounter, and game-feel review. Do not add Lade to the normal roster, begin Medisin, commit, push, deploy, or publish without explicit instruction.
