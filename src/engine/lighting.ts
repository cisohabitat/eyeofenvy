import {
  Scene,
  HemisphericLight,
  PointLight,
  Vector3,
  Color3,
  Color4,
  DynamicTexture,
  ParticleSystem,
  UniversalCamera,
} from '@babylonjs/core';
import { Level } from '../dungeon/level';
import { CELL_SIZE, WALL_HEIGHT } from './constants';
import { cellToWorld } from './cameraRig';
import { Disposables } from './disposables';

/** Soft radial sprite, generated at runtime so we ship zero binary assets. */
function makeFlareTexture(scene: Scene): DynamicTexture {
  const size = 64;
  const tex = new DynamicTexture('flare', size, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,200,120,0.9)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.hasAlpha = true;
  tex.update();
  return tex;
}

interface Flicker {
  light: PointLight;
  base: number;
  phase: number;
}

/**
 * Lights the dungeon: a faint hemispheric ambient so nothing is pure black, a
 * warm point light that follows the party (their carried torch), and wall
 * sconces with flickering point lights + procedural fire particles.
 */
export function setupLighting(
  scene: Scene,
  level: Level,
  camera: UniversalCamera,
  bin: Disposables,
): void {
  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.18;
  ambient.diffuse = new Color3(0.4, 0.45, 0.6);
  ambient.groundColor = new Color3(0.05, 0.05, 0.08);
  bin.addDisposable(ambient);

  const flickers: Flicker[] = [];
  const flare = makeFlareTexture(scene);
  bin.addDisposable(flare);

  // Party torch: a warm point light riding the camera.
  const partyTorch = new PointLight('party-torch', camera.position.clone(), scene);
  partyTorch.diffuse = new Color3(1.0, 0.7, 0.4);
  partyTorch.intensity = 0.9;
  partyTorch.range = CELL_SIZE * 5;
  flickers.push({ light: partyTorch, base: 0.9, phase: 0 });
  bin.addDisposable(partyTorch);

  // Wall sconces from the level data.
  for (const t of level.objects().torches) {
    const facing = floorNeighborOffset(level, t.x, t.z);
    const pos = cellToWorld(t.x, t.z, WALL_HEIGHT * 0.7).add(
      new Vector3(facing.x * CELL_SIZE * 0.45, 0, facing.z * CELL_SIZE * 0.45),
    );

    const light = new PointLight(`torch-${t.x}-${t.z}`, pos.clone(), scene);
    light.diffuse = new Color3(1.0, 0.6, 0.25);
    light.intensity = 0.85;
    light.range = CELL_SIZE * 4.5;
    flickers.push({ light, base: 0.85, phase: Math.random() * Math.PI * 2 });
    bin.addDisposable(light);

    bin.addDisposable(spawnFire(scene, flare, pos));
  }

  const obs = scene.onBeforeRenderObservable.add(() => {
    partyTorch.position.copyFrom(camera.position);
    const t = performance.now() / 1000;
    for (const f of flickers) {
      const n =
        Math.sin(t * 11 + f.phase) * 0.5 + Math.sin(t * 23.3 + f.phase * 2) * 0.5;
      f.light.intensity = f.base * (0.82 + 0.18 * (n * 0.5 + 0.5));
    }
  });
  bin.add(() => scene.onBeforeRenderObservable.remove(obs));
}

/** Direction (unit-ish) from a wall cell toward an adjacent walkable cell. */
function floorNeighborOffset(level: Level, x: number, z: number): { x: number; z: number } {
  const candidates = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 },
  ];
  for (const c of candidates) {
    if (level.isWalkable(x + c.x, z + c.z)) return c;
  }
  return { x: 0, z: 0 };
}

function spawnFire(scene: Scene, texture: DynamicTexture, pos: Vector3): ParticleSystem {
  const fire = new ParticleSystem(`fire-${pos.x}-${pos.z}`, 120, scene);
  fire.particleTexture = texture;
  fire.emitter = pos.clone();
  fire.minEmitBox = new Vector3(-0.1, 0, -0.1);
  fire.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
  fire.color1 = new Color4(1, 0.7, 0.2, 1);
  fire.color2 = new Color4(1, 0.4, 0.1, 1);
  fire.colorDead = new Color4(0.2, 0.05, 0, 0);
  fire.minSize = 0.18;
  fire.maxSize = 0.5;
  fire.minLifeTime = 0.2;
  fire.maxLifeTime = 0.5;
  fire.emitRate = 90;
  fire.blendMode = ParticleSystem.BLENDMODE_ADD;
  fire.gravity = new Vector3(0, 3, 0);
  fire.direction1 = new Vector3(-0.3, 1, -0.3);
  fire.direction2 = new Vector3(0.3, 1, 0.3);
  fire.minEmitPower = 0.4;
  fire.maxEmitPower = 0.9;
  fire.updateSpeed = 0.01;
  fire.start();
  return fire;
}
