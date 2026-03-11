'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Mesh } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { ModuleData } from '@/lib/module-generator';

function createModuleGeometry(panelKind: ModuleData['panelKind']): THREE.BufferGeometry {
  const sides = panelKind === 'pent' ? 5 : 6;
  // Slightly stronger frustum profile (taper) to visually soften edge transitions.
  const topRadius = panelKind === 'pent' ? 0.53 : 0.58;
  const bottomRadius = panelKind === 'pent' ? 0.47 : 0.54;
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, 1, sides, 1, false);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

interface ModuleNodeProps {
  module: ModuleData;
  moduleScale: number;
  xyPacking?: { x: number; y: number };
  presetScale?: { x: number; y: number; z: number };
  presetRotation?: { x: number; y: number; z: number };
  isActive?: boolean;
  visualAttenuation?: number;
  showNormals?: boolean;
  impactVibration: number;
  energyNearby: number;
  energyPhase: number;
  onHover: (moduleId: string | null) => void;
  onSelect: (moduleId: string) => void;
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
}

function createFaceNumberTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

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

export function ModuleNode({
  module,
  moduleScale,
  xyPacking = { x: 1, y: 1 },
  presetScale = { x: 1, y: 1, z: 1 },
  presetRotation = { x: 0, y: 0, z: 0 },
  isActive = false,
  visualAttenuation = 1,
  showNormals = false,
  impactVibration,
  energyNearby,
  energyPhase,
  onHover,
  onSelect,
  dynamicPosition,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMetricsReady,
}: ModuleNodeProps) {
  const meshRef = useRef<Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const targetPositionRef = useRef(new THREE.Vector3());
  const lookMatrixRef = useRef(new THREE.Matrix4());
  const cameraQuatRef = useRef(new THREE.Quaternion());
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; ctrl: boolean } | null>(null);
  const metricsReportedRef = useRef(false);
  const labelText = useMemo(() => String(Number(module.id.replace('module-', ''))), [module.id]);
  const faceNumberTexture = useMemo(() => createFaceNumberTexture(labelText), [labelText]);
  const normalArrow = useMemo(
    () => new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.15, 0x22d3ee, 0.03, 0.02),
    []
  );

  const scaleVector = useMemo(() => {
    const widthRatio = 1;
    const heightRatio = 1;
    const depthRatio = 0.11;

    return new THREE.Vector3(
      moduleScale * widthRatio * xyPacking.x,
      moduleScale * heightRatio * xyPacking.y,
      moduleScale * depthRatio
    );
  }, [module.id, moduleScale, xyPacking.x, xyPacking.y]);

  const panelColors = useMemo(() => {
    return {
      base: '#0a0a0c',
      emissive: '#1e293b',
      edge: hovered ? '#7fb7e6' : '#2b3a4f',
      edgeOpacity: hovered ? 0.62 : 0.32,
    };
  }, [hovered]);

  // Deterministic per-module geometry for a less cubic shell.
  const geometry = useMemo(() => {
    return createModuleGeometry(module.panelKind);
  }, [module.panelKind]);

  // Dispose geometry on unmount
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
    if (!dragging) {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      const last = lastPointerRef.current;
      if (!last) {
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      const mouseDeltaX = event.clientX - last.x;
      const mouseDeltaY = event.clientY - last.y;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };

      onDragMove?.(module.id, mouseDeltaX, mouseDeltaY);
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

  // Idle animation + hover effect
  useFrame(({ clock, camera }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();

      // Position comes from shared shell simulation in ModulesLayer.
      targetPositionRef.current.copy(dynamicPosition);
      meshRef.current.position.copy(targetPositionRef.current);

      // Keep each module oriented toward the core.
      meshRef.current.lookAt(0, 0, 0);

      // Manual local orientation offset (twist) around module normal.
      meshRef.current.rotateZ(presetRotation.z);

      // Active module slightly presents itself toward camera while keeping reactor context.
      if (isActive) {
        lookMatrixRef.current.lookAt(meshRef.current.position, camera.position, new THREE.Vector3(0, 1, 0));
        cameraQuatRef.current.setFromRotationMatrix(lookMatrixRef.current);
        meshRef.current.quaternion.slerp(cameraQuatRef.current, 0.08);
      }

      // Tesla impacts add subtle shell flex vibration scaled by core pulse.
      const corePulse = 0.5 + Math.sin(time * 2.5) * 0.5;
      const vib = impactVibration * corePulse;
      meshRef.current.rotateZ(
        Math.sin(time * 30 + Number(module.id.replace('module-', '')) * 0.13) * 0.002 * vib
      );

      // Non-uniform scale profiles to sculpt a plate-like shell.
      meshRef.current.scale.copy(scaleVector);
      meshRef.current.scale.set(
        meshRef.current.scale.x * presetScale.x,
        meshRef.current.scale.y * presetScale.y,
        meshRef.current.scale.z * presetScale.z
      );

      if (showNormals) {
        const normalDirection = meshRef.current.position.clone().normalize();
        normalArrow.position.copy(meshRef.current.position);
        normalArrow.setDirection(normalDirection);
      }

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

      // Emissive intensity with subtle ambient pulse (reflecting crack energy)
      const crackReflection = Math.sin(time * 0.4) * 0.05 + 0.15;
      const passingEnergy = Math.max(0, Math.sin(time * 0.95 - energyPhase * 1.3)) * (0.14 * energyNearby);
      const nearbyEnergy = energyNearby * 0.1;
      const material = meshRef.current.material;
      const baseEmissive = hovered ? 0.42 : (crackReflection + nearbyEnergy + passingEnergy) * 0.62;
      material.emissiveIntensity = isActive
        ? Math.max(baseEmissive, 0.34)
        : baseEmissive * visualAttenuation;
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      ctrl: e.ctrlKey,
    };

    if (!e.ctrlKey) {
      return;
    }

    setDragging(true);
    onSelect(module.id);
    onDragStart?.(module.id);
    lastPointerRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    const down = pointerDownRef.current;
    pointerDownRef.current = null;

    if (down && !down.ctrl) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const moved = Math.hypot(dx, dy);

      // Select only if the pointer ended as a click on the same module.
      if (moved < 6) {
        onSelect(module.id);
      }
    }

    if (!dragging) {
      return;
    }

    setDragging(false);
    lastPointerRef.current = null;
    onDragEnd?.(module.id);
  };

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={module.position}
        castShadow
        receiveShadow
        raycast={() => null}
      >
        <meshStandardMaterial
          color={panelColors.base}
          roughness={0.72}
          metalness={0.36}
          emissive={panelColors.emissive}
          emissiveIntensity={0.1}
        />

        {/* Edge highlight */}
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial
            color={panelColors.edge}
            transparent
            opacity={panelColors.edgeOpacity}
            toneMapped={false}
          />
        </lineSegments>

        <mesh position={[0, 0, -0.515]} rotation={[0, Math.PI, 0]} renderOrder={2}>
          <planeGeometry args={[0.48, 0.48]} />
          <meshBasicMaterial map={faceNumberTexture} transparent depthWrite={false} />
        </mesh>
        {/* Dedicated frontal hit surface for precise picking. */}
        <mesh
          position={[0, 0, -0.56]}
          rotation={[0, Math.PI, 0]}
          renderOrder={3}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(module.id);
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (!dragging) {
              setHovered(false);
              onHover(null);
            }
          }}
        >
          <planeGeometry args={[1.28, 1.28]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </mesh>

      {showNormals && <primitive object={normalArrow} />}
    </>
  );
}
