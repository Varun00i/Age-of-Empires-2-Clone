// ============================================================
// Empires Risen - Entity Component System (ECS)
// Manages all game entities: units, buildings, resources
// ============================================================

import { EntityId, UnitStats, BuildingStats, Vec2, ResourceType, UnitCategory } from '@shared/types';
import { UNITS } from '@shared/data/units';
import { BUILDINGS } from '@shared/data/buildings';
import { Game } from '../engine/Game';

export type UnitState = 'idle' | 'moving' | 'gathering' | 'attacking' | 'building' | 'repairing' |
  'garrisoned' | 'patrolling' | 'dead' | 'converting' | 'healing';

interface EntityBase {
  id: EntityId;
  owner: number; // playerId, -1 for Gaia
  type: 'unit' | 'building' | 'resource';
}

interface PositionComponent {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
}

interface HealthComponent {
  hp: number;
  maxHp: number;
}

interface UnitComponent {
  data: UnitStats;
  state: UnitState;
  targetId: EntityId | null;
  targetPos: Vec2 | null;
  path: Vec2[];
  pathIndex: number;
  attackCooldown: number;
  gatherCooldown: number;
  carryAmount: number;
  carryType: ResourceType | null;
  garrisonedIn: EntityId | null;
  patrolPoints: Vec2[];
  patrolIndex: number;
  facing: number; // angle
}

interface BuildingComponent {
  data: BuildingStats;
  buildProgress: number; // 0..1
  isComplete: boolean;
  trainingQueue: { unitId: string; progress: number; totalTime: number }[];
  researchQueue: { techId: string; progress: number; totalTime: number }[];
  rallyPoint: Vec2 | null;
  garrisonedUnits: EntityId[];
  farmFoodRemaining: number;
}

interface ResourceComponent {
  resourceType: ResourceType;
  amount: number;
}

export class EntityManager {
  private game: Game;
  private nextEntityId: EntityId = 1;

  // Component stores (SoA style)
  private entities: Map<EntityId, EntityBase> = new Map();
  private positions: Map<EntityId, PositionComponent> = new Map();
  private health: Map<EntityId, HealthComponent> = new Map();
  private units: Map<EntityId, UnitComponent> = new Map();
  private buildings: Map<EntityId, BuildingComponent> = new Map();
  private resources: Map<EntityId, ResourceComponent> = new Map();

  // Spatial hash for fast lookups
  private spatialGrid: Map<string, EntityId[]> = new Map();
  private readonly CELL_SIZE = 4;

  constructor(game: Game) {
    this.game = game;
  }

  init(): void {
    this.entities.clear();
    this.positions.clear();
    this.health.clear();
    this.units.clear();
    this.buildings.clear();
    this.resources.clear();
    this.spatialGrid.clear();
    this.nextEntityId = 1;
  }

  // ---- Entity Creation ----

  createUnit(unitId: string, owner: number, x: number, y: number): EntityId {
    const data = UNITS[unitId];
    if (!data) throw new Error(`Unknown unit: ${unitId}`);

    const id = this.nextEntityId++;
    this.entities.set(id, { id, owner, type: 'unit' });
    this.positions.set(id, { x, y, prevX: x, prevY: y });
    this.health.set(id, { hp: data.hp, maxHp: data.hp });
    this.units.set(id, {
      data,
      state: 'idle',
      targetId: null,
      targetPos: null,
      path: [],
      pathIndex: 0,
      attackCooldown: 0,
      gatherCooldown: 0,
      carryAmount: 0,
      carryType: null,
      garrisonedIn: null,
      patrolPoints: [],
      patrolIndex: 0,
      facing: 0,
    });

    this.addToSpatialGrid(id, x, y);
    return id;
  }

  createBuilding(buildingId: string, owner: number, x: number, y: number, complete: boolean = false): EntityId {
    const data = BUILDINGS[buildingId];
    if (!data) throw new Error(`Unknown building: ${buildingId}`);

    const id = this.nextEntityId++;
    this.entities.set(id, { id, owner, type: 'building' });
    this.positions.set(id, { x, y, prevX: x, prevY: y });
    this.health.set(id, {
      hp: complete ? data.hp : Math.floor(data.hp * 0.1),
      maxHp: data.hp,
    });
    this.buildings.set(id, {
      data,
      buildProgress: complete ? 1 : 0,
      isComplete: complete,
      trainingQueue: [],
      researchQueue: [],
      rallyPoint: null,
      garrisonedUnits: [],
      farmFoodRemaining: buildingId === 'farm' ? 175 : 0,
    });

    // Mark tiles as occupied
    const size = data.size ?? { x: 2, y: 2 };
    for (let dy = 0; dy < size.y; dy++) {
      for (let dx = 0; dx < size.x; dx++) {
        this.addToSpatialGrid(id, x + dx, y + dy);
      }
    }

    return id;
  }

  createResource(resourceType: ResourceType, amount: number, x: number, y: number): EntityId {
    const id = this.nextEntityId++;
    this.entities.set(id, { id, owner: -1, type: 'resource' });
    this.positions.set(id, { x, y, prevX: x, prevY: y });
    this.resources.set(id, { resourceType, amount });
    this.addToSpatialGrid(id, x, y);
    return id;
  }

  // ---- Entity Deletion ----

  removeEntity(id: EntityId): void {
    const pos = this.positions.get(id);
    if (pos) {
      // Buildings occupy multiple grid cells — clean them all up
      const building = this.buildings.get(id);
      if (building) {
        const size = building.data.size ?? { x: 2, y: 2 };
        for (let dy = 0; dy < size.y; dy++) {
          for (let dx = 0; dx < size.x; dx++) {
            this.removeFromSpatialGrid(id, pos.x + dx, pos.y + dy);
          }
        }
      } else {
        this.removeFromSpatialGrid(id, pos.x, pos.y);
      }
    }

    this.entities.delete(id);
    this.positions.delete(id);
    this.health.delete(id);
    this.units.delete(id);
    this.buildings.delete(id);
    this.resources.delete(id);
  }

  entityExists(id: EntityId): boolean {
    return this.entities.has(id);
  }

  // ---- Component Access ----

  getPosition(id: EntityId): PositionComponent | undefined {
    return this.positions.get(id);
  }

  setPosition(id: EntityId, x: number, y: number): void {
    const pos = this.positions.get(id);
    if (!pos) return;

    this.removeFromSpatialGrid(id, pos.x, pos.y);
    pos.prevX = pos.x;
    pos.prevY = pos.y;
    pos.x = x;
    pos.y = y;
    this.addToSpatialGrid(id, x, y);
  }

  getHP(id: EntityId): number | undefined {
    return this.health.get(id)?.hp;
  }

  getMaxHP(id: EntityId): number | undefined {
    return this.health.get(id)?.maxHp;
  }

  setHP(id: EntityId, hp: number): void {
    const h = this.health.get(id);
    if (h) h.hp = Math.max(0, Math.min(h.maxHp, hp));
  }

  damage(id: EntityId, amount: number): boolean {
    const h = this.health.get(id);
    if (!h) return false;
    h.hp = Math.max(0, h.hp - amount);
    return h.hp <= 0;
  }

  getOwner(id: EntityId): number {
    return this.entities.get(id)?.owner ?? -1;
  }

  isUnit(id: EntityId): boolean {
    return this.entities.get(id)?.type === 'unit';
  }

  isBuilding(id: EntityId): boolean {
    return this.entities.get(id)?.type === 'building';
  }

  isResource(id: EntityId): boolean {
    return this.entities.get(id)?.type === 'resource';
  }

  // ---- Unit Components ----

  getUnitData(id: EntityId): UnitStats | undefined {
    return this.units.get(id)?.data;
  }

  getUnitComponent(id: EntityId): UnitComponent | undefined {
    return this.units.get(id);
  }

  getUnitState(id: EntityId): UnitState | undefined {
    return this.units.get(id)?.state;
  }

  setUnitState(id: EntityId, state: UnitState): void {
    const unit = this.units.get(id);
    if (unit) unit.state = state;
  }

  setUnitTarget(id: EntityId, targetId: EntityId | null, targetPos: Vec2 | null): void {
    const unit = this.units.get(id);
    if (!unit) return;
    unit.targetId = targetId;
    unit.targetPos = targetPos;
  }

  setUnitPath(id: EntityId, path: Vec2[]): void {
    const unit = this.units.get(id);
    if (!unit) return;
    unit.path = path;
    unit.pathIndex = 0;
  }

  // ---- Building Components ----

  getBuildingData(id: EntityId): BuildingStats | undefined {
    return this.buildings.get(id)?.data;
  }

  getBuildingComponent(id: EntityId): BuildingComponent | undefined {
    return this.buildings.get(id);
  }

  getBuildProgress(id: EntityId): number | undefined {
    return this.buildings.get(id)?.buildProgress;
  }

  isBuildingComplete(id: EntityId): boolean {
    return this.buildings.get(id)?.isComplete ?? false;
  }

  addToTrainingQueue(id: EntityId, unitId: string): boolean {
    const building = this.buildings.get(id);
    if (!building || !building.isComplete) return false;
    if (building.trainingQueue.length >= 15) return false;

    const unitData = UNITS[unitId];
    if (!unitData) return false;

    building.trainingQueue.push({
      unitId,
      progress: 0,
      totalTime: unitData.trainTime,
    });
    return true;
  }

  addToResearchQueue(id: EntityId, techId: string, researchTime: number): boolean {
    const building = this.buildings.get(id);
    if (!building || !building.isComplete) return false;
    if (building.researchQueue.length >= 1) return false;

    building.researchQueue.push({
      techId,
      progress: 0,
      totalTime: researchTime,
    });
    return true;
  }

  // ---- Resource Components ----

  getResourceComponent(id: EntityId): ResourceComponent | undefined {
    return this.resources.get(id);
  }

  harvestResource(id: EntityId, amount: number): number {
    const res = this.resources.get(id);
    if (!res || res.amount <= 0) return 0;

    const harvested = Math.min(amount, res.amount);
    res.amount -= harvested;

    if (res.amount <= 0) {
      this.removeEntity(id);
    }

    return harvested;
  }

  // ---- Query Methods ----

  getEntityCount(): number {
    return this.entities.size;
  }

  getAllEntities(): EntityBase[] {
    return Array.from(this.entities.values());
  }

  getAllUnits(): EntityBase[] {
    return Array.from(this.entities.values()).filter(e => e.type === 'unit');
  }

  getAllBuildings(): EntityBase[] {
    return Array.from(this.entities.values()).filter(e => e.type === 'building');
  }

  getEntityAt(worldX: number, worldY: number, radius: number = 0.6): EntityId | null {
    const nearby = this.getEntitiesInRange(worldX, worldY, radius);
    let closest: EntityId | null = null;
    let closestDist = Infinity;

    for (const id of nearby) {
      const pos = this.positions.get(id);
      if (!pos) continue;
      const dist = Math.hypot(pos.x - worldX, pos.y - worldY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = id;
      }
    }

    return closest;
  }

  getEntitiesInRect(x: number, y: number, w: number, h: number, ownerId?: number): EntityId[] {
    const result: EntityId[] = [];

    // Query spatial grid cells covering the rect
    const startCX = Math.floor(x / this.CELL_SIZE);
    const startCY = Math.floor(y / this.CELL_SIZE);
    const endCX = Math.ceil((x + w) / this.CELL_SIZE);
    const endCY = Math.ceil((y + h) / this.CELL_SIZE);
    const checked = new Set<EntityId>();

    for (let cy = startCY; cy <= endCY; cy++) {
      for (let cx = startCX; cx <= endCX; cx++) {
        const key = `${cx},${cy}`;
        const ids = this.spatialGrid.get(key);
        if (!ids) continue;

        for (const id of ids) {
          if (checked.has(id)) continue;
          checked.add(id);

          if (!this.isUnit(id)) continue;
          if (ownerId !== undefined && this.getOwner(id) !== ownerId) continue;

          const pos = this.positions.get(id);
          if (!pos) continue;

          if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
            result.push(id);
          }
        }
      }
    }

    return result;
  }

  getEntitiesInRange(cx: number, cy: number, range: number): EntityId[] {
    const result: EntityId[] = [];
    const rangeSq = range * range;

    const startCX = Math.floor((cx - range) / this.CELL_SIZE);
    const startCY = Math.floor((cy - range) / this.CELL_SIZE);
    const endCX = Math.ceil((cx + range) / this.CELL_SIZE);
    const endCY = Math.ceil((cy + range) / this.CELL_SIZE);
    const checked = new Set<EntityId>();

    for (let gy = startCY; gy <= endCY; gy++) {
      for (let gx = startCX; gx <= endCX; gx++) {
        const key = `${gx},${gy}`;
        const ids = this.spatialGrid.get(key);
        if (!ids) continue;

        for (const id of ids) {
          if (checked.has(id)) continue;
          checked.add(id);

          const pos = this.positions.get(id);
          if (!pos) continue;

          const dx = pos.x - cx;
          const dy = pos.y - cy;
          if (dx * dx + dy * dy <= rangeSq) {
            result.push(id);
          }
        }
      }
    }

    return result;
  }

  getUnitsByType(unitId: string, ownerId: number): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, unit] of this.units) {
      if (unit.data.id === unitId && this.getOwner(id) === ownerId) {
        result.push(id);
      }
    }
    return result;
  }

  getBuildingsByType(buildingId: string, ownerId: number): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, building] of this.buildings) {
      if (building.data.id === buildingId && this.getOwner(id) === ownerId) {
        result.push(id);
      }
    }
    return result;
  }

  getIdleVillagers(ownerId: number): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, unit] of this.units) {
      if (unit.data.id === 'villager' &&
        unit.state === 'idle' &&
        this.getOwner(id) === ownerId) {
        result.push(id);
      }
    }
    return result;
  }

  getIdleMilitary(ownerId: number): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, unit] of this.units) {
      if (unit.data.id !== 'villager' &&
        unit.data.category !== UnitCategory.Civilian &&
        unit.state === 'idle' &&
        this.getOwner(id) === ownerId) {
        result.push(id);
      }
    }
    return result;
  }

  getPopulation(ownerId: number): number {
    let pop = 0;
    for (const [id, unit] of this.units) {
      if (this.getOwner(id) === ownerId) {
        pop += unit.data.populationCost ?? 1;
      }
    }
    return pop;
  }

  getPopulationCap(ownerId: number): number {
    let cap = 0;
    for (const [id, building] of this.buildings) {
      if (this.getOwner(id) === ownerId && building.isComplete) {
        cap += building.data.populationProvided ?? 0;
      }
    }
    return Math.min(cap, 200);
  }

  getNearestDropoff(x: number, y: number, resourceType: ResourceType, ownerId: number): EntityId | null {
    let nearest: EntityId | null = null;
    let nearestDist = Infinity;

    for (const [id, building] of this.buildings) {
      if (this.getOwner(id) !== ownerId || !building.isComplete) continue;
      if (!building.data.isDropoff?.includes(resourceType)) continue;

      const pos = this.positions.get(id);
      if (!pos) continue;

      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
      }
    }

    return nearest;
  }

  // ---- Spatial Grid ----

  private addToSpatialGrid(id: EntityId, wx: number, wy: number): void {
    const cx = Math.floor(wx / this.CELL_SIZE);
    const cy = Math.floor(wy / this.CELL_SIZE);
    const key = `${cx},${cy}`;

    let cell = this.spatialGrid.get(key);
    if (!cell) {
      cell = [];
      this.spatialGrid.set(key, cell);
    }
    cell.push(id);
  }

  private removeFromSpatialGrid(id: EntityId, wx: number, wy: number): void {
    const cx = Math.floor(wx / this.CELL_SIZE);
    const cy = Math.floor(wy / this.CELL_SIZE);
    const key = `${cx},${cy}`;

    const cell = this.spatialGrid.get(key);
    if (cell) {
      const idx = cell.indexOf(id);
      if (idx >= 0) cell.splice(idx, 1);
      if (cell.length === 0) this.spatialGrid.delete(key);
    }
  }

  // ---- Serialization ----

  serialize(): any {
    const entitiesArr: any[] = [];
    for (const [id, base] of this.entities) {
      const entry: any = { id, owner: base.owner, type: base.type };
      const pos = this.positions.get(id);
      if (pos) entry.pos = { x: pos.x, y: pos.y };
      const hp = this.health.get(id);
      if (hp) entry.hp = { hp: hp.hp, maxHp: hp.maxHp };
      const unit = this.units.get(id);
      if (unit) {
        entry.unit = {
          unitId: unit.data.id,
          state: unit.state,
          carryAmount: unit.carryAmount,
          carryType: unit.carryType,
          facing: unit.facing,
        };
      }
      const bld = this.buildings.get(id);
      if (bld) {
        entry.building = {
          buildingId: bld.data.id,
          buildProgress: bld.buildProgress,
          isComplete: bld.isComplete,
          farmFoodRemaining: bld.farmFoodRemaining,
          trainingQueue: bld.trainingQueue,
          researchQueue: bld.researchQueue,
        };
      }
      const res = this.resources.get(id);
      if (res) entry.resource = { resourceType: res.resourceType, amount: res.amount };
      entitiesArr.push(entry);
    }
    return { nextEntityId: this.nextEntityId, entities: entitiesArr };
  }

  deserialize(data: any): void {
    this.init();
    this.nextEntityId = data.nextEntityId ?? 1;
    for (const e of data.entities ?? []) {
      this.entities.set(e.id, { id: e.id, owner: e.owner, type: e.type });
      if (e.pos) this.positions.set(e.id, { x: e.pos.x, y: e.pos.y, prevX: e.pos.x, prevY: e.pos.y });
      if (e.hp) this.health.set(e.id, { hp: e.hp.hp, maxHp: e.hp.maxHp });
      if (e.unit) {
        const unitData = UNITS[e.unit.unitId];
        if (unitData) {
          this.units.set(e.id, {
            data: unitData, state: e.unit.state ?? 'idle',
            targetId: null, targetPos: null, path: [], pathIndex: 0,
            attackCooldown: 0, gatherCooldown: 0,
            carryAmount: e.unit.carryAmount ?? 0, carryType: e.unit.carryType ?? null,
            garrisonedIn: null, patrolPoints: [], patrolIndex: 0,
            facing: e.unit.facing ?? 0,
          });
        }
      }
      if (e.building) {
        const bldData = BUILDINGS[e.building.buildingId];
        if (bldData) {
          this.buildings.set(e.id, {
            data: bldData,
            buildProgress: e.building.buildProgress ?? 1,
            isComplete: e.building.isComplete ?? true,
            trainingQueue: e.building.trainingQueue ?? [],
            researchQueue: e.building.researchQueue ?? [],
            rallyPoint: null, garrisonedUnits: [],
            farmFoodRemaining: e.building.farmFoodRemaining ?? 0,
          });
        }
      }
      if (e.resource) {
        this.resources.set(e.id, { resourceType: e.resource.resourceType, amount: e.resource.amount });
      }
      if (e.pos) this.addToSpatialGrid(e.id, e.pos.x, e.pos.y);
    }
  }

  dispose(): void {
    this.entities.clear();
    this.positions.clear();
    this.health.clear();
    this.units.clear();
    this.buildings.clear();
    this.resources.clear();
    this.spatialGrid.clear();
  }
}
