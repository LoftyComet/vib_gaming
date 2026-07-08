export type DifficultyId = "relaxed" | "normal" | "overtime";

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  spawnRateMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  backlogMultiplier: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  relaxed: {
    id: "relaxed",
    name: "轻松摸鱼",
    spawnRateMultiplier: 0.75,
    enemySpeedMultiplier: 0.9,
    enemyDamageMultiplier: 0.75,
    backlogMultiplier: 0.7
  },
  normal: {
    id: "normal",
    name: "正常上班",
    spawnRateMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyDamageMultiplier: 1,
    backlogMultiplier: 1
  },
  overtime: {
    id: "overtime",
    name: "高强度加班",
    spawnRateMultiplier: 1.25,
    enemySpeedMultiplier: 1.1,
    enemyDamageMultiplier: 1.2,
    backlogMultiplier: 1.25
  }
};

export function getDifficulty(id: DifficultyId): DifficultyConfig {
  return DIFFICULTIES[id];
}
