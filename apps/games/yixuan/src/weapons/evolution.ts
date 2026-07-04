/**
 * 武器进化配方
 * 两把满级武器 → 合成进化武器
 */
export interface EvoRecipe {
  sources: [string, string]; // two weapon names from WEAPONS/EXTRA_WEAPONS
  result: string;            // evolved weapon key
  maxLevel: number;          // level required for each source
}

export const EVO_RECIPES: EvoRecipe[] = [
  {
    sources: ['laser', 'flamethrower'],
    result: 'plasmaBeam',
    maxLevel: 6,
  },
  {
    sources: ['missile', 'blades'],
    result: 'explodingBoomerangs',
    maxLevel: 6,
  },
  {
    sources: ['spread', 'lightning'],
    result: 'stormGrid',
    maxLevel: 6,
  },
  {
    sources: ['laser', 'lightning'],
    result: 'arcCannon',
    maxLevel: 6,
  },
  {
    sources: ['missile', 'flamethrower'],
    result: 'napalmStrike',
    maxLevel: 6,
  },
];

/** Evolved weapon definitions — enhanced versions */
export const EVOLVED_WEAPONS: Record<string, {
  name: string;
  type: 'projectile' | 'flame' | 'chain' | 'orbit';
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
  coneAngle?: number;
  chainCount?: number;
  chainRange?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  bladeCount?: number;
}> = {
  plasmaBeam: {
    name: '等离子光束 ⚡',
    type: 'projectile',
    cooldown: 0.15, range: 500, damage: 25,
    projectileSpeed: 800, projectileCount: 2, spreadAngle: 0.05, pierce: 3,
    color: '#00ffff', size: 5,
    desc: '激光+火焰: 穿透等离子束',
  },
  explodingBoomerangs: {
    name: '爆炸回旋镖 💣',
    type: 'orbit',
    cooldown: 0.2, range: 0, damage: 30,
    projectileSpeed: 0, projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ff8800', size: 8,
    desc: '导弹+旋转刃: 爆炸旋转刃',
    orbitRadius: 60, orbitSpeed: 5, bladeCount: 5,
  },
  stormGrid: {
    name: '雷电网 ⛈️',
    type: 'chain',
    cooldown: 0.4, range: 420, damage: 28,
    projectileSpeed: 0, projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ff44ff', size: 4,
    desc: '散射+闪电: 全屏连锁电网',
    chainCount: 8, chainRange: 160,
  },
  arcCannon: {
    name: '电弧炮 🔥',
    type: 'chain',
    cooldown: 0.35, range: 400, damage: 22,
    projectileSpeed: 0, projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ffaa00', size: 4,
    desc: '激光+闪电: 穿透电弧',
    chainCount: 5, chainRange: 150,
  },
  napalmStrike: {
    name: '凝固汽油弹 🔥',
    type: 'flame',
    cooldown: 0.04, range: 160, damage: 12,
    projectileSpeed: 0, projectileCount: 0, spreadAngle: 0, pierce: 0,
    color: '#ff6600', size: 7,
    desc: '导弹+火焰: 广域灼烧',
    coneAngle: 0.9,
  },
};
