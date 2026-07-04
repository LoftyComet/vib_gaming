import { CanvasRenderer, Camera } from '@vib/engine';
import {
  COLORS,
  CROPS,
  SEED_RARITY_COLORS,
  TILE_SIZE,
} from '../config';
import type { CardOption, Cell, CropType, FloatingText, GameNotice, LevelConfig, Particle, RunState, WorldDrop } from '../types';
import { tileCenter } from './MapBuilder';

export function drawTileMap(
  renderer: CanvasRenderer,
  camera: Camera,
  grid: Cell[][],
  exitTile: { x: number; y: number } | null,
  growMultiplier = 1
): void {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < grid[ty].length; tx++) {
      const cell = grid[ty][tx];
      const cx = tx * TILE_SIZE + TILE_SIZE / 2;
      const cy = ty * TILE_SIZE + TILE_SIZE / 2;
      const screen = camera.worldToScreen(cx, cy, w, h);
      const sz = TILE_SIZE * camera.zoom;
      const left = screen.x - sz / 2;
      const top = screen.y - sz / 2;

      // 地块底色
      const base =
        cell.ground === 'soil'
          ? COLORS.soil
          : cell.ground === 'path'
            ? COLORS.path
            : COLORS.grass;
      ctx.fillStyle = base;
      ctx.fillRect(left, top, sz, sz);

      // 像素风草皮 — 荒草感
      if (cell.ground === 'grass') {
        ctx.fillStyle = COLORS.grassDark;
        const dot = Math.max(2, sz * 0.12);
        ctx.fillRect(left + sz * 0.2, top + sz * 0.25, dot, dot);
        ctx.fillRect(left + sz * 0.65, top + sz * 0.55, dot, dot);
        ctx.fillRect(left + sz * 0.45, top + sz * 0.72, dot, dot);
        // 无障碍的草地也略深，显得「待割」
        if (!cell.obstacle) {
          ctx.fillStyle = 'rgba(61, 107, 79, 0.18)';
          ctx.fillRect(left, top, sz, sz);
        }
      }

      if (cell.ground === 'soil') {
        ctx.fillStyle = COLORS.soilDark;
        ctx.fillRect(left + sz * 0.15, top + sz * 0.4, sz * 0.7, sz * 0.08);
      }

      // 障碍
      if (cell.obstacle) {
        drawObstacle(ctx, left, top, sz, cell.obstacle.type, cell.obstacle.hitsLeft, cell.obstacle.hasSeed, cell.obstacle.isStoryCrate);
      }

      // 作物
      if (cell.crop) {
        drawCrop(ctx, left, top, sz, cell.crop.type, cell.crop.plantedAt, growMultiplier);
      }
    }
  }

  if (exitTile) {
    drawExitPortal(renderer, camera, exitTile, performance.now() / 1000);
  }
}

/** 闪烁发光的出口门户 */
export function drawExitPortal(
  renderer: CanvasRenderer,
  camera: Camera,
  exitTile: { x: number; y: number },
  timeSec: number
): void {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  const { x, y } = tileCenter(exitTile.x, exitTile.y);
  const screen = camera.worldToScreen(x, y, w, h);
  const pulse = 0.5 + Math.sin(timeSec * 4) * 0.5;
  const sz = TILE_SIZE * camera.zoom * (1.15 + pulse * 0.12);

  // 外圈光晕
  ctx.fillStyle = `rgba(255, 214, 10, ${0.15 + pulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, sz * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.exitGlow;
  ctx.fillRect(screen.x - sz / 2, screen.y - sz / 2, sz, sz);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(screen.x - sz / 2, screen.y - sz / 2, sz, sz);

  ctx.fillStyle = COLORS.uiBorder;
  ctx.font = `bold ${Math.max(11, sz * 0.28)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('下一关', screen.x, screen.y - sz * 0.08);
  ctx.font = `${Math.max(14, sz * 0.4)}px monospace`;
  ctx.fillText('→', screen.x, screen.y + sz * 0.22);

  // 竖直引导光柱
  ctx.fillStyle = `rgba(255, 214, 10, ${0.08 + pulse * 0.1})`;
  ctx.fillRect(screen.x - sz * 0.15, screen.y - sz * 1.8, sz * 0.3, sz * 1.5);
}

/** 屏幕边缘指向出口的箭头（出口在视野外时） */
export function drawExitWaypoint(
  renderer: CanvasRenderer,
  camera: Camera,
  playerX: number,
  playerY: number,
  exitTile: { x: number; y: number },
  timeSec: number
): void {
  const w = renderer.width;
  const h = renderer.height;
  const bounds = camera.getVisibleBounds(w, h);
  const exit = tileCenter(exitTile.x, exitTile.y);

  const inView =
    exit.x >= bounds.left &&
    exit.x <= bounds.right &&
    exit.y >= bounds.top &&
    exit.y <= bounds.bottom;
  if (inView) return;

  const pulse = 0.5 + Math.sin(timeSec * 5) * 0.5;
  const dx = exit.x - playerX;
  const dy = exit.y - playerY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ndx = dx / len;
  const ndy = dy / len;

  const margin = 48;
  let sx = w / 2 + ndx * (w / 2 - margin);
  let sy = h / 2 + ndy * (h / 2 - margin);
  sx = Math.max(margin, Math.min(w - margin, sx));
  sy = Math.max(70, Math.min(h - margin, sy));

  const ctx = renderer.ctx;
  const angle = Math.atan2(ndy, ndx);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(255, 214, 10, ${0.85 + pulse * 0.15})`;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  renderer.drawText('出口', sx, sy - 18, COLORS.exitGlow, 12, 'center');
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  sz: number,
  type: string,
  hitsLeft: number,
  hasSeed?: boolean,
  isStoryCrate?: boolean
): void {
  if (type === 'weed') {
    ctx.fillStyle = COLORS.weed;
    const w = sz * 0.1;
    const offsets = [
      [0.28, 0.18, 0.58],
      [0.48, 0.12, 0.62],
      [0.62, 0.2, 0.55],
      [0.38, 0.32, 0.48],
      [0.55, 0.28, 0.52],
    ];
    for (const [ox, oy, oh] of offsets) {
      ctx.fillRect(left + sz * ox, top + sz * oy, w, sz * oh);
    }
    ctx.fillStyle = COLORS.weedLight;
    ctx.fillRect(left + sz * 0.35, top + sz * 0.08, w * 1.2, sz * 0.12);
    ctx.fillRect(left + sz * 0.52, top + sz * 0.05, w * 1.2, sz * 0.14);
    // 含种子的杂草 — 金色闪光点
    if (hasSeed) {
      const t = performance.now() / 300;
      const blink = 0.6 + Math.sin(t) * 0.4;
      ctx.fillStyle = `rgba(244, 211, 94, ${blink})`;
      ctx.beginPath();
      ctx.arc(left + sz * 0.72, top + sz * 0.22, sz * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.seedWeed;
      ctx.fillRect(left + sz * 0.68, top + sz * 0.55, sz * 0.08, sz * 0.08);
    }
  } else if (type === 'bush') {
    ctx.fillStyle = COLORS.bush;
    ctx.beginPath();
    ctx.arc(left + sz / 2, top + sz * 0.45, sz * 0.32, 0, Math.PI * 2);
    ctx.fill();
    if (hitsLeft === 1) {
      ctx.fillStyle = COLORS.grassDark;
      ctx.fillRect(left + sz * 0.35, top + sz * 0.55, sz * 0.3, sz * 0.15);
    }
  } else if (type === 'crate') {
    const t = performance.now() / 400;
    const pulse = 0.5 + Math.sin(t) * 0.5;
    if (isStoryCrate) {
      ctx.fillStyle = `rgba(192, 132, 252, ${0.2 + pulse * 0.25})`;
      ctx.fillRect(left, top, sz, sz);
    } else {
      ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + pulse * 0.12})`;
      ctx.fillRect(left, top, sz, sz);
    }
    ctx.fillStyle = COLORS.crate;
    ctx.fillRect(left + sz * 0.18, top + sz * 0.22, sz * 0.64, sz * 0.56);
    ctx.strokeStyle = isStoryCrate ? '#c084fc' : COLORS.wood;
    ctx.lineWidth = isStoryCrate ? 3 : 2;
    ctx.strokeRect(left + sz * 0.18, top + sz * 0.22, sz * 0.64, sz * 0.56);
    ctx.beginPath();
    ctx.moveTo(left + sz * 0.18, top + sz * 0.42);
    ctx.lineTo(left + sz * 0.82, top + sz * 0.42);
    ctx.stroke();
    ctx.fillStyle = isStoryCrate ? '#c084fc' : `rgba(244, 211, 94, ${0.7 + pulse * 0.3})`;
    ctx.font = `bold ${Math.max(9, sz * (isStoryCrate ? 0.28 : 0.32))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isStoryCrate ? '剧' : '?', left + sz * 0.5, top + sz * 0.4);
  }
}

function drawCrop(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  sz: number,
  cropType: CropType,
  plantedAt: number,
  growMultiplier: number
): void {
  const crop = CROPS[cropType];
  const age = (performance.now() - plantedAt) / 1000;
  const effectiveGrow = crop.growTime * growMultiplier;
  const progress = Math.min(1, age / effectiveGrow);
  const mature = progress >= 1;
  const color = mature ? crop.matureColor : crop.color;
  const scale = 0.25 + progress * 0.45;

  ctx.fillStyle = color;
  if (cropType === 'sunflower') {
    ctx.beginPath();
    ctx.arc(left + sz / 2, top + sz * (0.5 - scale * 0.2), sz * scale * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.soilDark;
    ctx.fillRect(left + sz * 0.47, top + sz * 0.45, sz * 0.06, sz * 0.35);
  } else if (cropType === 'tomato') {
    ctx.beginPath();
    ctx.arc(left + sz / 2, top + sz * 0.5, sz * scale * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(left + sz * (0.5 - scale * 0.15), top + sz * 0.35, sz * scale * 0.3, sz * scale * 0.5);
  }

  if (mature) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left + sz * 0.15, top + sz * 0.15, sz * 0.7, sz * 0.7);
  }
}

export function drawPlayer(
  renderer: CanvasRenderer,
  camera: Camera,
  x: number,
  y: number,
  facingX: number,
  facingY: number,
  mowing = false
): void {
  if (mowing) {
    renderer.drawCircle(x, y, 18, 'rgba(255,255,255,0.12)', camera);
    renderer.drawCircleOutline(x, y, 14, 'rgba(244,211,94,0.45)', 2, camera);
  }
  renderer.drawCircle(x, y, 10, COLORS.player, camera);
  renderer.drawCircleOutline(x, y, 10, COLORS.playerOutline, 2, camera);

  const fx = x + facingX * 14;
  const fy = y + facingY * 14;
  renderer.drawCircle(fx, fy, 3, COLORS.playerOutline, camera);
}

export function drawDrops(
  renderer: CanvasRenderer,
  camera: Camera,
  drops: WorldDrop[],
  now: number
): void {
  for (const d of drops) {
    const age = (now - d.spawnTime) / 1000;
    const bounce = Math.max(0, d.popVy * age - 4.9 * age * age);
    const wobble = Math.sin(age * 8) * 2;
    const drawY = d.y - bounce * 40 + wobble;
    const scale = 1 + Math.min(0.4, age * 3) * (1 - Math.min(1, age));

    const color =
      d.type === 'wood'
        ? COLORS.wood
        : SEED_RARITY_COLORS[d.rarity ?? 'common'];
    const size = 10 * scale;
    renderer.drawRect(d.x, drawY, size, size, color, camera);
    if (d.type === 'seed') {
      renderer.drawCircle(d.x, drawY, 4 * scale, '#fff', camera);
      renderer.drawCircleOutline(d.x, drawY, 6 * scale, color, 1.5, camera);
    }
  }
}

export function drawParticles(
  renderer: CanvasRenderer,
  camera: Camera,
  particles: Particle[]
): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    const ctx = renderer.ctx;
    const screen = camera.worldToScreen(p.x, p.y, renderer.width, renderer.height);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(screen.x - p.size / 2, screen.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

export function drawFloatingTexts(
  renderer: CanvasRenderer,
  camera: Camera,
  texts: FloatingText[]
): void {
  for (const t of texts) {
    const alpha = Math.min(1, t.life / 0.5);
    const rise = (1 - t.life / 1.2) * 24;
    const ctx = renderer.ctx;
    const screen = camera.worldToScreen(t.x, t.y - rise, renderer.width, renderer.height);
    ctx.globalAlpha = alpha;
    renderer.drawText(t.text, screen.x, screen.y, t.color, 13, 'center');
    ctx.globalAlpha = 1;
  }
}

export function drawHud(
  renderer: CanvasRenderer,
  level: LevelConfig,
  run: RunState,
  survivalSec: number
): void {
  const ctx = renderer.ctx;
  const w = renderer.width;

  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, w, 68);

  renderer.drawText(`四月物语 · ${level.name}`, 12, 22, COLORS.hudAccent, 14);
  renderer.drawText(
    `关卡 ${run.levelIndex + 1}  收获 ${run.harvestScore}/${level.scoreTarget} 分`,
    12,
    44,
    COLORS.hudText,
    13
  );
  renderer.drawText(`总分 ${run.score} · 种子 ${run.seedsCollected}`, 12, 58, '#aaa', 11);
  renderer.drawText(`分数 ${run.score}`, w / 2, 32, COLORS.hudText, 14, 'center');
  renderer.drawText(
    `木材 ${run.wood}  清除 ${run.obstaclesCleared}`,
    w - 12,
    32,
    COLORS.hudText,
    13,
    'right'
  );
  renderer.drawText(`${Math.floor(survivalSec / 60)}:${String(Math.floor(survivalSec % 60)).padStart(2, '0')}`, w - 12, 18, '#aaa', 12, 'right');

  if (run.messageTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w / 2 - 160, 68, 320, 28);
    renderer.drawText(run.message, w / 2, 88, COLORS.hudAccent, 13, 'center');
  }

  renderer.drawText('✦=种子杂草 · 剧=剧情木箱 · 收获够分过关', w / 2, renderer.height - 10, '#888', 11, 'center');
}

const NOTICE_COLORS: Record<GameNotice['kind'], string> = {
  buff: '#4ade80',
  debuff: '#f87171',
  rare: '#ffd60a',
  npc: '#c084fc',
  info: '#87ceeb',
  junk: '#9ca3af',
};

/** 屏幕中央事件提示面板 */
export function drawEventNotice(renderer: CanvasRenderer, notice: GameNotice | null): void {
  if (!notice || notice.timer <= 0) return;

  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  const alpha = Math.min(1, notice.timer / 0.5);
  const color = NOTICE_COLORS[notice.kind];

  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, w, h);

  const panelW = Math.min(420, w - 40);
  const panelH = 130;
  const px = (w - panelW) / 2;
  const py = h * 0.28;

  ctx.fillStyle = COLORS.uiPanel;
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, panelW, panelH);

  renderer.drawText(notice.title, w / 2, py + 36, color, 18, 'center');

  // 简单换行
  const words = notice.body;
  const maxChars = 22;
  let line1 = words;
  let line2 = '';
  if (words.length > maxChars) {
    line1 = words.slice(0, maxChars);
    line2 = words.slice(maxChars, maxChars * 2);
    if (words.length > maxChars * 2) line2 += '…';
  }
  renderer.drawText(line1, w / 2, py + 68, '#283618', 13, 'center');
  if (line2) renderer.drawText(line2, w / 2, py + 88, '#283618', 13, 'center');

  if (notice.kind === 'npc') {
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(px + 36, py + panelH / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    renderer.drawText('公', px + 36, py + panelH / 2 + 6, '#fff', 16, 'center');
  }

  ctx.globalAlpha = 1;
}

export function drawCardPicker(renderer: CanvasRenderer, options: CardOption[]): void {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);

  renderer.drawText('选择一张肉鸽卡', w / 2, h * 0.22, COLORS.hudAccent, 20, 'center');

  const cardW = 200;
  const gap = 24;
  const totalW = options.length * cardW + (options.length - 1) * gap;
  let x = (w - totalW) / 2 + cardW / 2;

  options.forEach((opt, i) => {
    const cx = x + i * (cardW + gap);
    const cy = h * 0.48;

    ctx.fillStyle = COLORS.uiPanel;
    ctx.fillRect(cx - cardW / 2, cy - 70, cardW, 140);
    ctx.strokeStyle = COLORS.uiBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - cardW / 2, cy - 70, cardW, 140);

    renderer.drawText(`[${i + 1}]`, cx, cy - 48, COLORS.uiBorder, 14, 'center');
    renderer.drawText(opt.name, cx, cy - 22, '#283618', 16, 'center');
    renderer.drawText(opt.desc, cx, cy + 12, '#606c38', 12, 'center');
  });
}

export function drawPlantPicker(
  renderer: CanvasRenderer,
  unlocked: Set<CropType>
): void {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);

  renderer.drawText('选择作物播种', w / 2, h * 0.3, COLORS.hudAccent, 18, 'center');

  const choices: { key: number; crop: CropType }[] = [
    { key: 1, crop: 'wheat' },
    { key: 2, crop: 'tomato' },
  ];
  if (unlocked.has('sunflower')) choices.push({ key: 3, crop: 'sunflower' });

  let y = h * 0.42;
  for (const c of choices) {
    const crop = CROPS[c.crop];
    renderer.drawText(
      `[${c.key}] ${crop.name} — ${crop.growTime}s  +${crop.score}分`,
      w / 2,
      y,
      COLORS.hudText,
      14,
      'center'
    );
    y += 28;
  }
}

export function drawOverlay(renderer: CanvasRenderer, title: string, subtitle: string): void {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, w, h);
  renderer.drawText(title, w / 2, h / 2 - 20, COLORS.hudAccent, 24, 'center');
  renderer.drawText(subtitle, w / 2, h / 2 + 20, COLORS.hudText, 14, 'center');
}
