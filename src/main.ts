import { createEngine } from './engine/scene';
import { setupLighting } from './engine/lighting';
import { CameraRig } from './engine/cameraRig';
import { Level } from './dungeon/level';
import { LevelData } from './dungeon/types';
import { buildDungeon } from './dungeon/meshBuilder';
import { GridController } from './movement/gridController';
import { Party, HandSide } from './entities/party';
import { MonsterManager } from './entities/monster';
import { InteractionManager } from './interactions/triggers';
import { Hud } from './ui/hud';
import { Minimap } from './ui/minimap';
import { Inventory } from './ui/inventory';
import { Sound } from './audio/sound';
import level01 from './data/levels/level01.json';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const { engine, scene } = createEngine(canvas);

const level = new Level(level01 as unknown as LevelData);
const rig = new CameraRig(scene, level.data.start.x, level.data.start.z, level.data.start.dir);
scene.activeCamera = rig.camera;

setupLighting(scene, level, rig.camera);
const { doorMeshes } = buildDungeon(scene, level);

const party = new Party();
const sound = new Sound();
const hud = new Hud(party);
const minimap = new Minimap(document.getElementById('minimap') as HTMLCanvasElement, level);
const inventory = new Inventory(party, () => {
  hud.renderHands();
});

const controller = new GridController(scene, rig, level, level.data.start);
const monsters = new MonsterManager(
  scene,
  level,
  party,
  () => ({ x: controller.x, z: controller.z }),
  (msg) => hud.log(msg),
  () => hud.renderParty(),
);
const interactions = new InteractionManager(
  scene,
  level,
  party,
  doorMeshes,
  (msg) => hud.log(msg),
  () => inventory.render(),
);

let started = false;
let won = false;

function redrawMinimap(): void {
  minimap.reveal(controller.x, controller.z);
  minimap.draw(controller.x, controller.z, controller.dir);
}

// ---- Wire controller events into UI / audio / interactions ----
controller.onStep = (x, z) => {
  sound.footstep();
  interactions.checkPickup(x, z);
  redrawMinimap();
};
controller.onTurn = (dir) => {
  hud.setCompass(dir);
  redrawMinimap();
};
controller.onBlocked = () => sound.bump();

function attack(side: HandSide): void {
  if (!started || won) return;
  const front = controller.frontCell();
  const res = monsters.attackCell(front.x, front.z, party.handAttack(side));
  if (!res.hit) {
    hud.log('You swing at empty air.');
    return;
  }
  sound.hit();
  hud.log(res.killed ? `You slay the creature! (${res.dmg})` : `You hit the creature for ${res.dmg}.`);
  if (res.killed) checkWin();
}

function checkWin(): void {
  if (!won && monsters.remaining === 0) {
    won = true;
    hud.log('The dungeon falls silent. The way is clear — you have won the slice.');
  }
}

hud.onAttack(attack);

// On-screen move pad.
document.querySelectorAll<HTMLElement>('#move-pad button').forEach((btn) => {
  btn.addEventListener('click', () => doAction(btn.dataset.move!));
});

function doAction(action: string): void {
  if (!started) return;
  switch (action) {
    case 'forward':
      controller.forward();
      break;
    case 'back':
      controller.back();
      break;
    case 'strafeLeft':
      controller.strafeLeft();
      break;
    case 'strafeRight':
      controller.strafeRight();
      break;
    case 'turnLeft':
      controller.turnLeft();
      break;
    case 'turnRight':
      controller.turnRight();
      break;
  }
}

// ---- Keyboard ----
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
  if (!started) return;
  if (e.code === 'Space') {
    e.preventDefault();
    const front = controller.frontCell();
    if (!interactions.interact(front.x, front.z)) hud.log('Nothing happens.');
    else sound.door();
    return;
  }
  if (e.code === 'KeyF') {
    attack('right');
    return;
  }
  if (e.code === 'KeyI') {
    inventory.toggle();
    return;
  }
  const action = KEY_ACTIONS[e.code];
  if (action) {
    e.preventDefault();
    doAction(action);
  }
});

// ---- Game loop ----
engine.runRenderLoop(() => {
  if (started) {
    const dt = engine.getDeltaTime() / 1000;
    const now = performance.now() / 1000;
    monsters.update(dt, now);
  }
  scene.render();
});

// ---- Title / start ----
const titleScreen = document.getElementById('title-screen')!;
const hudEl = document.getElementById('hud')!;
document.getElementById('start-btn')!.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  hudEl.classList.remove('hidden');
  sound.resume();
  started = true;
  hud.setCompass(controller.dir);
  hud.log(`You enter ${level.data.name}.`);
  hud.log('A lever juts from the wall nearby. Press Space while facing it.');
  redrawMinimap();
});
