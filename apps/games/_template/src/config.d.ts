/**
 * ============================================================
 * 游戏配置 — 所有可调参数都在这里！
 * ============================================================
 * 修改这些值来调整游戏难度和体验。
 */
/** Canvas 尺寸 */
export declare const GAME_CONFIG: {
    width: number;
    height: number;
};
/** 玩家配置 */
export declare const PLAYER_CONFIG: {
    speed: number;
    maxHealth: number;
    size: number;
    color: string;
    invincibleTime: number;
};
/** 初始武器配置 */
export declare const DEFAULT_WEAPON: {
    cooldown: number;
    range: number;
    damage: number;
    projectileSpeed: number;
    projectileCount: number;
    pierce: number;
};
/** 经验系统配置 */
export declare const XP_CONFIG: {
    baseXP: number;
    growthFactor: number;
};
/** 敌人波次配置 */
export declare const WAVES: {
    startTime: number;
    interval: number;
    count: number;
    health: number;
    speed: number;
    damage: number;
    xpValue: number;
    color: string;
}[];
//# sourceMappingURL=config.d.ts.map