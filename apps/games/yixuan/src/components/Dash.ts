/**
 * ============================================================
 * Dash Component — 冲刺状态（挂载到玩家）
 * ============================================================
 */
import type { Component } from '@vib/engine';

export class Dash implements Component {
  public isDashing = false;
  public timer = 0;
  public cooldownTimer = 0;
  public direction: { x: number; y: number } = { x: 1, y: 0 };
  public trailPositions: { x: number; y: number; alpha: number }[] = [];

  // config
  public speed = 600;
  public duration = 0.15;
  public cooldown = 2;
  public trailCount = 6;
}
