// ============================================================
// Empires Risen - Input Manager
// Handles mouse, keyboard, touch input with RTS-specific controls
// ============================================================

import { Game } from '../engine/Game';
import { CommandType } from '@shared/types';

interface ActionIndicator {
  x: number;
  y: number;
  type: 'move' | 'attack' | 'gather';
  age: number;
  maxAge: number;
}

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface TouchState {
  startTime: number;
  startX: number;
  startY: number;
  touches: Map<number, { x: number; y: number }>;
  pinchStartDist: number;
  isPanning: boolean;
  lastTapTime: number;
}

// Edge scroll zones
const EDGE_SCROLL_SIZE = 30;
const EDGE_SCROLL_SPEED = 12;

// Keyboard bindings
const KEY_BINDINGS: Record<string, string> = {
  // Camera
  'ArrowUp': 'cameraUp',
  'ArrowDown': 'cameraDown',
  'ArrowLeft': 'cameraLeft',
  'ArrowRight': 'cameraRight',
  'w': 'cameraUp',
  's': 'cameraDown',
  'a': 'cameraLeft',
  'd': 'cameraRight',

  // Selection
  'Delete': 'deleteUnit',
  'Escape': 'deselect',

  // Commands
  'h': 'townCenterSelect',
  '.': 'idleVillager',
  ',': 'idleMilitary',

  // Control groups
  '1': 'group1', '2': 'group2', '3': 'group3', '4': 'group4', '5': 'group5',
  '6': 'group6', '7': 'group7', '8': 'group8', '9': 'group9', '0': 'group0',

  // Formations
  'q': 'formation1',
  'e': 'formation2',

  // Building shortcuts
  'b': 'buildMenu',

  // Game
  'F3': 'togglePause',
  'F5': 'quickSave',
  'F9': 'quickLoad',
  'F11': 'toggleFullscreen',
  'Tab': 'toggleChat',
  'Enter': 'sendChat',
  ' ': 'goToEvent',
};

export class InputManager {
  private game: Game;
  private canvas: HTMLCanvasElement;
  private keysDown: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseButtons: Set<number> = new Set();
  private drag: DragState = { active: false, startX: 0, startY: 0, endX: 0, endY: 0 };
  private touch: TouchState;
  private indicators: ActionIndicator[] = [];
  private controlGroups: Map<number, number[]> = new Map();
  private selectionBox: HTMLElement | null = null;
  private buildMode: string | null = null;
  private rightClickMoveTimeout: any = null;
  private isMobile: boolean;

  // Edge scroll state
  private edgeScrollDir = { x: 0, y: 0 };

  constructor(game: Game) {
    this.game = game;
    this.canvas = game.canvas;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.touch = {
      startTime: 0,
      startX: 0,
      startY: 0,
      touches: new Map(),
      pinchStartDist: 0,
      isPanning: false,
      lastTapTime: 0,
    };
    this.selectionBox = document.getElementById('selection-box');
  }

  init(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));

    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    // Minimap click
    const minimap = document.getElementById('minimap-canvas');
    if (minimap) {
      minimap.addEventListener('mousedown', this.onMinimapClick.bind(this));
      minimap.addEventListener('mousemove', (e) => {
        if (e.buttons & 1) this.onMinimapClick(e);
      });
    }

    // Mobile floating controls
    document.getElementById('mob-build')?.addEventListener('click', () => {
      this.game.hudManager?.toggleBuildMenu();
    });
    document.getElementById('mob-attack')?.addEventListener('click', () => {
      // Attack-move mode toggle
      if (this.game.selectedEntities.length > 0) {
        this.game.hudManager?.showNotification('Tap target to attack-move');
      }
    });
    document.getElementById('mob-idle')?.addEventListener('click', () => {
      this.selectIdleVillager();
    });
    document.getElementById('mob-tc')?.addEventListener('click', () => {
      this.selectBuildingsByType('townCenter');
    });
    document.getElementById('mob-pause')?.addEventListener('click', () => {
      if (this.game.isPaused) {
        this.game.resume();
        this.game.menuManager?.hidePauseOverlay();
      } else {
        this.game.pause();
        this.game.menuManager?.showPauseOverlay();
      }
    });

    // Resize
    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
  }

  update(dt: number): void {
    // Edge scrolling (desktop only)
    if (!this.isMobile) {
      this.edgeScrollDir.x = 0;
      this.edgeScrollDir.y = 0;

      if (this.mouseX < EDGE_SCROLL_SIZE) this.edgeScrollDir.x = -1;
      else if (this.mouseX > this.canvas.width - EDGE_SCROLL_SIZE) this.edgeScrollDir.x = 1;
      if (this.mouseY < EDGE_SCROLL_SIZE) this.edgeScrollDir.y = -1;
      else if (this.mouseY > this.canvas.height - EDGE_SCROLL_SIZE) this.edgeScrollDir.y = 1;

      if (this.edgeScrollDir.x !== 0 || this.edgeScrollDir.y !== 0) {
        this.game.renderer.moveCamera(
          this.edgeScrollDir.x * EDGE_SCROLL_SPEED,
          this.edgeScrollDir.y * EDGE_SCROLL_SPEED
        );
      }
    }

    // Keyboard camera movement
    const scrollSpeed = EDGE_SCROLL_SPEED * 1.2;
    if (this.keysDown.has('ArrowUp') || this.keysDown.has('w'))
      this.game.renderer.moveCamera(0, -scrollSpeed);
    if (this.keysDown.has('ArrowDown') || this.keysDown.has('s'))
      this.game.renderer.moveCamera(0, scrollSpeed);
    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('a'))
      this.game.renderer.moveCamera(-scrollSpeed, 0);
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('d'))
      this.game.renderer.moveCamera(scrollSpeed, 0);

    // Update indicators
    this.indicators = this.indicators.filter(ind => {
      ind.age += dt;
      return ind.age < ind.maxAge;
    });
  }

  getIndicators(): ActionIndicator[] {
    return this.indicators;
  }

  // ---- Mouse Events ----

  private onMouseDown(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.mouseButtons.add(e.button);

    if (e.button === 0) { // Left click
      if (this.buildMode) {
        this.placeBuildingAtMouse();
        return;
      }

      // Start drag selection
      this.drag.active = true;
      this.drag.startX = e.clientX;
      this.drag.startY = e.clientY;
      this.drag.endX = e.clientX;
      this.drag.endY = e.clientY;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (this.drag.active) {
      this.drag.endX = e.clientX;
      this.drag.endY = e.clientY;
      this.updateSelectionBox();
    }

    // Building placement preview
    if (this.buildMode) {
      this.updateBuildPreview();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button);

    if (e.button === 0 && this.drag.active) { // Left release
      this.drag.active = false;
      this.hideSelectionBox();

      const dx = Math.abs(this.drag.endX - this.drag.startX);
      const dy = Math.abs(this.drag.endY - this.drag.startY);

      if (dx < 5 && dy < 5) {
        // Single click / select
        this.handleLeftClick(e.clientX, e.clientY, e.shiftKey);
      } else {
        // Drag select
        this.handleDragSelect(e.shiftKey);
      }
    }

    if (e.button === 2) { // Right click
      this.handleRightClick(e.clientX, e.clientY);
    }

    if (e.button === 1) { // Middle click
      // Could be used for camera panning
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.game.renderer.zoomCamera(delta, e.clientX, e.clientY);
  }

  // ---- Touch Events ----

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.touch.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      this.touch.startTime = Date.now();
      this.touch.isPanning = false;
    } else if (e.touches.length === 2) {
      // Pinch zoom start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.touch.pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.touch.isPanning = true;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.touch.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (e.touches.length === 1 && !this.touch.isPanning) {
      const t = e.touches[0];
      const dx = t.clientX - this.touch.startX;
      const dy = t.clientY - this.touch.startY;

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        this.touch.isPanning = true;
      }

      if (this.touch.isPanning) {
        this.game.renderer.moveCamera(-dx * 1.5, -dy * 1.5);
        this.touch.startX = t.clientX;
        this.touch.startY = t.clientY;
      }
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const delta = (dist - this.touch.pinchStartDist) * 0.005;

      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      this.game.renderer.zoomCamera(delta, cx, cy);
      this.touch.pinchStartDist = dist;

      // Two-finger pan
      const prev1 = this.touch.touches.get(e.touches[0].identifier);
      if (prev1) {
        const dx = t1.clientX - prev1.x;
        const dy = t1.clientY - prev1.y;
        this.game.renderer.moveCamera(-dx, -dy);
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touch.touches.delete(e.changedTouches[i].identifier);
    }

    if (e.touches.length === 0 && !this.touch.isPanning) {
      const elapsed = Date.now() - this.touch.startTime;

      if (elapsed < 200) {
        // Double tap detection
        const now = Date.now();
        if (now - this.touch.lastTapTime < 300) {
          // Double tap: select all units of same type
          this.handleDoubleTap(this.touch.startX, this.touch.startY);
        } else {
          // Single tap: select or command
          this.handleLeftClick(this.touch.startX, this.touch.startY, false);
        }
        this.touch.lastTapTime = now;
      } else if (elapsed > 500) {
        // Long press: right-click equivalent
        this.handleRightClick(this.touch.startX, this.touch.startY);
      }
    }

    if (e.touches.length === 0) {
      this.touch.isPanning = false;
    }
  }

  // ---- Keyboard Events ----

  private onKeyDown(e: KeyboardEvent): void {
    // Don't process if typing in chat
    const chatInput = document.getElementById('chat-input');
    if (chatInput && document.activeElement === chatInput) {
      if (e.key === 'Enter') {
        this.sendChatMessage();
      } else if (e.key === 'Escape') {
        (chatInput as HTMLInputElement).blur();
        this.hideChatBox();
      }
      return;
    }

    this.keysDown.add(e.key);

    // Control group creation/selection
    if (e.key >= '0' && e.key <= '9') {
      const groupNum = parseInt(e.key);
      if (e.ctrlKey) {
        // Create control group
        this.controlGroups.set(groupNum, [...this.game.selectedEntities]);
      } else {
        // Select control group
        const group = this.controlGroups.get(groupNum);
        if (group && group.length > 0) {
          this.game.selectedEntities = group.filter(id =>
            this.game.entityManager.entityExists(id)
          );
          this.game.hudManager?.updateSelection();
        }
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        if (this.buildMode) {
          this.cancelBuildMode();
        } else {
          this.game.clearSelection();
        }
        break;

      case 'Delete':
        // Delete selected units
        for (const id of this.game.selectedEntities) {
          this.game.issueCommand({
            type: CommandType.DeleteUnit,
            entityIds: [id],
            playerId: this.game.localPlayerId,
          });
        }
        break;

      case 'h':
        // Select all TCs
        this.selectBuildingsByType('townCenter');
        break;

      case '.':
        // Select idle villager
        this.selectIdleVillager();
        break;

      case ',':
        // Select idle military
        this.selectIdleMilitary();
        break;

      case 'b':
        // Open build menu
        this.game.hudManager?.toggleBuildMenu();
        break;

      case 't':
        // Open tech tree
        this.game.hudManager?.showTechTree();
        break;

      case 'F3':
        e.preventDefault();
        if (this.game.isPaused) {
          this.game.resume();
          this.game.menuManager?.hidePauseOverlay();
        } else {
          this.game.pause();
          this.game.menuManager?.showPauseOverlay();
        }
        break;

      case 'F11':
        e.preventDefault();
        this.toggleFullscreen();
        break;

      case 'Tab':
        e.preventDefault();
        this.toggleChatBox();
        break;

      case ' ':
        e.preventDefault();
        // Go to last event/notification location
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.key);
  }

  // ---- Action Handlers ----

  private handleLeftClick(screenX: number, screenY: number, addToSelection: boolean): void {
    const world = this.game.renderer.screenToWorld(screenX, screenY);

    // Find clicked entity
    const entity = this.game.entityManager.getEntityAt(world.x, world.y);

    if (entity !== null) {
      if (addToSelection) {
        // Toggle entity in selection
        const idx = this.game.selectedEntities.indexOf(entity);
        if (idx >= 0) {
          this.game.selectedEntities.splice(idx, 1);
        } else {
          this.game.selectedEntities.push(entity);
        }
      } else {
        this.game.selectedEntities = [entity];
      }
    } else if (!addToSelection) {
      this.game.clearSelection();
    }

    this.game.hudManager?.updateSelection();
  }

  private handleRightClick(screenX: number, screenY: number): void {
    if (this.game.selectedEntities.length === 0) return;

    const world = this.game.renderer.screenToWorld(screenX, screenY);
    const targetEntity = this.game.entityManager.getEntityAt(world.x, world.y);

    // Determine right-click action based on target
    if (targetEntity !== null) {
      const targetOwner = this.game.entityManager.getOwner(targetEntity);

      if (targetOwner !== this.game.localPlayerId && targetOwner !== -1) {
        // Attack enemy
        this.game.issueCommand({
          type: CommandType.Attack,
          entityIds: [...this.game.selectedEntities],
          targetId: targetEntity,
          playerId: this.game.localPlayerId,
        });
        this.addIndicator(world.x, world.y, 'attack');
      } else if (this.hasVillagerSelected()) {
        // Check if it's a resource to gather
        const isResource = this.game.entityManager.isResource(targetEntity);
        if (isResource) {
          this.game.issueCommand({
            type: CommandType.Gather,
            entityIds: this.getSelectedVillagers(),
            targetId: targetEntity,
            playerId: this.game.localPlayerId,
          });
          this.addIndicator(world.x, world.y, 'gather');
        } else {
          // Repair or garrison
          const isBuilding = this.game.entityManager.isBuilding(targetEntity);
          if (isBuilding) {
            this.game.issueCommand({
              type: CommandType.Repair,
              entityIds: this.getSelectedVillagers(),
              targetId: targetEntity,
              playerId: this.game.localPlayerId,
            });
          }
        }
      } else {
        // Move to entity's position
        this.game.issueCommand({
          type: CommandType.Move,
          entityIds: [...this.game.selectedEntities],
          position: world,
          playerId: this.game.localPlayerId,
        });
        this.addIndicator(world.x, world.y, 'move');
      }
    } else {
      // Check if clicking on resource tile
      const tileX = Math.floor(world.x);
      const tileY = Math.floor(world.y);
      const tile = this.game.state.map?.tiles[tileY]?.[tileX];

      if (tile?.resourceType && tile?.resourceAmount && this.hasVillagerSelected()) {
        // Gather from resource tile
        this.game.issueCommand({
          type: CommandType.Gather,
          entityIds: this.getSelectedVillagers(),
          position: { x: tileX + 0.5, y: tileY + 0.5 },
          playerId: this.game.localPlayerId,
        });
        this.addIndicator(tileX + 0.5, tileY + 0.5, 'gather');
      } else {
        // Move command
        this.game.issueCommand({
          type: CommandType.Move,
          entityIds: [...this.game.selectedEntities],
          position: world,
          playerId: this.game.localPlayerId,
        });
        this.addIndicator(world.x, world.y, 'move');
      }
    }
  }

  private handleDragSelect(addToSelection: boolean): void {
    const start = this.game.renderer.screenToWorld(this.drag.startX, this.drag.startY);
    const end = this.game.renderer.screenToWorld(this.drag.endX, this.drag.endY);

    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);

    const entities = this.game.entityManager.getEntitiesInRect(
      minX, minY, maxX - minX, maxY - minY, this.game.localPlayerId
    );

    if (addToSelection) {
      // Add to existing selection
      for (const id of entities) {
        if (!this.game.selectedEntities.includes(id)) {
          this.game.selectedEntities.push(id);
        }
      }
    } else {
      this.game.selectedEntities = entities;
    }

    // Limit selection size
    if (this.game.selectedEntities.length > 60) {
      this.game.selectedEntities = this.game.selectedEntities.slice(0, 60);
    }

    this.game.hudManager?.updateSelection();
  }

  private handleDoubleTap(screenX: number, screenY: number): void {
    const world = this.game.renderer.screenToWorld(screenX, screenY);
    const entity = this.game.entityManager.getEntityAt(world.x, world.y);

    if (entity !== null) {
      const unitData = this.game.entityManager.getUnitData(entity);
      if (unitData) {
        // Select all units of same type on screen
        const sameType = this.game.entityManager.getUnitsByType(
          unitData.id, this.game.localPlayerId
        );
        this.game.selectedEntities = sameType.slice(0, 60);
        this.game.hudManager?.updateSelection();
      }
    }
  }

  // ---- Building Placement ----

  enterBuildMode(buildingId: string): void {
    this.buildMode = buildingId;
    this.canvas.style.cursor = 'crosshair';
  }

  cancelBuildMode(): void {
    this.buildMode = null;
    this.canvas.style.cursor = 'default';
  }

  private placeBuildingAtMouse(): void {
    if (!this.buildMode) return;

    const world = this.game.renderer.screenToWorld(this.mouseX, this.mouseY);
    const tileX = Math.floor(world.x);
    const tileY = Math.floor(world.y);

    // Check if placement is valid
    const canPlace = this.game.buildingSystem.canPlaceBuilding(
      this.buildMode, tileX, tileY, this.game.localPlayerId
    );

    if (canPlace) {
      this.game.issueCommand({
        type: CommandType.Build,
        entityIds: this.getSelectedVillagers(),
        buildingType: this.buildMode,
        position: { x: tileX, y: tileY },
        playerId: this.game.localPlayerId,
      });

      // Stay in build mode if shift held
      if (!this.keysDown.has('Shift')) {
        this.cancelBuildMode();
      }
    }
  }

  private updateBuildPreview(): void {
    // Building placement preview is rendered via HUDManager
  }

  // ---- Minimap ----

  private onMinimapClick(e: MouseEvent): void {
    const minimap = e.target as HTMLCanvasElement;
    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const map = this.game.state.map;
    if (!map) return;

    const worldX = (x / minimap.width) * map.width;
    const worldY = (y / minimap.height) * map.height;

    this.game.renderer.centerOnPosition(worldX, worldY);
  }

  // ---- Selection Helpers ----

  private hasVillagerSelected(): boolean {
    return this.game.selectedEntities.some(id => {
      const data = this.game.entityManager.getUnitData(id);
      return data?.id === 'villager';
    });
  }

  private getSelectedVillagers(): number[] {
    return this.game.selectedEntities.filter(id => {
      const data = this.game.entityManager.getUnitData(id);
      return data?.id === 'villager';
    });
  }

  private selectBuildingsByType(type: string): void {
    const buildings = this.game.entityManager.getBuildingsByType(type, this.game.localPlayerId);
    if (buildings.length > 0) {
      this.game.selectedEntities = buildings;
      this.game.hudManager?.updateSelection();

      // Center camera on first
      const pos = this.game.entityManager.getPosition(buildings[0]);
      if (pos) this.game.renderer.centerOnPosition(pos.x, pos.y);
    }
  }

  private selectIdleVillager(): void {
    const idle = this.game.entityManager.getIdleVillagers(this.game.localPlayerId);
    if (idle.length > 0) {
      this.game.selectedEntities = [idle[0]];
      this.game.hudManager?.updateSelection();

      const pos = this.game.entityManager.getPosition(idle[0]);
      if (pos) this.game.renderer.centerOnPosition(pos.x, pos.y);
    }
  }

  private selectIdleMilitary(): void {
    const idle = this.game.entityManager.getIdleMilitary(this.game.localPlayerId);
    if (idle.length > 0) {
      this.game.selectedEntities = [idle[0]];
      this.game.hudManager?.updateSelection();

      const pos = this.game.entityManager.getPosition(idle[0]);
      if (pos) this.game.renderer.centerOnPosition(pos.x, pos.y);
    }
  }

  // ---- UI Helpers ----

  private updateSelectionBox(): void {
    if (!this.selectionBox) return;
    const x = Math.min(this.drag.startX, this.drag.endX);
    const y = Math.min(this.drag.startY, this.drag.endY);
    const w = Math.abs(this.drag.endX - this.drag.startX);
    const h = Math.abs(this.drag.endY - this.drag.startY);

    if (w < 5 && h < 5) {
      this.selectionBox.style.display = 'none';
      return;
    }

    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = x + 'px';
    this.selectionBox.style.top = y + 'px';
    this.selectionBox.style.width = w + 'px';
    this.selectionBox.style.height = h + 'px';
  }

  private hideSelectionBox(): void {
    if (this.selectionBox) this.selectionBox.style.display = 'none';
  }

  private addIndicator(x: number, y: number, type: 'move' | 'attack' | 'gather'): void {
    this.indicators.push({ x, y, type, age: 0, maxAge: 800 });
  }

  private onResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.game.renderer.resize(this.canvas.width, this.canvas.height);
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private toggleChatBox(): void {
    const chat = document.getElementById('chat-container');
    if (chat) {
      chat.style.display = chat.style.display === 'none' ? 'flex' : 'none';
      const input = document.getElementById('chat-input') as HTMLInputElement;
      if (input) input.focus();
    }
  }

  private hideChatBox(): void {
    const chat = document.getElementById('chat-container');
    if (chat) chat.style.display = 'none';
  }

  private sendChatMessage(): void {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    this.game.issueCommand({
      type: CommandType.Chat,
      message: input.value.trim(),
      playerId: this.game.localPlayerId,
    });

    input.value = '';
    input.blur();
  }

  getBuildMode(): string | null {
    return this.buildMode;
  }

  getMouseWorld(): { x: number; y: number } {
    return this.game.renderer.screenToWorld(this.mouseX, this.mouseY);
  }

  dispose(): void {
    // Listeners will be GC'd with the canvas
    this.indicators = [];
    this.controlGroups.clear();
  }
}
