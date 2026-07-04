/**
 * ParticleSystem — 更新粒子大小和透明度
 * 粒子实体同时有 Lifetime 组件，由引擎 LifetimeSystem 自动清理
 */
import { System, World, Transform, Sprite, Lifetime } from '@vib/engine';
import { Particle } from '../components/Particle';

export class ParticleSystem extends System {
  update(_dt: number, world: World): void {
    const particles = world.query(Transform, Sprite, Lifetime, Particle);
    for (const [, transform, sprite, lifetime, particle] of particles) {
      const ratio = lifetime.remaining / 15; // rough initial lifetime estimate
      const t = 1 - Math.max(0, Math.min(1, ratio));
      sprite.width = particle.startSize + (particle.endSize - particle.startSize) * t;
      sprite.height = sprite.width;
      // alpha handled in ParticleRenderSystem
    }
  }
}
