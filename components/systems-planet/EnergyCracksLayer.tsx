'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EnergyCrack } from './EnergyCrack';
import { EnergyChannel } from '@/lib/crack-generator';

interface EnergyCracksLayerProps {
  channels: EnergyChannel[];
  modulePositions: THREE.Vector3[];
  coreRadius: number;
  selectedModulePosition?: THREE.Vector3 | null;
  focusIntensity?: number;
  onTeslaImpact?: (gapPoint: { x: number; y: number; z: number }, pulse: number) => void;
  pulseIntensity?: number;
  pulseTimeScale?: number;
}

interface GapPoint {
  id: string;
  position: THREE.Vector3;
  dirA: THREE.Vector3;
  dirB: THREE.Vector3;
}

interface TeslaArcState {
  targetIndex: number;
  life: number;
  ttl: number;
  seed: number;
  opacity: number;
  trunkBasePoints: THREE.Vector3[];
  branchBasePoints: THREE.Vector3[] | null;
}

interface PlasmaParticleState {
  gapIndex: number;
  progress: number;
  speed: number;
}

function getCorePulse(time: number, intensity: number, timeScale: number): number {
  const base = 0.5 + Math.sin(time * 1.75 * timeScale) * 0.5;
  const eased = THREE.MathUtils.smoothstep(base, 0, 1);
  const slowRise = eased * eased;
  const raw = 0.22 + slowRise * 0.34;
  return THREE.MathUtils.clamp(raw * intensity, 0.08, 1.0);
}

function getFocusFactor(point: THREE.Vector3, selectedModulePosition?: THREE.Vector3 | null): number {
  if (!selectedModulePosition) {
    return 0;
  }

  const a = point.clone().normalize();
  const b = selectedModulePosition.clone().normalize();
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const angle = Math.acos(dot);
  const t = THREE.MathUtils.clamp(1 - angle / 0.8, 0, 1);
  return t * t * t;
}

function DirectedCorePulse({
  coreRadius,
  selectedModulePosition,
  pulseIntensity,
  pulseTimeScale,
  focusIntensity,
}: {
  coreRadius: number;
  selectedModulePosition?: THREE.Vector3 | null;
  pulseIntensity: number;
  pulseTimeScale: number;
  focusIntensity: number;
}) {
  const points = useMemo(() => {
    if (!selectedModulePosition) {
      return [] as THREE.Vector3[];
    }

    const dir = selectedModulePosition.clone().normalize();
    const start = dir.clone().multiplyScalar(coreRadius * 1.07);
    const end = selectedModulePosition.clone().multiplyScalar(0.98);
    const mid = start.clone().lerp(end, 0.5);
    const tangent = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (tangent.lengthSq() > 1e-8) {
      tangent.normalize();
    }

    const c1 = mid.clone().addScaledVector(tangent, 0.05);
    const curve = new THREE.CatmullRomCurve3([start, c1, end], false, 'catmullrom', 0.45);
    return curve.getPoints(28);
  }, [coreRadius, selectedModulePosition]);

  const glowGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const coreGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const glowMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#53dcff',
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const coreMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#d4f6ff',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  const glowLine = useMemo(() => new THREE.Line(glowGeometry, glowMaterial), [glowGeometry, glowMaterial]);
  const coreLine = useMemo(() => new THREE.Line(coreGeometry, coreMaterial), [coreGeometry, coreMaterial]);

  useEffect(() => {
    return () => {
      glowGeometry.dispose();
      coreGeometry.dispose();
      glowMaterial.dispose();
      coreMaterial.dispose();
    };
  }, [coreGeometry, coreMaterial, glowGeometry, glowMaterial]);

  useEffect(() => {
    if (points.length === 0) {
      glowGeometry.setDrawRange(0, 0);
      coreGeometry.setDrawRange(0, 0);
      return;
    }

    glowGeometry.setFromPoints(points);
    coreGeometry.setFromPoints(points);
  }, [coreGeometry, glowGeometry, points]);

  useFrame(({ clock }) => {
    if (!selectedModulePosition) {
      return;
    }

    const pulse = getCorePulse(clock.getElapsedTime(), pulseIntensity, pulseTimeScale);
    const gain = THREE.MathUtils.clamp(focusIntensity, 0, 3);

    glowMaterial.opacity = (0.25 + pulse * 0.55) * (0.55 + gain * 0.45);
    coreMaterial.opacity = (0.45 + pulse * 0.42) * (0.5 + gain * 0.5);
  });

  if (!selectedModulePosition || points.length === 0) {
    return null;
  }

  return (
    <group name="directed-core-pulse">
      <primitive object={glowLine} />
      <primitive object={coreLine} />
    </group>
  );
}

function buildTeslaPoints(
  target: THREE.Vector3,
  coreRadius: number,
  seed: number,
  segmentCount: number
): THREE.Vector3[] {
  const targetDir = target.clone().normalize();
  const targetRadius = target.length();
  const start = targetDir.clone().multiplyScalar(coreRadius * 1.06);
  const end = targetDir.clone().multiplyScalar(targetRadius * 0.985);

  const upHint = Math.abs(targetDir.y) > 0.96 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangentA = new THREE.Vector3().crossVectors(targetDir, upHint).normalize();
  const tangentB = new THREE.Vector3().crossVectors(targetDir, tangentA).normalize();

  const m1 = start.clone().lerp(end, 0.32);
  const m2 = start.clone().lerp(end, 0.68);
  const wobbleA = 0.11 + 0.04 * Math.sin(seed * 2.3);
  const wobbleB = 0.1 + 0.05 * Math.cos(seed * 1.9);

  const c1 = m1
    .clone()
    .add(tangentA.clone().multiplyScalar(Math.sin(seed * 3.7) * wobbleA))
    .add(tangentB.clone().multiplyScalar(Math.cos(seed * 4.1) * wobbleA * 0.8));

  const c2 = m2
    .clone()
    .add(tangentA.clone().multiplyScalar(Math.cos(seed * 2.8) * wobbleB))
    .add(tangentB.clone().multiplyScalar(Math.sin(seed * 5.2) * wobbleB * 0.75));

  const curve = new THREE.CatmullRomCurve3([start, c1, c2, end], false, 'catmullrom', 0.3);
  return curve.getPoints(segmentCount);
}

function GapVolumetricPlanes({
  gapPoints,
  maxDistance,
  pulseIntensity,
  pulseTimeScale,
  selectedModulePosition,
  focusIntensity,
}: {
  gapPoints: GapPoint[];
  maxDistance: number;
  pulseIntensity: number;
  pulseTimeScale: number;
  selectedModulePosition?: THREE.Vector3 | null;
  focusIntensity: number;
}) {
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);

  const planeData = useMemo(
    () =>
      gapPoints.map((gap, i) => {
        const normal = gap.position.clone().normalize();
        return {
          id: `vol-${gap.id}`,
          normal,
          position: gap.position.clone().addScaledVector(normal, -0.03),
          width: 0.18 + (i % 5) * 0.014,
          height: 0.07 + (i % 3) * 0.01,
          phase: i * 0.37,
          focus: getFocusFactor(gap.position, selectedModulePosition),
        };
      }),
    [gapPoints, selectedModulePosition]
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const pulse = getCorePulse(time, pulseIntensity, pulseTimeScale);

    for (let i = 0; i < planeData.length; i++) {
      const mesh = meshRefs.current[i];
      const plane = planeData[i];
      if (!mesh || !plane) {
        continue;
      }

      const dist = plane.position.length();
      const proximity = 1 - THREE.MathUtils.clamp(dist / maxDistance, 0, 1);
      const energy = pulse * (0.2 + proximity * 0.4 + plane.focus * 2.2 * focusIntensity);
      const flicker = 0.9 + Math.sin(time * 6 + plane.phase) * 0.1;

      mesh.position.copy(plane.position);
      mesh.lookAt(plane.normal.clone().multiplyScalar(2));
      mesh.scale.setScalar(0.92 + pulse * 0.12);
      const material = mesh.material;
      if (!Array.isArray(material) && 'opacity' in material) {
        material.opacity = (0.025 + pulse * 0.09) * energy * flicker;
      }
    }
  });

  return (
    <group name="gap-volumetric-planes">
      {planeData.map((plane, i) => (
        <mesh
          key={plane.id}
          ref={(ref) => {
            meshRefs.current[i] = ref;
          }}
          position={plane.position}
        >
          <planeGeometry args={[plane.width, plane.height]} />
          <meshBasicMaterial
            color="#6fe8ff"
            transparent
            opacity={0.04}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function GapPlasmaParticles({
  gapPoints,
  maxDistance,
  pulseIntensity,
  pulseTimeScale,
  selectedModulePosition,
  focusIntensity,
}: {
  gapPoints: GapPoint[];
  maxDistance: number;
  pulseIntensity: number;
  pulseTimeScale: number;
  selectedModulePosition?: THREE.Vector3 | null;
  focusIntensity: number;
}) {
  const particleCount = Math.min(140, Math.max(24, gapPoints.length * 3));

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(particleCount * 3), 3));
    g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Float32Array(particleCount), 1));
    return g;
  }, [particleCount]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color('#7be8ff') },
          uPulse: { value: 0.5 },
        },
        vertexShader: `
          attribute float aAlpha;
          varying float vAlpha;
          uniform float uPulse;

          void main() {
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (3.0 + 4.0 * aAlpha + uPulse * 2.0) * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uPulse;
          varying float vAlpha;

          void main() {
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float d = dot(uv, uv);
            if (d > 1.0) discard;
            float falloff = smoothstep(1.0, 0.0, d);
            vec3 color = uColor * (0.4 + uPulse * 0.6);
            gl_FragColor = vec4(color, vAlpha * falloff);
          }
        `,
      }),
    []
  );

  const statesRef = useRef<PlasmaParticleState[]>(
    Array.from({ length: particleCount }, () => ({
      gapIndex: 0,
      progress: Math.random(),
      speed: 0.7 + Math.random() * 0.9,
    }))
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const respawn = (state: PlasmaParticleState) => {
    if (gapPoints.length === 0) {
      return;
    }

    const focusBiasChance = THREE.MathUtils.clamp(0.35 + 0.37 * focusIntensity, 0, 0.95);
    if (selectedModulePosition && Math.random() < focusBiasChance) {
      let bestIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < gapPoints.length; i++) {
        const score = getFocusFactor(gapPoints[i].position, selectedModulePosition);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      state.gapIndex = bestIndex;
    } else {
      state.gapIndex = Math.floor(Math.random() * gapPoints.length);
    }

    state.progress = 0;
    state.speed = 0.7 + Math.random() * 0.9;
  };

  useEffect(() => {
    if (gapPoints.length === 0) {
      return;
    }
    statesRef.current.forEach((state) => respawn(state));
  }, [gapPoints, selectedModulePosition]);

  useFrame(({ clock }, delta) => {
    if (gapPoints.length === 0) {
      return;
    }

    const pulse = getCorePulse(clock.getElapsedTime(), pulseIntensity, pulseTimeScale);
    material.uniforms.uPulse.value = pulse;

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const alphas = geometry.attributes.aAlpha as THREE.BufferAttribute;

    for (let i = 0; i < statesRef.current.length; i++) {
      const state = statesRef.current[i];
      state.progress += delta * state.speed;

      if (state.progress >= 1) {
        respawn(state);
      }

      const gap = gapPoints[state.gapIndex] ?? gapPoints[0];
      const normal = gap.position.clone().normalize();
      const outward = 0.01 + state.progress * 0.22;
      const point = gap.position.clone().addScaledVector(normal, outward);

      const dist = point.length();
      const proximity = 1 - THREE.MathUtils.clamp(dist / maxDistance, 0, 1);
      const focus = getFocusFactor(gap.position, selectedModulePosition);
      const energy = pulse * (0.22 + proximity * 0.38 + focus * 2.15 * focusIntensity);
      const alpha = (1 - state.progress) * 0.55 * energy;

      positions.setXYZ(i, point.x, point.y, point.z);
      alphas.setX(i, alpha);
    }

    positions.needsUpdate = true;
    alphas.needsUpdate = true;
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

function CoreEnergyHalo({
  coreRadius,
  pulseIntensity,
  pulseTimeScale,
}: {
  coreRadius: number;
  pulseIntensity: number;
  pulseTimeScale: number;
}) {
  const meshRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>(null);

  useFrame(({ clock }) => {
    const pulse = getCorePulse(clock.getElapsedTime(), pulseIntensity, pulseTimeScale);

    if (!meshRef.current) {
      return;
    }

    const baseScale = 1.0;
    const scalePulse = 1 + pulse * 0.1;
    meshRef.current.scale.setScalar(baseScale * scalePulse);
    meshRef.current.material.opacity = 0.035 + pulse * 0.07;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[coreRadius * 1.9, 28, 28]} />
      <meshBasicMaterial
        color="#5ad9ff"
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function buildGapPoints(modulePositions: THREE.Vector3[]): { gapPoints: GapPoint[]; baseRadius: number } {
  if (modulePositions.length < 2) {
    return { gapPoints: [], baseRadius: 1 };
  }

  const baseRadius =
    modulePositions.reduce((sum, p) => sum + p.length(), 0) / Math.max(1, modulePositions.length);
  const dirs = modulePositions.map((p) => p.clone().normalize());
  const pairs = new Set<string>();
  const gapPoints: GapPoint[] = [];

  for (let i = 0; i < dirs.length; i++) {
    const neighbors: Array<{ index: number; angle: number }> = [];

    for (let j = 0; j < dirs.length; j++) {
      if (i === j) {
        continue;
      }

      const dot = THREE.MathUtils.clamp(dirs[i].dot(dirs[j]), -1, 1);
      const angle = Math.acos(dot);

      if (angle > 0.08 && angle < 0.62) {
        neighbors.push({ index: j, angle });
      }
    }

    neighbors.sort((a, b) => a.angle - b.angle);
    const nearby = neighbors.slice(0, 2);

    for (let k = 0; k < nearby.length; k++) {
      const j = nearby[k].index;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;

      if (pairs.has(key)) {
        continue;
      }
      pairs.add(key);

      const dirA = dirs[i];
      const dirB = dirs[j];
      const gapDir = dirA.clone().add(dirB).multiplyScalar(0.5).normalize();
      const gapPosition = gapDir.clone().multiplyScalar(baseRadius);

      gapPoints.push({
        id: `gap-${key}`,
        position: gapPosition,
        dirA: dirA.clone(),
        dirB: dirB.clone(),
      });
    }
  }

  return { gapPoints, baseRadius };
}

function buildTeslaBranchPoints(
  trunkPoints: THREE.Vector3[],
  seed: number
): THREE.Vector3[] | null {
  if (trunkPoints.length < 6 || Math.sin(seed * 0.73) < 0.25) {
    return null;
  }

  const midIndex = Math.floor(trunkPoints.length * 0.45);
  const start = trunkPoints[midIndex].clone();
  const next = trunkPoints[Math.min(trunkPoints.length - 1, midIndex + 1)].clone();
  const tangent = next.sub(start).normalize();
  const radial = start.clone().normalize();
  const side = new THREE.Vector3().crossVectors(tangent, radial).normalize();
  const direction = side.multiplyScalar(Math.sin(seed * 3.1) > 0 ? 1 : -1);
  const length = 0.14 + (0.06 * (0.5 + 0.5 * Math.sin(seed * 1.7)));

  const c1 = start.clone().add(direction.clone().multiplyScalar(length * 0.45));
  const end = start
    .clone()
    .add(direction.clone().multiplyScalar(length))
    .add(radial.clone().multiplyScalar(length * 0.12));

  const curve = new THREE.CatmullRomCurve3([start, c1, end], false, 'catmullrom', 0.35);
  return curve.getPoints(7);
}

function GapCrackLines({
  gapPoints,
  maxDistance,
  pulseIntensity,
  pulseTimeScale,
  selectedModulePosition,
  focusIntensity,
}: {
  gapPoints: GapPoint[];
  maxDistance: number;
  pulseIntensity: number;
  pulseTimeScale: number;
  selectedModulePosition?: THREE.Vector3 | null;
  focusIntensity: number;
}) {
  const crackObjects = useMemo(() => {
    return gapPoints.map((gap, index) => {
      const seamDir = gap.dirB.clone().sub(gap.dirA).normalize();
      const radial = gap.position.clone().normalize();
      const tangent = new THREE.Vector3().crossVectors(seamDir, radial).normalize();
      const length = 0.06;

      const p0 = gap.position.clone().add(seamDir.clone().multiplyScalar(-length));
      const p1 = gap.position.clone().add(tangent.clone().multiplyScalar(0.012));
      const p2 = gap.position.clone().add(seamDir.clone().multiplyScalar(length));

      const curve = new THREE.CatmullRomCurve3([p0, p1, p2], false, 'catmullrom', 0.45);
      const points = curve.getPoints(16);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: '#4dd0ff',
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return {
        id: `gap-crack-${index}`,
        line: new THREE.Line(geometry, material),
        material,
      };
    });
  }, [gapPoints]);

  useEffect(() => {
    return () => {
      crackObjects.forEach((entry) => {
        entry.line.geometry.dispose();
        entry.material.dispose();
      });
    };
  }, [crackObjects]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const pulse = getCorePulse(time, pulseIntensity, pulseTimeScale);
    crackObjects.forEach((entry, i) => {
      const positions = entry.line.geometry.attributes.position as THREE.BufferAttribute;
      let proximityAccum = 0;

      for (let p = 0; p < positions.count; p++) {
        const x = positions.getX(p);
        const y = positions.getY(p);
        const z = positions.getZ(p);
        const dist = Math.sqrt(x * x + y * y + z * z);
        const proximity = 1 - THREE.MathUtils.clamp(dist / maxDistance, 0, 1);
        proximityAccum += proximity;
      }

      const proximity = proximityAccum / Math.max(1, positions.count);
      const centroid = gapPoints[i]?.position;
      const focus = centroid ? getFocusFactor(centroid, selectedModulePosition) : 0;
      const energy = pulse * (0.24 + proximity * 0.38 + focus * 2.45 * focusIntensity);
      entry.material.opacity = (0.34 + pulse * 0.88 + Math.sin(time * 4 + i * 0.37) * 0.04) * energy;
    });
  });

  return (
    <group name="gap-crack-lines">
      {crackObjects.map((entry) => (
        <primitive key={entry.id} object={entry.line} />
      ))}
    </group>
  );
}

function TeslaCoilArcs({
  gapPoints,
  coreRadius,
  maxDistance,
  selectedModulePosition,
  focusIntensity,
  onTeslaImpact,
  pulseIntensity,
  pulseTimeScale,
}: {
  gapPoints: GapPoint[];
  coreRadius: number;
  maxDistance: number;
  selectedModulePosition?: THREE.Vector3 | null;
  focusIntensity: number;
  onTeslaImpact?: (gapPoint: { x: number; y: number; z: number }, pulse: number) => void;
  pulseIntensity: number;
  pulseTimeScale: number;
}) {
  const arcCount = Math.max(4, Math.floor(gapPoints.length * 0.2));

  const statesRef = useRef<TeslaArcState[]>(
    Array.from({ length: arcCount }, (_, i) => ({
      targetIndex: gapPoints.length === 0 ? 0 : Math.floor(Math.random() * gapPoints.length),
      life: 0,
      ttl: 0.2 + Math.random() * 0.2,
      seed: i * 1.73 + Math.random() * 10,
      opacity: 0,
      trunkBasePoints: [],
      branchBasePoints: null,
    }))
  );

  const respawnArc = (state: TeslaArcState) => {
    if (gapPoints.length === 0) {
      return;
    }

    state.life = 0;
    state.ttl = 0.2 + Math.random() * 0.2;
    const focusBiasChance = THREE.MathUtils.clamp(0.38 + 0.4 * focusIntensity, 0, 0.96);
    if (selectedModulePosition && Math.random() < focusBiasChance) {
      let bestIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < gapPoints.length; i++) {
        const score = getFocusFactor(gapPoints[i].position, selectedModulePosition);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      state.targetIndex = bestIndex;
    } else {
      state.targetIndex = Math.floor(Math.random() * gapPoints.length);
    }

    state.seed = Math.random() * 1000;
    state.opacity = 1;

    const target = gapPoints[state.targetIndex]?.position ?? gapPoints[0].position;
    const trunkSegments = 10 + Math.floor(Math.random() * 5);
    state.trunkBasePoints = buildTeslaPoints(target, coreRadius, state.seed, trunkSegments);
    state.branchBasePoints = buildTeslaBranchPoints(state.trunkBasePoints, state.seed);
  };

  const arcObjects = useMemo(() => {
    return Array.from({ length: arcCount }, (_, i) => {
      const maxPoints = 15;
      const branchPoints = 8;

      const trunkGlowGeometry = new THREE.BufferGeometry();
      trunkGlowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxPoints * 3), 3));
      const trunkCoreGeometry = new THREE.BufferGeometry();
      trunkCoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxPoints * 3), 3));
      const branchGlowGeometry = new THREE.BufferGeometry();
      branchGlowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(branchPoints * 3), 3));
      const branchCoreGeometry = new THREE.BufferGeometry();
      branchCoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(branchPoints * 3), 3));

      const glowMaterial = new THREE.LineBasicMaterial({
        color: '#80e7ff',
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const coreMaterial = new THREE.LineBasicMaterial({
        color: '#c7f3ff',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const trunkGlow = new THREE.Line(trunkGlowGeometry, glowMaterial);
      const trunkCore = new THREE.Line(trunkCoreGeometry, coreMaterial);
      const branchGlow = new THREE.Line(branchGlowGeometry, glowMaterial);
      const branchCore = new THREE.Line(branchCoreGeometry, coreMaterial);

      return {
        id: `tesla-arc-${i}`,
        trunkGlow,
        trunkCore,
        branchGlow,
        branchCore,
        glowMaterial,
        coreMaterial,
        trunkGlowGeometry,
        trunkCoreGeometry,
        branchGlowGeometry,
        branchCoreGeometry,
      };
    });
  }, [arcCount]);

  useEffect(() => {
    return () => {
      arcObjects.forEach((entry) => {
        entry.trunkGlowGeometry.dispose();
        entry.trunkCoreGeometry.dispose();
        entry.branchGlowGeometry.dispose();
        entry.branchCoreGeometry.dispose();
        entry.glowMaterial.dispose();
        entry.coreMaterial.dispose();
      });
    };
  }, [arcObjects]);

  useEffect(() => {
    if (gapPoints.length === 0) {
      return;
    }

    statesRef.current.forEach((state) => {
      respawnArc(state);
    });
  }, [gapPoints, selectedModulePosition]);

  const updateGeometry = (geometry: THREE.BufferGeometry, points: THREE.Vector3[]) => {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const p = points[Math.min(points.length - 1, i)] ?? new THREE.Vector3();
      positions.setXYZ(i, p.x, p.y, p.z);
    }
    positions.needsUpdate = true;
    geometry.setDrawRange(0, points.length);
    geometry.computeBoundingSphere();
  };

  const animateArcPoints = (basePoints: THREE.Vector3[], time: number, seed: number): THREE.Vector3[] => {
    return basePoints.map((basePoint, i) => {
      const radial = basePoint.clone().normalize();
      const upHint = Math.abs(radial.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const tangentA = new THREE.Vector3().crossVectors(radial, upHint).normalize();
      const tangentB = new THREE.Vector3().crossVectors(radial, tangentA).normalize();

      const offsetA = Math.sin(time * 6 + i + seed * 0.15) * 0.02;
      const offsetB = Math.cos(time * 5 + i * 1.3 + seed * 0.21) * 0.02;

      return basePoint
        .clone()
        .add(tangentA.multiplyScalar(offsetA))
        .add(tangentB.multiplyScalar(offsetB));
    });
  };

  useFrame(({ clock }, delta) => {
    if (gapPoints.length === 0) {
      return;
    }

    const time = clock.getElapsedTime();
    const pulse = getCorePulse(time, pulseIntensity, pulseTimeScale);

    arcObjects.forEach((entry, i) => {
      const state = statesRef.current[i];
      state.life += delta;

      if (state.life >= state.ttl) {
        respawnArc(state);
        const impactPoint = gapPoints[state.targetIndex]?.position;
        if (impactPoint) {
          onTeslaImpact?.({ x: impactPoint.x, y: impactPoint.y, z: impactPoint.z }, pulse);
        }
      }

      const trunkPoints = animateArcPoints(state.trunkBasePoints, time, state.seed);
      const branchPoints = state.branchBasePoints
        ? animateArcPoints(state.branchBasePoints, time, state.seed + 3.17)
        : null;

      updateGeometry(entry.trunkGlowGeometry, trunkPoints);
      updateGeometry(entry.trunkCoreGeometry, trunkPoints);
      if (branchPoints && branchPoints.length > 0) {
        updateGeometry(entry.branchGlowGeometry, branchPoints);
        updateGeometry(entry.branchCoreGeometry, branchPoints);
      } else {
        entry.branchGlowGeometry.setDrawRange(0, 0);
        entry.branchCoreGeometry.setDrawRange(0, 0);
      }

      let proximityAccum = 0;
      for (let p = 0; p < trunkPoints.length; p++) {
        const dist = trunkPoints[p].length();
        const proximity = 1 - THREE.MathUtils.clamp(dist / maxDistance, 0, 1);
        proximityAccum += proximity;
      }

      state.opacity *= 0.96;
      const lifeFade = THREE.MathUtils.clamp(state.opacity, 0, 1);
      const proximity = proximityAccum / Math.max(1, trunkPoints.length);
      const targetGap = gapPoints[state.targetIndex]?.position;
      const focus = targetGap ? getFocusFactor(targetGap, selectedModulePosition) : 0;
      const energy = pulse * (0.24 + proximity * 0.34 + focus * 2.7 * focusIntensity);
      entry.glowMaterial.opacity = (0.24 + pulse * 0.46) * lifeFade * energy;
      entry.coreMaterial.opacity = (0.62 + pulse * 0.32) * lifeFade * energy;
    });
  });

  return (
    <group name="tesla-coil-arcs">
      {arcObjects.map((entry) => (
        <group key={entry.id}>
          <primitive object={entry.trunkGlow} />
          <primitive object={entry.trunkCore} />
          <primitive object={entry.branchGlow} />
          <primitive object={entry.branchCore} />
        </group>
      ))}
    </group>
  );
}

export function EnergyCracksLayer({
  channels,
  modulePositions,
  coreRadius,
  selectedModulePosition,
  focusIntensity = 1,
  onTeslaImpact,
  pulseIntensity = 1,
  pulseTimeScale = 1,
}: EnergyCracksLayerProps) {
  const fieldLines = channels.filter((channel) => channel.type === 'core-module');
  const { gapPoints, baseRadius } = useMemo(() => buildGapPoints(modulePositions), [modulePositions]);
  const maxDistance = useMemo(
    () => Math.max(baseRadius, coreRadius, 0.001),
    [baseRadius, coreRadius]
  );

  return (
    <group name="energy-cracks-layer">
      <DirectedCorePulse
        coreRadius={coreRadius}
        selectedModulePosition={selectedModulePosition}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
        focusIntensity={focusIntensity}
      />
      <CoreEnergyHalo
        coreRadius={coreRadius}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
      />
      {fieldLines.map((channel, index) => (
        <EnergyCrack
          key={`crack-${index}`}
          path={channel.path}
          index={index}
          type={channel.type}
        />
      ))}
      <GapVolumetricPlanes
        gapPoints={gapPoints}
        maxDistance={maxDistance}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
        selectedModulePosition={selectedModulePosition}
        focusIntensity={focusIntensity}
      />
      <GapCrackLines
        gapPoints={gapPoints}
        maxDistance={maxDistance}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
        selectedModulePosition={selectedModulePosition}
        focusIntensity={focusIntensity}
      />
      <TeslaCoilArcs
        gapPoints={gapPoints}
        coreRadius={coreRadius}
        maxDistance={maxDistance}
        selectedModulePosition={selectedModulePosition}
        focusIntensity={focusIntensity}
        onTeslaImpact={onTeslaImpact}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
      />
      <GapPlasmaParticles
        gapPoints={gapPoints}
        maxDistance={maxDistance}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
        selectedModulePosition={selectedModulePosition}
        focusIntensity={focusIntensity}
      />
    </group>
  );
}
