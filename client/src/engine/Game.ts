// ============================================================
// Empires Risen - Core Game Engine
// Manages game loop, state, systems, and coordination
// ============================================================

import {
  GameState, GamePhase, GameMode, MapType, MapSize, Age,
  ResourceType, EntityId, PlayerId, PlayerState, GameCommand,
  CommandType, DiplomacyStance, VictoryCondition, TICK_RATE,
  TICK_INTERVAL, PLAYER_COLORS, STARTING_RESOURCES, TILE_SIZE, Vec2,
} from '@shared/types';
import { SeededRandom } from '@shared/utils';
import { Renderer } from '../rendering/Renderer';
import { InputManager } from '../input/InputManager';
import { MapGenerator } from '../world/MapGenerator';
import { EntityManager } from '../ecs/EntityManager';
import { UnitSystem } from '../systems/UnitSystem';
import { BuildingSystem } from '../systems/BuildingSystem';
import { ResourceSystem } from '../systems/ResourceSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { FogOfWar } from '../systems/FogOfWar';
import { AIController } from '../ai/AIController';
import { AudioManager } from '../audio/AudioManager';
import { HUDManager } from '../ui/HUDManager';
import { MenuManager } from '../ui/MenuManager';
import { NetworkClient } from '../network/NetworkClient';

export class Game {
  public canvas: HTMLCanvasElement;
  public renderer!: Renderer;
  public input!: InputManager;
  public entityManager!: EntityManager;
  public mapGenerator!: MapGenerator;
  public unitSystem!: UnitSystem;
  public buildingSystem!: BuildingSystem;
  public resourceSystem!: ResourceSystem;
  public combatSystem!: CombatSystem;
  public fogOfWar!: FogOfWar;
  public aiController!: AIController;
  public audioManager!: AudioManager;
  public hudManager!: HUDManager;
  public menuManager!: MenuManager;
  public networkClient!: NetworkClient;

  public state!: GameState;
  public localPlayerId: PlayerId = 1;
  public selectedEntities: EntityId[] = [];
  public commandQueue: GameCommand[] = [];

  private lastTime: number = 0;
  private accumulator: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;
  private tickCount: number = 0;

  // Performance monitoring
  public fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<void> {
    // Initialize Canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Initialize subsystems
    this.renderer = new Renderer(this);
    this.input = new InputManager(this);
    this.entityManager = new EntityManager(this);
    this.mapGenerator = new MapGenerator(this);
    this.unitSystem = new UnitSystem(this);
    this.buildingSystem = new BuildingSystem(this);
    this.resourceSystem = new ResourceSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.fogOfWar = new FogOfWar(this);
    this.aiController = new AIController(this);
    this.audioManager = new AudioManager(this);
    this.hudManager = new HUDManager(this);
    this.menuManager = new MenuManager(this);
    this.networkClient = new NetworkClient(this);

    await this.renderer.init();
    this.input.init();
    this.audioManager.init();
    this.menuManager.init();
  }

  startGame(options: {
    mapType?: MapType | string;
    mapSize?: MapSize | string;
    mapWidth?: number;
    mapHeight?: number;
    numPlayers: number;
    playerCiv: string;
    difficulty?: string;
    mode?: GameMode;
    aiDifficulty?: number;
    isMultiplayer?: boolean;
    seed?: number;
    startingResources?: string;
    populationLimit?: number;
  }): void {
    const seed = options.seed ?? Date.now();
    const rng = new SeededRandom(seed);

    // Determine map dimensions
    const mapWidth = options.mapWidth ?? 144;
    const mapHeight = options.mapHeight ?? 144;
    const mapTypeStr = (options.mapType ?? 'arabia') as MapType;
    const mode = options.mode ?? GameMode.Standard;

    // Generate map
    const map = this.mapGenerator.generate(mapWidth, mapHeight, mapTypeStr as any, options.numPlayers, seed);

    // Initialize players
    const players = new Map<PlayerId, PlayerState>();
    const resKey = options.startingResources === 'deathmatch' ? 'deathmatch' :
                   mode === GameMode.Deathmatch ? 'deathmatch' :
                   mode === GameMode.EmpireWars ? 'empireWars' : 'standard';
    const startingRes = STARTING_RESOURCES[resKey];

    for (let i = 1; i <= options.numPlayers; i++) {
      const player: PlayerState = {
        id: i,
        name: i === 1 ? 'You' : `Player ${i}`,
        civilization: i === 1 ? options.playerCiv : this.getRandomCiv(rng),
        color: PLAYER_COLORS[(i - 1) % PLAYER_COLORS.length],
        team: i,
        age: Age.Dark,
        resources: { ...startingRes },
        population: 0,
        populationCap: 5,
        maxPopulation: 200,
        score: 0,
        isDefeated: false,
        isAI: i !== 1,
        aiDifficulty: i !== 1 ? (options.aiDifficulty ?? 2) : undefined,
        diplomacy: {},
        researchedTechs: new Set(),
        exploredTiles: new Set(),
        idleVillagers: [],
        militaryUnits: [],
        buildings: [],
      };

      // Set diplomacy
      for (let j = 1; j <= options.numPlayers; j++) {
        if (j !== i) {
          player.diplomacy[j] = DiplomacyStance.Enemy;
        }
      }

      players.set(i, player);
    }

    // Create game state
    this.state = {
      tick: 0,
      phase: GamePhase.Playing,
      mode,
      mapType: mapTypeStr as any,
      mapSize: mapWidth as any,
      map: map as any,
      players,
      entities: new Map(),
      victoryConditions: [VictoryCondition.Conquest],
      gameSpeed: 1.0,
      timeElapsed: 0,
      maxPlayers: options.numPlayers,
      seed,
    };

    // Initialize entity manager with the map
    this.entityManager.init();

    // Spawn starting units for each player
    this.spawnStartingUnits(rng);

    // Initialize fog of war
    const playerIds = Array.from(this.state.players.keys());
    this.fogOfWar.init(map.width, map.height, playerIds);

    // Initialize AI
    for (const [id, player] of this.state.players) {
      if (player.isAI) {
        const diffMap: Record<number, 'easy' | 'moderate' | 'hard' | 'hardest'> = {
          0: 'easy', 1: 'easy', 2: 'moderate', 3: 'hard', 4: 'hardest', 5: 'hardest'
        };
        this.aiController.registerAI(id, diffMap[player.aiDifficulty ?? 2] ?? 'moderate');
      }
    }

    // Setup HUD
    this.hudManager.init();

    // Start game loop
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoop(this.lastTime);

    console.log(`Game started: ${options.mode} on ${options.mapType} (${options.mapSize}x${options.mapSize})`);
  }

  private spawnStartingUnits(rng: SeededRandom): void {
    const map = this.state.map as any;
    const spawnPoints: Vec2[] = map.startPositions ?? [];

    for (const [playerId, player] of this.state.players) {
      const spawn = spawnPoints[playerId - 1];
      if (!spawn) continue;

      // Spawn Town Center
      const tc = this.entityManager.createBuilding('townCenter', playerId, spawn.x, spawn.y);
      player.buildings.push(tc);

      // Spawn starting villagers (3)
      const villagerCount = player.civilization === 'chinese' ? 6 : 3;
      for (let i = 0; i < villagerCount; i++) {
        const angle = (i / villagerCount) * Math.PI * 2;
        const vx = spawn.x + Math.cos(angle) * 3;
        const vy = spawn.y + Math.sin(angle) * 3;
        const villager = this.entityManager.createUnit('villager', playerId, vx, vy);
        player.idleVillagers.push(villager);
      }

      // Spawn scout
      const scoutX = spawn.x + 4;
      const scoutY = spawn.y + 2;
      const scout = this.entityManager.createUnit('scoutCavalry', playerId, scoutX, scoutY);
      player.militaryUnits.push(scout);

      // Regicide mode - spawn king
      if (this.state.mode === GameMode.Regicide) {
        this.entityManager.createUnit('kingUnit', playerId, spawn.x - 2, spawn.y);
      }

      // Update population
      player.population = villagerCount + 1;
    }
  }

  private getRandomCiv(rng: SeededRandom): string {
    const civs = ['britons', 'franks', 'teutons', 'mongols', 'chinese', 'japanese',
                  'byzantines', 'persians', 'saracens', 'turks', 'celts', 'vikings',
                  'goths', 'spanish', 'aztecs', 'mayans', 'huns', 'koreans'];
    return civs[rng.nextInt(0, civs.length - 1)];
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // FPS counter
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Fixed timestep for game logic
    this.accumulator += deltaTime * this.state.gameSpeed;
    while (this.accumulator >= TICK_INTERVAL) {
      this.update(TICK_INTERVAL / 1000);
      this.accumulator -= TICK_INTERVAL;
      this.state.tick++;
      this.state.timeElapsed += TICK_INTERVAL / 1000;
    }

    // Render at display refresh rate
    const alpha = this.accumulator / TICK_INTERVAL;
    this.render(alpha);

    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(dt: number): void {
    if (this.state.phase !== GamePhase.Playing) return;

    // Process pending commands
    this.processCommands();

    // Update all systems
    this.unitSystem.update(dt);
    this.buildingSystem.update(dt);
    this.resourceSystem.update(dt);
    this.combatSystem.update(dt);
    this.fogOfWar.update(this.localPlayerId);

    // Update AI
    this.aiController.update(dt);

    // Update HUD
    this.hudManager.update(dt);

    // Check victory conditions
    this.checkVictoryConditions();
  }

  private render(alpha: number): void {
    this.renderer.render(alpha);
  }

  private processCommands(): void {
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift()!;
      this.executeCommand(cmd);
    }
  }

  executeCommand(cmd: GameCommand): void {
    switch (cmd.type) {
      case CommandType.Move:
        if (cmd.entityIds && cmd.position) {
          for (const eid of cmd.entityIds) {
            this.unitSystem.moveUnit(eid, cmd.position);
          }
        }
        break;
      case CommandType.Attack:
        if (cmd.entityIds && cmd.targetId !== undefined) {
          for (const eid of cmd.entityIds) {
            this.unitSystem.attackUnit(eid, cmd.targetId!);
          }
        }
        break;
      case CommandType.Build:
        if (cmd.entityIds && cmd.buildingType && cmd.position) {
          this.buildingSystem.placeBuilding(cmd.buildingType, cmd.position.x, cmd.position.y, cmd.playerId);
        }
        break;
      case CommandType.Train:
        if (cmd.entityIds && cmd.unitType) {
          this.buildingSystem.trainUnit(cmd.entityIds[0], cmd.unitType, cmd.playerId);
        }
        break;
      case CommandType.Research:
        if (cmd.entityIds && cmd.techId) {
          this.buildingSystem.research(cmd.entityIds[0], cmd.techId, cmd.playerId);
        }
        break;
      case CommandType.Gather:
        if (cmd.entityIds && cmd.targetId !== undefined) {
          for (const eid of cmd.entityIds) {
            const tpos = this.entityManager.getPosition(cmd.targetId!);
            if (tpos) this.unitSystem.gatherResource(eid, cmd.targetId!, tpos);
          }
        }
        break;
      case CommandType.Garrison:
        if (cmd.entityIds && cmd.targetId !== undefined) {
          for (const eid of cmd.entityIds) {
            this.buildingSystem.garrison(eid, cmd.targetId!);
          }
        }
        break;
      case CommandType.Ungarrison:
        if (cmd.entityIds) {
          this.buildingSystem.ungarrison(cmd.entityIds[0]);
        }
        break;
      case CommandType.Patrol:
        if (cmd.entityIds && cmd.position) {
          for (const eid of cmd.entityIds) {
            this.unitSystem.patrol(eid, [cmd.position]);
          }
        }
        break;
      case CommandType.Repair:
        if (cmd.entityIds && cmd.targetId !== undefined) {
          for (const eid of cmd.entityIds) {
            this.unitSystem.repairStructure(eid, cmd.targetId!);
          }
        }
        break;
      case CommandType.DeleteUnit:
        if (cmd.entityIds) {
          for (const id of cmd.entityIds) {
            this.entityManager.removeEntity(id);
          }
        }
        break;
      case CommandType.SetDiplomacy:
        if (cmd.targetPlayerId !== undefined && cmd.stance) {
          const player = this.state.players.get(cmd.playerId);
          if (player) player.diplomacy[cmd.targetPlayerId] = cmd.stance;
        }
        break;
      case CommandType.Resign:
        this.playerDefeated(cmd.playerId);
        break;
    }
  }

  issueCommand(cmd: Omit<GameCommand, 'tick'>): void {
    const fullCmd: GameCommand = { ...cmd, tick: this.state.tick };

    if (this.networkClient.connected) {
      this.networkClient.sendCommand(fullCmd);
    } else {
      this.commandQueue.push(fullCmd);
    }
  }

  private checkVictoryConditions(): void {
    // Check every 5 seconds
    if (this.state.tick % (TICK_RATE * 5) !== 0) return;

    const alivePlayers = Array.from(this.state.players.values()).filter(p => !p.isDefeated);
    if (alivePlayers.length <= 1) {
      this.gameOver(alivePlayers[0]?.id ?? 0);
    }
  }

  private playerDefeated(playerId: PlayerId): void {
    const player = this.state.players.get(playerId);
    if (!player || player.isDefeated) return;
    player.isDefeated = true;

    // Remove all entities
    for (const id of [...player.buildings, ...player.militaryUnits, ...player.idleVillagers]) {
      this.entityManager.removeEntity(id);
    }

    if (playerId === this.localPlayerId) {
      this.hudManager.showNotification('You have been defeated!', '#e74c3c');
    } else {
      this.hudManager.showNotification(`${player.name} has been defeated!`, '#e8d5a3');
    }
  }

  gameOver(winnerId: PlayerId): void {
    this.state.phase = GamePhase.Ended;
    const winner = this.state.players.get(winnerId);
    if (winnerId === this.localPlayerId) {
      this.hudManager.showNotification('Victory! You have won!', '#f4d03f');
    } else {
      this.hudManager.showNotification(`${winner?.name ?? 'Unknown'} wins the game!`, '#e74c3c');
    }
  }

  selectEntitiesInRect(x1: number, y1: number, x2: number, y2: number): void {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    this.selectedEntities = this.entityManager.getEntitiesInRect(
      minX, minY, maxX, maxY, this.localPlayerId
    );

    // Max 60 selected
    if (this.selectedEntities.length > 60) {
      this.selectedEntities.length = 60;
    }

    this.hudManager.updateSelection();
  }

  selectEntity(entityId: EntityId, addToSelection: boolean = false): void {
    if (addToSelection) {
      if (!this.selectedEntities.includes(entityId)) {
        this.selectedEntities.push(entityId);
      }
    } else {
      this.selectedEntities = [entityId];
    }
    this.hudManager.updateSelection();
  }

  clearSelection(): void {
    this.selectedEntities = [];
    this.hudManager.updateSelection();
  }

  getLocalPlayer(): PlayerState | undefined {
    return this.state?.players.get(this.localPlayerId);
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.renderer) {
      this.renderer.resize(this.canvas.width, this.canvas.height);
    }
  }

  get isPaused(): boolean {
    return this.state?.phase === GamePhase.Paused;
  }

  pause(): void {
    if (this.state.phase === GamePhase.Playing) {
      this.state.phase = GamePhase.Paused;
    }
  }

  resume(): void {
    if (this.state.phase === GamePhase.Paused) {
      this.state.phase = GamePhase.Playing;
    }
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  dispose(): void {
    this.stop();
    this.input.dispose();
    this.renderer.dispose();
    this.audioManager.dispose();
  }
}
