import { describe, it, expect } from 'vitest';
import { GameMemory } from '../src/state/levelState';
import { Party } from '../src/entities/party';

describe('GameMemory persistence', () => {
  it('round-trips per-level sets through JSON', () => {
    const mem = new GameMemory();
    const l1 = mem.forLevel('level01');
    l1.openedDoors.add('door1');
    l1.pickedItems.add('sword1');
    l1.deadMonsters.add('mon1');
    l1.revealed.add('2,3');
    l1.visited = true;

    const restored = GameMemory.fromJSON(mem.toJSON());
    const r1 = restored.forLevel('level01');
    expect([...r1.openedDoors]).toEqual(['door1']);
    expect([...r1.pickedItems]).toEqual(['sword1']);
    expect([...r1.deadMonsters]).toEqual(['mon1']);
    expect([...r1.revealed]).toEqual(['2,3']);
    expect(r1.visited).toBe(true);
  });

  it('lazily creates fresh memory for unseen levels', () => {
    const mem = new GameMemory();
    const fresh = mem.forLevel('level09');
    expect(fresh.visited).toBe(false);
    expect(fresh.openedDoors.size).toBe(0);
  });
});

describe('Party inventory', () => {
  it('equips a weapon to a hand and returns the displaced one to the pack', () => {
    const party = new Party();
    party.addToBackpack({ id: 'sword1', name: 'Sword', x: 0, z: 0, kind: 'weapon', attack: 6 });
    party.equip(0, 'right');
    expect(party.hands.right.attack).toBe(6);
    expect(party.handAttack('right')).toBe(6);
    // Fist is not returned to the pack.
    expect(party.backpack.length).toBe(0);
  });

  it('does not equip a potion', () => {
    const party = new Party();
    party.addToBackpack({ id: 'p1', name: 'Potion', x: 0, z: 0, kind: 'potion', heal: 10 });
    party.equip(0, 'right');
    expect(party.hands.right.id).toBe('fist');
    expect(party.backpack.length).toBe(1);
  });

  it('drinks a potion to heal living members up to maxHp', () => {
    const party = new Party();
    party.members[0].hp = 5;
    party.members[1].hp = 0; // dead — should not be healed
    party.addToBackpack({ id: 'p1', name: 'Potion', x: 0, z: 0, kind: 'potion', heal: 100 });
    const restored = party.usePotion(0);
    expect(party.members[0].hp).toBe(party.members[0].maxHp);
    expect(party.members[1].hp).toBe(0);
    expect(restored).toBeGreaterThan(0);
    expect(party.backpack.length).toBe(0);
  });
});
