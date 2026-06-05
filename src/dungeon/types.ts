// Core grid + direction primitives shared across the engine.

/** Cardinal facing. Values are chosen so `dir * PI/2` is the camera Y rotation. */
export enum Direction {
  North = 0, // +z
  East = 1, // +x
  South = 2, // -z
  West = 3, // -x
}

export interface GridDelta {
  dx: number;
  dz: number;
}

/** Unit step for each facing. North faces +z to match Babylon's default camera. */
export const DIR_DELTA: Record<Direction, GridDelta> = {
  [Direction.North]: { dx: 0, dz: 1 },
  [Direction.East]: { dx: 1, dz: 0 },
  [Direction.South]: { dx: 0, dz: -1 },
  [Direction.West]: { dx: -1, dz: 0 },
};

export const DIR_LABEL: Record<Direction, string> = {
  [Direction.North]: 'N',
  [Direction.East]: 'E',
  [Direction.South]: 'S',
  [Direction.West]: 'W',
};

export function turnLeft(dir: Direction): Direction {
  return ((dir + 3) % 4) as Direction;
}

export function turnRight(dir: Direction): Direction {
  return ((dir + 1) % 4) as Direction;
}

/** Camera Y-rotation (radians) for a facing. */
export function dirToYaw(dir: Direction): number {
  return (dir * Math.PI) / 2;
}

export interface Cell {
  x: number;
  z: number;
}

export function cellKey(x: number, z: number): string {
  return `${x},${z}`;
}

// ---- Level data (authored as JSON, see src/data/levels) ----

export interface DoorDef {
  id: string;
  x: number;
  z: number;
}

export interface LeverDef {
  id: string;
  x: number;
  z: number;
  target: string; // door id it toggles
}

export type ItemKind = 'weapon' | 'potion';

export interface ItemDef {
  id: string;
  name: string;
  x: number;
  z: number;
  kind: ItemKind;
  /** Weapons: melee power. */
  attack?: number;
  /** Potions: hit points restored to each living member. */
  heal?: number;
  icon?: string;
}

export interface StairDef {
  id: string;
  x: number;
  z: number;
  kind: 'down' | 'up';
  /** Facing to adopt on arrival. */
  dir: Direction;
  /** Level id to travel to. */
  targetLevel: string;
  /** Stair id on the target level to arrive on. */
  targetStair: string;
}

export interface MonsterDef {
  id: string;
  type: string;
  x: number;
  z: number;
}

export interface TorchDef {
  x: number;
  z: number;
}

export interface StartPos {
  x: number;
  z: number;
  dir: Direction;
}

export interface LevelData {
  id: string;
  name: string;
  /** Each string is one row (z index). Chars: '#' wall, '.' floor, 'D' door. */
  rows: string[];
  start: StartPos;
  objects: {
    doors: DoorDef[];
    levers: LeverDef[];
    items: ItemDef[];
    monsters: MonsterDef[];
    torches: TorchDef[];
    stairs: StairDef[];
  };
}

export const enum Tile {
  Wall = '#',
  Floor = '.',
  Door = 'D',
}
