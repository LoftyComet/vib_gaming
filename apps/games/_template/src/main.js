/**
 * ============================================================
 * 游戏入口 — 复制此模板到 apps/games/<your-name>/ 开始开发！
 * ============================================================
 *
 * 这个模板提供了一个完整的 Vampire Survivors 风格割草游戏骨架。
 * 你可以自定义：
 *   1. src/config.ts — 游戏参数（速度、伤害、波次等）
 *   2. src/scenes/GameScene.ts — 游戏场景逻辑（添加你的武器、敌人）
 */
import { GameLoop } from '@vib/engine';
import { MyGameScene } from './scenes/GameScene';
import { GAME_CONFIG } from './config';
// 获取 canvas 并设置尺寸
const canvas = document.getElementById('game-canvas');
canvas.width = GAME_CONFIG.width;
canvas.height = GAME_CONFIG.height;
// 创建游戏场景
const scene = new MyGameScene(canvas);
// 游戏循环：固定时间步长更新 + 可变渲染
const loop = new GameLoop(
// Update: 每秒固定60次
(dt) => scene.update(dt), 
// Render: 每帧渲染一次，alpha 用于插值
(alpha) => scene.render(alpha));
// 启动！
loop.start();
console.log('🎮 游戏已启动！击杀敌人，收集经验，不断变强！');
//# sourceMappingURL=main.js.map