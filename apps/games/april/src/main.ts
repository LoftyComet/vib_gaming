/**
 * April 的游戏入口 — 在 src/config.ts 和 src/scenes/GameScene.ts 中开发你的游戏
 */

import { GameLoop } from '@vib/engine';
import { MyGameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = GAME_CONFIG.width;
canvas.height = GAME_CONFIG.height;

const scene = new MyGameScene(canvas);
scene.enter();

const loop = new GameLoop(
  (dt) => scene.update(dt),
  (alpha) => scene.render(alpha)
);

loop.start();
console.log('🌾 四月物语已启动 — WASD 移动，E 交互');
