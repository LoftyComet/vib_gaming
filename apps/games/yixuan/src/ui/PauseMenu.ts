/**
 * PauseMenu — 暂停菜单
 */
import { CanvasRenderer } from '@vib/engine';

export function drawPauseMenu(renderer: CanvasRenderer): void {
  const W = renderer.width;
  const H = renderer.height;

  renderer.ctx.fillStyle = 'rgba(0,0,0,0.5)';
  renderer.ctx.fillRect(0, 0, W, H);

  renderer.drawText('⏸ 暂停', W / 2, H / 2 - 20, '#fff', 28, 'center');
  renderer.drawText('ESC 继续游戏', W / 2, H / 2 + 25, '#9ca3af', 14, 'center');
  renderer.drawText('Q 退出到标题', W / 2, H / 2 + 50, '#555', 12, 'center');
}
