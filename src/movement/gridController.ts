import { Scene, Vector3 } from '@babylonjs/core';
import { CameraRig, cellToWorld } from '../engine/cameraRig';
import { Level } from '../dungeon/level';
import {
  Direction,
  DIR_DELTA,
  StartPos,
  turnLeft as dirLeft,
  turnRight as dirRight,
} from '../dungeon/types';
import { EYE_HEIGHT, STEP_MS } from '../engine/constants';

type Vec2 = { x: number; z: number };

/**
 * Drives the party as a single grid token. Forward/back/strafe move exactly one
 * cell (when passable); turns rotate 90°. Both are eased tweens so motion reads
 * smoothly while staying grid-locked. Input is ignored while a tween runs.
 */
export class GridController {
  x: number;
  z: number;
  dir: Direction;

  /** Fired after a successful step lands on a new cell. */
  onStep?: (x: number, z: number) => void;
  /** Fired when a move is blocked (wall / closed door / creature). */
  onBlocked?: () => void;
  /** Fired after a turn completes. */
  onTurn?: (dir: Direction) => void;

  private busy = false;
  private yaw: number;

  constructor(
    private readonly scene: Scene,
    private readonly rig: CameraRig,
    private readonly level: Level,
    start: StartPos,
  ) {
    this.x = start.x;
    this.z = start.z;
    this.dir = start.dir;
    this.yaw = (start.dir * Math.PI) / 2;
    this.rig.yaw = this.yaw;
    this.rig.setPosition(start.x, start.z); // place camera (rig is reused across floors)
  }

  get isBusy(): boolean {
    return this.busy;
  }

  /** Cell directly ahead of the party (for interact / attack). */
  frontCell(): Vec2 {
    const d = DIR_DELTA[this.dir];
    return { x: this.x + d.dx, z: this.z + d.dz };
  }

  forward(): void {
    this.step(this.dir);
  }
  back(): void {
    this.step(((this.dir + 2) % 4) as Direction);
  }
  strafeLeft(): void {
    this.step(dirLeft(this.dir));
  }
  strafeRight(): void {
    this.step(dirRight(this.dir));
  }
  turnLeft(): void {
    this.turn(-1);
  }
  turnRight(): void {
    this.turn(1);
  }

  private step(moveDir: Direction): void {
    if (this.busy) return;
    const d = DIR_DELTA[moveDir];
    const nx = this.x + d.dx;
    const nz = this.z + d.dz;
    if (!this.level.isPassable(nx, nz)) {
      this.onBlocked?.();
      return;
    }
    const from = this.rig.position.clone();
    const to = cellToWorld(nx, nz, EYE_HEIGHT);
    this.x = nx;
    this.z = nz;
    this.tween(STEP_MS, (t) => {
      this.rig.position.copyFrom(Vector3.Lerp(from, to, t));
    }).then(() => this.onStep?.(this.x, this.z));
  }

  private turn(sign: 1 | -1): void {
    if (this.busy) return;
    this.dir = (sign > 0 ? dirRight(this.dir) : dirLeft(this.dir)) as Direction;
    const from = this.yaw;
    const to = this.yaw + (sign * Math.PI) / 2;
    this.yaw = to;
    this.tween(STEP_MS, (t) => {
      this.rig.yaw = from + (to - from) * t;
    }).then(() => this.onTurn?.(this.dir));
  }

  /** Eased (smoothstep) tween over `ms`, calling `apply(t)` each frame. */
  private tween(ms: number, apply: (t: number) => void): Promise<void> {
    this.busy = true;
    const start = performance.now();
    return new Promise((resolve) => {
      const obs = this.scene.onBeforeRenderObservable.add(() => {
        const raw = Math.min(1, (performance.now() - start) / ms);
        const t = raw * raw * (3 - 2 * raw); // smoothstep
        apply(t);
        if (raw >= 1) {
          this.scene.onBeforeRenderObservable.remove(obs);
          this.busy = false;
          resolve();
        }
      });
    });
  }
}
