// ============================================================
// Empires Risen - Map Generator
// Procedural map generation with multiple map types
// ============================================================

import { TerrainType, ResourceType, Vec2 } from '@shared/types';
import { SeededRandom } from '@shared/utils';
import { Game } from '../engine/Game';

export type MapType = 'arabia' | 'islands' | 'blackForest' | 'arena' | 'coastal' |
  'highland' | 'fortress' | 'nomad' | 'rivers' | 'goldRush';

export interface MapTile {
  terrain: TerrainType;
  elevation: number;
  resourceType: ResourceType | null;
  resourceAmount: number;
  walkable: boolean;
  buildable: boolean;
}

export interface GeneratedMap {
  width: number;
  height: number;
  tiles: MapTile[][];
  startPositions: Vec2[];
}

export class MapGenerator {
  private game: Game;
  private rng!: SeededRandom;

  constructor(game: Game) {
    this.game = game;
  }

  generate(
    width: number,
    height: number,
    type: MapType,
    numPlayers: number,
    seed: number
  ): GeneratedMap {
    this.rng = new SeededRandom(seed);

    // Initialize empty map
    const tiles: MapTile[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = {
          terrain: TerrainType.Grass,
          elevation: 0,
          resourceType: null,
          resourceAmount: 0,
          walkable: true,
          buildable: true,
        };
      }
    }

    // Generate based on type
    switch (type) {
      case 'arabia': this.generateArabia(tiles, width, height); break;
      case 'islands': this.generateIslands(tiles, width, height); break;
      case 'blackForest': this.generateBlackForest(tiles, width, height); break;
      case 'arena': this.generateArena(tiles, width, height); break;
      case 'coastal': this.generateCoastal(tiles, width, height); break;
      case 'highland': this.generateHighland(tiles, width, height); break;
      case 'fortress': this.generateFortress(tiles, width, height); break;
      case 'rivers': this.generateRivers(tiles, width, height); break;
      case 'goldRush': this.generateGoldRush(tiles, width, height); break;
      default: this.generateArabia(tiles, width, height); break;
    }

    // Generate start positions
    const startPositions = this.generateStartPositions(width, height, numPlayers, tiles);

    // Place resources near start positions
    this.placeStartingResources(tiles, startPositions, width, height);

    // Place scattered resources
    this.placeScatteredResources(tiles, width, height);

    return { width, height, tiles, startPositions };
  }

  // ---- Map Type Generators ----

  private generateArabia(tiles: MapTile[][], w: number, h: number): void {
    // Open map with scattered forests and hills
    this.applyPerlinTerrain(tiles, w, h);

    // Add scattered forests (10-15% coverage)
    for (let i = 0; i < w * h * 0.12; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(3, 12));
      }
    }

    // Add some hills
    for (let i = 0; i < 8; i++) {
      const cx = this.rng.nextInt(20, w - 20);
      const cy = this.rng.nextInt(20, h - 20);
      const r = this.rng.nextInt(3, 8);
      this.placeHill(tiles, cx, cy, r, w, h);
    }

    // Small ponds
    for (let i = 0; i < 3; i++) {
      const cx = this.rng.nextInt(15, w - 15);
      const cy = this.rng.nextInt(15, h - 15);
      const r = this.rng.nextInt(2, 4);
      this.placePond(tiles, cx, cy, r, w, h);
    }
  }

  private generateIslands(tiles: MapTile[][], w: number, h: number): void {
    // Water everywhere, islands for each player
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        tiles[y][x].terrain = TerrainType.DeepWater;
        tiles[y][x].walkable = false;
        tiles[y][x].buildable = false;
      }
    }

    // Create islands
    const numIslands = 4 + this.rng.nextInt(0, 3);
    for (let i = 0; i < numIslands; i++) {
      const cx = this.rng.nextInt(w * 0.15, w * 0.85);
      const cy = this.rng.nextInt(h * 0.15, h * 0.85);
      const rx = this.rng.nextInt(12, 25);
      const ry = this.rng.nextInt(12, 25);
      this.placeIsland(tiles, cx, cy, rx, ry, w, h);
    }
  }

  private generateBlackForest(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Dense forest everywhere except clearings
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (tiles[y][x].terrain === TerrainType.Grass) {
          tiles[y][x].terrain = TerrainType.Forest;
          tiles[y][x].resourceType = 'wood' as ResourceType;
          tiles[y][x].resourceAmount = 100;
        }
      }
    }

    // Carve paths between player areas
    const numPaths = 3 + this.rng.nextInt(0, 3);
    for (let i = 0; i < numPaths; i++) {
      this.carvePath(tiles, w, h, this.rng.nextInt(2, 4));
    }
  }

  private generateArena(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Walls around each player (circle of forest)
    // Light forests around the map
    for (let i = 0; i < w * h * 0.06; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(4, 10));
      }
    }
  }

  private generateCoastal(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Water on one side
    const waterSide = this.rng.nextInt(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let dist = 0;
        switch (waterSide) {
          case 0: dist = y; break;
          case 1: dist = w - x; break;
          case 2: dist = h - y; break;
          case 3: dist = x; break;
        }

        const threshold = h * 0.25 + this.rng.next() * 8;
        if (dist < threshold) {
          if (dist < threshold - 3) {
            tiles[y][x].terrain = TerrainType.DeepWater;
          } else if (dist < threshold - 1) {
            tiles[y][x].terrain = TerrainType.Water;
          } else {
            tiles[y][x].terrain = TerrainType.Beach;
          }
          tiles[y][x].walkable = dist >= threshold - 1;
          tiles[y][x].buildable = dist >= threshold;
        }
      }
    }

    // Forests on land
    for (let i = 0; i < w * h * 0.08; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(3, 10));
      }
    }
  }

  private generateHighland(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Many hills and cliffs
    for (let i = 0; i < 20; i++) {
      const cx = this.rng.nextInt(10, w - 10);
      const cy = this.rng.nextInt(10, h - 10);
      const r = this.rng.nextInt(5, 15);
      this.placeHill(tiles, cx, cy, r, w, h);
    }

    // Some forests
    for (let i = 0; i < w * h * 0.08; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(2, 6));
      }
    }
  }

  private generateFortress(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Scattered forests
    for (let i = 0; i < w * h * 0.1; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(3, 8));
      }
    }
  }

  private generateRivers(tiles: MapTile[][], w: number, h: number): void {
    this.applyPerlinTerrain(tiles, w, h);

    // Generate 1-3 rivers
    const numRivers = this.rng.nextInt(1, 3);
    for (let i = 0; i < numRivers; i++) {
      this.placeRiver(tiles, w, h);
    }

    // Forests near rivers
    for (let i = 0; i < w * h * 0.08; i++) {
      const x = this.rng.nextInt(0, w - 1);
      const y = this.rng.nextInt(0, h - 1);
      if (tiles[y][x].terrain === TerrainType.Grass) {
        this.placeForestClump(tiles, x, y, w, h, this.rng.nextInt(3, 8));
      }
    }
  }

  private generateGoldRush(tiles: MapTile[][], w: number, h: number): void {
    this.generateArabia(tiles, w, h);

    // Extra gold in center
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    for (let i = 0; i < 8; i++) {
      const ox = cx + this.rng.nextInt(-5, 5);
      const oy = cy + this.rng.nextInt(-5, 5);
      if (ox >= 0 && ox < w && oy >= 0 && oy < h) {
        tiles[oy][ox].resourceType = 'gold' as ResourceType;
        tiles[oy][ox].resourceAmount = 800;
      }
    }
  }

  // ---- Terrain Helpers ----

  private applyPerlinTerrain(tiles: MapTile[][], w: number, h: number): void {
    // Simple noise-based terrain variation
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const noise = this.simpleNoise(x, y, 0.05) * 0.5 +
          this.simpleNoise(x, y, 0.02) * 0.3 +
          this.simpleNoise(x, y, 0.1) * 0.2;

        if (noise > 0.7) {
          tiles[y][x].terrain = TerrainType.Dirt;
        } else if (noise < 0.15 && noise > 0.1) {
          tiles[y][x].terrain = TerrainType.Sand;
        }

        // Elevation from noise
        const elev = this.simpleNoise(x + 1000, y + 1000, 0.03);
        tiles[y][x].elevation = Math.floor(elev * 5);
      }
    }
  }

  private simpleNoise(x: number, y: number, scale: number): number {
    // Simple value noise using seeded RNG (deterministic)
    const ix = Math.floor(x * scale);
    const iy = Math.floor(y * scale);
    const fx = (x * scale) - ix;
    const fy = (y * scale) - iy;

    const v00 = this.hash2d(ix, iy);
    const v10 = this.hash2d(ix + 1, iy);
    const v01 = this.hash2d(ix, iy + 1);
    const v11 = this.hash2d(ix + 1, iy + 1);

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const a = v00 + sx * (v10 - v00);
    const b = v01 + sx * (v11 - v01);
    return a + sy * (b - a);
  }

  private hash2d(x: number, y: number): number {
    let n = x * 73856093 + y * 83492791 + this.rng.seed;
    n = ((n >> 13) ^ n);
    n = (n * (n * n * 60493 + 19990303) + 1376312589) & 0x7fffffff;
    return n / 0x7fffffff;
  }

  private placeForestClump(tiles: MapTile[][], cx: number, cy: number, w: number, h: number, size: number): void {
    for (let i = 0; i < size; i++) {
      const x = cx + this.rng.nextInt(-3, 3);
      const y = cy + this.rng.nextInt(-3, 3);
      if (x >= 0 && x < w && y >= 0 && y < h && tiles[y][x].terrain === TerrainType.Grass) {
        tiles[y][x].terrain = TerrainType.Forest;
        tiles[y][x].resourceType = 'wood' as ResourceType;
        tiles[y][x].resourceAmount = 100;
        tiles[y][x].walkable = false;
        tiles[y][x].buildable = false;
      }
    }
  }

  private placeHill(tiles: MapTile[][], cx: number, cy: number, radius: number, w: number, h: number): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius) {
          const elev = Math.floor((1 - dist / radius) * 4);
          tiles[y][x].elevation = Math.max(tiles[y][x].elevation, elev);
          if (this.rng.next() < 0.2) {
            tiles[y][x].terrain = TerrainType.Dirt;
          }
        }
      }
    }
  }

  private placePond(tiles: MapTile[][], cx: number, cy: number, radius: number, w: number, h: number): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius - 0.5) {
          tiles[y][x].terrain = TerrainType.ShallowWater;
          tiles[y][x].walkable = false;
          tiles[y][x].buildable = false;
        } else if (dist <= radius) {
          tiles[y][x].terrain = TerrainType.Beach;
        }
      }
    }
  }

  private placeIsland(tiles: MapTile[][], cx: number, cy: number, rx: number, ry: number, w: number, h: number): void {
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) {
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;

        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dist = Math.sqrt(dx * dx + dy * dy) + this.rng.next() * 0.15;

        if (dist <= 0.8) {
          tiles[y][x].terrain = TerrainType.Grass;
          tiles[y][x].walkable = true;
          tiles[y][x].buildable = true;
          if (this.rng.next() < 0.15) {
            tiles[y][x].terrain = TerrainType.Forest;
            tiles[y][x].resourceType = 'wood' as ResourceType;
            tiles[y][x].resourceAmount = 100;
            tiles[y][x].walkable = false;
            tiles[y][x].buildable = false;
          }
        } else if (dist <= 0.9) {
          tiles[y][x].terrain = TerrainType.Beach;
          tiles[y][x].walkable = true;
          tiles[y][x].buildable = true;
        } else if (dist <= 1.0) {
          tiles[y][x].terrain = TerrainType.ShallowWater;
          tiles[y][x].walkable = false;
        }
      }
    }
  }

  private placeRiver(tiles: MapTile[][], w: number, h: number): void {
    // Horizontal or vertical river with bends
    const horizontal = this.rng.next() > 0.5;
    const riverWidth = this.rng.nextInt(3, 5);

    let cx = horizontal ? 0 : this.rng.nextInt(w * 0.3, w * 0.7);
    let cy = horizontal ? this.rng.nextInt(h * 0.3, h * 0.7) : 0;

    const length = horizontal ? w : h;
    for (let i = 0; i < length; i++) {
      for (let d = -riverWidth; d <= riverWidth; d++) {
        const x = horizontal ? i : cx + d;
        const y = horizontal ? cy + d : i;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const absDist = Math.abs(d);
          if (absDist <= riverWidth - 1) {
            tiles[y][x].terrain = absDist < riverWidth - 2 ? TerrainType.Water : TerrainType.ShallowWater;
            tiles[y][x].walkable = false;
            tiles[y][x].buildable = false;
          } else {
            tiles[y][x].terrain = TerrainType.Beach;
          }
        }
      }

      // Bend the river
      if (this.rng.next() < 0.1) {
        if (horizontal) cy += this.rng.nextInt(-2, 2);
        else cx += this.rng.nextInt(-2, 2);
      }
    }

    // Place a shallow crossing
    const crossingPos = this.rng.nextInt(length * 0.3, length * 0.7);
    for (let d = -riverWidth; d <= riverWidth; d++) {
      const x = horizontal ? crossingPos : cx + d;
      const y = horizontal ? cy + d : crossingPos;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        tiles[y][x].terrain = TerrainType.ShallowWater;
        tiles[y][x].walkable = true;
      }
    }
  }

  private carvePath(tiles: MapTile[][], w: number, h: number, pathWidth: number): void {
    // Random path across the map
    const dir = this.rng.next() > 0.5;
    let px = dir ? 0 : this.rng.nextInt(10, w - 10);
    let py = dir ? this.rng.nextInt(10, h - 10) : 0;

    const length = dir ? w : h;
    for (let i = 0; i < length; i++) {
      for (let d = -pathWidth; d <= pathWidth; d++) {
        const x = dir ? i : px + d;
        const y = dir ? py + d : i;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          tiles[y][x].terrain = TerrainType.Grass;
          tiles[y][x].resourceType = null;
          tiles[y][x].resourceAmount = 0;
          tiles[y][x].walkable = true;
          tiles[y][x].buildable = true;
        }
      }

      if (this.rng.next() < 0.15) {
        if (dir) py += this.rng.nextInt(-1, 1);
        else px += this.rng.nextInt(-1, 1);
      }
    }
  }

  // ---- Start Positions ----

  private generateStartPositions(w: number, h: number, numPlayers: number, tiles: MapTile[][]): Vec2[] {
    const positions: Vec2[] = [];
    const margin = Math.floor(Math.min(w, h) * 0.15);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;

    for (let i = 0; i < numPlayers; i++) {
      const angle = (i / numPlayers) * Math.PI * 2 - Math.PI / 2;
      let px = Math.floor(cx + Math.cos(angle) * radius);
      let py = Math.floor(cy + Math.sin(angle) * radius);

      // Clamp to margins
      px = Math.max(margin, Math.min(w - margin, px));
      py = Math.max(margin, Math.min(h - margin, py));

      // Find nearest walkable/buildable tile
      let found = false;
      for (let r = 0; r < 20 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const tx = px + dx;
            const ty = py + dy;
            if (tx >= 0 && tx < w && ty >= 0 && ty < h &&
              tiles[ty][tx].walkable && tiles[ty][tx].buildable) {
              px = tx;
              py = ty;
              found = true;
            }
          }
        }
      }

      // Clear area around start position
      this.clearArea(tiles, px, py, 10, w, h);

      positions.push({ x: px, y: py });
    }

    return positions;
  }

  private clearArea(tiles: MapTile[][], cx: number, cy: number, radius: number, w: number, h: number): void {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist <= radius) {
            tiles[y][x].terrain = TerrainType.Grass;
            tiles[y][x].resourceType = null;
            tiles[y][x].resourceAmount = 0;
            tiles[y][x].walkable = true;
            tiles[y][x].buildable = true;
            tiles[y][x].elevation = 0;
          }
        }
      }
    }
  }

  // ---- Resource Placement ----

  private placeStartingResources(tiles: MapTile[][], startPositions: Vec2[], w: number, h: number): void {
    for (const pos of startPositions) {
      // 8 gold tiles nearby
      this.placeResourceCluster(tiles, pos.x + 8, pos.y + 3, w, h, 'gold' as ResourceType, 800, 4);
      this.placeResourceCluster(tiles, pos.x - 6, pos.y + 7, w, h, 'gold' as ResourceType, 800, 4);

      // 7 stone tiles nearby
      this.placeResourceCluster(tiles, pos.x + 3, pos.y - 7, w, h, 'stone' as ResourceType, 350, 4);
      this.placeResourceCluster(tiles, pos.x - 8, pos.y - 4, w, h, 'stone' as ResourceType, 350, 3);

      // Berry bushes (food)
      this.placeResourceCluster(tiles, pos.x + 5, pos.y - 4, w, h, 'food' as ResourceType, 125, 6);

      // 2 boar-equivalent (large food) - placed as map resource
      this.placeResourceCluster(tiles, pos.x + 10, pos.y + 8, w, h, 'food' as ResourceType, 340, 1);
      this.placeResourceCluster(tiles, pos.x - 8, pos.y + 10, w, h, 'food' as ResourceType, 340, 1);

      // 4 deer patches
      this.placeResourceCluster(tiles, pos.x + 12, pos.y - 3, w, h, 'food' as ResourceType, 140, 4);
    }
  }

  private placeScatteredResources(tiles: MapTile[][], w: number, h: number): void {
    // Extra gold mines
    for (let i = 0; i < 8; i++) {
      const x = this.rng.nextInt(10, w - 10);
      const y = this.rng.nextInt(10, h - 10);
      this.placeResourceCluster(tiles, x, y, w, h, 'gold' as ResourceType, 800, this.rng.nextInt(3, 5));
    }

    // Extra stone quarries
    for (let i = 0; i < 6; i++) {
      const x = this.rng.nextInt(10, w - 10);
      const y = this.rng.nextInt(10, h - 10);
      this.placeResourceCluster(tiles, x, y, w, h, 'stone' as ResourceType, 350, this.rng.nextInt(3, 5));
    }
  }

  private placeResourceCluster(
    tiles: MapTile[][], cx: number, cy: number, w: number, h: number,
    type: ResourceType, amount: number, count: number
  ): void {
    for (let i = 0; i < count; i++) {
      let x = cx + this.rng.nextInt(-2, 2);
      let y = cy + this.rng.nextInt(-2, 2);
      x = Math.max(0, Math.min(w - 1, x));
      y = Math.max(0, Math.min(h - 1, y));

      if (tiles[y][x].walkable && !tiles[y][x].resourceType) {
        tiles[y][x].resourceType = type;
        tiles[y][x].resourceAmount = amount;
        if (type === 'wood') {
          tiles[y][x].terrain = TerrainType.Forest;
          tiles[y][x].walkable = false;
          tiles[y][x].buildable = false;
        }
      }
    }
  }
}
