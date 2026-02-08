// ============================================================
// Empires Risen - Combat System
// Handles damage, armor, bonus damage, projectiles
// ============================================================

import { Game } from '../engine/Game';
import { EntityId, UnitCategory } from '@shared/types';

interface Projectile {
  sourceId: EntityId;
  targetId: EntityId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  angle: number;
  age: number;
}

export class CombatSystem {
  private game: Game;
  private projectiles: Projectile[] = [];

  constructor(game: Game) {
    this.game = game;
  }

  update(dt: number): void {
    // Update projectiles
    this.updateProjectiles(dt);
  }

  // ---- Damage Calculation ----

  dealDamage(attackerId: EntityId, targetId: EntityId): void {
    const em = this.game.entityManager;

    const attackerUnit = em.getUnitData(attackerId);
    if (!attackerUnit) return;

    const targetUnit = em.getUnitData(targetId);
    const targetBuilding = em.getBuildingData(targetId);

    let baseDamage = attackerUnit.attack;

    // Apply bonus damage
    if (attackerUnit.bonusDamage) {
      for (const [category, amount] of Object.entries(attackerUnit.bonusDamage)) {
        // Check unit category matching
        if (targetUnit && this.matchesCategory(targetUnit.category, category)) {
          baseDamage += amount;
        }
        // Check building category matching
        if (targetBuilding && category === 'building') {
          baseDamage += amount;
        }
      }
    }

    // Apply armor
    let armor = 0;
    if (targetUnit) {
      // Melee or pierce armor based on attacker range
      armor = (attackerUnit.range ?? 0) > 1 ?
        (targetUnit.pierceArmor ?? 0) :
        (targetUnit.meleeArmor ?? 0);
    } else if (targetBuilding) {
      armor = (attackerUnit.range ?? 0) > 1 ?
        (targetBuilding.pierceArmor ?? 0) :
        (targetBuilding.meleeArmor ?? 0);
    }

    // Minimum 1 damage
    const finalDamage = Math.max(1, baseDamage - armor);

    // Apply damage
    const killed = em.damage(targetId, finalDamage);

    if (killed) {
      this.handleEntityKill(attackerId, targetId);
    }
  }

  private matchesCategory(category: UnitCategory, against: string): boolean {
    // Map bonus damage targets to categories
    const categoryMap: Record<string, UnitCategory[]> = {
      'infantry': [UnitCategory.Infantry],
      'cavalry': [UnitCategory.Cavalry],
      'archer': [UnitCategory.Archer],
      'siege': [UnitCategory.Siege],
      'monk': [UnitCategory.Monk],
      'ship': [UnitCategory.Naval],
      'camel': [UnitCategory.Cavalry], // Camels are cavalry
      'elephant': [UnitCategory.Cavalry], // Elephants are cavalry
      'spearman': [UnitCategory.Infantry], // Spearmen are infantry
      'eagle': [UnitCategory.Infantry],
      'unique': [UnitCategory.Infantry, UnitCategory.Cavalry, UnitCategory.Archer],
    };

    const matches = categoryMap[against.toLowerCase()];
    return matches ? matches.includes(category) : false;
  }

  private handleEntityKill(killerId: EntityId, victimId: EntityId): void {
    const em = this.game.entityManager;

    // Spawn death particles
    const victimPos = em.getPosition(victimId);
    if (victimPos) {
      const isBuilding = em.isBuilding(victimId);
      this.game.renderer.spawnParticles(
        victimPos.x, victimPos.y,
        isBuilding ? 'smoke' : 'blood',
        isBuilding ? 12 : 6
      );
      if (isBuilding) {
        this.game.renderer.spawnParticles(victimPos.x, victimPos.y, 'spark', 8);
      }
      // Play death sound
      this.game.audioManager?.playPositional('death', victimPos.x, victimPos.y);
    }

    // For units, set dead state for death animation instead of immediate removal
    if (em.isUnit(victimId)) {
      em.setUnitState(victimId, 'dead');
      // Schedule removal after death animation (1.5 seconds)
      setTimeout(() => {
        if (em.entityExists(victimId)) {
          em.removeEntity(victimId);
        }
      }, 1500);
    } else {
      // Buildings removed immediately
      if (em.isBuilding(victimId)) {
        this.game.buildingSystem.deleteBuilding(victimId);
      } else {
        em.removeEntity(victimId);
      }
    }

    // Update killer score / bounty
    const killerOwner = em.getOwner(killerId);
    const player = this.game.state.players.get(killerOwner);
    if (player) {
      player.score += 5;
    }

    // Remove from selections
    const idx = this.game.selectedEntities.indexOf(victimId);
    if (idx >= 0) this.game.selectedEntities.splice(idx, 1);
  }

  // ---- Projectiles ----

  createProjectile(
    sourceId: EntityId, targetId: EntityId,
    sx: number, sy: number,
    tx: number, ty: number,
    damage: number
  ): void {
    const angle = Math.atan2(ty - sy, tx - sx);

    this.projectiles.push({
      sourceId,
      targetId,
      x: sx,
      y: sy,
      targetX: tx,
      targetY: ty,
      speed: 8,
      damage,
      angle,
      age: 0,
    });
  }

  private updateProjectiles(dt: number): void {
    const em = this.game.entityManager;

    this.projectiles = this.projectiles.filter(proj => {
      proj.age += dt;

      // Update target position (track moving targets)
      if (em.entityExists(proj.targetId)) {
        const tPos = em.getPosition(proj.targetId);
        if (tPos) {
          proj.targetX = tPos.x;
          proj.targetY = tPos.y;
        }
      }

      // Move projectile
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      proj.angle = Math.atan2(dy, dx);

      if (dist < 0.5) {
        // Hit target
        if (em.entityExists(proj.targetId)) {
          this.dealDamage(proj.sourceId, proj.targetId);
        }
        return false;
      }

      // Move
      const moveSpeed = proj.speed * dt;
      proj.x += (dx / dist) * Math.min(moveSpeed, dist);
      proj.y += (dy / dist) * Math.min(moveSpeed, dist);

      // Max age (prevent stuck projectiles — 5 seconds)
      return proj.age < 5;
    });
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  // ---- Area Damage (Siege) ----

  dealAreaDamage(x: number, y: number, radius: number, damage: number, attackerId: EntityId): void {
    const em = this.game.entityManager;
    const attackerOwner = em.getOwner(attackerId);

    const targets = em.getEntitiesInRange(x, y, radius);
    for (const targetId of targets) {
      if (em.getOwner(targetId) === attackerOwner) continue; // Don't hit own units
      if (em.getOwner(targetId) === -1) continue; // Don't hit Gaia

      const dist = (() => {
        const pos = em.getPosition(targetId);
        if (!pos) return Infinity;
        return Math.hypot(pos.x - x, pos.y - y);
      })();

      // Damage falls off with distance
      const falloff = 1 - (dist / radius);
      const finalDamage = Math.max(1, Math.floor(damage * falloff));

      const killed = em.damage(targetId, finalDamage);
      if (killed) {
        this.handleEntityKill(attackerId, targetId);
      }
    }
  }

  // ---- Conversion (Monks) ----

  attemptConversion(monkId: EntityId, targetId: EntityId): boolean {
    const em = this.game.entityManager;
    const monkOwner = em.getOwner(monkId);

    // Random chance of conversion (simplified)
    const chance = 0.02; // 2% per tick
    if (Math.random() < chance) {
      // Convert target
      const entity = em.getAllEntities().find(e => e.id === targetId);
      if (entity) {
        entity.owner = monkOwner;
        return true;
      }
    }

    return false;
  }

  dispose(): void {
    this.projectiles = [];
  }
}
