'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Group, Mesh, PointLight } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnergyCoreProps {
  active?: boolean;
  onBeat?: (pulse: number) => void;
}

// Asymmetric heartbeat curve: fast convex rise, slow polynomial fall.
function heartbeat(t: number): number {
  const ATTACK = 0.18;
  if (t < ATTACK) {
    return Math.pow(t / ATTACK, 0.55);
  }
  const decay = (t - ATTACK) / (1 - ATTACK);
  return Math.pow(1 - decay, 2.8);
}

/**
 * EnergyCore - Glowing energy sphere at the center
 * Replaces the large visible domain sphere with a luminous core
 */
export function EnergyCore({ active = false, onBeat }: EnergyCoreProps) {
  const groupRef = useRef<Group>(null);
  const coreMeshRef = useRef<Mesh>(null);
  const auraMeshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);

  // Pressurized but contained core: visible through joints without exceeding shell.
  const radius = 0.45;

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

  // Heartbeat: fast attack (~18% of cycle), slow release (~82%).
  // 15 BPM base (0.25 Hz), 18 BPM active (0.3 Hz).
  useFrame(({ clock }) => {
    if (!coreMeshRef.current || !auraMeshRef.current) return;

    const time = clock.getElapsedTime();
    const freq = active ? 0.3 : 0.25;
    const amplitude = active ? 0.078 : 0.062;

    const phase = (time * freq) % 1;
    const pulse = heartbeat(phase);

    // Aura lags ~0.1 s behind the core for an expansive wave feel.
    const auraPhase = (Math.max(0, time - 0.1) * freq) % 1;
    const auraPulse = heartbeat(auraPhase);
    const coreMat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
    const auraMat = auraMeshRef.current.material as THREE.MeshBasicMaterial;

    coreMeshRef.current.scale.setScalar(1.0 + pulse * amplitude);
    coreMat.emissiveIntensity = 0.75 + pulse * (active ? 1.25 : 1.0);

    auraMeshRef.current.scale.setScalar(1.0 + auraPulse * amplitude * 1.42);
    auraMat.opacity = 0.07 + auraPulse * 0.2;

    if (lightRef.current) {
      lightRef.current.intensity = 0.5 + pulse * (active ? 0.45 : 0.32);
      lightRef.current.distance = 6.1 + pulse * 1.4;
    }

    onBeat?.(pulse);
  });

  return (
    <group ref={groupRef}>
      <pointLight ref={lightRef} color="#00d5ff" intensity={0.5} distance={6.1} decay={2} />
      <mesh ref={coreMeshRef} geometry={coreGeometry} material={coreMaterial} />
      <mesh ref={auraMeshRef} geometry={auraGeometry} material={auraMaterial} />
    </group>
  );
}
