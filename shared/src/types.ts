// ============================================================
// Empires Risen - Shared Types & Constants
// Core type definitions used by both client and server
// ============================================================

// ---- Geometry & Math ----
export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Entity Component System ----
export type EntityId = number;
export type PlayerId = number;
export type ComponentType = string;

export interface Component {
  type: ComponentType;
}

export interface Entity {
  id: EntityId;
  owner: PlayerId;
  components: Map<ComponentType, Component>;
}

// ---- Resources ----
export enum ResourceType {
  Food = 'food',
  Wood = 'wood',
  Gold = 'gold',
  Stone = 'stone',
}

export interface Resources {
  [ResourceType.Food]: number;
  [ResourceType.Wood]: number;
  [ResourceType.Gold]: number;
  [ResourceType.Stone]: number;
}

export const STARTING_RESOURCES: Record<string, Resources> = {
  standard: { food: 200, wood: 200, gold: 0, stone: 200 },
  deathmatch: { food: 20000, wood: 20000, gold: 20000, stone: 5000 },
  empireWars: { food: 500, wood: 500, gold: 200, stone: 200 },
};

// ---- Ages ----
export enum Age {
  Dark = 0,
  Feudal = 1,
  Castle = 2,
  Imperial = 3,
}

export const AGE_NAMES: Record<Age, string> = {
  [Age.Dark]: 'Dark Age',
  [Age.Feudal]: 'Feudal Age',
  [Age.Castle]: 'Castle Age',
  [Age.Imperial]: 'Imperial Age',
};

export const AGE_COSTS: Record<Age, Resources> = {
  [Age.Dark]: { food: 0, wood: 0, gold: 0, stone: 0 },
  [Age.Feudal]: { food: 500, wood: 0, gold: 0, stone: 0 },
  [Age.Castle]: { food: 800, wood: 200, gold: 0, stone: 0 },
  [Age.Imperial]: { food: 1000, wood: 0, gold: 800, stone: 0 },
};

// ---- Terrain ----
export enum TerrainType {
  Grass = 0,
  Dirt = 1,
  Sand = 2,
  Water = 3,
  DeepWater = 4,
  ShallowWater = 5,
  Forest = 6,
  Snow = 7,
  Ice = 8,
  Farm = 9,
  Road = 10,
  Beach = 11,
}

export interface MapTile {
  terrain: TerrainType;
  elevation: number;
  resourceType?: ResourceType;
  resourceAmount?: number;
  explored: boolean[];
  visible: boolean[];
  objectId?: EntityId;
  walkable?: boolean;
  buildable?: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: MapTile[][];
  seed: number;
}

// ---- Unit Types ----
export enum UnitCategory {
  Civilian = 'civilian',
  Infantry = 'infantry',
  Archer = 'archer',
  Cavalry = 'cavalry',
  Siege = 'siege',
  Naval = 'naval',
  Monk = 'monk',
  Hero = 'hero',
}

export interface UnitStats {
  id: string;
  name: string;
  category: UnitCategory;
  hp: number;
  attack: number;
  meleeArmor: number;
  pierceArmor: number;
  range: number;
  speed: number;
  lineOfSight: number;
  trainTime: number;
  cost: Resources;
  populationCost: number;
  attackSpeed: number;
  projectileSpeed?: number;
  blastRadius?: number;
  garrisonCapacity?: number;
  healRate?: number;
  conversionRange?: number;
  carryCapacity?: number;
  gatherRates?: Partial<Record<ResourceType, number>>;
  age: Age;
  trainedAt: string;
  bonusDamage?: Record<string, number>;
  abilities?: string[];
  description: string;
  spriteKey: string;
}

// ---- Building Types ----
export enum BuildingCategory {
  TownCenter = 'townCenter',
  Economic = 'economic',
  Military = 'military',
  Defensive = 'defensive',
  Religious = 'religious',
  Wonder = 'wonder',
  Special = 'special',
}

export interface BuildingStats {
  id: string;
  name: string;
  category: BuildingCategory;
  hp: number;
  meleeArmor: number;
  pierceArmor: number;
  attack?: number;
  range?: number;
  lineOfSight: number;
  buildTime: number;
  cost: Resources;
  size: Vec2;
  age: Age;
  populationProvided?: number;
  garrisonCapacity?: number;
  trains?: string[];
  researches?: string[];
  description: string;
  spriteKey: string;
  maxCount?: number;
  isDropoff?: ResourceType[];
}

// ---- Technology / Research ----
export interface TechStats {
  id: string;
  name: string;
  age: Age;
  cost: Resources;
  researchTime: number;
  researchedAt: string;
  effects: TechEffect[];
  prerequisites?: string[];
  description: string;
  iconKey: string;
}

export interface TechEffect {
  type: 'stat_modifier' | 'ability_unlock' | 'unit_upgrade' | 'resource_bonus' | 'special';
  target?: string;
  stat?: string;
  value?: number;
  mode?: 'add' | 'multiply' | 'set';
  description: string;
}

// ---- Civilizations ----
export interface CivilizationData {
  id: string;
  name: string;
  description: string;
  style: string;
  bonuses: string[];
  uniqueUnits: string[];
  uniqueTechs: string[];
  teamBonus: string;
  disabledUnits: string[];
  disabledTechs: string[];
  disabledBuildings: string[];
}

// ---- Game State ----
export enum GamePhase {
  Lobby = 'lobby',
  Loading = 'loading',
  Playing = 'playing',
  Paused = 'paused',
  Ended = 'ended',
}

export enum GameMode {
  Standard = 'standard',
  Deathmatch = 'deathmatch',
  Regicide = 'regicide',
  EmpireWars = 'empireWars',
  KingOfTheHill = 'kingOfTheHill',
  Sudden_Death = 'suddenDeath',
  WonderRace = 'wonderRace',
}

export enum VictoryCondition {
  Conquest = 'conquest',
  Wonder = 'wonder',
  Relic = 'relic',
  TimeLimit = 'timeLimit',
}

export enum MapType {
  Arabia = 'arabia',
  Arena = 'arena',
  BlackForest = 'blackForest',
  Islands = 'islands',
  Nomad = 'nomad',
  MegaRandom = 'megaRandom',
  Fortress = 'fortress',
  GoldRush = 'goldRush',
  Coastal = 'coastal',
  Continental = 'continental',
  Highland = 'highland',
  Mediterranean = 'mediterranean',
  Migration = 'migration',
  Rivers = 'rivers',
  TeamIslands = 'teamIslands',
  Custom = 'custom',
}

export enum MapSize {
  Tiny = 120,
  Small = 144,
  Medium = 168,
  Normal = 200,
  Large = 220,
  Giant = 240,
  Ludacris = 480,
}

export enum Difficulty {
  Easiest = 0,
  Standard = 1,
  Moderate = 2,
  Hard = 3,
  Hardest = 4,
  Extreme = 5,
}

export enum DiplomacyStance {
  Ally = 'ally',
  Neutral = 'neutral',
  Enemy = 'enemy',
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  civilization: string;
  color: number;
  team: number;
  age: Age;
  resources: Resources;
  population: number;
  populationCap: number;
  maxPopulation: number;
  score: number;
  isDefeated: boolean;
  isAI: boolean;
  aiDifficulty?: Difficulty;
  diplomacy: Record<PlayerId, DiplomacyStance>;
  researchedTechs: Set<string>;
  exploredTiles: Set<string>;
  idleVillagers: EntityId[];
  militaryUnits: EntityId[];
  buildings: EntityId[];
}

export interface GameState {
  tick: number;
  phase: GamePhase;
  mode: GameMode;
  mapType: MapType;
  mapSize: MapSize;
  map: GameMap;
  players: Map<PlayerId, PlayerState>;
  entities: Map<EntityId, Entity>;
  victoryConditions: VictoryCondition[];
  gameSpeed: number;
  timeElapsed: number;
  maxPlayers: number;
  seed: number;
}

// ---- Commands (Client -> Server) ----
export enum CommandType {
  Move = 'move',
  Attack = 'attack',
  AttackMove = 'attackMove',
  Build = 'build',
  Train = 'train',
  Research = 'research',
  Gather = 'gather',
  Garrison = 'garrison',
  Ungarrison = 'ungarrison',
  SetGatherPoint = 'setGatherPoint',
  DeleteUnit = 'deleteUnit',
  DeleteBuilding = 'deleteBuilding',
  SetDiplomacy = 'setDiplomacy',
  Chat = 'chat',
  Patrol = 'patrol',
  Guard = 'guard',
  Follow = 'follow',
  Repair = 'repair',
  Heal = 'heal',
  Convert = 'convert',
  PackUp = 'packUp',
  Unpack = 'unpack',
  SellResource = 'sellResource',
  BuyResource = 'buyResource',
  UseAbility = 'useAbility',
  Resign = 'resign',
  Pause = 'pause',
}

export interface GameCommand {
  type: CommandType;
  playerId: PlayerId;
  tick: number;
  entityIds?: EntityId[];
  targetId?: EntityId;
  position?: Vec2;
  targetPosition?: Vec2;
  buildingType?: string;
  buildingId?: EntityId;
  unitType?: string;
  techId?: string;
  resourceType?: ResourceType;
  stance?: DiplomacyStance;
  targetPlayerId?: PlayerId;
  message?: string;
  abilityId?: string;
  queue?: boolean;
  amount?: number;
}

// ---- Networking Messages ----
export enum MessageType {
  // Connection
  Connect = 'connect',
  Disconnect = 'disconnect',
  Heartbeat = 'heartbeat',
  Ping = 'ping',
  Pong = 'pong',

  // Lobby
  CreateLobby = 'createLobby',
  JoinLobby = 'joinLobby',
  LeaveLobby = 'leaveLobby',
  LobbyUpdate = 'lobbyUpdate',
  LobbyList = 'lobbyList',
  SetReady = 'setReady',
  StartGame = 'startGame',
  UpdateSettings = 'updateSettings',
  PlayerJoined = 'playerJoined',
  PlayerLeft = 'playerLeft',

  // Game
  GameCommand = 'gameCommand',
  GameState = 'gameState',
  GameStateDelta = 'gameStateDelta',
  GameSync = 'gameSync',
  GameOver = 'gameOver',
  GameTick = 'gameTick',

  // Lockstep
  TurnCommands = 'turnCommands',
  TurnAck = 'turnAck',
  HashCheck = 'hashCheck',
  DesyncDetected = 'desyncDetected',
  ResyncRequest = 'resyncRequest',
  ResyncResponse = 'resyncResponse',

  // Chat
  ChatMessage = 'chatMessage',
  SystemMessage = 'systemMessage',

  // Matchmaking
  QueueJoin = 'queueJoin',
  QueueLeave = 'queueLeave',
  MatchFound = 'matchFound',

  // Auth
  Login = 'login',
  LoginResponse = 'loginResponse',
  Register = 'register',
  RegisterResponse = 'registerResponse',

  // Profile
  ProfileUpdate = 'profileUpdate',
  LeaderboardRequest = 'leaderboardRequest',
  LeaderboardResponse = 'leaderboardResponse',
  MatchHistory = 'matchHistory',

  // Spectator
  SpectateJoin = 'spectateJoin',
  SpectateLeave = 'spectateLeave',
  SpectateUpdate = 'spectateUpdate',

  // Replay
  ReplayRequest = 'replayRequest',
  ReplayData = 'replayData',

  // Error
  Error = 'error',
}

export interface NetworkMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
  seq?: number;
}

export interface LobbyInfo {
  id: string;
  name: string;
  host: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  mode: GameMode;
  mapType: MapType;
  mapSize: MapSize;
  isStarted: boolean;
  isLocked: boolean;
  password?: boolean;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  civilization: string;
  color: number;
  team: number;
  isReady: boolean;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: Difficulty;
  slot: number;
}

// ---- Replay ----
export interface ReplayFrame {
  tick: number;
  commands: GameCommand[];
  hash: number;
}

export interface ReplayData {
  version: string;
  gameMode: GameMode;
  mapType: MapType;
  mapSize: MapSize;
  seed: number;
  players: LobbyPlayer[];
  frames: ReplayFrame[];
  duration: number;
  winner?: PlayerId;
}

// ---- Save/Load ----
export interface SaveData {
  version: string;
  timestamp: number;
  name: string;
  gameState: unknown; // Serialized GameState
  replayFrames: ReplayFrame[];
}

// ---- Scoring ----
export interface PlayerScore {
  military: number;
  economy: number;
  technology: number;
  society: number;
  total: number;
}

// ---- UI Events ----
export enum UIEvent {
  SelectUnits = 'selectUnits',
  DeselectAll = 'deselectAll',
  PanCamera = 'panCamera',
  ZoomCamera = 'zoomCamera',
  OpenMenu = 'openMenu',
  CloseMenu = 'closeMenu',
  ShowTooltip = 'showTooltip',
  HideTooltip = 'hideTooltip',
  Notification = 'notification',
  Alert = 'alert',
}

// ---- Constants ----
export const TILE_SIZE = 64;
export const HALF_TILE = TILE_SIZE / 2;
export const MAX_POPULATION = 200;
export const TICK_RATE = 20; // 20 ticks per second
export const TICK_INTERVAL = 1000 / TICK_RATE;
export const NETWORK_TICK_RATE = 10; // Network updates per second
export const MAX_SELECTION = 60;
export const RELIC_GOLD_PER_SECOND = 0.5;
export const WONDER_COUNTDOWN = 200 * TICK_RATE; // 200 years (game time)
export const CONVERSION_RANGE = 9;
export const MAX_GARRISON = 20;
export const FARM_FOOD = 175;
export const FISH_TRAP_FOOD = 715;
export const TRADE_PROFIT_PER_TILE = 0.46;
export const POPULATION_PER_HOUSE = 5;
export const POPULATION_PER_TC = 5;
export const POPULATION_PER_CASTLE = 20;

// ---- Player Colors ----
export const PLAYER_COLORS: number[] = [
  0x0000FF, // Blue
  0xFF0000, // Red
  0x00FF00, // Green
  0xFFFF00, // Yellow
  0x00FFFF, // Cyan
  0xFF00FF, // Magenta
  0xFF8000, // Orange
  0x808080, // Gray
];

// ---- Utility Types ----
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
