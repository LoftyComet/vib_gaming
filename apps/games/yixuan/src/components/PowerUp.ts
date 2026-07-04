/**
 * ============================================================
 * PowerUp Component — 可拾取道具
 * ============================================================
 */
import type { Component } from '@vib/engine';

export type PowerUpType = 'magnet' | 'shield' | 'speed' | 'damage' | 'heal';

export class PowerUp implements Component {
  constructor(
    public powerUpType: PowerUpType,
    public value: number,
    public duration: number, // 0 = instant
    public color: string,
  ) {}
}
