/**
 * 四月物语 — 游戏配置
 * 像素规格：16×16 逻辑像素，TILE_SIZE=32 显示缩放
 */

import type { BuffId, CardOption, CropConfig, DebuffId, LevelConfig, SeedRarity } from './types';

export const GAME_CONFIG = {
  width: 800,
  height: 600,
  title: '四月物语',
};

/** 16×16 逻辑像素 × 2 显示 */
export const TILE_SIZE = 32;
export const PLAYER_SIZE = 20;
/** 割草节奏：移动更快、走过即割 */
export const PLAYER_SPEED = 200;
export const INTERACT_RANGE = TILE_SIZE * 0.85;
export const BASE_PICKUP_RANGE = 64;
/** 移动时自动割草半径（世界像素） */
export const MOW_RADIUS = TILE_SIZE * 0.95;
/** 按住 E 时扇形割草半径 */
export const E_MOW_RADIUS = TILE_SIZE * 1.35;
/** 含种子的杂草占比（其余割了只清地） */
export const WEED_SEED_CHANCE = 0.38;

/** 星露谷风调色板 */
export const COLORS = {
  sky: '#87ceeb',
  grass: '#7ec850',
  grassDark: '#5a9e3e',
  soil: '#c9a66b',
  soilDark: '#a08050',
  path: '#d4b896',
  water: '#6bb5d8',
  wood: '#8b6914',
  player: '#f4a582',
  playerOutline: '#c97b63',
  weed: '#3d6b4f',
  weedLight: '#5a9e6f',
  bush: '#2d6a4f',
  crate: '#8b6914',
  wheat: '#e8d44d',
  tomato: '#e63946',
  sunflower: '#ffd60a',
  seedCommon: '#90be6d',
  seedUncommon: '#577590',
  seedRare: '#bc6c25',
  hudBg: 'rgba(45, 36, 24, 0.85)',
  hudText: '#fefae0',
  hudAccent: '#f4d35e',
  exit: '#e9c46a',
  exitGlow: '#ffd60a',
  seedWeed: '#f4d35e',
  uiPanel: 'rgba(254, 250, 224, 0.95)',
  uiBorder: '#606c38',
};

export const CROPS: Record<string, CropConfig> = {
  wheat: {
    type: 'wheat',
    name: '小麦',
    growTime: 15,
    score: 5,
    color: '#c8b84a',
    matureColor: COLORS.wheat,
    rarity: 'common',
  },
  tomato: {
    type: 'tomato',
    name: '番茄',
    growTime: 30,
    score: 12,
    color: '#6abe45',
    matureColor: COLORS.tomato,
    rarity: 'common',
  },
  sunflower: {
    type: 'sunflower',
    name: '向日葵',
    growTime: 45,
    score: 20,
    color: '#7cb518',
    matureColor: COLORS.sunflower,
    rarity: 'rare',
  },
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '自家荒田',
    width: 20,
    height: 16,
    scoreTarget: 60,
    seedRarities: ['common'],
    obstacleDensity: 0.62,
    weedRatio: 0.9,
  },
  {
    id: 2,
    name: '溪边草地',
    width: 24,
    height: 18,
    scoreTarget: 120,
    seedRarities: ['common', 'uncommon'],
    obstacleDensity: 0.68,
    weedRatio: 0.88,
  },
  {
    id: 3,
    name: '林缘秘境',
    width: 28,
    height: 20,
    scoreTarget: 200,
    seedRarities: ['uncommon', 'rare'],
    obstacleDensity: 0.72,
    weedRatio: 0.85,
  },
];

export const BUFF_CARDS: CardOption[] = [
  { kind: 'buff', id: 'growth_speed', name: '生长加速', desc: '作物成熟时间 -20%' },
  { kind: 'buff', id: 'pickup_magnet', name: '拾取磁铁', desc: '自动拾取范围 +50%' },
  { kind: 'buff', id: 'lucky_weed', name: '幸运割草', desc: '割杂草额外 +1 种子' },
];

export const RARE_SEED_CARD: CardOption = {
  kind: 'seed',
  crop: 'sunflower',
  name: '稀有种子',
  desc: '解锁向日葵种植',
};

export const SEED_RARITY_COLORS: Record<SeedRarity, string> = {
  common: COLORS.seedCommon,
  uncommon: COLORS.seedUncommon,
  rare: COLORS.seedRare,
};

export function getScoreTarget(levelId: number): number {
  const level = LEVELS.find((l) => l.id === levelId);
  return level?.scoreTarget ?? 50 * levelId;
}

export function getSpeedMultiplier(buffs: Set<BuffId>, debuffs: Set<DebuffId>): number {
  let m = 1;
  if (debuffs.has('sluggish')) m *= 0.85;
  return m;
}

export function getGrowthMultiplier(buffs: Set<BuffId>, debuffs: Set<DebuffId>): number {
  let m = 1;
  if (buffs.has('growth_speed')) m *= 0.8;
  if (debuffs.has('blight')) m *= 1.25;
  return m;
}

export function getPickupRange(buffs: Set<BuffId>, debuffs: Set<DebuffId>): number {
  let r = BASE_PICKUP_RANGE;
  if (buffs.has('pickup_magnet')) r *= 1.5;
  if (debuffs.has('weak_hands')) r *= 0.7;
  return r;
}

export function pickSeedRarity(rarities: SeedRarity[]): SeedRarity {
  const roll = Math.random();
  if (rarities.includes('rare') && roll < 0.15) return 'rare';
  if (rarities.includes('uncommon') && roll < 0.45) return 'uncommon';
  return 'common';
}

export function rollCardOptions(unlockedSunflower: boolean): CardOption[] {
  const pool: CardOption[] = [...BUFF_CARDS];
  if (!unlockedSunflower) pool.push(RARE_SEED_CARD);

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
