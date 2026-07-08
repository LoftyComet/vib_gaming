import {
  WEAPONS,
  getCoffeeStats,
  getKeyboardStats,
  getShredderStats,
  type WeaponId
} from "../config/content";
import type { SessionState } from "./session";

export type UpgradeId = WeaponId;

export interface UpgradeOption {
  id: UpgradeId;
  name: string;
  description: string;
  disabled: boolean;
}

export function getUpgradeOptions(
  session: SessionState,
  random: () => number = Math.random
): UpgradeOption[] {
  const options: UpgradeOption[] = (
    Object.keys(WEAPONS) as WeaponId[]
  )
    .map((id) => {
      const definition = WEAPONS[id];
      const disabled = session.weapons[id] >= definition.maxLevel;
      const nextLevel = Math.min(
        definition.maxLevel,
        session.weapons[id] + 1
      );
      return {
        id,
        name: disabled
          ? `${definition.name} MAX`
          : `${definition.name} Lv.${nextLevel}`,
        description: disabled
          ? "已达到最高等级"
          : getWeaponUpgradeDescription(id, nextLevel),
        disabled
      };
    });

  return options
    .map((option) => ({ option, order: random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(({ option }) => option);
}

export function applyUpgrade(
  session: SessionState,
  id: UpgradeId
): string {
  const wasLocked = session.weapons[id] === 0;
  session.weapons[id] = Math.min(
    WEAPONS[id].maxLevel,
    session.weapons[id] + 1
  );
  if (wasLocked) {
    session.activeWeapon = id;
  }
  return `${WEAPONS[id].name} 已升至 Lv.${session.weapons[id]}`;
}

function getWeaponUpgradeDescription(
  id: WeaponId,
  nextLevel: number
): string {
  if (id === "keyboard") {
    const stats = getKeyboardStats(nextLevel);
    return `立即生效：${stats.projectileCount} 发键帽，每发 ${stats.damage} 伤害，穿透 ${stats.penetration}`;
  }
  if (id === "coffee") {
    const stats = getCoffeeStats(nextLevel);
    return `立即生效：范围 ${stats.radius}，每跳 ${stats.damage} 伤害，持续 ${(stats.durationMs / 1000).toFixed(1)} 秒`;
  }
  const stats = getShredderStats(nextLevel);
  return `立即生效：粉碎半径 ${stats.radius}，普通伤害 ${Number.isFinite(stats.damage) ? stats.damage : "清屏"}，Boss 伤害 ${stats.bossDamage}`;
}
