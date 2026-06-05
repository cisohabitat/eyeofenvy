import { Scene, UniversalCamera, Vector3 } from '@babylonjs/core';
import { Direction, dirToYaw } from '../dungeon/types';
import { CELL_SIZE, EYE_HEIGHT } from './constants';

/** Grid cell (x,z) -> world-space position at a given height. */
export function cellToWorld(x: number, z: number, y: number): Vector3 {
  return new Vector3(x * CELL_SIZE, y, z * CELL_SIZE);
}

/**
 * A first-person camera locked to the dungeon grid. The grid controller drives
 * its position/yaw; built-in user inputs are detached so movement stays
 * cell-by-cell (the classic blobber feel).
 */
export class CameraRig {
  readonly camera: UniversalCamera;

  constructor(scene: Scene, x: number, z: number, dir: Direction) {
    this.camera = new UniversalCamera('fpv', cellToWorld(x, z, EYE_HEIGHT), scene);
    this.camera.rotation.y = dirToYaw(dir);
    this.camera.fov = 1.05;
    this.camera.minZ = 0.05;
    this.camera.inputs.clear(); // we move it ourselves
    this.camera.position = cellToWorld(x, z, EYE_HEIGHT);
  }

  setPosition(x: number, z: number): void {
    this.camera.position.copyFrom(cellToWorld(x, z, EYE_HEIGHT));
  }

  /** Live world position (used while tweening). */
  get position(): Vector3 {
    return this.camera.position;
  }

  set yaw(value: number) {
    this.camera.rotation.y = value;
  }

  get yaw(): number {
    return this.camera.rotation.y;
  }
}
