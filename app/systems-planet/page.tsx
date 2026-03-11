'use client';

import { useMemo, useState } from 'react';
import { SystemsPlanetCanvas } from '@/components/systems-planet';
import { generateModulePositions, PLANET_SPHERE_RADIUS } from '@/lib/module-generator';

type ModulePreset = {
  enabled: boolean;
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
};

type ShellTuningControls = {
  targetCoverage: number;
  panelEdgeGapRatio: number;
  minScale: number;
  maxScale: number;
  gapMinRatio: number;
  gapMaxRatio: number;
};

const FROZEN_SHELL_TUNING: ShellTuningControls = {
  targetCoverage: 0.939,
  panelEdgeGapRatio: 0.016,
  minScale: 0.175,
  maxScale: 0.517,
  gapMinRatio: 0.0032,
  gapMaxRatio: 0.0095,
};

const FROZEN_MODULE_PRESETS: Record<string, ModulePreset> = {
  'module-0': { enabled: true, scale: { x: 1, y: 1, z: 1.12 }, rotation: { x: 0, y: 0, z: 0.3141592653589793 } },
  'module-1': { enabled: true, scale: { x: 1, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-2': { enabled: true, scale: { x: 1, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: 0.6283185307179586 } },
  'module-3': { enabled: true, scale: { x: 1, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: 0.5585053606381855 } },
  'module-4': { enabled: true, scale: { x: 1, y: 1, z: 0.7 }, rotation: { x: 0, y: 0, z: -0.017453292519943295 } },
  'module-5': { enabled: true, scale: { x: 1, y: 1, z: 0.54 }, rotation: { x: 0, y: 0, z: -0.3141592653589793 } },
  'module-6': { enabled: true, scale: { x: 1, y: 1, z: 0.62 }, rotation: { x: 0, y: 0, z: -0.29670597283903605 } },
  'module-7': { enabled: true, scale: { x: 1, y: 1, z: 1.2 }, rotation: { x: 0, y: 0, z: -0.6108652381980153 } },
  'module-8': { enabled: true, scale: { x: 1, y: 1, z: 0.56 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-9': { enabled: true, scale: { x: 1, y: 1, z: 1.24 }, rotation: { x: 0, y: 0, z: -0.6457718232379019 } },
  'module-10': { enabled: true, scale: { x: 1, y: 1, z: 0.69 }, rotation: { x: 0, y: 0, z: 0.29670597283903605 } },
  'module-11': { enabled: true, scale: { x: 1, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-12': { enabled: true, scale: { x: 1, y: 1, z: 0.42 }, rotation: { x: 0, y: 0, z: -0.12217304763960307 } },
  'module-13': { enabled: true, scale: { x: 1, y: 1, z: 0.89 }, rotation: { x: 0, y: 0, z: 0.5235987755982988 } },
  'module-14': { enabled: true, scale: { x: 1, y: 1, z: 0.77 }, rotation: { x: 0, y: 0, z: -0.5410520681182421 } },
  'module-15': { enabled: true, scale: { x: 1, y: 1, z: 0.71 }, rotation: { x: 0, y: 0, z: 0.12217304763960307 } },
  'module-16': { enabled: true, scale: { x: 1.04, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: -0.4886921905584123 } },
  'module-17': { enabled: true, scale: { x: 1, y: 1, z: 0.74 }, rotation: { x: 0, y: 0, z: 0.13962634015954636 } },
  'module-18': { enabled: true, scale: { x: 1, y: 1, z: 1.23 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-19': { enabled: true, scale: { x: 1, y: 1, z: 0.68 }, rotation: { x: 0, y: 0, z: -0.5235987755982988 } },
  'module-20': { enabled: true, scale: { x: 1, y: 1, z: 0.72 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-21': { enabled: true, scale: { x: 1, y: 1, z: 0.4 }, rotation: { x: 0, y: 0, z: -0.20943951023931953 } },
  'module-22': { enabled: true, scale: { x: 1, y: 1, z: 0.85 }, rotation: { x: 0, y: 0, z: -0.13962634015954636 } },
  'module-23': { enabled: true, scale: { x: 1, y: 1, z: 0.85 }, rotation: { x: 0, y: 0, z: -0.5410520681182421 } },
  'module-24': { enabled: true, scale: { x: 1, y: 1, z: 1.16 }, rotation: { x: 0, y: 0, z: -0.5410520681182421 } },
  'module-25': { enabled: true, scale: { x: 1, y: 1, z: 0.76 }, rotation: { x: 0, y: 0, z: 0.12217304763960307 } },
  'module-26': { enabled: true, scale: { x: 1, y: 1, z: 0.71 }, rotation: { x: 0, y: 0, z: -0.5410520681182421 } },
  'module-27': { enabled: true, scale: { x: 1, y: 1, z: 1.22 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-28': { enabled: true, scale: { x: 1, y: 1, z: 0.67 }, rotation: { x: 0, y: 0, z: 0.13962634015954636 } },
  'module-29': { enabled: true, scale: { x: 1, y: 1, z: 1.24 }, rotation: { x: 0, y: 0, z: -0.15707963267948966 } },
  'module-30': { enabled: true, scale: { x: 1, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0 } },
  'module-31': { enabled: true, scale: { x: 1, y: 1, z: 0.57 }, rotation: { x: 0, y: 0, z: -0.5235987755982988 } },
};

const FROZEN_REACTOR = {
  pulseIntensity: 1,
  pulseTimeScale: 1,
  orderedMode: true,
  pauseBlocks: false,
  rotateScene: true,
  designMode: false,
  showNormals: false,
};

function createDefaultModulePreset(): ModulePreset {
  return {
    enabled: true,
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

export default function SystemsPlanetPage() {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const modules = useMemo(() => generateModulePositions(0.32, PLANET_SPHERE_RADIUS), []);

  const modulePresets = useMemo(() => {
    const map: Record<string, ModulePreset> = {};

    modules.forEach((module) => {
      const defaultPreset = createDefaultModulePreset();
      const frozenPreset = FROZEN_MODULE_PRESETS[module.id];

      if (!frozenPreset) {
        map[module.id] = defaultPreset;
        return;
      }

      map[module.id] = {
        enabled: frozenPreset.enabled,
        scale: {
          x: frozenPreset.scale.x,
          y: frozenPreset.scale.y,
          z: frozenPreset.scale.z,
        },
        rotation: {
          x: frozenPreset.rotation.x,
          y: frozenPreset.rotation.y,
          z: frozenPreset.rotation.z,
        },
      };
    });

    return map;
  }, [modules]);

  const hoveredModuleData = hoveredModule
    ? modules.find((module) => module.id === hoveredModule)
    : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0"
        style={{ cursor: hoveredDomain || hoveredModule ? 'pointer' : 'grab' }}
      >
        <SystemsPlanetCanvas
          onDomainHover={setHoveredDomain}
          onDomainSelect={() => {}}
          onModuleHover={setHoveredModule}
          onModuleSelect={setSelectedModule}
          pulseIntensity={FROZEN_REACTOR.pulseIntensity}
          pulseTimeScale={FROZEN_REACTOR.pulseTimeScale}
          orderedMode={FROZEN_REACTOR.orderedMode}
          pauseBlocks={FROZEN_REACTOR.pauseBlocks}
          visibleModules={modules.length}
          rotateScene={FROZEN_REACTOR.rotateScene}
          selectedModuleId={selectedModule}
          designMode={FROZEN_REACTOR.designMode}
          showNormals={FROZEN_REACTOR.showNormals}
          shellTuning={FROZEN_SHELL_TUNING}
          modulePresets={modulePresets}
        />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-8 top-8">
          <h1 className="text-sm font-medium tracking-wide text-white/80">Systems Planet</h1>
          <p className="mt-1 text-xs text-white/50">Interactive Portfolio</p>
        </div>

        <div className="absolute bottom-8 left-8 max-w-xs">
          <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 backdrop-blur-sm">
            <p className="text-xs leading-relaxed text-white/70">
              <strong className="text-white/90">Interact:</strong> Drag to rotate, hover modules to
              reveal systems, click to explore.
            </p>
          </div>
        </div>

        {hoveredModuleData && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-in fade-in zoom-in-95 duration-200 rounded-lg border border-white/20 bg-slate-900/90 px-6 py-3 backdrop-blur-sm">
              <p className="text-xl font-medium text-white">{hoveredModuleData.label}</p>
              <p className="mt-1 text-xs text-white/50 capitalize">
                {hoveredModuleData.domain.replace(/-/g, ' ')} - {hoveredModuleData.size}
              </p>
            </div>
          </div>
        )}

        {hoveredDomain && !hoveredModule && (
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
            <div className="animate-in fade-in zoom-in-95 duration-200 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-white/80">{hoveredDomain}</p>
            </div>
          </div>
        )}

        {selectedModule && (
          <div className="absolute right-8 top-8">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/80 p-4 backdrop-blur-sm">
              <p className="text-xs text-emerald-100">
                <strong>Selected:</strong> {modules.find((module) => module.id === selectedModule)?.label}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
