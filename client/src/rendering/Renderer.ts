// ============================================================
// Empires Risen - Canvas 2D Renderer with Isometric Projection
// Handles all visual rendering: terrain, units, buildings, effects
// ============================================================

import { Game } from '../engine/Game';
import { TerrainType, TILE_SIZE, EntityId } from '@shared/types';
import { BUILDINGS } from '@shared/data/buildings';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'blood' | 'spark' | 'dust' | 'smoke' | 'gold' | 'wood' | 'food';
}

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
  [TerrainType.Snow]: '#dddddd',
  [TerrainType.Ice]: '#aaeeee',
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
  [TerrainType.Snow]: '#cccccc',
  [TerrainType.Ice]: '#99dddd',
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

  // Particle system
  private particles: Particle[] = [];

  // Building placement preview
  public buildPreview: { type: string; x: number; y: number; valid: boolean } | null = null;

  // Day/night cycle
  private dayNightTime: number = 0;

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
    // Generate humanoid unit sprites
    this.unitSprites.set('villager', this.createCharSprite('#e0c070', '#8b6914', 'villager'));
    this.unitSprites.set('militia', this.createCharSprite('#888888', '#555555', 'infantry'));
    this.unitSprites.set('manAtArms', this.createCharSprite('#999999', '#666666', 'infantry'));
    this.unitSprites.set('longSwordsman', this.createCharSprite('#aaaaaa', '#777777', 'infantry'));
    this.unitSprites.set('twoHandedSwordsman', this.createCharSprite('#bbbbbb', '#888888', 'swordsman'));
    this.unitSprites.set('champion', this.createCharSprite('#dddddd', '#999999', 'swordsman'));
    this.unitSprites.set('spearman', this.createCharSprite('#a88850', '#705020', 'pikeman'));
    this.unitSprites.set('pikeman', this.createCharSprite('#b09860', '#806030', 'pikeman'));
    this.unitSprites.set('halberdier', this.createCharSprite('#c0a870', '#907040', 'pikeman'));
    this.unitSprites.set('archer', this.createCharSprite('#70a040', '#406020', 'archer'));
    this.unitSprites.set('crossbowman', this.createCharSprite('#80b050', '#507030', 'archer'));
    this.unitSprites.set('arbalester', this.createCharSprite('#90c060', '#608040', 'archer'));
    this.unitSprites.set('skirmisher', this.createCharSprite('#609050', '#306030', 'archer'));
    this.unitSprites.set('cavalryArcher', this.createCharSprite('#60a050', '#306030', 'cavalryArcher'));
    this.unitSprites.set('handCannoneer', this.createCharSprite('#808080', '#404040', 'gunner'));
    this.unitSprites.set('scoutCavalry', this.createCharSprite('#c8a060', '#8a6020', 'cavalry'));
    this.unitSprites.set('lightCavalry', this.createCharSprite('#d8b070', '#9a7030', 'cavalry'));
    this.unitSprites.set('hussar', this.createCharSprite('#e8c080', '#aa8040', 'cavalry'));
    this.unitSprites.set('knight', this.createCharSprite('#b0b0c0', '#707080', 'heavyCavalry'));
    this.unitSprites.set('cavalier', this.createCharSprite('#c0c0d0', '#808090', 'heavyCavalry'));
    this.unitSprites.set('paladin', this.createCharSprite('#d0d0e0', '#9090a0', 'heavyCavalry'));
    this.unitSprites.set('camelRider', this.createCharSprite('#d4a860', '#947020', 'cavalry'));
    this.unitSprites.set('battleElephant', this.createCharSprite('#808070', '#505040', 'elephant'));
    this.unitSprites.set('monk', this.createCharSprite('#e0b830', '#a07810', 'monk'));
    this.unitSprites.set('trebuchet', this.createCharSprite('#705840', '#403020', 'siege'));
    this.unitSprites.set('batteringRam', this.createCharSprite('#6b5030', '#3b2010', 'ram'));
    this.unitSprites.set('mangonel', this.createCharSprite('#7b6040', '#4b3020', 'siege'));
    this.unitSprites.set('scorpion', this.createCharSprite('#6b5535', '#3b2515', 'siege'));
    this.unitSprites.set('bombardCannon', this.createCharSprite('#606060', '#303030', 'siege'));
    this.unitSprites.set('galley', this.createCharSprite('#8b7355', '#5b4325', 'ship'));
    this.unitSprites.set('kingUnit', this.createCharSprite('#ffd700', '#b8860b', 'king'));

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
    this.buildingSprites.set('stoneWall', this.createBuildingSprite('#999999', '#666666', 1));
    this.buildingSprites.set('outpost', this.createBuildingSprite('#8b7b55', '#5b4b25', 1));
    this.buildingSprites.set('wonder', this.createBuildingSprite('#d4a944', '#947010', 5));
  }

  // ----------------------------------------------------------------
  // Humanoid character sprite generation
  // ----------------------------------------------------------------

  private createCharSprite(
    bodyColor: string,
    outlineColor: string,
    unitClass: string,
  ): HTMLCanvasElement {
    const S = 48; // canvas size — all units rendered at 48×48
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;

    const cx = S / 2;
    const ground = S * 0.88; // ground Y

    // Shadow ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    const shadowW = unitClass.includes('cavalry') || unitClass.includes('Cavalry') || unitClass === 'heavyCavalry' || unitClass === 'elephant' ? 14 : unitClass === 'siege' || unitClass === 'ram' ? 12 : 8;
    ctx.ellipse(cx, ground, shadowW, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (unitClass) {
      case 'villager': this.drawVillager(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'infantry': this.drawInfantry(ctx, cx, ground, bodyColor, outlineColor, true, false); break;
      case 'swordsman': this.drawInfantry(ctx, cx, ground, bodyColor, outlineColor, true, true); break;
      case 'pikeman': this.drawPikeman(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'archer': this.drawArcher(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'gunner': this.drawGunner(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'cavalry': this.drawCavalry(ctx, cx, ground, bodyColor, outlineColor, false); break;
      case 'heavyCavalry': this.drawCavalry(ctx, cx, ground, bodyColor, outlineColor, true); break;
      case 'cavalryArcher': this.drawCavalryArcher(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'elephant': this.drawElephant(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'monk': this.drawMonk(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'siege': this.drawSiege(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'ram': this.drawRam(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'ship': this.drawShip(ctx, cx, ground, bodyColor, outlineColor); break;
      case 'king': this.drawKing(ctx, cx, ground, bodyColor, outlineColor); break;
      default: this.drawInfantry(ctx, cx, ground, bodyColor, outlineColor, false, false); break;
    }

    return canvas;
  }

  /* ---- Individual unit class drawers ---- */

  private drawHumanHead(ctx: CanvasRenderingContext2D, cx: number, headY: number, headR: number, skinColor: string, outlineColor: string) {
    const hg = ctx.createRadialGradient(cx - headR * 0.2, headY - headR * 0.2, 0, cx, headY, headR);
    hg.addColorStop(0, this.lightenHex(skinColor, 40));
    hg.addColorStop(1, skinColor);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  private drawHelmet(ctx: CanvasRenderingContext2D, cx: number, headY: number, headR: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, headY, headR + 0.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 0.5, headY - 1, 1, headR * 0.8);
  }

  private drawVillager(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 20;
    const headY = bodyTop - 4;
    const headR = 3.5;

    // Legs
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 4); ctx.lineTo(cx - 3, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 4); ctx.lineTo(cx + 3, ground - 1); ctx.stroke();
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(cx - 4.5, ground - 2, 3, 2);
    ctx.fillRect(cx + 1.5, ground - 2, 3, 2);

    // Body / tunic
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 4);
    bg.addColorStop(0, this.lightenHex(bodyColor, 20));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 2);
    ctx.lineTo(cx - 6, ground - 5);
    ctx.lineTo(cx + 6, ground - 5);
    ctx.lineTo(cx + 5, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Arms
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 5, bodyTop + 4); ctx.lineTo(cx - 8, ground - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 5, bodyTop + 4); ctx.lineTo(cx + 7, ground - 14); ctx.stroke();

    // Tool (hammer/pick)
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 7, ground - 14); ctx.lineTo(cx + 10, ground - 22); ctx.stroke();
    ctx.fillStyle = '#888888';
    ctx.fillRect(cx + 8, ground - 24, 4, 3);

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    // Straw hat
    ctx.fillStyle = '#c8a848';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 2, 5.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 3, headY - 5, 6, 3);
  }

  private drawInfantry(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string, hasShield: boolean, twoHanded: boolean) {
    const bodyTop = ground - 20;
    const headY = bodyTop - 4;
    const headR = 3.5;

    // Legs with greaves
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 5); ctx.lineTo(cx - 3.5, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 5); ctx.lineTo(cx + 3.5, ground - 1); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 5, ground - 2, 3.5, 2);
    ctx.fillRect(cx + 1.5, ground - 2, 3.5, 2);

    // Body armor
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 5);
    bg.addColorStop(0, this.lightenHex(bodyColor, 30));
    bg.addColorStop(0.5, bodyColor);
    bg.addColorStop(1, outlineColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 6, bodyTop + 2);
    ctx.lineTo(cx - 5, ground - 5);
    ctx.lineTo(cx + 5, ground - 5);
    ctx.lineTo(cx + 6, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Belt
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(cx - 5, ground - 9, 10, 2);

    // Shield arm
    if (hasShield) {
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 6, bodyTop + 4); ctx.lineTo(cx - 9, ground - 12); ctx.stroke();
      const sg = ctx.createLinearGradient(cx - 14, ground - 17, cx - 7, ground - 7);
      sg.addColorStop(0, this.lightenHex(outlineColor, 30));
      sg.addColorStop(1, outlineColor);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(cx - 10, ground - 12, 4, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.lightenHex(outlineColor, 50);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.arc(cx - 10, ground - 12, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 6, bodyTop + 4); ctx.lineTo(cx - 8, ground - 10); ctx.stroke();
    }

    // Sword arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 6, bodyTop + 4); ctx.lineTo(cx + 8, ground - 14); ctx.stroke();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = twoHanded ? 2 : 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 8, ground - 14); ctx.lineTo(cx + 10, ground - 26); ctx.stroke();
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 6, ground - 14); ctx.lineTo(cx + 10, ground - 14); ctx.stroke();

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    this.drawHelmet(ctx, cx, headY, headR, bodyColor);
  }

  private drawPikeman(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 20;
    const headY = bodyTop - 4;
    const headR = 3.5;

    // Legs
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 5); ctx.lineTo(cx - 3.5, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 5); ctx.lineTo(cx + 3.5, ground - 1); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 5, ground - 2, 3.5, 2);
    ctx.fillRect(cx + 1.5, ground - 2, 3.5, 2);

    // Body
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 5);
    bg.addColorStop(0, this.lightenHex(bodyColor, 20));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 2);
    ctx.lineTo(cx - 5, ground - 5);
    ctx.lineTo(cx + 5, ground - 5);
    ctx.lineTo(cx + 5, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Shield arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 5, bodyTop + 4); ctx.lineTo(cx - 8, ground - 12); ctx.stroke();
    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.arc(cx - 9, ground - 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Spear arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 5, bodyTop + 4); ctx.lineTo(cx + 4, ground - 13); ctx.stroke();
    ctx.strokeStyle = '#6b5030';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 4, ground - 3); ctx.lineTo(cx + 2, ground - 38); ctx.stroke();
    ctx.fillStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(cx + 2, ground - 38);
    ctx.lineTo(cx + 0.5, ground - 42);
    ctx.lineTo(cx + 3.5, ground - 42);
    ctx.closePath();
    ctx.fill();

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 1.5, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 3, headY - 5, 6, 4);
  }

  private drawArcher(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 19;
    const headY = bodyTop - 4;
    const headR = 3.2;

    // Legs
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 5); ctx.lineTo(cx - 4, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 5); ctx.lineTo(cx + 1, ground - 1); ctx.stroke();
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(cx - 5.5, ground - 2, 3, 2);
    ctx.fillRect(cx - 0.5, ground - 2, 3, 2);

    // Body (leather)
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 5);
    bg.addColorStop(0, this.lightenHex(bodyColor, 25));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 2);
    ctx.lineTo(cx - 4, ground - 5);
    ctx.lineTo(cx + 4, ground - 5);
    ctx.lineTo(cx + 5, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Quiver on back
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(cx + 5, bodyTop + 1, 3, 10);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(cx + 5.5, bodyTop - 1, 0.8, 2);
    ctx.fillRect(cx + 6.8, bodyTop - 1, 0.8, 2);

    // Bow arm (left)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 5, bodyTop + 4); ctx.lineTo(cx - 10, ground - 12); ctx.stroke();
    ctx.strokeStyle = '#6b4020';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 12, ground - 14, 10, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12 + Math.cos(-Math.PI * 0.7) * 10, ground - 14 + Math.sin(-Math.PI * 0.7) * 10);
    ctx.lineTo(cx - 12 + Math.cos(Math.PI * 0.7) * 10, ground - 14 + Math.sin(Math.PI * 0.7) * 10);
    ctx.stroke();

    // Draw arm (right)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 5, bodyTop + 4); ctx.lineTo(cx + 2, ground - 12); ctx.stroke();

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, headY - 1, headR + 0.5, Math.PI * 1.15, Math.PI * -0.15);
    ctx.lineTo(cx + 1, headY + 2);
    ctx.closePath();
    ctx.fill();
  }

  private drawGunner(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 19;
    const headY = bodyTop - 4;
    const headR = 3.2;

    // Legs
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 5); ctx.lineTo(cx - 3.5, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 5); ctx.lineTo(cx + 3.5, ground - 1); ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 5, ground - 2, 3.5, 2);
    ctx.fillRect(cx + 1.5, ground - 2, 3.5, 2);

    // Body
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 5);
    bg.addColorStop(0, this.lightenHex(bodyColor, 20));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 2);
    ctx.lineTo(cx - 5, ground - 5);
    ctx.lineTo(cx + 5, ground - 5);
    ctx.lineTo(cx + 5, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Arms holding gun
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 5, bodyTop + 4); ctx.lineTo(cx - 3, ground - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 5, bodyTop + 4); ctx.lineTo(cx + 3, ground - 12); ctx.stroke();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, ground - 12); ctx.lineTo(cx + 12, ground - 20); ctx.stroke();
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(cx + 12, ground - 20, 2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    this.drawHelmet(ctx, cx, headY, headR, bodyColor);
  }

  private drawCavalry(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string, heavy: boolean) {
    const horseBody = ground - 8;

    // Horse legs
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 8, horseBody + 2); ctx.lineTo(cx - 9, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4, horseBody + 2); ctx.lineTo(cx - 5, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 4, horseBody + 2); ctx.lineTo(cx + 5, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, horseBody + 2); ctx.lineTo(cx + 9, ground - 1); ctx.stroke();
    ctx.fillStyle = '#3a2a10';
    [-9, -5, 5, 9].forEach(dx => {
      ctx.fillRect(cx + dx - 1.5, ground - 2, 3, 2);
    });

    // Horse body
    const hg = ctx.createLinearGradient(cx, horseBody - 6, cx, horseBody + 4);
    hg.addColorStop(0, '#8b6530');
    hg.addColorStop(1, '#5a4020');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(cx, horseBody - 2, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3010';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Horse neck + head
    ctx.fillStyle = '#7b5520';
    ctx.beginPath();
    ctx.moveTo(cx + 10, horseBody - 5);
    ctx.quadraticCurveTo(cx + 16, horseBody - 14, cx + 18, horseBody - 12);
    ctx.lineTo(cx + 14, horseBody - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b4518';
    ctx.beginPath();
    ctx.ellipse(cx + 18, horseBody - 14, 3, 2.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(cx + 19, horseBody - 15, 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12, horseBody - 3);
    ctx.quadraticCurveTo(cx - 16, horseBody + 2, cx - 14, horseBody + 6);
    ctx.stroke();

    if (heavy) {
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, horseBody - 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rider body
    const riderTop = horseBody - 16;
    const riderBot = horseBody - 5;
    const bg = ctx.createLinearGradient(cx, riderTop, cx, riderBot);
    bg.addColorStop(0, this.lightenHex(bodyColor, 25));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - 4, riderTop + 2);
    ctx.lineTo(cx - 5, riderBot);
    ctx.lineTo(cx + 5, riderBot);
    ctx.lineTo(cx + 4, riderTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Rider arms
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(cx - 4, riderTop + 4); ctx.lineTo(cx + 4, horseBody - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 4, riderTop + 4); ctx.lineTo(cx + 8, horseBody - 10); ctx.stroke();

    if (heavy) {
      ctx.strokeStyle = '#6b5030';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + 8, horseBody); ctx.lineTo(cx + 6, riderTop - 20); ctx.stroke();
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.moveTo(cx + 6, riderTop - 20);
      ctx.lineTo(cx + 5, riderTop - 24);
      ctx.lineTo(cx + 7, riderTop - 24);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx + 8, horseBody - 10); ctx.lineTo(cx + 10, riderTop - 6); ctx.stroke();
    }

    // Rider head
    const headY = riderTop - 3;
    this.drawHumanHead(ctx, cx, headY, 3, '#d4a870', outlineColor);
    this.drawHelmet(ctx, cx, headY, 3, bodyColor);
  }

  private drawCavalryArcher(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const horseBody = ground - 7;

    // Horse legs
    ctx.strokeStyle = '#5a4020';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(cx - 7, horseBody + 2); ctx.lineTo(cx - 8, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 3, horseBody + 2); ctx.lineTo(cx - 4, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 3, horseBody + 2); ctx.lineTo(cx + 4, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 7, horseBody + 2); ctx.lineTo(cx + 8, ground - 1); ctx.stroke();

    // Horse body
    ctx.fillStyle = '#7b5520';
    ctx.beginPath();
    ctx.ellipse(cx, horseBody - 1, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horse neck + head
    ctx.fillStyle = '#6b4518';
    ctx.beginPath();
    ctx.moveTo(cx + 9, horseBody - 4);
    ctx.quadraticCurveTo(cx + 14, horseBody - 12, cx + 16, horseBody - 10);
    ctx.lineTo(cx + 12, horseBody - 2);
    ctx.closePath();
    ctx.fill();

    // Rider
    const riderTop = horseBody - 14;
    const bg = ctx.createLinearGradient(cx, riderTop, cx, horseBody - 4);
    bg.addColorStop(0, this.lightenHex(bodyColor, 20));
    bg.addColorStop(1, bodyColor);
    ctx.fillStyle = bg;
    ctx.fillRect(cx - 4, riderTop + 2, 8, 10);

    // Bow in left hand
    ctx.strokeStyle = '#6b4020';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 10, horseBody - 10, 8, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();

    // Rider head
    this.drawHumanHead(ctx, cx, riderTop - 2, 2.8, '#d4a870', outlineColor);
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, riderTop - 3, 3, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }

  private drawElephant(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const eBody = ground - 10;

    // Elephant legs
    ctx.fillStyle = '#606055';
    [-9, -3, 3, 9].forEach(dx => {
      ctx.fillRect(cx + dx - 2.5, eBody + 2, 5, ground - eBody - 3);
    });

    // Elephant body
    const eg = ctx.createRadialGradient(cx, eBody - 4, 2, cx, eBody - 2, 14);
    eg.addColorStop(0, '#909085');
    eg.addColorStop(1, '#606055');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(cx, eBody - 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elephant head
    ctx.fillStyle = '#707065';
    ctx.beginPath();
    ctx.ellipse(cx + 12, eBody - 8, 5, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#606055';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 16, eBody - 6);
    ctx.quadraticCurveTo(cx + 20, eBody + 2, cx + 17, eBody + 5);
    ctx.stroke();
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 14, eBody - 5);
    ctx.lineTo(cx + 18, eBody - 10);
    ctx.stroke();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx + 14, eBody - 9, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555550';
    ctx.beginPath();
    ctx.ellipse(cx + 9, eBody - 6, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Howdah
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(cx - 6, eBody - 14, 12, 6);
    ctx.strokeStyle = '#6b3503';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - 6, eBody - 14, 12, 6);

    // Rider
    const rTop = eBody - 20;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(cx - 3, rTop + 2, 6, 6);
    this.drawHumanHead(ctx, cx, rTop, 2.5, '#d4a870', outlineColor);
  }

  private drawMonk(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 22;
    const headY = bodyTop - 3.5;
    const headR = 3.5;

    // Robe
    const rg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 1);
    rg.addColorStop(0, this.lightenHex(bodyColor, 20));
    rg.addColorStop(1, bodyColor);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 2);
    ctx.lineTo(cx - 7, ground - 1);
    ctx.lineTo(cx + 7, ground - 1);
    ctx.lineTo(cx + 5, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Sash
    ctx.fillStyle = outlineColor;
    ctx.fillRect(cx - 5, ground - 11, 10, 1.5);

    // Staff arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 5, bodyTop + 4); ctx.lineTo(cx + 4, ground - 13); ctx.stroke();
    ctx.strokeStyle = '#6b4020';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 4, ground - 2); ctx.lineTo(cx + 3, ground - 30); ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx + 1.5, ground - 33, 3, 5);
    ctx.fillRect(cx, ground - 31, 6, 2);

    // Head (tonsure)
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    ctx.fillStyle = '#6b4020';
    ctx.beginPath();
    ctx.arc(cx, headY, headR, Math.PI * 0.6, Math.PI * 0.1, true);
    ctx.closePath();
    ctx.fill();
  }

  private drawSiege(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const baseY = ground - 3;

    // Wheels
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - 8, baseY, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 8, baseY, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 0.8;
    for (const dx of [-8, 8]) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(cx + dx, baseY);
        ctx.lineTo(cx + dx + Math.cos(a) * 3.5, baseY + Math.sin(a) * 3.5);
        ctx.stroke();
      }
    }

    // Frame
    const fg = ctx.createLinearGradient(cx, baseY - 10, cx, baseY);
    fg.addColorStop(0, this.lightenHex(bodyColor, 20));
    fg.addColorStop(1, bodyColor);
    ctx.fillStyle = fg;
    ctx.fillRect(cx - 10, baseY - 6, 20, 5);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - 10, baseY - 6, 20, 5);

    // Throwing arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 6);
    ctx.lineTo(cx - 5, baseY - 24);
    ctx.stroke();
    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.arc(cx - 5, baseY - 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRam(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const baseY = ground - 3;

    // Wheels
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - 8, baseY, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 8, baseY, 3, 0, Math.PI * 2); ctx.stroke();

    // Roof
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(cx - 12, baseY - 2);
    ctx.lineTo(cx, baseY - 14);
    ctx.lineTo(cx + 12, baseY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Ram beam
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 14, baseY - 5);
    ctx.lineTo(cx + 14, baseY - 5);
    ctx.stroke();
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.moveTo(cx + 14, baseY - 7);
    ctx.lineTo(cx + 18, baseY - 5);
    ctx.lineTo(cx + 14, baseY - 3);
    ctx.closePath();
    ctx.fill();
  }

  private drawShip(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const waterY = ground - 3;

    // Hull
    const hg = ctx.createLinearGradient(cx, waterY - 10, cx, waterY);
    hg.addColorStop(0, this.lightenHex(bodyColor, 20));
    hg.addColorStop(1, bodyColor);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(cx - 14, waterY - 3);
    ctx.quadraticCurveTo(cx - 16, waterY, cx - 14, waterY + 1);
    ctx.lineTo(cx + 14, waterY + 1);
    ctx.quadraticCurveTo(cx + 18, waterY - 2, cx + 16, waterY - 5);
    ctx.lineTo(cx - 10, waterY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Mast
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, waterY - 5); ctx.lineTo(cx, waterY - 26); ctx.stroke();
    // Sail
    ctx.fillStyle = '#e8d8c0';
    ctx.beginPath();
    ctx.moveTo(cx, waterY - 24);
    ctx.quadraticCurveTo(cx + 10, waterY - 18, cx, waterY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8b8a0';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Flag
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(cx - 4, waterY - 27, 4, 3);
  }

  private drawKing(ctx: CanvasRenderingContext2D, cx: number, ground: number, bodyColor: string, outlineColor: string) {
    const bodyTop = ground - 22;
    const headY = bodyTop - 4;
    const headR = 3.5;

    // Legs
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx - 2, ground - 5); ctx.lineTo(cx - 3, ground - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, ground - 5); ctx.lineTo(cx + 3, ground - 1); ctx.stroke();
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(cx - 4.5, ground - 2, 3, 2);
    ctx.fillRect(cx + 1.5, ground - 2, 3, 2);

    // Royal robes
    const rg = ctx.createLinearGradient(cx, bodyTop, cx, ground - 4);
    rg.addColorStop(0, this.lightenHex(bodyColor, 30));
    rg.addColorStop(0.5, bodyColor);
    rg.addColorStop(1, '#8b4513');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(cx - 6, bodyTop + 2);
    ctx.lineTo(cx - 7, ground - 5);
    ctx.lineTo(cx + 7, ground - 5);
    ctx.lineTo(cx + 6, bodyTop + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Cape
    ctx.fillStyle = '#8b0000';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 5, bodyTop + 3);
    ctx.quadraticCurveTo(cx - 10, ground - 10, cx - 8, ground - 3);
    ctx.lineTo(cx - 5, ground - 5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Scepter arm
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 6, bodyTop + 4); ctx.lineTo(cx + 6, ground - 12); ctx.stroke();
    ctx.strokeStyle = '#d4a944';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + 6, ground - 12); ctx.lineTo(cx + 6, ground - 28); ctx.stroke();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(cx + 6, ground - 29, 2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    this.drawHumanHead(ctx, cx, headY, headR, '#d4a870', outlineColor);
    // Crown
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, headY - 2);
    ctx.lineTo(cx - 4.5, headY - 7);
    ctx.lineTo(cx - 3, headY - 5);
    ctx.lineTo(cx - 1.5, headY - 8);
    ctx.lineTo(cx, headY - 5);
    ctx.lineTo(cx + 1.5, headY - 8);
    ctx.lineTo(cx + 3, headY - 5);
    ctx.lineTo(cx + 4.5, headY - 7);
    ctx.lineTo(cx + 4.5, headY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, headY - 6, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Expand shorthand #RGB / #RGBA to #RRGGBB / #RRGGBBAA */
  private normalizeHex(hex: string): string {
    if (hex.length === 4 || hex.length === 5) {
      // #RGB or #RGBA → #RRGGBB or #RRGGBBAA
      return '#' + hex.slice(1).split('').map(c => c + c).join('');
    }
    return hex;
  }

  private lightenHex(hex: string, amount: number): string {
    const h = this.normalizeHex(hex);
    const r = Math.min(255, parseInt(h.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(h.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(h.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  private createBuildingSprite(wallColor: string, roofColor: string, tileSize: number): HTMLCanvasElement {
    const pixSize = tileSize * TILE_SIZE * 0.4;
    const canvas = document.createElement('canvas');
    canvas.width = pixSize + 20;
    canvas.height = pixSize + 30;
    const ctx = canvas.getContext('2d')!;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 5;

    const w = pixSize * 0.8;
    const h = pixSize * 0.6;

    // Base shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h / 2 + 3, w / 2 + 4, h * 0.15 + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wall with gradient
    const wallGrad = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    wallGrad.addColorStop(0, this.lightenHex(wallColor, 20));
    wallGrad.addColorStop(0.5, wallColor);
    wallGrad.addColorStop(1, roofColor);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Window/door detail
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (tileSize >= 3) {
      // Door
      const dw = w * 0.12;
      const dh = h * 0.35;
      ctx.fillRect(cx - dw / 2, cy + h / 2 - dh, dw, dh);
      // Windows
      const winSize = Math.max(2, w * 0.08);
      ctx.fillRect(cx - w * 0.25, cy - h * 0.15, winSize, winSize);
      ctx.fillRect(cx + w * 0.15, cy - h * 0.15, winSize, winSize);
    }

    // Roof with gradient
    const roofGrad = ctx.createLinearGradient(cx, cy - h / 2 - h * 0.3, cx, cy - h / 2);
    roofGrad.addColorStop(0, this.lightenHex(roofColor, 15));
    roofGrad.addColorStop(1, roofColor);
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 - 3, cy - h / 2);
    ctx.lineTo(cx, cy - h / 2 - h * 0.35);
    ctx.lineTo(cx + w / 2 + 3, cy - h / 2);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.stroke(); // roof outline

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
    this.dayNightTime += 0.0001;
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

    // Render building placement preview
    if (this.buildPreview) {
      this.renderBuildPreview();
    }

    // Render buildings
    this.renderBuildings();

    // Render units
    this.renderUnits(alpha);

    // Render projectiles / effects
    this.renderEffects();

    // Render particles
    this.updateAndRenderParticles();

    // Render selection indicators
    this.renderSelectionIndicators();

    this.ctx.restore();

    // Day/night ambient overlay
    this.renderDayNightOverlay();

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
        let baseColor: string;
        const isWater = tile.terrain === TerrainType.Water ||
          tile.terrain === TerrainType.DeepWater ||
          tile.terrain === TerrainType.ShallowWater;

        if (isWater) {
          // Animated water with wave effect
          const wave = Math.sin(this.animTime * 0.003 + x * 0.5 + y * 0.3) * 0.15 + 0.85;
          const wave2 = Math.sin(this.animTime * 0.002 + x * 0.3 - y * 0.5) * 0.1;
          const base = this.normalizeHex(TERRAIN_COLORS[tile.terrain]);
          const r = parseInt(base.slice(1, 3), 16);
          const g = parseInt(base.slice(3, 5), 16);
          const b = parseInt(base.slice(5, 7), 16);
          baseColor = `rgb(${Math.floor(r * wave)},${Math.floor(g * wave)},${Math.min(255, Math.floor((b + wave2 * 40) * wave))})`;

          // Water sparkle
          if (Math.sin(this.animTime * 0.01 + x * 7.3 + y * 13.7) > 0.97) {
            this.ctx.fillStyle = baseColor;
            this.drawIsoTile(screenX, screenY);
            this.ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(this.animTime * 0.008 + x) * 0.15})`;
            this.drawIsoTile(screenX, screenY);
            continue;
          }
        } else {
          baseColor = (x + y) % 2 === 0 ?
            TERRAIN_COLORS[tile.terrain] : TERRAIN_COLORS_DARK[tile.terrain];
        }

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
        let color = '#888888';
        switch (tile.terrain) {
          case TerrainType.Forest:
            // Draw detailed tree with trunk and layered canopy
            this.ctx.fillStyle = '#3a2a10';
            this.ctx.fillRect(screenX - 1, screenY - 4, 3, 10);
            // Dark canopy layer
            this.ctx.fillStyle = '#1a4a0e';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY - 11, 9, 0, Math.PI * 2);
            this.ctx.fill();
            // Lighter highlight
            this.ctx.fillStyle = '#2a6a1e';
            this.ctx.beginPath();
            this.ctx.arc(screenX - 2, screenY - 13, 5, 0, Math.PI * 2);
            this.ctx.fill();
            break;
          default:
            // Gold / stone patches with layered stones
            color = tile.resourceType === 'gold' ? '#f4d03f' : '#95a5a6';
            const highlight = tile.resourceType === 'gold' ? '#ffe680' : '#bdc3c7';
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenX - 2, screenY - 2, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = highlight;
            this.ctx.beginPath();
            this.ctx.arc(screenX + 3, screenY - 4, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = color + 'b0';
            this.ctx.beginPath();
            this.ctx.arc(screenX + 1, screenY + 1, 3, 0, Math.PI * 2);
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
    const h = this.normalizeHex(hex);
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
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

  // ---- Particle System ----

  spawnParticles(worldX: number, worldY: number, type: Particle['type'], count: number = 5): void {
    const colors: Record<string, string[]> = {
      blood: ['#c0392b', '#e74c3c', '#922b21'],
      spark: ['#f39c12', '#f1c40f', '#fff'],
      dust: ['#8b7355', '#a09080', '#6b5335'],
      smoke: ['#555555', '#666666', '#777777'],
      gold: ['#f4d03f', '#f39c12', '#e8b810'],
      wood: ['#6b4226', '#8b5e3c', '#a0724c'],
      food: ['#e74c3c', '#27ae60', '#f39c12'],
    };

    for (let i = 0; i < count; i++) {
      const colorSet = colors[type] ?? colors.dust;
      this.particles.push({
        x: worldX + (Math.random() - 0.5) * 0.5,
        y: worldY + (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 3 + 1),
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        size: 1.5 + Math.random() * 2,
        type,
      });
    }
  }

  private updateAndRenderParticles(): void {
    const dt = 0.016;
    this.particles = this.particles.filter(p => {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) return false;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 5 * dt; // gravity
      if (p.type === 'smoke') {
        p.vy -= 8 * dt; // smoke rises
        p.size += dt * 2;
      }

      const screenX = (p.x - p.y) * (this.ISO_W / 2);
      const screenY = (p.x + p.y) * (this.ISO_H / 2);

      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY - 6, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      return true;
    });
  }

  // ---- Building Placement Preview ----

  private renderBuildPreview(): void {
    if (!this.buildPreview) return;

    const { type, x, y, valid } = this.buildPreview;
    const screenX = (x - y) * (this.ISO_W / 2);
    const screenY = (x + y) * (this.ISO_H / 2);

    const sprite = this.buildingSprites.get(type);

    this.ctx.save();
    this.ctx.globalAlpha = 0.5;

    if (sprite) {
      this.ctx.drawImage(sprite, screenX - sprite.width / 2, screenY - sprite.height / 2);
    }

    // Tint valid/invalid
    const tileColor = valid ? 'rgba(0,255,100,0.3)' : 'rgba(255,0,0,0.3)';

    const data = BUILDINGS[type];
    const size = data?.size ?? { x: 2, y: 2 };

    for (let dy = 0; dy < size.y; dy++) {
      for (let dx = 0; dx < size.x; dx++) {
        const tileScreenX = ((x + dx) - (y + dy)) * (this.ISO_W / 2);
        const tileScreenY = ((x + dx) + (y + dy)) * (this.ISO_H / 2);
        this.ctx.fillStyle = tileColor;
        this.drawIsoTile(tileScreenX, tileScreenY);
      }
    }

    this.ctx.restore();
  }

  // ---- Day/Night Cycle ----

  private renderDayNightOverlay(): void {
    const cycle = Math.sin(this.dayNightTime) * 0.5 + 0.5; // 0=night, 1=day
    const nightIntensity = Math.max(0, 0.15 - cycle * 0.15);

    if (nightIntensity > 0.01) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(10, 10, 40, ${nightIntensity})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }

  dispose(): void {
    this.unitSprites.clear();
    this.buildingSprites.clear();
    this.particles = [];
  }
}
