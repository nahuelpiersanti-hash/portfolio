'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * EnergyCore - Glowing energy sphere at the center
 * Replaces the large visible domain sphere with a luminous core
 */
export function EnergyCore() {
  const groupRef = useRef<Group>(null);
  const coreMeshRef = useRef<Mesh>(null);

  // Reactor-sized core: roughly similar to a large module.
  const radius = 0.32;

  const coreGeometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, 32, 32);
  }, [radius]);

  const auraGeometry = useMemo(() => {
    return new THREE.SphereGeometry(radius * 1.55, 24, 24);
  }, [radius]);

  const coreMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#062333',
      emissive: '#00d5ff',
      emissiveIntensity: 1.0,
      roughness: 0.25,
      metalness: 0.05,
    });
  }, []);

  const auraMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00d5ff',
      transparent: true,
      opacity: 0.13,
      toneMapped: false,
      depthWrite: false,
    });
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      auraGeometry.dispose();
      coreMaterial.dispose();
      auraMaterial.dispose();
    };
  }, [auraGeometry, auraMaterial, coreGeometry, coreMaterial]);

  // Reactor pulse: layered low/high frequency sine around a stable non-zero base.
  useFrame(({ clock }) => {
    if (coreMeshRef.current) {
      const time = clock.getElapsedTime();
      const pulse = Math.sin(time * 2.0) * 0.325 + 0.675;
      const normalizedPulse = THREE.MathUtils.clamp((pulse - 0.35) / 0.65, 0, 1);
      coreMaterial.emissiveIntensity = 0.5 + normalizedPulse * 0.4;
      auraMaterial.opacity = 0.01 + normalizedPulse * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <pointLight color="#00d5ff" intensity={0.35} distance={5} decay={2} />
      <mesh ref={coreMeshRef} geometry={coreGeometry} material={coreMaterial} />
      <mesh geometry={auraGeometry} material={auraMaterial} />
    </group>
  );
}
