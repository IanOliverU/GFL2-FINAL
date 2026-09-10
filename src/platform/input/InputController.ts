import { createInputIntent, type GameSnapshot, type InputIntent } from '../../game';

type Pulse = 'switchCamera';

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
  private listening = false;

  constructor(private readonly onEscape: () => void) {}

  attach(surface: HTMLElement): void {
    this.surface = surface;
    if (this.listening) return;
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
  }

  queuePulse(pulse: Pulse): void {
    this.pulses.add(pulse);
  }

  acknowledgeSteps(steps: number): void {
    if (steps > 0) this.pulses.clear();
  }

  requestPointerLock(snapshot: GameSnapshot, target: EventTarget | null): void {
    if (snapshot.cameraMode !== 'thirdPerson' || snapshot.paused) return;
    if (!(target instanceof HTMLCanvasElement)) return;
    void this.surface?.requestPointerLock();
  }

  getIntent(snapshot: GameSnapshot): InputIntent {
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    const right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    let moveX = right;
    let moveZ = forward;
    let aimPoint: readonly [number, number, number] | null = null;

    if (snapshot.cameraMode === 'thirdPerson') {
      moveX = forward * Math.sin(this.yaw) + right * Math.cos(this.yaw);
      moveZ = forward * Math.cos(this.yaw) - right * Math.sin(this.yaw);
    } else {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const ndcX = (this.pointerX / width) * 2 - 1;
      const ndcY = 1 - (this.pointerY / height) * 2;
      const focusDistance = this.ads ? 15 : 22;
      aimPoint = [
        snapshot.player.position[0] + ndcX * focusDistance,
        0.9,
        snapshot.player.position[2] + ndcY * focusDistance,
      ];
    }

    return createInputIntent({
      move: [moveX, moveZ],
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      dodge: this.keys.has('Space'),
      fire: this.fire,
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
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent) => {
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    if (document.pointerLockElement !== this.surface) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch = Math.max(-0.65, Math.min(0.55, this.pitch - event.movementY * 0.0018));
  };

  private readonly onMouseDown = (event: MouseEvent) => {
    if (event.button === 0) this.fire = true;
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
