import { useEffect, useState } from 'react';
import { thirdPersonBasis, topDownBasis } from '../../platform/input/InputController';

export interface ControlsDebugState {
  cameraMode: string;
  move: readonly [number, number];
  aimYaw: number;
  aimPitch: number;
  keys: readonly string[];
}

declare global {
  interface Window {
    __GFL2_CONTROLS_DEBUG__?: ControlsDebugState;
  }
}

function isEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('controlsDebug') === '1'
  );
}

function formatPair(value: readonly [number, number]): string {
  return `(${value[0].toFixed(2)}, ${value[1].toFixed(2)})`;
}

/**
 * Development-only control-direction overlay for M1.1 evidence. It renders
 * exclusively under `?controlsDebug=1` and is absent from normal gameplay.
 * Key presses stay visually distinguishable through the live key list.
 */
export function ControlsOverlay() {
  const [enabled] = useState(isEnabled);
  const [state, setState] = useState<ControlsDebugState | null>(null);
  const [mouse, setMouse] = useState<readonly [number, number]>([0, 0]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      setState(window.__GFL2_CONTROLS_DEBUG__ ?? null);
    }, 100);
    const onMouseMove = (event: MouseEvent) => {
      setMouse([event.movementX, event.movementY]);
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled]);

  if (!enabled) return null;
  const basis =
    state?.cameraMode === 'topDown' ? topDownBasis() : thirdPersonBasis(state?.aimYaw ?? 0);
  return (
    <div
      data-controls-overlay="active"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 40,
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        color: '#eaffea',
        background: 'rgba(8, 18, 12, 0.78)',
        border: '1px solid #4caf7d',
        borderRadius: 6,
        padding: '6px 8px',
        pointerEvents: 'none',
        whiteSpace: 'pre',
      }}
    >
      {`cam ${state?.cameraMode ?? '?'} | keys ${(state?.keys ?? []).join('+') || 'none'}
fwd ${formatPair(basis.forward)} right ${formatPair(basis.right)}
move ${state ? formatPair(state.move) : '(?, ?)'}
yaw ${(state?.aimYaw ?? 0).toFixed(2)} pitch ${(state?.aimPitch ?? 0).toFixed(2)}
mouse (${mouse[0]}, ${mouse[1]})`}
    </div>
  );
}
