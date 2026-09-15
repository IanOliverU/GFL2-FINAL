import { describe, expect, it } from 'vitest';
import app from '../../src/app/App.tsx?raw';
import laser from '../../src/render/LaserSightPreview.tsx?raw';
import laserState from '../../src/render/laserPreviewState.ts?raw';
import combat from '../../src/render/effects/CombatEffects.tsx?raw';
import scene from '../../src/render/scene/GameScene.tsx?raw';
import aiming from '../../src/game/core/aiming.ts?raw';
import sim from '../../src/game/core/simulation.ts?raw';
import enemies from '../../src/render/actors/Enemies.tsx?raw';
import lade from '../../src/render/actors/LadeEnemy.tsx?raw';
import hud from '../../src/ui/hud/GameplayHUD.tsx?raw';

describe('AD0 aiming presentation', () => {
  it('grey aiming line absent from normal third-person scene', () => {
    expect(scene).not.toContain('<AimRead');
    expect(scene).not.toContain('function AimRead');
    expect(scene).not.toContain('#f3d3a3');
    expect(scene).not.toContain('planeGeometry args={[0.035, 9]}');
  });

  it('white endpoint circle absent from normal gameplay', () => {
    expect(scene).not.toContain('ringGeometry args={[0.26, 0.38, 24]}');
    expect(scene).not.toContain('color="#f2eee6" transparent opacity={0.74}');
  });

  it('crosshair remains present and camera-aware', () => {
    expect(hud).toContain('gfl-crosshair');
    expect(hud).toContain('is-top-down');
  });

  it('authoritative aiming contract untouched by presentation removal', () => {
    expect(aiming).toContain('export function resolveAimPoint');
    expect(aiming).toContain('export function segmentCapsuleHit');
    expect(sim).toContain('resolveAimPoint(');
    expect(sim).toContain('this.liveSphereTargets()');
  });

  it('enemy and ability telegraphs remain present', () => {
    expect(enemies).toContain('ringGeometry');
    expect(lade).toContain('ringGeometry');
    expect(combat).toContain('ringGeometry');
  });

  it('aim debug remains development-gated and rendered only with snapshot', () => {
    expect(app).toContain(`get('aimDebug') === '1'`);
    expect(app).toContain('import.meta.env.DEV');
    expect(scene).toContain('snapshot.aimDebug !== null');
  });

  it('laser preview is development-only, muzzle-originated, and gameplay-neutral', () => {
    expect(laserState).toContain('import.meta.env.DEV');
    expect(laserState).toContain(`get('laserPreview') === '1'`);
    expect(laserState).toContain('LASER-SIGHT VISUAL PREVIEW');
    expect(laser).toContain('view.player.muzzle');
    expect(laser).toContain('resolveAimPoint(');
    expect(laser).toContain('Gameplay effect: none');
    expect(laser).toContain('laserPreviewState');
    expect(laser).not.toContain('damageEnemy');
    expect(laser).not.toContain('damageBoss');
    expect(app).toContain('LASER_PREVIEW_LABEL');
    expect(app).toContain('laser-preview-banner');
  });
});
