// ============================================================
// Empires Risen - AI Controller
// Computer opponent with difficulty levels and build orders
// ============================================================

import { Game } from '../engine/Game';
import { CommandType, Age, ResourceType, EntityId } from '@shared/types';

type AIDifficulty = 'easy' | 'moderate' | 'hard' | 'hardest';

interface AIState {
  playerId: number;
  difficulty: AIDifficulty;
  currentAge: Age;
  phase: 'darkAge' | 'feudalRush' | 'castleBoom' | 'imperialPush' | 'lateGame';
  buildOrderIndex: number;
  lastActionTime: number;
  villagerTarget: number;
  militaryTarget: number;
  attackTimer: number;
  scoutTimer: number;
  expansionTimer: number;
}

const DIFFICULTY_MODIFIERS: Record<AIDifficulty, {
  thinkInterval: number;
  resourceBonus: number;
  attackDelay: number;
  villagerRatio: number;
}> = {
  easy: { thinkInterval: 5000, resourceBonus: 0, attackDelay: 600000, villagerRatio: 0.6 },
  moderate: { thinkInterval: 3000, resourceBonus: 0, attackDelay: 420000, villagerRatio: 0.55 },
  hard: { thinkInterval: 1500, resourceBonus: 0.15, attackDelay: 300000, villagerRatio: 0.5 },
  hardest: { thinkInterval: 800, resourceBonus: 0.3, attackDelay: 180000, villagerRatio: 0.45 },
};

export class AIController {
  private game: Game;
  private aiPlayers: Map<number, AIState> = new Map();
  private updateTimer: number = 0;

  constructor(game: Game) {
    this.game = game;
  }

  registerAI(playerId: number, difficulty: AIDifficulty): void {
    this.aiPlayers.set(playerId, {
      playerId,
      difficulty,
      currentAge: Age.Dark,
      phase: 'darkAge',
      buildOrderIndex: 0,
      lastActionTime: 0,
      villagerTarget: 6,
      militaryTarget: 0,
      attackTimer: DIFFICULTY_MODIFIERS[difficulty].attackDelay,
      scoutTimer: 0,
      expansionTimer: 0,
    });
  }

  update(dt: number): void {
    const dtMs = dt * 1000; // dt comes in seconds, convert to ms
    for (const [playerId, aiState] of this.aiPlayers) {
      const mod = DIFFICULTY_MODIFIERS[aiState.difficulty];

      // Resource bonus for harder difficulties (trickle per think)
      if (mod.resourceBonus > 0) {
        const bonus = Math.floor(2 * mod.resourceBonus);
        this.game.resourceSystem.addResource(playerId, 'food' as ResourceType, bonus);
        this.game.resourceSystem.addResource(playerId, 'wood' as ResourceType, bonus);
        this.game.resourceSystem.addResource(playerId, 'gold' as ResourceType, Math.floor(bonus * 0.5));
      }

      aiState.lastActionTime += dtMs;
      if (aiState.lastActionTime < mod.thinkInterval) continue;
      aiState.lastActionTime = 0;

      // Update phase
      this.updatePhase(aiState);

      // Execute AI logic
      this.thinkEconomy(aiState);
      this.thinkMilitary(aiState);
      this.thinkBuildings(aiState);
      this.thinkResearch(aiState);
      this.thinkDefense(aiState);
      this.thinkScout(aiState, dtMs);
      this.thinkAttack(aiState, dtMs);
    }
  }

  private updatePhase(ai: AIState): void {
    const player = this.game.state.players.get(ai.playerId);
    if (!player) return;

    ai.currentAge = player.age;

    switch (player.age) {
      case Age.Dark:
        ai.phase = 'darkAge';
        ai.villagerTarget = 22;
        ai.militaryTarget = 0;
        break;
      case Age.Feudal:
        ai.phase = 'feudalRush';
        ai.villagerTarget = 30;
        ai.militaryTarget = 8;
        break;
      case Age.Castle:
        ai.phase = 'castleBoom';
        ai.villagerTarget = 45;
        ai.militaryTarget = 20;
        break;
      case Age.Imperial:
        ai.phase = 'imperialPush';
        ai.villagerTarget = 60;
        ai.militaryTarget = 40;
        break;
    }
  }

  private thinkEconomy(ai: AIState): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;

    // Count current villagers
    const villagers = em.getUnitsByType('villager', playerId);
    const idleVillagers = em.getIdleVillagers(playerId);

    // Train more villagers if under target
    if (villagers.length < ai.villagerTarget) {
      const tcs = em.getBuildingsByType('townCenter', playerId);
      for (const tc of tcs) {
        if (em.isBuildingComplete(tc)) {
          this.game.issueCommand({
            type: CommandType.Train,
            buildingId: tc,
            unitType: 'villager',
            playerId,
          });
        }
      }
    }

    // Assign idle villagers to resources
    for (const vId of idleVillagers) {
      const pos = em.getPosition(vId);
      if (!pos) continue;

      // Determine what resource we need most
      const res = this.game.resourceSystem.getAllResources(playerId);
      let targetType: ResourceType;

      if (res.food < 200) targetType = 'food' as ResourceType;
      else if (res.wood < 150) targetType = 'wood' as ResourceType;
      else if (res.gold < 100 && ai.currentAge !== Age.Dark) targetType = 'gold' as ResourceType;
      else if (res.stone < 100 && ai.currentAge === Age.Castle) targetType = 'stone' as ResourceType;
      else targetType = 'food' as ResourceType;

      // Find nearest resource
      this.assignVillagerToResource(vId, playerId, targetType, pos);
    }

    // Try to advance age
    const nextAge = this.game.resourceSystem.canAdvanceAge(playerId);
    if (nextAge) {
      // Check if we have enough villagers before aging up
      const minVillagers: Record<Age, number> = {
        [Age.Dark]: 0,
        [Age.Feudal]: 20,
        [Age.Castle]: 28,
        [Age.Imperial]: 40,
      };

      if (villagers.length >= (minVillagers[nextAge] ?? 0)) {
        this.game.resourceSystem.advanceAge(playerId);
      }
    }
  }

  private thinkMilitary(ai: AIState): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;

    if (ai.militaryTarget <= 0) return;

    // Count military units
    const military = em.getIdleMilitary(playerId);

    // When in Feudal+, train military
    if (ai.currentAge !== Age.Dark) {
      const barracks = em.getBuildingsByType('barracks', playerId);
      const archeryRanges = em.getBuildingsByType('archeryRange', playerId);
      const stables = em.getBuildingsByType('stable', playerId);

      // Determine unit composition based on age
      let unitToTrain = 'militia';
      if (ai.currentAge === Age.Feudal) unitToTrain = 'manAtArms';
      else if (ai.currentAge === Age.Castle) unitToTrain = 'knight';
      else if (ai.currentAge === Age.Imperial) unitToTrain = 'champion';

      // Train from barracks
      for (const b of barracks) {
        if (em.isBuildingComplete(b)) {
          this.game.issueCommand({
            type: CommandType.Train,
            buildingId: b,
            unitType: unitToTrain,
            playerId,
          });
        }
      }

      // Train archers
      const archerUnit = ai.currentAge === Age.Castle ? 'crossbowman' : 'archer';
      for (const a of archeryRanges) {
        if (em.isBuildingComplete(a)) {
          this.game.issueCommand({
            type: CommandType.Train,
            buildingId: a,
            unitType: archerUnit,
            playerId,
          });
        }
      }

      // Train cavalry
      if (ai.currentAge >= Age.Castle) {
        for (const s of stables) {
          if (em.isBuildingComplete(s)) {
            this.game.issueCommand({
              type: CommandType.Train,
              buildingId: s,
              unitType: 'knight',
              playerId,
            });
          }
        }
      }
    }
  }

  private thinkBuildings(ai: AIState): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;
    const res = this.game.resourceSystem.getAllResources(playerId);

    const buildingCounts: Record<string, number> = {};
    for (const entity of em.getAllBuildings()) {
      if (em.getOwner(entity.id) === playerId) {
        const data = em.getBuildingData(entity.id);
        if (data) {
          buildingCounts[data.id] = (buildingCounts[data.id] ?? 0) + 1;
        }
      }
    }

    const villagers = em.getUnitsByType('villager', playerId);
    if (villagers.length === 0) return;

    // Get a builder - first idle villager
    const idleVillagers = em.getIdleVillagers(playerId);
    if (idleVillagers.length === 0) return;
    const builder = idleVillagers[0];
    const builderPos = em.getPosition(builder);
    if (!builderPos) return;

    // Building priorities based on phase
    const needs: { type: string; max: number }[] = [];

    // Always need houses
    const pop = em.getPopulation(playerId);
    const popCap = em.getPopulationCap(playerId);
    if (popCap - pop < 4) {
      needs.push({ type: 'house', max: 30 });
    }

    // Dark age buildings
    if (ai.phase === 'darkAge') {
      needs.push({ type: 'lumberCamp', max: 2 });
      needs.push({ type: 'mill', max: 1 });
      needs.push({ type: 'miningCamp', max: 1 });
      // Build farms once berries run low
      if (res.food < 300 && villagers.length >= 8) {
        needs.push({ type: 'farm', max: 5 });
      }
    }

    // Feudal age buildings
    if (ai.currentAge >= Age.Feudal) {
      needs.push({ type: 'barracks', max: 2 });
      needs.push({ type: 'archeryRange', max: 1 });
      needs.push({ type: 'blacksmith', max: 1 });
      needs.push({ type: 'market', max: 1 });
      needs.push({ type: 'farm', max: 8 });
    }

    // Castle age buildings
    if (ai.currentAge >= Age.Castle) {
      needs.push({ type: 'stable', max: 2 });
      needs.push({ type: 'monastery', max: 1 });
      needs.push({ type: 'university', max: 1 });
      needs.push({ type: 'siegeWorkshop', max: 1 });
      if (res.stone >= 650) needs.push({ type: 'castle', max: 1 });
      needs.push({ type: 'townCenter', max: 3 });
      needs.push({ type: 'farm', max: 15 });
    }

    // Imperial age buildings
    if (ai.currentAge === Age.Imperial) {
      needs.push({ type: 'barracks', max: 4 });
      needs.push({ type: 'archeryRange', max: 3 });
      needs.push({ type: 'stable', max: 3 });
      needs.push({ type: 'farm', max: 25 });
    }

    // Build first needed building
    for (const need of needs) {
      const count = buildingCounts[need.type] ?? 0;
      if (count >= need.max) continue;

      // Find placement near TC
      const tcs = em.getBuildingsByType('townCenter', playerId);
      if (tcs.length === 0) continue;

      const tcPos = em.getPosition(tcs[0]);
      if (!tcPos) continue;

      // Try to place near TC
      const offset = this.findBuildingPlacement(need.type, tcPos.x, tcPos.y);
      if (offset) {
        this.game.issueCommand({
          type: CommandType.Build,
          entityIds: [builder],
          buildingType: need.type,
          position: offset,
          playerId,
        });
        break; // One building per think cycle
      }
    }
  }

  private thinkAttack(ai: AIState, dtMs: number): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;

    ai.attackTimer -= dtMs;
    if (ai.attackTimer > 0) return;

    // Reset attack timer (shorter for aggressive gameplay)
    ai.attackTimer = DIFFICULTY_MODIFIERS[ai.difficulty].attackDelay * 0.4;

    // Gather military units
    const military: EntityId[] = [];
    for (const entity of em.getAllUnits()) {
      if (em.getOwner(entity.id) !== playerId) continue;
      const unit = em.getUnitData(entity.id);
      if (!unit || unit.id === 'villager') continue;
      if (em.getUnitState(entity.id) !== 'idle') continue;
      military.push(entity.id);
    }

    if (military.length < Math.max(3, ai.militaryTarget * 0.4)) return;

    // Find enemy base
    let targetPos: { x: number; y: number } | null = null;

    for (const [pid, player] of this.game.state.players) {
      if (pid === playerId || pid === -1) continue;
      if (player.isDefeated) continue;

      // Find their town center
      const enemyTCs = em.getBuildingsByType('townCenter', pid);
      if (enemyTCs.length > 0) {
        const pos = em.getPosition(enemyTCs[0]);
        if (pos) {
          targetPos = { x: pos.x, y: pos.y };
          break;
        }
      }

      // Find any enemy building
      for (const entity of em.getAllBuildings()) {
        if (em.getOwner(entity.id) === pid) {
          const pos = em.getPosition(entity.id);
          if (pos) {
            targetPos = { x: pos.x, y: pos.y };
            break;
          }
        }
      }
    }

    if (targetPos && military.length > 0) {
      // Send attack command
      this.game.issueCommand({
        type: CommandType.AttackMove,
        entityIds: military,
        position: targetPos,
        playerId,
      });
    }
  }

  private assignVillagerToResource(
    villagerId: EntityId,
    playerId: number,
    resourceType: ResourceType,
    pos: { x: number; y: number }
  ): void {
    const map = this.game.state.map;
    if (!map) return;

    // Find nearest resource of type
    let bestDist = Infinity;
    let bestPos: { x: number; y: number } | null = null;

    const searchRadius = 30;
    for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
      for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
        const tx = Math.floor(pos.x) + dx;
        const ty = Math.floor(pos.y) + dy;
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;

        const tile = map.tiles[ty]?.[tx];
        if (!tile || !tile.resourceType || !tile.resourceAmount || tile.resourceAmount <= 0) continue;

        if (tile.resourceType === resourceType ||
          (resourceType === 'wood' && tile.terrain === 6)) { // Forest tiles for wood
          const dist = Math.hypot(dx, dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = { x: tx + 0.5, y: ty + 0.5 };
          }
        }
      }
    }

    if (bestPos) {
      this.game.issueCommand({
        type: CommandType.Gather,
        entityIds: [villagerId],
        position: bestPos,
        playerId,
      });
    }
  }

  private findBuildingPlacement(
    buildingType: string,
    nearX: number,
    nearY: number
  ): { x: number; y: number } | null {
    // Spiral search for valid placement
    for (let r = 3; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const tx = Math.floor(nearX) + dx;
          const ty = Math.floor(nearY) + dy;

          if (this.game.buildingSystem.canPlaceBuilding(buildingType, tx, ty, 0)) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    return null;
  }

  // ---- Research ----

  private thinkResearch(ai: AIState): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;
    const player = this.game.state.players.get(playerId);
    if (!player) return;

    // Priority research based on age
    const researchPriority: string[][] = [
      // Dark Age
      ['loom'],
      // Feudal Age
      ['doubleBitAxe', 'horseCollar', 'goldMining', 'forgingInfantry', 'scaleMailArmor'],
      // Castle Age
      ['bowSaw', 'heavyPlow', 'goldShaftMining', 'ironCastingInfantry', 'chainMailArmor', 'wheelbarrow'],
      // Imperial Age
      ['twoManSaw', 'cropRotation', 'blastFurnaceInfantry', 'handCart'],
    ];

    const ageIndex = ai.currentAge === Age.Dark ? 0 :
                     ai.currentAge === Age.Feudal ? 1 :
                     ai.currentAge === Age.Castle ? 2 : 3;

    for (let i = 0; i <= ageIndex; i++) {
      for (const techId of researchPriority[i]) {
        if (player.researchedTechs.has(techId)) continue;

        // Find the building that researches this tech
        const techData = (globalThis as any).__TECHNOLOGIES?.[techId];
        const researchedAt = techData?.researchedAt;
        if (!researchedAt) continue;

        const buildings = em.getBuildingsByType(researchedAt, playerId);
        for (const b of buildings) {
          if (em.isBuildingComplete(b)) {
            this.game.buildingSystem.research(b, techId, playerId);
            return; // One research per think cycle
          }
        }
      }
    }
  }

  // ---- Defense ----

  private thinkDefense(ai: AIState): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;

    // Check for enemy units near base
    const tcs = em.getBuildingsByType('townCenter', playerId);
    if (tcs.length === 0) return;

    const tcPos = em.getPosition(tcs[0]);
    if (!tcPos) return;

    // Scan for threats near TC
    const threats = em.getEntitiesInRange(tcPos.x, tcPos.y, 15);
    const enemyThreats: EntityId[] = [];
    for (const threatId of threats) {
      const owner = em.getOwner(threatId);
      if (owner !== playerId && owner !== -1 && em.isUnit(threatId)) {
        enemyThreats.push(threatId);
      }
    }

    if (enemyThreats.length === 0) return;

    // Rally idle military to defend
    const idleMilitary = em.getIdleMilitary(playerId);
    if (idleMilitary.length > 0) {
      for (const unitId of idleMilitary) {
        this.game.issueCommand({
          type: CommandType.Attack,
          entityIds: [unitId],
          targetId: enemyThreats[0],
          playerId,
        });
      }
    }

    // Garrison villagers if heavily outnumbered
    if (enemyThreats.length > 5) {
      const villagers = em.getUnitsByType('villager', playerId);
      for (const vId of villagers.slice(0, 5)) {
        const vPos = em.getPosition(vId);
        if (vPos && Math.hypot(vPos.x - tcPos.x, vPos.y - tcPos.y) < 20) {
          this.game.issueCommand({
            type: CommandType.Garrison,
            entityIds: [vId],
            targetId: tcs[0],
            playerId,
          });
        }
      }

      // Ring the town bell
      this.game.hudManager?.showNotification(`Player ${playerId} is under attack!`, '#e74c3c');
    }
  }

  // ---- Scouting ----

  private thinkScout(ai: AIState, dtMs: number): void {
    const em = this.game.entityManager;
    const playerId = ai.playerId;

    ai.scoutTimer -= dtMs;
    if (ai.scoutTimer > 0) return;
    ai.scoutTimer = 8000; // Scout every 8 seconds

    // Find scout unit
    const scouts = em.getUnitsByType('scoutCavalry', playerId);
    if (scouts.length === 0) return;

    const scoutId = scouts[0];
    const scoutPos = em.getPosition(scoutId);
    if (!scoutPos) return;

    const state = em.getUnitState(scoutId);
    if (state !== 'idle') return;

    // Send scout to random unexplored area
    const map = this.game.state.map;
    if (!map) return;

    const targetX = Math.random() * map.width;
    const targetY = Math.random() * map.height;

    this.game.issueCommand({
      type: CommandType.Move,
      entityIds: [scoutId],
      position: { x: targetX, y: targetY },
      playerId,
    });
  }

  dispose(): void {
    this.aiPlayers.clear();
  }
}
