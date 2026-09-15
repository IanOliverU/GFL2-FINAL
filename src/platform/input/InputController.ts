import {
  createInputIntent,
  thirdPersonCrosshairRay,
  topDownCursorRay,
  type GameSnapshot,
  type InputIntent,
} from '../../game';
import {
  getPublishedCameraAimRay,
  resetPublishedCameraAimRay,
  setAimPointerNdc,
} from './aimRayState';

type Pulse = 'switchCamera' | 'fire';

export const MOUSE_YAW_SENSITIVITY = 0.0022;
export const MOUSE_PITCH_SENSITIVITY = 0.0018;
export const MAX_LOOK_UP = 0.55;
export const MAX_LOOK_DOWN = -0.65;

/**
 * Unified coordinate convention (Y-up, right-handed world):
 * - A camera yaw defines ground-plane forward as (sin yaw, cos yaw).
 * - Screen-right is forward x up, i.e. (-cos yaw, +sin yaw).
 * - Third-person movement is camera-relative; top-down movement is
 *   screen-relative against the fixed elevated camera, which uses the same
 *   convention with an implicit yaw of 0 (screen-up +Z, screen-right -X).
 * - Locomotion never reads pitch: movement speed is identical at any pitch.
 */

/** Project an XZ vector to a unit ground-plane forward with a safe fallback. */
export function flattenForward(x: number, z: number): readonly [number, number] {
  const length = Math.hypot(x, z);
  if (!Number.isFinite(length) || length < 1e-6) return [0, 1];
  return [x / length, z / length];
}

/**
 * Flattened third-person camera basis on XZ for a yaw where forward is
 * (sin yaw, cos yaw). Screen-right is forward x up, which yields
 * (-cos yaw, sin yaw) in a Y-up right-handed world.
 */
export function thirdPersonBasis(yaw: number): {
  forward: readonly [number, number];
  right: readonly [number, number];
} {
  const forward = flattenForward(Math.sin(yaw), Math.cos(yaw));
  return {
    forward,
    right: [-forward[1], forward[0]],
  };
}

export function thirdPersonMove(
  forwardInput: number,
  rightInput: number,
  yaw: number,
): readonly [number, number] {
  const { forward, right } = thirdPersonBasis(yaw);
  return [
    forwardInput * forward[0] + rightInput * right[0],
    forwardInput * forward[1] + rightInput * right[1],
  ];
}

/**
 * Fixed top-down basis derived from the render camera offset (0, 18.5, -13.5):
 * the camera sits behind -Z and looks toward +Z, so screen-up projects to +Z
 * and screen-right (view direction x up) projects to -X.
 */
export function topDownBasis(): {
  forward: readonly [number, number];
  right: readonly [number, number];
} {
  return { forward: [0, 1], right: [-1, 0] };
}

export function topDownMove(forwardInput: number, rightInput: number): readonly [number, number] {
  const { forward, right } = topDownBasis();
  return [
    forwardInput * forward[0] + rightInput * right[0],
    forwardInput * forward[1] + rightInput * right[1],
  ];
}

/**
 * Single tested entry point for the simulation movement command. Selects the
 * newly active camera's basis immediately (no stale basis across `V`
 * switches) and normalizes overlong diagonals so combined keys never grant
 * extra speed; zero input stays zero.
 */
export function resolveMoveVector(
  cameraMode: 'thirdPerson' | 'topDown',
  forwardInput: number,
  rightInput: number,
  yaw: number,
): readonly [number, number] {
  const [x, z] =
    cameraMode === 'thirdPerson'
      ? thirdPersonMove(forwardInput, rightInput, yaw)
      : topDownMove(forwardInput, rightInput);
  const length = Math.hypot(x, z);
  if (length > 1) return [x / length, z / length];
  return [x, z];
}

export function topDownAim(
  playerX: number,
  playerZ: number,
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
  focusDistance: number,
): readonly [number, number, number] {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const ndcX = (pointerX / safeWidth) * 2 - 1;
  const ndcY = 1 - (pointerY / safeHeight) * 2;
  return [playerX - ndcX * focusDistance, 0.9, playerZ + ndcY * focusDistance];
}

/** Conventional mouse: right turns right (yaw decreases), up looks up. */
export function applyMouseDelta(
  yaw: number,
  pitch: number,
  movementX: number,
  movementY: number,
): { yaw: number; pitch: number } {
  return {
    yaw: yaw - movementX * MOUSE_YAW_SENSITIVITY,
    pitch: Math.max(
      MAX_LOOK_DOWN,
      Math.min(MAX_LOOK_UP, pitch - movementY * MOUSE_PITCH_SENSITIVITY),
    ),
  };
}

/**
 * Pointer-lock acquisition gate (pure): the cursor belongs to modal overlays
 * (level-up, attachment, reward shop, pause, death/results) whenever one is
 * open, so gameplay must neither hold nor acquire the lock then. Overlay
 * clicks target non-canvas elements, but this also guards canvas clicks
 * behind a modal backdrop. Only interactive gameplay states may acquire it.
 */
export function mayAcquirePointerLock(snapshot: GameSnapshot): boolean {
  if (snapshot.cameraMode !== 'thirdPerson' || snapshot.paused) return false;
  if (snapshot.pauseReason !== null || snapshot.pendingAttachment !== null) return false;
  return snapshot.runState === 'active' || snapshot.runState === 'boss';
}

export class InputController {
  private readonly keys = new Set<string>();
  private readonly pulses = new Set<Pulse>();
  private surface: HTMLElement | null = null;
  private fire = false;
  private ads = false;
  private pointerX = 0;
  private pointerY = 0;
  private yaw = 0;
  private pitch = 0;
  private lastMouseDelta: readonly [number, number] = [0, 0];
  private lastCameraMode: GameSnapshot['cameraMode'] = 'thirdPerson';
  private listening = false;

  constructor(private readonly onEscape: () => void) {}

  /** Development-only snapshot for the flag-gated controls overlay. */
  debugState(): {
    keys: readonly string[];
    yaw: number;
    pitch: number;
    mouseDelta: readonly [number, number];
  } {
    return {
      keys: [...this.keys].sort(),
      yaw: this.yaw,
      pitch: this.pitch,
      mouseDelta: this.lastMouseDelta,
    };
  }

  attach(surface: HTMLElement): void {
    this.surface = surface;
    if (this.listening) return;
    if (this.pointerX === 0 && this.pointerY === 0 && typeof window !== 'undefined') {
      this.pointerX = window.innerWidth / 2;
      this.pointerY = window.innerHeight / 2;
    }
    this.listening = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.reset);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    surface.addEventListener('contextmenu', this.preventContextMenu);
  }

  detach(): void {
    if (!this.listening) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.surface?.removeEventListener('contextmenu', this.preventContextMenu);
    this.surface = null;
    this.listening = false;
    this.reset();
    resetPublishedCameraAimRay();
  }

  queuePulse(pulse: Pulse): void {
    this.pulses.add(pulse);
  }

  acknowledgeSteps(steps: number): void {
    if (steps > 0) this.pulses.clear();
  }

  requestPointerLock(snapshot: GameSnapshot, target: EventTarget | null): void {
    if (!mayAcquirePointerLock(snapshot)) return;
    if (!(target instanceof HTMLCanvasElement)) return;
    void this.surface?.requestPointerLock();
  }

  getIntent(snapshot: GameSnapshot): InputIntent {
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.lastCameraMode = snapshot.cameraMode;
    if (
      snapshot.cameraMode !== 'thirdPerson' &&
      typeof document !== 'undefined' &&
      this.surface !== null &&
      document.pointerLockElement === this.surface
    ) {
      // Top-down aiming needs a visible cursor on the ground plane; a lock
      // carried over from third-person would freeze the cursor and let hidden
      // yaw drift corrupt the orientation restored on switch-back.
      document.exitPointerLock();
    }
    let moveX = right;
    let moveZ = forward;
    let aimPoint: readonly [number, number, number] | null = null;

    [moveX, moveZ] = resolveMoveVector(snapshot.cameraMode, forward, right, this.yaw);
    // The crosshair ray is finalized and published by the render camera.
    // Analytic third-person and top-down rays are deterministic fallbacks for
    // startup and headless tests; input never selects targets.
    const viewportWidth = typeof window === 'undefined' ? 1280 : Math.max(1, window.innerWidth);
    const viewportHeight = typeof window === 'undefined' ? 720 : Math.max(1, window.innerHeight);
    const aspect = viewportWidth / viewportHeight;
    if (this.surface !== null) {
      this.surface.style.setProperty(
        '--gfl-crosshair-x',
        snapshot.cameraMode === 'thirdPerson' ? '50%' : `${this.pointerX}px`,
      );
      this.surface.style.setProperty(
        '--gfl-crosshair-y',
        snapshot.cameraMode === 'thirdPerson' ? '50%' : `${this.pointerY}px`,
      );
    }
    setAimPointerNdc(
      (this.pointerX / viewportWidth) * 2 - 1,
      1 - (this.pointerY / viewportHeight) * 2,
    );
    let aimRay: InputIntent['aimRay'];
    if (snapshot.cameraMode !== 'thirdPerson') {
      const focusDistance = this.ads ? 15 : 22;
      aimPoint = topDownAim(
        snapshot.player.position[0],
        snapshot.player.position[2],
        this.pointerX,
        this.pointerY,
        viewportWidth,
        viewportHeight,
        focusDistance,
      );
      const cursorRay = topDownCursorRay(
        snapshot.player.position,
        this.pointerX,
        this.pointerY,
        viewportWidth,
        viewportHeight,
        this.ads ? 38 : 46,
      );
      aimRay = getPublishedCameraAimRay(snapshot.cameraMode) ?? {
        origin: cursorRay.origin,
        direction: cursorRay.direction,
      };
    } else {
      const ray = thirdPersonCrosshairRay(snapshot.player.position, this.yaw, this.pitch, aspect);
      aimRay = getPublishedCameraAimRay(snapshot.cameraMode) ?? {
        origin: ray.origin,
        direction: ray.direction,
      };
    }

    return createInputIntent({
      move: [moveX, moveZ],
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      dodge: this.keys.has('Space'),
      fire: this.fire || this.pulses.has('fire'),
      ads: this.ads,
      reload: this.keys.has('KeyR'),
      skill1: this.keys.has('KeyQ'),
      skill2: this.keys.has('KeyE'),
      ultimate: this.keys.has('KeyF'),
      interact: this.keys.has('KeyG'),
      switchCamera: this.keys.has('KeyV') || this.pulses.has('switchCamera'),
      aimYaw: this.yaw,
      aimPitch: this.pitch,
      aimPoint,
      aimRay,
    });
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape' && !event.repeat) {
      this.onEscape();
      return;
    }
    if (
      event.code === 'Space' ||
      event.code.startsWith('Arrow') ||
      event.code === 'KeyV' ||
      event.code === 'KeyG'
    ) {
      event.preventDefault();
    }
    if (event.code === 'KeyV' && !event.repeat) this.pulses.add('switchCamera');
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent) => {
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.lastMouseDelta = [event.movementX, event.movementY];
    if (typeof document !== 'undefined' && document.pointerLockElement !== this.surface) return;
    // The top-down camera keeps its fixed angle; mouse motion must not orbit
    // it or drift the yaw restored when switching back to third-person.
    if (this.lastCameraMode !== 'thirdPerson') return;
    const next = applyMouseDelta(this.yaw, this.pitch, event.movementX, event.movementY);
    this.yaw = next.yaw;
    this.pitch = next.pitch;
  };

  private readonly onMouseDown = (event: MouseEvent) => {
    const gameplayPointer =
      (this.surface !== null && document.pointerLockElement === this.surface) ||
      event.target instanceof HTMLCanvasElement;
    if (event.button === 0 && gameplayPointer) {
      this.fire = true;
      // Preserve a deliberate click until at least one fixed step observes
      // it. Held fire still follows the existing automatic cadence.
      this.pulses.add('fire');
    }
    if (event.button === 2) this.ads = true;
  };

  private readonly onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) this.fire = false;
    if (event.button === 2) this.ads = false;
  };

  private readonly preventContextMenu = (event: Event) => event.preventDefault();
  private readonly onVisibilityChange = () => {
    if (document.hidden) this.reset();
  };

  private readonly reset = () => {
    this.keys.clear();
    this.pulses.clear();
    this.fire = false;
    this.ads = false;
  };
}
