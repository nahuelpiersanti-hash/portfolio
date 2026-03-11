'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { getCrackIntersections } from '@/lib/crack-generator';

/**
 * CrackLights - PointLights positioned at crack intersections
 * Simulates energy emanating from the crack seams
 */
export function CrackLights() {
  const groupRef = useRef<Group>(null);
  
  // Get intersection points where cracks meet
  const intersections = useMemo(() => getCrackIntersections(2.5, 6), []);

  // Subtle pulsing animation for lights
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const time = clock.getElapsedTime();
      
      // Animate each light with slight variation
      groupRef.current.children.forEach((light, index) => {
        if ('intensity' in light) {
          const offset = index * 0.5;
          const pulse = Math.sin(time * 0.6 + offset) * 0.1 + 0.9; // 0.8 to 1.0
          (light as any).intensity = 0.4 * pulse;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {intersections.map((position, index) => (
        <pointLight
          key={index}
          position={[position.x, position.y, position.z]}
          color="#00E5FF"
          intensity={0.4}
          distance={3}
          decay={2}
        />
      ))}
    </group>
  );
}
