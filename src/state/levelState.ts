import { Character, InventoryItem, Weapon } from '../entities/party';
import { Direction } from '../dungeon/types';

/**
 * Mutable memory for a single level. Persisted across stair transitions (and
 * into save files) so a floor looks the way you left it: doors still open,
 * loot gone, slain monsters absent, explored tiles still on the automap.
 */
export interface LevelMemory {
  openedDoors: Set<string>;
  pickedItems: Set<string>;
  deadMonsters: Set<string>;
  revealed: Set<string>; // "x,z"
  visited: boolean;
}

function emptyMemory(): LevelMemory {
  return {
    openedDoors: new Set(),
    pickedItems: new Set(),
    deadMonsters: new Set(),
    revealed: new Set(),
    visited: false,
  };
}

interface SerializedMemory {
  openedDoors: string[];
  pickedItems: string[];
  deadMonsters: string[];
  revealed: string[];
  visited: boolean;
}

/** Per-level memory for the whole dungeon, lazily created per level id. */
export class GameMemory {
  private levels = new Map<string, LevelMemory>();

  forLevel(id: string): LevelMemory {
    let mem = this.levels.get(id);
    if (!mem) {
      mem = emptyMemory();
      this.levels.set(id, mem);
    }
    return mem;
  }

  toJSON(): Record<string, SerializedMemory> {
    const out: Record<string, SerializedMemory> = {};
    for (const [id, m] of this.levels) {
      out[id] = {
        openedDoors: [...m.openedDoors],
        pickedItems: [...m.pickedItems],
        deadMonsters: [...m.deadMonsters],
        revealed: [...m.revealed],
        visited: m.visited,
      };
    }
    return out;
  }

  static fromJSON(data: Record<string, SerializedMemory>): GameMemory {
    const gm = new GameMemory();
    for (const [id, m] of Object.entries(data)) {
      gm.levels.set(id, {
        openedDoors: new Set(m.openedDoors),
        pickedItems: new Set(m.pickedItems),
        deadMonsters: new Set(m.deadMonsters),
        revealed: new Set(m.revealed),
        visited: m.visited,
      });
    }
    return gm;
  }
}

// ---- Whole-game save state ----

export const SAVE_KEY = 'eyeofenvy.save.v1';

export interface SaveState {
  version: 1;
  currentLevel: string;
  x: number;
  z: number;
  dir: Direction;
  party: {
    members: Character[];
    hands: { left: Weapon; right: Weapon };
    backpack: InventoryItem[];
  };
  memory: Record<string, SerializedMemory>;
}
