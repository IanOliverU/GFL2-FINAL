import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  applyTololoAnimationPose,
  locomotionDirection,
  shortestAngle,
  TololoAnimationController,
  type TololoAnimationInput,
} from '../../src/render/animation/tololoAnimation';
import {
  applyTololoBoneOffset,
  captureTololoRestPose,
  resolveTololoRig,
  solveTololoArmGrip,
} from '../../src/render/animation/tololoRig';
import { disposeTololoModel } from '../../src/render/assets/tololoModel';

function input(overrides: Partial<TololoAnimationInput> = {}): TololoAnimationInput {
  return {
    velocity: [0, 0, 0],
    aimYaw: 0,
    aimPitch: 0,
    sprinting: false,
    dodgeRemaining: 0,
    reloading: false,
    reloadProgress: 0,
    recoil: 0,
    hitEventId: null,
    dead: false,
    paused: false,
    reducedMotion: false,
    cameraMode: 'thirdPerson',
    ...overrides,
  };
}

describe('Tololo rig mapping', () => {
  it('resolves exact MMD controls, deformation legs, and safe missing fallbacks', () => {
    const names = ['全ての親', 'センター', '上半身', '上半身2', '左足D', '右足D', '右ダミー'];
    const bones = names.map((name) => {
      const bone = new THREE.Bone();
      bone.name = name;
      return bone;
    });
    const result = resolveTololoRig(bones);
    expect(result.resolvedNames.root).toBe('全ての親');
    expect(result.resolvedNames.chest).toBe('上半身2');
    expect(result.resolvedNames.leftLeg).toBe('左足D');
    expect(result.resolvedNames.rightGrip).toBe('右ダミー');
    expect(result.missing).toContain('head');
  });

  it('applies every pose relative to the captured rest transform', () => {
    const bone = new THREE.Bone();
    bone.name = '上半身';
    bone.position.set(1, 2, 3);
    bone.rotation.set(0.1, 0.2, 0.3);
    const rig = resolveTololoRig([bone]).bones;
    const rest = captureTololoRestPose(rig);
    applyTololoBoneOffset(rig, rest, 'upperBody', [0.4, 0, 0], [0, 1, 0]);
    const first = bone.quaternion.clone();
    applyTololoBoneOffset(rig, rest, 'upperBody', [0.4, 0, 0], [0, 1, 0]);
    expect(bone.quaternion.angleTo(first)).toBeLessThan(1e-7);
    expect(bone.position.toArray()).toEqual([1, 3, 3]);
  });

  it('moves a complete arm chain toward a weapon grip target', () => {
    const arm = new THREE.Bone();
    arm.name = '左腕';
    const elbow = new THREE.Bone();
    elbow.name = '左ひじ';
    elbow.position.set(1, 0, 0);
    const grip = new THREE.Bone();
    grip.name = '左ダミー';
    grip.position.set(1, 0, 0);
    arm.add(elbow);
    elbow.add(grip);
    arm.updateMatrixWorld(true);
    const target = new THREE.Vector3(0.5, -1.5, 0);
    const before = grip.getWorldPosition(new THREE.Vector3()).distanceTo(target);
    const rig = resolveTololoRig([arm, elbow, grip]).bones;
    expect(solveTololoArmGrip(rig, 'left', target, 8)).toBe(true);
    const after = grip.getWorldPosition(new THREE.Vector3()).distanceTo(target);
    expect(after).toBeLessThan(before * 0.25);
  });
});

describe('Tololo procedural animation', () => {
  it('classifies locomotion relative to aim direction', () => {
    expect(locomotionDirection([0, 0, 4], 0)).toBe('forward');
    expect(locomotionDirection([4, 0, 0], 0)).toBe('right');
    expect(locomotionDirection([0, 0, -4], 0)).toBe('reverse');
    expect(locomotionDirection([-4, 0, 4], 0)).toBe('forwardLeft');
  });

  it('selects idle, walk, sprint, reload, and dodge in priority order', () => {
    const controller = new TololoAnimationController();
    expect(controller.update(input(), 1 / 60).state).toBe('idle');
    expect(controller.update(input({ velocity: [0, 0, 4] }), 1 / 60).state).toBe('walk');
    expect(controller.update(input({ velocity: [0, 0, 6], sprinting: true }), 1 / 60).state).toBe(
      'sprint',
    );
    expect(
      controller.update(input({ velocity: [0, 0, 6], sprinting: true, reloading: true }), 1 / 60)
        .state,
    ).toBe('reload');
    expect(controller.update(input({ reloading: true, dodgeRemaining: 0.1 }), 1 / 60).state).toBe(
      'dodge',
    );
  });

  it('clamps aim, recovers recoil, consumes hit events once, and blends reload progress', () => {
    const controller = new TololoAnimationController();
    const active = controller.update(
      input({
        aimYaw: Math.PI,
        aimPitch: 2,
        recoil: 1,
        hitEventId: 'hit-1',
        reloading: true,
        reloadProgress: 0.7,
      }),
      1 / 60,
    );
    expect(Math.abs(active.upperAimYaw)).toBeLessThanOrEqual(0.62);
    expect(active.aimPitch).toBe(0.55);
    expect(active.recoilBlend).toBe(1);
    expect(active.hitBlend).toBeGreaterThan(0.8);
    expect(active.reloadBlend).toBeGreaterThanOrEqual(0.7);
    const activeHitBlend = active.hitBlend;
    const recovered = controller.update(input({ hitEventId: 'hit-1' }), 0.1);
    expect(recovered.recoilBlend).toBeLessThan(1);
    expect(recovered.hitBlend).toBeLessThan(activeHitBlend);
  });

  it('captures dodge direction for the full dodge lifecycle', () => {
    const controller = new TololoAnimationController();
    const dodge = controller.update(input({ velocity: [12, 0, 0], dodgeRemaining: 0.2 }), 1 / 60);
    expect(dodge.state).toBe('dodge');
    expect(dodge.dodgeRight).toBeCloseTo(1);
    const continued = controller.update(
      input({ velocity: [0, 0, 12], dodgeRemaining: 0.05 }),
      1 / 60,
    );
    expect(continued.dodgeRight).toBeCloseTo(1);
  });

  it('freezes on pause, preserves phase across camera changes, and resets on retry', () => {
    const controller = new TololoAnimationController();
    const moving = controller.update(input({ velocity: [0, 0, 4] }), 0.1);
    const phase = moving.phase;
    const frozen = controller.update(input({ velocity: [0, 0, 4], paused: true }), 0.1);
    expect(frozen.phase).toBe(phase);
    const switched = controller.update(input({ velocity: [0, 0, 4], cameraMode: 'topDown' }), 0.1);
    expect(switched.phase).toBeGreaterThan(phase);
    controller.reset();
    const reset = controller.update(input({ aimYaw: 1 }), 0);
    expect(reset.state).toBe('idle');
    expect(reset.phase).toBe(0);
    expect(shortestAngle(reset.bodyYaw - 1)).toBeCloseTo(0);
  });

  it('locks death until an explicit reset and settles while the simulation is death-paused', () => {
    const controller = new TololoAnimationController();
    const dead = controller.update(input({ dead: true, paused: true }), 0.1);
    expect(dead.state).toBe('death');
    expect(dead.deathBlend).toBeGreaterThan(0);
    expect(controller.update(input(), 0.1).state).toBe('death');
    controller.reset();
    expect(controller.update(input(), 0.1).state).toBe('idle');
  });

  it('restores the rig before applying each complete pose', () => {
    const center = new THREE.Bone();
    center.name = 'センター';
    const upper = new THREE.Bone();
    upper.name = '上半身';
    const result = resolveTololoRig([center, upper]);
    const rest = captureTololoRestPose(result.bones);
    const controller = new TololoAnimationController();
    const pose = controller.update(input({ velocity: [0, 0, 4] }), 0.1);
    applyTololoAnimationPose(result.bones, rest, pose);
    const first = upper.quaternion.clone();
    applyTololoAnimationPose(result.bones, rest, pose);
    expect(upper.quaternion.angleTo(first)).toBeLessThan(1e-8);
  });
});

describe('Tololo model resources', () => {
  it('disposes geometry, materials, textures, and skeleton data', () => {
    const geometry = new THREE.BufferGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const bone = new THREE.Bone();
    const skeleton = new THREE.Skeleton([bone]);
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.bind(skeleton);
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const skeletonDispose = vi.spyOn(skeleton, 'dispose');

    disposeTololoModel(mesh);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(skeletonDispose).toHaveBeenCalledOnce();
  });
});
