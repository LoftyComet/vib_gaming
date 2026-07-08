import type { Component } from '../ecs/Component';

/**
 * 环绕球组件 — 在玩家周围旋转的球体，触碰敌人造成伤害
 */
export class Orbital implements Component {
  constructor(
    public angle: number = 0,        // 当前角度（弧度）
    public distance: number = 80,     // 距玩家距离
    public speed: number = 3,         // 旋转速度（弧度/秒）
    public damage: number = 10,       // 碰撞伤害
    public pierce: number = -1,       // -1 = 无限穿透
    public ownerId: number = 0,       // 所属玩家 entity ID
  ) {}
}
