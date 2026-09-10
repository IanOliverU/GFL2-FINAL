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
