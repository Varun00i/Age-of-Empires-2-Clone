// ============================================================
// Empires Risen - HUD Manager
// In-game UI: resources, selection info, action buttons,
// minimap, notifications, chat
// ============================================================

import { Game } from '../engine/Game';
import { EntityId, Age, ResourceType, PLAYER_COLORS } from '@shared/types';
import { BUILDINGS } from '@shared/data/buildings';
import { UNITS } from '@shared/data/units';

export class HUDManager {
  private game: Game;
  private notificationQueue: { text: string; color: string; time: number }[] = [];

  // DOM Element references
  private foodEl!: HTMLElement;
  private woodEl!: HTMLElement;
  private goldEl!: HTMLElement;
  private stoneEl!: HTMLElement;
  private popEl!: HTMLElement;
  private ageEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private unitInfoEl!: HTMLElement;
  private actionGridEl!: HTMLElement;
  private notifArea!: HTMLElement;

  constructor(game: Game) {
    this.game = game;
  }

  init(): void {
    // Cache DOM references
    this.foodEl = document.getElementById('food-amount')!;
    this.woodEl = document.getElementById('wood-amount')!;
    this.goldEl = document.getElementById('gold-amount')!;
    this.stoneEl = document.getElementById('stone-amount')!;
    this.popEl = document.getElementById('pop-display')!;
    this.ageEl = document.getElementById('current-age')!;
    this.timerEl = document.getElementById('game-timer')!;
    this.unitInfoEl = document.getElementById('unit-info')!;
    this.actionGridEl = document.getElementById('action-grid')!;
    this.notifArea = document.getElementById('notification-area')!;
  }

  update(dt: number): void {
    this.updateResourceDisplay();
    this.updateTimer();
    this.updateNotifications(dt);
  }

  private updateResourceDisplay(): void {
    const player = this.game.state.players.get(this.game.localPlayerId);
    if (!player) return;

    if (this.foodEl) this.foodEl.textContent = String(Math.floor(player.resources.food ?? 0));
    if (this.woodEl) this.woodEl.textContent = String(Math.floor(player.resources.wood ?? 0));
    if (this.goldEl) this.goldEl.textContent = String(Math.floor(player.resources.gold ?? 0));
    if (this.stoneEl) this.stoneEl.textContent = String(Math.floor(player.resources.stone ?? 0));

    // Population
    const pop = this.game.entityManager.getPopulation(this.game.localPlayerId);
    const popCap = this.game.entityManager.getPopulationCap(this.game.localPlayerId);
    if (this.popEl) {
      this.popEl.textContent = `${pop}/${popCap}`;
      this.popEl.style.color = pop >= popCap ? '#e74c3c' : '#e8d5a3';
    }

    // Age
    const ageNames: Record<Age, string> = {
      [Age.Dark]: 'Dark Age',
      [Age.Feudal]: 'Feudal Age',
      [Age.Castle]: 'Castle Age',
      [Age.Imperial]: 'Imperial Age',
    };
    if (this.ageEl) this.ageEl.textContent = ageNames[player.age] ?? 'Dark Age';
  }

  private updateTimer(): void {
    if (!this.timerEl) return;
    const totalSec = Math.floor(this.game.state.tick / 20); // 20 tick/s
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }

  updateSelection(): void {
    const selected = this.game.selectedEntities;
    const em = this.game.entityManager;

    if (!this.unitInfoEl || !this.actionGridEl) return;

    if (selected.length === 0) {
      this.unitInfoEl.innerHTML = '';
      this.actionGridEl.innerHTML = '';
      return;
    }

    if (selected.length === 1) {
      this.showSingleEntityInfo(selected[0]);
    } else {
      this.showMultipleEntityInfo(selected);
    }
  }

  private showSingleEntityInfo(entityId: EntityId): void {
    const em = this.game.entityManager;
    const unitData = em.getUnitData(entityId);
    const buildingData = em.getBuildingData(entityId);
    const hp = em.getHP(entityId) ?? 0;
    const maxHP = em.getMaxHP(entityId) ?? 0;
    const owner = em.getOwner(entityId);
    const isOwn = owner === this.game.localPlayerId;

    if (unitData) {
      const unit = em.getUnitComponent(entityId);
      this.unitInfoEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <strong style="color:#f4d03f;">${unitData.name}</strong>
          <div style="display:flex;gap:8px;font-size:11px;">
            <span>HP: ${hp}/${maxHP}</span>
            <span>ATK: ${unitData.attack}</span>
            <span>ARM: ${unitData.meleeArmor ?? 0}/${unitData.pierceArmor ?? 0}</span>
          </div>
          <div style="background:#333;height:4px;border-radius:2px;">
            <div style="background:${hp / maxHP > 0.5 ? '#27ae60' : '#e74c3c'};
                        height:100%;width:${(hp / maxHP * 100)}%;border-radius:2px;"></div>
          </div>
          ${unit?.carryAmount ? `<span style="font-size:10px;">Carrying: ${unit.carryAmount} ${unit.carryType}</span>` : ''}
          <span style="font-size:10px;color:#888;">${unitData.description ?? ''}</span>
        </div>
      `;

      // Show actions for own units
      if (isOwn) {
        this.showUnitActions(entityId, unitData.id);
      }
    } else if (buildingData) {
      const building = em.getBuildingComponent(entityId);
      const queueInfo = building?.trainingQueue.length ?
        `Training: ${building.trainingQueue[0].unitId} (${Math.floor(building.trainingQueue[0].progress / building.trainingQueue[0].totalTime * 100)}%)` : '';

      this.unitInfoEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <strong style="color:#f4d03f;">${buildingData.name}</strong>
          <div style="display:flex;gap:8px;font-size:11px;">
            <span>HP: ${hp}/${maxHP}</span>
            ${building && !building.isComplete ?
          `<span>Building: ${Math.floor(building.buildProgress * 100)}%</span>` : ''}
          </div>
          <div style="background:#333;height:4px;border-radius:2px;">
            <div style="background:${hp / maxHP > 0.5 ? '#27ae60' : '#e74c3c'};
                        height:100%;width:${(hp / maxHP * 100)}%;border-radius:2px;"></div>
          </div>
          ${queueInfo ? `<span style="font-size:10px;">${queueInfo}</span>` : ''}
          <span style="font-size:10px;color:#888;">${buildingData.description ?? ''}</span>
        </div>
      `;

      if (isOwn && building?.isComplete) {
        this.showBuildingActions(entityId, buildingData.id);
      }
    }
  }

  private showMultipleEntityInfo(entityIds: EntityId[]): void {
    const em = this.game.entityManager;
    const counts: Record<string, number> = {};

    for (const id of entityIds) {
      const unit = em.getUnitData(id);
      const building = em.getBuildingData(id);
      const name = unit?.name ?? building?.name ?? 'Unknown';
      counts[name] = (counts[name] ?? 0) + 1;
    }

    let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    for (const [name, count] of Object.entries(counts)) {
      html += `<span style="background:#333;padding:2px 6px;border-radius:3px;font-size:11px;">
        ${count}x ${name}</span>`;
    }
    html += '</div>';

    this.unitInfoEl.innerHTML = html;

    // Show common actions
    this.actionGridEl.innerHTML = '';
    this.addActionButton('Stop', '⬜', () => {
      for (const id of entityIds) {
        this.game.unitSystem.stopUnit(id);
      }
    });
    this.addActionButton('Delete', '🗑️', () => {
      for (const id of entityIds) {
        em.removeEntity(id);
      }
    });
  }

  private showUnitActions(entityId: EntityId, unitType: string): void {
    this.actionGridEl.innerHTML = '';

    if (unitType === 'villager') {
      // Build menu
      this.addActionButton('House', '🏠', () => this.game.input?.enterBuildMode('house'));
      this.addActionButton('Mill', '🌾', () => this.game.input?.enterBuildMode('mill'));
      this.addActionButton('Lumber Camp', '🪵', () => this.game.input?.enterBuildMode('lumberCamp'));
      this.addActionButton('Mining Camp', '⛏️', () => this.game.input?.enterBuildMode('miningCamp'));
      this.addActionButton('Barracks', '⚔️', () => this.game.input?.enterBuildMode('barracks'));
      this.addActionButton('Farm', '🌿', () => this.game.input?.enterBuildMode('farm'));
      this.addActionButton('Dock', '⚓', () => this.game.input?.enterBuildMode('dock'));
      this.addActionButton('Market', '💰', () => this.game.input?.enterBuildMode('market'));
      this.addActionButton('Blacksmith', '🔨', () => this.game.input?.enterBuildMode('blacksmith'));

      // Feudal+ buildings
      const player = this.game.state.players.get(this.game.localPlayerId);
      if (player && player.age >= Age.Feudal) {
        this.addActionButton('Arch Range', '🏹', () => this.game.input?.enterBuildMode('archeryRange'));
        this.addActionButton('Stable', '🐴', () => this.game.input?.enterBuildMode('stable'));
        this.addActionButton('Watch Tower', '🗼', () => this.game.input?.enterBuildMode('watchTower'));
      }
      if (player && player.age >= Age.Castle) {
        this.addActionButton('Siege Wksp', '💣', () => this.game.input?.enterBuildMode('siegeWorkshop'));
        this.addActionButton('Castle', '🏰', () => this.game.input?.enterBuildMode('castle'));
        this.addActionButton('Monastery', '🙏', () => this.game.input?.enterBuildMode('monastery'));
        this.addActionButton('University', '📚', () => this.game.input?.enterBuildMode('university'));
        this.addActionButton('Town Center', '🏛️', () => this.game.input?.enterBuildMode('townCenter'));
      }
    } else {
      // Military unit actions
      this.addActionButton('Stop', '⬜', () => this.game.unitSystem.stopUnit(entityId));
      this.addActionButton('Patrol', '🔄', () => {
        // Initiate patrol mode
        this.showNotification('Right-click to set patrol points');
      });
      this.addActionButton('Stand Ground', '🛡️', () => {
        this.game.unitSystem.stopUnit(entityId);
      });
    }

    // Common actions
    this.addActionButton('Delete', '🗑️', () => {
      this.game.entityManager.removeEntity(entityId);
      this.game.clearSelection();
    });
  }

  private showBuildingActions(entityId: EntityId, buildingType: string): void {
    this.actionGridEl.innerHTML = '';

    const buildingData = BUILDINGS[buildingType];
    if (!buildingData) return;

    // Show trainable units
    if (buildingData.trains) {
      for (const unitId of buildingData.trains) {
        const unitData = UNITS[unitId];
        if (!unitData) continue;

        const costStr = Object.entries(unitData.cost)
          .map(([r, a]) => `${a} ${r}`)
          .join(', ');

        this.addActionButton(
          unitData.name.substring(0, 10),
          this.getUnitEmoji(unitId),
          () => {
            this.game.buildingSystem.trainUnit(entityId, unitId, this.game.localPlayerId);
            this.game.audioManager?.play('click');
          },
          costStr
        );
      }
    }

    // Show researchable techs
    if (buildingData.researches) {
      for (const techId of buildingData.researches.slice(0, 5)) {
        const player = this.game.state.players.get(this.game.localPlayerId);
        if (player?.researchedTechs.has(techId)) continue;

        this.addActionButton(
          techId.substring(0, 10),
          '📜',
          () => {
            this.game.buildingSystem.research(entityId, techId, this.game.localPlayerId);
            this.game.audioManager?.play('click');
          }
        );
      }
    }

    // Rally point
    this.addActionButton('Rally Point', '🚩', () => {
      this.showNotification('Right-click to set rally point');
    });

    // Garrison / Ungarrison
    const building = this.game.entityManager.getBuildingComponent(entityId);
    if (building && (buildingData.garrisonCapacity ?? 0) > 0) {
      this.addActionButton(
        `Ungarrison (${building.garrisonedUnits.length})`,
        '🔔',
        () => this.game.buildingSystem.ungarrison(entityId)
      );
    }

    // Delete
    this.addActionButton('Delete', '🗑️', () => {
      this.game.buildingSystem.deleteBuilding(entityId);
      this.game.clearSelection();
    });
  }

  private addActionButton(label: string, emoji: string, onClick: () => void, tooltip?: string): void {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `<span style="font-size:16px;">${emoji}</span><br><span style="font-size:9px;">${label}</span>`;
    btn.title = tooltip ?? label;
    btn.style.cssText = `
      background: #3a3020;
      border: 1px solid #5a4a30;
      color: #e8d5a3;
      cursor: pointer;
      padding: 4px 2px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      transition: background 0.15s;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#4a4030'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#3a3020'; });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    this.actionGridEl.appendChild(btn);
  }

  private getUnitEmoji(unitId: string): string {
    const emojiMap: Record<string, string> = {
      'villager': '👷', 'militia': '⚔️', 'manAtArms': '🗡️', 'longSwordsman': '🗡️',
      'champion': '⚔️', 'spearman': '🔱', 'pikeman': '🔱', 'halberdier': '🔱',
      'archer': '🏹', 'crossbowman': '🏹', 'arbalester': '🏹', 'skirmisher': '🎯',
      'cavalryArcher': '🏇', 'handCannoneer': '🔫',
      'scoutCavalry': '🐴', 'lightCavalry': '🐴', 'hussar': '🐴',
      'knight': '🛡️', 'cavalier': '🛡️', 'paladin': '🛡️',
      'camelRider': '🐪', 'battleElephant': '🐘',
      'monk': '🙏', 'trebuchet': '💣', 'batteringRam': '🪵',
      'mangonel': '💥', 'scorpion': '🦂', 'bombardCannon': '💣',
      'galley': '⛵', 'fireGalley': '🔥', 'transportShip': '🚢',
    };
    return emojiMap[unitId] ?? '⚔️';
  }

  // ---- Build Menu ----

  toggleBuildMenu(): void {
    // Show building categories
    if (this.game.selectedEntities.length > 0) {
      const firstId = this.game.selectedEntities[0];
      const unit = this.game.entityManager.getUnitData(firstId);
      if (unit?.id === 'villager') {
        this.showUnitActions(firstId, 'villager');
      }
    }
  }

  // ---- Notifications ----

  showNotification(text: string, color: string = '#e8d5a3'): void {
    this.notificationQueue.push({ text, color, time: 5000 });

    if (this.notifArea) {
      const div = document.createElement('div');
      div.style.cssText = `
        color: ${color};
        background: rgba(0,0,0,0.7);
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        animation: fadeIn 0.3s, fadeOut 0.5s 4.5s;
        margin-bottom: 4px;
      `;
      div.textContent = text;
      this.notifArea.appendChild(div);

      setTimeout(() => div.remove(), 5000);
    }
  }

  private updateNotifications(dt: number): void {
    this.notificationQueue = this.notificationQueue.filter(n => {
      n.time -= dt;
      return n.time > 0;
    });
  }

  // ---- Chat ----

  addChatMessage(playerName: string, message: string, color: string = '#e8d5a3'): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const div = document.createElement('div');
    div.style.fontSize = '12px';
    div.style.marginBottom = '2px';
    div.innerHTML = `<span style="color:${color};font-weight:bold;">${playerName}:</span> ${message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Auto-hide after a delay
    setTimeout(() => {
      div.style.opacity = '0.5';
    }, 10000);
  }

  dispose(): void {
    this.notificationQueue = [];
  }
}
