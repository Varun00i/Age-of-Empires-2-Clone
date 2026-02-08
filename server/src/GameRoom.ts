// ============================================================
// Empires Risen - Game Room
// Manages a single multiplayer game session
// Deterministic lockstep command synchronization
// ============================================================

import { ClientConnection } from './ClientConnection';
import { MessageType, NetworkMessage, GameCommand } from '../../shared/src/types';

interface RoomPlayer {
  client: ClientConnection;
  ready: boolean;
  team: number;
  civilization: string;
  color: number;
  commandsThisTick: GameCommand[];
}

interface RoomOptions {
  mapType: string;
  mapSize: string;
  maxPlayers: number;
  populationLimit: number;
}

export class GameRoom {
  readonly id: string;
  private players = new Map<string, RoomPlayer>();
  private _host: string;
  private options: RoomOptions;
  private _started = false;
  private tick_count = 0;
  private seed = 0;
  private commandBuffer = new Map<number, Map<string, GameCommand[]>>();
  private turnLength = 2; // ticks per turn (lockstep)

  constructor(id: string, host: ClientConnection, options: RoomOptions) {
    this.id = id;
    this._host = host.id;
    this.options = options;

    this.addPlayer(host);
  }

  get host(): string {
    return this._host;
  }

  get hostName(): string {
    return this.players.get(this._host)?.client.name ?? 'Unknown';
  }

  get started(): boolean {
    return this._started;
  }

  get playerCount(): number {
    return this.players.size;
  }

  get maxPlayers(): number {
    return this.options.maxPlayers;
  }

  get mapType(): string {
    return this.options.mapType;
  }

  addPlayer(client: ClientConnection): boolean {
    if (this._started || this.players.size >= this.options.maxPlayers) {
      return false;
    }

    const colorIndex = this.players.size;
    this.players.set(client.id, {
      client,
      ready: false,
      team: 0,
      civilization: 'random',
      color: colorIndex,
      commandsThisTick: [],
    });

    client.room = this;

    // Notify existing players
    this.broadcast({
      type: MessageType.PlayerJoined,
      payload: {
        playerId: client.id,
        name: client.name,
        color: colorIndex,
      },
      timestamp: Date.now(),
    }, client.id);

    return true;
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    player.client.room = null;
    this.players.delete(playerId);

    // Notify remaining players
    this.broadcast({
      type: MessageType.PlayerLeft,
      payload: { playerId },
      timestamp: Date.now(),
    });

    // Transfer host if needed
    if (playerId === this._host && this.players.size > 0) {
      const newHost = this.players.keys().next().value;
      if (newHost) {
        this._host = newHost;
        this.broadcast({
          type: MessageType.ChatMessage,
          payload: {
            playerName: 'System',
            message: `${this.players.get(newHost)?.client.name} is now the host`,
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  setPlayerReady(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.ready = ready;
      this.broadcast({
        type: MessageType.SetReady,
        payload: { playerId, ready },
        timestamp: Date.now(),
      });
    }
  }

  getPlayerList(): Array<{
    id: string;
    name: string;
    ready: boolean;
    team: number;
    civilization: string;
    color: number;
  }> {
    const list: any[] = [];
    for (const [id, p] of this.players) {
      list.push({
        id,
        name: p.client.name,
        ready: p.ready,
        team: p.team,
        civilization: p.civilization,
        color: p.color,
      });
    }
    return list;
  }

  startGame(): void {
    if (this._started) return;

    // Check all players ready (except host can force start)
    this._started = true;
    this.seed = Date.now();
    this.tick_count = 0;

    const playerData = this.getPlayerList();
    this.broadcast({
      type: MessageType.StartGame,
      payload: {
        seed: this.seed,
        mapType: this.options.mapType,
        mapSize: this.options.mapSize,
        players: playerData,
        populationLimit: this.options.populationLimit,
      },
      timestamp: Date.now(),
    });

    console.log(`[Room ${this.id}] Game started with ${this.players.size} players`);
  }

  enqueueCommands(playerId: string, commands: GameCommand[]): void {
    if (!this._started) return;

    const player = this.players.get(playerId);
    if (!player) return;

    // In lockstep, we buffer commands and distribute them next turn
    player.commandsThisTick.push(...commands);
  }

  tick(): void {
    if (!this._started) return;

    this.tick_count++;

    // Every `turnLength` ticks, gather all commands and broadcast
    if (this.tick_count % this.turnLength === 0) {
      const allCommands: GameCommand[] = [];

      for (const [, player] of this.players) {
        allCommands.push(...player.commandsThisTick);
        player.commandsThisTick = [];
      }

      // Broadcast all commands to all players for this turn
      this.broadcast({
        type: MessageType.GameCommand,
        payload: {
          tick: this.tick_count,
          commands: allCommands,
        },
        timestamp: Date.now(),
      });
    }
  }

  broadcast(msg: NetworkMessage, excludeId?: string): void {
    const json = JSON.stringify(msg);
    for (const [id, player] of this.players) {
      if (id !== excludeId) {
        try {
          player.client.send(msg);
        } catch (e) {
          // Client will be cleaned up on disconnect
        }
      }
    }
  }
}
