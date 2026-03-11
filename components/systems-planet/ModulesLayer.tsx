'use client';

import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ModuleNode } from './ModuleNode';
import { ModuleData } from '@/lib/module-generator';
import { ModuleEnergyInfluence } from '@/lib/crack-generator';

const DEFAULT_SHELL_TUNING = {
  targetCoverage: 0.935,
  panelEdgeGapRatio: 0.016,
  minScale: 0.175,
  maxScale: 0.45,
  gapMinRatio: 0.0032,
  gapMaxRatio: 0.0095,
};

interface ShellTuning {
  targetCoverage: number;
  panelEdgeGapRatio: number;
  minScale: number;
  maxScale: number;
  gapMinRatio: number;
  gapMaxRatio: number;
}

interface ModulesLayerProps {
  modules: ModuleData[];
  moduleInfluence: ModuleEnergyInfluence[];
  orderedMode?: boolean;
  paused?: boolean;
  visibleCount?: number;
  selectedModuleId?: string | null;
  designMode?: boolean;
  showNormals?: boolean;
  shellTuning?: Partial<ShellTuning>;
  modulePresets?: Record<string, {
    enabled: boolean;
    scale: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
  teslaImpactRef?: MutableRefObject<{
    point: { x: number; y: number; z: number };
    pulse: number;
    version: number;
  } | null>;
    onModuleHover: (moduleId: string | null) => void;
    corePulse?: number;
    onModuleSelect: (moduleId: string) => void;
  onModuleMetrics?: (metrics: {
    id: string;
    position: { x: number; y: number; z: number };
    distanceToCore: number;
    scale: { x: number; y: number; z: number };
    bounds: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  }) => void;
}

interface SecondaryPlateData {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  scale: THREE.Vector3;
}

function SecondaryPlate({ plate }: { plate: SecondaryPlateData }) {
  const target = useMemo(() => plate.normal.clone().multiplyScalar(2), [plate.normal]);
  const insetPosition = useMemo(
    () => plate.position.clone().addScaledVector(plate.normal, -0.06),
    [plate.position, plate.normal]
  );

  return (
    <mesh
      position={insetPosition}
      scale={plate.scale}
      onUpdate={(mesh) => {
        mesh.lookAt(target);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#0a0f1a"
        roughness={0.92}
        metalness={0.08}
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </mesh>
  );
}

export function ModulesLayer({
  modules,
  moduleInfluence,
  orderedMode = false,
  paused = false,
  visibleCount,
  selectedModuleId,
  designMode = false,
  showNormals = false,
  shellTuning,
    modulePresets = {},
    teslaImpactRef,
    onModuleHover,
    corePulse = 0,
    onModuleSelect,
    onModuleMetrics,
}: ModulesLayerProps) {
  const baseRadius = useMemo(() => {
    if (modules.length === 0) {
      return 0.6 * 1.05 * 1.12;
    }
    const avg = modules.reduce((sum, module) => sum + module.position.length(), 0) / modules.length;
    return (avg + 0.05) * 1.05 * 1.12;
  }, [modules]);

  const dynamicPositionsRef = useRef<THREE.Vector3[]>([]);
  const visualPositionsRef = useRef<THREE.Vector3[]>([]);
  const idealPositions = useMemo(
    () => modules.map((module) => module.position.clone().normalize().multiplyScalar(baseRadius)),
    [baseRadius, modules]
  );
  const dragActiveIdRef = useRef<string | null>(null);
  const relaxFramesRef = useRef(800);
  const radialKickRef = useRef<number[]>(modules.map(() => 0));
  const vibrationRef = useRef<number[]>(modules.map(() => 0));
  const lastImpactVersionRef = useRef(-1);

  useEffect(() => {
    dynamicPositionsRef.current = modules.map((module) => module.position.clone().normalize().multiplyScalar(baseRadius));
    visualPositionsRef.current = modules.map((module) => module.position.clone().normalize().multiplyScalar(baseRadius));
  }, [baseRadius, modules]);

  const relaxedModuleSizes = useMemo(() => {
    const tuning: ShellTuning = { ...DEFAULT_SHELL_TUNING, ...(shellTuning ?? {}) };
    const minScale = tuning.minScale;
    const maxScale = tuning.maxScale;
    const positions = idealPositions;
    const widthRatio = 1;
    const heightRatio = 1;
    const depthRatio = 0.18;
    const halfDiagFactor = 0.5 * Math.sqrt(
      widthRatio * widthRatio + heightRatio * heightRatio + depthRatio * depthRatio
    );

    const sphereArea = 4 * Math.PI * baseRadius * baseRadius;
  const panelAreaTarget = (sphereArea * tuning.targetCoverage) / Math.max(1, positions.length);
    const basePanelSize = Math.sqrt(panelAreaTarget);

    const desiredSizes = modules.map((module) => {
      const sizeBias = module.size === 'large' ? 1.05 : module.size === 'medium' ? 1.01 : 0.99;
      const panelBias = module.panelKind === 'pent' ? 0.98 : 1.01;
      return basePanelSize * sizeBias * panelBias;
    });

    const localCaps = modules.map((_, i) => {
      let nearestCenterDistance = Number.POSITIVE_INFINITY;

      for (let j = 0; j < positions.length; j++) {
        if (i === j) {
          continue;
        }

        const centerDistance = positions[i].distanceTo(positions[j]);
        if (centerDistance < nearestCenterDistance) {
          nearestCenterDistance = centerDistance;
        }
      }

      const cap = nearestCenterDistance / (2 * halfDiagFactor + tuning.panelEdgeGapRatio);
      return THREE.MathUtils.clamp(cap, minScale, maxScale);
    });

    // Global gain to hit target coverage while respecting each local cap.
    let low = 0.6;
    let high = 1.8;

    for (let iter = 0; iter < 24; iter++) {
      const mid = (low + high) * 0.5;
      let coveredArea = 0;

      for (let i = 0; i < desiredSizes.length; i++) {
        const size = THREE.MathUtils.clamp(
          Math.min(desiredSizes[i] * mid, localCaps[i]),
          minScale,
          maxScale
        );
        coveredArea += (size * widthRatio) * (size * heightRatio);
      }

      const ratio = coveredArea / sphereArea;
      if (ratio < tuning.targetCoverage) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const gain = (low + high) * 0.5;
    const sizes = desiredSizes.map((desired, i) =>
      THREE.MathUtils.clamp(Math.min(desired * gain, localCaps[i]), minScale, maxScale)
    );

    // Final strict pass for tiny seams and no overlaps.
    const gapMin = baseRadius * tuning.gapMinRatio;
    const gapMax = baseRadius * tuning.gapMaxRatio;

    // Strict non-overlap pass with tiny visible gap.
    for (let iteration = 0; iteration < 160; iteration++) {
      let stabilized = true;

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const centerDistance = positions[i].distanceTo(positions[j]);
          const outerA = sizes[i] * halfDiagFactor;
          const outerB = sizes[j] * halfDiagFactor;
          const edgeDistance = centerDistance - (outerA + outerB);

          if (edgeDistance < gapMin) {
            stabilized = false;
            const deficit = gapMin - edgeDistance;
            const reduction = THREE.MathUtils.clamp(deficit * 0.45, 0.0013, 0.0095);
            sizes[i] = Math.max(minScale, sizes[i] - reduction * 0.5);
            sizes[j] = Math.max(minScale, sizes[j] - reduction * 0.5);
            continue;
          }

          // Gentle growth only when too separated, to keep shell coverage.
          if (edgeDistance > gapMax) {
            stabilized = false;
            const surplus = edgeDistance - gapMax;
            const growth = THREE.MathUtils.clamp(surplus * 0.18, 0.001, 0.0062);
            sizes[i] = Math.min(maxScale, sizes[i] + growth * 0.5);
            sizes[j] = Math.min(maxScale, sizes[j] + growth * 0.5);
          }
        }
      }

      if (stabilized) {
        break;
      }
    }

    return sizes;
  }, [baseRadius, idealPositions, modules, shellTuning]);

  const moduleXyPacking = useMemo(() => {
    // Keep XY deterministic and stable; occupancy is solved by scale model above.
    return modules.map(() => ({ x: 1, y: 1 }));
  }, [modules]);

  const secondaryPlates = useMemo(() => {
    const dirs = idealPositions.map((position) => position.clone().normalize());
    const candidates: SecondaryPlateData[] = [];
    const uniqueTriangles = new Set<string>();

    for (let i = 0; i < dirs.length; i++) {
      const distances: Array<{ index: number; angle: number }> = [];

      for (let j = 0; j < dirs.length; j++) {
        if (i === j) {
          continue;
        }

        const dot = THREE.MathUtils.clamp(dirs[i].dot(dirs[j]), -1, 1);
        const angle = Math.acos(dot);
        distances.push({ index: j, angle });
      }

      distances.sort((a, b) => a.angle - b.angle);
      if (distances.length < 2) {
        continue;
      }

      const b = distances[0].index;
      const c = distances[1].index;
      const tri = [i, b, c].sort((a, b) => a - b);
      const triKey = tri.join('-');

      if (uniqueTriangles.has(triKey)) {
        continue;
      }
      uniqueTriangles.add(triKey);

      const centroid = new THREE.Vector3()
        .add(dirs[i])
        .add(dirs[b])
        .add(dirs[c])
        .multiplyScalar(1 / 3)
        .normalize();

      const mainModuleScale = relaxedModuleSizes[i] ?? 0.2;
      const baseScale = mainModuleScale * 0.34;
      const thinRatio = 0.24;

      candidates.push({
        id: `secondary-${triKey}`,
        position: centroid.clone().multiplyScalar(baseRadius),
        normal: centroid,
        scale: new THREE.Vector3(baseScale, baseScale, baseScale * thinRatio),
      });
    }

    const targetCount = Math.floor(modules.length * 0.35);
    return candidates.slice(0, targetCount);
  }, [baseRadius, idealPositions, modules.length, relaxedModuleSizes]);

  const activeCount = useMemo(() => {
    if (visibleCount === undefined) {
      return modules.length;
    }
    return THREE.MathUtils.clamp(Math.floor(visibleCount), 0, modules.length);
  }, [modules.length, visibleCount]);

  const domainAnchors = useMemo(() => {
    const domains = Array.from(new Set(modules.map((module) => module.domain)));
    const anchors = new Map<string, THREE.Vector3>();

    domains.forEach((domain, index) => {
      const theta = (index / Math.max(1, domains.length)) * Math.PI * 2;
      const y = Math.sin(index * 1.7) * 0.28;
      const radial = Math.sqrt(Math.max(0.0001, 1 - y * y));

      anchors.set(
        domain,
        new THREE.Vector3(Math.cos(theta) * radial, y, Math.sin(theta) * radial).normalize()
      );
    });

    return anchors;
  }, [modules]);

  const handleDragStart = (moduleId: string) => {
    dragActiveIdRef.current = moduleId;
  };

  const handleDragMove = (moduleId: string, deltaX: number, deltaY: number) => {
    if (dragActiveIdRef.current !== moduleId) {
      return;
    }

    const index = modules.findIndex((module) => module.id === moduleId);
    if (index < 0) {
      return;
    }

    const position = dynamicPositionsRef.current[index];
    position.x += deltaX * 0.01;
    position.y -= deltaY * 0.01;
    position.normalize().multiplyScalar(baseRadius);
  };

  const handleDragEnd = (moduleId: string) => {
    if (dragActiveIdRef.current === moduleId) {
      dragActiveIdRef.current = null;
    }
  };

  useFrame((_, delta) => {
    if (paused) {
      return;
    }

    const positions = dynamicPositionsRef.current;
    const renderedPositions = visualPositionsRef.current;
    const count = activeCount;
    if (count === 0) {
      return;
    }

    const pulseOffset = 0.01 + corePulse * 0.01;

    // Ordered mode: keep strict brick layout without simulation drift.
    if (orderedMode) {
      for (let i = 0; i < count; i++) {
        const locked = idealPositions[i];
        positions[i].copy(locked);
        const dir = locked.clone().normalize();
        renderedPositions[i].copy(locked).addScaledVector(dir, pulseOffset * corePulse);
        radialKickRef.current[i] = THREE.MathUtils.lerp(radialKickRef.current[i] ?? 0, 0, 0.12);
        vibrationRef.current[i] = THREE.MathUtils.lerp(vibrationRef.current[i] ?? 0, 0, 0.12);
      }
      return;
    }

    const integration = delta * 60;
    const driftStrength = 0.00012;
    const anchorStrength = 0.0022;
    const separationStrength = 0.25;
    const tangentialRelax = 0.002;
    const tangentialNearBand = 0.16;
    const damping = 0.975;

    if (teslaImpactRef?.current && teslaImpactRef.current.version !== lastImpactVersionRef.current) {
      const impact = teslaImpactRef.current;
      lastImpactVersionRef.current = impact.version;
      const impactPoint = new THREE.Vector3(impact.point.x, impact.point.y, impact.point.z);

      for (let i = 0; i < count; i++) {
        if (positions[i].distanceTo(impactPoint) < 0.25) {
          radialKickRef.current[i] = Math.max(radialKickRef.current[i], 0.03 * impact.pulse);
          vibrationRef.current[i] = Math.max(vibrationRef.current[i], impact.pulse);
        }
      }
    }

    const dirs = positions.slice(0, count).map((position) => position.clone().normalize());
    const currentDirs = dirs.map((dir) => dir.clone());
    const idealDirs = idealPositions.slice(0, count).map((position) => position.clone().normalize());

    // 1) Soft drift toward ideal distribution anchors.
    for (let i = 0; i < count; i++) {
      if (dragActiveIdRef.current === modules[i].id) {
        continue;
      }

      dirs[i].lerp(idealDirs[i], driftStrength).normalize();

      if (orderedMode) {
        const anchor = domainAnchors.get(modules[i].domain);
        if (anchor) {
          dirs[i].lerp(anchor, anchorStrength * integration).normalize();
        }
      }
    }

    // 1.5) Startup-only repulsive relaxation to spread clusters before settling.
    if (relaxFramesRef.current > 0) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dirA = dirs[i];
          const dirB = dirs[j];
          const deltaDir = dirA.clone().sub(dirB);
          const dist = deltaDir.length();

          if (dist <= 1e-5) {
            continue;
          }

          const strength = 0.002 / (dist * dist);
          const push = deltaDir.normalize().multiplyScalar(strength);

          const iLocked = dragActiveIdRef.current === modules[i].id;
          const jLocked = dragActiveIdRef.current === modules[j].id;

          if (!iLocked) {
            const tangentPushA = push
              .clone()
              .sub(dirA.clone().multiplyScalar(push.dot(dirA)));
            if (tangentPushA.lengthSq() > 1e-12) {
              dirA.add(tangentPushA).normalize();
            }
          }

          if (!jLocked) {
            const tangentPushB = push
              .clone()
              .sub(dirB.clone().multiplyScalar(push.dot(dirB)));
            if (tangentPushB.lengthSq() > 1e-12) {
              dirB.sub(tangentPushB).normalize();
            }
          }
        }
      }

      relaxFramesRef.current -= 1;
    }

    // 2) Pairwise angular separation using module-size-based minimum angle.
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dirA = dirs[i];
        const dirB = dirs[j];

        const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
        const angle = Math.acos(dot);

        const sizeA = relaxedModuleSizes[i];
        const sizeB = relaxedModuleSizes[j];
        const angularA = Math.atan((sizeA * 0.5) / baseRadius);
        const angularB = Math.atan((sizeB * 0.5) / baseRadius);
        const pairEdgeGap = 0.08 * Math.min(sizeA, sizeB);
        const pairAngularGap = pairEdgeGap / baseRadius;
        const pairMinAngle = angularA + angularB + pairAngularGap;
        const deltaDir = dirA.clone().sub(dirB);
        const dist = deltaDir.length();

        if (dist < pairMinAngle * 0.7 && dist > 1e-5) {
          const boost = deltaDir.normalize().multiplyScalar(0.004);
          const iLocked = dragActiveIdRef.current === modules[i].id;
          const jLocked = dragActiveIdRef.current === modules[j].id;

          if (!iLocked) {
            dirA.add(boost);
          }
          if (!jLocked) {
            dirB.sub(boost);
          }

          dirA.normalize();
          dirB.normalize();
        }

        if (angle >= pairMinAngle || angle < 1e-5) {
          continue;
        }

        let axis = dirA.clone().cross(dirB);
        if (axis.lengthSq() < 1e-8) {
          axis = new THREE.Vector3(0, 1, 0);
        }
        axis.normalize();

        const correction = (pairMinAngle - angle) * separationStrength * integration;
        const iLocked = dragActiveIdRef.current === modules[i].id;
        const jLocked = dragActiveIdRef.current === modules[j].id;

        if (!iLocked && !jLocked) {
          dirA.applyAxisAngle(axis, correction);
          dirB.applyAxisAngle(axis, -correction);
        } else if (!iLocked) {
          dirA.applyAxisAngle(axis, correction * 2);
        } else if (!jLocked) {
          dirB.applyAxisAngle(axis, -correction * 2);
        }

        dirA.normalize();
        dirB.normalize();
        dirA.lerp(currentDirs[i], 0.85).normalize();
        dirB.lerp(currentDirs[j], 0.85).normalize();
      }
    }

    // 2.5) Tangential relaxation to improve local ordering without changing shell radius.
    const tangentialOffsets = Array.from({ length: count }, () => new THREE.Vector3());

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dirA = dirs[i];
        const dirB = dirs[j];

        const dot = THREE.MathUtils.clamp(dirA.dot(dirB), -1, 1);
        const angle = Math.acos(dot);

        const sizeA = relaxedModuleSizes[i];
        const sizeB = relaxedModuleSizes[j];
        const angularA = Math.atan((sizeA * 0.5) / baseRadius);
        const angularB = Math.atan((sizeB * 0.5) / baseRadius);
        const pairEdgeGap = 0.08 * Math.min(sizeA, sizeB);
        const pairAngularGap = pairEdgeGap / baseRadius;
        const pairMinAngle = angularA + angularB + pairAngularGap;

        if (angle <= pairMinAngle || angle >= pairMinAngle + tangentialNearBand) {
          continue;
        }

        const proximity = 1 - (angle - pairMinAngle) / tangentialNearBand;
        const strength = tangentialRelax * proximity * integration;

        const awayFromBOnA = dirB
          .clone()
          .sub(dirA.clone().multiplyScalar(dot));

        if (awayFromBOnA.lengthSq() > 1e-10) {
          awayFromBOnA.normalize().multiplyScalar(-strength);
          tangentialOffsets[i].add(awayFromBOnA);
        }

        const awayFromAOnB = dirA
          .clone()
          .sub(dirB.clone().multiplyScalar(dot));

        if (awayFromAOnB.lengthSq() > 1e-10) {
          awayFromAOnB.normalize().multiplyScalar(-strength);
          tangentialOffsets[j].add(awayFromAOnB);
        }
      }
    }

    for (let i = 0; i < count; i++) {
      if (dragActiveIdRef.current === modules[i].id) {
        continue;
      }

      const dir = dirs[i];
      const upHint = Math.abs(dir.y) > 0.98 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const tangentA = new THREE.Vector3().crossVectors(dir, upHint).normalize();
      const tangentB = new THREE.Vector3().crossVectors(dir, tangentA).normalize();

      const offsetX = tangentialOffsets[i].dot(tangentA);
      const offsetY = tangentialOffsets[i].dot(tangentB);

      dir
        .add(tangentA.multiplyScalar(offsetX))
        .add(tangentB.multiplyScalar(offsetY))
        .normalize();
    }

    // 3) Strong damping pass to suppress residual jitter.
    for (let i = 0; i < count; i++) {
      if (dragActiveIdRef.current === modules[i].id) {
        positions[i].normalize().multiplyScalar(baseRadius);
        const dragDir = positions[i].clone().normalize();
        renderedPositions[i].copy(positions[i]).addScaledVector(dragDir, pulseOffset * corePulse);
        radialKickRef.current[i] = THREE.MathUtils.lerp(radialKickRef.current[i], 0, 0.08);
        vibrationRef.current[i] = THREE.MathUtils.lerp(vibrationRef.current[i], 0, 0.08);
        continue;
      }

      const dir = dirs[i].normalize();
      dir.lerp(idealDirs[i], damping).normalize();
      const kick = radialKickRef.current[i] ?? 0;
      positions[i].copy(dir.multiplyScalar(baseRadius)).addScaledVector(dir, kick);
      renderedPositions[i].copy(positions[i]).addScaledVector(dir, pulseOffset * corePulse);
      radialKickRef.current[i] = THREE.MathUtils.lerp(kick, 0, 0.08);
      vibrationRef.current[i] = THREE.MathUtils.lerp(vibrationRef.current[i] ?? 0, 0, 0.08);
    }
  });

  return (
    <group name="modules-layer">
      {modules.slice(0, activeCount).map((module, index) => (
        (() => {
          const preset = modulePresets[module.id] ?? {
            enabled: true,
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
          };
          if (!preset.enabled) {
            return null;
          }

          return (
        <ModuleNode
          key={module.id}
          module={module}
          moduleScale={relaxedModuleSizes[index]}
          xyPacking={moduleXyPacking[index]}
          presetScale={preset.scale}
          presetRotation={preset.rotation}
          impactVibration={vibrationRef.current[index] ?? 0}
          energyNearby={moduleInfluence[index]?.affinity ?? 0}
          energyPhase={moduleInfluence[index]?.phase ?? 0}
          onHover={onModuleHover}
          onSelect={onModuleSelect}
          onMetricsReady={onModuleMetrics}
          dynamicPosition={visualPositionsRef.current[index] ?? dynamicPositionsRef.current[index] ?? module.position}
          showNormals={showNormals}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          corePulse={corePulse}
        />
          );
        })()
      ))}

      {activeCount === modules.length && secondaryPlates.map((plate) => (
        <SecondaryPlate key={plate.id} plate={plate} />
      ))}
    </group>
  );
}
