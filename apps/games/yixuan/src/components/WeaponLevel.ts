import type { Component } from '@vib/engine';

export class WeaponLevel implements Component {
  public levels: Map<string, number> = new Map();
  public evolvedWeapon: string | null = null;

  getLevel(weaponKey: string): number {
    return this.levels.get(weaponKey) ?? 1;
  }

  incrementLevel(weaponKey: string): void {
    this.levels.set(weaponKey, this.getLevel(weaponKey) + 1);
  }
}
