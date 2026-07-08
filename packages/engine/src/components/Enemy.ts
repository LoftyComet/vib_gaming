import type { Component } from '../ecs/Component';

export class Enemy implements Component {
  constructor(
    public xpValue: number = 10,
    public damage: number = 10,
    public speed: number = 80,
    /** 敌人行为类型 */
    public enemyType: string = 'chaser',
    // 射手专用
    public shootCooldown: number = 2.0,
    public shootTimer: number = 0,
    public projectileSpeed: number = 150,
    // 冲刺者专用
    public chargeCooldown: number = 2.5,
    public chargeTimer: number = 0,
    public chargeSpeed: number = 300,
    // 坦克专用
    public splitsOnDeath: boolean = false,
    public splitCount: number = 2,
  ) {}
}
