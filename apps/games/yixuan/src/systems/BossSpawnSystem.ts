/**
 * ============================================================
 * BossSpawnSystem — 在指定时间点生成 Boss
 * ============================================================
 */
import { System, World, Transform, Velocity, Health, Enemy, Player, Sprite, Collider } from '@vib/engine';
import { Boss, type BossType } from '../components/Boss';

export interface BossWaveConfig {
  startTime: number;
  bossType: BossType;
  health: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: string;
  size: number;
  specialCooldown: number;
}

export class BossSpawnSystem extends System {
  private spawned = new Set<number>();
  private elapsed = 0;

  constructor(private waves: BossWaveConfig[]) {
    super();
  }

  update(dt: number, world: World): void {
    this.elapsed += dt;

    const players = world.query(Transform, Player);
    if (players.length === 0) return;
    const [, pt] = players[0];

    for (let i = 0; i < this.waves.length; i++) {
      if (this.spawned.has(i)) continue;
      if (this.elapsed >= this.waves[i].startTime) {
        this.spawned.add(i);
        this.spawnBoss(world, this.waves[i], pt.x, pt.y);
      }
    }
  }

  private spawnBoss(world: World, cfg: BossWaveConfig, playerX: number, playerY: number): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 100;
    const x = playerX + Math.cos(angle) * dist;
    const y = playerY + Math.sin(angle) * dist;

    const entity = world.createEntity();
    world.addComponent(entity, new Transform(x, y));
    world.addComponent(entity, new Velocity(0, 0));
    world.addComponent(entity, new Health(cfg.health, cfg.health));
    world.addComponent(entity, new Enemy(cfg.xpValue, cfg.damage, cfg.speed));
    world.addComponent(entity, new Sprite(cfg.size, cfg.size, cfg.color));
    world.addComponent(entity, new Collider(cfg.size * 0.8, cfg.size * 0.8, cfg.size * 0.45));
    world.addComponent(entity, new Boss(cfg.bossType, cfg.specialCooldown));

    console.log(`👾 Boss 出现: ${cfg.bossType} at (${Math.floor(x)}, ${Math.floor(y)})`);
    world.events.emit('bossSpawned', { entity, bossType: cfg.bossType, position: { x, y } });
  }

  reset(): void {
    this.spawned.clear();
    this.elapsed = 0;
  }
}
