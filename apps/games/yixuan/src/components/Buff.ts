/**
 * ============================================================
 * Buff Component — 玩家身上的活跃 Buff
 * ============================================================
 */
import type { Component } from '@vib/engine';
import type { PowerUpType } from './PowerUp';

export interface ActiveBuff {
  type: PowerUpType;
  multiplier: number;
  remaining: number; // seconds
}

export class Buff implements Component {
  public buffs: ActiveBuff[] = [];

  hasBuff(type: PowerUpType): boolean {
    return this.buffs.some((b) => b.type === type);
  }

  addBuff(type: PowerUpType, multiplier: number, duration: number): void {
    // remove existing buff of same type
    this.buffs = this.buffs.filter((b) => b.type !== type);
    this.buffs.push({ type, multiplier, remaining: duration });
  }

  getMultiplier(type: PowerUpType): number {
    const buff = this.buffs.find((b) => b.type === type);
    return buff ? buff.multiplier : 1;
  }
}
