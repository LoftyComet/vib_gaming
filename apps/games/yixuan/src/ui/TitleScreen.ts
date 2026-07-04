/**
 * TitleScreen — 标题画面
 */
import { CanvasRenderer } from '@vib/engine';

let clicked = false;

export function setupTitleClick(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('click', () => { clicked = true; });
}

export function updateTitleScreen(): boolean {
  if (clicked) { clicked = false; return true; }
  return false;
}

export function drawTitleScreen(renderer: CanvasRenderer): void {
  const W = renderer.width;
  const H = renderer.height;

  // background
  renderer.ctx.fillStyle = '#0a0a2e';
  renderer.ctx.fillRect(0, 0, W, H);

  // decorative stars
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137 + 50) % W;
    const sy = (i * 97 + 30) % H;
    const sr = 0.5 + (i % 3) * 0.5;
    const flicker = 0.3 + 0.3 * Math.sin(performance.now() / 1000 * (1 + i * 0.1));
    renderer.ctx.fillStyle = `rgba(255,255,255,${flicker})`;
    renderer.ctx.beginPath();
    renderer.ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    renderer.ctx.fill();
  }

  // title glow
  renderer.ctx.fillStyle = 'rgba(0,212,255,0.15)';
  renderer.ctx.beginPath();
  renderer.ctx.arc(W / 2, H / 2 - 40, 120, 0, Math.PI * 2);
  renderer.ctx.fill();

  // title
  renderer.drawText('MECHA SURVIVAL', W / 2, H / 2 - 40, '#00d4ff', 36, 'center');
  renderer.drawText('机甲割草', W / 2, H / 2, '#9ca3af', 18, 'center');

  // pulse text
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 2);
  const alpha = Math.floor(128 + 127 * pulse).toString(16).padStart(2, '0');
  renderer.drawText(
    '按空格键 或 点击屏幕 开始',
    W / 2, H / 2 + 60,
    `#ffffff${alpha}` as any,
    14, 'center',
  );

  // controls info
  renderer.drawText('WASD 移动 | 1-6 切换武器 | 空格 冲刺 | ESC 暂停', W / 2, H - 30, '#555', 10, 'center');
}
