/**
 * ============================================================
 * FlameThrowerSystem — 锥形火焰 AOE
 * ============================================================
 */
import { System, World, Transform, Health, Enemy } from '@vib/engine';
import { FlameWeapon } from '../components/FlameWeapon';

export class FlameThrowerSystem extends System {
  update(dt: number, world: World): void {
    const players = world.query(Transform, FlameWeapon);
    if (players.length === 0) return;

    for (const [, playerTransform, flameWeapon] of players) {
      flameWeapon.timer = Math.max(0, flameWeapon.timer - dt);
      if (flameWeapon.timer > 0) continue;

      flameWeapon.timer = flameWeapon.cooldown;

      const px = playerTransform.x;
      const py = playerTransform.y;

      // find nearest enemy for aiming
      const enemies = world.query(Transform, Health, Enemy);
      let aimAngle = 0;
      let nearestDist = Infinity;
      for (const [, et] of enemies) {
        const dx = et.x - px;
        const dy = et.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          aimAngle = Math.atan2(dy, dx);
        }
      }

      // damage enemies in cone
      for (const [entity, et, eh, enemyComp] of enemies) {
        const dx = et.x - px;
        const dy = et.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > flameWeapon.range) continue;

        const angle = Math.atan2(dy, dx);
        let diff = angle - aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) >= flameWeapon.coneAngle / 2) continue;

        eh.damage(flameWeapon.damage);
        world.events.emit('enemyHit', { enemy: entity, damage: flameWeapon.damage });

        if (!eh.alive) {
          world.events.emit('enemyKilled', {
            enemy: entity,
            xpValue: enemyComp.xpValue,
            position: et,
          });
          world.removeEntity(entity);
        }
      }
    }
  }
}
