import { Game } from './game';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const game = new Game(canvas);

// Title / start overlay.
const titleScreen = document.getElementById('title-screen')!;
const hudEl = document.getElementById('hud')!;
document.getElementById('start-btn')!.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  hudEl.classList.remove('hidden');
  game.start();
});
