// ============================================================
// Empires Risen - Main Entry Point
// Bootstrap the game engine, UI, and connect everything
// ============================================================

import { Game } from './engine/Game';
import { MenuManager } from './ui/MenuManager';

async function main() {
  const loadingBar = document.getElementById('loading-bar') as HTMLDivElement;
  const loadingText = document.getElementById('loading-text') as HTMLDivElement;
  const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;

  function updateLoading(progress: number, text: string) {
    loadingBar.style.width = `${progress}%`;
    loadingText.textContent = text;
  }

  try {
    updateLoading(10, 'Initializing engine...');
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const game = new Game(canvas);

    updateLoading(30, 'Loading assets...');
    await game.init();

    updateLoading(60, 'Generating terrain...');
    await new Promise(r => setTimeout(r, 200));

    updateLoading(80, 'Preparing UI...');
    // MenuManager is already initialized inside game.init()

    updateLoading(100, 'Ready!');
    await new Promise(r => setTimeout(r, 500));

    // Hide loading screen and show menu
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      game.menuManager.showMainMenu();
    }, 500);

    // Make game globally accessible for debugging
    (window as any).__game = game;
  } catch (error) {
    console.error('Failed to initialize game:', error);
    updateLoading(0, `Error: ${error}`);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
