/**
 * ============================================================
 * ChainLightningSystem — 连锁闪电
 * ============================================================
 */
import { System, World, Transform, Health, Enemy } from '@vib/engine';
import { ChainWeapon } from '../components/ChainWeapon';

export class ChainLightningSystem extends System {
  private boltTargets: { x: number; y: number }[][] = [];
  private boltTimer = 0;
  private boltDuration = 0.1;

  update(dt: number, world: World): void {
    const players = world.query(Transform, ChainWeapon);
    if (players.length === 0) return;

    // tick bolt visual timer
    this.boltTimer = Math.max(0, this.boltTimer - dt);

    for (const [, playerTransform, chainWeapon] of players) {
      chainWeapon.timer = Math.max(0, chainWeapon.timer - dt);
      if (chainWeapon.timer > 0) continue;

      chainWeapon.timer = chainWeapon.cooldown;

      const px = playerTransform.x;
      const py = playerTransform.y;

      // find nearest enemy
      const enemies = world.query(Transform, Health, Enemy);
      const targets: { entity: number; x: number; y: number; health: Health; enemy: Enemy }[] = [];
      for (const [entity, et, eh, enemy] of enemies) {
        const dx = et.x - px;
        const dy = et.y - py;
        if (Math.sqrt(dx * dx + dy * dy) <= chainWeapon.range) {
          targets.push({ entity, x: et.x, y: et.y, health: eh, enemy });
        }
      }
      if (targets.length === 0) continue;

      // sort by distance
      targets.sort((a, b) => {
        const da = (a.x - px) ** 2 + (a.y - py) ** 2;
        const db = (b.x - px) ** 2 + (b.y - py) ** 2;
        return da - db;
      });

      // chain through targets
      const hit = new Set<number>();
      const chain: { x: number; y: number }[] = [{ x: px, y: py }];
      let lastX = px;
      let lastY = py;

      for (const t of targets) {
        if (hit.has(t.entity)) continue;
        if (hit.size >= chainWeapon.chainCount) break;

        const dx = t.x - lastX;
        const dy = t.y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > chainWeapon.chainRange && hit.size > 0) continue;

        hit.add(t.entity);
        t.health.damage(chainWeapon.damage);
        world.events.emit('enemyHit', { enemy: t.entity, damage: chainWeapon.damage });
        chain.push({ x: t.x, y: t.y });
        lastX = t.x;
        lastY = t.y;

        if (!t.health.alive) {
          world.events.emit('enemyKilled', {
            enemy: t.entity,
            xpValue: t.enemy.xpValue,
            position: { x: t.x, y: t.y },
          });
          world.removeEntity(t.entity);
        }
      }

      if (chain.length > 1) {
        this.boltTargets = [chain];
        this.boltTimer = this.boltDuration;
      }
    }
  }

  getBoltChains(): { x: number; y: number }[][] {
    return this.boltTimer > 0 ? this.boltTargets : [];
  }
}
