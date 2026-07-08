import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Weapon } from '../components/Weapon';
import { Enemy } from '../components/Enemy';
import { Projectile } from '../components/Projectile';
import { Velocity } from '../components/Velocity';
import { Sprite } from '../components/Sprite';

/**
 * Auto-attack system: entities with Weapon auto-target the nearest Enemy.
 * Spawns Projectile entities aimed at the target.
 */
export class AutoAttackSystem extends System {
  update(dt: number, world: World): void {
    // Get all weapon holders
    const attackers = world.query(Transform, Weapon);

    for (const [entity, transform, weapon] of attackers) {
      // 只处理投射物类型的武器（环绕/火焰/连锁由各自系统处理）
      if (weapon.weaponType !== 'projectile') continue;

      // Tick cooldown
      weapon.timer = Math.max(0, weapon.timer - dt);

      if (!weapon.ready) continue;

      // Find nearest enemy
      const enemies = world.query(Transform, Enemy);
      if (enemies.length === 0) continue;

      let nearest: { entity: number; dist: number } | null = null;
      for (const [enemyEntity, enemyTransform] of enemies) {
        const dx = enemyTransform.x - transform.x;
        const dy = enemyTransform.y - transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= weapon.range && (!nearest || dist < nearest.dist)) {
          nearest = { entity: enemyEntity, dist };
        }
      }

      if (!nearest) continue;

      // Find the enemy position
      const targetTransform = world.getComponent(nearest.entity, Transform);
      if (!targetTransform) continue;

      const angle = Math.atan2(targetTransform.y - transform.y, targetTransform.x - transform.x);

      // Fire projectiles
      const count = weapon.projectileCount;
      const spread = weapon.spreadAngle;
      const halfSpread = (spread * (count - 1)) / 2;

      for (let i = 0; i < count; i++) {
        let fireAngle = angle;
        if (count > 1) {
          fireAngle = angle - halfSpread + spread * i;
        }

        const projEntity = world.createEntity();
        world.addComponent(projEntity, new Transform(transform.x, transform.y));
        world.addComponent(
          projEntity,
          new Velocity(
            Math.cos(fireAngle) * weapon.projectileSpeed,
            Math.sin(fireAngle) * weapon.projectileSpeed
          )
        );
        world.addComponent(
          projEntity,
          new Projectile(weapon.range / weapon.projectileSpeed, weapon.damage, weapon.pierce, entity)
        );
        world.addComponent(projEntity, new Sprite(6, 6, '#ffdd57'));
      }

      weapon.fire();
    }
  }
}
