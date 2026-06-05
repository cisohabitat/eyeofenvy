# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Eye of Envy** — a locally-hosted, *Eye of the Beholder*-inspired 3D dungeon crawler (grid-based, first-person "blobber"). TypeScript + Vite + Babylon.js (WebGL). Fully offline: no backend, no runtime network calls, and **no binary assets** — wall/floor textures are procedural (`NoiseProceduralTexture`/`DynamicTexture`) and SFX are synthesized via the Web Audio API (`src/audio/sound.ts`).

## Commands

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc --noEmit type-check, then vite build to dist/
npm run preview      # serve the production build locally
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch mode
npm run lint         # ESLint over **/*.ts
npm run format       # Prettier write

npx vitest run test/combat.test.ts          # a single test file
npx vitest run -t "computeDamage"           # tests matching a name
```

CI/verification baseline before committing: `npm run build && npm test && npm run lint` should all pass.

## Runtime verification caveat

There is **no headless browser with WebGL** in this environment, so the 3D scene cannot be exercised here — `npm run build`/`test`/`lint` only validate types, pure logic, and bundling. Anything touching the live scene (level transitions/disposal, movement feel, lighting, save/load round-trips through `localStorage`) must be manually checked in a real browser via `npm run dev`.

## Architecture

### The `Game` orchestrator (`src/game.ts`)
Single owner of the whole session. It holds **persistent** state (the `Party`, `GameMemory`, HUD, inventory, camera rig, Babylon engine/scene) and swaps the **active floor** in and out. Each floor is a `LevelBundle` (level + grid controller + monster manager + interaction manager + minimap + a `Disposables` bin). `loadLevel()` tears down the previous bundle, then rebuilds everything for the new floor. Input handling, stair transitions, combat dispatch, and save/load all live here. `main.ts` is a thin bootstrap that constructs `Game` and wires the title-screen start button.

### Per-floor teardown via `Disposables` (`src/engine/disposables.ts`)
Because levels are loaded/unloaded at runtime, **everything a floor creates must be registered for disposal** or it leaks across transitions. `buildDungeon` and `setupLighting` take a `Disposables` bin and register their meshes, materials, lights, particle systems, **and render observers** (`onBeforeRenderObservable` callbacks). Managers that aren't bin-based (`MonsterManager`, `InteractionManager`) expose their own `dispose()`. When adding anything that creates a mesh/light/material/observer for a level, register it with the bin or a `dispose()` method.

### Pure logic vs. Babylon
Game rules are deliberately kept free of Babylon so they're unit-testable: `src/combat/combat.ts` (damage/cooldown/adjacency), `src/dungeon/level.ts` (`Level`: grid + passability + door/stair state), `src/entities/party.ts`, and `src/state/levelState.ts`. Babylon-dependent code (rendering, lighting, meshes, camera) is isolated under `src/engine`, `src/dungeon/meshBuilder.ts`, and the `*Manager` classes. **Tests only cover the pure modules** — don't try to unit-test rendering code.

### Grid & direction conventions (`src/dungeon/types.ts`)
- Cells are `(x, z)` integers; world position is `cell * CELL_SIZE` (`src/engine/constants.ts`).
- `Direction` is `North=0, East=1, South=2, West=3`, chosen so **camera yaw = `dir * PI/2`** and **North = +z** (matching Babylon's default forward). `DIR_DELTA`, `turnLeft/turnRight`, `dirToYaw` encode this — reuse them rather than hand-rolling rotation math.
- Movement is discrete and tweened (`GridController`, smoothstep over `STEP_MS`); collision is pure grid logic (`Level.isPassable`), not a physics engine. Monster-occupied cells are tracked via `Level.setBlocked`.

### Levels & persistence
Levels are authored JSON in `src/data/levels/` and registered in the `LEVELS` map in `game.ts`. A level row string uses `#` wall, `.` floor, `D` door; objects (doors, levers, items, monsters, torches, stairs) carry grid coordinates. `GameMemory` (`src/state/levelState.ts`) holds **per-level mutable memory** — opened doors, picked items, slain monsters, revealed automap tiles — keyed by level id. Managers consult and mutate this memory so a floor looks the way you left it across stair transitions, and `GameMemory.toJSON/fromJSON` plus `SaveState` drive `localStorage` save/load (`K`/`L` keys).

### Adding content
- **New level**: add a JSON file under `src/data/levels/`, import it, and register it in `LEVELS` (`game.ts`). Connect it with `stairs` whose `targetLevel`/`targetStair` reference another level's stair id.
- **New item**: add to a level's `objects.items` with `kind: 'weapon'` (`attack`) or `kind: 'potion'` (`heal`). Pickup/equip/use flows live in `InteractionManager`, `Party`, and `Inventory`.
- **New monster type**: extend `MONSTER_STATS` in `src/entities/monster.ts`.

## Conventions

- Strict TypeScript (`noUnusedLocals`/`noUnusedParameters` on); prefix intentionally-unused params with `_`.
- The Babylon barrel `@babylonjs/core` is imported wholesale for simplicity, which is why the bundle is large (~5 MB) and the build warns about chunk size — expected for now; granular imports are a future optimization.
