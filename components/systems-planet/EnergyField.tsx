'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnergyFieldProps {
  fieldRadius: number;
}

/**
 * Faint spherical field used as a structural cue behind modules.
 * Back-side rendering keeps it airy and avoids covering module faces.
 */
export function EnergyField({ fieldRadius }: EnergyFieldProps) {
  const meshRef = useRef<Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>>(null);

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(fieldRadius, 48, 48);
  }, [fieldRadius]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      toneMapped: false,
      uniforms: {
        uColor: { value: new THREE.Color('#2bbdff') },
        uOpacity: { value: 0.07 },
        uPower: { value: 3.3 },
        uBias: { value: 0.02 },
        uPulse: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uPower;
        uniform float uBias;
        uniform float uPulse;

        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          float ndotv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
          float fresnel = pow(1.0 - ndotv, uPower) + uBias;
          float alpha = clamp(fresnel * uOpacity * uPulse, 0.0, 0.18);

          vec3 color = uColor * (0.6 + fresnel * 0.4);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      material.uniforms.uPulse.value = 0.96 + Math.sin(t * 0.3) * 0.04;
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
