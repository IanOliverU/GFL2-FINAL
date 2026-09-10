import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { DiagnosticsPublisher } from '../Diagnostics';
import type { RendererDiagnosticsCallback } from '../types';
import { GrasslandWorld } from '../world/GrasslandWorld';

export interface MenuPreviewProps {
  reducedMotion?: boolean;
  modalOpen?: boolean;
  className?: string;
  onError?: (error: Error) => void;
  onDiagnostics?: RendererDiagnosticsCallback;
}

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: ((error: Error) => void) | undefined;
}

interface BoundaryState {
  failed: boolean;
}

class PreviewBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function PreviewCamera({ paused }: { paused: boolean }) {
  const angle = useRef(-0.75);
  useFrame(({ camera }, delta) => {
    if (!paused) angle.current += delta * 0.055;
    const radius = 24;
    camera.position.set(Math.cos(angle.current) * radius, 11.5, Math.sin(angle.current) * radius);
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

function StaticFallback() {
  return (
    <div
      className="gfl-preview-fallback"
      role="img"
      aria-label="Static illustrated Flat Grassland preview"
    >
      <div className="gfl-preview-fallback__sun" />
      <div className="gfl-preview-fallback__cloud gfl-preview-fallback__cloud--a" />
      <div className="gfl-preview-fallback__cloud gfl-preview-fallback__cloud--b" />
      <div className="gfl-preview-fallback__hill gfl-preview-fallback__hill--far" />
      <div className="gfl-preview-fallback__hill gfl-preview-fallback__hill--near" />
      <div className="gfl-preview-fallback__field" />
      <div className="gfl-preview-fallback__beacon" />
      <span>Static preview / WebGL unavailable</span>
    </div>
  );
}

export function MenuPreview({
  reducedMotion = false,
  modalOpen = false,
  className,
  onError,
  onDiagnostics,
}: MenuPreviewProps) {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const handleVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (contextLost) return <StaticFallback />;
  const paused = reducedMotion || modalOpen || !visible;

  return (
    <div
      className={['gfl-menu-preview', className].filter(Boolean).join(' ')}
      data-preview-motion={paused ? 'paused' : 'orbiting'}
      aria-hidden="true"
    >
      <PreviewBoundary fallback={<StaticFallback />} onError={onError}>
        <Canvas
          dpr={[1, 1.6]}
          frameloop={paused ? 'demand' : 'always'}
          shadows
          camera={{ position: [17, 10, 17], fov: 44, near: 0.1, far: 180 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.domElement.addEventListener(
              'webglcontextlost',
              (event) => {
                event.preventDefault();
                const error = new Error('WebGL context was lost while rendering the menu preview.');
                setContextLost(true);
                onError?.(error);
              },
              { once: true },
            );
          }}
        >
          <PreviewCamera paused={paused} />
          <GrasslandWorld reducedMotion={paused} preview objectivePosition={[-5, 0, -3]} />
          <DiagnosticsPublisher onDiagnostics={onDiagnostics} />
        </Canvas>
      </PreviewBoundary>
      <div className="gfl-menu-preview__grade" />
    </div>
  );
}
