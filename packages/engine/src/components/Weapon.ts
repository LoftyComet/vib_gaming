import type { Component } from '../ecs/Component';

export class Weapon implements Component {
  public timer = 0;
  /** 武器类型：projectile | orbit | flame | chain */
  public weaponType: string = 'projectile';

  constructor(
    public cooldown: number, // seconds between attacks
    public range: number, // max targeting range
    public damage: number,
    public projectileSpeed: number = 300,
    public projectileCount: number = 1,
    public spreadAngle: number = 0, // spread between projectiles in radians
    public pierce: number = 0 // 0 = destroy on hit, >0 = number of pierces
  ) {}

  get ready(): boolean {
    return this.timer <= 0;
  }

  fire(): void {
    this.timer = this.cooldown;
  }
}
