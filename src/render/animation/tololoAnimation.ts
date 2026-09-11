import * as THREE from 'three';
import {
  applyTololoBoneOffset,
  restoreTololoRestPose,
  type TololoBoneMap,
  type TololoRestPose,
} from './tololoRig';

export type TololoLocomotionDirection =
  | 'idle'
  | 'forward'
  | 'forwardRight'
  | 'right'
  | 'reverseRight'
  | 'reverse'
  | 'reverseLeft'
  | 'left'
  | 'forwardLeft';

export type TololoAnimationState = 'idle' | 'walk' | 'sprint' | 'dodge' | 'reload' | 'death';

export interface TololoAnimationInput {
  velocity: readonly [number, number, number];
  aimYaw: number;
  aimPitch: number;
  sprinting: boolean;
  dodgeRemaining: number;
  reloading: boolean;
  reloadProgress: number;
  recoil: number;
  hitEventId: string | null;
  dead: boolean;
  paused: boolean;
  reducedMotion: boolean;
  cameraMode: 'thirdPerson' | 'topDown';
}

export interface TololoAnimationPose {
  state: TololoAnimationState;
  direction: TololoLocomotionDirection;
  phase: number;
  bodyYaw: number;
  upperAimYaw: number;
  aimPitch: number;
  speed: number;
  stride: number;
  sway: number;
  locomotionBlend: number;
  sprintBlend: number;
  dodgeBlend: number;
  reloadBlend: number;
  recoilBlend: number;
  hitBlend: number;
  deathBlend: number;
  dodgeRight: number;
  dodgeForward: number;
}

const MAX_UPPER_YAW = 0.62;
const MAX_AIM_UP = 0.55;
const MAX_AIM_DOWN = -0.48;
const ZERO_POSE: TololoAnimationPose = {
  state: 'idle',
  direction: 'idle',
  phase: 0,
  bodyYaw: 0,
  upperAimYaw: 0,
  aimPitch: 0,
  speed: 0,
  stride: 0,
  sway: 0,
  locomotionBlend: 0,
  sprintBlend: 0,
  dodgeBlend: 0,
  reloadBlend: 0,
  recoilBlend: 0,
  hitBlend: 0,
  deathBlend: 0,
  dodgeRight: 0,
  dodgeForward: 1,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function approach(current: number, target: number, speed: number, delta: number): number {
  const amount = 1 - Math.exp(-speed * delta);
  return THREE.MathUtils.lerp(current, target, amount);
}

export function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function locomotionDirection(
  velocity: readonly [number, number, number],
  aimYaw: number,
): TololoLocomotionDirection {
  const [velocityX, , velocityZ] = velocity;
  if (Math.hypot(velocityX, velocityZ) < 0.05) return 'idle';
  const forward = velocityX * Math.sin(aimYaw) + velocityZ * Math.cos(aimYaw);
  const right = -velocityX * Math.cos(aimYaw) + velocityZ * Math.sin(aimYaw);
  const sector = Math.round(Math.atan2(right, forward) / (Math.PI / 4));
  const directions: Readonly<Record<number, TololoLocomotionDirection>> = {
    [-4]: 'reverse',
    [-3]: 'reverseLeft',
    [-2]: 'left',
    [-1]: 'forwardLeft',
    [0]: 'forward',
    [1]: 'forwardRight',
    [2]: 'right',
    [3]: 'reverseRight',
    [4]: 'reverse',
  };
  return directions[sector] ?? 'forward';
}

function selectState(
  input: TololoAnimationInput,
  speed: number,
  deathLocked: boolean,
): TololoAnimationState {
  if (deathLocked || input.dead) return 'death';
  if (input.dodgeRemaining > 0) return 'dodge';
  if (input.reloading) return 'reload';
  if (input.sprinting && speed > 0.1) return 'sprint';
  if (speed > 0.1) return 'walk';
  return 'idle';
}

export class TololoAnimationController {
  private pose: TololoAnimationPose = { ...ZERO_POSE };
  private initialized = false;
  private deathLocked = false;
  private lastHitEventId: string | null = null;

  update(input: TololoAnimationInput, delta: number): TololoAnimationPose {
    if (input.paused && !input.dead && !this.deathLocked) return this.pose;

    const safeDelta = clamp(delta, 0, 0.1);
    const speed = Math.hypot(input.velocity[0], input.velocity[2]);
    if (!this.initialized) {
      this.pose.bodyYaw = input.aimYaw;
      this.initialized = true;
    }
    if (input.dead) this.deathLocked = true;

    if (input.hitEventId !== null && input.hitEventId !== this.lastHitEventId) {
      this.lastHitEventId = input.hitEventId;
      this.pose.hitBlend = 1;
    }

    let yawDifference = shortestAngle(input.aimYaw - this.pose.bodyYaw);
    if (Math.abs(yawDifference) > MAX_UPPER_YAW) {
      this.pose.bodyYaw += yawDifference - Math.sign(yawDifference) * MAX_UPPER_YAW;
    }
    yawDifference = shortestAngle(input.aimYaw - this.pose.bodyYaw);
    this.pose.bodyYaw += clamp(yawDifference, -safeDelta * 2.8, safeDelta * 2.8);
    this.pose.bodyYaw = shortestAngle(this.pose.bodyYaw);

    const direction = locomotionDirection(input.velocity, input.aimYaw);
    const state = selectState(input, speed, this.deathLocked);
    const locomotionTarget = state === 'walk' || state === 'sprint' ? 1 : 0;
    const sprintTarget = state === 'sprint' ? 1 : 0;
    const dodgeTarget = state === 'dodge' ? 1 : 0;
    const reloadTarget = state === 'reload' ? 1 : 0;
    const motionScale = input.reducedMotion ? 0.45 : 1;

    if (!input.paused || state === 'death') {
      const cadence = state === 'sprint' ? 11 : 7.2;
      this.pose.phase += safeDelta * cadence * clamp(speed / 4.6, 0.45, 1.5);
      this.pose.locomotionBlend = approach(
        this.pose.locomotionBlend,
        locomotionTarget,
        12,
        safeDelta,
      );
      this.pose.sprintBlend = approach(this.pose.sprintBlend, sprintTarget, 11, safeDelta);
      this.pose.dodgeBlend = approach(this.pose.dodgeBlend, dodgeTarget, 18, safeDelta);
      this.pose.reloadBlend = approach(this.pose.reloadBlend, reloadTarget, 12, safeDelta);
      this.pose.recoilBlend = Math.max(
        clamp(input.recoil, 0, 1),
        approach(this.pose.recoilBlend, 0, 18, safeDelta),
      );
      this.pose.hitBlend = approach(this.pose.hitBlend, 0, 9, safeDelta);
      this.pose.deathBlend = approach(
        this.pose.deathBlend,
        this.deathLocked ? 1 : 0,
        this.deathLocked ? 4.8 : 12,
        safeDelta,
      );
    }

    if (state === 'dodge' && this.pose.state !== 'dodge') {
      const localForward =
        input.velocity[0] * Math.sin(input.aimYaw) + input.velocity[2] * Math.cos(input.aimYaw);
      const localRight =
        -input.velocity[0] * Math.cos(input.aimYaw) + input.velocity[2] * Math.sin(input.aimYaw);
      const length = Math.hypot(localRight, localForward) || 1;
      this.pose.dodgeRight = localRight / length;
      this.pose.dodgeForward = localForward / length;
    }

    const directionalSign = direction.includes('reverse') ? -1 : 1;
    const gaitAmplitude = clamp(speed / 6.7, 0, 1) * this.pose.locomotionBlend * motionScale;
    this.pose.state = state;
    this.pose.direction = direction;
    this.pose.speed = speed;
    this.pose.upperAimYaw = clamp(
      shortestAngle(input.aimYaw - this.pose.bodyYaw),
      -MAX_UPPER_YAW,
      MAX_UPPER_YAW,
    );
    this.pose.aimPitch = clamp(input.aimPitch, MAX_AIM_DOWN, MAX_AIM_UP);
    this.pose.stride = Math.sin(this.pose.phase) * gaitAmplitude * directionalSign;
    this.pose.sway = Math.cos(this.pose.phase * 0.5) * gaitAmplitude;
    if (input.reloading)
      this.pose.reloadBlend = Math.max(this.pose.reloadBlend, input.reloadProgress);
    return this.pose;
  }

  reset(): void {
    this.pose = { ...ZERO_POSE };
    this.initialized = false;
    this.deathLocked = false;
    this.lastHitEventId = null;
  }
}

export function applyTololoAnimationPose(
  rig: TololoBoneMap,
  rest: TololoRestPose,
  pose: TololoAnimationPose,
): void {
  restoreTololoRestPose(rig, rest);

  const walk = pose.stride;
  const sprint = pose.sprintBlend;
  const bob = Math.abs(Math.sin(pose.phase)) * pose.locomotionBlend * (0.075 + sprint * 0.04);
  const lateral = pose.sway * 0.045;
  const dodge = pose.dodgeBlend;
  const reload = pose.reloadBlend;
  const death = pose.deathBlend;
  const upperYaw = pose.upperAimYaw;
  const pitch = pose.aimPitch;

  applyTololoBoneOffset(rig, rest, 'center', [0, 0, 0], [lateral, -bob - death * 4.8, 0]);
  applyTololoBoneOffset(rig, rest, 'lowerBody', [
    walk * 0.06,
    -upperYaw * 0.12,
    -lateral * 0.8 - dodge * pose.dodgeRight * 0.36 + death * 1.18,
  ]);
  applyTololoBoneOffset(rig, rest, 'upperBody', [
    -pitch * 0.34 - pose.recoilBlend * 0.12 - dodge * pose.dodgeForward * 0.24,
    upperYaw * 0.38,
    lateral * 0.6 + pose.hitBlend * 0.14 - dodge * pose.dodgeRight * 0.24,
  ]);
  applyTololoBoneOffset(rig, rest, 'chest', [
    -pitch * 0.42 - pose.recoilBlend * 0.16,
    upperYaw * 0.4,
    -lateral * 0.35 - pose.hitBlend * 0.08,
  ]);
  applyTololoBoneOffset(rig, rest, 'neck', [-pitch * 0.13, upperYaw * 0.12, -death * 0.12]);
  applyTololoBoneOffset(rig, rest, 'head', [-pitch * 0.11, upperYaw * 0.1, death * 0.22]);
  applyTololoBoneOffset(rig, rest, 'eyes', [-pitch * 0.08, upperYaw * 0.1, 0]);

  applyTololoBoneOffset(rig, rest, 'leftShoulder', [0, 0, -0.03 - reload * 0.04]);
  applyTololoBoneOffset(rig, rest, 'rightShoulder', [0, 0, 0.03 + reload * 0.04]);
  // Mild wrist settle so the solved hands read as gripping; the CCD pass that
  // follows positions the arms, and these rest-relative offsets do not stack.
  applyTololoBoneOffset(rig, rest, 'leftWrist', [-0.08, 0, -0.12]);
  applyTololoBoneOffset(rig, rest, 'rightWrist', [-0.08, 0, 0.12]);

  const leftLeg = walk * (0.68 + sprint * 0.26);
  const rightLeg = -leftLeg;
  applyTololoBoneOffset(rig, rest, 'leftLeg', [
    leftLeg - dodge * pose.dodgeForward * 0.34,
    0,
    dodge * pose.dodgeRight * 0.18,
  ]);
  applyTololoBoneOffset(rig, rest, 'rightLeg', [
    rightLeg + dodge * pose.dodgeForward * 0.28,
    0,
    -dodge * pose.dodgeRight * 0.18,
  ]);
  applyTololoBoneOffset(rig, rest, 'leftKnee', [Math.max(0, -leftLeg) * 0.7 + dodge * 0.72, 0, 0]);
  applyTololoBoneOffset(rig, rest, 'rightKnee', [
    Math.max(0, -rightLeg) * 0.7 + dodge * 0.58,
    0,
    0,
  ]);
  applyTololoBoneOffset(rig, rest, 'leftAnkle', [-Math.max(0, leftLeg) * 0.3, 0, 0]);
  applyTololoBoneOffset(rig, rest, 'rightAnkle', [-Math.max(0, rightLeg) * 0.3, 0, 0]);
  applyTololoBoneOffset(rig, rest, 'leftToe', [Math.max(0, -leftLeg) * 0.18, 0, 0]);
  applyTololoBoneOffset(rig, rest, 'rightToe', [Math.max(0, -rightLeg) * 0.18, 0, 0]);
}
