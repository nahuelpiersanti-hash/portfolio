'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PlanetSphere } from './PlanetSphere';

interface SystemsPlanetCanvasProps {
  onDomainHover: (domainName: string | null) => void;
  onDomainSelect: (domainId: string) => void;
  onModuleHover: (moduleId: string | null) => void;
  onModuleSelect: (moduleId: string, clickPosition2D: { x: number; y: number }) => void;
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
  modulePresets: Record<string, {
    enabled: boolean;
    scale: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }>;
  panelOpen?: boolean;
  selectedModule?: string | null;
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
  modulePresets,
  panelOpen,
  selectedModule,
}: SystemsPlanetCanvasProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 0, 2.35], fov: 46 }}
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#020b12", 6, 18]} />
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
        <hemisphereLight args={["#ffffff", "#333333", 0.3]} />
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
          modulePresets={modulePresets}
          panelOpen={panelOpen}
          selectedModule={selectedModule}
        />
        <OrbitControls
          enabled={!panelOpen}
          enableZoom={true}
          enablePan={false}
          minDistance={2.35}
          maxDistance={15}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          makeDefault
        />
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}