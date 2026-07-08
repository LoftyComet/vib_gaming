import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Orbital } from '../components/Orbital';
import { Enemy } from '../components/Enemy';
import { Health } from '../components/Health';

/**
 * 环绕球系统 — 更新环绕球位置并对触碰的敌人造成伤害
 */
export class OrbitalSystem extends System {
  update(dt: number, world: World): void {
    const orbitals = world.query(Transform, Orbital);
    if (orbitals.length === 0) return;

    // 查找所有玩家 entity（用于获取位置）
    const allEntities = world.query(Transform);
    const ownerPositions = new Map<number, Transform>();

    for (const [entity, transform] of allEntities) {
      for (const [, , orbital] of orbitals) {
        if (entity === orbital.ownerId) {
          ownerPositions.set(entity, transform);
        }
      }
    }

    for (const [orbEntity, transform, orbital] of orbitals) {
      const ownerPos = ownerPositions.get(orbital.ownerId);
      if (!ownerPos) continue;

      // 更新角度
      orbital.angle += orbital.speed * dt;

      // 计算新位置
      transform.x = ownerPos.x + Math.cos(orbital.angle) * orbital.distance;
      transform.y = ownerPos.y + Math.sin(orbital.angle) * orbital.distance;

      // 碰撞检测：检查与所有敌人的距离
      const enemies = world.query(Transform, Enemy, Health);
      for (const [enemyEntity, enemyTransform, , enemyHealth] of enemies) {
        const dx = transform.x - enemyTransform.x;
        const dy = transform.y - enemyTransform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 碰撞半径：环绕球默认12，敌人默认14
        const collisionDist = 12 + 14;
        if (dist < collisionDist) {
          enemyHealth.damage(orbital.damage);
          world.events.emit('enemyHit', { enemy: enemyEntity, damage: orbital.damage });

          if (!enemyHealth.alive) {
            const enemyComp = world.getComponent(enemyEntity, Enemy);
            world.events.emit('enemyKilled', {
              enemy: enemyEntity,
              xpValue: enemyComp?.xpValue ?? 10,
              position: enemyTransform,
            });
            world.removeEntity(enemyEntity);
          }

          // 非无限穿透则移除此环绕球
          if (orbital.pierce >= 0) {
            orbital.pierce--;
            if (orbital.pierce < 0) {
              world.removeEntity(orbEntity);
              break;
            }
          }
        }
      }
    }
  }
}
