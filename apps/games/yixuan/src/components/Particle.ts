import type { Component } from '@vib/engine';

export class Particle implements Component {
  constructor(
    public color: string,
    public startSize: number,
    public endSize: number,
    public startAlpha: number,
    public endAlpha: number,
  ) {}
}
