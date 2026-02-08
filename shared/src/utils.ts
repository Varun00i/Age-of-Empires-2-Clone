// ============================================================
// Empires Risen - Shared Math Utilities
// Pure math functions used by both client and server
// ============================================================

import { Vec2 } from './types';

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2LengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vec2Distance(a: Vec2, b: Vec2): number {
  return vec2Length(vec2Sub(a, b));
}

export function vec2DistanceSq(a: Vec2, b: Vec2): number {
  return vec2LengthSq(vec2Sub(a, b));
}

export function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vec2Lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function vec2Rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function vec2Angle(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function vec2Clamp(v: Vec2, min: Vec2, max: Vec2): Vec2 {
  return {
    x: Math.max(min.x, Math.min(max.x, v.x)),
    y: Math.max(min.y, Math.min(max.y, v.y)),
  };
}

export function vec2Floor(v: Vec2): Vec2 {
  return { x: Math.floor(v.x), y: Math.floor(v.y) };
}

export function vec2Equals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

// ---- Isometric Projection ----
export function worldToIso(world: Vec2): Vec2 {
  return {
    x: (world.x - world.y),
    y: (world.x + world.y) / 2,
  };
}

export function isoToWorld(iso: Vec2): Vec2 {
  return {
    x: (iso.x / 1 + iso.y) / 1,
    y: (iso.y - iso.x / 1) / 1,
  };
}

export function worldToTile(world: Vec2, tileSize: number): Vec2 {
  return {
    x: Math.floor(world.x / tileSize),
    y: Math.floor(world.y / tileSize),
  };
}

export function tileToWorld(tile: Vec2, tileSize: number): Vec2 {
  return {
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2,
  };
}

// ---- Random Number Generation (Seedable) ----
export class SeededRandom {
  public seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ---- Pathfinding (A*) ----
export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function heuristic(a: Vec2, b: Vec2): number {
  // Octile distance
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

export function findPath(
  start: Vec2,
  end: Vec2,
  isWalkable: (x: number, y: number) => boolean,
  mapWidth: number,
  mapHeight: number,
  maxIterations: number = 2000
): Vec2[] | null {
  if (!isWalkable(end.x, end.y)) {
    // Find nearest walkable tile to end
    const nearest = findNearestWalkable(end, isWalkable, mapWidth, mapHeight);
    if (!nearest) return null;
    end = nearest;
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: PathNode = {
    x: start.x, y: start.y,
    g: 0, h: heuristic(start, end), f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) {
        lowestIdx = i;
      }
    }
    const current = openSet[lowestIdx];

    // Reached the goal
    if (current.x === end.x && current.y === end.y) {
      const path: Vec2[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    openSet.splice(lowestIdx, 1);
    closedSet.add(key(current.x, current.y));

    // Check all 8 neighbors
    const neighbors = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                       { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
    ];

    for (const { dx, dy } of neighbors) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
      if (!isWalkable(nx, ny)) continue;
      if (closedSet.has(key(nx, ny))) continue;

      // Diagonal movement check
      if (dx !== 0 && dy !== 0) {
        if (!isWalkable(current.x + dx, current.y) || !isWalkable(current.x, current.y + dy)) {
          continue;
        }
      }

      const moveCost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const g = current.g + moveCost;
      const h = heuristic({ x: nx, y: ny }, end);
      const f = g + h;

      const existingIdx = openSet.findIndex(n => n.x === nx && n.y === ny);
      if (existingIdx >= 0) {
        if (g < openSet[existingIdx].g) {
          openSet[existingIdx].g = g;
          openSet[existingIdx].f = f;
          openSet[existingIdx].parent = current;
        }
      } else {
        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }
  }

  return null; // No path found
}

function findNearestWalkable(
  pos: Vec2,
  isWalkable: (x: number, y: number) => boolean,
  mapWidth: number,
  mapHeight: number
): Vec2 | null {
  for (let radius = 1; radius < 10; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight && isWalkable(x, y)) {
          return { x, y };
        }
      }
    }
  }
  return null;
}

// ---- State Hashing (for deterministic lockstep) ----
export function hashState(data: string): number {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return hash;
}

// ---- Collision / Range Checks ----
export function isInRange(a: Vec2, b: Vec2, range: number): boolean {
  return vec2DistanceSq(a, b) <= range * range;
}

export function rectContains(rect: { x: number; y: number; width: number; height: number }, point: Vec2): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
         point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// ---- Clamp & Lerp ----
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---- Timer / Cooldown ----
export class Cooldown {
  private remaining: number = 0;
  constructor(public duration: number) {}

  start(): void { this.remaining = this.duration; }
  update(dt: number): void { this.remaining = Math.max(0, this.remaining - dt); }
  isReady(): boolean { return this.remaining <= 0; }
  getProgress(): number { return 1 - (this.remaining / this.duration); }
  reset(): void { this.remaining = 0; }
}
