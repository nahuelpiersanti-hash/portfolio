import * as THREE from 'three';
import { OperationalDomainId } from '@/types/systems-planet';

export interface ModuleData {
  id: string;
  label: string;
  domain: OperationalDomainId;
  size: 'large' | 'medium' | 'small';
  panelKind?: 'pent' | 'hex';
  neighbors?: number[];
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export type ModuleSize = 'large' | 'medium' | 'small';

export const PLANET_SPHERE_RADIUS = 0.6;
export const MODULE_MIN_SCALE = 0.15;
export const MODULE_MAX_SCALE = 0.18;
export const TARGET_MODULE_SCREENS = 32;

export const MODULE_SCALE_MAP: Record<ModuleSize, number> = {
  large: MODULE_MAX_SCALE,
  medium: 0.165,
  small: MODULE_MIN_SCALE,
};

export const MODULE_REFERENCE_SIZE = 1.0;

/**
 * Generate module positions on sphere surface
 * Distributed across domains with proper spacing
 */
export function generateModulePositions(
  coreRadius: number = 0.32,
  shellRadius: number = PLANET_SPHERE_RADIUS
): ModuleData[] {
  const modules: ModuleData[] = [];

  // Reemplazo: 32 módulos reales
  const baseModulesByDomain: Array<{
    domain: OperationalDomainId;
    label: string;
    size: ModuleSize;
  }> = [
    // Core
    { domain: 'architecture', label: 'Systems Architecture', size: 'large' },
    // Systems
    { domain: 'operational-systems', label: 'OVT Platform', size: 'large' },
    { domain: 'operational-systems', label: 'Analytics Core', size: 'large' },
    { domain: 'platforms', label: 'Experience Portal', size: 'large' },
    { domain: 'operational-systems', label: 'Automation Layer', size: 'large' },
    { domain: 'operational-systems', label: 'Operational Dashboard', size: 'large' },
    // Capabilities
    { domain: 'operational-systems', label: 'Data Pipelines', size: 'medium' },
    { domain: 'operational-systems', label: 'Realtime Monitoring', size: 'medium' },
    { domain: 'platforms', label: 'System Integrations', size: 'medium' },
    { domain: 'platforms', label: 'Operational UX', size: 'medium' },
    { domain: 'operational-systems', label: 'Automation Workflows', size: 'medium' },
    { domain: 'architecture', label: 'GIS Interfaces', size: 'medium' },
    { domain: 'platforms', label: 'Service Platforms', size: 'medium' },
    { domain: 'platforms', label: 'API Systems', size: 'medium' },
    { domain: 'architecture', label: 'Data Visualization', size: 'medium' },
    { domain: 'architecture', label: 'Infrastructure Design', size: 'medium' },
    // Projects
    { domain: 'websites', label: 'Agency Site', size: 'small' },
    { domain: 'websites', label: 'Commerce Front', size: 'small' },
    { domain: 'operational-systems', label: 'Inspection System', size: 'small' },
    { domain: 'operational-systems', label: 'Service Tracker', size: 'small' },
    { domain: 'field-notes', label: 'Ops Logbook', size: 'small' },
    { domain: 'platforms', label: 'Navarro Platform', size: 'small' },
    { domain: 'websites', label: 'Experience System', size: 'small' },
    { domain: 'platforms', label: 'Analytics Portal', size: 'small' },
    { domain: 'operational-systems', label: 'Service Automation', size: 'small' },
    { domain: 'architecture', label: 'Data Explorer', size: 'small' },
    { domain: 'operational-systems', label: 'Operations Console', size: 'small' },
    { domain: 'field-notes', label: 'System Notes', size: 'small' },
    // Meta
    { domain: 'field-notes', label: 'Process', size: 'small' },
    { domain: 'architecture', label: 'Architecture Method', size: 'small' },
    { domain: 'field-notes', label: 'About', size: 'small' },
    { domain: 'field-notes', label: 'Contact', size: 'small' },
  ];

  const targetCount = TARGET_MODULE_SCREENS;
  const grid = generateTruncatedIcosaPanelGrid(shellRadius);
  const modulesByDomain = expandModuleDefinitions(baseModulesByDomain, targetCount);
  const orderedModules = orderModulesForDistribution(modulesByDomain);

  orderedModules.forEach((mod, index) => {
    modules.push({
      id: `module-${index}`,
      label: mod.label,
      domain: mod.domain,
      size: mod.size,
      panelKind: grid[index]?.panelKind ?? 'hex',
      neighbors: grid[index]?.neighbors ?? [],
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
    });
  });

  // Place modules with staggered spherical rings (brick-like sequence).
  const baseRadius = shellRadius;

  modules.forEach((module, i) => {
    module.position.copy(grid[i]?.position ?? new THREE.Vector3(0, 1, 0).multiplyScalar(baseRadius));
    module.normal.copy(module.position).normalize();
  });

  return modules;
}

function generateTruncatedIcosaPanelGrid(
  radius: number
): Array<{ position: THREE.Vector3; panelKind: 'pent' | 'hex'; neighbors: number[] }> {
  const base = new THREE.IcosahedronGeometry(1, 0);
  const pos = base.getAttribute('position');
  const index = base.getIndex();

  const uniqueVertices: THREE.Vector3[] = [];
  const keyToVertex = new Map<string, number>();

  const getOrCreateVertex = (x: number, y: number, z: number): number => {
    const key = `${x.toFixed(6)}|${y.toFixed(6)}|${z.toFixed(6)}`;
    const existing = keyToVertex.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const idx = uniqueVertices.length;
    uniqueVertices.push(new THREE.Vector3(x, y, z).normalize());
    keyToVertex.set(key, idx);
    return idx;
  };

  const faces: Array<[number, number, number]> = [];

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i);
      const ib = index.getX(i + 1);
      const ic = index.getX(i + 2);

      const a = getOrCreateVertex(pos.getX(ia), pos.getY(ia), pos.getZ(ia));
      const b = getOrCreateVertex(pos.getX(ib), pos.getY(ib), pos.getZ(ib));
      const c = getOrCreateVertex(pos.getX(ic), pos.getY(ic), pos.getZ(ic));

      faces.push([a, b, c]);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      const a = getOrCreateVertex(pos.getX(i), pos.getY(i), pos.getZ(i));
      const b = getOrCreateVertex(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      const c = getOrCreateVertex(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      faces.push([a, b, c]);
    }
  }

  const vertices = uniqueVertices;

  const vertexFaces = Array.from({ length: vertices.length }, () => new Set<number>());
  const edgeFaces = new Map<string, number[]>();

  faces.forEach((face, fi) => {
    const [a, b, c] = face;
    vertexFaces[a].add(fi);
    vertexFaces[b].add(fi);
    vertexFaces[c].add(fi);

    const edges: Array<[number, number]> = [[a, b], [b, c], [c, a]];
    edges.forEach(([u, v]) => {
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      const list = edgeFaces.get(key) ?? [];
      list.push(fi);
      edgeFaces.set(key, list);
    });
  });

  const panels: Array<{ position: THREE.Vector3; panelKind: 'pent' | 'hex'; neighbors: Set<number> }> = [];

  // 12 pentagons from unique icosahedron vertices.
  vertices.forEach((vertex) => {
    panels.push({
      position: vertex.clone().multiplyScalar(radius),
      panelKind: 'pent',
      neighbors: new Set<number>(),
    });
  });

  // 20 hexagons from icosahedron face centers.
  faces.forEach(([a, b, c]) => {
    const center = new THREE.Vector3()
      .add(vertices[a])
      .add(vertices[b])
      .add(vertices[c])
      .multiplyScalar(1 / 3)
      .normalize()
      .multiplyScalar(radius);

    panels.push({
      position: center,
      panelKind: 'hex',
      neighbors: new Set<number>(),
    });
  });

  // pent <-> hex adjacency by vertex-face incidence.
  for (let vi = 0; vi < vertexFaces.length; vi++) {
    vertexFaces[vi].forEach((fi) => {
      const pentIdx = vi;
      const hexIdx = vertices.length + fi;
      panels[pentIdx].neighbors.add(hexIdx);
      panels[hexIdx].neighbors.add(pentIdx);
    });
  }

  // hex <-> hex adjacency by face-face shared edges.
  edgeFaces.forEach((adjacentFaces) => {
    if (adjacentFaces.length !== 2) {
      return;
    }
    const [f1, f2] = adjacentFaces;
    const h1 = vertices.length + f1;
    const h2 = vertices.length + f2;
    panels[h1].neighbors.add(h2);
    panels[h2].neighbors.add(h1);
  });

  base.dispose();

  return panels.map((panel) => ({
    position: panel.position,
    panelKind: panel.panelKind,
    neighbors: Array.from(panel.neighbors).sort((a, b) => a - b),
  }));
}

/**
 * Generate staggered ring points on a sphere surface (brick-wall pattern)
 * with an exact module count.
 */
function generateBrickSphereGrid(count: number, radius: number): THREE.Vector3[] {
  if (count <= 0) {
    return [];
  }

  const rows = Math.max(5, Math.round(Math.sqrt(count) * 1.25));
  const rowCounts = distributeCountByLatitude(count, rows);

  const points: THREE.Vector3[] = [];

  for (let ring = 0; ring < rows; ring++) {
    // Slight equator bias improves shell readability from front camera.
    const t = (ring + 0.5) / rows;
    const eased = 0.5 - Math.cos(t * Math.PI) * 0.5;
    const y = 1 - 2 * eased;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const modulesInRing = rowCounts[ring];
    const thetaStep = (Math.PI * 2) / modulesInRing;
    const stagger = (ring % 2 === 0 ? 0 : 0.5) * thetaStep;

    for (let col = 0; col < modulesInRing; col++) {
      const theta = col * thetaStep + stagger;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      points.push(new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius));

      if (points.length === count) {
        return points;
      }
    }
  }

  return points;
}

function distributeCountByLatitude(count: number, rows: number): number[] {
  const weights: number[] = [];

  for (let ring = 0; ring < rows; ring++) {
    const t = (ring + 0.5) / rows;
    const y = 1 - 2 * t;
    const radial = Math.sqrt(Math.max(0.0001, 1 - y * y));
    weights.push(0.35 + radial);
  }

  const sum = weights.reduce((acc, value) => acc + value, 0);
  const raw = weights.map((w) => (w / sum) * count);
  const counts = raw.map((v) => Math.max(2, Math.floor(v)));

  let assigned = counts.reduce((acc, value) => acc + value, 0);
  const order = raw
    .map((v, idx) => ({ idx, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem);

  let cursor = 0;
  while (assigned < count) {
    const slot = order[cursor % order.length];
    counts[slot.idx] += 1;
    assigned += 1;
    cursor += 1;
  }

  cursor = 0;
  while (assigned > count) {
    const slot = order[order.length - 1 - (cursor % order.length)];
    if (counts[slot.idx] > 2) {
      counts[slot.idx] -= 1;
      assigned -= 1;
    }
    cursor += 1;
  }

  return counts;
}

/**
 * Build a placement order that spreads size groups around the sphere.
 */
function createBalancedSlotOrder(
  modules: Array<{ size: ModuleSize }>
): number[] {
  const n = modules.length;
  const used = new Set<number>();
  const orderedSlots: number[] = [];

  const sizes: ModuleSize[] = ['large', 'medium', 'small'];

  sizes.forEach((size) => {
    const count = modules.filter((m) => m.size === size).length;
    const candidateSlots = generateEvenlySpacedSlots(n, count);

    candidateSlots.forEach((slot) => {
      if (!used.has(slot)) {
        used.add(slot);
        orderedSlots.push(slot);
      }
    });
  });

  for (let i = 0; i < n; i++) {
    if (!used.has(i)) {
      orderedSlots.push(i);
    }
  }

  return orderedSlots;
}

/**
 * Build a deterministic module order to make distribution easier to read:
 * 1) Interleave domains to avoid big clusters.
 * 2) Spread size groups across the sphere slots.
 */
function orderModulesForDistribution(
  modules: Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }>
): Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }> {
  const grouped = new Map<OperationalDomainId, Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }>>();

  modules.forEach((module) => {
    const current = grouped.get(module.domain) ?? [];
    current.push(module);
    grouped.set(module.domain, current);
  });

  const domains = Array.from(grouped.keys());
  const interleaved: Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }> = [];
  let keepTaking = true;
  let layer = 0;

  while (keepTaking) {
    keepTaking = false;

    domains.forEach((domain) => {
      const list = grouped.get(domain);
      if (!list) {
        return;
      }

      const candidate = list[layer];
      if (!candidate) {
        return;
      }

      interleaved.push(candidate);
      keepTaking = true;
    });

    layer += 1;
  }

  const slotOrder = createBalancedSlotOrder(interleaved);
  const distributed = new Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }>(interleaved.length);

  interleaved.forEach((module, index) => {
    distributed[slotOrder[index]] = module;
  });

  return distributed;
}

function generateEvenlySpacedSlots(total: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  const slots: number[] = [];
  const taken = new Set<number>();

  for (let i = 0; i < count; i++) {
    let slot = Math.floor(((i + 0.5) * total) / count);

    while (taken.has(slot)) {
      slot = (slot + 1) % total;
    }

    taken.add(slot);
    slots.push(slot);
  }

  return slots;
}

function expandModuleDefinitions(
  baseModules: Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }>,
  total: number
): Array<{ domain: OperationalDomainId; label: string; size: ModuleSize }> {
  if (baseModules.length >= total) {
    return baseModules.slice(0, total);
  }

  const expanded = [...baseModules];
  let i = 0;

  while (expanded.length < total) {
    const template = baseModules[i % baseModules.length];
    const cloneIndex = Math.floor(i / baseModules.length) + 2;

    expanded.push({
      ...template,
      label: `${template.label} ${cloneIndex}`,
    });

    i += 1;
  }

  return expanded;
}


