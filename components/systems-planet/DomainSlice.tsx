
'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DomainSliceProps {
  domain: {
    id: string;
    name: string;
    color: string;
    position: number;
  };
  onHover: (domainId: string | null) => void;
  onSelect: (domainId: string) => void;
}

export function DomainSlice({ domain, onHover, onSelect }: DomainSliceProps) {
  const meshRef = useRef<Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>(null);
  const [hovered, setHovered] = useState(false);

  // Memoize geometry - created once per slice
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(
      2.5, // radius
      16, // width segments
      16, // height segments
      (domain.position * Math.PI) / 3, // phi start (horizontal angle)
      Math.PI / 3 // phi length (slice width = 60 degrees, 360/6)
    );
  }, [domain.position]);

  // Memoize colors - created once per domain
  const colors = useMemo(() => {
    const base = new THREE.Color(domain.color);
    const hover = new THREE.Color(domain.color).multiplyScalar(1.5);
    return { base, hover, current: base.clone() };
  }, [domain.color]);

  // Dispose geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Single useFrame per slice for color lerp
  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material;
      const targetColor = hovered ? colors.hover : colors.base;
      
      // Lerp to target color and update material
      colors.current.lerp(targetColor, 0.1);
      material.color.copy(colors.current);
      
      // Update emissive intensity
      material.emissiveIntensity = hovered ? 0.3 : 0;
    }
  });

  // Domain slices are now invisible - only energy core and modules are visible
  // But we keep the logic for potential future use
  return null;

  /* Hidden domain slice
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      visible={false}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(domain.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(domain.id);
      }}
    >
      <meshStandardMaterial
        color={domain.color}
        roughness={0.4}
        metalness={0.1}
        emissive={domain.color}
        emissiveIntensity={0}
      />
    </mesh>
  */
}
