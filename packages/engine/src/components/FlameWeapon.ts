import type { Component } from '../ecs/Component';

/**
 * 火焰喷射武器组件 — 锥形范围伤害
 */
export class FlameWeapon implements Component {
  public timer = 0;

  constructor(
    public cooldown: number = 0.1,    // 伤害间隔（秒）
    public range: number = 130,       // 火焰射程
    public damage: number = 5,        // 每次伤害
    public coneAngle: number = 0.6,   // 锥形角度（弧度）
    public color: string = '#ff4444', // 火焰颜色
  ) {}

  get ready(): boolean {
    return this.timer <= 0;
  }

  fire(): void {
    this.timer = this.cooldown;
  }
}
