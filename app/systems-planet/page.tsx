'use client';

import { useState, useMemo, useEffect } from 'react';
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

type InteractionTuningControls = {
  focusLift: number;
  energyFocus: number;
  hierarchyFade: number;
};

const DEFAULT_SHELL_TUNING: ShellTuningControls = {
  targetCoverage: 0.935,
  panelEdgeGapRatio: 0.016,
  minScale: 0.175,
  maxScale: 0.45,
  gapMinRatio: 0.0032,
  gapMaxRatio: 0.0095,
};

const DEFAULT_INTERACTION_TUNING: InteractionTuningControls = {
  focusLift: 1,
  energyFocus: 1,
  hierarchyFade: 1,
};

const SHELL_TUNING_STORAGE_KEY = 'systems-planet.shell-tuning.v1';
const MODULE_PRESETS_STORAGE_KEY = 'systems-planet.module-presets.v1';
const DEFAULT_SNAPSHOT_STORAGE_KEY = 'systems-planet.default-snapshot.v1';

export default function SystemsPlanetPage() {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [pulseTimeScale, setPulseTimeScale] = useState(1);
  const [orderedMode, setOrderedMode] = useState(true);
  const [pauseBlocks, setPauseBlocks] = useState(false);
  const [visibleModules, setVisibleModules] = useState(0);
  const [rotateScene, setRotateScene] = useState(true);
  const [designMode, setDesignMode] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [selectedModuleNumber, setSelectedModuleNumber] = useState('');
  const [modulePresets, setModulePresets] = useState<Record<string, ModulePreset>>({});
  const [shellTuning, setShellTuning] = useState<ShellTuningControls>(DEFAULT_SHELL_TUNING);
  const [interactionTuning, setInteractionTuning] = useState<InteractionTuningControls>(DEFAULT_INTERACTION_TUNING);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [isScenePointerDown, setIsScenePointerDown] = useState(false);

  const persistParameters = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const snapshot = {
      shellTuning,
      interactionTuning,
      modulePresets,
    };

    window.localStorage.setItem(SHELL_TUNING_STORAGE_KEY, JSON.stringify(shellTuning));
    window.localStorage.setItem(MODULE_PRESETS_STORAGE_KEY, JSON.stringify(modulePresets));
    window.localStorage.setItem(DEFAULT_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  };

  // Get module data for label lookup
  const modules = useMemo(() => generateModulePositions(0.32, PLANET_SPHERE_RADIUS), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const rawSnapshot = window.localStorage.getItem(DEFAULT_SNAPSHOT_STORAGE_KEY);
      if (rawSnapshot) {
        const parsedSnapshot = JSON.parse(rawSnapshot) as {
          shellTuning?: Partial<ShellTuningControls>;
          interactionTuning?: Partial<InteractionTuningControls>;
          modulePresets?: Record<string, ModulePreset>;
        };

        if (parsedSnapshot.shellTuning) {
          setShellTuning((prev) => ({ ...prev, ...parsedSnapshot.shellTuning }));
        }

        if (parsedSnapshot.interactionTuning) {
          setInteractionTuning((prev) => ({ ...prev, ...parsedSnapshot.interactionTuning }));
        }

        if (parsedSnapshot.modulePresets) {
          setModulePresets(parsedSnapshot.modulePresets);
        }

        setSettingsHydrated(true);
        return;
      }

      const rawShellTuning = window.localStorage.getItem(SHELL_TUNING_STORAGE_KEY);
      if (rawShellTuning) {
        const parsed = JSON.parse(rawShellTuning) as Partial<ShellTuningControls>;
        setShellTuning((prev) => ({ ...prev, ...parsed }));
      }

      const rawModulePresets = window.localStorage.getItem(MODULE_PRESETS_STORAGE_KEY);
      if (rawModulePresets) {
        const parsed = JSON.parse(rawModulePresets) as Record<string, ModulePreset>;
        setModulePresets(parsed);
      }
    } catch {
      // Ignore malformed persisted settings and continue with defaults.
    } finally {
      setSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    setVisibleModules(modules.length);
    setModulePresets((prev) => {
      const next: Record<string, ModulePreset> = { ...prev };
      modules.forEach((module) => {
        if (!next[module.id]) {
          next[module.id] = {
            enabled: true,
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
          };
        }
      });
      return next;
    });
  }, [modules.length]);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    persistParameters();
  }, [settingsHydrated, shellTuning, interactionTuning, modulePresets]);

  const selectedModuleIndex = useMemo(
    () => modules.findIndex((module) => module.id === selectedModule),
    [modules, selectedModule]
  );
  const selectedPreset = selectedModule ? modulePresets[selectedModule] : undefined;
  const hoveredModuleData = hoveredModule 
    ? modules.find(m => m.id === hoveredModule) 
    : null;
  const hasInteractiveHover = Boolean(hoveredModule);
  const sceneCursor = isScenePointerDown
    ? hasInteractiveHover
      ? 'pointer'
      : 'grabbing'
    : hasInteractiveHover
      ? 'pointer'
      : 'grab';

  const handleDomainSelect = (domainId: string) => {
    setSelectedDomain(domainId);
    console.log('Selected domain:', domainId);
  };

  const handleModuleHover = (moduleId: string | null) => {
    // Exclusive interaction: while one module is selected, ignore hover from others.
    if (!selectedModule) {
      setHoveredModule(moduleId);
      return;
    }

    if (moduleId === null || moduleId === selectedModule) {
      setHoveredModule(moduleId);
    }
  };

  const handleModuleSelect = (moduleId: string) => {
    // Toggle behavior: one click selects, second click on same module deselects.
    if (selectedModule === moduleId) {
      setSelectedModule(null);
      setHoveredModule(null);
      return;
    }

    // Exclusive behavior: only one module can be interacted with at a time.
    if (selectedModule && selectedModule !== moduleId) {
      return;
    }

    if (selectionLocked && selectedModule && selectedModule !== moduleId) {
      return;
    }

    setSelectedModule(moduleId);
    const module = modules.find(m => m.id === moduleId);
    console.log('Selected module:', moduleId, module?.label);
  };

  useEffect(() => {
    if (!selectedModule) {
      return;
    }

    const value = Number(selectedModule.replace('module-', ''));
    if (!Number.isNaN(value)) {
      setSelectedModuleNumber(String(value));
    }
  }, [selectedModule]);

  const updateSelectedPreset = (patch: {
    enabled?: boolean;
    scale?: Partial<ModulePreset['scale']>;
    rotation?: Partial<ModulePreset['rotation']>;
  }) => {
    if (!selectedModule) {
      return;
    }

    setModulePresets((prev) => {
      const current = prev[selectedModule] ?? {
        enabled: true,
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
      };
      return {
        ...prev,
        [selectedModule]: {
          ...current,
          ...patch,
          scale: {
            ...current.scale,
            ...(patch.scale ?? {}),
          },
          rotation: {
            ...current.rotation,
            ...(patch.rotation ?? {}),
          },
        },
      };
    });
  };

  const selectRelativeModule = (delta: number) => {
    if (modules.length === 0) {
      return;
    }

    const currentIndex = selectedModuleIndex >= 0 ? selectedModuleIndex : 0;
    const nextIndex = (currentIndex + delta + modules.length) % modules.length;
    const nextModule = modules[nextIndex];
    if (nextModule) {
      setSelectedModule(nextModule.id);
    }
  };

  const selectModuleByNumber = () => {
    const parsed = Number(selectedModuleNumber);
    if (Number.isNaN(parsed)) {
      return;
    }

    const target = modules.find((module) => Number(module.id.replace('module-', '')) === parsed);
    if (target) {
      setSelectedModule(target.id);
    }
  };

  const updateShellTuning = (patch: Partial<ShellTuningControls>) => {
    setShellTuning((prev) => ({ ...prev, ...patch }));
  };

  const updateInteractionTuning = (patch: Partial<InteractionTuningControls>) => {
    setInteractionTuning((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* 3D Canvas with proper cursor handling */}
      <div 
        className="absolute inset-0"
        style={{ cursor: sceneCursor }}
        onPointerDown={() => setIsScenePointerDown(true)}
        onPointerUp={() => setIsScenePointerDown(false)}
        onPointerCancel={() => setIsScenePointerDown(false)}
        onPointerLeave={() => {
          setIsScenePointerDown(false);
          setHoveredDomain(null);
          setHoveredModule(null);
        }}
      >
        <SystemsPlanetCanvas
          onDomainHover={setHoveredDomain}
          onDomainSelect={handleDomainSelect}
          onModuleHover={handleModuleHover}
          onModuleSelect={handleModuleSelect}
          pulseIntensity={pulseIntensity}
          pulseTimeScale={pulseTimeScale}
          orderedMode={orderedMode}
          pauseBlocks={pauseBlocks}
          visibleModules={visibleModules}
          rotateScene={rotateScene}
          selectedModuleId={selectedModule}
          designMode={designMode}
          showNormals={showNormals}
          shellTuning={shellTuning}
          interactionTuning={interactionTuning}
          modulePresets={modulePresets}
          lockOrbitControls={hasInteractiveHover}
        />
      </div>

      {/* UI Overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top branding */}
        <div className="absolute left-8 top-8">
          <h1 className="text-sm font-medium tracking-wide text-white/80">Systems Planet</h1>
          <p className="mt-1 text-xs text-white/50">Interactive Portfolio</p>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-8 left-8 max-w-xs">
          <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 backdrop-blur-sm">
            <p className="text-xs leading-relaxed text-white/70">
              <strong className="text-white/90">Interact:</strong> Drag to rotate · Hover modules to
              reveal systems · Click to explore
            </p>
          </div>
        </div>

        {/* Energy knobs */}
        <div className="pointer-events-auto absolute bottom-8 right-8">
          <div className="rounded-lg border border-white/15 bg-slate-900/85 p-4 backdrop-blur-sm">
            <p className="mb-3 text-xs tracking-wide text-white/70">Reactor Controls</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col items-center gap-2">
                <span className="text-[11px] text-white/65">Intensidad</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-800/90 text-[11px] text-cyan-200">
                  {pulseIntensity.toFixed(2)}
                </div>
                <input
                  type="range"
                  min={0.55}
                  max={1.25}
                  step={0.01}
                  value={pulseIntensity}
                  onChange={(e) => setPulseIntensity(Number(e.target.value))}
                  className="w-24 accent-cyan-400"
                />
              </label>

              <label className="flex flex-col items-center gap-2">
                <span className="text-[11px] text-white/65">Tiempo</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-800/90 text-[11px] text-cyan-200">
                  {pulseTimeScale.toFixed(2)}
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.01}
                  value={pulseTimeScale}
                  onChange={(e) => setPulseTimeScale(Number(e.target.value))}
                  className="w-24 accent-cyan-400"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-white/70">
              <span>Ordenar bloques</span>
              <input
                type="checkbox"
                checked={orderedMode}
                onChange={(e) => setOrderedMode(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>

            <label className="mt-2 flex items-center justify-between gap-3 text-xs text-white/70">
              <span>Pausar bloques</span>
              <input
                type="checkbox"
                checked={pauseBlocks}
                onChange={(e) => setPauseBlocks(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>

            <label className="mt-2 flex items-center justify-between gap-3 text-xs text-white/70">
              <span>Rotacion</span>
              <input
                type="checkbox"
                checked={rotateScene}
                onChange={(e) => setRotateScene(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>Shell Fit</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={persistParameters}
                    className="rounded border border-cyan-400/30 bg-slate-800/90 px-2 py-1 text-[10px] text-cyan-200"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShellTuning(DEFAULT_SHELL_TUNING)}
                    className="rounded border border-cyan-400/30 bg-slate-800/90 px-2 py-1 text-[10px] text-cyan-200"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <label className="block text-[11px] text-white/70">
                <div className="mb-1 flex justify-between"><span>Cobertura</span><span>{shellTuning.targetCoverage.toFixed(3)}</span></div>
                <input
                  type="range"
                  min={0.88}
                  max={0.955}
                  step={0.001}
                  value={shellTuning.targetCoverage}
                  onChange={(e) => updateShellTuning({ targetCoverage: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>

              <label className="mt-2 block text-[11px] text-white/70">
                <div className="mb-1 flex justify-between"><span>Gap estructural</span><span>{shellTuning.panelEdgeGapRatio.toFixed(3)}</span></div>
                <input
                  type="range"
                  min={0.008}
                  max={0.03}
                  step={0.001}
                  value={shellTuning.panelEdgeGapRatio}
                  onChange={(e) => updateShellTuning({ panelEdgeGapRatio: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-white/70">
                  <div className="mb-1 flex justify-between"><span>Scale min</span><span>{shellTuning.minScale.toFixed(3)}</span></div>
                  <input
                    type="range"
                    min={0.15}
                    max={0.22}
                    step={0.001}
                    value={shellTuning.minScale}
                    onChange={(e) => updateShellTuning({ minScale: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block text-[11px] text-white/70">
                  <div className="mb-1 flex justify-between"><span>Scale max</span><span>{shellTuning.maxScale.toFixed(3)}</span></div>
                  <input
                    type="range"
                    min={0.34}
                    max={0.55}
                    step={0.001}
                    value={shellTuning.maxScale}
                    onChange={(e) => updateShellTuning({ maxScale: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </label>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-[11px] text-white/70">
                  <div className="mb-1 flex justify-between"><span>Gap min</span><span>{shellTuning.gapMinRatio.toFixed(4)}</span></div>
                  <input
                    type="range"
                    min={0.002}
                    max={0.008}
                    step={0.0001}
                    value={shellTuning.gapMinRatio}
                    onChange={(e) => updateShellTuning({ gapMinRatio: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block text-[11px] text-white/70">
                  <div className="mb-1 flex justify-between"><span>Gap max</span><span>{shellTuning.gapMaxRatio.toFixed(4)}</span></div>
                  <input
                    type="range"
                    min={0.0065}
                    max={0.016}
                    step={0.0001}
                    value={shellTuning.gapMaxRatio}
                    onChange={(e) => updateShellTuning({ gapMaxRatio: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>Reactor Focus</span>
                <button
                  type="button"
                  onClick={() => setInteractionTuning(DEFAULT_INTERACTION_TUNING)}
                  className="rounded border border-cyan-400/30 bg-slate-800/90 px-2 py-1 text-[10px] text-cyan-200"
                >
                  Reset
                </button>
              </div>

              <label className="block text-[11px] text-white/70">
                <div className="mb-1 flex justify-between"><span>Desacople</span><span>{interactionTuning.focusLift.toFixed(2)}</span></div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.01}
                  value={interactionTuning.focusLift}
                  onChange={(e) => updateInteractionTuning({ focusLift: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>

              <label className="mt-2 block text-[11px] text-white/70">
                <div className="mb-1 flex justify-between"><span>Energia dirigida</span><span>{interactionTuning.energyFocus.toFixed(2)}</span></div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.01}
                  value={interactionTuning.energyFocus}
                  onChange={(e) => updateInteractionTuning({ energyFocus: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>

              <label className="mt-2 block text-[11px] text-white/70">
                <div className="mb-1 flex justify-between"><span>Atenuacion jerarquica</span><span>{interactionTuning.hierarchyFade.toFixed(2)}</span></div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.01}
                  value={interactionTuning.hierarchyFade}
                  onChange={(e) => updateInteractionTuning({ hierarchyFade: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </label>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>Bloques visibles</span>
                <span>{visibleModules} / {modules.length}</span>
              </div>
              <div className="mb-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleModules((v) => Math.max(0, v - 1))}
                  className="h-7 w-7 rounded border border-cyan-400/30 bg-slate-800/90 text-cyan-200"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleModules((v) => Math.min(modules.length, v + 1))}
                  className="h-7 w-7 rounded border border-cyan-400/30 bg-slate-800/90 text-cyan-200"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={modules.length}
                step={1}
                value={visibleModules}
                onChange={(e) => setVisibleModules(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <label className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-white/70">
              <span>Modo diseno</span>
              <input
                type="checkbox"
                checked={designMode}
                onChange={(e) => setDesignMode(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>

            <label className="mt-2 flex items-center justify-between gap-3 text-xs text-white/70">
              <span>Visualizar normales</span>
              <input
                type="checkbox"
                checked={showNormals}
                onChange={(e) => setShowNormals(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>

            {designMode && (
              <div className="mt-2 space-y-2 text-xs text-white/70">
                <p className="text-[11px] text-white/55">Ajuste del bloque seleccionado</p>
                <label className="flex items-center justify-between gap-3 rounded border border-white/10 bg-slate-800/40 px-2 py-1">
                  <span>Seleccion bloqueada</span>
                  <input
                    type="checkbox"
                    checked={selectionLocked}
                    onChange={(e) => setSelectionLocked(e.target.checked)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={selectedModuleNumber}
                    onChange={(e) => setSelectedModuleNumber(e.target.value)}
                    className="h-8 w-full rounded border border-cyan-400/30 bg-slate-800/90 px-2 text-xs text-cyan-100 outline-none"
                    placeholder="Numero de placa"
                  />
                  <button
                    type="button"
                    onClick={selectModuleByNumber}
                    className="h-8 rounded border border-cyan-400/30 bg-slate-800/90 px-3 text-xs text-cyan-200"
                  >
                    Ir
                  </button>
                </div>

                <div className="mb-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectRelativeModule(-1)}
                    className="h-7 rounded border border-cyan-400/30 bg-slate-800/90 px-2 text-cyan-200"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRelativeModule(1)}
                    className="h-7 rounded border border-cyan-400/30 bg-slate-800/90 px-2 text-cyan-200"
                  >
                    Next
                  </button>
                </div>
                <label className="flex items-center justify-between gap-3">
                  <span>Bloque ON</span>
                  <input
                    type="checkbox"
                    checked={selectedPreset?.enabled ?? true}
                    disabled={!selectedModule}
                    onChange={(e) => updateSelectedPreset({ enabled: e.target.checked })}
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 flex justify-between"><span>X</span><span>{(selectedPreset?.scale.x ?? 1).toFixed(2)}</span></div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.01}
                    value={selectedPreset?.scale.x ?? 1}
                    disabled={!selectedModule}
                    onChange={(e) => updateSelectedPreset({ scale: { x: Number(e.target.value) } })}
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 flex justify-between"><span>Y</span><span>{(selectedPreset?.scale.y ?? 1).toFixed(2)}</span></div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.01}
                    value={selectedPreset?.scale.y ?? 1}
                    disabled={!selectedModule}
                    onChange={(e) => updateSelectedPreset({ scale: { y: Number(e.target.value) } })}
                    className="w-full accent-cyan-400"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 flex justify-between"><span>Z</span><span>{(selectedPreset?.scale.z ?? 1).toFixed(2)}</span></div>
                  <input
                    type="range"
                    min={0.4}
                    max={1.6}
                    step={0.01}
                    value={selectedPreset?.scale.z ?? 1}
                    disabled={!selectedModule}
                    onChange={(e) => updateSelectedPreset({ scale: { z: Number(e.target.value) } })}
                    className="w-full accent-cyan-400"
                  />
                </label>

                <p className="pt-1 text-[11px] text-white/55">Rotacion (grados)</p>
                <label className="block">
                  <div className="mb-1 flex justify-between"><span>Rz</span><span>{Math.round(((selectedPreset?.rotation.z ?? 0) * 180) / Math.PI)}°</span></div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={Math.round(((selectedPreset?.rotation.z ?? 0) * 180) / Math.PI)}
                    disabled={!selectedModule}
                    onChange={(e) => updateSelectedPreset({ rotation: { z: (Number(e.target.value) * Math.PI) / 180 } })}
                    className="w-full accent-cyan-400"
                  />
                </label>
                <button
                  type="button"
                  disabled={!selectedModule}
                  onClick={() => updateSelectedPreset({ rotation: { z: 0 } })}
                  className="h-7 rounded border border-cyan-400/30 bg-slate-800/90 px-2 text-xs text-cyan-200 disabled:opacity-40"
                >
                  Reset Rz
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hovered module label - centered */}
        {hoveredModuleData && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-in fade-in zoom-in-95 duration-200 rounded-lg border border-white/20 bg-slate-900/90 px-6 py-3 backdrop-blur-sm">
              <p className="text-xl font-medium text-white">{hoveredModuleData.label}</p>
              <p className="mt-1 text-xs text-white/50 capitalize">
                {hoveredModuleData.domain.replace(/-/g, ' ')} · {hoveredModuleData.size}
              </p>
            </div>
          </div>
        )}

        {/* Hovered domain label - only show when no module hovered */}
        {hoveredDomain && !hoveredModule && (
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
            <div className="animate-in fade-in zoom-in-95 duration-200 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-white/80">{hoveredDomain}</p>
            </div>
          </div>
        )}

        {/* Selected module indicator */}
        {selectedModule && (
          <div className="absolute right-8 top-8">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/80 p-4 backdrop-blur-sm">
              <p className="text-xs text-emerald-100">
                <strong>Selected:</strong> {modules.find(m => m.id === selectedModule)?.label}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
