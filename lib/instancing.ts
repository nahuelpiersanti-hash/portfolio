/**
 * Phase 2 Architecture Foundation
 * Instanced rendering setup for block systems
 */

import * as THREE from 'three';

export interface BlockData {
  id: string;
  domainId: string;
  position: THREE.Vector3;
  color: THREE.Color;
  scale: number;
}

/**
 * Instanced geometry manager for efficient block rendering
 * Reduces draw calls from N to 1 for N blocks
 */
export class InstancedBlockManager {
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.InstancedMesh | null = null;
  private blocks: BlockData[] = [];
  private maxInstances: number;

  constructor(maxInstances: number = 200) {
    this.maxInstances = maxInstances;
    
    // Shared geometry for all blocks
    this.geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    
    // Shared material with vertex colors support
    this.material = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.2,
      vertexColors: true,
    });
  }

  initialize() {
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxInstances
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return this.mesh;
  }

  addBlock(block: BlockData) {
    if (this.blocks.length >= this.maxInstances) {
      console.warn('Maximum instance count reached');
      return;
    }

    this.blocks.push(block);
    this.updateInstance(this.blocks.length - 1);
  }

  private updateInstance(index: number) {
    if (!this.mesh) return;

    const block = this.blocks[index];
    const matrix = new THREE.Matrix4();
    
    // Position and scale
    matrix.compose(
      block.position,
      new THREE.Quaternion(),
      new THREE.Vector3(block.scale, block.scale, block.scale)
    );
    
    this.mesh.setMatrixAt(index, matrix);
    this.mesh.setColorAt(index, block.color);
    
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.blocks = [];
  }

  get count() {
    return this.blocks.length;
  }
}

/**
 * LOD (Level of Detail) configuration
 * Automatically adjusts geometry complexity based on camera distance
 */
export function createLODSphere(radius: number) {
  const lod = new THREE.LOD();

  // High detail (close)
  const highGeo = new THREE.SphereGeometry(radius, 32, 32);
  const highMesh = new THREE.Mesh(highGeo, new THREE.MeshStandardMaterial());
  lod.addLevel(highMesh, 0);

  // Medium detail
  const medGeo = new THREE.SphereGeometry(radius, 16, 16);
  const medMesh = new THREE.Mesh(medGeo, new THREE.MeshStandardMaterial());
  lod.addLevel(medMesh, 10);

  // Low detail (far)
  const lowGeo = new THREE.SphereGeometry(radius, 8, 8);
  const lowMesh = new THREE.Mesh(lowGeo, new THREE.MeshStandardMaterial());
  lod.addLevel(lowMesh, 20);

  return lod;
}
