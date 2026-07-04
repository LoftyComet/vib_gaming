import type { Component } from '@vib/engine';

export class OrbitWeapon implements Component {
  public bladeEntities: number[] = [];
  public timer = 0;
  constructor(
    public cooldown: number,
    public damage: number,
    public orbitRadius: number,
    public orbitSpeed: number,
    public bladeCount: number,
    public color: string,
  ) {}
}
