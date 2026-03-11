import * as THREE from 'three';

export interface EnergyChannel {
  path: THREE.Vector3[];
  type: 'core-module' | 'module-module';
  fromModuleIndex?: number;
  toModuleIndex?: number;
}

export interface ModuleEnergyInfluence {
  affinity: number;
  phase: number;
}

export interface EnergyNetwork {
  channels: EnergyChannel[];
  moduleInfluence: ModuleEnergyInfluence[];
}

/**
 * Generate seam paths between nearby modules.
 * These channels live in the gaps of the modular shell, not as orbital loops.
 */
export function generateModuleSeamPaths(
  modulePositions: THREE.Vector3[],
  shellRadius: number = 2.37,
  maxSeams: number = 34
): THREE.Vector3[][] {
  if (modulePositions.length < 3) {
    return [];
  }

  const connections = buildLocalConnections(modulePositions, 2, maxSeams);

  return connections.map(([startIndex, endIndex], index) => {
    const start = modulePositions[startIndex].clone().normalize();
    const end = modulePositions[endIndex].clone().normalize();
    const angle = start.angleTo(end);

    const segments = Math.max(8, Math.min(18, Math.floor((angle / Math.PI) * 80)));
    return generateSeamPath(start, end, shellRadius * 0.998, segments, index);
  });
}

/**
 * Build the full energy network for the sphere:
 * - core -> module channels
 * - module -> nearby module channels
 */
export function generateEnergyNetwork(
  modulePositions: THREE.Vector3[],
  coreRadius: number = 0.32,
  shellRadius: number = 2.32,
  geodesicConnections?: Array<[number, number]>
): EnergyNetwork {
  const channels: EnergyChannel[] = [];
  const moduleInfluence: ModuleEnergyInfluence[] = modulePositions.map((position) => ({
    affinity: 0,
    phase: Math.atan2(position.z, position.x),
  }));

  if (modulePositions.length === 0) {
    return { channels, moduleInfluence };
  }

  const coreLinks = buildCoreLinks(modulePositions.length, 16);
  coreLinks.forEach((moduleIndex, i) => {
    const target = modulePositions[moduleIndex];
    channels.push({
      type: 'core-module',
      toModuleIndex: moduleIndex,
      path: generateCoreChannelPath(target, coreRadius, shellRadius, i),
    });

    moduleInfluence[moduleIndex].affinity += 0.6;
  });

  const shellConnections = geodesicConnections && geodesicConnections.length > 0
    ? prioritizeGeodesicConnections(modulePositions, geodesicConnections, 3, 28)
    : buildLocalConnections(modulePositions, 2, 28);
  shellConnections.forEach(([startIndex, endIndex], i) => {
    const start = modulePositions[startIndex].clone().normalize();
    const end = modulePositions[endIndex].clone().normalize();
    const angle = start.angleTo(end);
    const segments = Math.max(8, Math.min(16, Math.floor((angle / Math.PI) * 80)));

    channels.push({
      type: 'module-module',
      fromModuleIndex: startIndex,
      toModuleIndex: endIndex,
      path: generateSeamPath(start, end, shellRadius * 0.998, segments, i + 17),
    });

    moduleInfluence[startIndex].affinity += 0.28;
    moduleInfluence[endIndex].affinity += 0.28;
  });

  const maxAffinity = moduleInfluence.reduce((max, v) => Math.max(max, v.affinity), 1);
  moduleInfluence.forEach((entry) => {
    entry.affinity = THREE.MathUtils.clamp(entry.affinity / maxAffinity, 0, 1);
  });

  return { channels, moduleInfluence };
}

function prioritizeGeodesicConnections(
  modulePositions: THREE.Vector3[],
  connections: Array<[number, number]>,
  maxDegreePerNode: number,
  maxSeams: number
): Array<[number, number]> {
  const degree = new Array<number>(modulePositions.length).fill(0);

  const sorted = connections
    .map(([a, b]) => ({
      a,
      b,
      angle: modulePositions[a].clone().normalize().angleTo(modulePositions[b].clone().normalize()),
    }))
    .sort((x, y) => x.angle - y.angle);

  const picked: Array<[number, number]> = [];
  for (let i = 0; i < sorted.length; i++) {
    const edge = sorted[i];
    if (degree[edge.a] >= maxDegreePerNode || degree[edge.b] >= maxDegreePerNode) {
      continue;
    }

    picked.push([edge.a, edge.b]);
    degree[edge.a] += 1;
    degree[edge.b] += 1;

    if (picked.length >= maxSeams) {
      break;
    }
  }

  return picked;
}

function buildCoreLinks(moduleCount: number, targetCount: number): number[] {
  const count = Math.min(targetCount, moduleCount);
  const links = new Set<number>();

  for (let i = 0; i < count; i++) {
    links.add(Math.floor((i * moduleCount) / count));
  }

  return Array.from(links);
}

function generateCoreChannelPath(
  modulePosition: THREE.Vector3,
  coreRadius: number,
  shellRadius: number,
  seed: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const normal = modulePosition.clone().normalize();
  const reference = Math.abs(normal.y) > 0.95
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(normal, reference).normalize();
  const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const phase = seed * 0.91;
  const segments = 12;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = THREE.MathUtils.lerp(coreRadius * 1.12, shellRadius * 0.985, t);
    const wobble = (1 - t) * 0.012 + 0.004;

    const offsetA = Math.sin(t * Math.PI * 4 + phase) * wobble;
    const offsetB = Math.sin(t * Math.PI * 7 + phase * 1.6) * wobble * 0.6;

    const point = normal
      .clone()
      .multiplyScalar(radius)
      .add(tangent.clone().multiplyScalar(offsetA))
      .add(binormal.clone().multiplyScalar(offsetB));

    points.push(point);
  }

  return points;
}

function buildLocalConnections(
  modulePositions: THREE.Vector3[],
  neighborsPerModule: number,
  maxSeams: number
): Array<[number, number]> {
  const pairs: Array<[number, number, number]> = [];
  const used = new Set<string>();
  const normals = modulePositions.map((p) => p.clone().normalize());

  // Keep seams local and fracture-like.
  const minAngle = 0.14;
  const maxAngle = 0.52;

  for (let i = 0; i < normals.length; i++) {
    const candidates: Array<{ j: number; angle: number }> = [];

    for (let j = 0; j < normals.length; j++) {
      if (i === j) {
        continue;
      }

      const angle = normals[i].angleTo(normals[j]);
      if (angle >= minAngle && angle <= maxAngle) {
        candidates.push({ j, angle });
      }
    }

    candidates.sort((a, b) => a.angle - b.angle);

    for (let k = 0; k < Math.min(neighborsPerModule, candidates.length); k++) {
      const j = candidates[k].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;

      if (!used.has(key)) {
        used.add(key);
        pairs.push([i, j, candidates[k].angle]);
      }
    }
  }

  pairs.sort((a, b) => a[2] - b[2]);
  return pairs.slice(0, maxSeams).map(([a, b]) => [a, b]);
}

/**
 * Generate a seam path between neighboring modules.
 */
function generateSeamPath(
  startNormal: THREE.Vector3,
  endNormal: THREE.Vector3,
  radius: number,
  segments: number,
  seed: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const phase = seed * 0.71;
  const seamTangent = new THREE.Vector3();
  const seamPerp = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const normal = slerpUnit(startNormal, endNormal, t);

    const nextNormal = slerpUnit(startNormal, endNormal, Math.min(1, t + 0.02));
    seamTangent.subVectors(nextNormal, normal).normalize();
    seamPerp.crossVectors(normal, seamTangent).normalize();

    // Subtle deformation to keep a technical seam look.
    const jagged =
      Math.sin(t * Math.PI * 8 + phase) * 0.0022 +
      Math.sin(t * Math.PI * 16 + phase * 1.7) * 0.001;
    const sideNoise = Math.sin(t * Math.PI * 10 + phase * 1.2) * 0.0008;

    const point = normal
      .clone()
      .multiplyScalar(radius)
      .add(seamPerp.clone().multiplyScalar(jagged))
      .add(seamTangent.clone().multiplyScalar(sideNoise))
      .normalize()
      .multiplyScalar(radius);

    points.push(point);
  }

  return points;
}

/**
 * Spherical linear interpolation for unit vectors.
 */
function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);

  if (omega < 1e-5) {
    return a.clone();
  }

  const sinOmega = Math.sin(omega);
  const s1 = Math.sin((1 - t) * omega) / sinOmega;
  const s2 = Math.sin(t * omega) / sinOmega;

  return a.clone().multiplyScalar(s1).add(b.clone().multiplyScalar(s2)).normalize();
}

/**
 * Create ribbon geometry from crack path (PlaneGeometry strip)
 * Ribbons follow the sphere curvature more naturally than tubes
 */
export function createCrackGeometry(
  path: THREE.Vector3[],
  width: number = 0.038,
  segments: number = 64
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const alphas: number[] = [];
  const widthPhase = Math.random() * Math.PI * 2;

  // Generate ribbon vertices along the path
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    
    // Calculate perpendicular direction for ribbon width
    let tangent: THREE.Vector3;
    if (i < path.length - 1) {
      tangent = new THREE.Vector3().subVectors(path[i + 1], point).normalize();
    } else {
      tangent = new THREE.Vector3().subVectors(point, path[i - 1]).normalize();
    }
    
    // Cross with radial direction to get perpendicular
    const radial = point.clone().normalize();
    const perpendicular = new THREE.Vector3().crossVectors(tangent, radial).normalize();
    
    // Variable width profile: tapered ends + slight jagged variation.
    const v = i / (path.length - 1);
    const taper = 0.25 + 0.75 * Math.sin(Math.PI * v);
    const organicWidth = 1 + Math.sin(v * Math.PI * 7 + widthPhase) * 0.14;
    const halfWidth = (width * taper * organicWidth) / 2;

    // Create two vertices (left and right of path)
    const left = point.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
    const right = point.clone().sub(perpendicular.clone().multiplyScalar(halfWidth));
    
    positions.push(left.x, left.y, left.z);
    positions.push(right.x, right.y, right.z);
    
    // UVs for texture mapping
    uvs.push(0, v);
    uvs.push(1, v);

    // Alpha profile for end fade.
    const alpha = THREE.MathUtils.smoothstep(v, 0.05, 0.18) *
      (1 - THREE.MathUtils.smoothstep(v, 0.82, 0.95));
    alphas.push(alpha, alpha);
    
    // Create triangles (except for last segment)
    if (i < path.length - 1) {
      const baseIndex = i * 2;
      // Two triangles per segment
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create crack material using a tiny shader for end fade + flowing energy pulse.
 */
export function createCrackMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: Math.random() * Math.PI * 2 },
      uIntensity: { value: 1.0 },
      uFlowDirection: { value: 1.0 },
      uColor: { value: new THREE.Color('#00E5FF') },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      varying float vV;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vAlpha = alpha;
        vV = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPhase;
      uniform float uIntensity;
      uniform float uFlowDirection;
      uniform vec3 uColor;

      varying float vAlpha;
      varying float vV;
      varying vec2 vUv;

      void main() {
        float travel = vV * 12.0 - uTime * 0.85 * uFlowDirection + uPhase;
        float flow = 0.78 + 0.22 * sin(travel);
        float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float energy = flow * (0.65 + edge * 0.35) * uIntensity;
        vec3 color = uColor * energy;
        gl_FragColor = vec4(color, vAlpha * energy);
      }
    `,
  });
}

export function setCrackMaterialTime(material: THREE.ShaderMaterial, time: number): void {
  material.uniforms.uTime.value = time;
}

export function setCrackMaterialIntensity(material: THREE.ShaderMaterial, intensity: number): void {
  material.uniforms.uIntensity.value = intensity;
}

export function setCrackMaterialFlowDirection(material: THREE.ShaderMaterial, direction: number): void {
  material.uniforms.uFlowDirection.value = direction;
}

/**
 * Get crack intersection points (useful for PointLight placement)
 */
export function getCrackIntersections(
  sphereRadius: number = 2.5,
  numDomains: number = 6
): THREE.Vector3[] {
  const intersections: THREE.Vector3[] = [];
  
  // Top pole
  intersections.push(new THREE.Vector3(0, sphereRadius, 0));
  
  // Bottom pole
  intersections.push(new THREE.Vector3(0, -sphereRadius, 0));
  
  // Equator intersections (where meridians cross the equator)
  for (let i = 0; i < numDomains; i++) {
    const phi = (i * Math.PI * 2) / numDomains;
    const x = sphereRadius * Math.cos(phi);
    const z = sphereRadius * Math.sin(phi);
    intersections.push(new THREE.Vector3(x, 0, z));
  }
  
  return intersections;
}
