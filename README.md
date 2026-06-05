# Eye of Envy

A locally-hosted, **Eye of the Beholder**-inspired 3D dungeon crawler — a
grid-based, first-person "blobber" with smooth tweened movement, torch-lit
dungeons, a party with HP, a backpack, levers/doors, item pickups, and
real-time melee combat.

Built with **TypeScript + Vite + Babylon.js** (WebGL). Fully offline — no
backend, no external services at runtime.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 (opens automatically)
```

For a production-like local host:

```bash
npm run build
npm run preview
```

Other scripts:

```bash
npm test           # Vitest — grid/collision + combat math
npm run lint       # ESLint
```

## Controls

| Action | Keys |
| --- | --- |
| Move / strafe | `W` `A` `S` `D` (or arrow keys) |
| Turn 90° | `Q` / `E` (or `←` `→`) |
| Use / interact (levers, doors) | `Space` |
| Attack ahead (right hand) | `F` (or click a hand) |
| Use / descend stairs | `Space` (on a stair tile) |
| Backpack | `I` (or the Backpack button) |
| Save game | `K` |
| Load game | `L` |

On-screen movement/attack buttons are also provided.

## What's playable

Start in a sealed antechamber. A lever in the wall opens the only door —
face it and press `Space`. Beyond lies a room with kobolds, a weapon, and a
healing potion on the floor. Walk over loot to pick it up; open the backpack
(`I`) to equip weapons (L/R hand) or drink potions (Use). A glowing **stair**
in the corner descends to a second floor, *The Coiled Vault* — step onto it
and press `Space`.

Floors **remember their state**: doors you opened, loot you took, monsters you
slew, and the tiles you mapped all persist when you travel between levels.
Press `K` to save to the browser and `L` to reload — the full run (position,
party HP, inventory, and every floor's memory) is restored.

## Project layout

```
src/
  game.ts        orchestrator: floor lifecycle, transitions, save/load
  engine/        Babylon scene, camera rig, lighting, constants, disposables
  dungeon/       grid types, level loader (stairs/doors), mesh builder
  movement/      grid movement controller (tweened, collision)
  entities/      party (weapons/potions), monsters + AI
  combat/        pure combat math (unit-tested)
  interactions/  levers, doors, item pickups
  state/         per-level memory + save-state serialization
  ui/            HUD, minimap, inventory, styles
  audio/         Web Audio SFX synth
  data/levels/   authored level JSON (level01, level02)
test/            Vitest specs
```

## Roadmap (next milestones)

- Character creation, classes, stats, leveling; per-character combat
- Spell system (memorized spells, scrolls), more item/equipment types
- Secret doors, pressure plates, traps; deeper level network
- Authored glTF monster/prop art; optional React inventory/character screens
