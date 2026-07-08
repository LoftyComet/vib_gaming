import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { ChainWeapon } from '../components/ChainWeapon';
import { Enemy } from '../components/Enemy';
import { Health } from '../components/Health';

/**
 * 连锁闪电系统 — 击中一个敌人后跳转到附近其他敌人
 */
export class ChainLightningSystem extends System {
  update(dt: number, world: World): void {
    const chainUsers = world.query(Transform, ChainWeapon);

    for (const [, ownerTransform, chain] of chainUsers) {
      // 冷却计时
      chain.timer = Math.max(0, chain.timer - dt);

      if (!chain.ready) continue;

      // 收集所有存活敌人
      const aliveEnemies: { entity: number; transform: Transform; health: Health }[] = [];
      for (const [entity, transform, , health] of world.query(Transform, Enemy, Health)) {
        if (health.alive) {
          aliveEnemies.push({ entity, transform, health });
        }
      }

      if (aliveEnemies.length === 0) continue;

      // 找最近的敌人作为第一个目标
      let firstTarget: typeof aliveEnemies[0] | null = null;
      let firstDist = Infinity;

      for (const e of aliveEnemies) {
        const dx = e.transform.x - ownerTransform.x;
        const dy = e.transform.y - ownerTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < firstDist && dist <= chain.range) {
          firstDist = dist;
          firstTarget = e;
        }
      }

      if (!firstTarget) continue;

      // 构建连锁
      const chained: typeof aliveEnemies[0][] = [firstTarget];
      const usedIds = new Set<number>([firstTarget.entity]);
      chain.chainTargets = [{ x: ownerTransform.x, y: ownerTransform.y }, { x: firstTarget.transform.x, y: firstTarget.transform.y }];

      // 从上一个目标跳转到最近的未使用敌人
      for (let i = 1; i < chain.chainCount; i++) {
        const prevTarget = chained[chained.length - 1];
        let nextTarget: typeof aliveEnemies[0] | null = null;
        let nextDist = chain.chainRange;

        for (const e of aliveEnemies) {
          if (usedIds.has(e.entity)) continue;
          const dx = e.transform.x - prevTarget.transform.x;
          const dy = e.transform.y - prevTarget.transform.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nextDist) {
            nextDist = dist;
            nextTarget = e;
          }
        }

        if (!nextTarget) break;

        chained.push(nextTarget);
        usedIds.add(nextTarget.entity);
        chain.chainTargets.push({ x: nextTarget.transform.x, y: nextTarget.transform.y });
      }

      // 对所有连锁目标造成伤害
      for (const target of chained) {
        target.health.damage(chain.damage);
        world.events.emit('enemyHit', { enemy: target.entity, damage: chain.damage });

        if (!target.health.alive) {
          const enemyComp = world.getComponent(target.entity, Enemy);
          const pos = world.getComponent(target.entity, Transform);
          world.events.emit('enemyKilled', {
            enemy: target.entity,
            xpValue: enemyComp?.xpValue ?? 10,
            position: pos,
          });
          world.removeEntity(target.entity);
        }
      }

      chain.fire();
    }
  }
}
