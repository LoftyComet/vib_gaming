import type { Component } from '@vib/engine';

export class FlameWeapon implements Component {
  public timer = 0;
  constructor(
    public cooldown: number,
    public range: number,
    public damage: number,
    public coneAngle: number,
    public color: string,
  ) {}
}
