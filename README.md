# ⚔️ Empires Risen

A fully browser-based, real-time strategy game inspired by Age of Empires 2. Play in your browser on desktop or mobile with full feature parity.

## Features

- **18 Civilizations** with unique bonuses, tech trees, and units
- **50+ Unit Types** including infantry, cavalry, archers, siege, monks, and naval
- **30+ Buildings** across 4 ages (Dark → Feudal → Castle → Imperial)
- **80+ Technologies** for military, economic, and civilization-specific upgrades
- **10 Map Types** — Arabia, Black Forest, Islands, Arena, Nomad, Continental, Rivers, Mediterranean, Gold Rush, MegaRandom
- **4 AI Difficulties** — Easy, Moderate, Hard, Hardest with strategic build orders
- **Multiplayer** via deterministic lockstep networking (WebSocket)
- **Isometric 2D Canvas** rendering with procedurally generated sprites
- **Fog of War** with explored/unexplored states per player
- **Full RTS Controls** — drag select, control groups, hotkeys, minimap click
- **Mobile Touch** suppovrt with gesture controls
- **Procedural Audio** via WebAudio API (no asset files needed)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | TypeScript, Vite, Canvas 2D |
| Server | Node.js, WebSocket (`ws`) |
| Shared | TypeScript types, A\* pathfinding, seeded RNG |
| Deploy | Docker, docker-compose |

## Project Structure

```
├── shared/          # Shared types, game data, utilities
│   └── src/
│       ├── types.ts          # All interfaces, enums, constants
│       ├── utils.ts          # A* pathfinding, isometric projection, RNG
│       ├── index.ts          # Barrel exports
│       └── data/
│           ├── units.ts      # 50+ unit definitions
│           ├── buildings.ts  # 30+ building definitions
│           ├── technologies.ts # 80+ tech definitions
│           └── civilizations.ts # 18 civilization definitions
├── client/          # Browser client (Vite)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts           # Entry point
│       ├── engine/Game.ts    # Core game loop & state
│       ├── rendering/Renderer.ts  # Canvas 2D isometric renderer
│       ├── input/InputManager.ts  # Mouse/keyboard/touch input
│       ├── ecs/EntityManager.ts   # Entity component system
│       ├── world/MapGenerator.ts  # Procedural map generation
│       ├── systems/          # Game systems
│       │   ├── UnitSystem.ts
│       │   ├── BuildingSystem.ts
│       │   ├── ResourceSystem.ts
│       │   ├── CombatSystem.ts
│       │   └── FogOfWar.ts
│       ├── ai/AIController.ts     # AI opponent
│       ├── audio/AudioManager.ts  # Procedural WebAudio
│       ├── ui/
│       │   ├── HUDManager.ts      # In-game HUD
│       │   └── MenuManager.ts     # Main menu & settings
│       └── network/NetworkClient.ts # WebSocket multiplayer client
├── server/          # Game server
│   └── src/
│       ├── index.ts              # HTTP + WebSocket server
│       ├── ClientConnection.ts   # Per-client connection handler
│       ├── RoomManager.ts        # Lobby/room management
│       └── GameRoom.ts           # Lockstep game room
├── Dockerfile
├── docker-compose.yml
└── package.json     # Workspace root (npm workspaces)
```

## Quick Start

### Prerequisites

- **Node.js 20+**
- **npm 9+**

### Development

```bash
# Install all dependencies
npm install

# Start client dev server (port 3000)
cd client && npx vite

# Start game server (port 8080) — in a separate terminal
cd server && npx tsx src/index.ts
```

Open **http://localhost:3000** in your browser.

### Production (Docker)

```bash
# Build and run
docker compose up --build

# Access at http://localhost:8080
```

### Production (Manual)

```bash
npm install

# Build client
cd client && npx vite build && cd ..

# Build server
cd server && npx tsc && cd ..

# Run
NODE_ENV=production node server/dist/src/index.js
```

## Controls

### Desktop

| Action | Control |
|--------|---------|
| Select units | Left-click / drag select |
| Move / attack | Right-click |
| Camera pan | Arrow keys / WASD / edge scroll |
| Zoom | Mouse wheel |
| Control group | Ctrl+1-9 (set), 1-9 (recall) |
| Select all military | Ctrl+A |
| Select idle villager | Period (.) |
| Select all TCs | H |
| Delete unit | Delete |
| Queue action | Shift+right-click |

### Mobile

| Action | Control |
|--------|---------|
| Select | Tap |
| Move / attack | Double-tap target |
| Camera pan | Drag on empty area |
| Zoom | Pinch |
| Multi-select | Two-finger tap |

## Architecture

### Rendering
- **Isometric 2D** using Canvas API with procedurally generated sprites
- **Y-sorted** draw order for correct depth
- **Chunked rendering** with camera culling for performance
- **Minimap** with real-time unit/building tracking

### Networking
- **Deterministic lockstep** — all clients simulate the same game state
- **Seeded RNG** ensures identical randomness across clients
- **20 tick/sec** fixed simulation rate
- **Command-based** — only player actions are transmitted, not game state

### ECS Architecture
- **Structure of Arrays (SoA)** for cache-friendly iteration
- **Spatial hashing** for efficient proximity queries and selection
- **Component stores** for position, health, units, buildings, resources

## License

MIT
