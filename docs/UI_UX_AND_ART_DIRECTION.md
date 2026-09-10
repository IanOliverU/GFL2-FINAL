# UI, UX, and Art Direction

## Main Menu — Rotating Map Showcase

The main menu follows the successful direction of the previous Risk of Rain 2-inspired prototype: the selected stage is visible as a live 3D scene behind the interface and rotates slowly for continuous environmental preview.

Required behavior:

- Default preview is Flat Grassland.
- Camera orbits the stage center slowly and continuously.
- The preview shows final terrain, sky, fog, weather, lighting, pedestal, extraction silhouette, and a few representative landmarks/effects.
- No combat simulation, enemy AI, damage, drops, or progression runs in the menu.
- Menu preview and gameplay may share stage configuration but use separate runtime instances.
- Rotation pauses/reduces when the tab is hidden, a modal takes focus, or reduced motion is enabled.
- Selecting a stage changes the preview with a short fade rather than rebuilding the entire application.
- The menu remains usable if the preview fails; show a static fallback image or gradient.
- Main actions: Start Run, Doll Selection, Loadout/Archive placeholder, Settings, Credits, Exit/return behavior appropriate to browser.
- Stage selection is locked to progression rules when those rules exist.

## Composition

- UI occupies a controlled left or right rail, leaving the rotating environment visible.
- Primary action uses the signature orange accent.
- Thin technical lines, clipped corners, small labels, and restrained motion evoke a tactical interface.
- Avoid oversized generic glass cards and excessive neon glow.
- Character portrait art can appear in selection/results screens, but the main menu's visual hero is the rotating map.

## GFL2-Derived Production Palette

No public Sunborn brand manual with authoritative hex values was identified. These tokens are a controlled production approximation derived from official GFL2 UI/key-art cues and must be centralized for later correction from licensed/official source assets.

| Token           | Hex       | Use                                     |
| --------------- | --------- | --------------------------------------- |
| `ink-950`       | `#11100F` | Deep background and modal scrim         |
| `ink-900`       | `#1C1A18` | Primary panels                          |
| `graphite-800`  | `#2A2723` | Secondary surfaces                      |
| `graphite-700`  | `#3B3731` | Borders and disabled controls           |
| `sand-200`      | `#D8CDBD` | Secondary text and quiet icons          |
| `ivory-100`     | `#F2EEE6` | Primary text and high-contrast marks    |
| `signal-orange` | `#F05A28` | Primary actions, active state, progress |
| `ember-orange`  | `#FF7A32` | Hover, bloom core, high-energy accent   |
| `warning-red`   | `#C93B2F` | Damage, danger, destructive actions     |
| `amber-gold`    | `#D9A441` | Sardis, rewards, legendary accents      |
| `hydro-cyan`    | `#55B9C6` | Hydro/status-specific accents only      |
| `success-green` | `#7E9B63` | Confirmed/safe state                    |

Suggested CSS variables:

```css
:root {
  --gfl-ink-950: #11100f;
  --gfl-ink-900: #1c1a18;
  --gfl-graphite-800: #2a2723;
  --gfl-graphite-700: #3b3731;
  --gfl-sand-200: #d8cdbd;
  --gfl-ivory-100: #f2eee6;
  --gfl-signal-orange: #f05a28;
  --gfl-ember-orange: #ff7a32;
  --gfl-warning-red: #c93b2f;
  --gfl-amber-gold: #d9a441;
  --gfl-hydro-cyan: #55b9c6;
  --gfl-success-green: #7e9b63;
}
```

Orange is an accent, not a page background. Most screens should remain charcoal, graphite, ivory, and muted sand, with orange reserved for interaction and hierarchy.

## Stage Palettes

- Grassland: muted natural green, pale blue, warm cloud white, charcoal UI, orange objectives.
- Desert: ochre sand, rust shadow, dusty gray, hot orange highlights.
- Rain: blue-gray, wet graphite, cold white lightning, controlled cyan reflections.
- Winter: desaturated blue-white, dark steel, warm orange objective contrast.

## Typography and Motion

- Use a condensed technical display face only for headings/numerals; use a highly readable sans-serif for body/UI text.
- All critical text must remain readable at 100% browser scaling.
- Motion should communicate selection, transition, danger, or reward.
- Reduced-motion mode removes orbit drift, parallax, aggressive card movement, and nonessential pulses.

## Accessibility

- Do not encode rarity or status using color alone; pair color with icons/labels.
- Preserve visible keyboard focus.
- Support UI scale and reduced motion.
- Maintain contrast over every rotating-map camera angle using scrims or adaptive backing surfaces.
