import { LevelData, StairDef, Tile, cellKey } from './types';

/**
 * Runtime wrapper over authored LevelData. Owns the grid + mutable door state
 * and answers passability/lookup queries. Pure logic — no Babylon here, so it
 * is unit-testable.
 */
export class Level {
  readonly width: number;
  readonly height: number;
  private readonly grid: string[][];
  /** door id -> open? */
  private readonly doorOpen = new Map<string, boolean>();
  /** "x,z" -> door id, for cells that contain a door tile */
  private readonly doorAt = new Map<string, string>();
  /** "x,z" of cells currently occupied by a living monster (blocks the party) */
  private readonly blocked = new Set<string>();
  /** "x,z" -> stair, for quick lookup when the party stands on one */
  private readonly stairAtCell = new Map<string, StairDef>();

  /**
   * @param data    authored level
   * @param openDoors door ids that should start open (restored from memory)
   */
  constructor(
    readonly data: LevelData,
    openDoors?: Iterable<string>,
  ) {
    this.grid = data.rows.map((row) => row.split(''));
    this.height = this.grid.length;
    this.width = this.grid[0]?.length ?? 0;
    const initiallyOpen = new Set(openDoors ?? []);
    for (const door of data.objects.doors) {
      this.doorOpen.set(door.id, initiallyOpen.has(door.id));
      this.doorAt.set(cellKey(door.x, door.z), door.id);
    }
    for (const stair of data.objects.stairs) {
      this.stairAtCell.set(cellKey(stair.x, stair.z), stair);
    }
  }

  stairAt(x: number, z: number): StairDef | undefined {
    return this.stairAtCell.get(cellKey(x, z));
  }

  stairById(id: string): StairDef | undefined {
    return this.data.objects.stairs.find((s) => s.id === id);
  }

  objects(): LevelData['objects'] {
    return this.data.objects;
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height;
  }

  tileAt(x: number, z: number): string {
    if (!this.inBounds(x, z)) return Tile.Wall;
    return this.grid[z][x];
  }

  doorIdAt(x: number, z: number): string | undefined {
    return this.doorAt.get(cellKey(x, z));
  }

  isDoorOpen(id: string): boolean {
    return this.doorOpen.get(id) ?? false;
  }

  setDoorOpen(id: string, open: boolean): void {
    this.doorOpen.set(id, open);
  }

  setBlocked(x: number, z: number, blocked: boolean): void {
    const key = cellKey(x, z);
    if (blocked) this.blocked.add(key);
    else this.blocked.delete(key);
  }

  isBlocked(x: number, z: number): boolean {
    return this.blocked.has(cellKey(x, z));
  }

  /** Can a creature stand in this cell? Floors and open doors only. */
  isWalkable(x: number, z: number): boolean {
    const tile = this.tileAt(x, z);
    if (tile === Tile.Floor) return true;
    if (tile === Tile.Door) {
      const id = this.doorIdAt(x, z);
      return id ? this.isDoorOpen(id) : false;
    }
    return false;
  }

  /** Walkable AND not occupied by a creature. Used for movement collision. */
  isPassable(x: number, z: number): boolean {
    return this.isWalkable(x, z) && !this.isBlocked(x, z);
  }
}
