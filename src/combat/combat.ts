// Pure combat math — no Babylon, no DOM — so it can be unit-tested directly.

export interface Damageable {
  hp: number;
  maxHp: number;
}

/**
 * Damage for an attack of the given power. Variance is 0.7x–1.3x; an injectable
 * RNG keeps this deterministic under test. Always at least 1.
 */
export function computeDamage(attack: number, rng: () => number = Math.random): number {
  const variance = 0.7 + rng() * 0.6;
  return Math.max(1, Math.round(attack * variance));
}

/** Subtract damage, clamped at 0. Returns the new hp and whether it died. */
export function applyDamage(target: Damageable, dmg: number): { hp: number; dead: boolean } {
  target.hp = Math.max(0, target.hp - dmg);
  return { hp: target.hp, dead: target.hp <= 0 };
}

/** Manhattan-adjacency on the grid (the only range that can melee). */
export function isAdjacent(ax: number, az: number, bx: number, bz: number): boolean {
  return Math.abs(ax - bx) + Math.abs(az - bz) === 1;
}

/** Simple cooldown gate keyed on elapsed time. */
export class Cooldown {
  private ready = 0;
  constructor(private readonly seconds: number) {}

  tryUse(nowSeconds: number): boolean {
    if (nowSeconds < this.ready) return false;
    this.ready = nowSeconds + this.seconds;
    return true;
  }
}
