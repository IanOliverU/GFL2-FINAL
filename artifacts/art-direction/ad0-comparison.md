# AD0 — Rendering Direction Comparison (Prototype, No Decision Recorded)

No final art direction has been selected. Ian chooses. The table below is advisory only.

Study controls: identical Tololo model/pose, Lade proxy/pose, scales, positions
(Tololo `[0,0,0]`, Lade `[1.8,0,6]`), 30x30 m ground section, shared cameras,
focal lengths, light directions, animation/telegraph/muzzle/impact timing,
1280x720 output. Only the rendering treatment changes. Lade visuals remain a
temporary placeholder; Lade gameplay acceptance is separate.

## Side-by-side scores (1–5, higher is better; complexity/cost/risk scored as ease)

| Criterion                                | CEL-SHADED 3D | PIXEL-STYLED 3D | 2D/2.5D PIXEL |
| ---------------------------------------- | ------------: | --------------: | ------------: |
| Tololo recognizability                   |             4 |               3 |             2 |
| Lade silhouette readability              |             4 |               3 |             2 |
| Outfit/equipment readability             |             4 |               3 |             2 |
| Third-person compatibility               |             5 |               4 |             2 |
| ADS compatibility                        |             5 |               4 |             2 |
| Top-down compatibility                   |             4 |               4 |             3 |
| Animation quality                        |             4 |               4 |             2 |
| Environment cohesion                     |             4 |               4 |             3 |
| Combat readability                       |             4 |               4 |             3 |
| Crosshair readability                    |             5 |               5 |             5 |
| Effect readability                       |             4 |               4 |             3 |
| Camera-rotation stability                |             5 |               5 |             1 |
| Browser performance                      |             3 |               3 |             5 |
| Memory use                               |             3 |               3 |             5 |
| Draw-call cost                           |             3 |               3 |             5 |
| Production complexity (ease)             |             3 |               3 |             2 |
| AI/MCP feasibility                       |             4 |               4 |             2 |
| Manual Blender work (less = higher)      |             3 |               4 |             2 |
| Six-Doll scalability                     |             3 |               4 |             2 |
| Enemy-roster scalability                 |             3 |               4 |             2 |
| Boss support                             |             4 |               4 |             2 |
| Multi-environment support                |             4 |               4 |             3 |
| Visual-consistency risk (safer = higher) |             3 |               4 |             2 |
| Iteration cost (cheaper = higher)        |             3 |               4 |             2 |

## Performance (study scene, dev server)

First profiling pass (earlier run, uncapped frame times, real GPU variance):

| Mode    | Viewport         | Avg FPS | P95 frame | Draw calls |   Tris | Textures |     Load |
| ------- | ---------------- | ------: | --------: | ---------: | -----: | -------: | -------: |
| cel3d   | desktop 1280x720 |    73.4 |   12.1 ms |        151 | 83,754 |       16 | 1,756 ms |
| cel3d   | narrow 390x664   |   164.9 |    6.5 ms |        135 | 83,550 |       16 | 3,327 ms |
| pixel3d | desktop          |   104.0 |   23.6 ms |        149 | 83,754 |       16 | 1,965 ms |
| pixel3d | narrow           |   147.0 |   12.2 ms |        134 | 83,550 |       16 | 3,951 ms |
| pixel2d | desktop          |   161.3 |    7.0 ms |         30 |    434 |        3 | 2,390 ms |
| pixel2d | narrow           |   165.7 |    6.2 ms |         15 |    230 |        3 | 2,896 ms |

Second profiling pass (2026-09-15 verification, same machine/browser as the
Playwright matrix, `profile-ad0.mjs` with 1% lows and spike forensics).
This environment vsync-caps rAF at ~6.2 ms, so GPU-cost differences between
modes are not measurable here; every profile reports the compositor cadence,
which is itself evidence that no mode blows the frame budget in this scene:

| Mode    | Viewport | Avg FPS | P95   | P99   | 1% low FPS | 1% low ms | Warmup | Steady | Steady P95 | Spikes >=25ms | Worst | Load   |
| ------- | -------- | ------: | ----- | ----- | ---------: | --------: | -----: | -----: | ---------: | ------------: | ----: | ------ |
| cel3d   | desktop  |   165.4 | 6.2ms | 6.2ms |      161.3 |      6.20 | 5.96ms | 6.06ms |      6.2ms |             0 | 6.2ms | 2642ms |
| cel3d   | narrow   |   165.3 | 6.2ms | 6.2ms |      161.3 |      6.20 | 5.99ms | 6.06ms |      6.2ms |             0 | 6.2ms | 1474ms |
| pixel3d | desktop  |   165.3 | 6.2ms | 6.2ms |      160.0 |      6.25 | 5.98ms | 6.06ms |      6.2ms |             0 | 6.3ms | 1999ms |
| pixel3d | narrow   |   165.3 | 6.2ms | 6.2ms |      161.3 |      6.20 | 5.98ms | 6.06ms |      6.2ms |             0 | 6.2ms | 1443ms |
| pixel2d | desktop  |   165.4 | 6.2ms | 6.2ms |      161.3 |      6.20 | 5.94ms | 6.06ms |      6.2ms |             0 | 6.2ms | 1033ms |
| pixel2d | narrow   |   165.2 | 6.2ms | 6.2ms |      161.3 |      6.20 | 6.01ms | 6.06ms |      6.2ms |             0 | 6.2ms | 1046ms |

Raw data: `ad0-profile.json` (now includes `low1FrameMs`/`low1Fps`,
`warmupAverageMs`, `steadyAverageMs`, `steadyP95Ms`, `spikeCount`,
`spikeIndices`, `worstFrameMs` on every report).

Pixel3d desktop p95 23.6 ms explanation (first pass): not a systematic
pixel3d rendering cost. Forensics across six focused 600-frame reps
(3x pixel3d, 3x cel3d, desktop 1280x720): warmup average equals steady
average in every rep (5.94-6.12 ms vs 6.06-6.36 ms), which rules out shader
compilation (also excluded by the 1200 ms settle wait); viewport and DPR are
fixed for the whole sample, which rules out render-target resizing; the
sampling harness is byte-identical across modes and cel3d reps stayed clean,
which rules out capture instrumentation as a systematic cause. Observed
spikes are rare isolated single frames (pixel3d: one ~72.9 ms frame at sample
117 in one rep, one ~72.7 ms frame at sample 369 in another, zero in the
remaining reps including the profile pass above; cel3d: none above 12.1 ms),
i.e. occasional GC/compositor hitches, not recurring runtime stutter
(steady-state p95 is 6.2 ms in all six reps). The first-pass pixel3d desktop
run also carried the highest JS heap of any profile (used 291 MB vs 83-260 MB
elsewhere), so GC pressure is the leading candidate for that run's elevated
p95/p99 (23.6/33.8 ms at 9.6 ms average). No pixel3d code change is indicated;
GPU-cost ranking must come from an uncapped environment, not this one.

Pixel2d scoping note: treat pixel2d strictly as a pipeline-feasibility
sample, not finished pixel artwork. Its sprites are code-generated
placeholders (4 directions x 2 frames per actor; rotation popping is
expected and labeled in-app), its draw-call/triangle counts prove only that
a billboard path runs, and its scores above rate prototype readability, not
shippable art quality. No art decision may read pixel2d numbers as a claim
about finished pixel art.

All modes: 1 render target, zero console/resource errors. Load includes PMX
pipeline + shader compile in 3D modes. Texture memory is not exposed by the
harness. Target is 60 FPS minimum; all modes clear it in the study scene.

## Production complexity and manual work

- **Cel3d**: toon treatment per material, restrained outlines on hero/prop
  edges, rim tuning per Doll. Reuses the existing PMX pipeline and procedural
  animation. Moderate per-Doll art review; no new pipeline.
- **Pixel3d**: everything cel3d keeps, plus a controlled pixelation/quantization
  pass. Slightly less manual material work (the filter carries the style), one
  extra presentation path to maintain and test for readability.
- **Pixel2d**: cheapest at runtime, most expensive to produce: 4+ directions x
  idle/move/attack/hit/death frames for 6 Dolls, the Varjager roster, and
  bosses, plus a real render-to-sprite pipeline this prototype does not prove.
  The prototype sprites are code-generated placeholders.

## AI/MCP feasibility

- Cel3d/pixel3d: high — procedural materials, lighting rigs, and post-style
  passes are code-owned and regenerable.
- Pixel2d: low — sprite-frame consistency across directions, actions, outfits,
  and bosses resists piecemeal generation; manual cleanup dominates.

## Six-Doll and full-roster scalability

- Cel3d: linear per-Doll material/rig review; roster reuses the same treatment.
- Pixel3d: same as cel3d with one shared filter; cheapest consistent style.
- Pixel2d: multiplicative frame burden per character, enemy, boss, and
  environment-facing set; rotation popping must be solved, not hidden.

## Known weaknesses (honest)

- Cel3d: highest GPU cost of the three; outline/rim tuning needed per Doll;
  back views are hair-dominated on Tololo (accurate, but plain).
- Pixel3d: small readability loss at distance; filter must be policed so
  telegraphs and faces never turn to mush.
- Pixel2d: directional popping on any camera rotation; ADS is a zoomed
  billboard, not true aiming depth; prototype sprites are not shippable art;
  occlusion/depth cues are weaker in crowds.

## Agent recommendation (recommendation only, not a decision)

**Cel-shaded 3D.** It best serves polished combat, six distinct Dolls, and the
full enemy/boss/extraction loop with the lowest production risk, keeping real
models, animation, telegraphs, and camera behavior intact. Pixel-styled 3D is a
close second if Ian wants a stronger style read or cheaper GPU cost. 2D/2.5D
pixel is not advised for a primarily third-person game.

## Questions Ian should consider

1. Readable character detail (cel3d) or stronger stylized filter (pixel3d) at
   gameplay distance?
2. Is a 60 FPS floor acceptable, or must the minimum be higher on your laptop?
3. Should a future style pass also cover UI/HUD, or 3D rendering only?
4. Are billboard popping artifacts ever acceptable in third-person?
5. Which Doll should prove six-Doll scalability once the direction is chosen?

## Evidence

- Contact sheets: `ad0-third-person-comparison.png`, `ad0-ads-comparison.png`,
  `ad0-top-down-comparison.png`, `ad0-silhouette-comparison.png`
- 36 matching screenshots: `artifacts/screenshots/ad0-<mode>-<view>.png`
- Normal-game proof: `ad0-normal-no-guide.png`; laser preview: `ad0-laser-preview.png`
- Videos: `ad0-cel3d.webm`, `ad0-pixel3d.webm`, `ad0-pixel2d.webm`
- Data: `ad0-comparison.json`, `ad0-profile.json`, `ad0-capture.json`
