/**
 * Mecha Survival — 机甲割草游戏入口
 * 科幻机甲主题，3种武器切换，消灭外星机器人！
 */

import { GameLoop } from '@vib/engine';
import { GameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = GAME_CONFIG.width;
canvas.height = GAME_CONFIG.height;

const scene = new GameScene(canvas);
scene.enter();

const loop = new GameLoop(
  (dt) => scene.update(dt),
  (alpha) => scene.render(alpha),
);

loop.start();
console.log('🤖 机甲已就绪！WASD 移动 | 1/2/3 切换武器');
