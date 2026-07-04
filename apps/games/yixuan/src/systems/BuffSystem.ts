/**
 * ============================================================
 * BuffSystem — 管理 Buff 持续时间、应用/恢复属性修改
 * ============================================================
 */
import { System, World, Health, Player, Weapon, Experience } from '@vib/engine';
import { Buff } from '../components/Buff';
import type { PowerUpType } from '../components/PowerUp';

export class BuffSystem extends System {
  // stored original values for restoration
  private originalSpeed = new Map<number, number>();
  private originalDamage = new Map<number, number>();

  update(dt: number, world: World): void {
    const entities = world.query(Player, Buff);
    for (const [entity, player, buff] of entities) {
      // tick down buff durations
      let changed = false;
      for (const b of buff.buffs) {
        b.remaining -= dt;
        if (b.remaining <= 0) changed = true;
      }

      // remove expired
      if (changed) {
        buff.buffs = buff.buffs.filter((b) => b.remaining > 0);
      }

      // apply speed buff
      if (buff.hasBuff('speed')) {
        if (!this.originalSpeed.has(entity)) {
          this.originalSpeed.set(entity, player.speed);
        }
        player.speed = this.originalSpeed.get(entity)! * buff.getMultiplier('speed');
      } else if (this.originalSpeed.has(entity)) {
        player.speed = this.originalSpeed.get(entity)!;
        this.originalSpeed.delete(entity);
      }

      // apply damage buff (modifies weapon)
      const wp = world.getComponent(entity, Weapon);
      if (wp && buff.hasBuff('damage')) {
        if (!this.originalDamage.has(entity)) {
          this.originalDamage.set(entity, wp.damage);
        }
        wp.damage = Math.floor(this.originalDamage.get(entity)! * buff.getMultiplier('damage'));
      } else if (this.originalDamage.has(entity)) {
        if (wp) wp.damage = this.originalDamage.get(entity)!;
        this.originalDamage.delete(entity);
      }

      // apply shield buff
      if (buff.hasBuff('shield')) {
        const health = world.getComponent(entity, Health);
        if (health) {
          health.invincibleTimer = Math.max(health.invincibleTimer, dt + 0.05);
        }
      }
    }

    // cleanup stale originals
    for (const [entity] of this.originalSpeed) {
      if (!world.query(Player, Buff).some(([e]) => e === entity)) {
        this.originalSpeed.delete(entity);
      }
    }
  }
}
