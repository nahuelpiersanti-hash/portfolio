'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { DomainSlice } from './DomainSlice';
import { ModulesLayer } from './ModulesLayer';
import { EnergyCracksLayer } from './EnergyCracksLayer';
import { EnergyCore } from './EnergyCore';
import { generateModulePositions, PLANET_SPHERE_RADIUS } from '@/lib/module-generator';
import { generateEnergyNetwork } from '@/lib/crack-generator';
import { DOMAINS } from '@/types/systems-planet';

interface PlanetSphereProps {
  onDomainHover: (domainName: string | null) => void;
  onDomainSelect: (domainId: string) => void;
  onModuleHover: (moduleId: string | null) => void;
  onModuleSelect: (moduleId: string) => void;
  pulseIntensity: number;
  pulseTimeScale: number;
  orderedMode: boolean;
  pauseBlocks: boolean;
  visibleModules: number;
  rotateScene: boolean;
  selectedModuleId: string | null;
  designMode: boolean;
  showNormals: boolean;
  shellTuning: {
    targetCoverage: number;
    panelEdgeGapRatio: number;
    minScale: number;
    maxScale: number;
    gapMinRatio: number;
    gapMaxRatio: number;
  };
  interactionTuning: {
    focusLift: number;
    energyFocus: number;
    hierarchyFade: number;
  };
  modulePresets: Record<string, {
    enabled: boolean;
    scale: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
}

interface RuntimeModuleMetrics {
  id: string;
  position: { x: number; y: number; z: number };
  distanceToCore: number;
  scale: { x: number; y: number; z: number };
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

interface CoverageEstimate {
  coveredRatio: number;
  uncoveredRatio: number;
  sphereArea: number;
  coveredArea: number;
  uncoveredArea: number;
  sampledPoints: number;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function estimateSurfaceCoverage(
  modules: RuntimeModuleMetrics[],
  shellRadius: number,
  sampleCount: number = 24000
): CoverageEstimate {
  if (modules.length === 0 || shellRadius <= 0) {
    return {
      coveredRatio: 0,
      uncoveredRatio: 1,
      sphereArea: 0,
      coveredArea: 0,
      uncoveredArea: 0,
      sampledPoints: 0,
    };
  }

  const rng = createSeededRandom(20260309);
  const moduleCoverage = modules.map((module) => {
    const pos = module.position;
    const length = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
    const dir = {
      x: pos.x / length,
      y: pos.y / length,
      z: pos.z / length,
    };

    // Module is modeled as a plate (x/y). We approximate footprint by a circular cap
    // using its half-diagonal over the shell radius.
    const halfDiagonal = Math.sqrt(module.scale.x * module.scale.x + module.scale.y * module.scale.y) * 0.5;
    const angularRadius = Math.atan(halfDiagonal / shellRadius);

    return {
      dir,
      cosThreshold: Math.cos(angularRadius),
    };
  });

  let coveredSamples = 0;

  for (let i = 0; i < sampleCount; i++) {
    const z = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - z * z));

    const sample = {
      x: radial * Math.cos(theta),
      y: radial * Math.sin(theta),
      z,
    };

    let covered = false;
    for (let j = 0; j < moduleCoverage.length; j++) {
      const module = moduleCoverage[j];
      const dot =
        sample.x * module.dir.x +
        sample.y * module.dir.y +
        sample.z * module.dir.z;

      if (dot >= module.cosThreshold) {
        covered = true;
        break;
      }
    }

    if (covered) {
      coveredSamples += 1;
    }
  }

  const coveredRatio = coveredSamples / sampleCount;
  const uncoveredRatio = 1 - coveredRatio;
  const sphereArea = 4 * Math.PI * shellRadius * shellRadius;
  const coveredArea = sphereArea * coveredRatio;
  const uncoveredArea = sphereArea - coveredArea;

  return {
    coveredRatio,
    uncoveredRatio,
    sphereArea,
    coveredArea,
    uncoveredArea,
    sampledPoints: sampleCount,
  };
}

export function PlanetSphere({ 
  onDomainHover, 
  onDomainSelect,
  onModuleHover,
  onModuleSelect,
  pulseIntensity,
  pulseTimeScale,
  orderedMode,
  pauseBlocks,
  visibleModules,
  rotateScene,
  selectedModuleId,
  designMode,
  showNormals,
  shellTuning,
  interactionTuning,
  modulePresets,
}: PlanetSphereProps) {
  const coreRadius = 0.32;
  const groupRef = useRef<Group>(null);
  const teslaImpactVersionRef = useRef(0);
  const teslaImpactRef = useRef<{
    point: { x: number; y: number; z: number };
    pulse: number;
    version: number;
  } | null>(null);
  const metricsLoggedRef = useRef(false);
  const runtimeMetricsRef = useRef<Map<string, RuntimeModuleMetrics>>(new Map());
  const modules = useMemo(() => generateModulePositions(0.32, PLANET_SPHERE_RADIUS), []);
  const shellRadius = useMemo(
    () => modules.reduce((sum, module) => sum + module.position.length(), 0) / modules.length,
    [modules]
  );
  const energyNetwork = useMemo(
    () => {
      const geodesicConnections: Array<[number, number]> = [];
      const used = new Set<string>();

      modules.forEach((module, i) => {
        (module.neighbors ?? []).forEach((j) => {
          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          if (!used.has(key)) {
            used.add(key);
            geodesicConnections.push([a, b]);
          }
        });
      });

      return generateEnergyNetwork(
        modules.map((m) => m.position),
        coreRadius,
        shellRadius,
        geodesicConnections
      );
    },
    [modules, shellRadius]
  );
  const selectedModulePosition = useMemo(() => {
    if (!selectedModuleId) {
      return null;
    }

    const selected = modules.find((module) => module.id === selectedModuleId);
    return selected ? selected.position.clone() : null;
  }, [modules, selectedModuleId]);

  const printMetrics = useCallback(() => {
    const runtimeModules = Array.from(runtimeMetricsRef.current.values()).sort((a, b) => {
      const aNum = Number(a.id.replace('module-', ''));
      const bNum = Number(b.id.replace('module-', ''));
      return aNum - bNum;
    });

    const moduleCount = runtimeModules.length;
    const distances = runtimeModules.map((m) => m.distanceToCore);
    const scales = runtimeModules.map((m) => m.scale.x);

    const avgModuleDistance = distances.reduce((sum, value) => sum + value, 0) / moduleCount;
    const minModuleDistance = Math.min(...distances);
    const maxModuleDistance = Math.max(...distances);

    const avgModuleScale = scales.reduce((sum, value) => sum + value, 0) / moduleCount;
    const minModuleScale = Math.min(...scales);
    const maxModuleScale = Math.max(...scales);
    const coverage = estimateSurfaceCoverage(runtimeModules, shellRadius);

    let minSurfaceDistance = Number.POSITIVE_INFINITY;
    let modulesOverlapping = false;

    for (let i = 0; i < runtimeModules.length; i++) {
      const a = runtimeModules[i];
      const aMin = a.bounds.min;
      const aMax = a.bounds.max;

      for (let j = i + 1; j < runtimeModules.length; j++) {
        const b = runtimeModules[j];
        const bMin = b.bounds.min;
        const bMax = b.bounds.max;

        const dx = Math.max(aMin.x - bMax.x, bMin.x - aMax.x, 0);
        const dy = Math.max(aMin.y - bMax.y, bMin.y - aMax.y, 0);
        const dz = Math.max(aMin.z - bMax.z, bMin.z - aMax.z, 0);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minSurfaceDistance) {
          minSurfaceDistance = distance;
        }

        const intersects = !(
          aMax.x < bMin.x ||
          aMin.x > bMax.x ||
          aMax.y < bMin.y ||
          aMin.y > bMax.y ||
          aMax.z < bMin.z ||
          aMin.z > bMax.z
        );

        if (intersects) {
          modulesOverlapping = true;
        }
      }
    }

    const recommendedAdditionalScale = modulesOverlapping ? 0 : minSurfaceDistance * 0.5;

    const maxModuleExtent = runtimeModules.reduce((max, module) => {
      const halfDiagonal = Math.sqrt(3) * 0.5 * module.scale.x;
      return Math.max(max, module.distanceToCore + halfDiagonal);
    }, coreRadius);

    console.log('SYSTEM METRICS');
    console.log(`coreRadius: ${coreRadius.toFixed(4)}`);
    console.log(`moduleCount: ${moduleCount}`);
    console.log(`avgModuleDistance: ${avgModuleDistance.toFixed(4)}`);
    console.log(`minModuleDistance: ${minModuleDistance.toFixed(4)}`);
    console.log(`maxModuleDistance: ${maxModuleDistance.toFixed(4)}`);
    console.log(`avgModuleScale: ${avgModuleScale.toFixed(4)}`);
    console.log(`minModuleScale: ${minModuleScale.toFixed(4)}`);
    console.log(`maxModuleScale: ${maxModuleScale.toFixed(4)}`);
    console.log(`shellSurfaceArea: ${coverage.sphereArea.toFixed(4)}`);
    console.log(`coveredSurfaceAreaApprox: ${coverage.coveredArea.toFixed(4)} (${(coverage.coveredRatio * 100).toFixed(2)}%)`);
    console.log(`uncoveredSurfaceAreaApprox: ${coverage.uncoveredArea.toFixed(4)} (${(coverage.uncoveredRatio * 100).toFixed(2)}%)`);
    console.log(`coverageSamplingPoints: ${coverage.sampledPoints}`);
    console.log(`Minimum surface distance: ${minSurfaceDistance.toFixed(4)}`);
    console.log(`Modules overlapping: ${modulesOverlapping}`);
    console.log(`Recommended additional scale: ${recommendedAdditionalScale.toFixed(4)}`);
    console.log(`boundingSphereRadiusApprox: ${maxModuleExtent.toFixed(4)}`);

    console.log('MODULES');
    runtimeModules.forEach((module) => {
      const idNumber = Number(module.id.replace('module-', ''));
      const { x, y, z } = module.position;
      const scaleVector = `${module.scale.x.toFixed(4)},${module.scale.y.toFixed(4)},${module.scale.z.toFixed(4)}`;
      console.log(
        `id:${idNumber} position:${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)} distance:${module.distanceToCore.toFixed(4)} scale:${scaleVector}`
      );
    });
  }, [coreRadius]);

  const handleModuleMetrics = useCallback((metrics: RuntimeModuleMetrics) => {
    runtimeMetricsRef.current.set(metrics.id, metrics);

    if (!metricsLoggedRef.current && runtimeMetricsRef.current.size === modules.length) {
      metricsLoggedRef.current = true;
      printMetrics();
    }
  }, [modules.length, printMetrics]);

  // Slow ambient rotation
  useFrame(() => {
    if (groupRef.current && rotateScene) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const handleHover = (domainId: string | null) => {
    if (domainId) {
      const domain = DOMAINS.find((d) => d.id === domainId);
      onDomainHover(domain?.name || null);
    } else {
      onDomainHover(null);
    }
  };

  const handleSelect = (domainId: string) => {
    console.log('Domain selected:', domainId);
    onDomainSelect(domainId);
  };

  const handleTeslaImpact = useCallback((gapPoint: { x: number; y: number; z: number }, pulse: number) => {
    teslaImpactVersionRef.current += 1;
    teslaImpactRef.current = {
      point: { x: gapPoint.x, y: gapPoint.y, z: gapPoint.z },
      pulse,
      version: teslaImpactVersionRef.current,
    };
  }, []);

  return (
    <group ref={groupRef}>
      {/* Energy core at center (replaces large sphere) */}
      <EnergyCore />

      {/* Very subtle infrastructure shell base */}
      <mesh>
        <sphereGeometry args={[PLANET_SPHERE_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#0a1f2f" transparent opacity={0.08} />
      </mesh>

      {/* Domain slices (now invisible but logic preserved) */}
      {DOMAINS.map((domain) => (
        <DomainSlice
          key={domain.id}
          domain={domain}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      ))}

      {/* Energy channels: core->module and module->module gaps */}
      <EnergyCracksLayer
        channels={energyNetwork.channels}
        modulePositions={modules.map((m) => m.position)}
        coreRadius={coreRadius}
        selectedModulePosition={selectedModulePosition}
        focusIntensity={interactionTuning.energyFocus}
        onTeslaImpact={handleTeslaImpact}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
      />

      {/* Module nodes */}
      <ModulesLayer
        modules={modules}
        moduleInfluence={energyNetwork.moduleInfluence}
        orderedMode={orderedMode}
        paused={pauseBlocks}
        visibleCount={visibleModules}
        selectedModuleId={selectedModuleId}
        designMode={designMode}
        showNormals={showNormals}
        shellTuning={shellTuning}
        interactionTuning={interactionTuning}
        modulePresets={modulePresets}
        teslaImpactRef={teslaImpactRef}
        onModuleHover={onModuleHover}
        onModuleSelect={onModuleSelect}
        onModuleMetrics={handleModuleMetrics}
      />
    </group>
  );
}
