'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Mesh } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ModuleData } from '@/lib/module-generator';

function createModuleGeometry(panelKind: ModuleData['panelKind']): THREE.BufferGeometry {
  const sides = panelKind === 'pent' ? 5 : 6;
  const topRadius = panelKind === 'pent' ? 0.53 : 0.58;
  const bottomRadius = panelKind === 'pent' ? 0.47 : 0.54;
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, 1, sides, 1, false);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function createFaceNumberTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(14, 116, 144, 0.16)';
  ctx.fillRect(42, 42, 172, 172);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, 172, 172);
  ctx.fillStyle = 'rgba(224, 242, 254, 0.95)';
  ctx.font = '700 104px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 136);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface ModuleNodeProps {
  module: ModuleData;
  moduleScale: number;
  xyPacking?: { x: number; y: number };
  presetScale?: { x: number; y: number; z: number };
  presetRotation?: { x: number; y: number; z: number };
  showNormals?: boolean;
  impactVibration: number;
  energyNearby: number;
  energyPhase: number;
  corePulse: number;
  onHover: (moduleId: string | null) => void;
  onSelect: (moduleId: string, clickPosition2D: { x: number; y: number }) => void;
  dynamicPosition: THREE.Vector3;
  onDragStart?: (moduleId: string) => void;
  onDragMove?: (moduleId: string, deltaX: number, deltaY: number) => void;
  onDragEnd?: (moduleId: string) => void;
  onMetricsReady?: (metrics: {
    id: string;
    position: { x: number; y: number; z: number };
    distanceToCore: number;
    scale: { x: number; y: number; z: number };
    bounds: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  }) => void;
  isSelected?: boolean;
  index?: number;
  totalModules?: number;
  isBreathing?: boolean;
}

export function ModuleNode({
  module,
  moduleScale,
  xyPacking = { x: 1, y: 1 },
  presetScale = { x: 1, y: 1, z: 1 },
  presetRotation = { x: 0, y: 0, z: 0 },
  showNormals = false,
  impactVibration,
  energyNearby,
  energyPhase,
  corePulse,
  onHover,
  onSelect,
  dynamicPosition,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMetricsReady,
  isSelected = false,
  index = 0,
  totalModules = 1,
  isBreathing = false,
}: ModuleNodeProps) {
  const meshRef = useRef<Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const meshInnerRef = useRef<Mesh>(null);
  // Eliminado electricRef, ya no se usa
  const vaporRef = useRef<THREE.BufferGeometry>(null);
  const vaporPositions = useMemo(() => new Float32Array(30), []);
  const activationTimeRef = useRef<number | null>(null);

  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const targetPositionRef = useRef(new THREE.Vector3());
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const metricsReportedRef = useRef(false);

  const labelText = useMemo(() => String(Number(module.id.replace('module-', ''))), [module.id]);
  const faceNumberTexture = useMemo(() => createFaceNumberTexture(labelText), [labelText]);
  const normalArrow = useMemo(
    () => new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.15, 0x22d3ee, 0.03, 0.02),
    []
  );
  const scaleVector = useMemo(() => {
    return new THREE.Vector3(
      moduleScale * xyPacking.x,
      moduleScale * xyPacking.y,
      moduleScale * 0.11
    );
  }, [module.id, moduleScale, xyPacking.x, xyPacking.y]);

  const panelColors = useMemo(() => ({
    base: '#0a0a0c',
    emissive: '#1e293b',
    edge: isSelected ? '#00d5ff' : hovered ? '#7fb7e6' : '#2b3a4f',
    edgeOpacity: isSelected ? 0.9 : hovered ? 0.62 : 0.32,
  }), [hovered, isSelected]);

  const geometry = useMemo(() => createModuleGeometry(module.panelKind), [module.panelKind]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      faceNumberTexture.dispose();
      normalArrow.line.geometry.dispose();
      (normalArrow.line.material as THREE.Material).dispose();
      normalArrow.cone.geometry.dispose();
      (normalArrow.cone.material as THREE.Material).dispose();
    };
  }, [faceNumberTexture, geometry, normalArrow]);

  useEffect(() => {
    if (!dragging) return;
    const handleWindowPointerMove = (event: PointerEvent) => {
      const last = lastPointerRef.current;
      if (!last) {
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        return;
      }
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        onDragMove?.(module.id, normX, normY);
      } else {
        const mouseDeltaX = event.clientX - last.x;
        const mouseDeltaY = event.clientY - last.y;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        onDragMove?.(module.id, mouseDeltaX, mouseDeltaY);
      }
    };
    const handleWindowPointerUp = () => {
      setDragging(false);
      lastPointerRef.current = null;
      onDragEnd?.(module.id);
    };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [dragging, module.id, onDragEnd, onDragMove]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();

    // Posición y orientación
    targetPositionRef.current.copy(dynamicPosition);
    meshRef.current.position.copy(targetPositionRef.current);
    meshRef.current.lookAt(0, 0, 0);
    meshRef.current.rotateZ(presetRotation.z);

    // Vibración
    const vibPulse = 0.5 + Math.sin(time * 2.5) * 0.5;
    const vib = impactVibration * vibPulse;
    meshRef.current.rotateZ(
      Math.sin(time * 30 + Number(module.id.replace('module-', '')) * 0.13) * 0.002 * vib
    );

    // Escala base
    meshRef.current.scale.set(
      scaleVector.x * presetScale.x,
      scaleVector.y * presetScale.y,
      scaleVector.z * presetScale.z
    );

    // Normales
    if (showNormals) {
      const normalDirection = meshRef.current.position.clone().normalize();
      normalArrow.position.copy(meshRef.current.position);
      normalArrow.setDirection(normalDirection);
    }

    // Métricas
    if (!metricsReportedRef.current && onMetricsReady) {
      const bounds = new THREE.Box3().setFromObject(meshRef.current);
      onMetricsReady({
        id: module.id,
        position: {
          x: meshRef.current.position.x,
          y: meshRef.current.position.y,
          z: meshRef.current.position.z,
        },
        distanceToCore: meshRef.current.position.length(),
        scale: {
          x: meshRef.current.scale.x,
          y: meshRef.current.scale.y,
          z: meshRef.current.scale.z,
        },
        bounds: {
          min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
        },
      });
      metricsReportedRef.current = true;
    }

    // Pulso emissive idle
    const phase = (index / Math.max(1, totalModules)) * Math.PI * 2;
    let pulse = 0.4 + Math.sin(time * 1.2 + phase) * 0.3;

    // Respiración
    if (isBreathing && !isSelected) {
      meshRef.current.position.addScaledVector(
        module.position.clone().normalize(),
        Math.sin(time * 0.6) * 0.08
      );
      pulse = 0.6 + Math.sin(time * 0.6) * 0.4;

      if (vaporRef.current) {
        const normal = module.position.clone().normalize();
        for (let i = 0; i < 10; i++) {
          const t = (time * 0.4 + i * 0.3) % 1;
          const angle = (i / 10) * Math.PI * 2;
          vaporPositions[i * 3]     = module.position.x + normal.x * t * 0.3 + Math.cos(angle) * 0.05;
          vaporPositions[i * 3 + 1] = module.position.y + normal.y * t * 0.3 + Math.sin(angle) * 0.05;
          vaporPositions[i * 3 + 2] = module.position.z + normal.z * t * 0.3;
        }
        vaporRef.current.attributes.position.needsUpdate = true;
      }
    }

    // Secuencia de activación
    // Secuencia de activación
    if (isSelected) {
      if (activationTimeRef.current === null) {
        activationTimeRef.current = time;
      }
      const elapsed = time - activationTimeRef.current;

      // Fase 1: 0–300ms — glow inmediato
      const glowPhase = Math.min(elapsed / 0.3, 1);
      pulse = 0.1 + glowPhase * 0.9;

      // Fase 2: 400ms+ — pulso lento orgánico (1.8s por ciclo)
      if (elapsed > 0.4) {
        const pulseTime = elapsed - 0.4;
        const pulseFactor = 1 + Math.sin(pulseTime * (Math.PI * 2 / 1.8)) * 0.015;
        meshRef.current.scale.set(
          scaleVector.x * presetScale.x * pulseFactor,
          scaleVector.y * presetScale.y * pulseFactor,
          scaleVector.z * presetScale.z
        );
        pulse = 0.15 + Math.sin(pulseTime * (Math.PI * 2 / 1.8)) * 0.12;
      }
      // Fase 3: 700ms+ — electricidad en bordes (eliminado, bloom se encarga del halo)
    } else {
      activationTimeRef.current = null;
    }

    meshRef.current.material.emissiveIntensity = pulse;
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.ctrlKey) {
      setDragging(true);
      onDragStart?.(module.id);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (dragging) {
      setDragging(false);
      lastPointerRef.current = null;
      onDragEnd?.(module.id);
    }
  };

  const handlePanelToggle = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const clickPosition2D = { x: e.clientX, y: e.clientY };
    onSelect(module.id, clickPosition2D);
  };

  return (
    <>
      {isBreathing && (
        <points>
          <bufferGeometry ref={vaporRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[vaporPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.07}
            color="#00d5ff"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </points>
      )}
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={module.position}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(module.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          if (!dragging) {
            setHovered(false);
            onHover(null);
          }
        }}
        onClick={handlePanelToggle}
      >
        <meshStandardMaterial
          color={isSelected ? '#001a22' : panelColors.base}
          roughness={0.72}
          metalness={0.55}
          emissive={isSelected ? '#00d5ff' : panelColors.emissive}
          emissiveIntensity={0.1}
        />

        {/* Bordes base */}
        <lineSegments raycast={() => {}}>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial
            color={panelColors.edge}
            transparent
            opacity={panelColors.edgeOpacity}
            toneMapped={false}
          />
        </lineSegments>

        {/* Electricidad — aparece 700ms después de seleccionar */}
        {isSelected && (
          <lineSegments raycast={() => {}}>
            <edgesGeometry args={[geometry]} />
            <lineBasicMaterial
              color={new THREE.Color(4, 4, 4)}
              transparent={false}
              toneMapped={false}
            />
          </lineSegments>
        )}

        {/* Marco interior */}
        <mesh
          raycast={() => {}}
          position={[0, 0, 0.06]}
          scale={[0.75, 0.75, 1]}
          renderOrder={3}
          ref={meshInnerRef}
          onClick={handlePanelToggle}
        >
          <meshStandardMaterial
            color={panelColors.base}
            roughness={0.72}
            metalness={0.36}
            emissive={panelColors.emissive}
            emissiveIntensity={0.1}
          />
        </mesh>
      </mesh>
    </>
  );
}