/**
 * DamageNumberSystem — 浮动伤害数字
 */
import { System, World, CanvasRenderer, Camera, Transform, Player } from '@vib/engine';

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  age: number;
  maxAge: number;
  color: string;
}

export class DamageNumberSystem extends System {
  private numbers: DamageNumber[] = [];
  private renderer: CanvasRenderer;
  private camera: Camera;

  constructor(renderer: CanvasRenderer, camera: Camera) {
    super();
    this.renderer = renderer;
    this.camera = camera;
  }

  spawn(x: number, y: number, value: number, isCrit = false): void {
    this.numbers.push({
      x, y, value,
      age: 0,
      maxAge: 0.8,
      color: isCrit ? '#ffff00' : '#ffffff',
    });
    // cap at 50
    while (this.numbers.length > 50) this.numbers.shift();
  }

  update(dt: number, world: World): void {
    // also listen for enemyHit events to spawn numbers
    // (we handle this via event subscription in setup)
    for (const num of this.numbers) {
      num.age += dt;
      num.y -= 40 * dt; // float up
    }
    this.numbers = this.numbers.filter((n) => n.age < n.maxAge);
  }

  setup(world: World): void {
    world.events.on('enemyHit', (data: unknown) => {
      const d = data as { enemy: number; damage: number };
      const enemyTransform = world.getComponent(d.enemy, Transform);
      if (enemyTransform) {
        this.spawn(enemyTransform.x, enemyTransform.y, d.damage, d.damage >= 20);
      }
    });
    world.events.on('playerHit', (data: unknown) => {
      const d = data as { damage: number };
      const players = world.query(Transform, Player);
      if (players.length > 0) {
        const [, pt] = players[0];
        this.spawn(pt.x, pt.y - 10, d.damage, false);
      }
    });
  }

  render(): void {
    for (const num of this.numbers) {
      const sc = this.camera.worldToScreen(num.x, num.y, this.renderer.width, this.renderer.height);
      const alpha = 1 - num.age / num.maxAge;
      this.renderer.ctx.fillStyle = num.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
      if (num.color.startsWith('#')) {
        this.renderer.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      }
      this.renderer.ctx.font = `bold ${12 + num.value * 0.3}px monospace`;
      this.renderer.ctx.textAlign = 'center';
      this.renderer.ctx.fillText(
        num.value.toString(),
        sc.x,
        sc.y,
      );
    }
  }
}
