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

### Authoritative Shot Contract (M2.2 Aiming Correction)

1. The presented crosshair or top-down cursor defines a ray from the finalized render camera. Input forwards only that ray geometry; it never selects a target or applies damage.
2. The fixed-step simulation resolves the closest live enemy capsule, boss body, or world obstruction along the ray, with a safe range fallback. The closest entry orders the collision; target convergence advances one radius inside the selected volume so the existing spread remains symmetric instead of making the near tangent surface one-sided.
3. Every projectile begins at Tololo's authoritative muzzle and travels from that muzzle toward the resolved aim point. It is never fired parallel to the shoulder-camera ray.
4. Every fixed step sweeps the projectile from its previous position to its range-clamped next position. Enemy, boss, ground, pedestal, and extraction-device candidates compete by segment entry fraction; the closest valid collision wins, and cover wins ties.
5. A projectile deactivates after its first confirmed enemy, boss, or world collision. Final-range collision resolves before expiry. Dead entities are filtered before collision and cannot be rewarded again.
6. Damage numbers and hit/impact effects are projected only from simulation-confirmed events carrying the authoritative collision position. Rendering and VFX never apply damage.
7. Camera switching, ADS, pause, level-up freeze, and retry do not create separate projectile or health state. ADS retains its existing spread multiplier; all weapon damage, cadence, range, recoil, critical, attachment, mark, armor, and role values remain unchanged.

Enemy firearm hurt volumes are grounded capsules with their existing per-role horizontal radii and silhouette-matched outer heights: melee 1.90 m, flanker 1.85 m, ranged 1.95 m, heavy 2.10 m, elite 2.60 m, and Felagi Lade 1.90 m. Lade's decorative back blade may extend above the damageable body; procedural limb posing stays within the body capsule's readable width. `?aimDebug=1` visualizes the camera ray, resolved aim, muzzle convergence, projectile segment, hurt volumes, closest collision, obstruction, confirmed damage, and projectile/target IDs only on the development server; production builds force it off.

## Felagi · Lade Vertical Slice (M2, Provisional)

Felagi · Lade is the first Varjager behavior slice and remains outside the normal encounter-director roster until director review. Test/evidence hooks may spawn it deterministically; both cameras read the same authoritative entity.

- Role: Threat Level 2 close-range pursuer. It acquires Tololo, respects arena bounds and enemy separation, closes to a 1.9 m attack range, winds up for 0.7 seconds, applies one 13-damage `ladeSlash` on the resolved damage frame, then observes a 1.7-second cooldown/recovery.
- Provisional data: 85 health, 3.1 m/s speed, 0.55 m radius, zero armor, 30 EXP, and a 5-Sardis drop. Pressure scaling remains the existing shared simulation rule. These are testable starting values, not accepted balance.
- Interruptions: a qualifying hit can stagger Lade; Tidal Step freezes an active anticipation while stagger lasts. Dodge invulnerability, Tololo's damage/attachment rules, Hydro marks/projectiles, and Starfall damage remain shared systems rather than Lade-specific exceptions.
- Lifecycle: spawn, pursuit, telegraph, damage, recovery, defeat, one-time rewards, authoritative removal, and disposal counters are deterministic. Rendering adds provisional spawn, anticipation, hit/stagger, and post-removal death-burst feedback but never applies damage.
- Camera parity: switching cameras changes only presentation and aiming input. Lade health, position, cooldown, telegraph, attack timing, damage, rewards, and random outcomes do not change.

## Lade Preview Mode (M2.1, Development-Only)

`?enemyPreview=lade` is a local review tool, not progression. It arms only when the query parameter is present and the runtime is a dev server or the local e2e harness; production builds without the harness always resolve it to null.

- While armed, the real encounter director guarantees a Lade within the first 10 seconds and continues controlled Lade encounters (at most two live preview Lades, 12-second cadence) through seeded placement and the shared combat lifecycle.
- The normal Grassland roster, spawn cadence, and balance are never modified; preview spawns are supplemental and never consume normal slots.
- Movement, shooting, leveling, skills, damage, death, and retry behave exactly as in a normal run; both cameras share the same preview encounter.
- The HUD shows `LADE PREVIEW — NOT NORMAL PROGRESSION.` whenever the snapshot carries the armed mode. Retry clears the mode and re-arms it only if the query parameter is still present.

## Tololo Ability Interaction Rules (M1 Clarification)

Tololo's abilities are instant, self- or aim-relative actions with no cast time:

- Skill 1 (Hydro Barrage), Skill 2 (Tidal Step), and Ultimate (Starfall Recursion) may activate while moving, sprinting, dodging, reloading, or ADS-firing. Dodge and skill edges on the same fixed step both resolve; this simultaneity is the provisional real-time expression of Tololo's extra-action rhythm identity.
- Activation is invalid while the skill is locked, while its cooldown is running, while the run is dead, or while the simulation is paused for any reason (manual, level-up, attachment, death). Firing is additionally blocked while reloading; skills are not.
- Targeting is world-space and camera-independent: projectiles resolve from the authoritative muzzle along the current aim (aim point or yaw/pitch); the Ultimate strikes all live hostiles globally; Skill 2 affects Tololo plus hostiles within 5 m. Switching cameras changes presentation only.
- Cooldowns and buff durations advance only inside fixed simulation steps, so they freeze under pause, level-up selection, and death, and reset exactly on retry.

## Movement and Camera Control Rules (M1.1 Correction)

- Third-person movement is camera-relative: `W` follows the flattened camera forward, `D` follows screen-right (`forward x up`), diagonals are normalized by the simulation. Character facing (aim) stays independent per the existing combat design.
- Mouse is conventional by default: right turns right, up looks up. No invert-camera setting exists, so there is nothing to persist; if one is added later, `Off` must keep this behavior and `On` may only reverse vertical input.
- Top-down movement is screen-relative against the fixed elevated camera (screen-up `+Z`, screen-right `-X`): `W`/`S` move toward the top/bottom of the screen, `A`/`D` toward the left/right. Mouse aiming follows the cursor ground position per quadrant; mouse motion never orbits the top-down camera.
- `V` switches presentation only: position, input state, aim, abilities, cooldowns, projectiles, enemies, and progression persist; held keys immediately follow the new view basis with no latch, reversal, or yaw jump, and switching back restores the third-person orientation.

## Unified Movement Coordinate Convention (M1.1)

- Y-up right-handed world. A camera yaw defines ground forward `(sin yaw, cos yaw)`; screen-right is `forward x up`, i.e. `(-cos yaw, +sin yaw)`.
- Compass: north `-Z` (yaw `PI`), south `+Z` (yaw `0`), east `+X` (yaw `PI/2`), west `-X` (yaw `-PI/2`); diagonals interpolate (north-east `3PI/4`).
- Both cameras share this convention: third-person uses the live yaw, top-down uses the fixed yaw-`0` case (screen-up `+Z`, screen-right `-X`) derived from the render camera offset, never hardcoded per-component signs.
- Locomotion reads yaw only, so camera pitch cannot change movement speed; a zero-length flattened forward falls back to `+Z`; one `resolveMoveVector` utility combines axes, normalizes diagonals, and selects the active camera's basis at call time, so switching replaces the basis immediately with no stale state.

## Sardis Economy

Sardis is run-scoped and lost when the run ends. Sources include enemies, elites, bosses, and salvaged attachments.

At the post-boss extraction terminal, Sardis initially purchases:

- Healing.
- Attachment reward reroll.
- One attachment rarity upgrade at a high cost.
- Level-up reroll token.

Permanent Sardis upgrades and emergency revives are deferred until difficulty is proven.
