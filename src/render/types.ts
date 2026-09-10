export interface RendererDiagnostics {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  dpr: number;
  renderer: string;
  vendor: string;
}

export type RendererDiagnosticsCallback = (diagnostics: RendererDiagnostics) => void;

declare global {
  interface Window {
    __GFL2_RENDER_DIAGNOSTICS__?: RendererDiagnostics;
  }
}

export function publishRendererDiagnostics(diagnostics: RendererDiagnostics): void {
  if (typeof window !== 'undefined') {
    window.__GFL2_RENDER_DIAGNOSTICS__ = diagnostics;
  }
}
