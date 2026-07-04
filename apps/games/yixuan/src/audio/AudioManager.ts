/**
 * AudioManager — Web Audio API 程序化音效 & 音乐
 * 所有音效通过振荡器/噪声合成，无需外部音频文件
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private enabled = true;

  /** 在首次用户交互时调用以初始化 AudioContext */
  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.enabled = false;
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx || this.ctx.state === 'closed') return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // ---- core synthesis ----

  private playTone(
    freq: number, duration: number, type: OscillatorType = 'square',
    volume = 0.15, freqEnd?: number,
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.1): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    source.connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  // ---- sfx ----

  playShoot(): void {
    this.playTone(800, 0.06, 'square', 0.08, 200);
  }
  playMissile(): void {
    this.playNoise(0.1, 0.08);
    this.playTone(150, 0.15, 'triangle', 0.1, 60);
  }
  playSpread(): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playTone(400 + i * 100, 0.04, 'square', 0.05), i * 20);
    }
  }
  playFlame(): void {
    this.playNoise(0.08, 0.06);
  }
  playLightning(): void {
    this.playNoise(0.06, 0.1);
    this.playTone(300, 0.08, 'sawtooth', 0.06);
  }
  playBlade(): void {
    this.playTone(600, 0.05, 'triangle', 0.05, 300);
  }
  playEnemyDeath(): void {
    this.playNoise(0.15, 0.08);
    this.playTone(150, 0.2, 'sawtooth', 0.08, 30);
  }
  playPlayerHit(): void {
    this.playTone(100, 0.1, 'square', 0.12);
  }
  playPickup(): void {
    this.playTone(400, 0.08, 'sine', 0.08, 800);
  }
  playLevelUp(): void {
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.1, 'sine', 0.1), i * 80);
    });
  }
  playDash(): void {
    this.playTone(200, 0.1, 'sawtooth', 0.08, 600);
  }
  playBossSpawn(): void {
    this.playTone(60, 0.4, 'sawtooth', 0.15, 20);
  }
  playEvolution(): void {
    const notes = [262, 330, 392, 523, 659, 784]; // C4 to G5
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'sine', 0.1), i * 100);
    });
  }

  // ---- music ----

  startMusic(): void {
    this.stopMusic();
    const ctx = this.getCtx();
    if (!ctx) return;

    const bpm = 120;
    const beatMs = (60 / bpm) * 1000;

    this.musicInterval = setInterval(() => {
      const c = this.getCtx();
      if (!c) return;
      // bass drum on beats 0, 2, 4, 6
      this.playTone(60, 0.1, 'sine', 0.12, 30);
    }, beatMs / 2);
  }

  stopMusic(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  destroy(): void {
    this.stopMusic();
    this.ctx?.close();
    this.ctx = null;
  }
}
