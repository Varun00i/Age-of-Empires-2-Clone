// ============================================================
// Empires Risen - Building System
// Handles construction, training queues, technology research
// ============================================================

import { Game } from '../engine/Game';
import { EntityId, Vec2, ResourceType, Age } from '@shared/types';
import { BUILDINGS } from '@shared/data/buildings';
import { UNITS } from '@shared/data/units';

export class BuildingSystem {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  update(dt: number): void {
    const em = this.game.entityManager;

    for (const entity of em.getAllBuildings()) {
      const building = em.getBuildingComponent(entity.id);
      if (!building || !building.isComplete) continue;

      // Process training queue
      this.processTrainingQueue(entity.id, dt);

      // Process research queue
      this.processResearchQueue(entity.id, dt);
    }
  }

  canPlaceBuilding(buildingId: string, x: number, y: number, playerId: number): boolean {
    const data = BUILDINGS[buildingId];
    if (!data) return false;

    const map = this.game.state.map;
    if (!map) return false;

    const size = data.size ?? { x: 2, y: 2 };

    // Check tiles
    for (let dy = 0; dy < size.y; dy++) {
      for (let dx = 0; dx < size.x; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return false;

        const tile = map.tiles[ty]?.[tx];
        if (!tile || !tile.buildable || !tile.walkable) return false;

        // Check if occupied by another buildable entity
        const entities = this.game.entityManager.getEntitiesInRange(tx + 0.5, ty + 0.5, 0.4);
        for (const eid of entities) {
          if (this.game.entityManager.isBuilding(eid)) return false;
        }
      }
    }

    // Check resource cost
    return this.canAfford(playerId, data.cost);
  }

  placeBuilding(buildingId: string, x: number, y: number, playerId: number): EntityId | null {
    if (!this.canPlaceBuilding(buildingId, x, y, playerId)) return null;

    const data = BUILDINGS[buildingId];
    if (!data) return null;

    // Deduct resources
    this.deductCost(playerId, data.cost);

    // Create building entity (starts incomplete)
    const entityId = this.game.entityManager.createBuilding(buildingId, playerId, x, y, false);

    // Mark tiles as occupied
    const size = data.size ?? { x: 2, y: 2 };
    for (let dy = 0; dy < size.y; dy++) {
      for (let dx = 0; dx < size.x; dx++) {
        const tile = this.game.state.map?.tiles[y + dy]?.[x + dx];
        if (tile) {
          tile.buildable = false;
        }
      }
    }

    return entityId;
  }

  // ---- Training Queue ----

  trainUnit(buildingId: EntityId, unitId: string, playerId: number): boolean {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    if (!building || !building.isComplete) return false;

    // Check if building can train this unit
    if (!building.data.trains?.includes(unitId)) return false;

    const unitData = UNITS[unitId];
    if (!unitData) return false;

    // Check population cap
    const pop = em.getPopulation(playerId);
    const popCap = em.getPopulationCap(playerId);
    if (pop + (unitData.populationCost ?? 1) > popCap) return false;

    // Check cost
    if (!this.canAfford(playerId, unitData.cost)) return false;

    // Deduct cost
    this.deductCost(playerId, unitData.cost);

    // Add to queue
    return em.addToTrainingQueue(buildingId, unitId);
  }

  private processTrainingQueue(buildingId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    if (!building || building.trainingQueue.length === 0) return;

    const current = building.trainingQueue[0];
    current.progress += dt / 1000; // Convert to seconds

    if (current.progress >= current.totalTime) {
      // Spawn unit
      const pos = em.getPosition(buildingId);
      if (pos) {
        const spawnPos = building.rallyPoint ?? {
          x: pos.x + (building.data.size?.x ?? 2),
          y: pos.y + (building.data.size?.y ?? 2),
        };

        // Find walkable spawn position
        const actualPos = this.findSpawnPosition(spawnPos.x, spawnPos.y);
        const unitId = em.createUnit(current.unitId, em.getOwner(buildingId), actualPos.x, actualPos.y);

        // If rally point set, move unit there
        if (building.rallyPoint) {
          this.game.unitSystem.moveUnit(unitId, building.rallyPoint);
        }
      }

      building.trainingQueue.shift();
    }
  }

  // ---- Research Queue ----

  research(buildingId: EntityId, techId: string, playerId: number): boolean {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    if (!building || !building.isComplete) return false;

    if (!building.data.researches?.includes(techId)) return false;

    // Check if already researched
    const player = this.game.state.players.get(playerId);
    if (player?.researchedTechs.has(techId)) return false;

    // TODO: Check tech cost via TECHNOLOGIES data
    return em.addToResearchQueue(buildingId, techId, 30); // Default 30s research
  }

  private processResearchQueue(buildingId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    if (!building || building.researchQueue.length === 0) return;

    const current = building.researchQueue[0];
    current.progress += dt / 1000;

    if (current.progress >= current.totalTime) {
      // Complete research
      const playerId = em.getOwner(buildingId);
      const player = this.game.state.players.get(playerId);
      if (player) {
        player.researchedTechs.add(current.techId);

        // Apply tech effects
        this.game.resourceSystem.applyTechEffects(playerId, current.techId);
      }

      building.researchQueue.shift();
    }
  }

  // ---- Rally Points ----

  setRallyPoint(buildingId: EntityId, position: Vec2): void {
    const building = this.game.entityManager.getBuildingComponent(buildingId);
    if (building) {
      building.rallyPoint = { ...position };
    }
  }

  // ---- Garrison ----

  garrison(unitId: EntityId, buildingId: EntityId): boolean {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    const unit = em.getUnitComponent(unitId);
    if (!building || !unit) return false;

    const garrisonCap = building.data.garrisonCapacity ?? 0;
    if (building.garrisonedUnits.length >= garrisonCap) return false;

    building.garrisonedUnits.push(unitId);
    unit.garrisonedIn = buildingId;
    unit.state = 'garrisoned';

    return true;
  }

  ungarrison(buildingId: EntityId): void {
    const em = this.game.entityManager;
    const building = em.getBuildingComponent(buildingId);
    if (!building) return;

    const pos = em.getPosition(buildingId);
    if (!pos) return;

    for (const unitId of building.garrisonedUnits) {
      const unit = em.getUnitComponent(unitId);
      if (unit) {
        unit.garrisonedIn = null;
        unit.state = 'idle';

        const spawnPos = this.findSpawnPosition(
          pos.x + (building.data.size?.x ?? 2),
          pos.y + (building.data.size?.y ?? 2)
        );
        em.setPosition(unitId, spawnPos.x, spawnPos.y);
      }
    }

    building.garrisonedUnits = [];
  }

  // ---- Delete building ----

  deleteBuilding(buildingId: EntityId): void {
    const em = this.game.entityManager;

    // Ungarrison first
    this.ungarrison(buildingId);

    // Free tiles
    const pos = em.getPosition(buildingId);
    const building = em.getBuildingComponent(buildingId);
    if (pos && building) {
      const size = building.data.size ?? { x: 2, y: 2 };
      for (let dy = 0; dy < size.y; dy++) {
        for (let dx = 0; dx < size.x; dx++) {
          const tile = this.game.state.map?.tiles[Math.floor(pos.y) + dy]?.[Math.floor(pos.x) + dx];
          if (tile) tile.buildable = true;
        }
      }
    }

    em.removeEntity(buildingId);
  }

  // ---- Helpers ----

  private canAfford(playerId: number, cost: Partial<Record<ResourceType, number>>): boolean {
    const player = this.game.state.players.get(playerId);
    if (!player) return false;

    for (const [resource, amount] of Object.entries(cost)) {
      if ((player.resources[resource as ResourceType] ?? 0) < (amount ?? 0)) {
        return false;
      }
    }
    return true;
  }

  private deductCost(playerId: number, cost: Partial<Record<ResourceType, number>>): void {
    const player = this.game.state.players.get(playerId);
    if (!player) return;

    for (const [resource, amount] of Object.entries(cost)) {
      player.resources[resource as ResourceType] =
        (player.resources[resource as ResourceType] ?? 0) - (amount ?? 0);
    }
  }

  private findSpawnPosition(x: number, y: number): Vec2 {
    const map = this.game.state.map;
    if (!map) return { x, y };

    // Spiral out to find walkable tile
    for (let r = 0; r < 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = Math.floor(x) + dx;
          const ty = Math.floor(y) + dy;
          if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
            const tile = map.tiles[ty]?.[tx];
            if (tile?.walkable) {
              return { x: tx + 0.5, y: ty + 0.5 };
            }
          }
        }
      }
    }

    return { x, y };
  }

  dispose(): void {}
}
