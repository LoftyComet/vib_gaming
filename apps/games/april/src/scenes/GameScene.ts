/**
 * April 的游戏主场景 — 在这里组装实体与系统
 */

import {
  Scene,
  InputManager,
  CanvasRenderer,
  Camera,
  PortalBridge,
  Transform,
  Velocity,
  Health,
  Collider,
  Weapon,
  Player,
  Experience,
  Sprite,
  PlayerMovementSystem,
  MovementSystem,
  RenderSystem,
} from '@vib/engine';
import { GAME_CONFIG, PLAYER_CONFIG, DEFAULT_WEAPON, XP_CONFIG } from '../config';

export class MyGameScene extends Scene {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private input: InputManager;
  private bridge: PortalBridge;
  private playerId = 0;
  private startTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.camera = new Camera(0, 0, 1.2);
    this.input = new InputManager(canvas);
    this.bridge = new PortalBridge();
    this.startTime = performance.now();
  }

  enter(): void {
    this.playerId = this.world.createEntity();
    this.world.addComponent(this.playerId, new Transform(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2));
    this.world.addComponent(this.playerId, new Velocity(0, 0));
    this.world.addComponent(this.playerId, new Health(PLAYER_CONFIG.maxHealth, PLAYER_CONFIG.maxHealth));
    this.world.addComponent(this.playerId, new Player(PLAYER_CONFIG.speed));
    this.world.addComponent(this.playerId, new Sprite(PLAYER_CONFIG.size, PLAYER_CONFIG.size, PLAYER_CONFIG.color));
    this.world.addComponent(this.playerId, new Collider(14, 14, 8));
    this.world.addComponent(
      this.playerId,
      new Weapon(
        DEFAULT_WEAPON.cooldown,
        DEFAULT_WEAPON.range,
        DEFAULT_WEAPON.damage,
        DEFAULT_WEAPON.projectileSpeed,
        DEFAULT_WEAPON.projectileCount,
        0,
        DEFAULT_WEAPON.pierce
      )
    );
    this.world.addComponent(this.playerId, new Experience(0, XP_CONFIG.baseXP, 1));

    this.world.addSystem(new PlayerMovementSystem(this.input));
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new RenderSystem(this.renderer, this.camera));

    this.bridge.onCommand((cmd) => {
      if (cmd.type === 'RESTART') this.restart();
    });
  }

  private restart(): void {
    this.startTime = performance.now();
    this.world.clear();
    this.enter();
  }

  update(dt: number): void {
    this.world.update(dt);

    const playerTransform = this.world.getComponent(this.playerId, Transform);
    if (playerTransform) {
      this.camera.lookAt(playerTransform.x, playerTransform.y);
      this.camera.update(dt);
    }

    const survivalTime = (performance.now() - this.startTime) / 1000;
    this.bridge.reportScore({
      score: 0,
      kills: 0,
      survivalTime: Math.floor(survivalTime),
      level: this.world.getComponent(this.playerId, Experience)?.level ?? 1,
    });
  }

  render(_alpha: number): void {
    this.renderer.clear('#1a1a2e');
    this.renderer.drawText(
      'April 的游戏 — 在 GameScene.ts 中继续开发',
      this.renderer.width / 2,
      this.renderer.height / 2,
      '#9ca3af',
      16,
      'center'
    );
  }
}
