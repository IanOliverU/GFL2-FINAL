# Stages and Bosses

## Stage Order

| Order | Stage          | Visual Identity                                              | Mechanical Identity                                           |
| ----: | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
|     1 | Flat Grassland | Green terrain, bright sky, large clouds, distant silhouettes | Clear tutorial arena and baseline pressure                    |
|     2 | Desert Expanse | Sand, heat, warm haze, blowing dust                          | Periodic sandstorm reduces long-range visibility              |
|     3 | Rain Field     | Wet ground, heavy rain, mist, lightning                      | Storm cues, reduced clarity, possible electrical interactions |
|     4 | Winter Plain   | Snow, cold fog, snowfall, desaturated light                  | Blizzard/cold pressure and final-stage intensity              |

The first release-quality target is the complete Grassland loop. Other stages must not be produced until Grassland passes director review.

## Minimal Map Art Standard

Plain maps are deliberate, not unfinished grayboxes. Every stage requires:

- Terrain material with correct tiling, normal response, and procedural variation.
- Sky, directional light, fog, grading, horizon treatment, weather, and ambience.
- Clear spawn space, traversal bounds, and objective placement validation.
- Pedestal, extraction device, pickup markers, enemy spawns, attacks, and telegraphs.
- Gentle elevation only when it supports navigation and sightlines.

Buildings, dense props, architectural kits, and large decorative populations are excluded initially.

## Objective Loop

The activation pedestal spawns at a seeded random valid location with minimum distance from the player start and safe distance from bounds/hazards. Discovery uses a restrained vertical beam, compass/scanner indication, proximity audio, and stronger particles at close range.

Activation begins a contained boss event. Boss defeat powers the extraction pod. The player can manage loot and Sardis before proceeding.

## Boss Standard

Every boss requires:

- Clearly readable telegraphs in both cameras.
- At least two phases.
- A targetable weak point or destructible component.
- A break/stagger window that rewards correct play.
- A stage-related rule or escalation.
- Fair recovery windows and consistent damage timing.
- A meaningful guaranteed reward.

Example pattern: break armor, expose a core for bonus damage, force an attack-pattern change, then intensify the stage weather in the final phase.

Bosses cannot pass acceptance by being ordinary enemies with increased scale and health.

## Varjager Threat Roster (M2 Authoritative Hierarchy)

Player-facing names use the middle dot consistently. Original reference filenames on disk (which use `ㆍ`) are preserved unchanged.

| Threat level | Enemy                  | Status                                                    |
| -----------: | ---------------------- | --------------------------------------------------------- |
|            1 | Felagi · Medisin       | Not implemented; intended next after Lade review          |
|            2 | Felagi · Lade          | M2 vertical slice (provisional behavior and proxy)        |
|            3 | Felagi · Kaste         | Not implemented                                           |
|            3 | Felagi · Snikskytter   | Not implemented                                           |
|            4 | Felagi · Hagle         | Not implemented                                           |
|            4 | Felagi · Defensiv      | Not implemented                                           |
|            5 | Berserker — stage boss | Reserved for the boss milestone; classification unchanged |

This hierarchy defines encounter escalation and relative threat only; it does not require every enemy to be implemented immediately. Felagi · Lade is implemented first because Medisin (Threat Level 1) is a support/medical enemy whose behavior cannot be evaluated without another active Varjager to support. Threat Level 2 placement for Lade may be documented now; broad encounter rebalance stays deferred until Lade passes director review, and Threat Levels 3–5 must not enter normal Grassland progression in this milestone.

Reference directory (visual references only, never runtime textures or sprites): `assets-source/GFL2 Enemies References/` — seven WebP files (`Berserker.webp`, `FelagiㆍDefensiv.webp`, `FelagiㆍHagle.webp`, `FelagiㆍKaste.webp`, `FelagiㆍLade.webp`, `FelagiㆍMedisin.webp`, `FelagiㆍSnikskytter.webp`), local-only and commit-excluded unless redistribution is explicitly authorized. See `docs/ASSET_MANIFEST.md` for the read-only audit.
