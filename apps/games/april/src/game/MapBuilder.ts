import { TILE_SIZE, WEED_SEED_CHANCE } from '../config';
import type { Cell, LevelConfig, ObstacleType } from '../types';

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickObstacle(rand: () => number, weedRatio: number): ObstacleType {
  if (rand() < weedRatio) return 'weed';
  // 非杂草中约 12% 木箱，其余灌木
  if (rand() < 0.12) return 'crate';
  return 'bush';
}

function hitsFor(type: ObstacleType): number {
  if (type === 'bush') return 2;
  return 1;
}

/** 生成本关地图网格 — 高密度杂草为主 */
export function buildMap(level: LevelConfig, runSeed: number): Cell[][] {
  const random = mulberry32(runSeed + level.id * 9973);
  const grid: Cell[][] = [];
  const sx = Math.floor(level.width / 2);
  const sy = Math.floor(level.height / 2);

  for (let y = 0; y < level.height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < level.width; x++) {
      const edge = x === 0 || y === 0 || x === level.width - 1 || y === level.height - 1;
      const spawnClear =
        Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1;

      if (edge) {
        row.push({ ground: 'path' });
        continue;
      }

      if (spawnClear) {
        row.push({ ground: 'path' });
        continue;
      }

      // 成簇杂草：邻域噪声让地图看起来「野」
      const cluster = random() * 0.35 + (x % 3 === 0 && y % 2 === 0 ? 0.25 : 0);
      const density = level.obstacleDensity + cluster * 0.15;
      const placeObstacle = random() < Math.min(0.92, density);

      if (placeObstacle) {
        const type = pickObstacle(random, level.weedRatio);
        const obstacle: Cell['obstacle'] = { type, hitsLeft: hitsFor(type) };
        if (type === 'weed') {
          obstacle.hasSeed = random() < WEED_SEED_CHANCE;
        }
        row.push({ ground: 'grass', obstacle });
      } else {
        // 空草地也略呈荒草感（视觉在 renderer 里处理）
        row.push({ ground: 'grass' });
      }
    }
    grid.push(row);
  }

  grid[sy][sx] = { ground: 'path' };

  ensureStoryCrate(grid, level, random);

  return grid;
}

/** 每关保证恰好一个剧情木箱 */
function ensureStoryCrate(grid: Cell[][], level: LevelConfig, random: () => number): void {
  const crateTiles: { x: number; y: number }[] = [];

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (grid[y][x].obstacle?.type === 'crate') {
        crateTiles.push({ x, y });
      }
    }
  }

  if (crateTiles.length === 0) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = 3 + Math.floor(random() * (level.width - 6));
      const y = 3 + Math.floor(random() * (level.height - 6));
      const cell = grid[y][x];
      if (cell.ground === 'grass' || cell.ground === 'path') {
        grid[y][x] = {
          ground: 'grass',
          obstacle: { type: 'crate', hitsLeft: 1, isStoryCrate: true },
        };
        return;
      }
    }
    return;
  }

  for (const t of crateTiles) {
    grid[t.y][t.x].obstacle!.isStoryCrate = false;
  }
  const pick = crateTiles[Math.floor(random() * crateTiles.length)]!;
  grid[pick.y][pick.x].obstacle!.isStoryCrate = true;
}

export function countObstacles(grid: Cell[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.obstacle) n++;
    }
  }
  return n;
}

export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

export function tileAt(worldX: number, worldY: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(worldX / TILE_SIZE),
    ty: Math.floor(worldY / TILE_SIZE),
  };
}
