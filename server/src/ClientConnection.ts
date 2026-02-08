// ============================================================
// Empires Risen - Client Connection
// Per-client WebSocket handler
// ============================================================

import { WebSocket } from 'ws';
import { RoomManager } from './RoomManager';
import { GameRoom } from './GameRoom';
import { MessageType, NetworkMessage, GameCommand } from '../../shared/src/types';

let nextClientId = 1;

export class ClientConnection {
  readonly id: string;
  name: string = 'Player';
  private ws: WebSocket;
  private roomManager: RoomManager;
  private _room: GameRoom | null = null;
  private _alive = true;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ws: WebSocket, roomManager: RoomManager) {
    this.id = 'p' + (nextClientId++);
    this.ws = ws;
    this.roomManager = roomManager;
  }

  get room(): GameRoom | null {
    return this._room;
  }

  set room(r: GameRoom | null) {
    this._room = r;
  }

  get alive(): boolean {
    return this._alive;
  }

  init(): void {
    this.roomManager.addConnection(this);

    this.ws.on('message', (data: Buffer | string) => {
      try {
        const msg: NetworkMessage = JSON.parse(
          typeof data === 'string' ? data : data.toString()
        );
        this.handleMessage(msg);
      } catch (e) {
        console.error(`[Client ${this.id}] Invalid message:`, e);
      }
    });

    // Ping to detect dead connections
    this.pingTimer = setInterval(() => {
      if (!this._alive) {
        this.ws.terminate();
        return;
      }
      this._alive = false;
      this.ws.ping();
    }, 30000);

    this.ws.on('pong', () => {
      this._alive = true;
    });
  }

  private handleMessage(msg: NetworkMessage): void {
    switch (msg.type) {
      case MessageType.Connect:
        this.name = (msg.payload as any).name ?? 'Player';
        this.send({
          type: MessageType.Connect,
          payload: { playerId: this.id, name: this.name },
          timestamp: Date.now(),
        });
        break;

      case MessageType.CreateLobby:
        this.handleCreateRoom(msg.payload as Record<string, any>);
        break;

      case MessageType.JoinLobby:
        this.handleJoinRoom((msg.payload as any).roomId);
        break;

      case MessageType.LeaveLobby:
        this.handleLeaveRoom();
        break;

      case MessageType.SetReady:
        if (this._room) {
          this._room.setPlayerReady(this.id, (msg.payload as any).ready);
        }
        break;

      case MessageType.StartGame:
        if (this._room && this._room.host === this.id) {
          this._room.startGame();
        }
        break;

      case MessageType.GameCommand:
        if (this._room) {
          const commands: GameCommand[] = (msg.payload as any).commands ?? [];
          this._room.enqueueCommands(this.id, commands);
        }
        break;

      case MessageType.ChatMessage:
        if (this._room) {
          this._room.broadcast({
            type: MessageType.ChatMessage,
            payload: {
              playerId: this.id,
              playerName: this.name,
              message: (msg.payload as any).message,
            },
            timestamp: Date.now(),
          });
        }
        break;

      case MessageType.Ping:
        this.send({
          type: MessageType.Pong,
          payload: {},
          timestamp: Date.now(),
        });
        break;

      default:
        break;
    }
  }

  private handleCreateRoom(options: Record<string, any>): void {
    if (this._room) {
      this.handleLeaveRoom();
    }

    const room = this.roomManager.createRoom(this, options);
    this._room = room;

    this.send({
      type: MessageType.CreateLobby,
      payload: { roomId: room.id, success: true },
      timestamp: Date.now(),
    });
  }

  private handleJoinRoom(roomId: string): void {
    if (this._room) {
      this.handleLeaveRoom();
    }

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      this.send({
        type: MessageType.Error,
        payload: { message: 'Room not found' },
        timestamp: Date.now(),
      });
      return;
    }

    if (!room.addPlayer(this)) {
      this.send({
        type: MessageType.Error,
        payload: { message: 'Room is full or game in progress' },
        timestamp: Date.now(),
      });
      return;
    }

    this._room = room;
    this.send({
      type: MessageType.JoinLobby,
      payload: { roomId: room.id, success: true, players: room.getPlayerList() },
      timestamp: Date.now(),
    });
  }

  private handleLeaveRoom(): void {
    if (this._room) {
      this._room.removePlayer(this.id);
      this._room = null;
    }
  }

  send(msg: NetworkMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (e) {
        console.error(`[Client ${this.id}] Send failed:`, e);
      }
    }
  }

  dispose(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this._room) {
      this._room.removePlayer(this.id);
      this._room = null;
    }

    this.roomManager.removeConnection(this);
  }
}
