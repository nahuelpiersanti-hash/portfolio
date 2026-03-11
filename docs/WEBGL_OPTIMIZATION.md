# Systems Planet - WebGL Optimization Guide

## Phase 1 Optimizations Implemented

### Memory Management
- ✅ **Memoized geometries**: Created once per slice, disposed on unmount
- ✅ **Memoized colors**: Reused Color instances instead of recreating
- ✅ **Proper disposal**: useEffect cleanup prevents memory leaks
- ✅ **Shared materials**: Foundation for material reuse across instances

### Rendering Performance
- ✅ **Optimized color lerping**: Single interpolation per slice per frame
- ✅ **Event consolidation**: onPointerOver/Out instead of Enter/Leave
- ✅ **R3F-native cursor**: Removed direct DOM manipulation
- ✅ **Lighting optimization**: Reduced from 3 to 2 lights + hemisphere

### Canvas Configuration
- ✅ **DPR capping**: `[1, 2]` prevents over-rendering on high-DPI displays
- ✅ **Power preference**: Set to `high-performance`
- ✅ **Antialias**: Enabled for visual quality
- ✅ **Damping**: Smooth camera controls with low computational cost

## Performance Metrics (Target)

### Current Phase 1
- **Draw calls**: 6 (one per slice)
- **Triangles**: ~3,072 (512 per slice × 6)
- **Target FPS**: 60fps solid
- **Memory**: ~2MB geometries + materials

### Phase 2 Projections (with instancing)
- **Draw calls**: 7 (6 slices + 1 for all blocks)
- **Triangles**: ~3,072 + (100 blocks × 24) = ~5,472
- **Target FPS**: 60fps with 100+ blocks
- **Memory**: ~3MB with instancing

## Architecture for Phase 2

### Instanced Rendering
Use `InstancedMesh` for blocks to render 50-100+ blocks in single draw call:

```typescript
const instancedMesh = new THREE.InstancedMesh(
  sharedGeometry,
  sharedMaterial,
  maxInstances
);
```

### LOD System
Implement Level of Detail for distant blocks:
- Close: 24 triangles per block
- Medium: 12 triangles
- Far: 6 triangles

### Shader-Based Animation
Custom shaders for block detach effect (better than CPU transforms):
- Vertex shader handles position interpolation
- Fragment shader for color transitions
- Uniform-based animation state

### Spatial Partitioning
For raycasting optimization with many blocks:
- Octree for block organization
- Broad-phase culling before raycasting
- Only ray-test visible blocks

## Integration with GSAP

### Animation Targets
```typescript
// Camera animation for zoom
gsap.to(camera.position, {
  z: 5,
  duration: 1,
  ease: 'power2.inOut'
});

// Block detach
gsap.to(blockPosition, {
  x: targetX,
  y: targetY,
  z: targetZ,
  duration: 0.8,
  ease: 'back.out'
});
```

### Shader Uniform Animation
```typescript
gsap.to(material.uniforms.uDetachProgress, {
  value: 1.0,
  duration: 0.6,
  ease: 'power3.out'
});
```

## Best Practices

### Do's
- ✅ Use `useMemo` for expensive Three.js object creation
- ✅ Dispose resources in `useEffect` cleanup
- ✅ Batch state updates to minimize re-renders
- ✅ Use instancing for repeated geometry
- ✅ Implement frustum culling for off-screen objects
- ✅ Profile regularly with `usePerformanceMonitor`

### Don'ts
- ❌ Create Three.js objects in render (geometry, materials, colors)
- ❌ Manipulate DOM directly from 3D components
- ❌ Run unnecessary operations in useFrame
- ❌ Use separate geometries for identical objects
- ❌ Skip material/geometry disposal
- ❌ Create Color objects on every frame

## Debugging Tools

### Performance Monitor
```typescript
import { usePerformanceMonitor } from '@/lib/webgl-utils';

function Scene() {
  usePerformanceMonitor(true); // Enable in dev
  // ...
}
```

### Chrome DevTools
1. Performance tab → Record during interaction
2. Check for geometry/texture leaks in Memory tab
3. Use FPS meter overlay
4. Enable "Paint flashing" to see repaints

### Three.js Inspector
Browser extension for inspecting 3D scene graph, materials, and draw calls in real-time.

## Future Optimizations (Phase 3+)

- **Texture atlasing**: Combine textures to reduce texture binds
- **Geometry merging**: Merge static geometries into single buffer
- **Web Workers**: Offload ray calculations to background thread
- **Progressive enhancement**: Start with low-poly, enhance on idle
- **Compressed textures**: Use KTX2/Basis for smaller downloads
