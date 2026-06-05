import { Scene, MeshBuilder, Mesh, Vector3, PBRMaterial, Color3 } from '@babylonjs/core';
import { Level } from '../dungeon/level';
import { CELL_SIZE } from '../engine/constants';
import { cellToWorld } from '../engine/cameraRig';
import { Party } from './party';
import { applyDamage, computeDamage, isAdjacent, Cooldown } from '../combat/combat';
import { LevelMemory } from '../state/levelState';

const MONSTER_STATS: Record<string, { hp: number; attack: number; color: Color3 }> = {
  kobold: { hp: 16, attack: 5, color: new Color3(0.85, 0.15, 0.12) },
};

class Monster {
  hp: number;
  maxHp: number;
  attack: number;
  readonly mesh: Mesh;
  target: Vector3;
  private moveTimer = 0;
  private readonly atkCd = new Cooldown(1.3);

  constructor(
    scene: Scene,
    readonly id: string,
    type: string,
    public x: number,
    public z: number,
  ) {
    const stats = MONSTER_STATS[type] ?? MONSTER_STATS.kobold;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.attack = stats.attack;

    this.mesh = MeshBuilder.CreateCapsule(`mon-${id}`, { height: 1.6, radius: 0.5 }, scene);
    const mat = new PBRMaterial(`monMat-${id}`, scene);
    mat.albedoColor = stats.color.scale(0.3);
    mat.emissiveColor = stats.color;
    mat.metallic = 0.1;
    mat.roughness = 0.5;
    this.mesh.material = mat;
    const world = cellToWorld(x, z, 0.9);
    this.mesh.position.copyFrom(world);
    this.target = world.clone();
  }

  /** Returns party damage to apply this tick, or 0. */
  think(level: Level, px: number, pz: number, now: number): number {
    this.moveTimer += 1;
    if (isAdjacent(this.x, this.z, px, pz)) {
      this.mesh.lookAt(new Vector3(px * CELL_SIZE, this.mesh.position.y, pz * CELL_SIZE));
      if (this.atkCd.tryUse(now)) return computeDamage(this.attack);
      return 0;
    }
    // Step toward the party every few ticks (≈ once per second at 60fps / 50).
    if (this.moveTimer < 50) return 0;
    this.moveTimer = 0;
    this.stepToward(level, px, pz);
    return 0;
  }

  private stepToward(level: Level, px: number, pz: number): void {
    const dx = Math.sign(px - this.x);
    const dz = Math.sign(pz - this.z);
    // Prefer the axis with the larger remaining distance.
    const order =
      Math.abs(px - this.x) >= Math.abs(pz - this.z)
        ? [
            { x: dx, z: 0 },
            { x: 0, z: dz },
          ]
        : [
            { x: 0, z: dz },
            { x: dx, z: 0 },
          ];
    for (const o of order) {
      if (o.x === 0 && o.z === 0) continue;
      const nx = this.x + o.x;
      const nz = this.z + o.z;
      if (level.isPassable(nx, nz)) {
        level.setBlocked(this.x, this.z, false);
        this.x = nx;
        this.z = nz;
        level.setBlocked(nx, nz, true);
        this.target = cellToWorld(nx, nz, 0.9);
        return;
      }
    }
  }

  animate(dt: number): void {
    this.mesh.position = Vector3.Lerp(this.mesh.position, this.target, Math.min(1, dt * 5));
    this.mesh.position.y = 0.9 + Math.sin(performance.now() / 250) * 0.08;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}

export interface AttackResult {
  hit: boolean;
  killed: boolean;
  dmg: number;
}

/** Owns all monsters: spawns them, runs AI, resolves the party's attacks. */
export class MonsterManager {
  private monsters: Monster[] = [];

  constructor(
    scene: Scene,
    private readonly level: Level,
    private readonly party: Party,
    private readonly memory: LevelMemory,
    private readonly getPlayer: () => { x: number; z: number },
    private readonly onLog: (msg: string) => void,
    private readonly onPartyChanged: () => void,
  ) {
    for (const m of level.objects().monsters) {
      if (this.memory.deadMonsters.has(m.id)) continue; // already slain on this floor
      const mon = new Monster(scene, m.id, m.type, m.x, m.z);
      this.level.setBlocked(m.x, m.z, true);
      this.monsters.push(mon);
    }
  }

  get remaining(): number {
    return this.monsters.length;
  }

  update(dt: number, now: number): void {
    const p = this.getPlayer();
    for (const mon of this.monsters) {
      const dmg = mon.think(this.level, p.x, p.z, now);
      if (dmg > 0) {
        const victim = this.party.damageRandom(dmg);
        if (victim) {
          this.onLog(`The creature hits ${victim.name} for ${dmg}.`);
          this.onPartyChanged();
          if (this.party.isWiped()) this.onLog('Your party has fallen...');
        }
      }
      mon.animate(dt);
    }
  }

  /** Resolve a party attack on the cell directly ahead. */
  attackCell(x: number, z: number, attack: number): AttackResult {
    const mon = this.monsters.find((m) => m.x === x && m.z === z);
    if (!mon) return { hit: false, killed: false, dmg: 0 };
    const dmg = computeDamage(attack);
    const { dead } = applyDamage(mon, dmg);
    if (dead) {
      this.level.setBlocked(mon.x, mon.z, false);
      this.memory.deadMonsters.add(mon.id);
      mon.dispose();
      this.monsters = this.monsters.filter((m) => m !== mon);
    }
    return { hit: true, killed: dead, dmg };
  }

  /** Tear down all monster meshes when the floor is unloaded. */
  dispose(): void {
    for (const mon of this.monsters) mon.dispose();
    this.monsters = [];
  }
}
