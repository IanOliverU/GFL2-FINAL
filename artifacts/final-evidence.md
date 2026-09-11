# Final Evidence

## Verdict

**Technically complete in the working tree for the M0.1 Tololo visual and animation correction pass. Not director-accepted. Not committed, pushed, deployed, or published.**

The deterministic game loop, two-camera presentation, menu and gameplay flows, automated browser paths, and QA diagnostics remain operational with the corrected Tololo presentation at the render layer only. No gameplay, balance, progression, economy, boss, extraction, or stage values changed in M0.1. Animation stays procedural, the rifle stays an explicitly temporary proxy, redistribution permission is unverified, and director acceptance has not occurred.

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

## Verification

| Check                     | Exact result                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`       | Passed, `tsc -b --pretty false`, zero diagnostics                                                                        |
| `npm run lint`            | Passed, `eslint .`, zero diagnostics                                                                                     |
| `npm run format:check`    | Passed, `prettier --check .`, all matched files use Prettier code style                                                  |
| `npm run test:run`        | Passed, 7 test files and 32 tests                                                                                        |
| `npm run build`           | Passed, Vite 8.3.0 transformed 611 modules                                                                               |
| `npm run test:e2e`        | Passed, 16 tests in 52.9 seconds across desktop and mobile Chromium projects                                             |
| `npm run inspect:canvas`  | Passed, active third-person canvas nonblank with 253 sampled colors, luminance span 238, and no errors                   |
| Inspector state probes    | Passed for menu, third-person, top-down, level-up, attachment, boss break, extraction, and death; no console/page errors |
| `npm run profile:runtime` | Passed, two 10-second hardware-accelerated samples with no console/page errors                                           |
| `npm run capture:motion`  | Passed, 8 separate correction clips plus sampled animation states with no console/page errors                            |
| `npm run audit:mmd`       | Passed, 10 PMX files inventoried with hashes, bounds, materials, bones, morphs                                           |
| `npm run probe:tololo`    | Passed on the dev server, 515 ms load, 30,905 vertices, 409 bones, zero resource errors                                  |
| `npm run inspect:tololo`  | Passed, Tololo loaded with zero missing bones and zero resource/console/page errors                                      |
| `npm audit --omit=dev`    | Passed, 0 vulnerabilities reported                                                                                       |

The production build emitted one non-fatal warning because the main JavaScript chunk exceeds 500 kB:

- HTML: 0.62 kB, 0.36 kB gzip.
- CSS: 34.97 kB, 7.29 kB gzip.
- JavaScript: 3,644.32 kB, 1,248.65 kB gzip.
- Source map: 8,075.86 kB.

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

Playwright coverage in `tests/e2e/game.spec.ts` verifies on desktop and Pixel 7 viewport projects:

- Live menu preview and reduced-motion state.
- Real keyboard/mouse movement, fire, reload, shared-world camera switching, and Tololo walk/sprint/dodge/reload animation states.
- Tololo PMX load-once identity (30,905 vertices, 409 bones, zero resource errors, zero missing bones), grounding error ~0 m, muzzle error 0 m, dominant grip below 0.03 m, support grip below 0.04 m, uniqueness on retry, and disposal on menu return.
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

## Visual Evidence

The M0.1 screenshot set is indexed in `artifacts/evidence-manifest.json` under run ID `tololo-m01-correction-20260911`.

- Front: `artifacts/screenshots/tololo-model-front.png` — slim proxy rifle, both hands on the weapon, torso no longer obscured.
- Side: `artifacts/screenshots/tololo-model-side.png` — rifle at shoulder height, stock near shoulder, grounded, no torso clipping.
- Grips: `artifacts/screenshots/tololo-model-grips.png` — tight crop of both hands on the proxy.
- Face/material: `artifacts/screenshots/tololo-model-face.png` — readable eyes/brows, hair toon banding, cloth textures.
- Normal mode: `artifacts/screenshots/tololo-model-normal.png` — default framing with zero debug helpers (count 0).
- Debug mode: `artifacts/screenshots/tololo-model-debug.png` — skeleton/bounds overlay present only under the explicit flag.
- Detail: `artifacts/screenshots/tololo-model-detail.png` — full-torso crop.
- Gameplay: desktop/mobile third-person and top-down captures from the browser suite.
- Mobile portrait: `artifacts/screenshots/mobile-portrait-check.png` — Tololo visible at NDC ~(0.50, -0.53).

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

## Performance Evidence

### Static Render Probes

Production preview, seeded active third-person combat:

| Configuration                  | DPR | Calls |         Triangles | Geometries |  Textures | Luminance contrast | Reference budget   |
| ------------------------------ | --: | ----: | ----------------: | ---------: | --------: | -----------------: | ------------------ |
| Desktop third-person, 1440x900 | 1.0 |   157 |            93,306 |        106 |        17 |                238 | Pass               |
| Tololo model bounds            |   — |     — | 40,000 model tris |          — | 11 unique |                  — | Within scene total |

Inspector reference limits were 300 calls/750,000 triangles on desktop and 150 calls/300,000 triangles on mobile. These are starting-point budgets, not a guarantee of final populated-scene performance.

### Runtime Profile

Source: `artifacts/performance/runtime-profile.json`. State: seeded active third-person combat with five enemies and no scripted player input during each 10-second sample.

| Metric               | Desktop 1440x900, DPR 1 | Mobile 390x664, DPR 1.75 |
| -------------------- | ----------------------: | -----------------------: |
| Average FPS          |                  153.92 |                   164.74 |
| Average frame time   |                 6.50 ms |                  6.07 ms |
| P50 frame time       |                 6.10 ms |                  6.10 ms |
| P95 frame time       |                 6.20 ms |                  6.20 ms |
| P99 frame time       |                 6.20 ms |                  6.20 ms |
| Frames over 20 ms    |                       3 |                        0 |
| Frames over 33.34 ms |                       2 |                        0 |
| DOM content loaded   |               145.40 ms |                139.10 ms |
| Load event           |               145.50 ms |                139.10 ms |
| Post-GC heap before  |       101,754,062 bytes |        101,996,465 bytes |
| Post-GC heap after   |       103,434,735 bytes |        103,455,100 bytes |
| Heap delta           |        +1,680,673 bytes |         +1,458,635 bytes |

Tololo model load is ~515 ms on the dev server and ~585-592 ms on warmed preview, with zero resource errors. The samples exceed the 60 FPS target on this 165 Hz-capable test environment. The positive short-run heap deltas require longer soak testing once production assets and representative populations exist; they are not by themselves proof of a leak.

### Baseline Comparison (M0 Run `tololo-m0-procedural-20260911`)

- FPS/frame time: unchanged within noise (M0 desktop 153.38 FPS / 6.52 ms, mobile 164.84 / 6.07 ms).
- Draw calls: 145 to 157 on desktop (+12 from the 11-part proxy, muzzle flash, and dodge ring). Triangles: 93,162 to 93,306 (+144). Textures: 17, unchanged.
- Heap deltas: +1.77/+1.52 MiB then, +1.68/+1.46 MiB now; same short-run behavior.
- Grip errors: ~0.089/0.063 m then, ~0.031/0.009 m now.
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

- M0.1 director acceptance is pending: residual paleness, foot planting, narrow-portrait HUD overlap, proxy simplicity, procedural motion quality.
- Redistribution/release remains blocked by unverified permission plus explicit embedded no-redistribution/no-commercial-use terms.
- Authored animation acceptance is impossible without supplied clips; procedural motion is provisional.
- Production AK-Alfa integration is blocked without a standalone weapon asset.
- Final Grassland art, production enemies (including any Varjager/Berserker work), authored audio, final VFX, and director-level encounter/game-feel tuning remain deferred.
- Touch controls, cross-browser coverage, long-duration memory soak, denser representative populations, and JavaScript code splitting remain deferred.
- Rapier integration currently provides collision proxies while the deterministic simulation owns combat collision; production physics integration requires later evidence without surrendering simulation authority.

## Prior Baseline Preservation

M0 run `tololo-m0-procedural-20260911` (2026-09-11): 7 files / 32 Vitest tests passing, 10 Playwright tests passing in 32.3 s, single motion video `artifacts/videos/tololo-m0-procedural-motion.webm` (13.48 s) with `artifacts/performance/tololo-motion-states.json` (pause frozen, grip ~0.089/0.063 m). That video and states file are preserved on disk; the M0 model screenshots were superseded in place by the M0.1 captures above.

## Acceptance And Release

- Technical implementation handoff: complete in the working tree for the M0.1 correction pass.
- M0 acceptance: not complete.
- M0.1 acceptance: not complete.
- Flat Grassland director acceptance: not granted.
- Commit/push/deploy/publish: not performed.
