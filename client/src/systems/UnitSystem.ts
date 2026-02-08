// ============================================================
// Empires Risen - Unit System
// Handles unit movement, pathfinding, combat states
// ============================================================

import { Game } from '../engine/Game';
import { EntityId, Vec2, TerrainType } from '@shared/types';
import { findPath } from '@shared/utils';

export class UnitSystem {
  private game: Game;
  private readonly ARRIVE_THRESHOLD = 0.3;
  private readonly GATHER_RANGE = 1.5;
  private readonly BUILD_RANGE = 2.0;

  constructor(game: Game) {
    this.game = game;
  }

  update(dt: number): void {
    const em = this.game.entityManager;

    for (const entity of em.getAllUnits()) {
      const unit = em.getUnitComponent(entity.id);
      const pos = em.getPosition(entity.id);
      if (!unit || !pos) continue;

      switch (unit.state) {
        case 'moving': this.updateMoving(entity.id, dt); break;
        case 'attacking': this.updateAttacking(entity.id, dt); break;
        case 'gathering': this.updateGathering(entity.id, dt); break;
        case 'building': this.updateBuilding(entity.id, dt); break;
        case 'repairing': this.updateRepairing(entity.id, dt); break;
        case 'patrolling': this.updatePatrolling(entity.id, dt); break;
        case 'idle': this.updateIdle(entity.id, dt); break;
      }

      // Update attack cooldown
      if (unit.attackCooldown > 0) {
        unit.attackCooldown -= dt;
      }
      if (unit.gatherCooldown > 0) {
        unit.gatherCooldown -= dt;
      }
    }
  }

  moveUnit(entityId: EntityId, target: Vec2): void {
    const em = this.game.entityManager;
    const pos = em.getPosition(entityId);
    if (!pos) return;

    const map = this.game.state.map;
    if (!map) return;

    // Find path using A*
    const walkable = (x: number, y: number) => {
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
      return map.tiles[y]?.[x]?.walkable ?? false;
    };

    const path = findPath(
      { x: Math.floor(pos.x), y: Math.floor(pos.y) },
      { x: Math.floor(target.x), y: Math.floor(target.y) },
      walkable,
      map.width,
      map.height
    );

    if (path && path.length > 0) {
      em.setUnitPath(entityId, path.map(p => ({ x: p.x + 0.5, y: p.y + 0.5 })));
      em.setUnitState(entityId, 'moving');
      em.setUnitTarget(entityId, null, target);
    }
  }

  attackUnit(entityId: EntityId, targetId: EntityId): void {
    const em = this.game.entityManager;
    em.setUnitState(entityId, 'attacking');
    em.setUnitTarget(entityId, targetId, null);
  }

  gatherResource(entityId: EntityId, targetId: EntityId | null, targetPos: Vec2 | null): void {
    const em = this.game.entityManager;
    em.setUnitState(entityId, 'gathering');
    em.setUnitTarget(entityId, targetId, targetPos);
  }

  buildStructure(entityId: EntityId, targetId: EntityId): void {
    const em = this.game.entityManager;
    em.setUnitState(entityId, 'building');
    em.setUnitTarget(entityId, targetId, null);
  }

  repairStructure(entityId: EntityId, targetId: EntityId): void {
    const em = this.game.entityManager;
    em.setUnitState(entityId, 'repairing');
    em.setUnitTarget(entityId, targetId, null);
  }

  patrol(entityId: EntityId, points: Vec2[]): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    if (!unit) return;

    unit.patrolPoints = points;
    unit.patrolIndex = 0;
    em.setUnitState(entityId, 'patrolling');
    this.moveUnit(entityId, points[0]);
  }

  stopUnit(entityId: EntityId): void {
    const em = this.game.entityManager;
    em.setUnitState(entityId, 'idle');
    em.setUnitTarget(entityId, null, null);
    em.setUnitPath(entityId, []);
  }

  // ---- State Updates ----

  private updateMoving(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos) return;

    if (unit.path.length === 0 || unit.pathIndex >= unit.path.length) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const target = unit.path[unit.pathIndex];
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.ARRIVE_THRESHOLD) {
      unit.pathIndex++;
      if (unit.pathIndex >= unit.path.length) {
        em.setUnitState(entityId, 'idle');
      }
      return;
    }

    // Move towards target
    const speed = unit.data.speed * dt * 0.001;
    const moveX = (dx / dist) * Math.min(speed, dist);
    const moveY = (dy / dist) * Math.min(speed, dist);

    em.setPosition(entityId, pos.x + moveX, pos.y + moveY);
    unit.facing = Math.atan2(dy, dx);
  }

  private updateAttacking(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos || !unit.targetId) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    // Check if target still exists
    if (!em.entityExists(unit.targetId)) {
      em.setUnitState(entityId, 'idle');
      em.setUnitTarget(entityId, null, null);
      return;
    }

    const targetPos = em.getPosition(unit.targetId);
    if (!targetPos) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const dist = Math.hypot(targetPos.x - pos.x, targetPos.y - pos.y);
    const range = unit.data.range ?? 0;
    const effectiveRange = Math.max(range, 1);

    if (dist > effectiveRange + 0.5) {
      // Move closer to target
      this.moveUnit(entityId, { x: targetPos.x, y: targetPos.y });
      em.setUnitState(entityId, 'attacking'); // Keep attack state
    } else if (unit.attackCooldown <= 0) {
      // Attack
      unit.facing = Math.atan2(targetPos.y - pos.y, targetPos.x - pos.x);

      if (range > 1) {
        // Ranged attack - create projectile
        this.game.combatSystem.createProjectile(
          entityId, unit.targetId,
          pos.x, pos.y,
          targetPos.x, targetPos.y,
          unit.data.attack
        );
      } else {
        // Melee attack
        this.game.combatSystem.dealDamage(entityId, unit.targetId);
      }

      unit.attackCooldown = (unit.data.attackSpeed ?? 2) * 1000;
    }
  }

  private updateGathering(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos) return;

    // If carrying resources, go to dropoff
    if (unit.carryAmount >= 10 || (unit.carryAmount > 0 && !unit.targetId && !unit.targetPos)) {
      const dropoff = em.getNearestDropoff(pos.x, pos.y, unit.carryType!, em.getOwner(entityId));
      if (dropoff) {
        const dropoffPos = em.getPosition(dropoff);
        if (dropoffPos) {
          const dist = Math.hypot(dropoffPos.x - pos.x, dropoffPos.y - pos.y);
          if (dist < 2) {
            // Drop off resources
            this.game.resourceSystem.addResource(
              em.getOwner(entityId),
              unit.carryType!,
              unit.carryAmount
            );
            unit.carryAmount = 0;
            unit.carryType = null;

            // Go back to gathering
            if (unit.targetPos) {
              this.moveUnit(entityId, unit.targetPos);
              em.setUnitState(entityId, 'gathering');
            } else {
              em.setUnitState(entityId, 'idle');
            }
            return;
          } else {
            // Move to dropoff
            this.moveUnit(entityId, { x: dropoffPos.x, y: dropoffPos.y });
            em.setUnitState(entityId, 'gathering');
          }
        }
      }
      return;
    }

    // Check if target resource exists
    if (unit.targetId && !em.entityExists(unit.targetId)) {
      unit.targetId = null;
      em.setUnitState(entityId, 'idle');
      return;
    }

    // Move to resource tile or entity
    let gatherX: number, gatherY: number;
    if (unit.targetId) {
      const tPos = em.getPosition(unit.targetId);
      if (!tPos) return;
      gatherX = tPos.x;
      gatherY = tPos.y;
    } else if (unit.targetPos) {
      gatherX = unit.targetPos.x;
      gatherY = unit.targetPos.y;
    } else {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const dist = Math.hypot(gatherX - pos.x, gatherY - pos.y);

    if (dist > this.GATHER_RANGE) {
      // Move to resource
      this.moveUnit(entityId, { x: gatherX, y: gatherY });
      em.setUnitState(entityId, 'gathering');
    } else if (unit.gatherCooldown <= 0) {
      // Gather
      let harvested = 0;
      const tileX = Math.floor(gatherX);
      const tileY = Math.floor(gatherY);
      const tile = this.game.state.map?.tiles[tileY]?.[tileX];

      if (tile?.resourceType && tile.resourceAmount !== undefined && tile.resourceAmount > 0) {
        harvested = Math.min(1, tile.resourceAmount);
        tile.resourceAmount -= harvested;
        unit.carryType = tile.resourceType as any;

        if (tile.resourceAmount <= 0) {
          tile.resourceType = undefined;
          if (tile.terrain === TerrainType.Forest) {
            tile.terrain = TerrainType.Grass;
            tile.walkable = true;
            tile.buildable = true;
          }
        }
      } else if (unit.targetId) {
        // Gather from entity (e.g., farm, fish trap)
        const res = em.getResourceComponent(unit.targetId);
        if (res && res.amount > 0) {
          harvested = Math.min(1, res.amount);
          em.harvestResource(unit.targetId, harvested);
          unit.carryType = res.resourceType;
        }
      }

      if (harvested > 0) {
        unit.carryAmount += harvested;
        unit.gatherCooldown = 2000; // 2 second gather rate
      } else {
        em.setUnitState(entityId, 'idle');
      }
    }
  }

  private updateBuilding(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos || !unit.targetId) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    if (!em.entityExists(unit.targetId)) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const targetPos = em.getPosition(unit.targetId);
    if (!targetPos) return;

    const dist = Math.hypot(targetPos.x - pos.x, targetPos.y - pos.y);

    if (dist > this.BUILD_RANGE) {
      this.moveUnit(entityId, { x: targetPos.x, y: targetPos.y });
      em.setUnitState(entityId, 'building');
    } else {
      // Build
      const building = em.getBuildingComponent(unit.targetId);
      if (!building) return;

      if (building.isComplete) {
        em.setUnitState(entityId, 'idle');
        return;
      }

      // Advance build progress
      const buildRate = 1 / (building.data.buildTime * 20); // 20 ticks per second
      building.buildProgress = Math.min(1, building.buildProgress + buildRate);

      // Increase HP proportionally
      const targetHP = Math.floor(building.data.hp * building.buildProgress);
      const currentHP = em.getHP(unit.targetId) ?? 0;
      if (targetHP > currentHP) {
        em.setHP(unit.targetId, targetHP);
      }

      if (building.buildProgress >= 1) {
        building.isComplete = true;
        em.setHP(unit.targetId, building.data.hp);
        em.setUnitState(entityId, 'idle');
      }
    }
  }

  private updateRepairing(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos || !unit.targetId) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    if (!em.entityExists(unit.targetId)) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const targetPos = em.getPosition(unit.targetId);
    if (!targetPos) return;

    const dist = Math.hypot(targetPos.x - pos.x, targetPos.y - pos.y);

    if (dist > this.BUILD_RANGE) {
      this.moveUnit(entityId, { x: targetPos.x, y: targetPos.y });
      em.setUnitState(entityId, 'repairing');
    } else {
      const hp = em.getHP(unit.targetId) ?? 0;
      const maxHP = em.getMaxHP(unit.targetId) ?? 0;

      if (hp >= maxHP) {
        em.setUnitState(entityId, 'idle');
        return;
      }

      // Repair rate: 1 HP per tick
      em.setHP(unit.targetId, hp + 1);
    }
  }

  private updatePatrolling(entityId: EntityId, dt: number): void {
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos) return;

    // Check for enemies in range
    const enemies = em.getEntitiesInRange(pos.x, pos.y, unit.data.lineOfSight ?? 6);
    for (const enemy of enemies) {
      if (em.getOwner(enemy) !== em.getOwner(entityId) &&
        em.getOwner(enemy) !== -1 &&
        em.isUnit(enemy)) {
        this.attackUnit(entityId, enemy);
        return;
      }
    }

    // Continue patrol
    if (unit.patrolPoints.length === 0) {
      em.setUnitState(entityId, 'idle');
      return;
    }

    const target = unit.patrolPoints[unit.patrolIndex];
    const dist = Math.hypot(target.x - pos.x, target.y - pos.y);

    if (dist < 1) {
      unit.patrolIndex = (unit.patrolIndex + 1) % unit.patrolPoints.length;
      this.moveUnit(entityId, unit.patrolPoints[unit.patrolIndex]);
      em.setUnitState(entityId, 'patrolling');
    } else if (unit.path.length === 0) {
      this.moveUnit(entityId, target);
      em.setUnitState(entityId, 'patrolling');
    } else {
      // Follow existing path
      this.updateMoving(entityId, dt);
      em.setUnitState(entityId, 'patrolling');
    }
  }

  private updateIdle(entityId: EntityId, dt: number): void {
    // Auto-attack nearby enemies (stance-dependent)
    const em = this.game.entityManager;
    const unit = em.getUnitComponent(entityId);
    const pos = em.getPosition(entityId);
    if (!unit || !pos) return;

    const attackRange = Math.max(unit.data.range ?? 0, 1) + 2;
    const enemies = em.getEntitiesInRange(pos.x, pos.y, attackRange);

    for (const enemy of enemies) {
      if (em.getOwner(enemy) !== em.getOwner(entityId) &&
        em.getOwner(enemy) !== -1 &&
        (em.isUnit(enemy) || em.isBuilding(enemy))) {
        this.attackUnit(entityId, enemy);
        return;
      }
    }
  }

  dispose(): void {}
}
