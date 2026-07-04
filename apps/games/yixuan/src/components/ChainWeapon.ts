import type { Component } from '@vib/engine';

export class ChainWeapon implements Component {
  public timer = 0;
  constructor(
    public cooldown: number,
    public range: number,
    public damage: number,
    public chainCount: number,
    public chainRange: number,
  ) {}
}
