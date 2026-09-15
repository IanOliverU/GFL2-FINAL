import { celGradientMap } from './celBands';
import { celFamilyBands, type CelMaterialFamily } from './celMaterial';
import type { ColorRepresentation, MeshToonMaterial, Side, Texture } from 'three';
import type { Ref } from 'react';

/**
 * AD1 reusable lit surface. Renders one MeshToonMaterial on the shared AD1
 * gradient ramp for the given family — no per-object shader duplication.
 * Roughness/metalness are deliberately not props: toon response is fixed by
 * the band ramp, and metal reads come from value contrast plus the rim
 * light, never from PBR sliders. Forwards an optional material ref for
 * presentational animation (e.g. emissive pulses driven from useFrame).
 */
export function CelSurface({
  family,
  color,
  emissive,
  emissiveIntensity,
  map,
  transparent,
  opacity,
  alphaTest,
  side,
  depthWrite,
  materialRef,
}: {
  family: CelMaterialFamily;
  color: ColorRepresentation;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  map?: Texture | null;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  side?: Side;
  depthWrite?: boolean;
  materialRef?: Ref<MeshToonMaterial>;
}) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={celGradientMap(celFamilyBands(family))}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity ?? 1}
      transparent={transparent ?? false}
      opacity={opacity ?? 1}
      alphaTest={alphaTest ?? 0}
      {...(materialRef !== undefined ? { ref: materialRef } : {})}
      {...(map !== undefined ? { map } : {})}
      {...(side !== undefined ? { side } : {})}
      {...(depthWrite !== undefined ? { depthWrite } : {})}
    />
  );
}
