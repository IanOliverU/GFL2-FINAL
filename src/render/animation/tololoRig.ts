import * as THREE from 'three';

export const TOLOLO_BONE_ROLES = [
  'root',
  'center',
  'groove',
  'waist',
  'lowerBody',
  'upperBody',
  'chest',
  'neck',
  'head',
  'eyes',
  'leftShoulder',
  'leftArm',
  'leftElbow',
  'leftWrist',
  'leftGrip',
  'rightShoulder',
  'rightArm',
  'rightElbow',
  'rightWrist',
  'rightGrip',
  'leftLeg',
  'leftKnee',
  'leftAnkle',
  'leftToe',
  'rightLeg',
  'rightKnee',
  'rightAnkle',
  'rightToe',
] as const;

export type TololoBoneRole = (typeof TOLOLO_BONE_ROLES)[number];
export type TololoBoneMap = Partial<Record<TololoBoneRole, THREE.Bone>>;

const BONE_ALIASES: Readonly<Record<TololoBoneRole, readonly string[]>> = {
  root: ['全ての親', 'parent', 'root'],
  center: ['センター', 'center'],
  groove: ['グルーブ', 'groove'],
  waist: ['腰', 'waist'],
  lowerBody: ['下半身', 'lower body', 'lowerbody'],
  upperBody: ['上半身', 'upper body', 'upperbody'],
  chest: ['上半身2', 'upper body2', 'upperbody2', 'chest'],
  neck: ['首', 'neck'],
  head: ['頭', 'head'],
  eyes: ['両目', 'eyes'],
  leftShoulder: ['左肩', 'shoulder_l', 'left shoulder'],
  leftArm: ['左腕', 'arm_l', 'left arm'],
  leftElbow: ['左ひじ', 'elbow_l', 'left elbow'],
  leftWrist: ['左手首', 'wrist_l', 'left wrist'],
  leftGrip: ['左ダミー', 'dummy_l', 'left dummy'],
  rightShoulder: ['右肩', 'shoulder_r', 'right shoulder'],
  rightArm: ['右腕', 'arm_r', 'right arm'],
  rightElbow: ['右ひじ', 'elbow_r', 'right elbow'],
  rightWrist: ['右手首', 'wrist_r', 'right wrist'],
  rightGrip: ['右ダミー', 'dummy_r', 'right dummy'],
  leftLeg: ['左足D', 'leg d_l', 'leg_d_l', '左足', 'leg_l', 'left leg'],
  leftKnee: ['左ひざD', 'knee d_l', 'knee_d_l', '左ひざ', 'knee_l', 'left knee'],
  leftAnkle: ['左足首D', 'ankle d_l', 'ankle_d_l', '左足首', 'ankle_l', 'left ankle'],
  leftToe: ['左足先EX', 'toe2_l', '左足首先', 'toe_l', 'left toe'],
  rightLeg: ['右足D', 'leg d_r', 'leg_d_r', '右足', 'leg_r', 'right leg'],
  rightKnee: ['右ひざD', 'knee d_r', 'knee_d_r', '右ひざ', 'knee_r', 'right knee'],
  rightAnkle: ['右足首D', 'ankle d_r', 'ankle_d_r', '右足首', 'ankle_r', 'right ankle'],
  rightToe: ['右足先EX', 'toe2_r', '右足首先', 'toe_r', 'right toe'],
};

export interface TololoRigResolution {
  bones: TololoBoneMap;
  resolvedNames: Partial<Record<TololoBoneRole, string>>;
  missing: readonly TololoBoneRole[];
}

export interface BoneRestTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

export type TololoRestPose = Partial<Record<TololoBoneRole, BoneRestTransform>>;

const OFFSET_QUATERNION = new THREE.Quaternion();
const OFFSET_EULER = new THREE.Euler(0, 0, 0, 'XYZ');
const EFFECTOR_POSITION = new THREE.Vector3();
const LINK_POSITION = new THREE.Vector3();
const CURRENT_DIRECTION = new THREE.Vector3();
const TARGET_DIRECTION = new THREE.Vector3();
const LINK_WORLD_QUATERNION = new THREE.Quaternion();
const PARENT_WORLD_QUATERNION = new THREE.Quaternion();
const DELTA_QUATERNION = new THREE.Quaternion();
const LIMITED_DELTA_QUATERNION = new THREE.Quaternion();
const IDENTITY_QUATERNION = new THREE.Quaternion();

function normalizeBoneName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export function resolveTololoRig(bones: readonly THREE.Bone[]): TololoRigResolution {
  const byName = new Map<string, THREE.Bone>();
  for (const bone of bones) byName.set(normalizeBoneName(bone.name), bone);

  const resolved: TololoBoneMap = {};
  const resolvedNames: Partial<Record<TololoBoneRole, string>> = {};
  const missing: TololoBoneRole[] = [];
  for (const role of TOLOLO_BONE_ROLES) {
    const bone = BONE_ALIASES[role]
      .map((alias) => byName.get(normalizeBoneName(alias)))
      .find((candidate) => candidate !== undefined);
    if (bone === undefined) {
      missing.push(role);
    } else {
      resolved[role] = bone;
      resolvedNames[role] = bone.name;
    }
  }

  return { bones: resolved, resolvedNames, missing };
}

export function captureTololoRestPose(rig: TololoBoneMap): TololoRestPose {
  const rest: TololoRestPose = {};
  for (const role of TOLOLO_BONE_ROLES) {
    const bone = rig[role];
    if (bone === undefined) continue;
    rest[role] = {
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
      scale: bone.scale.clone(),
    };
  }
  return rest;
}

export function restoreTololoRestPose(rig: TololoBoneMap, rest: TololoRestPose): void {
  for (const role of TOLOLO_BONE_ROLES) {
    const bone = rig[role];
    const transform = rest[role];
    if (bone === undefined || transform === undefined) continue;
    bone.position.copy(transform.position);
    bone.quaternion.copy(transform.quaternion);
    bone.scale.copy(transform.scale);
  }
}

export function applyTololoBoneOffset(
  rig: TololoBoneMap,
  rest: TololoRestPose,
  role: TololoBoneRole,
  rotation: readonly [x: number, y: number, z: number],
  position?: readonly [x: number, y: number, z: number],
): void {
  const bone = rig[role];
  const transform = rest[role];
  if (bone === undefined || transform === undefined) return;

  OFFSET_EULER.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  OFFSET_QUATERNION.setFromEuler(OFFSET_EULER);
  bone.quaternion.copy(transform.quaternion).multiply(OFFSET_QUATERNION);
  if (position !== undefined) {
    bone.position.copy(transform.position);
    bone.position.x += position[0];
    bone.position.y += position[1];
    bone.position.z += position[2];
  }
}

function rotateLinkToward(
  link: THREE.Bone,
  effector: THREE.Bone,
  targetWorldPosition: THREE.Vector3,
  maximumStep: number,
): void {
  link.getWorldPosition(LINK_POSITION);
  effector.getWorldPosition(EFFECTOR_POSITION);
  CURRENT_DIRECTION.copy(EFFECTOR_POSITION).sub(LINK_POSITION);
  TARGET_DIRECTION.copy(targetWorldPosition).sub(LINK_POSITION);
  if (CURRENT_DIRECTION.lengthSq() < 1e-8 || TARGET_DIRECTION.lengthSq() < 1e-8) return;
  CURRENT_DIRECTION.normalize();
  TARGET_DIRECTION.normalize();
  DELTA_QUATERNION.setFromUnitVectors(CURRENT_DIRECTION, TARGET_DIRECTION);
  const angle = 2 * Math.acos(Math.min(1, Math.abs(DELTA_QUATERNION.w)));
  if (angle > maximumStep) {
    LIMITED_DELTA_QUATERNION.copy(IDENTITY_QUATERNION).slerp(DELTA_QUATERNION, maximumStep / angle);
  } else {
    LIMITED_DELTA_QUATERNION.copy(DELTA_QUATERNION);
  }

  link.getWorldQuaternion(LINK_WORLD_QUATERNION);
  LINK_WORLD_QUATERNION.premultiply(LIMITED_DELTA_QUATERNION);
  if (link.parent !== null) {
    link.parent.getWorldQuaternion(PARENT_WORLD_QUATERNION).invert();
    link.quaternion.copy(PARENT_WORLD_QUATERNION).multiply(LINK_WORLD_QUATERNION);
  } else {
    link.quaternion.copy(LINK_WORLD_QUATERNION);
  }
  link.updateMatrixWorld(true);
}

export function solveTololoArmGrip(
  rig: TololoBoneMap,
  side: 'left' | 'right',
  targetWorldPosition: THREE.Vector3,
  iterations = 6,
): boolean {
  const arm = rig[side === 'left' ? 'leftArm' : 'rightArm'];
  const elbow = rig[side === 'left' ? 'leftElbow' : 'rightElbow'];
  const effector =
    rig[side === 'left' ? 'leftWrist' : 'rightWrist'] ??
    rig[side === 'left' ? 'leftGrip' : 'rightGrip'];
  if (arm === undefined || elbow === undefined || effector === undefined) return false;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    rotateLinkToward(elbow, effector, targetWorldPosition, 0.45);
    rotateLinkToward(arm, effector, targetWorldPosition, 0.45);
  }
  return true;
}
