import { describe, it, expect } from 'vitest';
import { Level } from '../src/dungeon/level';
import {
  Direction,
  DIR_DELTA,
  dirToYaw,
  turnLeft,
  turnRight,
  LevelData,
} from '../src/dungeon/types';

const testLevel: LevelData = {
  id: 'test',
  name: 'Test',
  rows: [
    '#####',
    '#..D#', // door at x=3,z=1
    '#...#',
    '#####',
  ],
  start: { x: 1, z: 1, dir: Direction.East },
  objects: {
    doors: [{ id: 'd1', x: 3, z: 1 }],
    levers: [],
    items: [],
    monsters: [],
    torches: [],
    stairs: [
      { id: 's1', x: 2, z: 2, kind: 'down', dir: Direction.North, targetLevel: 'l2', targetStair: 'u1' },
    ],
  },
};

describe('direction helpers', () => {
  it('turns wrap around the compass', () => {
    expect(turnRight(Direction.North)).toBe(Direction.East);
    expect(turnRight(Direction.West)).toBe(Direction.North);
    expect(turnLeft(Direction.North)).toBe(Direction.West);
  });

  it('North faces +z and yaw matches dir*90°', () => {
    expect(DIR_DELTA[Direction.North]).toEqual({ dx: 0, dz: 1 });
    expect(DIR_DELTA[Direction.East]).toEqual({ dx: 1, dz: 0 });
    expect(dirToYaw(Direction.East)).toBeCloseTo(Math.PI / 2);
  });
});

describe('Level passability', () => {
  const level = new Level(testLevel);

  it('treats walls as impassable and floors as passable', () => {
    expect(level.isPassable(0, 0)).toBe(false); // wall
    expect(level.isPassable(1, 1)).toBe(true); // floor
    expect(level.inBounds(99, 99)).toBe(false);
  });

  it('keeps a closed door blocked until opened', () => {
    expect(level.isWalkable(3, 1)).toBe(false);
    level.setDoorOpen('d1', true);
    expect(level.isWalkable(3, 1)).toBe(true);
  });

  it('treats creature-occupied cells as impassable but still walkable terrain', () => {
    level.setBlocked(2, 1, true);
    expect(level.isWalkable(2, 1)).toBe(true);
    expect(level.isPassable(2, 1)).toBe(false);
    level.setBlocked(2, 1, false);
    expect(level.isPassable(2, 1)).toBe(true);
  });
});

describe('Level stairs and door restore', () => {
  it('finds stairs by cell and by id', () => {
    const level = new Level(testLevel);
    expect(level.stairAt(2, 2)?.id).toBe('s1');
    expect(level.stairAt(0, 0)).toBeUndefined();
    expect(level.stairById('s1')?.targetLevel).toBe('l2');
  });

  it('starts doors open when restored from memory', () => {
    const level = new Level(testLevel, ['d1']);
    expect(level.isDoorOpen('d1')).toBe(true);
    expect(level.isWalkable(3, 1)).toBe(true);
  });
});
