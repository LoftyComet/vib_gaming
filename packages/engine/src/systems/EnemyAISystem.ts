import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { Enemy } from '../components/Enemy';
import { Player } from '../components/Player';
import { Projectile } from '../components/Projectile';
import { Sprite } from '../components/Sprite';

/**
 * 敌人 AI 系统 — 支持多种敌人行为模式：
 * - chaser: 直线追踪玩家（默认）
 * - runner: 高速冲刺穿过玩家，冷却后重新定向
 * - tank: 慢速追踪，死后分裂
 * - shooter: 保持距离，远程射击
 * - swarmer: 快速追踪，带有随机偏移
 */
export class EnemyAISystem extends System {
  update(dt: number, world: World): void {
    // Find the player position
    const players = world.query(Transform, Player);
    if (players.length === 0) return;

    const playerPos = players[0][1]; // [entity, transform, player]
    const enemies = world.query(Transform, Velocity, Enemy);

    for (const [entity, transform, velocity, enemy] of enemies) {
      const dx = playerPos.x - transform.x;
      const dy = playerPos.y - transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      switch (enemy.enemyType) {
        case 'chaser':
          this.updateChaser(enemy, velocity, dx, dy, dist);
          break;
        case 'runner':
          this.updateRunner(enemy, velocity, dx, dy, dist, dt);
          break;
        case 'tank':
          this.updateTank(enemy, velocity, dx, dy, dist);
          break;
        case 'shooter':
          this.updateShooter(enemy, velocity, transform, playerPos, dx, dy, dist, dt, world);
          break;
        case 'swarmer':
          this.updateSwarmer(enemy, velocity, dx, dy, dist);
          break;
        default:
          this.updateChaser(enemy, velocity, dx, dy, dist);
      }
    }
  }

  /** 追踪者：直线追向玩家 */
  private updateChaser(enemy: Enemy, velocity: Velocity, dx: number, dy: number, dist: number): void {
    if (dist > 0) {
      velocity.vx = (dx / dist) * enemy.speed;
      velocity.vy = (dy / dist) * enemy.speed;
    }
  }

  /** 冲刺者：高速直线冲刺穿过玩家，有冷却 */
  private updateRunner(enemy: Enemy, velocity: Velocity, dx: number, dy: number, dist: number, dt: number): void {
    // 冲刺冷却中 — 减速或停住
    if (enemy.chargeTimer > 0) {
      enemy.chargeTimer -= dt;
      velocity.vx *= 0.95;
      velocity.vy *= 0.95;
      return;
    }

    // 准备冲刺 — 面向玩家全速冲刺
    if (dist > 0) {
      const spd = enemy.chargeSpeed;
      velocity.vx = (dx / dist) * spd;
      velocity.vy = (dy / dist) * spd;
    }

    // 如果已经非常接近玩家（穿过），开始冷却
    if (dist < 40) {
      enemy.chargeTimer = enemy.chargeCooldown;
    }
  }

  /** 坦克：慢速追踪 */
  private updateTank(enemy: Enemy, velocity: Velocity, dx: number, dy: number, dist: number): void {
    if (dist > 0) {
      velocity.vx = (dx / dist) * enemy.speed;
      velocity.vy = (dy / dist) * enemy.speed;
    }
  }

  /** 射手：保持300px距离，冷却完毕时发射投射物 */
  private updateShooter(
    enemy: Enemy, velocity: Velocity, transform: Transform,
    playerPos: Transform, dx: number, dy: number, dist: number,
    dt: number, world: World
  ): void {
    // 保持距离：太近则远离，太远则靠近
    const idealDist = 300;
    if (dist > 0) {
      if (dist < idealDist - 50) {
        // 远离玩家
        velocity.vx = -(dx / dist) * enemy.speed;
        velocity.vy = -(dy / dist) * enemy.speed;
      } else if (dist > idealDist + 50) {
        // 靠近玩家
        velocity.vx = (dx / dist) * enemy.speed;
        velocity.vy = (dy / dist) * enemy.speed;
      } else {
        // 保持位置
        velocity.vx = 0;
        velocity.vy = 0;
      }
    }

    // 射击冷却
    enemy.shootTimer = Math.max(0, enemy.shootTimer - dt);
    if (enemy.shootTimer <= 0) {
      enemy.shootTimer = enemy.shootCooldown;

      // 生成敌方投射物
      const projEntity = world.createEntity();
      world.addComponent(projEntity, new Transform(transform.x, transform.y));

      const fireAngle = Math.atan2(dy, dx);
      world.addComponent(projEntity, new Velocity(
        Math.cos(fireAngle) * enemy.projectileSpeed,
        Math.sin(fireAngle) * enemy.projectileSpeed
      ));

      // ownerId = -1 标记为敌方投射物
      world.addComponent(projEntity, new Projectile(5, enemy.damage, 0, -1));
      world.addComponent(projEntity, new Sprite(6, 6, '#ef4444'));
    }
  }

  /** 蜂群：快速追踪带随机偏移 */
  private updateSwarmer(enemy: Enemy, velocity: Velocity, dx: number, dy: number, dist: number): void {
    if (dist > 0) {
      // 基础追踪方向 + 随机偏移
      const jitterAngle = (Math.random() - 0.5) * 0.6; // ±0.3 弧度
      const baseAngle = Math.atan2(dy, dx);
      const finalAngle = baseAngle + jitterAngle;

      velocity.vx = Math.cos(finalAngle) * enemy.speed;
      velocity.vy = Math.sin(finalAngle) * enemy.speed;
    }
  }
}
