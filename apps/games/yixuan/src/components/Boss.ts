/**
 * ============================================================
 * Boss Component — Boss 敌人标记和行为状态
 * ============================================================
 */
import type { Component } from '@vib/engine';

export type BossType = 'charger' | 'mortar' | 'summoner';

export class Boss implements Component {
  public phase: 1 | 2 = 1;
  public specialTimer = 0;
  public chargeDirection: { x: number; y: number } = { x: 0, y: 0 };
  public chargeState: 'idle' | 'charging' | 'cooldown' = 'idle';
  public chargeTimer = 0;

  constructor(
    public bossType: BossType,
    public specialCooldown: number,
  ) {}
}
