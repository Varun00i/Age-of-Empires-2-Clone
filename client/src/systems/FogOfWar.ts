// ============================================================
// Empires Risen - Fog of War System
// Tracks tile visibility per player: hidden / explored / visible
// ============================================================

import { Game } from '../engine/Game';
import { EntityId } from '@shared/types';

// Visibility states: 0 = hidden, 1 = explored (greyed), 2 = visible
type VisState = 0 | 1 | 2;

export class FogOfWar {
  private game: Game;
  private width: number = 0;
  private height: number = 0;

  // Per-player visibility maps
  private visibility: Map<number, Uint8Array> = new Map();
  private explored: Map<number, Uint8Array> = new Map();

  // Update throttle
  private updateTimer: number = 0;
  private readonly UPDATE_INTERVAL = 200; // ms

  constructor(game: Game) {
    this.game = game;
  }

  init(mapWidth: number, mapHeight: number, playerIds: number[]): void {
    this.width = mapWidth;
    this.height = mapHeight;

    for (const id of playerIds) {
      this.visibility.set(id, new Uint8Array(mapWidth * mapHeight));
      this.explored.set(id, new Uint8Array(mapWidth * mapHeight));
    }
  }

  update(dt: number): void {
    // dt is in seconds, convert to ms for comparison with UPDATE_INTERVAL
    this.updateTimer += dt * 1000;
    if (this.updateTimer < this.UPDATE_INTERVAL) return;
    this.updateTimer = 0;
    this.computeVisibility();
  }

  /** Run a full visibility pass immediately (skip throttle timer). */
  forceUpdate(): void {
    this.updateTimer = 0;
    this.computeVisibility();
  }

  private computeVisibility(): void {
    const em = this.game.entityManager;

    // Clear current visibility (keep explored)
    for (const [playerId, vis] of this.visibility) {
      vis.fill(0);
    }

    // Calculate visibility from all entities
    for (const entity of em.getAllEntities()) {
      const pos = em.getPosition(entity.id);
      if (!pos) continue;

      const owner = em.getOwner(entity.id);
      if (owner === -1) continue; // Gaia

      const vis = this.visibility.get(owner);
      const exp = this.explored.get(owner);
      if (!vis || !exp) continue;

      // Get line of sight
      let los = 4;
      const unitData = em.getUnitData(entity.id);
      const buildingData = em.getBuildingData(entity.id);
      if (unitData) los = unitData.lineOfSight ?? 6;
      else if (buildingData) los = 8;

      // Apply vision
      this.revealCircle(vis, exp, Math.floor(pos.x), Math.floor(pos.y), los);
    }

    // Share team vision
    // (simplified: allies share vision)
  }

  getTileVisibility(x: number, y: number, playerId: number): VisState {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;

    const idx = y * this.width + x;
    const vis = this.visibility.get(playerId);
    const exp = this.explored.get(playerId);

    if (!vis || !exp) return 2; // No fog for untracked players

    if (vis[idx]) return 2;
    if (exp[idx]) return 1;
    return 0;
  }

  isVisible(x: number, y: number, playerId: number): boolean {
    return this.getTileVisibility(x, y, playerId) === 2;
  }

  isExplored(x: number, y: number, playerId: number): boolean {
    return this.getTileVisibility(x, y, playerId) >= 1;
  }

  private revealCircle(vis: Uint8Array, exp: Uint8Array, cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;

        const tx = cx + dx;
        const ty = cy + dy;

        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;

        const idx = ty * this.width + tx;
        vis[idx] = 1;
        exp[idx] = 1;
      }
    }
  }

  // Reveal all for a player (cheats / debug)
  revealAll(playerId: number): void {
    const vis = this.visibility.get(playerId);
    const exp = this.explored.get(playerId);
    if (vis) vis.fill(1);
    if (exp) exp.fill(1);
  }

  dispose(): void {
    this.visibility.clear();
    this.explored.clear();
  }
}
