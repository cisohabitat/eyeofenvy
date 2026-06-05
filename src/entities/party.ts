import { ItemDef, ItemKind } from '../dungeon/types';

export interface Character {
  name: string;
  hp: number;
  maxHp: number;
}

export type HandSide = 'left' | 'right';

export interface Weapon {
  id: string;
  name: string;
  attack: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: ItemKind;
  attack?: number;
  heal?: number;
}

const FIST: Weapon = { id: 'fist', name: 'Fist', attack: 3 };

/**
 * The adventuring party: a roster of characters that share two weapon hands and
 * a backpack. Combat in the slice resolves at the party level (front rank).
 */
export class Party {
  members: Character[] = [
    { name: 'Borin', hp: 28, maxHp: 28 },
    { name: 'Yssil', hp: 20, maxHp: 20 },
    { name: 'Kethra', hp: 22, maxHp: 22 },
    { name: 'Dann', hp: 18, maxHp: 18 },
  ];

  hands: Record<HandSide, Weapon> = {
    left: { ...FIST },
    right: { ...FIST },
  };

  backpack: InventoryItem[] = [];

  /** Replace party state in place (used when loading a save). */
  restore(members: Character[], hands: Record<HandSide, Weapon>, backpack: InventoryItem[]): void {
    this.members = members.map((m) => ({ ...m }));
    this.hands = { left: { ...hands.left }, right: { ...hands.right } };
    this.backpack = backpack.map((i) => ({ ...i }));
  }

  livingMembers(): Character[] {
    return this.members.filter((m) => m.hp > 0);
  }

  isWiped(): boolean {
    return this.livingMembers().length === 0;
  }

  /** Attack power of the given hand. */
  handAttack(side: HandSide): number {
    return this.hands[side].attack;
  }

  /** Apply incoming damage to a random living member. Returns who was hit. */
  damageRandom(dmg: number): Character | null {
    const alive = this.livingMembers();
    if (alive.length === 0) return null;
    const victim = alive[Math.floor(Math.random() * alive.length)];
    victim.hp = Math.max(0, victim.hp - dmg);
    return victim;
  }

  addToBackpack(item: ItemDef): void {
    this.backpack.push({
      id: item.id,
      name: item.name,
      kind: item.kind,
      attack: item.attack,
      heal: item.heal,
    });
  }

  /** Move a backpack weapon into a hand; the displaced weapon returns to the pack. */
  equip(index: number, side: HandSide): void {
    const item = this.backpack[index];
    if (!item || item.kind !== 'weapon') return;
    this.backpack.splice(index, 1);
    const previous = this.hands[side];
    this.hands[side] = { id: item.id, name: item.name, attack: item.attack ?? 0 };
    if (previous.id !== 'fist') {
      this.backpack.push({ id: previous.id, name: previous.name, kind: 'weapon', attack: previous.attack });
    }
  }

  /** Drink a potion: heal every living member, capped at maxHp. Returns hp restored. */
  usePotion(index: number): number {
    const item = this.backpack[index];
    if (!item || item.kind !== 'potion') return 0;
    const heal = item.heal ?? 0;
    let restored = 0;
    for (const m of this.members) {
      if (m.hp <= 0) continue;
      const before = m.hp;
      m.hp = Math.min(m.maxHp, m.hp + heal);
      restored += m.hp - before;
    }
    this.backpack.splice(index, 1);
    return restored;
  }
}
