/**
 * ============================================================
 * BossAISystem — Boss 特殊行为 AI
 * ============================================================
 * Charger:  冲刺 → 暂停 → 冲刺（半血后加速）
 * Mortar:   保持距离，发射慢速 AOE 弹射
 * Summoner: 绕玩家转圈，周期性召唤小兵
 */
import { System, World, Transform, Velocity, Health, Enemy, Player, Sprite, Collider, Projectile, Lifetime } from '@vib/engine';
import { Boss } from '../components/Boss';
import { createEnemy } from '../entities/factories';

export class BossAISystem extends System {
  private readonly MINION_HEALTH = 20;
  private readonly MINION_SPEED = 100;
  private readonly MINION_DAMAGE = 5;
  private readonly MINION_XP = 5;
  private readonly MINION_COLOR = '#fca5a5';

  update(dt: number, world: World): void {
    const players = world.query(Transform, Player);
    if (players.length === 0) return;
    const [, playerTransform] = players[0];
    const px = playerTransform.x;
    const py = playerTransform.y;

    const bosses = world.query(Transform, Velocity, Health, Enemy, Boss);
    for (const [entity, bt, bv, bh, , boss] of bosses) {
      boss.phase = bh.ratio <= 0.5 ? 2 : 1;

      switch (boss.bossType) {
        case 'charger':
          this.updateCharger(boss, bt, bv, px, py, dt);
          break;
        case 'mortar':
          this.updateMortar(boss, bt, bv, px, py, dt, world);
          break;
        case 'summoner':
          this.updateSummoner(boss, bt, bv, px, py, dt, world);
          break;
      }
    }
  }

  // ---- Charger ----
  private updateCharger(
    boss: Boss, bt: Transform, bv: Velocity,
    px: number, py: number, dt: number,
  ): void {
    const cooldown = boss.phase === 2 ? 0.9 : 1.8;
    const chargeSpeed = 500;
    const chargeDuration = 0.5;
    const pauseDuration = 1.2;

    boss.chargeTimer += dt;

    switch (boss.chargeState) {
      case 'idle': {
        const dx = px - bt.x;
        const dy = py - bt.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        boss.chargeDirection = { x: dx / dist, y: dy / dist };
        bv.vx = 0;
        bv.vy = 0;
        if (boss.chargeTimer >= cooldown) {
          boss.chargeTimer = 0;
          boss.chargeState = 'charging';
        }
        break;
      }
      case 'charging': {
        bv.vx = boss.chargeDirection.x * chargeSpeed;
        bv.vy = boss.chargeDirection.y * chargeSpeed;
        if (boss.chargeTimer >= chargeDuration) {
          boss.chargeTimer = 0;
          boss.chargeState = 'cooldown';
        }
        break;
      }
      case 'cooldown': {
        bv.vx = 0;
        bv.vy = 0;
        if (boss.chargeTimer >= pauseDuration) {
          boss.chargeTimer = 0;
          boss.chargeState = 'idle';
          const dx = px - bt.x;
          const dy = py - bt.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          boss.chargeDirection = { x: dx / dist, y: dy / dist };
        }
        break;
      }
    }
  }

  // ---- Mortar ----
  private updateMortar(
    boss: Boss, bt: Transform, bv: Velocity,
    px: number, py: number, dt: number, world: World,
  ): void {
    const preferredDist = 200;
    const dx = px - bt.x;
    const dy = py - bt.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (dist < preferredDist - 20) {
      bv.vx = -(dx / dist) * 60;
      bv.vy = -(dy / dist) * 60;
    } else if (dist > preferredDist + 20) {
      bv.vx = (dx / dist) * 60;
      bv.vy = (dy / dist) * 60;
    } else {
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      bv.vx = Math.cos(angle) * 60;
      bv.vy = Math.sin(angle) * 60;
    }

    const fireRate = boss.phase === 2 ? 1.5 : 2.5;
    boss.specialTimer += dt;
    if (boss.specialTimer >= fireRate) {
      boss.specialTimer = 0;
      const count = boss.phase === 2 ? 5 : 3;
      const baseAngle = Math.atan2(dy, dx);
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.35;
        this.spawnMortarProjectile(world, bt.x, bt.y, baseAngle + spread);
      }
    }
  }

  private spawnMortarProjectile(world: World, x: number, y: number, angle: number): void {
    const entity = world.createEntity();
    world.addComponent(entity, new Transform(x, y));
    world.addComponent(entity, new Velocity(Math.cos(angle) * 120, Math.sin(angle) * 120));
    world.addComponent(entity, new Sprite(10, 10, '#ef4444'));
    world.addComponent(entity, new Collider(10, 10, 7));
    world.addComponent(entity, new Projectile(8, 15, 0, -1));
    world.addComponent(entity, new Lifetime(4));
  }

  // ---- Summoner ----
  private updateSummoner(
    boss: Boss, bt: Transform, bv: Velocity,
    px: number, py: number, dt: number, world: World,
  ): void {
    const orbitDist = 150;
    const orbitSpeed = 1.8;
    const dx = bt.x - px;
    const dy = bt.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // orbit: tangential direction + radial correction
    const currentAngle = Math.atan2(dy, dx);
    const tangentX = -Math.sin(currentAngle);
    const tangentY = Math.cos(currentAngle);
    const radialCorrection = (dist - orbitDist) * 2;

    bv.vx = tangentX * orbitSpeed * 50 - (dx / dist) * radialCorrection;
    bv.vy = tangentY * orbitSpeed * 50 - (dy / dist) * radialCorrection;

    // spawn minions
    const spawnRate = boss.phase === 2 ? 2.0 : 3.5;
    const minionCount = boss.phase === 2 ? 5 : 3;
    boss.specialTimer += dt;
    if (boss.specialTimer >= spawnRate) {
      boss.specialTimer = 0;
      for (let i = 0; i < minionCount; i++) {
        const spawnAngle = (Math.PI * 2 * i) / minionCount;
        const sx = bt.x + Math.cos(spawnAngle) * 35;
        const sy = bt.y + Math.sin(spawnAngle) * 35;
        createEnemy(world, sx, sy, {
          health: this.MINION_HEALTH,
          speed: this.MINION_SPEED,
          damage: this.MINION_DAMAGE,
          xpValue: this.MINION_XP,
          color: this.MINION_COLOR,
        });
      }
    }
  }
}
