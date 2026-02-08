// ============================================================
// Empires Risen - Menu Manager  
// Main menu, game setup, settings, map editor, and overlay screens
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

interface SavedSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  scrollSpeed: number;
  fullscreen: boolean;
  keyBindings: Record<string, string>;
}

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
  'Move Camera Up': 'w',
  'Move Camera Down': 's',
  'Move Camera Left': 'a',
  'Move Camera Right': 'd',
  'Select Town Center': 'h',
  'Idle Villager': '.',
  'Idle Military': ',',
  'Build Menu': 'b',
  'Tech Tree': 't',
  'Toggle Pause': 'F3',
  'Toggle Fullscreen': 'F11',
  'Delete Unit': 'Delete',
  'Deselect': 'Escape',
  'Chat': 'Enter',
};

export class MenuManager {
  private game: Game;
  private mainMenuEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private gameHUD!: HTMLElement;
  private currentScreen: string = 'loading';
  private settings: SavedSettings;

  constructor(game: Game) {
    this.game = game;
    this.settings = this.loadSettings();
  }

  init(): void {
    this.mainMenuEl = document.getElementById('main-menu')!;
    this.loadingEl = document.getElementById('loading-screen')!;
    this.gameHUD = document.getElementById('game-hud')!;

    // Apply saved settings
    this.applySettings();
    this.setupMainMenu();
  }

  private loadSettings(): SavedSettings {
    try {
      const saved = localStorage.getItem('empires-risen-settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      masterVolume: 70,
      musicVolume: 30,
      sfxVolume: 60,
      scrollSpeed: 10,
      fullscreen: false,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
    };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('empires-risen-settings', JSON.stringify(this.settings));
    } catch {}
  }

  private applySettings(): void {
    this.game.audioManager?.setMusicVolume(this.settings.musicVolume / 100);
    this.game.audioManager?.setSFXVolume(this.settings.sfxVolume / 100);
  }

  getKeyBindings(): Record<string, string> {
    return this.settings.keyBindings;
  }

  showMainMenu(): void {
    this.currentScreen = 'mainMenu';
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.mainMenuEl) this.mainMenuEl.style.display = 'flex';
    if (this.gameHUD) this.gameHUD.style.display = 'none';
    this.setupMainMenu();
  }

  showGame(): void {
    this.currentScreen = 'playing';
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.mainMenuEl) this.mainMenuEl.style.display = 'none';
    if (this.gameHUD) this.gameHUD.style.display = 'block';
  }

  private setupMainMenu(): void {
    if (!this.mainMenuEl) return;

    const civKeys = Object.keys(CIVILIZATIONS);
    const randomCivName = CIVILIZATIONS[civKeys[Math.floor(Math.random() * civKeys.length)]]?.name ?? 'Britons';

    this.mainMenuEl.innerHTML = `
      <div style="position:relative;z-index:1;text-align:center;max-width:600px;width:90%;padding:2rem 0;">
        <h1 style="font-family:'Cinzel Decorative','Cinzel',Georgia,serif;font-size:clamp(2.5rem,7vw,4.5rem);font-weight:900;color:var(--gold);text-shadow:0 0 40px rgba(212,169,68,0.4),0 0 80px rgba(212,169,68,0.2),0 4px 12px rgba(0,0,0,0.9);letter-spacing:0.12em;margin-bottom:0.3rem;animation:logoGlow 4s ease-in-out infinite alternate;">
          EMPIRES RISEN
        </h1>
        <p style="font-family:'Cinzel',Georgia,serif;font-size:clamp(0.7rem,2vw,1rem);color:var(--text-dim);letter-spacing:0.4em;text-transform:uppercase;margin-bottom:1.5rem;">
          Rise · Conquer · Rule
        </p>
        <div style="width:200px;height:2px;margin:0 auto 2rem;background:linear-gradient(90deg,transparent,var(--gold-dark),var(--gold),var(--gold-dark),transparent);"></div>

        <div id="menu-buttons" style="display:flex;flex-direction:column;align-items:center;gap:0;">
          <button id="btn-singleplayer" class="menu-btn primary">⚔️ Single Player</button>
          <button id="btn-multiplayer" class="menu-btn">🌐 Multiplayer</button>
          <button id="btn-mapeditor" class="menu-btn">🗺️ Map Editor</button>
          <button id="btn-settings" class="menu-btn secondary">⚙️ Settings</button>
          <button id="btn-keybindings" class="menu-btn secondary">🎮 Key Bindings</button>
          <button id="btn-help" class="menu-btn secondary">📖 How to Play</button>
        </div>

        <div id="menu-panel" style="display:none;"></div>
        
        <p style="margin-top:2rem;font-size:11px;color:#4a4040;font-family:'Cinzel',Georgia,serif;">
          v1.0 · Inspired by Age of Empires II
        </p>
      </div>
    `;

    document.getElementById('btn-singleplayer')?.addEventListener('click', () => this.showGameSetup());
    document.getElementById('btn-multiplayer')?.addEventListener('click', () => this.showMultiplayerLobby());
    document.getElementById('btn-mapeditor')?.addEventListener('click', () => this.showMapEditor());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
    document.getElementById('btn-keybindings')?.addEventListener('click', () => this.showKeyBindings());
    document.getElementById('btn-help')?.addEventListener('click', () => this.showHelp());
  }

  private showPanel(html: string): void {
    const panel = document.getElementById('menu-panel');
    const buttons = document.getElementById('menu-buttons');
    if (!panel || !buttons) return;
    buttons.style.display = 'none';
    panel.style.display = 'block';
    panel.innerHTML = html;
  }

  private hidePanel(): void {
    const panel = document.getElementById('menu-panel');
    const buttons = document.getElementById('menu-buttons');
    if (panel) panel.style.display = 'none';
    if (buttons) buttons.style.display = 'flex';
  }

  private showGameSetup(): void {
    const civOptions = Object.values(CIVILIZATIONS).map((c: any) =>
      `<option value="${c.id}">${c.name} — ${c.bonus ?? ''}</option>`
    ).join('');

    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;max-height:60vh;overflow-y:auto;text-align:left;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:16px;text-align:center;">⚔️ Game Setup</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="setup-row" style="grid-column:1/-1;">
            <label class="setup-label">Civilization</label>
            <select id="setup-civ" class="setup-select">
              <option value="random">🎲 Random</option>
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
            <label class="setup-label">Players</label>
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
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;justify-content:center;">
          <button id="btn-start-game" class="menu-btn primary" style="margin:0;">▶️ Start Game</button>
          <button id="btn-back-setup" class="menu-btn secondary" style="margin:0;">◀️ Back</button>
        </div>
      </div>
    `);

    document.getElementById('btn-start-game')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-back-setup')?.addEventListener('click', () => this.hidePanel());
  }

  private startGame(): void {
    const getValue = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value;

    let civ = getValue('setup-civ') ?? 'random';
    if (civ === 'random') {
      const civKeys = Object.keys(CIVILIZATIONS);
      civ = civKeys[Math.floor(Math.random() * civKeys.length)];
    }

    const options: GameSetupOptions = {
      playerCiv: civ,
      mapType: (getValue('setup-map') ?? 'arabia') as MapType,
      mapSize: (getValue('setup-size') ?? 'small') as any,
      difficulty: (getValue('setup-difficulty') ?? 'moderate') as any,
      numPlayers: parseInt(getValue('setup-players') ?? '2'),
      startingAge: 'dark',
      startingResources: (getValue('setup-resources') ?? 'standard') as any,
      populationLimit: parseInt(getValue('setup-poplimit') ?? '200'),
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
      isMultiplayer: false,
      seed: Date.now(),
    });
  }

  private getWebSocketUrl(): string {
    const loc = window.location;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }
    const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${loc.host}/ws`;
  }

  private showMultiplayerLobby(): void {
    const defaultUrl = this.getWebSocketUrl();

    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;text-align:left;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:16px;text-align:center;">🌐 Multiplayer</h2>

        <div class="setup-row">
          <label class="setup-label">Server Address</label>
          <input id="server-addr" class="setup-input" value="${defaultUrl}" />
        </div>
        <div class="setup-row">
          <label class="setup-label">Player Name</label>
          <input id="player-name" class="setup-input" value="${localStorage.getItem('empires-player-name') || 'Player'}" />
        </div>

        <div id="mp-status" style="color:var(--text-dim);font-size:13px;margin:12px 0;text-align:center;"></div>

        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="btn-connect" class="menu-btn primary" style="margin:0;">🔌 Connect</button>
          <button id="btn-back-mp" class="menu-btn secondary" style="margin:0;">◀️ Back</button>
        </div>
      </div>
    `);

    document.getElementById('btn-connect')?.addEventListener('click', () => {
      const addr = (document.getElementById('server-addr') as HTMLInputElement)?.value;
      const name = (document.getElementById('player-name') as HTMLInputElement)?.value;
      const status = document.getElementById('mp-status');
      if (addr && name) {
        localStorage.setItem('empires-player-name', name);
        if (status) status.textContent = 'Connecting...';
        this.game.networkClient?.connect(addr, name);
      }
    });

    document.getElementById('btn-back-mp')?.addEventListener('click', () => this.hidePanel());
  }

  private showMapEditor(): void {
    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;text-align:left;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:16px;text-align:center;">🗺️ Map Editor</h2>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="setup-row">
            <label class="setup-label">Map Width</label>
            <input id="editor-width" class="setup-input" type="number" value="80" min="40" max="300" />
          </div>
          <div class="setup-row">
            <label class="setup-label">Map Height</label>
            <input id="editor-height" class="setup-input" type="number" value="80" min="40" max="300" />
          </div>
          <div class="setup-row">
            <label class="setup-label">Base Terrain</label>
            <select id="editor-terrain" class="setup-select">
              <option value="arabia">Arabia (Grass)</option>
              <option value="islands">Islands (Water)</option>
              <option value="blackForest">Black Forest</option>
              <option value="coastal">Coastal</option>
            </select>
          </div>
          <div class="setup-row">
            <label class="setup-label">Players</label>
            <select id="editor-players" class="setup-select">
              <option value="2" selected>2</option>
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
            </select>
          </div>
        </div>

        <p style="font-size:12px;color:var(--text-dim);margin:12px 0;text-align:center;">
          The map editor generates a map you can explore. Use the terrain brush tools 
          in the HUD to paint terrain, place resources, and set starting positions.
        </p>

        <div style="display:flex;gap:12px;margin-top:16px;justify-content:center;">
          <button id="btn-start-editor" class="menu-btn primary" style="margin:0;">🎨 Open Editor</button>
          <button id="btn-back-editor" class="menu-btn secondary" style="margin:0;">◀️ Back</button>
        </div>
      </div>
    `);

    document.getElementById('btn-start-editor')?.addEventListener('click', () => {
      const w = parseInt((document.getElementById('editor-width') as HTMLInputElement)?.value) || 80;
      const h = parseInt((document.getElementById('editor-height') as HTMLInputElement)?.value) || 80;
      const terrain = (document.getElementById('editor-terrain') as HTMLSelectElement)?.value || 'arabia';
      const players = parseInt((document.getElementById('editor-players') as HTMLSelectElement)?.value) || 2;
      this.startMapEditorMode(w, h, terrain, players);
    });

    document.getElementById('btn-back-editor')?.addEventListener('click', () => this.hidePanel());
  }

  private startMapEditorMode(width: number, height: number, terrain: string, players: number): void {
    this.showGame();
    this.game.startGame({
      mapType: terrain as any,
      mapWidth: width,
      mapHeight: height,
      numPlayers: players,
      playerCiv: 'britons',
      difficulty: 'easy',
      startingResources: 'deathmatch',
      populationLimit: 200,
      isMultiplayer: false,
      seed: Date.now(),
      mode: 0 as any, // standard mode but acts as sandbox
    });
    this.game.hudManager?.showNotification('Map Editor Mode — Place buildings, units, and explore!', '#d4a944');
  }

  private showSettings(): void {
    const s = this.settings;
    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;text-align:left;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:16px;text-align:center;">⚙️ Settings</h2>

        <div class="setup-row">
          <label class="setup-label">Master Volume: <span id="vol-master-val">${s.masterVolume}</span>%</label>
          <input type="range" id="vol-master" min="0" max="100" value="${s.masterVolume}"
                 style="width:100%;accent-color:var(--gold);cursor:pointer;" />
        </div>
        <div class="setup-row">
          <label class="setup-label">Music Volume: <span id="vol-music-val">${s.musicVolume}</span>%</label>
          <input type="range" id="vol-music" min="0" max="100" value="${s.musicVolume}"
                 style="width:100%;accent-color:var(--gold);cursor:pointer;" />
        </div>
        <div class="setup-row">
          <label class="setup-label">SFX Volume: <span id="vol-sfx-val">${s.sfxVolume}</span>%</label>
          <input type="range" id="vol-sfx" min="0" max="100" value="${s.sfxVolume}"
                 style="width:100%;accent-color:var(--gold);cursor:pointer;" />
        </div>
        <div class="setup-row">
          <label class="setup-label">Scroll Speed: <span id="scroll-speed-val">${s.scrollSpeed}</span></label>
          <input type="range" id="scroll-speed" min="1" max="20" value="${s.scrollSpeed}"
                 style="width:100%;accent-color:var(--gold);cursor:pointer;" />
        </div>
        <div class="setup-row" style="display:flex;gap:12px;align-items:center;cursor:pointer;" id="fullscreen-toggle">
          <input type="checkbox" id="setting-fullscreen" ${s.fullscreen ? 'checked' : ''} style="accent-color:var(--gold);width:18px;height:18px;cursor:pointer;" />
          <label for="setting-fullscreen" style="color:var(--parchment);cursor:pointer;font-size:14px;">Fullscreen Mode</label>
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;justify-content:center;">
          <button id="btn-save-settings" class="menu-btn primary" style="margin:0;">💾 Save</button>
          <button id="btn-back-settings" class="menu-btn secondary" style="margin:0;">◀️ Back</button>
        </div>
      </div>
    `);

    // Live update labels
    const bindSlider = (id: string, valId: string, cb: (val: number) => void) => {
      document.getElementById(id)?.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        const label = document.getElementById(valId);
        if (label) label.textContent = String(val);
        cb(val);
      });
    };

    bindSlider('vol-master', 'vol-master-val', (v) => { this.settings.masterVolume = v; });
    bindSlider('vol-music', 'vol-music-val', (v) => {
      this.settings.musicVolume = v;
      this.game.audioManager?.setMusicVolume(v / 100);
    });
    bindSlider('vol-sfx', 'vol-sfx-val', (v) => {
      this.settings.sfxVolume = v;
      this.game.audioManager?.setSFXVolume(v / 100);
    });
    bindSlider('scroll-speed', 'scroll-speed-val', (v) => { this.settings.scrollSpeed = v; });

    document.getElementById('setting-fullscreen')?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.settings.fullscreen = checked;
      if (checked && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!checked && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
      this.applySettings();
      this.hidePanel();
    });
    document.getElementById('btn-back-settings')?.addEventListener('click', () => this.hidePanel());
  }

  private showKeyBindings(): void {
    const bindings = this.settings.keyBindings;
    let rows = '';
    for (const [action, key] of Object.entries(bindings)) {
      rows += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(30,25,20,0.6);border:1px solid var(--border);border-radius:4px;">
          <span style="color:var(--text);font-size:13px;">${action}</span>
          <button class="keybind-key" data-action="${action}" style="background:var(--wood-med);padding:4px 12px;border-radius:3px;border:1px solid var(--border-highlight);font-family:monospace;color:var(--gold);font-size:13px;min-width:50px;text-align:center;cursor:pointer;">
            ${key}
          </button>
        </div>`;
    }

    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;text-align:left;max-height:60vh;overflow-y:auto;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:8px;text-align:center;">🎮 Key Bindings</h2>
        <p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:16px;">Click a key to rebind. Press the new key to assign.</p>

        <div style="display:grid;grid-template-columns:1fr;gap:6px;">
          ${rows}
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;justify-content:center;">
          <button id="btn-reset-keys" class="menu-btn" style="margin:0;font-size:0.85rem;">🔄 Reset Defaults</button>
          <button id="btn-save-keys" class="menu-btn primary" style="margin:0;">💾 Save</button>
          <button id="btn-back-keys" class="menu-btn secondary" style="margin:0;">◀️ Back</button>
        </div>
      </div>
    `);

    // Keybind editing
    let activeBtn: HTMLButtonElement | null = null;
    const keyHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (!activeBtn) return;
      const action = activeBtn.dataset.action!;
      this.settings.keyBindings[action] = e.key;
      activeBtn.textContent = e.key;
      activeBtn.style.borderColor = 'var(--green)';
      setTimeout(() => { if (activeBtn) activeBtn.style.borderColor = 'var(--border-highlight)'; }, 500);
      activeBtn = null;
      window.removeEventListener('keydown', keyHandler);
    };

    document.querySelectorAll('.keybind-key').forEach(btn => {
      btn.addEventListener('click', () => {
        if (activeBtn) { activeBtn.style.borderColor = 'var(--border-highlight)'; }
        activeBtn = btn as HTMLButtonElement;
        activeBtn.textContent = '...';
        activeBtn.style.borderColor = 'var(--gold)';
        window.addEventListener('keydown', keyHandler);
      });
    });

    document.getElementById('btn-reset-keys')?.addEventListener('click', () => {
      this.settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.showKeyBindings();
    });
    document.getElementById('btn-save-keys')?.addEventListener('click', () => {
      this.saveSettings();
      this.hidePanel();
    });
    document.getElementById('btn-back-keys')?.addEventListener('click', () => this.hidePanel());
  }

  private showHelp(): void {
    this.showPanel(`
      <div style="background:rgba(15,12,8,0.6);border:1px solid var(--border);border-radius:8px;padding:20px;text-align:left;max-height:60vh;overflow-y:auto;">
        <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:1.5rem;margin-bottom:16px;text-align:center;">📖 How to Play</h2>
        <div style="color:#c0a060;font-size:13px;line-height:1.7;">
          <h3 style="color:var(--parchment);margin:12px 0 6px;">🎮 PC Controls</h3>
          <ul style="padding-left:20px;">
            <li><b>Left Click:</b> Select units/buildings</li>
            <li><b>Right Click:</b> Move, attack, gather</li>
            <li><b>Drag:</b> Box select multiple units</li>
            <li><b>WASD / Arrow Keys:</b> Scroll camera</li>
            <li><b>Scroll Wheel:</b> Zoom in/out</li>
            <li><b>Ctrl+#:</b> Create control group</li>
            <li><b>#:</b> Select control group</li>
            <li><b>H:</b> Select Town Center</li>
            <li><b>. (period):</b> Select idle villager</li>
            <li><b>, (comma):</b> Select idle military</li>
            <li><b>B:</b> Open build menu (with villager)</li>
            <li><b>T:</b> Open technology tree</li>
            <li><b>Delete:</b> Delete selected</li>
            <li><b>F3:</b> Pause / F11: Fullscreen</li>
          </ul>
          <h3 style="color:var(--parchment);margin:12px 0 6px;">📱 Mobile Controls</h3>
          <ul style="padding-left:20px;">
            <li><b>Tap:</b> Select</li>
            <li><b>Double Tap:</b> Select all of same type</li>
            <li><b>Long Press:</b> Right-click action</li>
            <li><b>One Finger Drag:</b> Scroll camera</li>
            <li><b>Pinch:</b> Zoom in/out</li>
            <li>Use floating buttons for build, attack, idle units</li>
          </ul>
          <h3 style="color:var(--parchment);margin:12px 0 6px;">🏗️ Getting Started</h3>
          <ol style="padding-left:20px;">
            <li>Select Town Center (H) → train Villagers</li>
            <li>Send villagers to gather food & wood</li>
            <li>Build Houses for more population</li>
            <li>Build Barracks → train military</li>
            <li>Research Loom at TC for villager protection</li>
            <li>Advance to Feudal Age (500 food)</li>
          </ol>
          <h3 style="color:var(--parchment);margin:12px 0 6px;">⚔️ Combat</h3>
          <ul style="padding-left:20px;">
            <li>Spearmen ➜ counter Cavalry</li>
            <li>Cavalry ➜ counter Archers</li>
            <li>Archers ➜ counter Infantry</li>
            <li>Siege weapons deal bonus vs buildings</li>
            <li>Monks can convert enemy units</li>
          </ul>
          <h3 style="color:var(--parchment);margin:12px 0 6px;">📊 Age Costs</h3>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr style="border-bottom:1px solid var(--border);"><td style="padding:4px;color:var(--gold);">Feudal Age</td><td style="padding:4px;">500 Food</td></tr>
            <tr style="border-bottom:1px solid var(--border);"><td style="padding:4px;color:var(--gold);">Castle Age</td><td style="padding:4px;">800 Food, 200 Gold</td></tr>
            <tr><td style="padding:4px;color:var(--gold);">Imperial Age</td><td style="padding:4px;">1000 Food, 800 Gold</td></tr>
          </table>
          <h3 style="color:var(--parchment);margin:12px 0 6px;">🏆 Victory</h3>
          <p>Destroy all enemy Town Centers and military units!</p>
        </div>
        <button id="btn-back-help" class="menu-btn secondary" style="margin-top:16px;">◀️ Back</button>
      </div>
    `);

    document.getElementById('btn-back-help')?.addEventListener('click', () => this.hidePanel());
  }

  // ---- Session Save/Restore ----

  saveGameState(): void {
    if (!this.game.state) return;
    try {
      const state = {
        tick: this.game.state.tick,
        timeElapsed: this.game.state.timeElapsed,
        phase: this.game.state.phase,
        gameSpeed: this.game.state.gameSpeed,
        players: (Array.from(this.game.state.players.entries()) as any[]).map(([id, p]: [any, any]) => ({
          ...p,
          researchedTechs: Array.from(p.researchedTechs),
          exploredTiles: [], // too large to save
          idleVillagers: p.idleVillagers,
          militaryUnits: p.militaryUnits,
          buildings: p.buildings,
        })),
        timestamp: Date.now(),
      };
      sessionStorage.setItem('empires-risen-save', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  hasResumableGame(): boolean {
    return sessionStorage.getItem('empires-risen-save') !== null;
  }

  clearSavedGame(): void {
    sessionStorage.removeItem('empires-risen-save');
  }

  // ---- In-game overlays ----

  showPauseOverlay(): void {
    let overlay = document.getElementById('pause-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pause-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1500;';
      overlay.innerHTML = `
        <div style="text-align:center;background:rgba(20,16,10,0.95);border:2px solid var(--border);border-radius:12px;padding:30px 40px;">
          <h2 style="font-family:'Cinzel',Georgia,serif;color:var(--gold);font-size:2rem;margin-bottom:20px;text-shadow:0 0 20px rgba(212,169,68,0.4);">⏸️ PAUSED</h2>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button id="btn-resume" class="menu-btn primary" style="margin:0;">▶️ Resume</button>
            <button id="btn-save-quit" class="menu-btn" style="margin:0;">💾 Save & Quit</button>
            <button id="btn-quit" class="menu-btn secondary" style="margin:0;">🚪 Quit to Menu</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('btn-resume')?.addEventListener('click', () => {
        this.game.resume();
        this.hidePauseOverlay();
      });
      document.getElementById('btn-save-quit')?.addEventListener('click', () => {
        this.saveGameState();
        this.game.stop();
        this.hidePauseOverlay();
        this.showMainMenu();
      });
      document.getElementById('btn-quit')?.addEventListener('click', () => {
        this.clearSavedGame();
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
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:2000;animation:fadeIn 0.5s;';
    const titleColor = won ? 'var(--gold)' : 'var(--red)';
    overlay.innerHTML = `
      <div style="text-align:center;background:rgba(20,16,10,0.95);border:2px solid ${won ? 'var(--gold)' : 'var(--red)'};border-radius:12px;padding:40px 50px;">
        <h2 style="font-family:'Cinzel Decorative','Cinzel',Georgia,serif;color:${titleColor};font-size:2.5rem;margin-bottom:8px;text-shadow:0 0 30px ${titleColor}80;">
          ${won ? '🏆 VICTORY 🏆' : '💀 DEFEAT 💀'}
        </h2>
        <p style="color:var(--text-dim);margin-bottom:24px;">
          Score: ${this.game.resourceSystem?.calculateScore(this.game.localPlayerId) ?? 0}
        </p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="btn-to-menu" class="menu-btn" style="margin:0;">🏠 Main Menu</button>
          <button id="btn-rematch" class="menu-btn primary" style="margin:0;">🔄 Play Again</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-to-menu')?.addEventListener('click', () => {
      overlay.remove();
      this.game.stop();
      this.showMainMenu();
    });
    document.getElementById('btn-rematch')?.addEventListener('click', () => {
      overlay.remove();
      this.game.stop();
      this.showMainMenu();
    });
  }

  dispose(): void {}
}
