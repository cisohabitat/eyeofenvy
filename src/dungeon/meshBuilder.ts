import {
  Scene,
  MeshBuilder,
  Mesh,
  Vector3,
  PBRMaterial,
  Color3,
  NoiseProceduralTexture,
  Animation,
} from '@babylonjs/core';
import { Level } from './level';
import { Tile } from './types';
import { CELL_SIZE, WALL_HEIGHT } from '../engine/constants';
import { Disposables } from '../engine/disposables';
import { cellToWorld } from '../engine/cameraRig';

export interface DungeonMeshes {
  doorMeshes: Map<string, Mesh>;
}

function stoneNoise(scene: Scene, name: string): NoiseProceduralTexture {
  const noise = new NoiseProceduralTexture(name, 256, scene);
  noise.octaves = 4;
  noise.persistence = 0.8;
  noise.animationSpeedFactor = 0; // static relief
  return noise;
}

function wallMaterial(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('wallMat', scene);
  mat.albedoColor = new Color3(0.26, 0.24, 0.22);
  mat.metallic = 0;
  mat.roughness = 0.92;
  const bump = stoneNoise(scene, 'wallBump');
  mat.bumpTexture = bump;
  mat.bumpTexture.level = 0.7;
  return mat;
}

function floorMaterial(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('floorMat', scene);
  mat.albedoColor = new Color3(0.16, 0.15, 0.14);
  mat.metallic = 0;
  mat.roughness = 0.95;
  const bump = stoneNoise(scene, 'floorBump');
  mat.bumpTexture = bump;
  mat.bumpTexture.level = 0.5;
  return mat;
}

function ceilingMaterial(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('ceilMat', scene);
  mat.albedoColor = new Color3(0.1, 0.09, 0.09);
  mat.metallic = 0;
  mat.roughness = 0.98;
  return mat;
}

function doorMaterial(scene: Scene): PBRMaterial {
  const mat = new PBRMaterial('doorMat', scene);
  mat.albedoColor = new Color3(0.3, 0.17, 0.07);
  mat.metallic = 0.2;
  mat.roughness = 0.6;
  mat.emissiveColor = new Color3(0.04, 0.02, 0.0);
  return mat;
}

/**
 * Builds floor + ceiling slabs spanning the grid, merged wall geometry for every
 * '#' cell, and an animatable mesh per door. Returns handles needed to animate
 * doors at runtime.
 */
export function buildDungeon(scene: Scene, level: Level, bin: Disposables): DungeonMeshes {
  const worldW = level.width * CELL_SIZE;
  const worldH = level.height * CELL_SIZE;
  const cx = ((level.width - 1) * CELL_SIZE) / 2;
  const cz = ((level.height - 1) * CELL_SIZE) / 2;

  // Floor + ceiling slabs.
  const floor = MeshBuilder.CreateGround('floor', { width: worldW, height: worldH }, scene);
  floor.position = new Vector3(cx, 0, cz);
  floor.material = floorMaterial(scene);
  bin.addDisposable(floor);

  const ceiling = MeshBuilder.CreateGround('ceiling', { width: worldW, height: worldH }, scene);
  ceiling.position = new Vector3(cx, WALL_HEIGHT, cz);
  ceiling.rotation.x = Math.PI; // face downward
  ceiling.material = ceilingMaterial(scene);
  bin.addDisposable(ceiling);

  // Wall boxes for every solid cell, merged into one mesh for performance.
  const wallBoxes: Mesh[] = [];
  for (let z = 0; z < level.height; z++) {
    for (let x = 0; x < level.width; x++) {
      if (level.tileAt(x, z) === Tile.Wall) {
        const box = MeshBuilder.CreateBox(
          `w-${x}-${z}`,
          { width: CELL_SIZE, height: WALL_HEIGHT, depth: CELL_SIZE },
          scene,
        );
        box.position = new Vector3(x * CELL_SIZE, WALL_HEIGHT / 2, z * CELL_SIZE);
        wallBoxes.push(box);
      }
    }
  }
  const walls = Mesh.MergeMeshes(wallBoxes, true, true);
  if (walls) {
    walls.name = 'walls';
    walls.material = wallMaterial(scene);
    walls.checkCollisions = false;
    bin.addDisposable(walls);
  }

  // Doors — a slab that sinks into the floor when opened. Restore open ones.
  const doorMeshes = new Map<string, Mesh>();
  const doorMat = doorMaterial(scene);
  bin.addDisposable(doorMat);
  for (const d of level.objects().doors) {
    const door = MeshBuilder.CreateBox(
      `door-${d.id}`,
      { width: CELL_SIZE * 0.9, height: WALL_HEIGHT, depth: CELL_SIZE * 0.3 },
      scene,
    );
    const openY = level.isDoorOpen(d.id) ? -WALL_HEIGHT + 0.2 : WALL_HEIGHT / 2;
    door.position = new Vector3(d.x * CELL_SIZE, openY, d.z * CELL_SIZE);
    door.material = doorMat;
    doorMeshes.set(d.id, door);
    bin.addDisposable(door);
  }

  // Stairs — a beveled marker the party steps onto to change floors.
  const downMat = stairMaterial(scene, 'down', new Color3(0.2, 0.7, 0.9));
  const upMat = stairMaterial(scene, 'up', new Color3(0.4, 0.85, 0.45));
  bin.addDisposable(downMat);
  bin.addDisposable(upMat);
  for (const s of level.objects().stairs) {
    const slab = MeshBuilder.CreateCylinder(
      `stair-${s.id}`,
      { diameterTop: CELL_SIZE * 0.5, diameterBottom: CELL_SIZE * 0.85, height: 0.3, tessellation: 6 },
      scene,
    );
    slab.position = cellToWorld(s.x, s.z, 0.15);
    slab.material = s.kind === 'down' ? downMat : upMat;
    bin.addDisposable(slab);
  }

  return { doorMeshes };
}

function stairMaterial(scene: Scene, kind: string, color: Color3): PBRMaterial {
  const mat = new PBRMaterial(`stairMat-${kind}`, scene);
  mat.albedoColor = color.scale(0.3);
  mat.emissiveColor = color;
  mat.metallic = 0.2;
  mat.roughness = 0.4;
  return mat;
}

/** Slide a door mesh down (open) or back up (close) over ~0.6s. */
export function animateDoor(scene: Scene, door: Mesh, open: boolean): void {
  const from = door.position.y;
  const to = open ? -WALL_HEIGHT + 0.2 : WALL_HEIGHT / 2;
  Animation.CreateAndStartAnimation(
    'door-anim',
    door,
    'position.y',
    60,
    36,
    from,
    to,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
    undefined,
    undefined,
    scene,
  );
}
