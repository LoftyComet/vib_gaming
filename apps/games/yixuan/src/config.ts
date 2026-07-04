/**
 * ============================================================
 * Mecha Survival — 机甲割草游戏配置
 * ============================================================
 */

export const GAME_TITLE = 'Mecha Survival ⚡';

/** Canvas 尺寸 */
export const GAME_CONFIG = {
  width: 900,
  height: 600,
};

/** 机甲玩家配置 */
export const PLAYER_CONFIG = {
  speed: 210,
  maxHealth: 120,
  size: 18,
  color: '#00d4ff', // 机甲蓝
  glowColor: 'rgba(0, 212, 255, 0.3)',
  invincibleTime: 0.5,
};

/** 3种武器预设 */
export const WEAPONS = {
  laser: {
    name: '激光炮',
    key: '1',
    cooldown: 0.35,
    range: 420,
    damage: 9,
    projectileSpeed: 650,
    projectileCount: 1,
    spreadAngle: 0,
    pierce: 0,
    color: '#00d4ff',
    size: 4,
    desc: '高射速精准射击',
  },
  missile: {
    name: '导弹发射器',
    key: '2',
    cooldown: 1.1,
    range: 380,
    damage: 40,
    projectileSpeed: 280,
    projectileCount: 1,
    spreadAngle: 0,
    pierce: 4,
    color: '#ff6b35',
    size: 8,
    desc: '高伤害穿透攻击',
  },
  spread: {
    name: '离子散射枪',
    key: '3',
    cooldown: 0.6,
    range: 300,
    damage: 11,
    projectileSpeed: 380,
    projectileCount: 5,
    spreadAngle: 0.4,
    pierce: 0,
    color: '#a78bfa',
    size: 4,
    desc: '扇形范围攻击',
  },
};

/** 新武器：喷火器、闪电链、旋转刃 */
export const EXTRA_WEAPONS = {
  flamethrower: {
    name: '等离子喷火器',
    key: '4',
    type: 'flame' as const,
    cooldown: 0.08,
    range: 130,
    damage: 4,
    projectileSpeed: 0,
    projectileCount: 0,
    spreadAngle: 0,
    pierce: 0,
    color: '#ff4444',
    size: 6,
    desc: '近距离持续灼烧',
    coneAngle: 0.6,
  },
  lightning: {
    name: '电弧链',
    key: '5',
    type: 'chain' as const,
    cooldown: 0.7,
    range: 350,
    damage: 20,
    projectileSpeed: 0,
    projectileCount: 0,
    spreadAngle: 0,
    pierce: 0,
    color: '#ffff00',
    size: 3,
    desc: '连锁电击4个目标',
    chainCount: 4,
    chainRange: 130,
  },
  blades: {
    name: '回旋刃',
    key: '6',
    type: 'orbit' as const,
    cooldown: 0.4,
    range: 0,
    damage: 14,
    projectileSpeed: 0,
    projectileCount: 0,
    spreadAngle: 0,
    pierce: 0,
    color: '#cccccc',
    size: 7,
    desc: '环绕机甲的旋转利刃',
    orbitRadius: 65,
    orbitSpeed: 3.5,
    bladeCount: 3,
  },
};

/** 默认初始武器 */
export const DEFAULT_WEAPON_INDEX = 0; // 激光炮

/** 经验系统配置 */
export const XP_CONFIG = {
  baseXP: 25,
  growthFactor: 1.2,
};

/** 外星机器人敌人波次 */
export const WAVES = [
  {
    // 第一波：锈蚀侦察兵
    startTime: 0, interval: 1.5, count: 10,
    health: 25, speed: 65, damage: 6, xpValue: 6,
    color: '#f87171',
  },
  {
    // 第二波：紫晶战士
    startTime: 15, interval: 1.0, count: 18,
    health: 45, speed: 75, damage: 10, xpValue: 10,
    color: '#c084fc',
  },
  {
    // 第三波：绿色酸液虫
    startTime: 35, interval: 0.6, count: 30,
    health: 35, speed: 130, damage: 8, xpValue: 10,
    color: '#4ade80',
  },
  {
    // 第四波：黄蜂无人机群
    startTime: 55, interval: 0.3, count: 40,
    health: 25, speed: 150, damage: 7, xpValue: 8,
    color: '#fbbf24',
  },
  {
    // 第五波：重型机甲
    startTime: 80, interval: 1.2, count: 20,
    health: 150, speed: 45, damage: 22, xpValue: 25,
    color: '#f97316',
  },
  {
    // 第六波：虚空精英
    startTime: 110, interval: 0.8, count: 35,
    health: 100, speed: 90, damage: 15, xpValue: 18,
    color: '#e879f9',
  },
];

/** Boss 波次 */
export const BOSS_WAVES = [
  {
    startTime: 50,
    bossType: 'charger' as const,
    health: 600, speed: 80, damage: 25, xpValue: 200,
    color: '#ef4444', size: 28,
    specialCooldown: 1.8,
  },
  {
    startTime: 95,
    bossType: 'mortar' as const,
    health: 500, speed: 40, damage: 18, xpValue: 250,
    color: '#f97316', size: 30,
    specialCooldown: 2.5,
  },
  {
    startTime: 140,
    bossType: 'summoner' as const,
    health: 700, speed: 50, damage: 12, xpValue: 300,
    color: '#a78bfa', size: 26,
    specialCooldown: 3.5,
  },
];
