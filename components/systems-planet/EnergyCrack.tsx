'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createCrackGeometry,
  createCrackMaterial,
  setCrackMaterialFlowDirection,
  setCrackMaterialIntensity,
  setCrackMaterialTime,
} from '@/lib/crack-generator';

interface EnergyCrackProps {
  path: THREE.Vector3[];
  index: number;
  type: 'core-module' | 'module-module';
}

export function EnergyCrack({ path, index, type }: EnergyCrackProps) {
  const meshRef = useRef<Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const particleRefs = useRef<Array<Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> | null>>([]);

  const curvePoints = useMemo(() => {
    if (type === 'core-module' && path.length >= 2) {
      const start = path[0].clone();
      const end = path[path.length - 1].clone();
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const outwardNormal = mid.clone().normalize();
      const bendStrength = start.length() * 0.22 + end.length() * 0.08;
      const control = mid.add(outwardNormal.multiplyScalar(bendStrength));

      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      return curve.getPoints(72);
    }

    const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5);
    return curve.getPoints(64);
  }, [path, type]);

  const frameData = useMemo(() => {
    const fallback = new THREE.Vector3(1, 0, 0);

    return curvePoints.map((point, i) => {
      const prev = curvePoints[Math.max(0, i - 1)];
      const next = curvePoints[Math.min(curvePoints.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const radial = point.clone().normalize();

      let normal = new THREE.Vector3().crossVectors(tangent, radial);
      if (normal.lengthSq() < 1e-6) {
        normal = new THREE.Vector3().crossVectors(tangent, fallback);
      }
      normal.normalize();

      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      return { point, normal, binormal };
    });
  }, [curvePoints]);

  // Core channels are thinner; shell seams are slightly wider.
  const width = useMemo(() => {
    if (type === 'core-module') {
      return 0.022 + Math.random() * 0.01;
    }
    return 0.03 + Math.random() * 0.015;
  }, [type]);

  // Memoize geometry and material
  const geometry = useMemo(() => createCrackGeometry(path, width), [path, width]);
  const material = useMemo(() => createCrackMaterial(), []);

  const baseLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);
  const glowLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);
  const noisyLineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curvePoints), [curvePoints]);

  const baseLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const glowLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const noisyLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const baseLineObject = useMemo(() => new THREE.Line(baseLineGeometry, baseLineMaterial), [baseLineGeometry, baseLineMaterial]);
  const glowLineObject = useMemo(() => new THREE.Line(glowLineGeometry, glowLineMaterial), [glowLineGeometry, glowLineMaterial]);
  const noisyLineObject = useMemo(() => new THREE.Line(noisyLineGeometry, noisyLineMaterial), [noisyLineGeometry, noisyLineMaterial]);

  const particleCount = 7;
  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.01, 6, 6), []);
  const particleMaterials = useMemo(
    () =>
      Array.from({ length: particleCount }, () =>
        new THREE.MeshBasicMaterial({
          color: '#22d3ee',
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      ),
    []
  );

  const initialParticleStates = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        progress: Math.random() * 0.12,
        speed: 0.5 + Math.random() * 0.7,
        phase: index * 0.3 + i * 0.9,
      })),
    [index]
  );
  const particleStatesRef = useRef(initialParticleStates);

  // Animation offset for variety
  const animationOffset = useMemo(() => index * Math.PI * 0.3, [index]);
  const outwardOffset = useMemo(() => {
    const end = path[path.length - 1] ?? new THREE.Vector3();
    return Math.atan2(end.z, end.x);
  }, [path]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      baseLineGeometry.dispose();
      glowLineGeometry.dispose();
      noisyLineGeometry.dispose();
      baseLineMaterial.dispose();
      glowLineMaterial.dispose();
      noisyLineMaterial.dispose();
      particleGeometry.dispose();
      particleMaterials.forEach((mat) => mat.dispose());
    };
  }, [
    baseLineGeometry,
    baseLineMaterial,
    geometry,
    glowLineGeometry,
    glowLineMaterial,
    material,
    noisyLineGeometry,
    noisyLineMaterial,
    particleGeometry,
    particleMaterials,
  ]);

  useEffect(() => {
    particleStatesRef.current = initialParticleStates.map((state) => ({ ...state }));
  }, [initialParticleStates]);

  const updateLineGeometry = (lineGeometry: THREE.BufferGeometry, points: THREE.Vector3[]): void => {
    const positions = lineGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      positions.setXYZ(i, p.x, p.y, p.z);
    }
    positions.needsUpdate = true;
    lineGeometry.computeBoundingSphere();
  };

  // Traveling pulse: energy flows from core outward with per-channel phase offsets.
  const sampleArcPoint = (v: number, time: number, phase: number): THREE.Vector3 => {
    const clamped = THREE.MathUtils.clamp(v, 0, 1);
    const idx = Math.min(frameData.length - 1, Math.max(0, Math.round(clamped * (frameData.length - 1))));
    const frame = frameData[idx];
    const aliveOffset = Math.sin(time * 6 + index + clamped * Math.PI * 6) * 0.03;
    const jitter = Math.sin(time * 8 + phase + clamped * Math.PI * 4) * 0.004;

    return frame.point
      .clone()
      .add(frame.normal.clone().multiplyScalar(aliveOffset))
      .add(frame.binormal.clone().multiplyScalar(jitter));
  };

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();

    if (type === 'core-module') {
      const wave = (Math.sin(time * 4 + index * 0.8) + 1) / 2;
      const basePoints: THREE.Vector3[] = [];
      const glowPoints: THREE.Vector3[] = [];
      const noisyPoints: THREE.Vector3[] = [];

      for (let i = 0; i < frameData.length; i++) {
        const v = i / Math.max(1, frameData.length - 1);
        const frame = frameData[i];
        const aliveOffset = Math.sin(time * 6 + index + v * Math.PI * 6) * 0.03;
        const noisyOffset = Math.sin(time * 7.5 + index * 1.3 + v * Math.PI * 8) * 0.018;

        const basePoint = frame.point.clone().add(frame.normal.clone().multiplyScalar(aliveOffset * 0.55));
        const glowPoint = frame.point.clone().add(frame.normal.clone().multiplyScalar(aliveOffset));
        const noisyPoint = glowPoint
          .clone()
          .add(frame.binormal.clone().multiplyScalar(0.016 + noisyOffset))
          .add(frame.normal.clone().multiplyScalar(0.004 * Math.sin(time * 9 + i * 0.2 + index)));

        basePoints.push(basePoint);
        glowPoints.push(glowPoint);
        noisyPoints.push(noisyPoint);
      }

      updateLineGeometry(baseLineGeometry, basePoints);
      updateLineGeometry(glowLineGeometry, glowPoints);
      updateLineGeometry(noisyLineGeometry, noisyPoints);

      baseLineMaterial.opacity = 0.22 + wave * 0.26;
      glowLineMaterial.opacity = 0.28 + wave * 0.5;
      noisyLineMaterial.opacity = 0.2 + wave * 0.42;

      particleStatesRef.current.forEach((state, particleIndex) => {
        const particle = particleRefs.current[particleIndex];
        const particleMaterial = particleMaterials[particleIndex];

        if (!particle || !particleMaterial) {
          return;
        }

        state.progress += delta * state.speed * 0.35;
        if (state.progress > 0.94) {
          state.progress = Math.random() * 0.1;
          state.speed = 0.5 + Math.random() * 0.7;
          state.phase = index * 0.3 + particleIndex * 0.9 + Math.random() * Math.PI;
        }

        const point = sampleArcPoint(state.progress, time, state.phase);
        particle.position.copy(point);

        const fadeIn = THREE.MathUtils.smoothstep(state.progress, 0.01, 0.12);
        const fadeOut = 1 - THREE.MathUtils.smoothstep(state.progress, 0.68, 0.9);
        particleMaterial.opacity = (0.16 + wave * 0.44) * fadeIn * fadeOut;
      });

      return;
    }

    if (meshRef.current) {
      const wave = (Math.sin(time * 4 + index * 0.8) + 1) / 2;
      const intensityBase = 0.58;
      const intensity = THREE.MathUtils.clamp(intensityBase + wave * 0.18, 0.0, 0.95);
      const flowDirection = 0.6;

      setCrackMaterialTime(meshRef.current.material, time + animationOffset * 0.2 + outwardOffset * 0.15);
      setCrackMaterialIntensity(meshRef.current.material, intensity);
      setCrackMaterialFlowDirection(meshRef.current.material, flowDirection);
      meshRef.current.material.opacity = 0.25 + wave * 0.6;
    }
  });

  if (type === 'core-module') {
    return (
      <group>
        <primitive object={baseLineObject} />
        <primitive object={glowLineObject} />
        <primitive object={noisyLineObject} />
        {particleMaterials.map((particleMaterial, particleIndex) => (
          <mesh
            key={`arc-particle-${index}-${particleIndex}`}
            ref={(ref) => {
              particleRefs.current[particleIndex] = ref;
            }}
            geometry={particleGeometry}
            material={particleMaterial}
          />
        ))}
      </group>
    );
  }

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}
