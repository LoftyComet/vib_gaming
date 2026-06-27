/**
 * April 的游戏主场景 — 在这里组装实体与系统
 */
import { Scene } from '@vib/engine';
export declare class MyGameScene extends Scene {
    private canvas;
    private renderer;
    private camera;
    private input;
    private bridge;
    private playerId;
    private startTime;
    constructor(canvas: HTMLCanvasElement);
    enter(): void;
    private restart;
    update(dt: number): void;
    render(_alpha: number): void;
}
//# sourceMappingURL=GameScene.d.ts.map