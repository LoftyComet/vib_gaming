/**
 * ============================================================
 * HUD — 游戏内界面（计时器、分数、武器面板、XP条、血量、结束覆盖层）
 * ============================================================
 */
import { CanvasRenderer, World, Transform, Health, Experience } from '@vib/engine';
import type { WeaponDef } from '../entities/factories';

export function drawHUD(
  renderer: CanvasRenderer,
  world: World,
  playerId: number,
  weapons: WeaponDef[],
  currentWeapon: number,
  startTime: number,
  score: number,
  kills: number,
): void {
  const W = renderer.width;
  const H = renderer.height;
  const exp = world.getComponent(playerId, Experience);
  const hp = world.getComponent(playerId, Health);
  const st = (performance.now() - startTime) / 1000;

  // timer
  renderer.drawText(
    `⏱ ${Math.floor(st / 60)}:${Math.floor(st % 60).toString().padStart(2, '0')}`,
    10, 22, '#9ca3af', 13,
  );
  // score
  renderer.drawText(`💰 ${score.toLocaleString()}`, W / 2, 22, '#fbbf24', 16, 'center');
  // kills
  renderer.drawText(`💀 ${kills}`, W - 10, 22, '#ef4444', 13, 'right');
  // entity count
  renderer.drawText(`👾 ${world.entityCount}`, W - 10, 42, '#9ca3af', 11, 'right');

  // weapon panel
  const pw = weapons[currentWeapon];
  const px = W - 200;
  const py = H - 160;
  renderer.ctx.fillStyle = 'rgba(0,0,0,0.55)';
  renderer.ctx.fillRect(px - 8, py - 4, 196, 150);
  renderer.ctx.strokeStyle = pw.color;
  renderer.ctx.lineWidth = 2;
  renderer.ctx.strokeRect(px - 8, py - 4, 196, 150);

  renderer.drawText('🔫 武器', px, py + 14, '#9ca3af', 11);
  renderer.ctx.fillStyle = pw.color;
  renderer.ctx.font = 'bold 18px monospace';
  renderer.ctx.fillText(pw.name, px, py + 36);
  renderer.drawText(pw.desc, px, py + 54, '#9ca3af', 10);

  for (let i = 0; i < weapons.length; i++) {
    const wi = weapons[i];
    const is = i === currentWeapon;
    renderer.ctx.fillStyle = is ? wi.color : '#555';
    renderer.ctx.font = '11px monospace';
    renderer.ctx.fillText(
      `[${wi.key}] ${wi.name}  ${wi.damage}dmg ${wi.cooldown}s`,
      px, py + 78 + i * 18,
    );
  }

  // XP bar
  if (exp) {
    const bx = 10, by = H - 26, bw = 180, bh = 14;
    renderer.ctx.fillStyle = '#1f2937';
    renderer.ctx.fillRect(bx, by, bw, bh);
    renderer.ctx.fillStyle = '#4ade80';
    renderer.ctx.fillRect(bx, by, bw * exp.ratio, bh);
    renderer.ctx.strokeStyle = '#374151';
    renderer.ctx.strokeRect(bx, by, bw, bh);
    renderer.drawText(
      `Lv.${exp.level}  ${exp.current}/${exp.toNextLevel} XP`,
      bx + bw / 2, by + 11, '#fff', 9, 'center',
    );
  }

  // HP
  if (hp) {
    renderer.drawText(`❤️ ${Math.ceil(hp.current)}/${hp.max}`, 10, H - 32, '#f87171', 11);
  }
}

export function drawGameOver(
  renderer: CanvasRenderer,
  score: number,
  kills: number,
  startTime: number,
  level: number,
  onRestart: () => void,
): void {
  const W = renderer.width;
  const H = renderer.height;
  renderer.ctx.fillStyle = 'rgba(0,0,0,0.65)';
  renderer.ctx.fillRect(0, 0, W, H);
  renderer.drawText('💀 MECHA DESTROYED', W / 2, H / 2 - 40, '#ef4444', 28, 'center');
  const st = Math.floor((performance.now() - startTime) / 1000);
  renderer.drawText(`分数: ${score.toLocaleString()}`, W / 2, H / 2 + 5, '#fbbf24', 20, 'center');
  renderer.drawText(`击杀: ${kills}  存活: ${st}s  Lv.${level}`, W / 2, H / 2 + 32, '#9ca3af', 14, 'center');
  renderer.drawText('按 R 重新开始', W / 2, H / 2 + 60, '#fff', 14, 'center');

  const h = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'r') {
      window.removeEventListener('keydown', h);
      onRestart();
    }
  };
  window.addEventListener('keydown', h);
}
