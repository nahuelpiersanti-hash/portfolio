import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Performance monitoring hook for WebGL scenes
 * Logs FPS and draw calls in development
 */
export function usePerformanceMonitor(enabled: boolean = process.env.NODE_ENV === 'development') {
  const { gl } = useThree();
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    if (!enabled) return;

    frameCountRef.current++;

    const now = performance.now();
    const delta = now - lastTimeRef.current;

    // Log stats every 2 seconds
    if (delta >= 2000) {
      const fps = Math.round((frameCountRef.current / delta) * 1000);
      const info = gl.info;

      console.log('[WebGL Performance]', {
        fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      });

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });
}

/**
 * Resource cleanup utility
 * Ensures proper disposal of Three.js objects
 */
export function disposeObject(obj: any) {
  if (obj.geometry) {
    obj.geometry.dispose();
  }

  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((mat: any) => disposeMaterial(mat));
    } else {
      disposeMaterial(obj.material);
    }
  }

  if (obj.dispose) {
    obj.dispose();
  }
}

function disposeMaterial(material: any) {
  if (material.map) material.map.dispose();
  if (material.lightMap) material.lightMap.dispose();
  if (material.bumpMap) material.bumpMap.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.specularMap) material.specularMap.dispose();
  if (material.envMap) material.envMap.dispose();
  material.dispose();
}

/**
 * Frustum culling helper
 * Optimizes rendering by checking if object is in view
 */
export function isInViewFrustum(object: any, camera: any) {
  const frustum = new (require('three')).Frustum();
  const matrix = new (require('three')).Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(matrix);
  return frustum.intersectsObject(object);
}
