# Gameplay Systems

## Controls

| Action            | Input         |
| ----------------- | ------------- |
| Move              | W / A / S / D |
| Aim               | Mouse         |
| Fire              | Left Mouse    |
| ADS / Focused Aim | Right Mouse   |
| Reload            | R             |
| Sprint            | Shift         |
| Dodge             | Space         |
| Skill 1           | Q             |
| Skill 2           | E             |
| Ultimate          | F             |
| Interact          | G             |
| Switch Camera     | V             |
| Pause             | Escape        |

Jump remains an explicit unresolved decision and must not be assumed by implementation.

## Camera Modes

Third-person uses an over-the-shoulder perspective, pointer-lock camera control, crosshair aiming, ADS zoom, camera collision, and aim-relative facing.

Top-down uses an elevated angled camera and cursor-to-ground/target raycasting. RMB becomes focused aim with tighter accuracy and a modest zoom.

Shared rules:

- Movement values, damage, range, cooldowns, enemy aggression, and invulnerability are identical.
- Switching uses a short 0.20–0.30 second visual blend.
- Position, velocity, aim intent, reload, cooldowns, projectiles, enemies, and simulation time persist.
- Switching is disabled during pause, death, loading, and non-cancellable transitions.
- Top-down mode must not expose enemies beyond the intended awareness range.

## Run Start and Leveling

The selected Doll begins at Level 1 with her signature firearm, passive, empty attachment slots, and no active skills.

- Level 2 guarantees Skill 1 as one of three cards.
- Level 3 guarantees Skill 2 after Skill 1 is owned.
- Level 4 guarantees Ultimate after both normal skills are owned.
- A weapon/basic-attack upgrade remains an alternative.
- A skipped core skill continues to appear until acquired.
- After the kit unlocks, the pool includes weapon, passive, skill, movement, defense, reload, and cooldown improvements.
- Combat pauses completely while three upgrade cards are shown.
- Maxed upgrades cannot appear.
- Limited rerolls may be purchased with Sardis or earned.

Initial balance assumption: five levels per character ability. Final coefficients remain data-driven and pending playtesting.

## Combat Requirements

- Distinct weapon cadence, magazine, reload, spread, recoil, penetration, range behavior, and hit response.
- Swept projectile or reliable ray/shape-query collision; no visually disconnected damage.
- Muzzle origin is authoritative.
- Critical hits, weak points, knockback, status effects, dodge invulnerability, damage numbers, muzzle flashes, and impacts.
- Melee, ranged, fast, heavy, and elite enemy roles.
- Player damage has readable telegraphing and invulnerability rules.

## Sardis Economy

Sardis is run-scoped and lost when the run ends. Sources include enemies, elites, bosses, and salvaged attachments.

At the post-boss extraction terminal, Sardis initially purchases:

- Healing.
- Attachment reward reroll.
- One attachment rarity upgrade at a high cost.
- Level-up reroll token.

Permanent Sardis upgrades and emergency revives are deferred until difficulty is proven.
