/** 四月物语 — 核心类型 */

export type GroundType = 'grass' | 'soil' | 'path';

export type ObstacleType = 'weed' | 'bush' | 'crate';

export type CropType = 'wheat' | 'tomato' | 'sunflower';

export type SeedRarity = 'common' | 'uncommon' | 'rare';

export type DropType = 'seed' | 'wood';

export type BuffId = 'growth_speed' | 'pickup_magnet' | 'lucky_weed';

export type DebuffId = 'sluggish' | 'weak_hands' | 'blight';

export type CardOption =
  | { kind: 'buff'; id: BuffId; name: string; desc: string }
  | { kind: 'seed'; crop: CropType; name: string; desc: string };

export type NoticeKind = 'buff' | 'debuff' | 'rare' | 'npc' | 'info' | 'junk';

export interface GameNotice {
  title: string;
  body: string;
  kind: NoticeKind;
  timer: number;
}

export interface Cell {
  ground: GroundType;
  obstacle?: {
    type: ObstacleType;
    hitsLeft: number;
    hasSeed?: boolean;
    /** 本关 guaranteed 剧情木箱 */
    isStoryCrate?: boolean;
  };
  crop?: { type: CropType; plantedAt: number };
}

export interface WorldDrop {
  id: number;
  x: number;
  y: number;
  type: DropType;
  rarity?: SeedRarity;
  spawnTime: number;
  popVy: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  /** 过关所需收获分数（仅计作物收获） */
  scoreTarget: number;
  seedRarities: SeedRarity[];
  obstacleDensity: number;
  weedRatio: number;
}

export interface CropConfig {
  type: CropType;
  name: string;
  growTime: number;
  score: number;
  color: string;
  matureColor: string;
  rarity: SeedRarity;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingX: number;
  facingY: number;
}

export interface RunState {
  levelIndex: number;
  seedsCollected: number;
  harvestScore: number;
  cropsPlanted: number;
  wood: number;
  score: number;
  obstaclesCleared: number;
  unlockedCrops: Set<CropType>;
  activeBuffs: Set<BuffId>;
  activeDebuffs: Set<DebuffId>;
  runComplete: boolean;
  victory: boolean;
  showCardPicker: boolean;
  cardOptions: CardOption[];
  showPlantPicker: boolean;
  plantTileX: number;
  plantTileY: number;
  message: string;
  messageTimer: number;
  /** 屏幕中央事件提示（buff/debuff/NPC 等） */
  notice: GameNotice | null;
}
