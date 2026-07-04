/**
 * ============================================================
 * OrbitWeaponSystem — 环绕玩家的旋转刀刃
 * ============================================================
 */
import { System, World, Transform, Health, Enemy, Collider, Sprite } from '@vib/engine';
import { OrbitWeapon } from '../components/OrbitWeapon';

export class OrbitWeaponSystem extends System {
  update(dt: number, world: World): void {
    const players = world.query(Transform, OrbitWeapon);
    if (players.length === 0) return;

    for (const [entity, playerTransform, orbitWeapon] of players) {
      // create blade entities if needed
      if (orbitWeapon.bladeEntities.length === 0) {
        for (let i = 0; i < orbitWeapon.bladeCount; i++) {
          const blade = world.createEntity();
          world.addComponent(blade, new Transform(0, 0));
          world.addComponent(blade, new Sprite(orbitWeapon.cooldown > 0 ? 6 : 6, 6, orbitWeapon.color));
          world.addComponent(blade, new Collider(8, 8, 5));
          orbitWeapon.bladeEntities.push(blade);
        }
      }

      // tick weapon timer
      orbitWeapon.timer = Math.max(0, orbitWeapon.timer - dt);

      const px = playerTransform.x;
      const py = playerTransform.y;
      const t = performance.now() / 1000;

      // update blade positions
      for (let i = 0; i < orbitWeapon.bladeEntities.length; i++) {
        const bladeId = orbitWeapon.bladeEntities[i];
        const bladeTransform = world.getComponent(bladeId, Transform);
        if (!bladeTransform) continue;

        const angle = orbitWeapon.orbitSpeed * t + (Math.PI * 2 * i) / orbitWeapon.bladeEntities.length;
        bladeTransform.x = px + Math.cos(angle) * orbitWeapon.orbitRadius;
        bladeTransform.y = py + Math.sin(angle) * orbitWeapon.orbitRadius;

        // check collision with enemies
        if (orbitWeapon.timer > 0) continue;
        const enemies = world.query(Transform, Health, Enemy);
        for (const [enemyEntity, et, eh, enemyComp] of enemies) {
          const dx = bladeTransform.x - et.x;
          const dy = bladeTransform.y - et.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bladeCollider = world.getComponent(bladeId, Collider);
          const enemyCollider = world.getComponent(enemyEntity, Collider);
          const hitRadius = (bladeCollider?.radius ?? 5) + (enemyCollider?.radius ?? 8);

          if (dist < hitRadius) {
            eh.damage(orbitWeapon.damage);
            orbitWeapon.timer = orbitWeapon.cooldown;
            world.events.emit('enemyHit', { enemy: enemyEntity, damage: orbitWeapon.damage });
            if (!eh.alive) {
              world.events.emit('enemyKilled', {
                enemy: enemyEntity,
                xpValue: enemyComp.xpValue,
                position: et,
              });
              world.removeEntity(enemyEntity);
            }
            break;
          }
        }
      }
    }
  }
}
