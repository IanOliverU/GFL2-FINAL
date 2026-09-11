# Characters and Loot

## Initial Roster

| Doll         | Signature Weapon | Type          | Real-Time Identity                                                       |
| ------------ | ---------------- | ------------- | ------------------------------------------------------------------------ |
| Tololo       | AK-Alfa          | Assault Rifle | Hydro hits, self-buffs, Lightspike critical scaling, extra-action rhythm |
| Qiongjiu     | QBZ-191          | Assault Rifle | Burn, Overburn spreading, exposed-target bonuses, follow-up volleys      |
| Mosin-Nagant | Mosin-Nagant     | Rifle         | Precision, Conductivity/Paralysis, Stability Break exploitation          |
| Sabrina      | SPAS-12          | Shotgun       | Hydro zones, slowing, protection, counterattacks, close control          |
| Peritya      | PKP Pecheneg     | Machine Gun   | Corrosion AoE, grouping, chained explosions, sustained control           |
| Vepley       | Vepr-12          | Shotgun       | Aggressive movement, knockback, slow, vulnerability, close-range zones   |

Turn-based tile ranges, turn costs, and ally-triggered support actions must be adapted rather than copied literally. Solo equivalents may use marks, echoes, drones, counter-shots, follow-up fire, or status triggers. Exact real-time values remain pending director review.

## Tololo Provisional Real-Time Kit (M1)

The roster gives Tololo only an identity line ("Hydro hits, self-buffs, Lightspike critical scaling, extra-action rhythm"), so M1 implements representative real-time readings of that intent. Every number below is PROVISIONAL and editable in `src/game/data/definitions.ts` and `src/game/core/simulation.ts`; none is claimed as canonical GFL2 data.

| Element                                | Real-time reading                                                                                            | Provisional values                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| AK-Alfa basic attack                   | Automatic projectile fire from the authoritative muzzle                                                      | 18 dmg, 9 rps, 30-round mag, 1.8 s reload, 0.035 spread (×0.42 ADS), 0.12 recoil/shot, 38 m range, 72 m/s |
| Lightspike (passive)                   | Every 6th landed hit critically strikes (−1 hit per passive rank, min 3); counter persists until it triggers | 8% base crit (cap 80%), ×1.5 crit mult                                                                    |
| Hydro Barrage (Skill 1, Q, 7 s)        | Fan of 5 Hydro projectiles marking targets; marked targets take +20% weapon damage for 4 s                   | 10+3/rank per projectile                                                                                  |
| Tidal Step (Skill 2, E, 11 s)          | Defensive pulse: brief dodge window, 5 m stagger, movement and armor self-buff                               | +30% speed, 0.35 damage reduction, 3+0.3 s/rank, 0.12 s i-frames, 0.45 s stagger                          |
| Starfall Recursion (Ultimate, F, 28 s) | Global strike on every hostile plus boss, then Skill 1 cooldown and fire lock reset (extra action)           | 42+12/rank true damage                                                                                    |
| Growth                                 | Weapon +12%/rank, cadence +8%/rank, reload −12%/rank, cooldown −8%/rank; skills to rank 5                    | Per `UPGRADE_DEFINITIONS`                                                                                 |

Unlock order follows the locked guarantee rules: Skill 1 at Level 2, Skill 2 at Level 3, Ultimate at Level 4, each skippable once with the skipped skill returning until taken. Ability names (Hydro Barrage, Tidal Step, Starfall Recursion) are representative labels pending final kit approval.

## Character Data Contract

Each Doll definition must support:

- Identity and runtime model reference.
- Signature weapon configuration.
- Passive.
- Skill 1.
- Skill 2.
- Ultimate.
- Character resource, statuses, and upgrade paths.
- Animation and VFX hooks.
- Camera-safe targeting behavior.

## Attachments

| Weapon Type   | Compatible Slots                     |
| ------------- | ------------------------------------ |
| Assault Rifle | Muzzle, Underbarrel, Sight, Foregrip |
| Machine Gun   | Muzzle, Underbarrel, Sight, Bipod    |
| Rifle         | Muzzle, Underbarrel, Sight, Bipod    |
| Shotgun       | Muzzle, Sight, Latch, Link           |

### Rarity

| Rarity    | Affixes |
| --------- | ------: |
| Common    |       1 |
| Rare      |       2 |
| Epic      |       3 |
| Legendary |       4 |

Initial affixes are Flat ATK, ATK%, Critical Rate, and Critical Damage. Do not add an elemental fifth affix in the first version.

Only compatible attachments can be equipped. One item is allowed per slot. Replacing an occupied slot opens a comparison and allows equip, retain, or salvage for Sardis. Bosses guarantee an attachment above the normal stage floor. Rarity beams and icons must remain readable on sparse maps.

Legendary initially means a strong four-affix roll. Unique legendary effects are deferred.
