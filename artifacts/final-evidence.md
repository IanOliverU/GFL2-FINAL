# Final Evidence

## Verdict

**BLOCKED for asset-ready completion. PASS for the independently implementable technical placeholder foundation.**

The deterministic game loop, two-camera presentation, menu and gameplay flows, automated browser paths, and QA diagnostics are operational. This is not a completed MMD vertical slice: Tololo and the approved production asset/license package were not present, all substitute visuals are explicitly labeled placeholders, and director acceptance has not occurred.

## Environment

- Date: 2026-09-11.
- Platform: Windows, desktop-browser-first target.
- Node: 24.12.0.
- npm: 11.7.0.
- Browser automation: Playwright 1.63.0, Chromium channel.
- GPU observed by WebGL: `ANGLE (AMD, AMD Radeon RX 9070 (0x00007550) Direct3D11 vs_5_0 ps_5_0, D3D11)`.
- GPU vendor: `Google Inc. (AMD)`.
- Rendering mode: hardware accelerated; software rendering was not detected.
- Runtime versions: React 19.2.8, Three.js 0.186.0, R3F 9.7.0, Drei 10.7.8, Rapier 2.2.0, Zustand 5.0.15, Vite 8.3.0, TypeScript 6.0.3, Vitest 5.0.0.

These measurements describe this machine and browser only. They do not establish compatibility or performance on other hardware.

## Verification

| Check                     | Exact result                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`       | Passed, `tsc -b --pretty false`, zero diagnostics                                                                        |
| `npm run lint`            | Passed, `eslint .`, zero diagnostics                                                                                     |
| `npm run format:check`    | Passed after final report formatting                                                                                     |
| `npm run test:run`        | Passed, 6 test files and 21 tests                                                                                        |
| `npm run build`           | Passed, Vite 8.3.0 transformed 606 modules                                                                               |
| `npm run test:e2e`        | Passed, 8 tests in 19.5 seconds across desktop and mobile Chromium projects                                              |
| `npm run inspect:canvas`  | Passed, active third-person canvas nonblank with 81 sampled colors, luminance span 232, and no errors                    |
| Inspector state probes    | Passed for menu, third-person, top-down, level-up, attachment, boss break, extraction, and death; no console/page errors |
| `npm run profile:runtime` | Passed, two 10-second hardware-accelerated samples with no console/page errors                                           |
| `npm run capture:motion`  | Passed, placeholder gait/reload video captured with no console/page errors                                               |
| `npm audit --omit=dev`    | Passed, 0 vulnerabilities reported                                                                                       |

The production build emitted one non-fatal warning because the main JavaScript chunk exceeds 500 kB:

- HTML: 0.62 kB, 0.36 kB gzip.
- CSS: 34.97 kB, 7.29 kB gzip.
- JavaScript: 3,468.81 kB, 1,182.35 kB gzip.
- Source map: 7,574.88 kB.

## Automated Coverage

Vitest coverage in `tests/unit/` and `tests/simulation/` verifies:

- Fixed timestep, deterministic replay, resume clamp, and pause freezing.
- Camera switching while preserving authoritative player/combat state.
- Dodge cooldown/invulnerability and combat/projectile behavior.
- Data definitions, attachment rarity/affix rules, and compatibility.
- Level thresholds, guaranteed Level 2/3/4 skill offers, caps, and rerolls.
- Seeded pedestal validity, boss phases/core break/death, and extraction transitions.
- Sardis purchases, insufficient funds, extraction reset, death, and retry.

Playwright coverage in `tests/e2e/game.spec.ts` verifies on desktop and Pixel 7 viewport projects:

- Live menu preview and reduced-motion state.
- Real keyboard/mouse movement, fire, reload, and shared-world camera switching.
- Level-up choice, attachment actions, boss break, extraction/results, death, and retry.
- Pedestal activation through the real interact input.
- Nonblank canvas checks plus page and console error inspection.

The mobile project is responsive/browser regression evidence, not touch-control acceptance. The project decision remains desktop browser first.

## Visual Evidence

The accepted screenshot set is indexed in `artifacts/evidence-manifest.json`.

- Menu: `artifacts/performance/grassland-pass-1/desktop-menu.png` and `mobile-menu.png`.
- Gameplay cameras: `artifacts/performance/grassland-pass-2/desktop-active-third.png`, `desktop-active-top.png`, `mobile-active-third.png`, and `mobile-active-top.png`.
- Progression: `artifacts/performance/grassland-pass-1/desktop-level-up.png` and `desktop-attachment.png`.
- Boss break: `artifacts/performance/grassland-pass-2/desktop-boss-break.png`.
- Extraction: `artifacts/performance/grassland-pass-2/desktop-extraction.png`.
- Death/retry presentation: `artifacts/performance/grassland-pass-1/desktop-death.png`.

The first gameplay inspector pass exposed an evidence defect: screenshot freezing opened the normal pause menu and obscured the world. The test-only capture path was corrected so `grassland-pass-2` freezes authoritative state without showing the pause surface. Normal user pause behavior is unchanged.

Visual review findings:

- Camera framing, objective/HUD hierarchy, boss break state, terminal flow, and desktop/mobile responsive reflow are visible and readable.
- Third-person and top-down captures show the same seeded world and objective state.
- Mobile content reflows without horizontal clipping, but the HUD intentionally consumes substantial vertical space and no touch movement controls exist.
- The terrain, foliage, characters, enemies, and boss are visibly procedural and do not meet final-art or MMD acceptance quality.
- Screenshots and metrics are evidence only; Ian determines visual and game-feel acceptance.

## Motion Evidence

- File: `artifacts/videos/placeholder-run-reload.webm`.
- Format: VP8 WebM, 1280x720, 25 FPS, 8.36 seconds, 912,402 bytes.
- Captures real keyboard movement, procedural placeholder gait, firing, HUD reload state, and the placeholder rifle-tilt reload cue.
- Representative stills: `artifacts/screenshots/motion-placeholder-run.png` and `motion-placeholder-reload.png`.

This recording is explicitly not Tololo run/reload proof. Production skeleton access, clip quality, upper-body masking, foot sliding, weapon attachment, and reload continuity remain blocked by the missing approved model and animation package.

## Performance Evidence

### Static Render Probes

| Configuration                  |  DPR | Calls | Triangles | Geometries | Textures | Luminance contrast | Reference budget |
| ------------------------------ | ---: | ----: | --------: | ---------: | -------: | -----------------: | ---------------- |
| Desktop third-person, 1280x720 |  1.0 |   135 |    16,208 |         93 |        4 |              111.7 | Pass             |
| Desktop top-down, 1280x720     |  1.0 |   129 |    15,940 |         88 |        4 |               41.4 | Pass             |
| Mobile third-person, 390x664   | 1.75 |    99 |    14,890 |         73 |        4 |              113.3 | Pass             |
| Mobile top-down, 390x664       | 1.75 |   111 |    15,240 |         78 |        4 |               45.3 | Pass             |
| Desktop boss break, 1280x720   |  1.0 |   114 |    17,950 |         73 |        4 |              109.3 | Pass             |
| Desktop extraction, 1280x720   |  1.0 |   114 |    16,714 |         76 |        4 |               97.5 | Pass             |

Inspector reference limits were 300 calls/750,000 triangles on desktop and 150 calls/300,000 triangles on mobile. These are starting-point budgets, not a guarantee of final populated-scene performance.

### Runtime Profile

Source: `artifacts/performance/runtime-profile.json`. State: seeded active third-person combat with five enemies and no scripted player input during each 10-second sample.

| Metric               | Desktop 1440x900, DPR 1 | Mobile 390x664, DPR 1.75 |
| -------------------- | ----------------------: | -----------------------: |
| Average FPS          |                  164.29 |                   164.87 |
| Average frame time   |                 6.09 ms |                  6.07 ms |
| P95 frame time       |                 6.20 ms |                  6.20 ms |
| P99 frame time       |                 6.20 ms |                  6.20 ms |
| Frames over 20 ms    |                       1 |                        0 |
| Frames over 33.34 ms |                       0 |                        0 |
| DOM content loaded   |               151.70 ms |                137.30 ms |
| Load event           |               152.20 ms |                137.30 ms |
| Post-GC heap before  |        17,048,000 bytes |         17,018,924 bytes |
| Post-GC heap after   |        18,416,103 bytes |         18,311,583 bytes |
| Heap delta           |        +1,368,103 bytes |         +1,292,659 bytes |

The samples exceed the 60 FPS target on this 165 Hz-capable test environment. The positive short-run heap deltas require longer soak testing once production assets and representative populations exist; they are not by themselves proof of a leak.

## Asset And License Status

- Supplied project assets found: none, apart from the locally authored UI favicon added during implementation.
- External asset-generation services used: none.
- Runtime visuals: code-authored procedural geometry and materials, all treated as placeholders.
- Runtime audio: code-authored WebAudio oscillator/noise cues, treated as placeholders.
- Tololo source model, textures, rifle, clips, and license/redistribution record: missing.
- Enemy, boss, environment, VFX, and authored audio source/license records: missing because production assets were not supplied.
- npm dependency versions are pinned in `package-lock.json`; `npm audit --omit=dev` reported zero vulnerabilities, but this is not a legal license audit.
- Final font licenses remain a pending director decision; no remote font files are loaded by the current implementation.

No unreviewed production asset is included or represented as redistributable final art.

## Blockers And Deferred Work

- M0 Tololo validation is blocked: real materials, scale, grounding, skeleton access, weapon socketing, upper-body aiming, muzzle origin, animation, performance, disposal, and reload behavior cannot be proven.
- Final Grassland art, production enemies, authored audio, final VFX, and director-level encounter/game-feel tuning are deferred until approved assets exist.
- Touch controls, cross-browser coverage, long-duration memory soak, denser representative populations, and JavaScript code splitting remain deferred.
- Rapier integration currently provides collision proxies while the deterministic simulation owns combat collision; production physics integration requires later evidence without surrendering simulation authority.

## Acceptance And Release

- Technical implementation handoff: complete for the asset-independent placeholder foundation.
- M0 acceptance: not complete.
- Flat Grassland director acceptance: not granted.
- Commit/push/deploy/publish: not performed.
