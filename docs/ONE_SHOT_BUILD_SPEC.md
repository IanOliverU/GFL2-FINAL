# One-Shot Foundation Build Specification

## Objective

Create a clean, extensible playable foundation for the final GFL2 dual-camera roguelite. Deliver one complete Flat Grassland loop that can be expanded without rewriting the core architecture.

Read all project documents before implementation. When documents conflict, `DECISIONS.md` and explicit director instructions take precedence.

## Required Scope

1. Set up React, strict TypeScript, Vite, R3F/Three.js, Rapier, Zustand, Vitest, Playwright, ESLint, and Prettier.
2. Establish the documented folder boundaries and fixed-step simulation.
3. Prove Tololo's runtime model pipeline before broad feature implementation.
4. Implement the GFL2-derived UI token system.
5. Implement a main menu with a low-cost, real-time rotating Grassland preview, functional navigation, reduced-motion behavior, and static fallback.
6. Implement third-person and top-down cameras over one persistent simulation.
7. Implement movement, sprint, dodge, aiming, firing, ADS/focused aim, reload, health, damage, death, pause, and retry.
8. Implement Tololo's signature weapon and representative data-driven passive/skills pending final balance review.
9. Implement baseline melee, fast, ranged, heavy, and elite enemies using approved available assets or clearly labeled temporary placeholders.
10. Implement EXP, three-card level-ups, core-skill guarantees, weapon/general upgrades, caps, and rerolls.
11. Implement compatible attachments, rarity/affixes, pickup comparison, equip, and salvage.
12. Implement Sardis drops and post-boss healing/reroll/upgrade purchases.
13. Implement seeded valid pedestal placement, discovery aids, activation, and boss event.
14. Implement one multi-phase boss with telegraphs, a breakable weak point, a stagger window, and final-phase escalation.
15. Implement extraction, results, and clean restart.
16. Add deterministic unit/simulation tests and production Playwright coverage.
17. Add diagnostics and report performance honestly.

## Explicit Non-Goals

- Remaining five finished Dolls.
- Desert, Rain, and Winter production stages.
- Dense buildings, city blocks, or broad prop generation.
- Login, cloud saving, multiplayer, monetization, or permanent progression.
- Final production balance and final visual polish.
- Automatic commit, push, deployment, or milestone acceptance.

## Implementation Rules

- Do not replace the MMD asset gate with a primitive character and claim success.
- Do not let React rerenders drive simulation.
- Do not implement separate gameplay worlds for each camera.
- Do not use fake UI buttons or nonfunctional menu options without labeling them unavailable.
- Do not represent placeholders as completed art.
- Do not hide test failures or skip production-build verification.
- Preserve licenses and do not redistribute unreviewed source assets.

## Handoff Format

Report:

1. Outcome and playable URL used locally.
2. Implemented features.
3. Files changed.
4. Exact verification commands and results.
5. Browser evidence and performance measurements.
6. Known limitations and placeholder assets.
7. Decisions requiring Ian's review.
8. Confirmation that nothing was committed, pushed, deployed, or accepted unless explicitly instructed.
