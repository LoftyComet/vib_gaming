/**
 * ============================================================
 * 游戏配置 — 所有可调参数都在这里！
 * ============================================================
 * 修改这些值来调整游戏难度和体验。
 */

/** Canvas 尺寸 */
export const GAME_CONFIG = {
  width: 800,
  height: 600,
};

/** 玩家配置 */
export const PLAYER_CONFIG = {
  speed: 220,
  maxHealth: 100,
  size: 16,
  color: '#818cf8', // indigo
  invincibleTime: 0.5, // 受伤后无敌时间（秒）
};

/** 初始武器配置 */
export const DEFAULT_WEAPON = {
  cooldown: 0.8, // 攻击间隔（秒）
  range: 350,
  damage: 15,
  projectileSpeed: 400,
  projectileCount: 1,
  pierce: 0,
};

/** 经验系统配置 */
export const XP_CONFIG = {
  baseXP: 25, // 第一级需要的经验
  growthFactor: 1.2, // 每级增长系数
};

/** 武器定义 */
export interface WeaponDef {
  id: string;
  name: string;
  type: 'projectile' | 'orbit' | 'flame' | 'chain';
  cooldown: number;
  range: number;
  damage: number;
  projectileSpeed: number;
  projectileCount: number;
  spreadAngle: number;
  pierce: number;
  color: string;
  size: number;
  // 特殊武器参数
  orbitRadius?: number;
  orbitSpeed?: number;
  bladeCount?: number;
  coneAngle?: number;
  chainCount?: number;
  chainRange?: number;
}

export const WEAPON_DEFS: Record<string, WeaponDef> = {
  magicBolt: {
    id: 'magicBolt', name: '魔法弹', type: 'projectile',
    cooldown: 0.8, range: 350, damage: 15, projectileSpeed: 400,
    projectileCount: 1, spreadAngle: 0, pierce: 0,
    color: '#818cf8', size: 6,
  },
  spreadShot: {
    id: 'spreadShot', name: '散射弹', type: 'projectile',
    cooldown: 0.6, range: 300, damage: 10, projectileSpeed: 380,
    projectileCount: 5, spreadAngle: 0.4, pierce: 0,
    color: '#a78bfa', size: 4,
  },
  piercingArrow: {
    id: 'piercingArrow', name: '穿透箭', type: 'projectile',
    cooldown: 1.2, range: 500, damage: 30, projectileSpeed: 600,
    projectileCount: 1, spreadAngle: 0, pierce: 4,
    color: '#fbbf24', size: 5,
  },
  orbitingBlades: {
    id: 'orbitingBlades', name: '环绕之刃', type: 'orbit',
    cooldown: 0.4, range: 0, damage: 12, projectileSpeed: 0,
    projectileCount: 0, spreadAngle: 0, pierce: -1,
    color: '#cccccc', size: 7,
    orbitRadius: 65, orbitSpeed: 3.5, bladeCount: 3,
  },
  flameThrower: {
    id: 'flameThrower', name: '火焰喷射', type: 'flame',
    cooldown: 0.08, range: 130, damage: 5, projectileSpeed: 0,
    projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ff4444', size: 6,
    coneAngle: 0.6,
  },
  chainLightning: {
    id: 'chainLightning', name: '连锁闪电', type: 'chain',
    cooldown: 0.7, range: 350, damage: 18, projectileSpeed: 0,
    projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ffff00', size: 3,
    chainCount: 4, chainRange: 130,
  },
};

/** 升级定义 */
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'stat' | 'weapon' | 'special';
  rarity: 'common' | 'rare' | 'epic';
  maxLevel: number; // 可选的次数，0 = 无限
  effectType: string; // 'damage' | 'speed' | 'maxHealth' | 'cooldown' | 'range' | 'pierce' | 'projectileCount' | 'xpGain' | 'weapon' | 'heal' | 'shield'
  value?: number; // 数值效果
  weaponId?: string; // 武器解锁时对应的武器ID
}

export const UPGRADE_POOL: UpgradeDef[] = [
  { id: 'damage_boost', name: '力量强化', description: '所有武器伤害 +20%', icon: '⚔️', type: 'stat', rarity: 'common', maxLevel: 5, effectType: 'damage', value: 0.2 },
  { id: 'speed_boost', name: '疾步', description: '移动速度 +15%', icon: '👟', type: 'stat', rarity: 'common', maxLevel: 5, effectType: 'speed', value: 0.15 },
  { id: 'max_hp', name: '生命上限', description: '最大生命值 +25', icon: '❤️', type: 'stat', rarity: 'common', maxLevel: 5, effectType: 'maxHealth', value: 25 },
  { id: 'cooldown_reduce', name: '快速攻击', description: '攻击冷却 -10%', icon: '⏱️', type: 'stat', rarity: 'common', maxLevel: 5, effectType: 'cooldown', value: 0.1 },
  { id: 'range_boost', name: '射程提升', description: '武器射程 +15%', icon: '🎯', type: 'stat', rarity: 'common', maxLevel: 5, effectType: 'range', value: 0.15 },
  { id: 'pierce_up', name: '穿透', description: '投射物穿透 +1', icon: '🏹', type: 'stat', rarity: 'rare', maxLevel: 3, effectType: 'pierce', value: 1 },
  { id: 'projectile_up', name: '多重射击', description: '投射物数量 +1', icon: '🔱', type: 'stat', rarity: 'rare', maxLevel: 4, effectType: 'projectileCount', value: 1 },
  { id: 'xp_gain', name: '经验加成', description: '经验获取 +20%', icon: '📖', type: 'stat', rarity: 'rare', maxLevel: 3, effectType: 'xpGain', value: 0.2 },
  { id: 'heal', name: '治疗', description: '恢复 30% 生命值', icon: '💚', type: 'special', rarity: 'common', maxLevel: 0, effectType: 'heal', value: 0.3 },
  { id: 'full_screen', name: '全屏冲击', description: '消灭屏幕上所有敌人', icon: '💥', type: 'special', rarity: 'epic', maxLevel: 0, effectType: 'shield', value: 0 },
  { id: 'weapon_spread', name: '解锁：散射弹', description: '获得散射弹武器', icon: '🔮', type: 'weapon', rarity: 'rare', maxLevel: 1, effectType: 'weapon', weaponId: 'spreadShot' },
  { id: 'weapon_piercing', name: '解锁：穿透箭', description: '获得穿透箭武器', icon: '🏹', type: 'weapon', rarity: 'rare', maxLevel: 1, effectType: 'weapon', weaponId: 'piercingArrow' },
  { id: 'weapon_orbit', name: '解锁：环绕之刃', description: '获得环绕之刃武器', icon: '🌀', type: 'weapon', rarity: 'epic', maxLevel: 1, effectType: 'weapon', weaponId: 'orbitingBlades' },
  { id: 'weapon_flame', name: '解锁：火焰喷射', description: '获得火焰喷射武器', icon: '🔥', type: 'weapon', rarity: 'epic', maxLevel: 1, effectType: 'weapon', weaponId: 'flameThrower' },
  { id: 'weapon_chain', name: '解锁：连锁闪电', description: '获得连锁闪电武器', icon: '⚡', type: 'weapon', rarity: 'epic', maxLevel: 1, effectType: 'weapon', weaponId: 'chainLightning' },
];

/** 根据稀有度权重随机选择升级 */
export function pickRandomUpgrades(
  takenLevels: Map<string, number>,
  count: number = 3
): UpgradeDef[] {
  // 筛选可选的升级（未达到最大等级）
  const available = UPGRADE_POOL.filter((u) => {
    if (u.maxLevel === 0) return true; // 无限制
    const current = takenLevels.get(u.id) ?? 0;
    return current < u.maxLevel;
  });

  // 按稀有度加权
  const weights = { common: 6, rare: 3, epic: 1 };
  const weighted: UpgradeDef[] = [];
  for (const u of available) {
    const w = weights[u.rarity] || 1;
    for (let i = 0; i < w; i++) weighted.push(u);
  }

  // Fisher-Yates 洗牌后取前 count 个不重复的
  const shuffled = [...weighted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const result: UpgradeDef[] = [];
  const seen = new Set<string>();
  for (const u of shuffled) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      result.push(u);
      if (result.length >= count) break;
    }
  }

  return result;
}

/** 敌人波次配置 */
export const WAVES = [
  {
    // 第一波：简单热身 — 追踪者
    startTime: 0,
    interval: 1.5,
    count: 10,
    health: 30,
    speed: 60,
    damage: 8,
    xpValue: 8,
    color: '#ef4444', // red
    size: 14,
    enemyType: 'chaser',
  },
  {
    // 第二波：蜂群来袭 — 大量小敌人
    startTime: 15,
    interval: 0.5,
    count: 30,
    health: 12,
    speed: 110,
    damage: 6,
    xpValue: 4,
    color: '#4ade80', // green
    size: 10,
    enemyType: 'swarmer',
  },
  {
    // 第三波：快速冲刺者
    startTime: 32,
    interval: 0.8,
    count: 15,
    health: 25,
    speed: 160,
    damage: 15,
    xpValue: 12,
    color: '#eab308', // yellow
    size: 12,
    enemyType: 'runner',
    chargeCooldown: 2.0,
    chargeSpeed: 320,
  },
  {
    // 第四波：重装坦克
    startTime: 50,
    interval: 2.0,
    count: 8,
    health: 150,
    speed: 35,
    damage: 25,
    xpValue: 30,
    color: '#a855f7', // purple
    size: 24,
    enemyType: 'tank',
    splitsOnDeath: true,
    splitCount: 2,
  },
  {
    // 第五波：远程射手 + 追踪者混合
    startTime: 70,
    interval: 1.0,
    count: 20,
    health: 35,
    speed: 50,
    damage: 12,
    xpValue: 15,
    color: '#f97316', // orange
    size: 14,
    enemyType: 'shooter',
    shootCooldown: 2.5,
    projectileSpeed: 150,
  },
  {
    // 第六波：敌人海
    startTime: 95,
    interval: 0.3,
    count: 50,
    health: 60,
    speed: 90,
    damage: 12,
    xpValue: 10,
    color: '#ec4899', // pink
    size: 14,
    enemyType: 'chaser',
  },
  {
    // 第七波：冲刺者+蜂群混合
    startTime: 120,
    interval: 0.4,
    count: 35,
    health: 20,
    speed: 130,
    damage: 10,
    xpValue: 8,
    color: '#eab308',
    size: 11,
    enemyType: 'runner',
    chargeCooldown: 1.5,
    chargeSpeed: 350,
  },
  {
    // 第八波：精英坦克 + 射手组合
    startTime: 145,
    interval: 1.5,
    count: 12,
    health: 180,
    speed: 40,
    damage: 30,
    xpValue: 40,
    color: '#a855f7',
    size: 26,
    enemyType: 'tank',
    splitsOnDeath: true,
    splitCount: 3,
  },
];
