/** 程序化音效 — 无需外部音频文件 */

export class SfxManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** 首次交互后解锁（浏览器自动播放策略） */
  unlock(): void {
    if (this.unlocked) return;
    const c = this.ensureCtx();
    if (!c) return;
    this.unlocked = true;
    // 解锁音（不检查 unlocked 标志）
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.1);
  }

  private playTone(
    freq: number,
    attack: number,
    decay: number,
    type: OscillatorType,
    volume: number
  ): void {
    const c = this.ensureCtx();
    if (!c) return;
    if (!this.unlocked) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + attack + decay + 0.05);
  }

  private playNoise(duration: number, volume: number): void {
    const c = this.ensureCtx();
    if (!c || !this.unlocked) return;

    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.value = volume;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  mow(): void {
    this.playNoise(0.06, 0.08);
  }

  seedDrop(rarity: 'common' | 'uncommon' | 'rare' = 'common'): void {
    const freq = rarity === 'rare' ? 880 : rarity === 'uncommon' ? 660 : 523;
    this.playTone(freq, 0.01, 0.15, 'sine', 0.12);
    this.playTone(freq * 1.5, 0.02, 0.1, 'triangle', 0.06);
  }

  pickup(): void {
    this.playTone(784, 0.01, 0.12, 'sine', 0.1);
  }

  woodDrop(): void {
    this.playTone(180, 0.01, 0.1, 'square', 0.08);
  }

  exitAppear(): void {
    this.playTone(523, 0.02, 0.2, 'sine', 0.1);
    setTimeout(() => this.playTone(659, 0.02, 0.25, 'sine', 0.1), 80);
    setTimeout(() => this.playTone(784, 0.02, 0.3, 'sine', 0.1), 160);
  }

  eventReveal(): void {
    this.playTone(440, 0.02, 0.2, 'sine', 0.1);
    setTimeout(() => this.playTone(554, 0.02, 0.25, 'sine', 0.09), 60);
  }

  eventBad(): void {
    this.playTone(220, 0.02, 0.25, 'triangle', 0.1);
    setTimeout(() => this.playTone(165, 0.02, 0.2, 'triangle', 0.08), 100);
  }

  plant(): void {
    this.playTone(330, 0.01, 0.08, 'sine', 0.09);
    setTimeout(() => this.playTone(440, 0.015, 0.12, 'triangle', 0.07), 50);
    this.playNoise(0.04, 0.05);
  }

  noSeed(): void {
    this.playTone(220, 0.01, 0.08, 'sine', 0.04);
  }
}
