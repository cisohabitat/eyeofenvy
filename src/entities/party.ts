import { ItemDef } from '../dungeon/types';

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

  backpack: Weapon[] = [];

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
    this.backpack.push({ id: item.id, name: item.name, attack: item.attack });
  }

  /** Move a backpack weapon into a hand, returning the displaced weapon. */
  equip(index: number, side: HandSide): void {
    const weapon = this.backpack[index];
    if (!weapon) return;
    this.backpack.splice(index, 1);
    const previous = this.hands[side];
    this.hands[side] = weapon;
    if (previous.id !== 'fist') this.backpack.push(previous);
  }
}
