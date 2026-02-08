// ============================================================
// Empires Risen - Resource System
// Manages player resources, gathering rates, tech effects
// ============================================================

import { Game } from '../engine/Game';
import { ResourceType, Age } from '@shared/types';
import { TECHNOLOGIES } from '@shared/data/technologies';

export interface PlayerResources {
  food: number;
  wood: number;
  gold: number;
  stone: number;
}

export class ResourceSystem {
  private game: Game;

  // Gathering rate modifiers per player
  private gatherModifiers: Map<number, Record<ResourceType, number>> = new Map();
  private marketRates: Map<number, { buyRate: number; sellRate: number }> = new Map();

  constructor(game: Game) {
    this.game = game;
  }

  init(playerIds: number[]): void {
    for (const id of playerIds) {
      this.gatherModifiers.set(id, {
        food: 1.0,
        wood: 1.0,
        gold: 1.0,
        stone: 1.0,
      });
      this.marketRates.set(id, { buyRate: 130, sellRate: 70 });
    }
  }

  update(dt: number): void {
    // Resource income is handled by unit gathering in UnitSystem
    // This system handles trade and market operations

    // Process trade carts
    const em = this.game.entityManager;
    for (const entity of em.getAllUnits()) {
      const unit = em.getUnitComponent(entity.id);
      if (!unit || unit.data.id !== 'tradeCart') continue;

      // Trade cart logic would go here
    }
  }

  // ---- Resource Management ----

  addResource(playerId: number, type: ResourceType, amount: number): void {
    const player = this.game.state.players.get(playerId);
    if (!player) return;

    const modifier = this.gatherModifiers.get(playerId)?.[type] ?? 1;
    player.resources[type] = (player.resources[type] ?? 0) + Math.floor(amount * modifier);
  }

  removeResource(playerId: number, type: ResourceType, amount: number): boolean {
    const player = this.game.state.players.get(playerId);
    if (!player) return false;

    const current = player.resources[type] ?? 0;
    if (current < amount) return false;

    player.resources[type] = current - amount;
    return true;
  }

  getResource(playerId: number, type: ResourceType): number {
    return this.game.state.players.get(playerId)?.resources[type] ?? 0;
  }

  getAllResources(playerId: number): PlayerResources {
    const player = this.game.state.players.get(playerId);
    return {
      food: player?.resources.food ?? 0,
      wood: player?.resources.wood ?? 0,
      gold: player?.resources.gold ?? 0,
      stone: player?.resources.stone ?? 0,
    };
  }

  canAfford(playerId: number, cost: Partial<Record<string, number>>): boolean {
    const player = this.game.state.players.get(playerId);
    if (!player) return false;

    for (const [res, amount] of Object.entries(cost)) {
      if ((player.resources[res as ResourceType] ?? 0) < (amount ?? 0)) return false;
    }
    return true;
  }

  // ---- Market (Tribute & Trade) ----

  buyResource(playerId: number, type: ResourceType, amount: number): boolean {
    const rates = this.marketRates.get(playerId);
    if (!rates) return false;

    const cost = Math.ceil(amount * rates.buyRate / 100);
    if (!this.removeResource(playerId, 'gold' as ResourceType, cost)) return false;

    this.addResource(playerId, type, amount);

    // Increase buy rate (diminishing returns)
    rates.buyRate = Math.min(300, rates.buyRate + 3);
    return true;
  }

  sellResource(playerId: number, type: ResourceType, amount: number): boolean {
    if (!this.removeResource(playerId, type, amount)) return false;

    const rates = this.marketRates.get(playerId);
    if (!rates) return false;

    const gold = Math.floor(amount * rates.sellRate / 100);
    this.addResource(playerId, 'gold' as ResourceType, gold);

    // Decrease sell rate
    rates.sellRate = Math.max(20, rates.sellRate - 3);
    return true;
  }

  tribute(fromPlayer: number, toPlayer: number, type: ResourceType, amount: number): boolean {
    const player = this.game.state.players.get(fromPlayer);
    if (!player) return false;

    // Check if player has researched Coinage (reduces tribute tax)
    const hasCoinAge = player.researchedTechs.has('coinage');
    const taxRate = hasCoinAge ? 0.0 : 0.25;
    const taxAmount = Math.floor(amount * taxRate);

    if (!this.removeResource(fromPlayer, type, amount)) return false;
    this.addResource(toPlayer, type, amount - taxAmount);

    return true;
  }

  // ---- Age Advancement ----

  canAdvanceAge(playerId: number): Age | null {
    const player = this.game.state.players.get(playerId);
    if (!player) return null;

    const ageCosts: Record<Age, { food: number; gold: number }> = {
      [Age.Dark]: { food: 0, gold: 0 },
      [Age.Feudal]: { food: 500, gold: 0 },
      [Age.Castle]: { food: 800, gold: 200 },
      [Age.Imperial]: { food: 1000, gold: 800 },
    };

    const nextAge: Record<Age, Age | null> = {
      [Age.Dark]: Age.Feudal,
      [Age.Feudal]: Age.Castle,
      [Age.Castle]: Age.Imperial,
      [Age.Imperial]: null,
    };

    const next = nextAge[player.age];
    if (!next) return null;

    const cost = ageCosts[next];
    if (this.getResource(playerId, 'food' as ResourceType) >= cost.food &&
      this.getResource(playerId, 'gold' as ResourceType) >= cost.gold) {
      return next;
    }

    return null;
  }

  advanceAge(playerId: number): boolean {
    const nextAge = this.canAdvanceAge(playerId);
    if (!nextAge) return false;

    const ageCosts: Record<Age, { food: number; gold: number }> = {
      [Age.Dark]: { food: 0, gold: 0 },
      [Age.Feudal]: { food: 500, gold: 0 },
      [Age.Castle]: { food: 800, gold: 200 },
      [Age.Imperial]: { food: 1000, gold: 800 },
    };

    const cost = ageCosts[nextAge];
    this.removeResource(playerId, 'food' as ResourceType, cost.food);
    this.removeResource(playerId, 'gold' as ResourceType, cost.gold);

    const player = this.game.state.players.get(playerId);
    if (player) {
      player.age = nextAge;
    }

    return true;
  }

  // ---- Technology Effects ----

  applyTechEffects(playerId: number, techId: string): void {
    const tech = TECHNOLOGIES[techId];
    if (!tech) return;

    for (const effect of tech.effects) {
      switch (effect.type) {
        case 'resource_bonus':
          if (effect.target && effect.value) {
            const mods = this.gatherModifiers.get(playerId);
            if (mods) {
              const res = effect.target as ResourceType;
              mods[res] = (mods[res] ?? 1) * effect.value;
            }
          }
          break;

        case 'stat_modifier':
          // Apply to all units of affected type
          // This would modify unit stats in the entity manager
          break;

        case 'ability_unlock':
          // Unlock special abilities
          break;
      }
    }
  }

  // ---- Score Calculation ----

  calculateScore(playerId: number): number {
    const player = this.game.state.players.get(playerId);
    if (!player) return 0;

    const em = this.game.entityManager;

    // Military score
    let militaryScore = 0;
    for (const entity of em.getAllUnits()) {
      if (em.getOwner(entity.id) === playerId) {
        const unit = em.getUnitData(entity.id);
        if (unit) militaryScore += Math.floor((unit.hp + unit.attack * 3) * 0.5);
      }
    }

    // Economy score
    const res = this.getAllResources(playerId);
    const economyScore = Math.floor((res.food + res.wood + res.gold + res.stone) * 0.1);

    // Technology score
    const techScore = player.researchedTechs.size * 10;

    // Society score (buildings)
    let societyScore = 0;
    for (const entity of em.getAllBuildings()) {
      if (em.getOwner(entity.id) === playerId && em.isBuildingComplete(entity.id)) {
        societyScore += 10;
      }
    }

    return militaryScore + economyScore + techScore + societyScore;
  }

  dispose(): void {
    this.gatherModifiers.clear();
    this.marketRates.clear();
  }
}
