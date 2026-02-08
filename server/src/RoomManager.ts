// ============================================================
// Empires Risen - Room Manager
// Creates, tracks, and garbage-collects game rooms
// ============================================================

import { ClientConnection } from './ClientConnection';
import { GameRoom } from './GameRoom';

let nextRoomId = 1;

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private connections = new Map<string, ClientConnection>();

  get totalConnections(): number {
    return this.connections.size;
  }

  get totalRooms(): number {
    return this.rooms.size;
  }

  addConnection(client: ClientConnection): void {
    this.connections.set(client.id, client);
  }

  removeConnection(client: ClientConnection): void {
    this.connections.delete(client.id);
  }

  createRoom(host: ClientConnection, options: Record<string, any>): GameRoom {
    const id = 'room_' + (nextRoomId++);
    const room = new GameRoom(id, host, {
      mapType: options.mapType ?? 'arabia',
      mapSize: options.mapSize ?? 'small',
      maxPlayers: options.maxPlayers ?? 8,
      populationLimit: options.populationLimit ?? 200,
    });

    this.rooms.set(id, room);
    console.log(`[RoomManager] Room ${id} created by ${host.id}`);
    return room;
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  removeRoom(id: string): void {
    this.rooms.delete(id);
    console.log(`[RoomManager] Room ${id} removed`);
  }

  listRooms(): Array<{
    id: string;
    host: string;
    players: number;
    maxPlayers: number;
    mapType: string;
    started: boolean;
  }> {
    const list: any[] = [];
    for (const [id, room] of this.rooms) {
      list.push({
        id,
        host: room.hostName,
        players: room.playerCount,
        maxPlayers: room.maxPlayers,
        mapType: room.mapType,
        started: room.started,
      });
    }
    return list;
  }

  tick(): void {
    // Tick all active game rooms
    for (const [id, room] of this.rooms) {
      if (room.started) {
        room.tick();
      }

      // Garbage collect empty rooms
      if (room.playerCount === 0) {
        this.removeRoom(id);
      }
    }
  }
}
