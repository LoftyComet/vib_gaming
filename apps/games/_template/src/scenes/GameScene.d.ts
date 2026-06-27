/**
 * ============================================================
 * 游戏主场景 — 在这里组装你的游戏！
 * ============================================================
 * 这是你主要修改的文件：
 *   - 添加自定义武器类型
 *   - 添加自定义敌人行为
 *   - 添加升级选择界面
 *   - 添加特效和音效
 *
 * Query 模式：world.query() 返回元组数组 [entity, comp1, comp2, ...]
 *   使用数组解构: for (const [entity, transform, velocity] of results)
 */
import { Scene } from '@vib/engine';
export declare class MyGameScene extends Scene {
    private canvas;
    private renderer;
    private camera;
    private input;
    private bridge;
    private playerId;
    private xpSystem;
    private score;
    private kills;
    private gameOver;
    private startTime;
    private showUpgradeMenu;
    constructor(canvas: HTMLCanvasElement);
    enter(): void;
    private setupEventHandlers;
    private onLevelUp;
    private checkGameOver;
    private restart;
    update(dt: number): void;
    render(_alpha: number): void;
    private drawGrid;
    private drawHUD;
    private drawUpgradeMenu;
}
//# sourceMappingURL=GameScene.d.ts.map