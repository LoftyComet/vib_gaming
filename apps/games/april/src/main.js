/**
 * April 的游戏入口 — 在 src/config.ts 和 src/scenes/GameScene.ts 中开发你的游戏
 */
import { GameLoop } from '@vib/engine';
import { MyGameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';
const canvas = document.getElementById('game-canvas');
canvas.width = GAME_CONFIG.width;
canvas.height = GAME_CONFIG.height;
const scene = new MyGameScene(canvas);
const loop = new GameLoop((dt) => scene.update(dt), (alpha) => scene.render(alpha));
loop.start();
console.log('🎮 April 的游戏已启动！');
//# sourceMappingURL=main.js.map