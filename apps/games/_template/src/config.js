/**
 * ============================================================
 * 游戏配置 — 所有可调参数都在这里！
 * ============================================================
 * 修改这些值来调整游戏难度和体验。
 */
/** Canvas 尺寸 */
export const GAME_CONFIG = {
    width: 800,
    height: 600,
};
/** 玩家配置 */
export const PLAYER_CONFIG = {
    speed: 220,
    maxHealth: 100,
    size: 16,
    color: '#818cf8', // indigo
    invincibleTime: 0.5, // 受伤后无敌时间（秒）
};
/** 初始武器配置 */
export const DEFAULT_WEAPON = {
    cooldown: 0.8, // 攻击间隔（秒）
    range: 350,
    damage: 15,
    projectileSpeed: 400,
    projectileCount: 1,
    pierce: 0,
};
/** 经验系统配置 */
export const XP_CONFIG = {
    baseXP: 25, // 第一级需要的经验
    growthFactor: 1.2, // 每级增长系数
};
/** 敌人波次配置 */
export const WAVES = [
    {
        // 第一波：简单热身
        startTime: 0,
        interval: 1.5,
        count: 10,
        health: 30,
        speed: 60,
        damage: 8,
        xpValue: 8,
        color: '#ef4444', // red
    },
    {
        // 第二波：更多敌人
        startTime: 15,
        interval: 1.0,
        count: 20,
        health: 50,
        speed: 80,
        damage: 12,
        xpValue: 10,
        color: '#f97316', // orange
    },
    {
        // 第三波：快速敌人
        startTime: 35,
        interval: 0.7,
        count: 30,
        health: 40,
        speed: 120,
        damage: 10,
        xpValue: 12,
        color: '#eab308', // yellow
    },
    {
        // 第四波：厚血敌人
        startTime: 60,
        interval: 1.2,
        count: 25,
        health: 120,
        speed: 50,
        damage: 20,
        xpValue: 20,
        color: '#a855f7', // purple
    },
    {
        // 第五波：地狱模式
        startTime: 90,
        interval: 0.4,
        count: 50,
        health: 80,
        speed: 100,
        damage: 15,
        xpValue: 15,
        color: '#ec4899', // pink
    },
];
//# sourceMappingURL=config.js.map