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
