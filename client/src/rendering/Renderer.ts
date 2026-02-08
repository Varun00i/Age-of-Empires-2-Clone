// ============================================================
// Empires Risen - Canvas 2D Renderer with Isometric Projection
// Handles all visual rendering: terrain, units, buildings, effects
// ============================================================

import { Game } from '../engine/Game';
import { TerrainType, TILE_SIZE, EntityId } from '@shared/types';

interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  minZoom: number;
  maxZoom: number;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Grass]: '#4a7c3f',
  [TerrainType.Dirt]: '#8b7355',
  [TerrainType.Sand]: '#c2b280',
  [TerrainType.Water]: '#2980b9',
  [TerrainType.DeepWater]: '#1a5276',
  [TerrainType.ShallowWater]: '#5dade2',
  [TerrainType.Forest]: '#2d5a1e',
  [TerrainType.Snow]: '#ddd',
  [TerrainType.Ice]: '#aee',
  [TerrainType.Farm]: '#8fbc54',
  [TerrainType.Road]: '#9a8c76',
  [TerrainType.Beach]: '#daa520',
};

const TERRAIN_COLORS_DARK: Record<TerrainType, string> = {
  [TerrainType.Grass]: '#3a6c2f',
  [TerrainType.Dirt]: '#7b6345',
  [TerrainType.Sand]: '#b2a270',
  [TerrainType.Water]: '#1970a9',
  [TerrainType.DeepWater]: '#0a4266',
  [TerrainType.ShallowWater]: '#4d9dd2',
  [TerrainType.Forest]: '#1d4a0e',
  [TerrainType.Snow]: '#ccc',
  [TerrainType.Ice]: '#9dd',
  [TerrainType.Farm]: '#7fac44',
  [TerrainType.Road]: '#8a7c66',
  [TerrainType.Beach]: '#ca9510',
};

export class Renderer {
  private game: Game;
  private ctx!: CanvasRenderingContext2D;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  public camera: Camera;
  private width: number = 0;
  private height: number = 0;

  // Sprite cache
  private unitSprites: Map<string, HTMLCanvasElement> = new Map();
  private buildingSprites: Map<string, HTMLCanvasElement> = new Map();

  // Animation
  private animTime: number = 0;

  // Isometric constants
  private readonly ISO_W = TILE_SIZE;
  private readonly ISO_H = TILE_SIZE / 2;

  constructor(game: Game) {
    this.game = game;
    this.camera = {
      x: 0, y: 0, zoom: 1,
      targetX: 0, targetY: 0, targetZoom: 1,
      minZoom: 0.3, maxZoom: 3.0,
    };
  }

  async init(): Promise<void> {
    const ctx = this.game.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = this.game.canvas.width;
    this.height = this.game.canvas.height;

    // Minimap
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (this.minimapCanvas) {
      this.minimapCanvas.width = 200;
      this.minimapCanvas.height = 160;
      this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    }

    // Generate procedural sprites
    this.generateSprites();
  }

  private generateSprites(): void {
    // Generate unit sprites procedurally
    this.unitSprites.set('villager', this.createUnitSprite('#e0c070', '#8b6914', 8, false));
    this.unitSprites.set('militia', this.createUnitSprite('#888', '#555', 10, true));
    this.unitSprites.set('manAtArms', this.createUnitSprite('#999', '#666', 10, true));
    this.unitSprites.set('longSwordsman', this.createUnitSprite('#aaa', '#777', 11, true));
    this.unitSprites.set('twoHandedSwordsman', this.createUnitSprite('#bbb', '#888', 12, true));
    this.unitSprites.set('champion', this.createUnitSprite('#ddd', '#999', 12, true));
    this.unitSprites.set('spearman', this.createUnitSprite('#a88850', '#705020', 12, true));
    this.unitSprites.set('pikeman', this.createUnitSprite('#b09860', '#806030', 14, true));
    this.unitSprites.set('halberdier', this.createUnitSprite('#c0a870', '#907040', 14, true));
    this.unitSprites.set('archer', this.createUnitSprite('#70a040', '#406020', 9, false));
    this.unitSprites.set('crossbowman', this.createUnitSprite('#80b050', '#507030', 10, false));
    this.unitSprites.set('arbalester', this.createUnitSprite('#90c060', '#608040', 10, false));
    this.unitSprites.set('skirmisher', this.createUnitSprite('#609050', '#306030', 9, false));
    this.unitSprites.set('cavalryArcher', this.createUnitSprite('#60a050', '#306030', 14, false));
    this.unitSprites.set('handCannoneer', this.createUnitSprite('#808080', '#404040', 10, false));
    this.unitSprites.set('scoutCavalry', this.createUnitSprite('#c8a060', '#8a6020', 14, false));
    this.unitSprites.set('lightCavalry', this.createUnitSprite('#d8b070', '#9a7030', 14, false));
    this.unitSprites.set('hussar', this.createUnitSprite('#e8c080', '#aa8040', 14, false));
    this.unitSprites.set('knight', this.createUnitSprite('#b0b0c0', '#707080', 16, true));
    this.unitSprites.set('cavalier', this.createUnitSprite('#c0c0d0', '#808090', 16, true));
    this.unitSprites.set('paladin', this.createUnitSprite('#d0d0e0', '#9090a0', 18, true));
    this.unitSprites.set('camelRider', this.createUnitSprite('#d4a860', '#947020', 15, false));
    this.unitSprites.set('battleElephant', this.createUnitSprite('#808070', '#505040', 22, true));
    this.unitSprites.set('monk', this.createUnitSprite('#e0b830', '#a07810', 9, false));
    this.unitSprites.set('trebuchet', this.createUnitSprite('#705840', '#403020', 20, true));
    this.unitSprites.set('batteringRam', this.createUnitSprite('#6b5030', '#3b2010', 18, true));
    this.unitSprites.set('mangonel', this.createUnitSprite('#7b6040', '#4b3020', 16, true));
    this.unitSprites.set('scorpion', this.createUnitSprite('#6b5535', '#3b2515', 14, true));
    this.unitSprites.set('bombardCannon', this.createUnitSprite('#606060', '#303030', 16, true));
    this.unitSprites.set('galley', this.createUnitSprite('#8b7355', '#5b4325', 20, false));
    this.unitSprites.set('kingUnit', this.createUnitSprite('#ffd700', '#b8860b', 10, false));

    // Generate building sprites
    this.buildingSprites.set('townCenter', this.createBuildingSprite('#8b7355', '#5b4325', 4));
    this.buildingSprites.set('house', this.createBuildingSprite('#a08060', '#705030', 2));
    this.buildingSprites.set('mill', this.createBuildingSprite('#9b8565', '#6b5535', 2));
    this.buildingSprites.set('lumberCamp', this.createBuildingSprite('#6b8040', '#3b5010', 2));
    this.buildingSprites.set('miningCamp', this.createBuildingSprite('#8b8070', '#5b5040', 2));
    this.buildingSprites.set('farm', this.createFarmSprite());
    this.buildingSprites.set('barracks', this.createBuildingSprite('#7b6355', '#4b3325', 3));
    this.buildingSprites.set('archeryRange', this.createBuildingSprite('#6b7345', '#3b4315', 3));
    this.buildingSprites.set('stable', this.createBuildingSprite('#8b7345', '#5b4315', 3));
    this.buildingSprites.set('siegeWorkshop', this.createBuildingSprite('#6b5535', '#3b2505', 3));
    this.buildingSprites.set('dock', this.createBuildingSprite('#5b6355', '#2b3325', 3));
    this.buildingSprites.set('blacksmith', this.createBuildingSprite('#5b5555', '#2b2525', 3));
    this.buildingSprites.set('market', this.createBuildingSprite('#8b6b35', '#5b3b05', 3));
    this.buildingSprites.set('monastery', this.createBuildingSprite('#9b8545', '#6b5515', 3));
    this.buildingSprites.set('university', this.createBuildingSprite('#6b6585', '#3b3555', 3));
    this.buildingSprites.set('castle', this.createBuildingSprite('#707070', '#404040', 4));
    this.buildingSprites.set('watchTower', this.createBuildingSprite('#808080', '#505050', 1));
    this.buildingSprites.set('guardTower', this.createBuildingSprite('#909090', '#606060', 1));
    this.buildingSprites.set('keep', this.createBuildingSprite('#a0a0a0', '#707070', 1));
    this.buildingSprites.set('palisadeWall', this.createBuildingSprite('#8b7355', '#5b4325', 1));
    this.buildingSprites.set('stoneWall', this.createBuildingSprite('#999', '#666', 1));
    this.buildingSprites.set('outpost', this.createBuildingSprite('#8b7b55', '#5b4b25', 1));
    this.buildingSprites.set('wonder', this.createBuildingSprite('#d4a944', '#947010', 5));
  }

  private createUnitSprite(bodyColor: string, outlineColor: string, size: number, hasShield: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size * 3;
    canvas.height = size * 3;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shield indicator
    if (hasShield) {
      ctx.fillStyle = outlineColor;
      ctx.fillRect(cx - size / 3, cy - size / 4, size / 4, size / 2);
    }

    return canvas;
  }

  private createBuildingSprite(wallColor: string, roofColor: string, tileSize: number): HTMLCanvasElement {
    const pixSize = tileSize * TILE_SIZE * 0.4;
    const canvas = document.createElement('canvas');
    canvas.width = pixSize + 20;
    canvas.height = pixSize + 20;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Building body (isometric box)
    const w = pixSize * 0.8;
    const h = pixSize * 0.6;

    // Base
    ctx.fillStyle = wallColor;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 3, cy - h / 2);
    ctx.lineTo(cx, cy - h / 2 - h * 0.3);
    ctx.lineTo(cx + w / 2 + 3, cy - h / 2);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#00000040';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

    return canvas;
  }

  private createFarmSprite(): HTMLCanvasElement {
    const size = TILE_SIZE * 2 * 0.4;
    const canvas = document.createElement('canvas');
    canvas.width = size + 10;
    canvas.height = size + 10;
    const ctx = canvas.getContext('2d')!;

    // Farm field pattern
    ctx.fillStyle = '#7fac44';
    ctx.fillRect(5, 5, size, size);

    ctx.strokeStyle = '#6f9c34';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(5 + i, 5);
      ctx.lineTo(5 + i, 5 + size);
      ctx.stroke();
    }

    return canvas;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(alpha: number): void {
    if (!this.game.state) return;

    this.animTime += 16;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Smooth camera interpolation
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.15;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.15;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.15;

    this.ctx.save();

    // Apply camera transform
    this.ctx.translate(this.width / 2, this.height / 4);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Render terrain
    this.renderTerrain();

    // Render resources on map
    this.renderMapResources();

    // Render buildings
    this.renderBuildings();

    // Render units
    this.renderUnits(alpha);

    // Render projectiles / effects
    this.renderEffects();

    // Render selection indicators
    this.renderSelectionIndicators();

    this.ctx.restore();

    // Render minimap
    this.renderMinimap();

    // Render debug info
    this.renderDebugInfo();
  }

  private renderTerrain(): void {
    const map = this.game.state.map;
    if (!map) return;

    // Calculate visible tile range
    const { startX, startY, endX, endY } = this.getVisibleTileRange();

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;

        const tile = map.tiles[y]?.[x];
        if (!tile) continue;

        // Fog of war check
        const fogState = this.game.fogOfWar.getTileVisibility(x, y, this.game.localPlayerId);
        if (fogState === 0) continue; // Completely hidden

        // Isometric position
        const screenX = (x - y) * (this.ISO_W / 2);
        const screenY = (x + y) * (this.ISO_H / 2);

        // Draw tile
        const baseColor = (x + y) % 2 === 0 ?
          TERRAIN_COLORS[tile.terrain] : TERRAIN_COLORS_DARK[tile.terrain];

        this.ctx.fillStyle = baseColor;
        this.drawIsoTile(screenX, screenY);

        // Elevation shading
        if (tile.elevation > 0) {
          this.ctx.fillStyle = `rgba(255,255,255,${tile.elevation * 0.05})`;
          this.drawIsoTile(screenX, screenY);
        }

        // Fog overlay for explored but not visible tiles
        if (fogState === 1) {
          this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
          this.drawIsoTile(screenX, screenY);
        }
      }
    }
  }

  private drawIsoTile(x: number, y: number): void {
    const w = this.ISO_W / 2;
    const h = this.ISO_H / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - h);
    this.ctx.lineTo(x + w, y);
    this.ctx.lineTo(x, y + h);
    this.ctx.lineTo(x - w, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderMapResources(): void {
    const map = this.game.state.map;
    if (!map) return;

    const { startX, startY, endX, endY } = this.getVisibleTileRange();

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= map.width || y < 0 || y >= map.height) continue;

        const tile = map.tiles[y]?.[x];
        if (!tile || !tile.resourceType || !tile.resourceAmount) continue;

        const fogState = this.game.fogOfWar.getTileVisibility(x, y, this.game.localPlayerId);
        if (fogState === 0) continue;

        const screenX = (x - y) * (this.ISO_W / 2);
        const screenY = (x + y) * (this.ISO_H / 2);

        // Draw resource indicator
        let color = '#888';
        switch (tile.terrain) {
          case TerrainType.Forest:
            // Draw tree
            this.ctx.fillStyle = '#1a4a0e';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY - 10, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#3a2a10';
            this.ctx.fillRect(screenX - 1, screenY - 4, 2, 8);
            break;
          default:
            // Gold / stone patches
            color = tile.resourceType === 'gold' ? '#f4d03f' : '#95a5a6';
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY - 3, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = color + '80';
            this.ctx.beginPath();
            this.ctx.arc(screenX + 4, screenY - 1, 3, 0, Math.PI * 2);
            this.ctx.fill();
            break;
        }
      }
    }
  }

  private renderBuildings(): void {
    const entities = this.game.entityManager.getAllBuildings();

    for (const entity of entities) {
      const pos = this.game.entityManager.getPosition(entity.id);
      const stats = this.game.entityManager.getBuildingData(entity.id);
      if (!pos || !stats) continue;

      const fogState = this.game.fogOfWar.getTileVisibility(
        Math.floor(pos.x), Math.floor(pos.y), this.game.localPlayerId
      );
      if (fogState === 0) continue;

      const screenX = (pos.x - pos.y) * (this.ISO_W / 2);
      const screenY = (pos.x + pos.y) * (this.ISO_H / 2);

      // Player color tint
      const playerColor = this.getPlayerColorHex(entity.owner);

      // Draw building sprite
      const sprite = this.buildingSprites.get(stats.id);
      if (sprite) {
        this.ctx.save();
        this.ctx.globalAlpha = fogState === 1 ? 0.6 : 1.0;
        this.ctx.drawImage(sprite, screenX - sprite.width / 2, screenY - sprite.height / 2);

        // Color overlay
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.fillStyle = playerColor + '40';
        this.ctx.fillRect(screenX - sprite.width / 2, screenY - sprite.height / 2, sprite.width, sprite.height);
        this.ctx.restore();
      } else {
        // Fallback rectangle
        const size = (stats.size?.x ?? 2) * 12;
        this.ctx.fillStyle = playerColor;
        this.ctx.globalAlpha = fogState === 1 ? 0.6 : 1.0;
        this.ctx.fillRect(screenX - size / 2, screenY - size, size, size);
        this.ctx.globalAlpha = 1;
      }

      // Construction progress bar
      const buildProgress = this.game.entityManager.getBuildProgress(entity.id);
      if (buildProgress !== undefined && buildProgress < 1) {
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(screenX - 15, screenY + 8, 30, 4);
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillRect(screenX - 15, screenY + 8, 30 * buildProgress, 4);
      }

      // HP bar for damaged buildings
      const hp = this.game.entityManager.getHP(entity.id);
      const maxHP = this.game.entityManager.getMaxHP(entity.id);
      if (hp !== undefined && maxHP !== undefined && hp < maxHP) {
        const barWidth = 30;
        const hpRatio = hp / maxHP;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(screenX - barWidth / 2, screenY - 20, barWidth, 3);
        this.ctx.fillStyle = hpRatio > 0.6 ? '#27ae60' : hpRatio > 0.3 ? '#f39c12' : '#e74c3c';
        this.ctx.fillRect(screenX - barWidth / 2, screenY - 20, barWidth * hpRatio, 3);
      }
    }
  }

  private renderUnits(alpha: number): void {
    const entities = this.game.entityManager.getAllUnits();

    // Sort by Y position for correct draw order
    entities.sort((a, b) => {
      const posA = this.game.entityManager.getPosition(a.id);
      const posB = this.game.entityManager.getPosition(b.id);
      return ((posA?.y ?? 0) - (posB?.y ?? 0));
    });

    for (const entity of entities) {
      const pos = this.game.entityManager.getPosition(entity.id);
      const unitData = this.game.entityManager.getUnitData(entity.id);
      if (!pos || !unitData) continue;

      const fogState = this.game.fogOfWar.getTileVisibility(
        Math.floor(pos.x), Math.floor(pos.y), this.game.localPlayerId
      );
      if (fogState === 0) continue;
      if (fogState === 1 && entity.owner !== this.game.localPlayerId) continue;

      const screenX = (pos.x - pos.y) * (this.ISO_W / 2);
      const screenY = (pos.x + pos.y) * (this.ISO_H / 2);
      const playerColor = this.getPlayerColorHex(entity.owner);

      // Draw shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this.ctx.beginPath();
      this.ctx.ellipse(screenX, screenY + 2, 6, 3, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw unit sprite
      const sprite = this.unitSprites.get(unitData.id);
      if (sprite) {
        this.ctx.drawImage(sprite, screenX - sprite.width / 2, screenY - sprite.height / 2 - 4);
      } else {
        // Fallback circle
        this.ctx.fillStyle = playerColor;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 4, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Player color indicator dot
      this.ctx.fillStyle = playerColor;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY - 14, 2, 0, Math.PI * 2);
      this.ctx.fill();

      // HP bar
      const hp = this.game.entityManager.getHP(entity.id);
      const maxHP = this.game.entityManager.getMaxHP(entity.id);
      if (hp !== undefined && maxHP !== undefined && hp < maxHP) {
        const barWidth = 20;
        const hpRatio = hp / maxHP;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(screenX - barWidth / 2, screenY - 18, barWidth, 2);
        this.ctx.fillStyle = hpRatio > 0.6 ? '#27ae60' : hpRatio > 0.3 ? '#f39c12' : '#e74c3c';
        this.ctx.fillRect(screenX - barWidth / 2, screenY - 18, barWidth * hpRatio, 2);
      }

      // Selection ring
      if (this.game.selectedEntities.includes(entity.id)) {
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.ellipse(screenX, screenY + 1, 8, 4, 0, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Gathering animation
      const state = this.game.entityManager.getUnitState(entity.id);
      if (state === 'gathering') {
        const pulse = Math.sin(this.animTime * 0.005) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(255, 255, 0, ${pulse * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 4, 8, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Attack animation
      if (state === 'attacking') {
        const flash = Math.sin(this.animTime * 0.01) > 0;
        if (flash) {
          this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          this.ctx.beginPath();
          this.ctx.arc(screenX, screenY - 4, 10, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  private renderEffects(): void {
    // Render active projectiles
    const projectiles = this.game.combatSystem.getProjectiles();
    for (const proj of projectiles) {
      const screenX = (proj.x - proj.y) * (this.ISO_W / 2);
      const screenY = (proj.x + proj.y) * (this.ISO_H / 2);

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY - 8, 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Trail
      this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, screenY - 8);
      const dx = Math.cos(proj.angle) * 8;
      const dy = Math.sin(proj.angle) * 4;
      this.ctx.lineTo(screenX - dx, screenY - 8 - dy);
      this.ctx.stroke();
    }
  }

  private renderSelectionIndicators(): void {
    // Render move/attack indicators
    const indicators = this.game.input?.getIndicators() ?? [];
    for (const ind of indicators) {
      const screenX = (ind.x - ind.y) * (this.ISO_W / 2);
      const screenY = (ind.x + ind.y) * (this.ISO_H / 2);

      const fade = 1 - (ind.age / ind.maxAge);
      const size = 8 + (1 - fade) * 8;

      this.ctx.strokeStyle = ind.type === 'move' ?
        `rgba(0, 255, 0, ${fade})` : `rgba(255, 0, 0, ${fade})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private renderMinimap(): void {
    if (!this.minimapCtx || !this.game.state?.map) return;

    const map = this.game.state.map;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const scaleX = mw / map.width;
    const scaleY = mh / map.height;

    this.minimapCtx.fillStyle = '#111';
    this.minimapCtx.fillRect(0, 0, mw, mh);

    // Draw terrain
    for (let y = 0; y < map.height; y += 2) {
      for (let x = 0; x < map.width; x += 2) {
        const tile = map.tiles[y]?.[x];
        if (!tile) continue;

        const fogState = this.game.fogOfWar.getTileVisibility(x, y, this.game.localPlayerId);
        if (fogState === 0) continue;

        this.minimapCtx.fillStyle = fogState === 1 ?
          this.darkenColor(TERRAIN_COLORS[tile.terrain], 0.5) :
          TERRAIN_COLORS[tile.terrain];
        this.minimapCtx.fillRect(x * scaleX, y * scaleY, scaleX * 2 + 1, scaleY * 2 + 1);
      }
    }

    // Draw entities
    for (const entity of this.game.entityManager.getAllEntities()) {
      const pos = this.game.entityManager.getPosition(entity.id);
      if (!pos) continue;

      const fogState = this.game.fogOfWar.getTileVisibility(
        Math.floor(pos.x), Math.floor(pos.y), this.game.localPlayerId
      );
      if (fogState === 0) continue;

      const color = this.getPlayerColorHex(entity.owner);
      this.minimapCtx.fillStyle = color;

      const isBuilding = this.game.entityManager.isBuilding(entity.id);
      const size = isBuilding ? 3 : 2;
      this.minimapCtx.fillRect(
        pos.x * scaleX - size / 2,
        pos.y * scaleY - size / 2,
        size, size
      );
    }

    // Draw camera viewport
    const camWorld = this.getCameraWorldBounds();
    this.minimapCtx.strokeStyle = '#fff';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.strokeRect(
      camWorld.x * scaleX,
      camWorld.y * scaleY,
      camWorld.w * scaleX,
      camWorld.h * scaleY
    );
  }

  private renderDebugInfo(): void {
    this.ctx.save();
    this.ctx.fillStyle = '#0f0';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`FPS: ${this.game.fps}`, 10, this.height - 10);
    this.ctx.fillText(`Entities: ${this.game.entityManager.getEntityCount()}`, 100, this.height - 10);
    this.ctx.fillText(`Tick: ${this.game.state?.tick ?? 0}`, 220, this.height - 10);
    this.ctx.restore();
  }

  // ---- Helper Methods ----

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    // Reverse camera transform
    const cx = (screenX - this.width / 2) / this.camera.zoom + this.camera.x;
    const cy = (screenY - this.height / 4) / this.camera.zoom + this.camera.y;

    // Reverse isometric transform
    const tileX = (cx / (this.ISO_W / 2) + cy / (this.ISO_H / 2)) / 2;
    const tileY = (cy / (this.ISO_H / 2) - cx / (this.ISO_W / 2)) / 2;

    return { x: tileX, y: tileY };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const isoX = (worldX - worldY) * (this.ISO_W / 2);
    const isoY = (worldX + worldY) * (this.ISO_H / 2);
    const screenX = (isoX - this.camera.x) * this.camera.zoom + this.width / 2;
    const screenY = (isoY - this.camera.y) * this.camera.zoom + this.height / 4;
    return { x: screenX, y: screenY };
  }

  private getVisibleTileRange(): { startX: number; startY: number; endX: number; endY: number } {
    const margin = 5;
    const topLeft = this.screenToWorld(0, 0);
    const topRight = this.screenToWorld(this.width, 0);
    const bottomLeft = this.screenToWorld(0, this.height);
    const bottomRight = this.screenToWorld(this.width, this.height);

    const minX = Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) - margin;
    const maxX = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) + margin;
    const minY = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) - margin;
    const maxY = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) + margin;

    return { startX: minX, startY: minY, endX: maxX, endY: maxY };
  }

  private getCameraWorldBounds(): { x: number; y: number; w: number; h: number } {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.width, this.height);
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
  }

  private getPlayerColorHex(playerId: number): string {
    const color = this.game.state?.players.get(playerId)?.color ?? 0x808080;
    return '#' + color.toString(16).padStart(6, '0');
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }

  moveCamera(dx: number, dy: number): void {
    this.camera.targetX += dx / this.camera.zoom;
    this.camera.targetY += dy / this.camera.zoom;
  }

  zoomCamera(delta: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.camera.targetZoom;
    this.camera.targetZoom = Math.max(
      this.camera.minZoom,
      Math.min(this.camera.maxZoom, this.camera.targetZoom * (1 + delta))
    );

    // Zoom towards mouse position
    if (centerX !== undefined && centerY !== undefined) {
      const worldBefore = this.screenToWorld(centerX, centerY);
      const zoomRatio = this.camera.targetZoom / oldZoom;
      this.camera.targetX += (worldBefore.x - this.camera.targetX) * (1 - 1 / zoomRatio) * 0.3;
      this.camera.targetY += (worldBefore.y - this.camera.targetY) * (1 - 1 / zoomRatio) * 0.3;
    }
  }

  centerOnPosition(worldX: number, worldY: number): void {
    const isoX = (worldX - worldY) * (this.ISO_W / 2);
    const isoY = (worldX + worldY) * (this.ISO_H / 2);
    this.camera.targetX = isoX;
    this.camera.targetY = isoY;
  }

  dispose(): void {
    this.unitSprites.clear();
    this.buildingSprites.clear();
  }
}
