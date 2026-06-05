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
| Backpack | `I` (or the Backpack button) |

On-screen movement/attack buttons are also provided.

## The vertical slice

Start in a sealed antechamber. A lever in the wall opens the only door —
face it and press `Space`. Beyond lies a room with a kobold and a better
weapon on the floor. Walk over the weapon to pick it up, equip it from the
backpack (`I`), and cut the creature down. The minimap reveals as you explore.

## Project layout

```
src/
  engine/        Babylon scene, camera rig, lighting, constants
  dungeon/       grid types, level loader, mesh builder
  movement/      grid movement controller (tweened, collision)
  entities/      party, monsters + AI
  combat/        pure combat math (unit-tested)
  interactions/  levers, doors, item pickups
  ui/            HUD, minimap, inventory, styles
  audio/         Web Audio SFX synth
  data/levels/   authored level JSON
test/            Vitest specs
```

## Roadmap (next milestones)

- Character creation, classes, stats, leveling; per-character combat
- Spell system (memorized spells, scrolls), more item/equipment types
- Multiple connected levels, stairs, secret doors, traps
- Save/load via `localStorage`; automap persistence
- Authored glTF monster/prop art; optional React inventory/character screens
