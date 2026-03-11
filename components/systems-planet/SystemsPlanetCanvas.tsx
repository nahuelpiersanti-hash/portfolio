'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PlanetSphere } from './PlanetSphere';

interface SystemsPlanetCanvasProps {
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
  lockOrbitControls?: boolean;
}

export function SystemsPlanetCanvas({ 
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
  lockOrbitControls = false,
}: SystemsPlanetCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.35], fov: 46 }}
      dpr={[1, 2]} // Cap pixel ratio for performance
      shadows // Enable shadows for modules
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
    >
      {/* Optimized lighting setup with shadows */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <hemisphereLight args={['#ffffff', '#333333', 0.3]} />

      {/* The Planet */}
      <PlanetSphere 
        onDomainHover={onDomainHover} 
        onDomainSelect={onDomainSelect}
        onModuleHover={onModuleHover}
        onModuleSelect={onModuleSelect}
        pulseIntensity={pulseIntensity}
        pulseTimeScale={pulseTimeScale}
        orderedMode={orderedMode}
        pauseBlocks={pauseBlocks}
        visibleModules={visibleModules}
        rotateScene={rotateScene}
        selectedModuleId={selectedModuleId}
        designMode={designMode}
        showNormals={showNormals}
        shellTuning={shellTuning}
        interactionTuning={interactionTuning}
        modulePresets={modulePresets}
      />

      {/* Controls - optimized for smooth interaction */}
      <OrbitControls
        enabled={!lockOrbitControls}
        enableZoom={true}
        enablePan={false}
        minDistance={2.35}
        maxDistance={15}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        makeDefault
      />

      {/* Post-processing: Bloom effect for energy cracks */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.5}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
