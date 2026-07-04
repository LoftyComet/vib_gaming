/**
 * ScreenShakeSystem — 屏幕震动效果
 */
import { System, Camera } from '@vib/engine';

export class ScreenShakeSystem extends System {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  private originalX = 0;
  private originalY = 0;

  constructor(private camera: Camera) {
    super();
  }

  trigger(intensity: number, duration: number): void {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = Math.max(this.duration, duration);
    this.elapsed = 0;
    this.originalX = this.camera.x;
    this.originalY = this.camera.y;
  }

  update(dt: number): void {
    if (this.elapsed >= this.duration) {
      this.intensity = 0;
      return;
    }
    this.elapsed += dt;
    const decay = 1 - this.elapsed / this.duration;
    const currentIntensity = this.intensity * decay;

    this.camera.x = this.originalX + (Math.random() - 0.5) * currentIntensity * 2;
    this.camera.y = this.originalY + (Math.random() - 0.5) * currentIntensity * 2;
  }
}
