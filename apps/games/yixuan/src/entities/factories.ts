/**
 * ============================================================
 * Entity Factories — 实体创建工厂函数
 * ============================================================
 */
import {
  World, Transform, Velocity, Health, Collider, Weapon,
  Player, Enemy, Experience, Sprite, Projectile, Pickup, Lifetime,
  type WaveConfig,
} from '@vib/engine';
import {
  PLAYER_CONFIG, WEAPONS, DEFAULT_WEAPON_INDEX, XP_CONFIG, WAVES, EXTRA_WEAPONS,
} from '../config';
import { Dash } from '../components/Dash';
import { PowerUp, type PowerUpType } from '../components/PowerUp';
import { Buff } from '../components/Buff';
import { FlameWeapon } from '../components/FlameWeapon';
import { ChainWeapon } from '../components/ChainWeapon';
import { OrbitWeapon } from '../components/OrbitWeapon';
import { WeaponLevel } from '../components/WeaponLevel';
import { Particle } from '../components/Particle';

// ---- type helpers ----

export interface WeaponDef {
  name: string;
  key: string;
  type?: 'projectile' | 'flame' | 'chain' | 'orbit';
  cooldown: number;
  range: number;
  damage: number;
  projectileSpeed: number;
  projectileCount: number;
  spreadAngle: number;
  pierce: number;
  color: string;
  size: number;
  desc: string;
  // flame
  coneAngle?: number;
  // chain
  chainCount?: number;
  chainRange?: number;
  // orbit
  orbitRadius?: number;
  orbitSpeed?: number;
  bladeCount?: number;
}

// ---- player ----

export function createPlayer(world: World): number {
  const entity = world.createEntity();
  world.addComponent(entity, new Transform(900 / 2, 600 / 2));
  world.addComponent(entity, new Velocity(0, 0));
  world.addComponent(entity, new Health(PLAYER_CONFIG.maxHealth, PLAYER_CONFIG.maxHealth));
  world.addComponent(entity, new Player(PLAYER_CONFIG.speed));
  world.addComponent(entity, new Sprite(PLAYER_CONFIG.size, PLAYER_CONFIG.size, PLAYER_CONFIG.color));
  world.addComponent(entity, new Collider(14, 14, 8));
  world.addComponent(entity, new Experience(0, XP_CONFIG.baseXP, 1));
  world.addComponent(entity, new Dash());
  world.addComponent(entity, new Buff());
  world.addComponent(entity, new WeaponLevel());
  return entity;
}

// ---- weapons ----

export function applyWeapon(world: World, entity: number, w: WeaponDef): void {
  // remove all weapon components
  if (world.hasComponent(entity, Weapon)) world.removeComponent(entity, Weapon);
  if (world.hasComponent(entity, FlameWeapon)) world.removeComponent(entity, FlameWeapon);
  if (world.hasComponent(entity, ChainWeapon)) world.removeComponent(entity, ChainWeapon);
  // For orbit, clean up blade entities
  const orbit = world.getComponent(entity, OrbitWeapon);
  if (orbit) {
    for (const bladeId of orbit.bladeEntities) {
      if (world.hasComponent(bladeId, Transform)) world.removeEntity(bladeId);
    }
    world.removeComponent(entity, OrbitWeapon);
  }

  const weaponType = w.type ?? 'projectile';
  switch (weaponType) {
    case 'projectile':
      world.addComponent(entity, new Weapon(
        w.cooldown, w.range, w.damage, w.projectileSpeed,
        w.projectileCount, w.spreadAngle, w.pierce,
      ));
      break;
    case 'flame':
      world.addComponent(entity, new FlameWeapon(
        w.cooldown, w.range, w.damage,
        w.coneAngle ?? 0.6, w.color,
      ));
      break;
    case 'chain':
      world.addComponent(entity, new ChainWeapon(
        w.cooldown, w.range, w.damage,
        w.chainCount ?? 4, w.chainRange ?? 130,
      ));
      break;
    case 'orbit':
      world.addComponent(entity, new OrbitWeapon(
        w.cooldown, w.damage,
        w.orbitRadius ?? 65, w.orbitSpeed ?? 3.5, w.bladeCount ?? 3,
        w.color,
      ));
      break;
  }
}

export function getWeaponList(): WeaponDef[] {
  return [WEAPONS.laser, WEAPONS.missile, WEAPONS.spread] as WeaponDef[];
}

export function getExtraWeapons(): WeaponDef[] {
  return [EXTRA_WEAPONS.flamethrower, EXTRA_WEAPONS.lightning, EXTRA_WEAPONS.blades] as WeaponDef[];
}

export function getDefaultWeaponIndex(): number {
  return DEFAULT_WEAPON_INDEX;
}

// ---- XP ----

export function xpForLevel(level: number): number {
  return Math.floor(XP_CONFIG.baseXP * Math.pow(XP_CONFIG.growthFactor, level - 1));
}

// ---- wave configs ----

export function buildWaveConfigs(): WaveConfig[] {
  return WAVES.map((wv) => ({
    enemyConfig: {
      health: wv.health,
      speed: wv.speed,
      damage: wv.damage,
      xpValue: wv.xpValue,
      color: wv.color,
    },
    count: wv.count,
    interval: wv.interval,
    startTime: wv.startTime,
  }));
}

// ---- enemy (used by boss summoners later) ----

export interface EnemyConfig {
  health: number;
  speed: number;
  damage: number;
  xpValue: number;
  color: string;
  size?: number;
}

export function createEnemy(world: World, x: number, y: number, cfg: EnemyConfig): number {
  const entity = world.createEntity();
  const s = cfg.size ?? 12;
  world.addComponent(entity, new Transform(x, y));
  world.addComponent(entity, new Velocity(0, 0));
  world.addComponent(entity, new Health(cfg.health, cfg.health));
  world.addComponent(entity, new Enemy(cfg.xpValue, cfg.damage, cfg.speed));
  world.addComponent(entity, new Sprite(s, s, cfg.color));
  world.addComponent(entity, new Collider(s * 0.8, s * 0.8, s * 0.45));
  return entity;
}

// ---- projectile auto-setup hook ----

/**
 * Call this from the 'componentAdded' event to auto-attach
 * a Collider to projectiles and tint their Sprite to the active weapon colour.
 */
export function onComponentAdded(
  world: World,
  data: { entity: number; component: unknown },
  currentWeaponColor: string,
  currentWeaponSize: number,
): void {
  if (data.component instanceof Projectile) {
    if (!world.hasComponent(data.entity, Collider)) {
      world.addComponent(data.entity, new Collider(6, 6, 4));
    }
  }
  if (data.component instanceof Sprite) {
    if (world.hasComponent(data.entity, Projectile)) {
      const sp = data.component as Sprite;
      sp.color = currentWeaponColor;
      sp.width = currentWeaponSize * 2;
      sp.height = currentWeaponSize * 2;
    }
  }
}

// ---- xp gem ----

export function spawnXPGem(world: World, x: number, y: number, amount: number): number {
  const entity = world.createEntity();
  world.addComponent(entity, new Transform(x, y));
  world.addComponent(entity, new Sprite(6, 6, '#4ade80'));
  world.addComponent(entity, new Pickup(amount, 60, 300));
  world.addComponent(entity, new Collider(8, 8, 6));
  world.addComponent(entity, new Lifetime(15));
  return entity;
}

// ---- power-up ----

export function createPowerUpEntity(
  world: World,
  x: number,
  y: number,
  powerUpType: PowerUpType,
  value: number,
  duration: number,
  color: string,
): number {
  const entity = world.createEntity();
  world.addComponent(entity, new Transform(x, y));
  world.addComponent(entity, new Sprite(10, 10, color));
  world.addComponent(entity, new Collider(12, 12, 8));
  world.addComponent(entity, new Lifetime(20));
  world.addComponent(entity, new PowerUp(powerUpType, value, duration, color));
  return entity;
}

// ---- particles ----

export function spawnParticleExplosion(
  world: World, x: number, y: number, color: string, count: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    const entity = world.createEntity();
    world.addComponent(entity, new Transform(x, y));
    world.addComponent(entity, new Velocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
    ));
    const size = 2 + Math.random() * 3;
    world.addComponent(entity, new Sprite(size, size, color));
    world.addComponent(entity, new Lifetime(0.3 + Math.random() * 0.5));
    world.addComponent(entity, new Particle(color, size, 0, 1, 0));
  }
}
