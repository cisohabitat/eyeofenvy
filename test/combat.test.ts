import { describe, it, expect } from 'vitest';
import { computeDamage, applyDamage, isAdjacent, Cooldown } from '../src/combat/combat';

describe('computeDamage', () => {
  it('scales between 0.7x and 1.3x of attack', () => {
    expect(computeDamage(10, () => 0)).toBe(7); // 10 * 0.7
    expect(computeDamage(10, () => 1)).toBe(13); // 10 * 1.3
    expect(computeDamage(10, () => 0.5)).toBe(10);
  });

  it('never deals less than 1', () => {
    expect(computeDamage(0, () => 0)).toBe(1);
  });
});

describe('applyDamage', () => {
  it('clamps hp at zero and reports death', () => {
    const t = { hp: 5, maxHp: 5 };
    expect(applyDamage(t, 3)).toEqual({ hp: 2, dead: false });
    expect(applyDamage(t, 10)).toEqual({ hp: 0, dead: true });
  });
});

describe('isAdjacent', () => {
  it('is true only for orthogonal neighbors', () => {
    expect(isAdjacent(2, 2, 2, 3)).toBe(true);
    expect(isAdjacent(2, 2, 3, 3)).toBe(false); // diagonal
    expect(isAdjacent(2, 2, 2, 2)).toBe(false); // same cell
  });
});

describe('Cooldown', () => {
  it('gates reuse until the interval has elapsed', () => {
    const cd = new Cooldown(1);
    expect(cd.tryUse(0)).toBe(true);
    expect(cd.tryUse(0.5)).toBe(false);
    expect(cd.tryUse(1.0)).toBe(true);
  });
});
