import type { Component } from '../ecs/Component';

/**
 * 连锁闪电武器组件 — 击中一个敌人后跳转到附近其他敌人
 */
export class ChainWeapon implements Component {
  public timer = 0;
  /** 当前连锁的数据（用于渲染），每次攻击后更新 */
  public chainTargets: { x: number; y: number }[] = [];

  constructor(
    public cooldown: number = 0.7,    // 攻击间隔（秒）
    public range: number = 350,       // 初始瞄准范围
    public damage: number = 18,       // 每次伤害
    public chainCount: number = 4,    // 连锁数量（包括首个目标）
    public chainRange: number = 130,  // 跳转范围
    public color: string = '#ffff00', // 闪电颜色
  ) {}

  get ready(): boolean {
    return this.timer <= 0;
  }

  fire(): void {
    this.timer = this.cooldown;
  }
}
