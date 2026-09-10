# Technical Architecture

## Locked Stack

- React for application shell, menus, HUD, overlays, and screen flow.
- TypeScript in strict mode.
- Vite for development and production builds.
- Three.js through React Three Fiber for rendering.
- Drei for focused R3F helpers.
- `@react-three/rapier` for character collision, scene queries, and physics.
- Zustand for UI-facing state and application state.
- React Postprocessing for restrained grading and effects.
- Vitest for deterministic unit and simulation tests.
- Playwright Test for committed browser regressions.
- Playwright MCP for interactive inspection and evidence gathering during development.
- ESLint and Prettier for code quality.

## Runtime Boundaries

React must not become the per-frame gameplay simulation. Use a fixed-timestep simulation layer independent of rendering. Rendering reads snapshots/interpolated state; UI receives only deliberate state projections.

Recommended structure:

```text
src/
  app/                 React shell and screen routing
  game/
    core/              clock, world state, commands, seeded RNG
    systems/           movement, combat, skills, enemies, loot, economy
    data/              Dolls, weapons, cards, enemies, stages, bosses
  render/              R3F scene, cameras, models, terrain, VFX
  ui/                  HUD, menus, cards, inventory, pause, results
  platform/            storage, input adapters, diagnostics
tests/                 unit, simulation, and browser tests
public/assets/         runtime-ready assets
assets-source/         local authoring sources; redistribution reviewed separately
docs/                  project documentation
```

## Simulation Requirements

- Fixed update rate with render interpolation.
- Pause freezes gameplay simulation completely.
- Large resume delta is clamped.
- Seeded RNG controls encounters, drops, upgrades, and objective placement.
- Bullets, impacts, damage numbers, enemies, and weather effects use pools where useful.
- Switching cameras cannot recreate or reset the gameplay world.
- No system reads React component state as the authoritative gameplay state.

## MMD Asset Gate

Tololo is the first asset spike. Direct PMX support must prove textures, toon materials, scale, grounding, skeleton control, rifle attachment, locomotion, upper-body aiming, muzzle origin, performance, disposal, and reload safety.

If direct PMX support is unreliable, convert character assets to optimized GLB through Blender. Preserve source assets separately and ship only reviewed runtime assets. MMD compatibility must pass before broad gameplay implementation.

## Performance Direction

- Desktop browser target first.
- Culling and LOD for enemies and distant effects.
- Compressed textures and GLB optimization before production packaging.
- Limit dynamic shadow casters.
- Weather particle budgets vary by quality preset.
- The menu map preview uses a low-cost scene configuration and pauses or reduces activity when the tab is hidden.
