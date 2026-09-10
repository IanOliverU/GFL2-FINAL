# Testing and Acceptance

## Required Verification

Every implementation handoff must report:

- `typecheck`
- `lint`
- unit/simulation tests
- production build
- relevant Playwright production-browser tests
- known failures, deferred checks, and environment limits

## Critical Automated Coverage

- Fixed-step determinism and resume-delta clamp.
- Camera switching preserves world state.
- Pause freezes simulation.
- Dodge cooldown and invulnerability lifecycle.
- Projectile/muzzle/hit agreement.
- EXP thresholds and Level 2/3/4 guarantees.
- Upgrade eligibility, caps, and rerolls.
- Attachment compatibility and rarity affixes.
- Seeded pedestal placement validity.
- Boss phase, weak-point, break, death, and extraction transitions.
- Sardis purchases and insufficient-funds behavior.
- Menu preview fallback and reduced motion.

## Browser Evidence

Playwright Test owns committed regression tests. Playwright MCP may inspect live behavior, capture screenshots/video, and diagnose browser errors, but it does not replace stored tests.

Visual work requires screenshots at relevant resolutions and both camera modes. Menu evidence must show the rotating preview, readable navigation, focus state, and fallback/reduced-motion behavior.

## Performance Gates

Record hardware-accelerated results separately from software-rendered or virtualized results. At minimum capture frame timing, active enemies, projectiles, draw calls/triangles when available, memory trend, and initial load time.

Performance evidence must state the device/browser and cannot imply broad compatibility from one machine.

## Director Acceptance

- The implementing agent may report a milestone technically complete.
- Only Ian can record director acceptance.
- No response may invent approval, call visuals final without review, or trigger commit/push/deploy automatically.
- Preserve working systems unless a requested change requires modification; report regressions explicitly.
