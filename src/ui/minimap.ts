import { Level } from '../dungeon/level';
import { Direction, Tile, cellKey } from '../dungeon/types';

/**
 * Top-down automap drawn on a 2D canvas. Cells are revealed as the party walks,
 * mimicking the fog-of-war map of the old crawlers. North is up (+z).
 */
export class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cell: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly level: Level,
    /** Revealed-cell set, owned by per-level memory so it persists. */
    private readonly revealed: Set<string>,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.cell = Math.floor(Math.min(canvas.width, canvas.height) / Math.max(level.width, level.height));
  }

  /** Reveal a cell and its immediate neighbors. */
  reveal(x: number, z: number): void {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.level.inBounds(x + dx, z + dz)) this.revealed.add(cellKey(x + dx, z + dz));
      }
    }
  }

  draw(px: number, pz: number, dir: Direction): void {
    const { ctx, cell, level } = this;
    const toY = (z: number) => (level.height - 1 - z) * cell;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let z = 0; z < level.height; z++) {
      for (let x = 0; x < level.width; x++) {
        if (!this.revealed.has(cellKey(x, z))) continue;
        const tile = level.tileAt(x, z);
        if (tile === Tile.Wall) ctx.fillStyle = '#3a3733';
        else if (tile === Tile.Door) ctx.fillStyle = level.isWalkable(x, z) ? '#6b4a1f' : '#8a5a22';
        else ctx.fillStyle = '#1d2230';
        ctx.fillRect(x * cell, toY(z), cell - 1, cell - 1);
      }
    }

    // Party marker — a triangle pointing the way it faces.
    const cx = px * cell + cell / 2;
    const cy = toY(pz) + cell / 2;
    const ang = this.headingAngle(dir);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#7fe0a0';
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.5);
    ctx.lineTo(cell * 0.35, cell * 0.4);
    ctx.lineTo(-cell * 0.35, cell * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Canvas rotation (radians, 0 = up) for a facing, since +z is drawn upward. */
  private headingAngle(dir: Direction): number {
    switch (dir) {
      case Direction.North:
        return 0;
      case Direction.East:
        return Math.PI / 2;
      case Direction.South:
        return Math.PI;
      case Direction.West:
        return -Math.PI / 2;
    }
  }
}
