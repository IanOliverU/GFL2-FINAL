# GFL2 Dual-Camera Roguelite — Project Documents

Status: Pre-production approved for one-shot foundation planning  
Director: Ian Oliver Umipig  
Implementation, commit, push, and deployment: Require explicit director instruction

## Project Summary

This is a solo browser action roguelite inspired by the run progression of _Risk of Rain 2_ and the switchable camera concept of _Suit for Hire_. The player controls one GFL2 Doll using either an over-the-shoulder third-person camera or an elevated top-down camera. Both perspectives share one simulation and one balance model.

The first one-shot build targets a complete Grassland vertical slice. Later characters, stages, art, balance, and content are built on that tested foundation rather than through another rewrite.

## Document Index

1. [AGENTS.md](AGENTS.md) — mandatory operating rules and project authority.
2. [GAME_VISION.md](docs/GAME_VISION.md) — direction, pillars, run loop, and scope.
3. [TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) — stack, boundaries, data design, and MMD pipeline.
4. [GAMEPLAY_SYSTEMS.md](docs/GAMEPLAY_SYSTEMS.md) — controls, cameras, combat, progression, Sardis, and extraction.
5. [CHARACTERS_AND_LOOT.md](docs/CHARACTERS_AND_LOOT.md) — roster, character-kit structure, attachments, and rarity.
6. [STAGES_AND_BOSSES.md](docs/STAGES_AND_BOSSES.md) — four maps, weather identities, pedestal loop, and bosses.
7. [UI_UX_AND_ART_DIRECTION.md](docs/UI_UX_AND_ART_DIRECTION.md) — rotating-map menu, UI behavior, palette, typography, and visual language.
8. [MILESTONES.md](docs/MILESTONES.md) — M0–M8 build sequence and acceptance gates.
9. [TESTING_AND_ACCEPTANCE.md](docs/TESTING_AND_ACCEPTANCE.md) — evidence, browser testing, performance, and director review.
10. [DECISIONS.md](docs/DECISIONS.md) — locked decisions and unresolved items.
11. [ONE_SHOT_BUILD_SPEC.md](docs/ONE_SHOT_BUILD_SPEC.md) — bounded implementation brief for the first Codex build.

## First Command to the Implementing Agent

Keep `AGENTS.md` at the repository root and the remaining planning documents in `docs/`. Read all required documents before changing code. Complete only the scope in `docs/ONE_SHOT_BUILD_SPEC.md`. Do not commit, push, deploy, or mark a milestone accepted without explicit director approval.
