/**
 * April 的游戏配置 — 调整玩家、武器、波次等参数
 */
export const GAME_CONFIG = {
    width: 800,
    height: 600,
};
export const PLAYER_CONFIG = {
    speed: 220,
    maxHealth: 100,
    size: 16,
    color: '#818cf8',
    invincibleTime: 0.5,
};
export const DEFAULT_WEAPON = {
    cooldown: 0.8,
    range: 350,
    damage: 15,
    projectileSpeed: 400,
    projectileCount: 1,
    pierce: 0,
};
export const XP_CONFIG = {
    baseXP: 25,
    growthFactor: 1.2,
};
export const WAVES = [
    {
        startTime: 0,
        interval: 1.5,
        count: 10,
        health: 30,
        speed: 60,
        damage: 8,
        xpValue: 8,
        color: '#ef4444',
    },
];
//# sourceMappingURL=config.js.map