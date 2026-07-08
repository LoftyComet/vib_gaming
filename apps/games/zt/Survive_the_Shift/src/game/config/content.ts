export type WeaponId = "keyboard" | "coffee" | "shredder";
export type EnemyKind =
  | "notification"
  | "requirement"
  | "spreadsheet"
  | "final-request";

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  description: string;
  maxLevel: number;
  cooldownMs: number;
}

export interface EnemyDefinition {
  kind: EnemyKind;
  name: string;
  texture: string;
  health: number;
  speed: number;
  damage: number;
  xp: number;
  backlogOnHit: number;
  radius: number;
  boss?: boolean;
}

export interface KeyboardStats {
  damage: number;
  projectileCount: number;
  penetration: number;
  cooldownMs: number;
}

export interface CoffeeStats {
  radius: number;
  damage: number;
  durationMs: number;
  cooldownMs: number;
}

export interface ShredderStats {
  radius: number;
  damage: number;
  bossDamage: number;
  bladeCount: number;
  cooldownMs: number;
}

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  keyboard: {
    id: "keyboard",
    name: "键盘连击",
    description: "追踪最近的需求，升级增加伤害与穿透",
    maxLevel: 3,
    cooldownMs: 230
  },
  coffee: {
    id: "coffee",
    name: "咖啡泼洒",
    description: "生成持续伤害区域，升级扩大范围",
    maxLevel: 3,
    cooldownMs: 1050
  },
  shredder: {
    id: "shredder",
    name: "文件粉碎机",
    description: "瞬间粉碎周围所有普通敌人，升级扩大毁灭范围",
    maxLevel: 3,
    cooldownMs: 1450
  }
};

export function getShredderDamage(level: number, isBoss: boolean): number {
  const stats = getShredderStats(level);
  return isBoss ? stats.bossDamage : stats.damage;
}

export function getKeyboardStats(level: number): KeyboardStats {
  const levels: Record<number, KeyboardStats> = {
    1: {
      damage: 1,
      projectileCount: 1,
      penetration: 0,
      cooldownMs: 230
    },
    2: {
      damage: 2,
      projectileCount: 2,
      penetration: 1,
      cooldownMs: 185
    },
    3: {
      damage: 4,
      projectileCount: 4,
      penetration: 2,
      cooldownMs: 135
    }
  };
  return levels[normalizeLevel(level)];
}

export function getCoffeeStats(level: number): CoffeeStats {
  const levels: Record<number, CoffeeStats> = {
    1: {
      radius: 72,
      damage: 1,
      durationMs: 2400,
      cooldownMs: 1050
    },
    2: {
      radius: 112,
      damage: 2,
      durationMs: 3300,
      cooldownMs: 820
    },
    3: {
      radius: 158,
      damage: 4,
      durationMs: 4600,
      cooldownMs: 620
    }
  };
  return levels[normalizeLevel(level)];
}

export function getShredderStats(level: number): ShredderStats {
  const levels: Record<number, ShredderStats> = {
    1: {
      radius: 110,
      damage: 4,
      bossDamage: 18,
      bladeCount: 4,
      cooldownMs: 1450
    },
    2: {
      radius: 172,
      damage: 12,
      bossDamage: 36,
      bladeCount: 6,
      cooldownMs: 1180
    },
    3: {
      radius: 270,
      damage: Number.POSITIVE_INFINITY,
      bossDamage: 60,
      bladeCount: 9,
      cooldownMs: 900
    }
  };
  return levels[normalizeLevel(level)];
}

function normalizeLevel(level: number): 1 | 2 | 3 {
  return Math.min(3, Math.max(1, Math.round(level))) as 1 | 2 | 3;
}

export const ENEMIES: Record<EnemyKind, EnemyDefinition> = {
  notification: {
    kind: "notification",
    name: "红点通知",
    texture: "enemy-notification",
    health: 1,
    speed: 122,
    damage: 6,
    xp: 1,
    backlogOnHit: 1,
    radius: 13
  },
  requirement: {
    kind: "requirement",
    name: "紧急需求",
    texture: "enemy-requirement",
    health: 3,
    speed: 84,
    damage: 10,
    xp: 2,
    backlogOnHit: 2,
    radius: 17
  },
  spreadsheet: {
    kind: "spreadsheet",
    name: "Excel 表格",
    texture: "enemy-spreadsheet",
    health: 8,
    speed: 48,
    damage: 16,
    xp: 4,
    backlogOnHit: 4,
    radius: 22
  },
  "final-request": {
    kind: "final-request",
    name: "最后一个需求",
    texture: "enemy-final-request",
    health: 60,
    speed: 58,
    damage: 22,
    xp: 25,
    backlogOnHit: 8,
    radius: 38,
    boss: true
  }
};
