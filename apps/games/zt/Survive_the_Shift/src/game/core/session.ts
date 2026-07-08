import { PLAYER_MAX_MINDSET } from "../config/constants";
import type { WeaponId } from "../config/content";
import type { DifficultyId } from "../config/difficulty";

export type SessionPhase = "combat" | "evacuation" | "won" | "lost";

export interface SessionState {
  phase: SessionPhase;
  difficulty: DifficultyId;
  elapsedMs: number;
  mindset: number;
  backlog: number;
  rage: number;
  xp: number;
  level: number;
  defeats: number;
  weapons: Record<WeaponId, number>;
  activeWeapon: WeaponId;
  bossSpawned: boolean;
  bossDefeated: boolean;
  bossHealth: number;
  bossMaxHealth: number;
  inBreakZone: boolean;
  dashReadyAt: number;
  evacuationProgress: number;
  resultReason?: string;
}

export function createSessionState(
  difficulty: DifficultyId = "normal"
): SessionState {
  return {
    phase: "combat",
    difficulty,
    elapsedMs: 0,
    mindset: PLAYER_MAX_MINDSET,
    backlog: 0,
    rage: 0,
    xp: 0,
    level: 1,
    defeats: 0,
    weapons: {
      keyboard: 1,
      coffee: 0,
      shredder: 0
    },
    activeWeapon: "keyboard",
    bossSpawned: false,
    bossDefeated: false,
    bossHealth: 0,
    bossMaxHealth: 0,
    inBreakZone: false,
    dashReadyAt: 0,
    evacuationProgress: 0
  };
}

export function xpRequiredForLevel(level: number): number {
  return 6 + level * 2;
}

export function increaseBacklog(
  current: number,
  deltaSeconds: number,
  enemyCount: number,
  multiplier: number,
  inBreakZone: boolean
): number {
  const passiveRate = 0.12 + Math.min(enemyCount, 80) * 0.004;
  const breakRoomRate = inBreakZone ? 0.9 : 0;
  return Math.min(
    100,
    current + (passiveRate + breakRoomRate) * deltaSeconds * multiplier
  );
}
