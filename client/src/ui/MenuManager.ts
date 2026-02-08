// ============================================================
// Empires Risen - Menu Manager
// Main menu, game setup, settings, and overlay screens
// ============================================================

import { Game } from '../engine/Game';
import { CIVILIZATIONS } from '@shared/data/civilizations';
import { MapType } from '../world/MapGenerator';

export interface GameSetupOptions {
  mapType: MapType;
  mapSize: 'tiny' | 'small' | 'medium' | 'large' | 'giant';
  numPlayers: number;
  playerCiv: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'hardest';
  startingAge: 'dark' | 'feudal' | 'castle' | 'imperial';
  startingResources: 'standard' | 'high' | 'deathmatch';
  populationLimit: number;
  isMultiplayer: boolean;
}

const MAP_SIZES: Record<string, { width: number; height: number }> = {
  tiny: { width: 120, height: 120 },
  small: { width: 144, height: 144 },
  medium: { width: 200, height: 200 },
  large: { width: 240, height: 240 },
  giant: { width: 300, height: 300 },
};

export class MenuManager {
  private game: Game;
  private mainMenuEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private gameHUD!: HTMLElement;
  private currentScreen: 'loading' | 'mainMenu' | 'gameSetup' | 'settings' | 'playing' = 'loading';

  constructor(game: Game) {
    this.game = game;
  }

  init(): void {
    this.mainMenuEl = document.getElementById('main-menu')!;
    this.loadingEl = document.getElementById('loading-screen')!;
    this.gameHUD = document.getElementById('game-hud')!;

    this.setupMainMenu();
  }

  showMainMenu(): void {
    this.currentScreen = 'mainMenu';
    this.loadingEl.style.display = 'none';
    this.mainMenuEl.style.display = 'flex';
    this.gameHUD.style.display = 'none';
  }

  showGame(): void {
    this.currentScreen = 'playing';
    this.loadingEl.style.display = 'none';
    this.mainMenuEl.style.display = 'none';
    this.gameHUD.style.display = 'block';
  }

  private setupMainMenu(): void {
    if (!this.mainMenuEl) return;

    this.mainMenuEl.innerHTML = `
      <div style="text-align:center;max-width:600px;width:100%;">
        <h1 style="font-size:42px;color:#f4d03f;text-shadow:2px 2px 4px #000;
                    font-family:'Cinzel',serif;margin-bottom:8px;">
          ⚔️ Empires Risen ⚔️
        </h1>
        <p style="color:#c0a060;margin-bottom:32px;font-size:14px;">
          A browser-based real-time strategy game
        </p>

        <div id="menu-buttons" style="display:flex;flex-direction:column;gap:12px;align-items:center;">
          <button id="btn-singleplayer" class="menu-btn">🏰 Single Player</button>
          <button id="btn-multiplayer" class="menu-btn">🌐 Multiplayer</button>
          <button id="btn-mapeditor" class="menu-btn">🗺️ Map Editor</button>
          <button id="btn-settings" class="menu-btn">⚙️ Settings</button>
          <button id="btn-help" class="menu-btn">❓ Help</button>
        </div>

        <div id="game-setup" style="display:none;text-align:left;margin-top:20px;"></div>
        <div id="settings-panel" style="display:none;text-align:left;margin-top:20px;"></div>
        <div id="help-panel" style="display:none;text-align:left;margin-top:20px;"></div>
      </div>
    `;

    // Style menu buttons
    const style = document.createElement('style');
    style.textContent = `
      .menu-btn {
        background: linear-gradient(180deg, #5a4a30, #3a2a10);
        border: 2px solid #8b7355;
        color: #e8d5a3;
        padding: 12px 40px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 6px;
        width: 280px;
        transition: all 0.2s;
        font-family: 'Cinzel', serif;
      }
      .menu-btn:hover {
        background: linear-gradient(180deg, #6a5a40, #4a3a20);
        border-color: #f4d03f;
        transform: scale(1.03);
      }
      .setup-select, .setup-input {
        background: #2a2010;
        border: 1px solid #5a4a30;
        color: #e8d5a3;
        padding: 8px;
        border-radius: 4px;
        width: 100%;
        font-size: 14px;
      }
      .setup-label {
        color: #c0a060;
        font-size: 13px;
        margin-bottom: 4px;
        display: block;
      }
      .setup-row {
        margin-bottom: 12px;
      }
    `;
    document.head.appendChild(style);

    // Event listeners
    document.getElementById('btn-singleplayer')?.addEventListener('click', () => this.showGameSetup());
    document.getElementById('btn-multiplayer')?.addEventListener('click', () => this.showMultiplayerLobby());
    document.getElementById('btn-mapeditor')?.addEventListener('click', () => this.startMapEditor());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
    document.getElementById('btn-help')?.addEventListener('click', () => this.showHelp());
  }

  private showGameSetup(): void {
    const setupEl = document.getElementById('game-setup');
    const buttonsEl = document.getElementById('menu-buttons');
    if (!setupEl || !buttonsEl) return;

    buttonsEl.style.display = 'none';

    // Generate civilization options
    const civOptions = Object.values(CIVILIZATIONS).map((c: any) =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');

    setupEl.style.display = 'block';
    setupEl.innerHTML = `
      <h2 style="color:#f4d03f;margin-bottom:16px;">Game Setup</h2>

      <div class="setup-row">
        <label class="setup-label">Your Civilization</label>
        <select id="setup-civ" class="setup-select">
          <option value="random">Random</option>
          ${civOptions}
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Map Type</label>
        <select id="setup-map" class="setup-select">
          <option value="arabia">Arabia</option>
          <option value="islands">Islands</option>
          <option value="blackForest">Black Forest</option>
          <option value="arena">Arena</option>
          <option value="coastal">Coastal</option>
          <option value="highland">Highland</option>
          <option value="fortress">Fortress</option>
          <option value="rivers">Rivers</option>
          <option value="goldRush">Gold Rush</option>
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Map Size</label>
        <select id="setup-size" class="setup-select">
          <option value="tiny">Tiny (2 players)</option>
          <option value="small" selected>Small (4 players)</option>
          <option value="medium">Medium (6 players)</option>
          <option value="large">Large (8 players)</option>
          <option value="giant">Giant (8 players)</option>
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Difficulty</label>
        <select id="setup-difficulty" class="setup-select">
          <option value="easy">Easy</option>
          <option value="moderate" selected>Moderate</option>
          <option value="hard">Hard</option>
          <option value="hardest">Hardest</option>
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Number of Players</label>
        <select id="setup-players" class="setup-select">
          <option value="2" selected>2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="6">6</option>
          <option value="8">8</option>
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Starting Resources</label>
        <select id="setup-resources" class="setup-select">
          <option value="standard" selected>Standard</option>
          <option value="high">High Resources</option>
          <option value="deathmatch">Deathmatch</option>
        </select>
      </div>

      <div class="setup-row">
        <label class="setup-label">Population Limit</label>
        <select id="setup-poplimit" class="setup-select">
          <option value="75">75</option>
          <option value="100">100</option>
          <option value="150">150</option>
          <option value="200" selected>200</option>
        </select>
      </div>

      <div style="display:flex;gap:12px;margin-top:20px;">
        <button id="btn-start-game" class="menu-btn" style="background:linear-gradient(180deg,#2d5a1e,#1a3a0e);
                border-color:#4a7c3f;">▶️ Start Game</button>
        <button id="btn-back-setup" class="menu-btn">◀️ Back</button>
      </div>
    `;

    document.getElementById('btn-start-game')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-back-setup')?.addEventListener('click', () => {
      setupEl.style.display = 'none';
      buttonsEl.style.display = 'flex';
    });
  }

  private startGame(): void {
    const civSelect = document.getElementById('setup-civ') as HTMLSelectElement;
    const mapSelect = document.getElementById('setup-map') as HTMLSelectElement;
    const sizeSelect = document.getElementById('setup-size') as HTMLSelectElement;
    const diffSelect = document.getElementById('setup-difficulty') as HTMLSelectElement;
    const playersSelect = document.getElementById('setup-players') as HTMLSelectElement;
    const resSelect = document.getElementById('setup-resources') as HTMLSelectElement;
    const popSelect = document.getElementById('setup-poplimit') as HTMLSelectElement;

    let civ = civSelect?.value ?? 'random';
    if (civ === 'random') {
      const civKeys = Object.keys(CIVILIZATIONS);
      civ = civKeys[Math.floor(Math.random() * civKeys.length)];
    }

    const options: GameSetupOptions = {
      playerCiv: civ,
      mapType: (mapSelect?.value ?? 'arabia') as MapType,
      mapSize: (sizeSelect?.value ?? 'small') as any,
      difficulty: (diffSelect?.value ?? 'moderate') as any,
      numPlayers: parseInt(playersSelect?.value ?? '2'),
      startingAge: 'dark',
      startingResources: (resSelect?.value ?? 'standard') as any,
      populationLimit: parseInt(popSelect?.value ?? '200'),
      isMultiplayer: false,
    };

    const mapDims = MAP_SIZES[options.mapSize] ?? MAP_SIZES.small;

    this.showGame();
    this.game.startGame({
      mapType: options.mapType,
      mapWidth: mapDims.width,
      mapHeight: mapDims.height,
      numPlayers: options.numPlayers,
      playerCiv: options.playerCiv,
      difficulty: options.difficulty,
      startingResources: options.startingResources,
      populationLimit: options.populationLimit,
      isMultiplayer: options.isMultiplayer,
      seed: Date.now(),
    });
  }

  private showMultiplayerLobby(): void {
    const buttonsEl = document.getElementById('menu-buttons');
    if (buttonsEl) buttonsEl.style.display = 'none';

    const setupEl = document.getElementById('game-setup');
    if (!setupEl) return;

    setupEl.style.display = 'block';
    setupEl.innerHTML = `
      <h2 style="color:#f4d03f;margin-bottom:16px;">Multiplayer</h2>
      <p style="color:#c0a060;">Connecting to server...</p>
      <div class="setup-row">
        <label class="setup-label">Server Address</label>
        <input id="server-addr" class="setup-input" value="ws://localhost:8080/ws" />
      </div>
      <div class="setup-row">
        <label class="setup-label">Player Name</label>
        <input id="player-name" class="setup-input" value="Player" />
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;">
        <button id="btn-connect" class="menu-btn">🔌 Connect</button>
        <button id="btn-back-mp" class="menu-btn">◀️ Back</button>
      </div>
    `;

    document.getElementById('btn-connect')?.addEventListener('click', () => {
      const addr = (document.getElementById('server-addr') as HTMLInputElement)?.value;
      const name = (document.getElementById('player-name') as HTMLInputElement)?.value;
      if (addr && name) {
        this.game.networkClient?.connect(addr, name);
      }
    });

    document.getElementById('btn-back-mp')?.addEventListener('click', () => {
      setupEl.style.display = 'none';
      if (buttonsEl) buttonsEl.style.display = 'flex';
    });
  }

  private showSettings(): void {
    const buttonsEl = document.getElementById('menu-buttons');
    const settingsEl = document.getElementById('settings-panel');
    if (!buttonsEl || !settingsEl) return;

    buttonsEl.style.display = 'none';
    settingsEl.style.display = 'block';
    settingsEl.innerHTML = `
      <h2 style="color:#f4d03f;margin-bottom:16px;">Settings</h2>

      <div class="setup-row">
        <label class="setup-label">Master Volume</label>
        <input type="range" id="vol-master" min="0" max="100" value="70"
               style="width:100%;accent-color:#f4d03f;" />
      </div>

      <div class="setup-row">
        <label class="setup-label">Music Volume</label>
        <input type="range" id="vol-music" min="0" max="100" value="30"
               style="width:100%;accent-color:#f4d03f;" />
      </div>

      <div class="setup-row">
        <label class="setup-label">SFX Volume</label>
        <input type="range" id="vol-sfx" min="0" max="100" value="60"
               style="width:100%;accent-color:#f4d03f;" />
      </div>

      <div class="setup-row">
        <label class="setup-label">Scroll Speed</label>
        <input type="range" id="scroll-speed" min="1" max="20" value="10"
               style="width:100%;accent-color:#f4d03f;" />
      </div>

      <div class="setup-row" style="display:flex;gap:12px;align-items:center;">
        <input type="checkbox" id="setting-fullscreen" />
        <label for="setting-fullscreen" style="color:#e8d5a3;">Fullscreen</label>
      </div>

      <button id="btn-back-settings" class="menu-btn" style="margin-top:16px;">◀️ Back</button>
    `;

    document.getElementById('vol-music')?.addEventListener('input', (e) => {
      this.game.audioManager?.setMusicVolume(parseInt((e.target as HTMLInputElement).value) / 100);
    });

    document.getElementById('vol-sfx')?.addEventListener('input', (e) => {
      this.game.audioManager?.setSFXVolume(parseInt((e.target as HTMLInputElement).value) / 100);
    });

    document.getElementById('btn-back-settings')?.addEventListener('click', () => {
      settingsEl.style.display = 'none';
      buttonsEl.style.display = 'flex';
    });
  }

  private showHelp(): void {
    const buttonsEl = document.getElementById('menu-buttons');
    const helpEl = document.getElementById('help-panel');
    if (!buttonsEl || !helpEl) return;

    buttonsEl.style.display = 'none';
    helpEl.style.display = 'block';
    helpEl.innerHTML = `
      <h2 style="color:#f4d03f;margin-bottom:16px;">How to Play</h2>
      <div style="color:#c0a060;font-size:13px;line-height:1.6;">
        <h3 style="color:#e8d5a3;">Controls</h3>
        <ul>
          <li><strong>Left Click:</strong> Select units/buildings</li>
          <li><strong>Right Click:</strong> Move, attack, gather</li>
          <li><strong>Drag:</strong> Box select multiple units</li>
          <li><strong>WASD / Arrow Keys:</strong> Scroll camera</li>
          <li><strong>Scroll Wheel:</strong> Zoom in/out</li>
          <li><strong>Ctrl+#:</strong> Create control group</li>
          <li><strong>#:</strong> Select control group</li>
          <li><strong>H:</strong> Select Town Center</li>
          <li><strong>. (period):</strong> Select idle villager</li>
          <li><strong>B:</strong> Open build menu (with villager)</li>
          <li><strong>Delete:</strong> Delete selected unit</li>
          <li><strong>Escape:</strong> Cancel / Deselect</li>
        </ul>

        <h3 style="color:#e8d5a3;">Mobile Controls</h3>
        <ul>
          <li><strong>Tap:</strong> Select</li>
          <li><strong>Double Tap:</strong> Select all of same type</li>
          <li><strong>Long Press:</strong> Right-click action</li>
          <li><strong>One Finger Drag:</strong> Scroll camera</li>
          <li><strong>Pinch:</strong> Zoom</li>
        </ul>

        <h3 style="color:#e8d5a3;">Goal</h3>
        <p>Build your civilization from the Dark Age through the Imperial Age.
        Gather resources, train armies, research technologies, and defeat your opponents!</p>
      </div>

      <button id="btn-back-help" class="menu-btn" style="margin-top:16px;">◀️ Back</button>
    `;

    document.getElementById('btn-back-help')?.addEventListener('click', () => {
      helpEl.style.display = 'none';
      buttonsEl.style.display = 'flex';
    });
  }

  private startMapEditor(): void {
    // Basic map editor setup
    this.game.hudManager?.showNotification('Map Editor coming soon!');
  }

  // ---- In-game overlays ----

  showPauseOverlay(): void {
    let overlay = document.getElementById('pause-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pause-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;
      overlay.innerHTML = `
        <div style="text-align:center;">
          <h2 style="color:#f4d03f;font-size:32px;">PAUSED</h2>
          <button id="btn-resume" class="menu-btn" style="margin:8px;">▶️ Resume</button>
          <button id="btn-quit" class="menu-btn" style="margin:8px;">🚪 Quit to Menu</button>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('btn-resume')?.addEventListener('click', () => {
        this.game.resume();
        this.hidePauseOverlay();
      });

      document.getElementById('btn-quit')?.addEventListener('click', () => {
        this.game.stop();
        this.hidePauseOverlay();
        this.showMainMenu();
      });
    }

    overlay.style.display = 'flex';
  }

  hidePauseOverlay(): void {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  showGameOverOverlay(won: boolean): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    overlay.innerHTML = `
      <div style="text-align:center;">
        <h2 style="color:${won ? '#f4d03f' : '#e74c3c'};font-size:36px;">
          ${won ? '🏆 Victory!' : '💀 Defeat'}
        </h2>
        <p style="color:#c0a060;">Score: ${this.game.resourceSystem.calculateScore(this.game.localPlayerId)}</p>
        <button id="btn-to-menu" class="menu-btn" style="margin-top:16px;">🏠 Main Menu</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-to-menu')?.addEventListener('click', () => {
      overlay.remove();
      this.game.stop();
      this.showMainMenu();
    });
  }

  dispose(): void {}
}
