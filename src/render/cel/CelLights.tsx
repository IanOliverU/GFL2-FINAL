import { celLighting } from './celLighting';

/**
 * AD1 reusable Grassland light rig: soft main sun with shadows, broad cool
 * hemisphere fill, one restrained cool rim for character separation, and the
 * muted AD1 fog. No bloom, no extra real-time lights, no post passes.
 */
export function CelLights({ preview = false }: { preview?: boolean }) {
  return (
    <>
      <fog
        attach="fog"
        args={[
          celLighting.fog.color,
          preview ? celLighting.previewFog.near : celLighting.fog.near,
          preview ? celLighting.previewFog.far : celLighting.fog.far,
        ]}
      />
      <hemisphereLight
        args={[
          celLighting.hemisphere.sky,
          celLighting.hemisphere.ground,
          preview ? 1.5 : celLighting.hemisphere.intensity,
        ]}
      />
      <directionalLight
        castShadow={!preview}
        color={celLighting.sun.color}
        intensity={preview ? 2.25 : celLighting.sun.intensity}
        position={[
          celLighting.sun.position[0],
          celLighting.sun.position[1],
          celLighting.sun.position[2],
        ]}
        shadow-mapSize-width={celLighting.shadow.mapSize}
        shadow-mapSize-height={celLighting.shadow.mapSize}
        shadow-camera-left={celLighting.shadow.left}
        shadow-camera-right={celLighting.shadow.right}
        shadow-camera-top={celLighting.shadow.top}
        shadow-camera-bottom={celLighting.shadow.bottom}
        shadow-bias={celLighting.shadow.bias}
      />
      <directionalLight
        position={[
          celLighting.rim.position[0],
          celLighting.rim.position[1],
          celLighting.rim.position[2],
        ]}
        color={celLighting.rim.color}
        intensity={celLighting.rim.intensity}
      />
    </>
  );
}
