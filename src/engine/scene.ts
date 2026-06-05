import {
  Engine,
  Scene,
  Color3,
  Color4,
  DefaultRenderingPipeline,
} from '@babylonjs/core';

export interface EngineContext {
  engine: Engine;
  scene: Scene;
}

/**
 * Boots the Babylon engine + scene with the atmospheric post-FX that sell the
 * "rich" dungeon look: exponential fog, bloom on the torch highlights, a
 * vignette, and ACES tone mapping.
 */
export function createEngine(canvas: HTMLCanvasElement): EngineContext {
  const engine = new Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: true,
    stencil: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);
  scene.ambientColor = new Color3(0.08, 0.08, 0.1);

  // Distance fog — keeps the corridors murky and hides the grid edges.
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.02, 0.02, 0.03);
  scene.fogDensity = 0.06;

  const pipeline = new DefaultRenderingPipeline('eoe-pipeline', true, scene);
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.55;
  pipeline.bloomWeight = 0.7;
  pipeline.bloomKernel = 64;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = 1; // ACES
  pipeline.imageProcessing.exposure = 1.1;
  pipeline.imageProcessing.contrast = 1.25;
  pipeline.imageProcessing.vignetteEnabled = true;
  pipeline.imageProcessing.vignetteWeight = 2.4;
  pipeline.fxaaEnabled = true;

  window.addEventListener('resize', () => engine.resize());

  return { engine, scene };
}
