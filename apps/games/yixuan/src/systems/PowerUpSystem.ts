/**
 * ============================================================
 * PowerUpSystem — 道具磁铁吸引 + 收集
 * ============================================================
 */
import { System, World, Transform, Sprite, Player, Health, Experience } from '@vib/engine';
import { PowerUp } from '../components/PowerUp';
import { Buff } from '../components/Buff';

export class PowerUpSystem extends System {
  private attractRange = 70;
  private collectRange = 18;
  private attractSpeed = 250;

  update(dt: number, world: World): void {
    const players = world.query(Transform, Player, Buff);
    if (players.length === 0) return;
    const [, playerTransform, , buff] = players[0];
    const px = playerTransform.x;
    const py = playerTransform.y;

    // magnet buff extends attract range
    const magnetMult = buff.hasBuff('magnet') ? buff.getMultiplier('magnet') : 1;
    const effectiveAttract = this.attractRange * magnetMult;

    const powerUps = world.query(Transform, Sprite, PowerUp);
    for (const [entity, pt, sprite, powerUp] of powerUps) {
      const dx = px - pt.x;
      const dy = py - pt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.collectRange) {
        // collected!
        this.collect(world, entity, powerUp, players[0]);
      } else if (dist < effectiveAttract) {
        // magnetic pull
        const speed = this.attractSpeed * (1 - dist / effectiveAttract) + 50;
        pt.x += (dx / dist) * speed * dt;
        pt.y += (dy / dist) * speed * dt;
      }
    }
  }

  private collect(
    world: World,
    entity: number,
    powerUp: PowerUp,
    [playerEntity, , , buff]: [number, Transform, Player, Buff],
  ): void {
    const health = world.getComponent(playerEntity, Health);
    const exp = world.getComponent(playerEntity, Experience);

    switch (powerUp.powerUpType) {
      case 'heal':
        if (health) health.heal(powerUp.value);
        break;
      case 'magnet':
        buff.addBuff('magnet', powerUp.value, powerUp.duration);
        break;
      case 'shield':
        buff.addBuff('shield', 1, powerUp.duration);
        break;
      case 'speed':
        buff.addBuff('speed', powerUp.value, powerUp.duration);
        break;
      case 'damage':
        buff.addBuff('damage', powerUp.value, powerUp.duration);
        break;
    }

    world.events.emit('powerUpCollected', {
      type: powerUp.powerUpType,
      value: powerUp.value,
    });
    world.removeEntity(entity);
  }
}
