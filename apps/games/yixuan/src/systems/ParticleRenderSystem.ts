/**
 * ParticleRenderSystem — 渲染粒子（带 alpha 混合）
 */
import { System, World, CanvasRenderer, Camera, Transform, Sprite, Lifetime } from '@vib/engine';
import { Particle } from '../components/Particle';

export class ParticleRenderSystem extends System {
  constructor(private renderer: CanvasRenderer, private camera: Camera) {
    super();
  }

  update(_dt: number, world: World): void {
    const particles = world.query(Transform, Sprite, Lifetime, Particle);
    for (const [, transform, sprite, lifetime, particle] of particles) {
      const sc = this.camera.worldToScreen(transform.x, transform.y, this.renderer.width, this.renderer.height);
      const ratio = lifetime.remaining / 15;
      const t = 1 - Math.max(0, Math.min(1, ratio));
      const alpha = particle.startAlpha + (particle.endAlpha - particle.startAlpha) * t;

      const color = particle.color.startsWith('#')
        ? this.hexToRgba(particle.color, alpha)
        : `rgba(255,255,255,${alpha})`;

      this.renderer.ctx.fillStyle = color;
      this.renderer.ctx.beginPath();
      this.renderer.ctx.arc(sc.x, sc.y, sprite.width * this.camera.zoom / 2, 0, Math.PI * 2);
      this.renderer.ctx.fill();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
