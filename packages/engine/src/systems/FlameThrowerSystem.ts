import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { FlameWeapon } from '../components/FlameWeapon';
import { Enemy } from '../components/Enemy';
import { Health } from '../components/Health';

/**
 * 火焰喷射系统 — 锥形范围内持续伤害
 */
export class FlameThrowerSystem extends System {
  update(dt: number, world: World): void {
    // 查找所有拥有 FlameWeapon 的实体
    const flamers = world.query(Transform, FlameWeapon);

    for (const [, ownerTransform, flame] of flamers) {
      // 冷却计时
      flame.timer = Math.max(0, flame.timer - dt);

      if (!flame.ready) continue;

      // 找最近敌人确定瞄准方向
      const enemies = world.query(Transform, Enemy);
      let aimAngle = 0;
      let nearestDist = Infinity;

      for (const [, enemyTransform] of enemies) {
        const dx = enemyTransform.x - ownerTransform.x;
        const dy = enemyTransform.y - ownerTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist && dist <= flame.range) {
          nearestDist = dist;
          aimAngle = Math.atan2(dy, dx);
        }
      }

      // 如果没有敌人在范围内，跳过
      if (nearestDist === Infinity) continue;

      const halfCone = flame.coneAngle / 2;

      // 对锥形范围内的所有敌人造成伤害
      for (const [enemyEntity, enemyTransform, , enemyHealth] of world.query(Transform, Enemy, Health)) {
        const dx = enemyTransform.x - ownerTransform.x;
        const dy = enemyTransform.y - ownerTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > flame.range) continue;

        // 检查是否在锥形范围内
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - aimAngle;

        // 标准化角度差到 [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) <= halfCone) {
          enemyHealth.damage(flame.damage);
          world.events.emit('enemyHit', { enemy: enemyEntity, damage: flame.damage });

          if (!enemyHealth.alive) {
            const enemyComp = world.getComponent(enemyEntity, Enemy);
            const pos = world.getComponent(enemyEntity, Transform);
            world.events.emit('enemyKilled', {
              enemy: enemyEntity,
              xpValue: enemyComp?.xpValue ?? 10,
              position: pos,
            });
            world.removeEntity(enemyEntity);
          }
        }
      }

      flame.fire();
    }
  }
}
