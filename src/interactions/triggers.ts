import { Scene, MeshBuilder, Mesh, Vector3, PBRMaterial, Color3 } from '@babylonjs/core';
import { Level } from '../dungeon/level';
import { ItemDef, LeverDef } from '../dungeon/types';
import { Party } from '../entities/party';
import { CELL_SIZE, WALL_HEIGHT } from '../engine/constants';
import { cellToWorld } from '../engine/cameraRig';
import { animateDoor } from '../dungeon/meshBuilder';

interface ItemInstance {
  def: ItemDef;
  mesh: Mesh;
}

interface LeverInstance {
  def: LeverDef;
  mesh: Mesh;
  on: boolean;
}

/** Manages floor pickups and wall levers/doors. */
export class InteractionManager {
  private items: ItemInstance[] = [];
  private levers: LeverInstance[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly level: Level,
    private readonly party: Party,
    private readonly doorMeshes: Map<string, Mesh>,
    private readonly onLog: (msg: string) => void,
    private readonly onChanged: () => void,
  ) {
    this.buildItems();
    this.buildLevers();
    this.scene.onBeforeRenderObservable.add(() => this.bob());
  }

  private buildItems(): void {
    for (const def of this.level.objects().items) {
      const mesh = MeshBuilder.CreatePolyhedron(`item-${def.id}`, { type: 1, size: 0.25 }, this.scene);
      const mat = new PBRMaterial(`itemMat-${def.id}`, this.scene);
      mat.albedoColor = new Color3(0.6, 0.5, 0.15);
      mat.emissiveColor = new Color3(0.9, 0.75, 0.25);
      mat.metallic = 0.8;
      mat.roughness = 0.3;
      mesh.material = mat;
      mesh.position = cellToWorld(def.x, def.z, 0.7);
      this.items.push({ def, mesh });
    }
  }

  private buildLevers(): void {
    for (const def of this.level.objects().levers) {
      const facing = this.floorNeighborOffset(def.x, def.z);
      const mesh = MeshBuilder.CreateBox(`lever-${def.id}`, { width: 0.12, height: 0.6, depth: 0.18 }, this.scene);
      const mat = new PBRMaterial(`leverMat-${def.id}`, this.scene);
      mat.albedoColor = new Color3(0.5, 0.45, 0.2);
      mat.metallic = 0.9;
      mat.roughness = 0.35;
      mesh.material = mat;
      mesh.position = cellToWorld(def.x, def.z, WALL_HEIGHT * 0.5).add(
        new Vector3(facing.x * CELL_SIZE * 0.5, 0, facing.z * CELL_SIZE * 0.5),
      );
      mesh.rotation.x = 0.5; // resting "up" position
      this.levers.push({ def, mesh, on: false });
    }
  }

  /** Try to use whatever is on the cell ahead. Returns true if something fired. */
  interact(x: number, z: number): boolean {
    const lever = this.levers.find((l) => l.def.x === x && l.def.z === z);
    if (!lever) return false;
    lever.on = !lever.on;
    lever.mesh.rotation.x = lever.on ? -0.5 : 0.5;
    const door = this.doorMeshes.get(lever.def.target);
    if (door) {
      this.level.setDoorOpen(lever.def.target, lever.on);
      animateDoor(this.scene, door, lever.on);
      this.onLog(lever.on ? 'A grinding sound — the door opens.' : 'The door grinds shut.');
    }
    return true;
  }

  /** Pick up any item on the party's current cell. */
  checkPickup(x: number, z: number): void {
    const idx = this.items.findIndex((i) => i.def.x === x && i.def.z === z);
    if (idx === -1) return;
    const item = this.items[idx];
    this.party.addToBackpack(item.def);
    item.mesh.dispose();
    this.items.splice(idx, 1);
    this.onLog(`Picked up ${item.def.name}.`);
    this.onChanged();
  }

  private bob(): void {
    const t = performance.now() / 1000;
    for (const it of this.items) {
      it.mesh.rotation.y = t * 1.5;
      it.mesh.position.y = 0.7 + Math.sin(t * 2) * 0.08;
    }
  }

  private floorNeighborOffset(x: number, z: number): { x: number; z: number } {
    const candidates = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ];
    for (const c of candidates) {
      if (this.level.isWalkable(x + c.x, z + c.z)) return c;
    }
    return { x: 0, z: 0 };
  }
}
