/**
 * ============================================================
 * ContactDamageSystem — 敌人接触玩家造成伤害
 * ============================================================
 * 1. 监听碰撞事件，检测 Enemy↔Player 直接接触
 * 2. 对玩家造成伤害 + 短暂无敌 + 击退敌人
 * 3. 每帧递减所有 Health 组件的 invincibleTimer
 */
import { System } from '@vib/engine';
import type { World } from '@vib/engine';
import { Transform } from '@vib/engine';
import { Health } from '@vib/engine';
import { Enemy } from '@vib/engine';
import { Player } from '@vib/engine';

export class ContactDamageSystem extends System {
  private contactCooldown = 0.3; // 秒，接触伤害间隔
  private knockbackDist = 25; // 击退距离

  /** 在进入场景后调用，连接碰撞事件 */
  setup(world: World): void {
    world.events.on('collision', (data: unknown) => {
      const { entityA, entityB } = data as { entityA: number; entityB: number };

      for (const [a, b] of [[entityA, entityB] as const, [entityB, entityA] as const]) {
        const enemyComp = world.getComponent(a, Enemy);
        const playerComp = world.getComponent(b, Player);
        if (!enemyComp || !playerComp) continue;

        const health = world.getComponent(b, Health);
        if (!health || health.invincibleTimer > 0) continue;

        // 造成伤害
        health.damage(enemyComp.damage);
        health.invincibleTimer = this.contactCooldown;
        world.events.emit('playerHit', { damage: enemyComp.damage });

        // 击退敌人
        const tA = world.getComponent(a, Transform);
        const tB = world.getComponent(b, Transform);
        if (tA && tB) {
          const dx = tA.x - tB.x;
          const dy = tA.y - tB.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          tA.x = tB.x + (dx / dist) * this.knockbackDist;
          tA.y = tB.y + (dy / dist) * this.knockbackDist;
        }
      }
    });
  }

  /** 每帧递减所有实体的无敌计时器 */
  update(dt: number, world: World): void {
    const entities = world.query(Health);
    for (const [, health] of entities) {
      health.invincibleTimer = Math.max(0, health.invincibleTimer - dt);
    }
  }
}
