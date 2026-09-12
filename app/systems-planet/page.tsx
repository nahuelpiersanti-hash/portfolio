'use client';

import { useMemo, useState } from 'react';
// import { ModulePanel } from '@/components/systems-planet/ModulePanel';
import { ModuleOverlay } from '@/components/systems-planet/ModuleOverlay';
import { moduleContentMap } from '@/lib/module-content';
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
function Page() {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [overlayOrigin, setOverlayOrigin] = useState<{ x: number; y: number } | null>(null);

  // Panel toggle handler
  const handleModuleSelect = (moduleId: string, clickPosition2D: { x: number; y: number }) => {
    console.log('handleModuleSelect fired:', moduleId, clickPosition2D);
    setOverlayOrigin(clickPosition2D);
    if (selectedModule === moduleId && panelOpen) {
      setPanelOpen(false);
      setTimeout(() => setSelectedModule(null), 380);
    } else {
      setSelectedModule(moduleId);
      setPanelOpen(true);
    }
  };
  const modules = useMemo(() => generateModulePositions(0.32, PLANET_SPHERE_RADIUS), []);

  const contentForModule = (moduleId: string | null) => {
    const label = modules.find((m) => m.id === moduleId)?.label ?? '';
    return moduleContentMap[label] ?? moduleContentMap[moduleId ?? ''] ?? null;
  };

  const modulePresets = useMemo(() => {
    const map: Record<string, ModulePreset> = {};
    modules.forEach((module) => {
      const defaultPreset = createDefaultModulePreset();
      const frozenPreset = FROZEN_MODULE_PRESETS[module.id];
      map[module.id] = frozenPreset || defaultPreset;
    });
    return map;
  }, [modules]);

  // Handler para cerrar panel al hacer click fuera
  const handlePanelClose = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedModule(null), 380);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <SystemsPlanetCanvas
        onModuleSelect={handleModuleSelect}
        onModuleHover={setHoveredModule}
        selectedModule={selectedModule}
        panelOpen={panelOpen}
        modulePresets={modulePresets}
        onDomainHover={setHoveredDomain}
        onDomainSelect={setHoveredDomain}
        pulseIntensity={FROZEN_REACTOR.pulseIntensity}
        pulseTimeScale={FROZEN_REACTOR.pulseTimeScale}
        orderedMode={FROZEN_REACTOR.orderedMode}
        pauseBlocks={FROZEN_REACTOR.pauseBlocks}
        visibleModules={modules.length}
        rotateScene={panelOpen ? false : FROZEN_REACTOR.rotateScene}
        selectedModuleId={selectedModule}
        designMode={FROZEN_REACTOR.designMode}
        showNormals={FROZEN_REACTOR.showNormals}
        shellTuning={FROZEN_SHELL_TUNING}
        // ...otros props necesarios...
      />
      {panelOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 11, 18, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 39,
          pointerEvents: 'none',
          transition: 'background 0.4s ease',
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
        {panelOpen && selectedModule && overlayOrigin && (
          <div style={{ pointerEvents: 'auto' }}>
            <ModuleOverlay
              moduleId={selectedModule}
              content={{
                ...contentForModule(selectedModule),
                index: String(contentForModule(selectedModule)?.index ?? selectedModule ?? ''),
                title: String(contentForModule(selectedModule)?.title ?? selectedModule ?? ''),
                type: String(contentForModule(selectedModule)?.type ?? 'Module'),
                category: contentForModule(selectedModule)?.category ?? 'System Module',
                problem: contentForModule(selectedModule)?.problem ?? 'Content coming soon.',
                system: contentForModule(selectedModule)?.system ?? 'Content coming soon.',
                capabilities: contentForModule(selectedModule)?.capabilities ?? [],
                result: contentForModule(selectedModule)?.result ?? 'Content coming soon.',
                connectedModules: contentForModule(selectedModule)?.connectedModules ?? [],
              }}
              onClose={handlePanelClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Page;
