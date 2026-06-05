import { Engine, Scene } from '@babylonjs/core';
import { createEngine } from './engine/scene';
import { setupLighting } from './engine/lighting';
import { CameraRig } from './engine/cameraRig';
import { Disposables } from './engine/disposables';
import { Level } from './dungeon/level';
import { LevelData, StairDef, StartPos } from './dungeon/types';
import { buildDungeon } from './dungeon/meshBuilder';
import { GridController } from './movement/gridController';
import { Party, HandSide } from './entities/party';
import { MonsterManager } from './entities/monster';
import { InteractionManager } from './interactions/triggers';
import { Hud } from './ui/hud';
import { Minimap } from './ui/minimap';
import { Inventory } from './ui/inventory';
import { Sound } from './audio/sound';
import { GameMemory, SaveState, SAVE_KEY } from './state/levelState';

import level01 from './data/levels/level01.json';
import level02 from './data/levels/level02.json';

/** Registry of all authored floors, keyed by level id. */
const LEVELS: Record<string, LevelData> = {
  level01: level01 as unknown as LevelData,
  level02: level02 as unknown as LevelData,
};

type Placement = { kind: 'pos'; x: number; z: number; dir: number } | { kind: 'stair'; stairId: string };

/** Everything tied to the currently-loaded floor; replaced on every transition. */
interface LevelBundle {
  id: string;
  level: Level;
  controller: GridController;
  monsters: MonsterManager;
  interactions: InteractionManager;
  minimap: Minimap;
  bin: Disposables;
}

/**
 * Top-level game orchestrator. Owns persistent state (party, per-level memory,
 * HUD) and swaps the active floor in/out, tearing down all of a floor's Babylon
 * resources via its Disposables bin so transitions don't leak.
 */
export class Game {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly rig: CameraRig;
  private readonly party = new Party();
  private readonly sound = new Sound();
  private readonly hud: Hud;
  private readonly inventory: Inventory;
  private readonly minimapCanvas: HTMLCanvasElement;
  private memory = new GameMemory();

  private bundle: LevelBundle | null = null;
  private started = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = createEngine(canvas);
    this.engine = ctx.engine;
    this.scene = ctx.scene;
    this.rig = new CameraRig(this.scene, 0, 0, 0);
    this.scene.activeCamera = this.rig.camera;

    this.hud = new Hud(this.party);
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.inventory = new Inventory(
      this.party,
      () => this.hud.renderHands(),
      (msg) => this.hud.log(msg),
    );

    this.hud.onAttack((side) => this.attack(side));
    this.wireInput();

    this.engine.runRenderLoop(() => {
      if (this.started && this.bundle) {
        const dt = this.engine.getDeltaTime() / 1000;
        const now = performance.now() / 1000;
        this.bundle.monsters.update(dt, now);
      }
      this.scene.render();
    });
  }

  /** Begin a fresh game from the start of level 1. */
  start(): void {
    this.sound.resume();
    this.started = true;
    const s = LEVELS.level01.start;
    this.loadLevel('level01', { kind: 'pos', x: s.x, z: s.z, dir: s.dir });
  }

  // ---- Level lifecycle ----

  private loadLevel(id: string, placement: Placement): void {
    if (this.bundle) {
      this.bundle.monsters.dispose();
      this.bundle.interactions.dispose();
      this.bundle.bin.disposeAll();
      this.bundle = null;
    }

    const data = LEVELS[id];
    const mem = this.memory.forLevel(id);
    mem.visited = true;

    const level = new Level(data, mem.openedDoors);
    const bin = new Disposables();
    setupLighting(this.scene, level, this.rig.camera, bin);
    const { doorMeshes } = buildDungeon(this.scene, level, bin);

    const start = this.resolvePlacement(level, placement);
    const controller = new GridController(this.scene, this.rig, level, start);

    const monsters = new MonsterManager(
      this.scene,
      level,
      this.party,
      mem,
      () => ({ x: controller.x, z: controller.z }),
      (msg) => this.hud.log(msg),
      () => this.hud.renderParty(),
    );
    const interactions = new InteractionManager(
      this.scene,
      level,
      this.party,
      mem,
      doorMeshes,
      (msg) => this.hud.log(msg),
      () => this.inventory.render(),
    );
    const minimap = new Minimap(this.minimapCanvas, level, mem.revealed);

    controller.onStep = (x, z) => {
      this.sound.footstep();
      interactions.checkPickup(x, z);
      this.revealAndDraw(minimap, controller);
    };
    controller.onTurn = (dir) => {
      this.hud.setCompass(dir);
      this.revealAndDraw(minimap, controller);
    };
    controller.onBlocked = () => this.sound.bump();

    this.bundle = { id, level, controller, monsters, interactions, minimap, bin };

    this.hud.setCompass(controller.dir);
    this.hud.log(`You enter ${data.name}.`);
    this.revealAndDraw(minimap, controller);
  }

  private resolvePlacement(level: Level, placement: Placement): StartPos {
    if (placement.kind === 'stair') {
      const stair = level.stairById(placement.stairId);
      if (stair) return { x: stair.x, z: stair.z, dir: stair.dir };
      const s = level.data.start;
      return { x: s.x, z: s.z, dir: s.dir };
    }
    return { x: placement.x, z: placement.z, dir: placement.dir };
  }

  private useStair(stair: StairDef): void {
    this.sound.door();
    this.hud.log(stair.kind === 'down' ? 'You descend the stairs.' : 'You climb the stairs.');
    this.loadLevel(stair.targetLevel, { kind: 'stair', stairId: stair.targetStair });
  }

  private revealAndDraw(minimap: Minimap, controller: GridController): void {
    minimap.reveal(controller.x, controller.z);
    minimap.draw(controller.x, controller.z, controller.dir);
  }

  // ---- Actions ----

  private attack(side: HandSide): void {
    if (!this.started || !this.bundle) return;
    const c = this.bundle.controller;
    const front = c.frontCell();
    const res = this.bundle.monsters.attackCell(front.x, front.z, this.party.handAttack(side));
    if (!res.hit) {
      this.hud.log('You swing at empty air.');
      return;
    }
    this.sound.hit();
    this.hud.log(res.killed ? `You slay the creature! (${res.dmg})` : `You hit the creature for ${res.dmg}.`);
    if (res.killed && this.bundle.monsters.remaining === 0) {
      this.hud.log('The floor falls silent — nothing else stirs here.');
    }
  }

  private interactOrDescend(): void {
    if (!this.bundle || this.bundle.controller.isBusy) return;
    const c = this.bundle.controller;
    const stair = this.bundle.level.stairAt(c.x, c.z);
    if (stair) {
      this.useStair(stair);
      return;
    }
    const front = c.frontCell();
    if (!this.bundle.interactions.interact(front.x, front.z)) this.hud.log('Nothing happens.');
    else this.sound.door();
  }

  // ---- Save / load ----

  private save(): void {
    if (!this.bundle) return;
    const c = this.bundle.controller;
    const state: SaveState = {
      version: 1,
      currentLevel: this.bundle.id,
      x: c.x,
      z: c.z,
      dir: c.dir,
      party: {
        members: this.party.members.map((m) => ({ ...m })),
        hands: { left: { ...this.party.hands.left }, right: { ...this.party.hands.right } },
        backpack: this.party.backpack.map((i) => ({ ...i })),
      },
      memory: this.memory.toJSON(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    this.hud.log('Game saved.');
  }

  private load(): void {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      this.hud.log('No saved game found.');
      return;
    }
    const state = JSON.parse(raw) as SaveState;
    this.memory = GameMemory.fromJSON(state.memory);
    this.party.restore(state.party.members, state.party.hands, state.party.backpack);
    this.started = true;
    this.loadLevel(state.currentLevel, { kind: 'pos', x: state.x, z: state.z, dir: state.dir });
    this.hud.renderParty();
    this.hud.renderHands();
    this.inventory.render();
    this.hud.log('Game loaded.');
  }

  // ---- Input ----

  private move(action: string): void {
    if (!this.started || !this.bundle) return;
    const c = this.bundle.controller;
    switch (action) {
      case 'forward':
        c.forward();
        break;
      case 'back':
        c.back();
        break;
      case 'strafeLeft':
        c.strafeLeft();
        break;
      case 'strafeRight':
        c.strafeRight();
        break;
      case 'turnLeft':
        c.turnLeft();
        break;
      case 'turnRight':
        c.turnRight();
        break;
    }
  }

  private wireInput(): void {
    document.querySelectorAll<HTMLElement>('#move-pad button').forEach((btn) => {
      btn.addEventListener('click', () => this.move(btn.dataset.move!));
    });

    const KEY_ACTIONS: Record<string, string> = {
      KeyW: 'forward',
      ArrowUp: 'forward',
      KeyS: 'back',
      ArrowDown: 'back',
      KeyA: 'strafeLeft',
      KeyD: 'strafeRight',
      KeyQ: 'turnLeft',
      ArrowLeft: 'turnLeft',
      KeyE: 'turnRight',
      ArrowRight: 'turnRight',
    };

    window.addEventListener('keydown', (e) => {
      if (!this.started) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.interactOrDescend();
          return;
        case 'KeyF':
          this.attack('right');
          return;
        case 'KeyI':
          this.inventory.toggle();
          return;
        case 'KeyK':
          this.save();
          return;
        case 'KeyL':
          this.load();
          return;
      }
      const action = KEY_ACTIONS[e.code];
      if (action) {
        e.preventDefault();
        this.move(action);
      }
    });
  }
}
