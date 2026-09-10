import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type { WebGLRenderer } from 'three';
import { publishRendererDiagnostics, type RendererDiagnosticsCallback } from './types';

function gpuStrings(renderer: WebGLRenderer): { renderer: string; vendor: string } {
  const context = renderer.getContext();
  const extension = context.getExtension('WEBGL_debug_renderer_info') as {
    UNMASKED_RENDERER_WEBGL: number;
    UNMASKED_VENDOR_WEBGL: number;
  } | null;
  if (!extension) {
    return {
      renderer: String(context.getParameter(context.RENDERER)),
      vendor: String(context.getParameter(context.VENDOR)),
    };
  }
  return {
    renderer: String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL)),
    vendor: String(context.getParameter(extension.UNMASKED_VENDOR_WEBGL)),
  };
}

export function DiagnosticsPublisher({
  onDiagnostics,
}: {
  onDiagnostics?: RendererDiagnosticsCallback | undefined;
}) {
  const { gl } = useThree();
  const elapsed = useRef(0);
  const gpu = useRef(gpuStrings(gl));

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.5) return;
    elapsed.current = 0;

    const diagnostics = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      dpr: gl.getPixelRatio(),
      renderer: gpu.current.renderer,
      vendor: gpu.current.vendor,
    };
    publishRendererDiagnostics(diagnostics);
    onDiagnostics?.(diagnostics);
  });

  return null;
}
