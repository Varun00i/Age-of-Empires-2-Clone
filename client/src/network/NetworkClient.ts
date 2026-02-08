// ============================================================
// Empires Risen - Network Client
// WebSocket connection, command synchronization, lobby, reconnection
// ============================================================

import { Game } from '../engine/Game';
import {
  MessageType,
  GameCommand,
  CommandType,
  NetworkMessage,
} from '@shared/types';

export interface LobbyPlayer {
  id: string;
  name: string;
  civilization: string;
  ready: boolean;
  team: number;
  color: number;
}

export interface LobbyState {
  roomId: string;
  host: string;
  players: LobbyPlayer[];
  mapType: string;
  mapSize: string;
  started: boolean;
}

type MessageHandler = (msg: NetworkMessage) => void;

export class NetworkClient {
  private game: Game;
  private ws: WebSocket | null = null;
  private url = '';
  private playerName = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pendingCommands: GameCommand[] = [];
  private localTick = 0;
  private serverTick = 0;
  private handlers = new Map<string, MessageHandler[]>();
  private _connected = false;
  private _playerId = '';
  private _lobbyState: LobbyState | null = null;

  constructor(game: Game) {
    this.game = game;
  }

  get connected(): boolean {
    return this._connected;
  }

  get playerId(): string {
    return this._playerId;
  }

  get lobbyState(): LobbyState | null {
    return this._lobbyState;
  }

  init(): void {
    // Register default message handlers
    this.on(MessageType.Pong, () => {});
    this.on(MessageType.Error, (msg: any) => {
      console.error('[Network] Server error:', msg.payload?.message);
      this.game.hudManager?.showNotification('Network error: ' + msg.payload?.message);
    });
  }

  // ---- Connection ----

  connect(url: string, playerName: string): void {
    this.url = url;
    this.playerName = playerName;
    this.reconnectAttempts = 0;
    this._connected = false;

    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';
    } catch (e) {
      console.error('[Network] Connection failed:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[Network] Connected to', this.url);
      this._connected = true;
      this.reconnectAttempts = 0;

      // Send join message
      this.send({
        type: MessageType.Connect,
        payload: { name: this.playerName },
        timestamp: Date.now(),
      });

      // Start heartbeat
      this.startHeartbeat();

      this.game.hudManager?.showNotification('Connected to server');
    };

    this.ws.onclose = (event) => {
      console.log('[Network] Disconnected:', event.code, event.reason);
      this._connected = false;
      this.stopHeartbeat();

      if (event.code !== 1000) {
        // Abnormal close
        this.scheduleReconnect();
        this.game.hudManager?.showNotification('Disconnected. Reconnecting...');
      }
    };

    this.ws.onerror = (error) => {
      console.error('[Network] WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      try {
        let msg: NetworkMessage;
        if (typeof event.data === 'string') {
          msg = JSON.parse(event.data);
        } else {
          // Binary message - decode
          const view = new DataView(event.data);
          const text = new TextDecoder().decode(view);
          msg = JSON.parse(text);
        }
        this.handleMessage(msg);
      } catch (e) {
        console.error('[Network] Failed to parse message:', e);
      }
    };
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Network] Max reconnect attempts reached');
      this.game.hudManager?.showNotification('Connection lost. Please return to menu.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[Network] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  // ---- Heartbeat ----

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this._connected) {
        this.send({ type: MessageType.Ping, payload: {}, timestamp: Date.now() });
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ---- Message Handling ----

  private handleMessage(msg: NetworkMessage): void {
    switch (msg.type) {
      case MessageType.Connect:
        this._playerId = (msg.payload as any).playerId;
        this.game.localPlayerId = this._playerId as any;
        break;

      case MessageType.GameState:
        // Full state sync
        this.serverTick = (msg.payload as any).tick ?? 0;
        this.applyStateSync(msg.payload);
        break;

      case MessageType.GameCommand:
        // Execute commands from other players
        {
          const p = msg.payload as any;
          if (p.commands) {
            for (const cmd of p.commands) {
              this.game.executeCommand(cmd);
            }
          }
        }
        break;

      case MessageType.PlayerJoined:
        {
          const p = msg.payload as any;
          this.game.hudManager?.showNotification(`${p.name} joined`);
          if (this._lobbyState) {
            this._lobbyState.players.push(p as LobbyPlayer);
          }
        }
        break;

      case MessageType.PlayerLeft:
        {
          const p = msg.payload as any;
          this.game.hudManager?.showNotification(`Player ${p.playerId} left`);
          if (this._lobbyState) {
            this._lobbyState.players = this._lobbyState.players.filter(
              lp => lp.id !== p.playerId
            );
          }
        }
        break;

      case MessageType.ChatMessage:
        {
          const p = msg.payload as any;
          this.game.hudManager?.addChatMessage(
            p.playerName ?? 'Server',
            p.message,
            p.playerColor ?? '#aaa'
          );
        }
        break;

      case MessageType.Pong:
        // Latency measurement
        break;

      default:
        break;
    }

    // Fire registered handlers
    const handlers = this.handlers.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(msg);
      }
    }
  }

  // ---- Event System ----

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  // ---- Sending ----

  send(msg: NetworkMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (e) {
      console.error('[Network] Send failed:', e);
    }
  }

  sendCommand(command: GameCommand): void {
    this.pendingCommands.push(command);

    // Send immediately
    this.send({
      type: MessageType.GameCommand,
      payload: { commands: [command] },
      timestamp: Date.now(),
    });
  }

  sendChat(message: string): void {
    this.send({
      type: MessageType.ChatMessage,
      payload: { message },
      timestamp: Date.now(),
    });
  }

  // ---- Lobby ----

  createRoom(options: Record<string, any>): void {
    this.send({
      type: MessageType.CreateLobby,
      payload: options,
      timestamp: Date.now(),
    });
  }

  joinRoom(roomId: string): void {
    this.send({
      type: MessageType.JoinLobby,
      payload: { roomId },
      timestamp: Date.now(),
    });
  }

  leaveRoom(): void {
    this.send({
      type: MessageType.LeaveLobby,
      payload: {},
      timestamp: Date.now(),
    });
  }

  setReady(ready: boolean): void {
    this.send({
      type: MessageType.SetReady,
      payload: { ready },
      timestamp: Date.now(),
    });
  }

  startMultiplayerGame(): void {
    this.send({
      type: MessageType.StartGame,
      payload: {},
      timestamp: Date.now(),
    });
  }

  // ---- State Sync ----

  private applyStateSync(payload: any): void {
    // Apply server authoritative state when received
    // In deterministic lockstep this is rarely needed
    if (payload.state) {
      console.log('[Network] Received full state sync at tick', payload.tick);
    }
  }

  // ---- Tick Sync ----

  flush(): void {
    // Flush any remaining pending commands
    if (this.pendingCommands.length === 0) return;

    this.send({
      type: MessageType.GameCommand,
      payload: {
        tick: this.localTick,
        commands: this.pendingCommands,
      },
      timestamp: Date.now(),
    });

    this.pendingCommands = [];
    this.localTick++;
  }

  advanceTick(): void {
    this.localTick++;
  }

  getLatency(): number {
    return 0; // TODO: measure round-trip time from ping/pong
  }

  dispose(): void {
    this.disconnect();
    this.handlers.clear();
  }
}
