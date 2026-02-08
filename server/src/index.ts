// ============================================================
// Empires Risen - Game Server Entry Point
// WebSocket server with HTTP health endpoints
// ============================================================

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './RoomManager.js';
import { ClientConnection } from './ClientConnection.js';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_CONNECTIONS = 200;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CLIENT_DIST = join(process.cwd(), 'client/dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function serveStaticFile(res: ServerResponse, urlPath: string): boolean {
  if (!IS_PRODUCTION) return false;

  let filePath = join(CLIENT_DIST, urlPath === '/' ? 'index.html' : urlPath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // SPA fallback - serve index.html for client-side routes
    filePath = join(CLIENT_DIST, 'index.html');
    if (!existsSync(filePath)) return false;
  }

  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

// ---- HTTP Server ----
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: process.uptime(),
      connections: roomManager.totalConnections,
      rooms: roomManager.totalRooms,
    }));
    return;
  }

  if (req.url === '/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(roomManager.listRooms()));
    return;
  }

  // Serve static files in production
  if (serveStaticFile(res, req.url || '/')) {
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Empires Risen Game Server');
});

// ---- WebSocket Server ----
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const roomManager = new RoomManager();

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  if (roomManager.totalConnections >= MAX_CONNECTIONS) {
    ws.close(1013, 'Server full');
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  console.log(`[Server] New connection from ${ip}`);

  const client = new ClientConnection(ws, roomManager);
  client.init();

  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[Server] Client ${client.id} disconnected: ${code}`);
    client.dispose();
  });

  ws.on('error', (err: Error) => {
    console.error(`[Server] Client ${client.id} error:`, err.message);
  });
});

// ---- Tick Loop ----
const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;

setInterval(() => {
  roomManager.tick();
}, TICK_MS);

// ---- Startup ----
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   ⚔️  Empires Risen Game Server  ⚔️      ║
║   Listening on port ${PORT}                ║
║   WebSocket: ws://localhost:${PORT}/ws     ║
║   Health:    http://localhost:${PORT}/health║
╚══════════════════════════════════════════╝
  `);
});

// ---- Graceful Shutdown ----
function shutdown() {
  console.log('\n[Server] Shutting down...');
  wss.clients.forEach(client => client.close(1001, 'Server shutting down'));
  wss.close();
  httpServer.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
