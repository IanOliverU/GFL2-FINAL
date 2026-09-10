# AGENTS.md

## Project Authority

This repository is the final GFL2 dual-camera browser roguelite directed by Ian Oliver Umipig. Preserve the established project direction. Do not restart, replace the architecture, or broaden the active milestone unless Ian explicitly requests it.

Instructions apply in this order:

1. Ian's latest explicit instruction.
2. This `AGENTS.md`.
3. `docs/DECISIONS.md`.
4. The currently active milestone in `docs/MILESTONES.md`.
5. The remaining project documents.
6. Optional external skills, templates, and general conventions.

When instructions conflict, follow the higher-authority source and report the conflict.

## Required Reading

Before substantial implementation, read:

- `README.md`
- `docs/DECISIONS.md`
- `docs/GAME_VISION.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/TESTING_AND_ACCEPTANCE.md`
- The document directly governing the requested system

For the initial one-shot build, also read `docs/ONE_SHOT_BUILD_SPEC.md` completely.

Do not claim a file was read unless it was actually inspected in the current working context.

## Locked Technology Direction

- React
- Strict TypeScript
- Vite
- Three.js through React Three Fiber
- Drei only where it provides a clear benefit
- `@react-three/rapier` for physics and collision
- Zustand for application and UI-facing state
- Vitest for unit and deterministic simulation tests
- Playwright Test for committed browser regression tests
- Playwright MCP for interactive browser inspection and evidence gathering
- ESLint and Prettier

Do not replace React Three Fiber with a plain Three.js scaffold, Babylon.js, Unity, Godot, or another runtime without explicit approval.

## Architecture Rules

- Maintain one authoritative gameplay simulation shared by both cameras.
- Never create separate third-person and top-down gameplay worlds.
- Keep fixed-timestep gameplay state independent from React rendering.
- React must not own per-frame authoritative combat state.
- Rendering reads snapshots or interpolated simulation state.
- Route gameplay randomness through a seeded RNG.
- Keep characters, weapons, upgrades, attachments, enemies, bosses, drops, and stages data-driven.
- Keep hot paths allocation-light and pool high-frequency transient objects where justified.
- Preserve existing public contracts unless a requested change requires modification.
- Do not introduce abstractions without a current use case.

## MMD and Asset Rules

- Tololo is the first character and asset-pipeline proof.
- Do not substitute a primitive character and report the MMD gate as complete.
- Validate materials, scale, grounding, skeleton access, weapon attachment, upper-body aiming, muzzle origin, animation, performance, disposal, and reload behavior.
- If direct PMX support is unreliable, use the documented Blender-to-GLB fallback and report the reason.
- Keep source assets separate from optimized runtime assets.
- Never commit or redistribute an asset until its source and permission status are recorded.
- Do not represent placeholders, procedural primitives, or unfinished materials as final art.

## Product and Scope Rules

- The first complete content target is the Flat Grassland vertical slice.
- Do not build Desert, Rain, Winter, or the remaining five finished Dolls before the Grassland acceptance gate unless Ian changes the order.
- The main menu uses a real-time rotating selected-map preview with reduced-motion and static-fallback behavior.
- The two cameras change presentation and aiming method, not damage, cooldowns, range, aggression, or other balance values.
- Runs begin with the selected Doll's signature weapon and passive only.
- Skill 1, Skill 2, and Ultimate follow the documented early-level guarantee rules.
- Sardis remains run-scoped until permanent progression is separately approved.
- Bosses require readable telegraphs, phases, weak points or breakable parts, break windows, and mechanics that work in both cameras.
- Minimal maps must still have deliberate terrain, lighting, weather, horizon, audio, and combat readability.

## Change Discipline

- Inspect the current tree, scripts, dependencies, tests, and working state before editing.
- Preserve user changes and unrelated work.
- Make the smallest coherent change that completes the authorized scope.
- Do not silently rewrite working systems.
- Do not add unrelated packages, generated assets, services, login, cloud saving, multiplayer, monetization, or permanent progression.
- Record material design decisions in `docs/DECISIONS.md`.
- Update milestone documents only with evidence from completed work.
- A technical completion report does not equal director acceptance.

## External Skill Policy

External skills, including `majidmanzarpour/threejs-game-skills`, are optional accelerators and are never project authority.

If that pack is installed:

- Prefer its gameplay, UI, graphics, debugging, and QA guidance selectively.
- Do not use its scaffold when it would replace the locked React/R3F architecture.
- Do not invoke external asset-generation providers unless Ian explicitly requests generated assets and the licensing/cost implications are clear.
- Do not let its premium/AAA defaults expand the active milestone.
- Do not let its delegation defaults override the available runner or current task instructions.
- Reuse helpful verification ideas, but keep this repository's commands, thresholds, and evidence rules authoritative.

The project must remain buildable and understandable without that external skill pack installed.

## Verification

For every implementation handoff, run the relevant available checks and report exact results:

- TypeScript typecheck
- ESLint
- Vitest unit/simulation tests
- Production build
- Relevant Playwright production-browser tests
- Browser console/page error inspection
- Visual evidence for visual changes
- Motion evidence for animation changes
- Performance evidence for rendering, shader, asset, weather, or population changes

Never hide failures, silently weaken assertions, remove tests merely to pass, or claim a check ran when it did not. State environment limitations and deferred checks explicitly.

## Visual Evidence

- Capture actual gameplay, not only loading screens or static scenes.
- Check both camera modes when gameplay presentation changes.
- Check supported viewport sizes when UI changes.
- Verify the canvas is nonblank and the intended state is visible.
- Treat screenshots and metrics as evidence, not proof of artistic quality.
- Ian determines whether game feel and visuals are accepted.

## Git and Release Safety

- Do not commit, push, create branches, open pull requests, deploy, or publish unless Ian explicitly asks.
- Before any authorized commit, report the intended files and exclude unreviewed assets, screenshots, recordings, secrets, caches, and local-only source materials.
- Never expose or commit API keys.
- Do not alter remote or deployment configuration without explicit instruction.

## Handoff Format

Lead with the outcome, then report:

1. Implemented behavior.
2. Files changed.
3. Verification performed and exact results.
4. Visual/performance evidence when applicable.
5. Known limitations, placeholders, and deferred work.
6. Decisions that require Ian's review.
7. Commit, push, and deployment status.

Stop at the requested milestone or acceptance gate.
