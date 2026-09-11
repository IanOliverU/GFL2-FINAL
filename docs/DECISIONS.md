# Decision Log

## Locked

- Platform: desktop browser first.
- Genre: solo action roguelite.
- Presentation: switchable third-person and elevated top-down cameras.
- Stack: React, strict TypeScript, Vite, Three.js/R3F, Rapier, Zustand, Vitest, Playwright.
- Foundation: clean implementation rather than extending the Babylon.js one-shot prototype.
- First Doll/asset proof: Tololo.
- First full content target: Flat Grassland vertical slice.
- Menu: live rotating selected-map preview, with reduced-motion/static fallback.
- Run start: signature weapon and passive only.
- Core skills: guaranteed as level-up choices at Levels 2, 3, and 4.
- Attachment rarities: Common/Rare/Epic/Legendary with one through four affixes.
- Initial affixes: Flat ATK, ATK%, Critical Rate, Critical Damage.
- Sardis: run-scoped currency spent after bosses.
- Stage order: Grassland, Desert, Rain, Winter.
- Environment approach: intentional minimal maps before structures and dense props.
- Acceptance: director-gated; no automatic commit, push, or deployment.

## M0 Tololo Integration (2026-09-11, Technical, Not Director Acceptance)

- Direct PMX via `three-stdlib@2.36.1` because Three.js 0.186.0 no longer ships `MMDLoader`; Blender fallback was unnecessary.
- Local-only `/__local-mmd/` Vite/preview middleware; original sources are never copied into tracked runtime paths or committed.
- Presentation-only procedural animation over exact MMD controls with rest-pose restore; weighted `D` leg chains are driven directly; arms use a bounded two-bone CCD solve toward calibrated temporary-rifle grip targets.
- Simulation authority is unchanged except one observational `sprinting` flag; render projection additionally forwards `tick`, `dodgeRemaining`, and `recoil`.
- Temporary AK-Alfa remains procedural and pivots on the authoritative simulation muzzle; muzzle error is 0 m, grip errors are ~0.089 m (left) and ~0.063 m (right) in idle.
- Death locks the procedural controller until retry and releases arm IK; pause freezes phase after React commits the paused snapshot.
- Redistribution permission remains unverified; all supplied assets are local-only and provisional.

## M0.1 Tololo Visual and Animation Correction (2026-09-11, Technical, Not Director Acceptance)

- Deep PMX audit found no usable embedded AK-Alfa: no weapon-like material among the 21, no weapon-like bone among the 409, no display frames, no animation files. The hip prop is clothing-geometry, not a rifle. Direct-PMX route is therefore kept with a procedural proxy; no GLB conversion.
- Rifle proxy: restrained ~0.78 m low-poly AK-Alfa silhouette (gunmetal/polymer, labeled temporary), muzzle tip at the authoritative simulation muzzle, stock landing near the shoulder. Grip errors improved from ~0.089/0.063 m to ~0.031 m support and ~0.009 m dominant, inside the 0.04/0.03 m targets. IK now runs 6 iterations at 0.45 step with mild rest-relative wrist settle; shoulders stay protected.
- Locomotion damped modestly (sway 0.055 to 0.045, bob 0.09 to 0.075, leg swing 0.74 to 0.68). Foot sliding and authored-quality motion remain unclaimed limitations.
- Materials: attenuated additive sphere-map sheen (`envMapIntensity` 0.4 on Add-combine toon materials only); albedo, lighting, tone mapping, and exposure untouched. Residual paleness is bright-sun-on-light-albedo plus loader-detected transparency on hair/lashes/socks, documented as approximation.
- Normal gameplay shows no diagnostic geometry: skeleton/collider/ring/muzzle helpers are gated behind `?modelDebug=1` (verified count 0 in normal mode); dodge invulnerability now reads as a flat cyan ground ring instead of a wireframe capsule.
- Mobile third-person: aspect-gated portrait offset `(0.9, 2.1, -4.6)`, target height 1.25 to 1.0 m, FOV 56 to 60; desktop and top-down paths are byte-equivalent in behavior. Player NDC on a 390x844 viewport is ~(0.50, -0.53) idle and ~(0.46, -0.49) walking. Residual: lower legs can sit behind the bottom-right weapon panel.
- Berserker reference: `250px-Berserker_S.png` recorded as official-game boss reference, local-only, unverified permission; no Varjager model exists in the supplied package, so nothing further to preserve.
- Simulation authority unchanged: no gameplay, balance, progression, economy, boss, or extraction edits in M0.1.

## Pending Director Decision

- Final project/repository name.
- Keep jump or use sprint/dodge only.
- Exact real-time skill behavior and values after character information is reviewed.
- Confirmed Varjager model-to-role and model-to-stage assignments.
- Final run duration; current planning target is approximately 25–35 minutes.
- End after Stage 4 or offer a later endless/looping mode.
- Final font licenses and runtime asset redistribution permissions.

## Palette Status

The color tokens are derived approximations based on official GFL2 visual material, not values from a published brand standard. Keep them centralized and label them as project tokens until authoritative source values are available.
