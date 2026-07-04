/**
 * 四月物语 — 主场景
 */

import { Scene, InputManager, CanvasRenderer, Camera, PortalBridge } from '@vib/engine';
import {
  COLORS,
  CROPS,
  E_MOW_RADIUS,
  getGrowthMultiplier,
  getPickupRange,
  getScoreTarget,
  getSpeedMultiplier,
  LEVELS,
  MOW_RADIUS,
  pickSeedRarity,
  PLAYER_SIZE,
  PLAYER_SPEED,
  SEED_RARITY_COLORS,
  TILE_SIZE,
} from '../config';
import { applyCardChoice, rollCrateOutcome, rollStoryCrateOutcome } from '../game/CrateEvents';
import { buildMap, countObstacles, tileAt, tileCenter } from '../game/MapBuilder';
import {
  drawCardPicker,
  drawDrops,
  drawEventNotice,
  drawExitWaypoint,
  drawFloatingTexts,
  drawHud,
  drawOverlay,
  drawParticles,
  drawPlantPicker,
  drawPlayer,
  drawTileMap,
} from '../game/FarmRenderer';
import { SfxManager } from '../game/SfxManager';
import type {
  CardOption,
  Cell,
  CropType,
  DropType,
  FloatingText,
  LevelConfig,
  Particle,
  PlayerState,
  RunState,
  SeedRarity,
  WorldDrop,
  GameNotice,
} from '../types';

export class MyGameScene extends Scene {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private input: InputManager;
  private bridge: PortalBridge;

  private player: PlayerState = { x: 0, y: 0, vx: 0, vy: 0, facingX: 0, facingY: 1 };
  private run: RunState;
  private grid: Cell[][] = [];
  private level: LevelConfig = LEVELS[0];
  private drops: WorldDrop[] = [];
  private dropIdCounter = 0;
  private exitTile: { x: number; y: number } | null = null;
  private obstaclesRemaining = 0;
  private startTime = 0;
  private runSeed = Date.now();
  private prevKeys = new Set<string>();
  private mowFlashTimer = 0;
  private sfx = new SfxManager();
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private effectIdCounter = 0;
  private exitPulseTime = 0;
  private interactCooldown = 0;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.camera = new Camera(0, 0, 1.5, 0.12);
    this.input = new InputManager(canvas);
    this.bridge = new PortalBridge();
    this.startTime = performance.now();
    this.run = this.freshRunState();
  }

  private freshRunState(): RunState {
    return {
      levelIndex: 0,
      seedsCollected: 0,
      harvestScore: 0,
      cropsPlanted: 0,
      wood: 0,
      score: 0,
      obstaclesCleared: 0,
      unlockedCrops: new Set<CropType>(['wheat', 'tomato']),
      activeBuffs: new Set(),
      activeDebuffs: new Set(),
      runComplete: false,
      victory: false,
      showCardPicker: false,
      cardOptions: [],
      showPlantPicker: false,
      plantTileX: 0,
      plantTileY: 0,
      message: '',
      messageTimer: 0,
      notice: null,
    };
  }

  enter(): void {
    this.loadLevel(this.run.levelIndex);
    this.bridge.onCommand((cmd) => {
      if (cmd.type === 'RESTART') this.restart();
    });
  }

  private restart(): void {
    this.run = this.freshRunState();
    this.drops = [];
    this.runSeed = Date.now();
    this.startTime = performance.now();
    this.loadLevel(0);
  }

  private loadLevel(index: number): void {
    this.level = LEVELS[Math.min(index, LEVELS.length - 1)];
    this.run.levelIndex = index;
    this.run.harvestScore = 0;
    this.level.scoreTarget = getScoreTarget(this.level.id);
    this.grid = buildMap(this.level, this.runSeed);
    this.obstaclesRemaining = countObstacles(this.grid);
    this.exitTile = null;

    const sx = Math.floor(this.level.width / 2);
    const sy = Math.floor(this.level.height / 2);
    const spawn = tileCenter(sx, sy);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.camera.lookAt(this.player.x, this.player.y);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.showMsg(`来到 ${this.level.name} — 割草开荒，收获作物凑够 ${this.level.scoreTarget} 分过关`);
  }

  private showMsg(text: string, duration = 3): void {
    this.run.message = text;
    this.run.messageTimer = duration;
  }

  private isKeyJustPressed(key: string): boolean {
    const k = key.toLowerCase();
    return this.input.isDown(k) && !this.prevKeys.has(k);
  }

  private syncPrevKeys(): void {
    const current = new Set<string>();
    for (const k of ['w', 'a', 's', 'd', 'e', '1', '2', '3', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']) {
      if (this.input.isDown(k)) current.add(k);
    }
    this.prevKeys = current;
  }

  update(dt: number): void {
    if (this.run.runComplete) return;

    if (this.run.messageTimer > 0) {
      this.run.messageTimer -= dt;
    }

    if (this.run.notice && this.run.notice.timer > 0) {
      this.run.notice.timer -= dt;
      if (this.run.notice.timer <= 0) this.run.notice = null;
    }

    if (this.run.showCardPicker) {
      this.handleCardPickerInput();
      this.syncPrevKeys();
      return;
    }

    if (this.run.showPlantPicker) {
      this.handlePlantPickerInput();
      this.syncPrevKeys();
      return;
    }

    this.updateMovement(dt);
    this.sfx.unlock();
    this.updateMowing();

    if (this.mowFlashTimer > 0) {
      this.mowFlashTimer -= dt;
    }

    if (this.interactCooldown > 0) {
      this.interactCooldown -= dt;
    }

    this.updatePickups(dt);
    this.updateEffects(dt);
    this.updateCrops();

    const ePressed = this.isKeyJustPressed('e');
    const eHeld = this.input.isDown('e');
    if (ePressed) {
      this.handleInteract();
    } else if (eHeld && this.interactCooldown <= 0) {
      // 按住 E 靠近木箱/灌木时也能交互（避免只触发割草、打不开箱子）
      const target = this.findInteractTarget();
      if (target && this.isSpecialInteract(target.tx, target.ty)) {
        this.handleInteractAt(target.tx, target.ty);
        this.interactCooldown = 0.35;
      }
    }

    if (this.run.harvestScore >= this.level.scoreTarget && !this.run.victory) {
      this.onLevelScoreGoalMet();
    }

    this.camera.lookAt(this.player.x, this.player.y);
    this.camera.update(dt);

    const survivalTime = (performance.now() - this.startTime) / 1000;
    this.bridge.reportScore({
      score: this.run.score,
      kills: this.run.obstaclesCleared,
      survivalTime: Math.floor(survivalTime),
      level: this.run.levelIndex + 1,
    });

    this.syncPrevKeys();
  }

  private updateMovement(dt: number): void {
    const dir = this.input.getMovementDirection();
    const speedMul = getSpeedMultiplier(this.run.activeBuffs, this.run.activeDebuffs);
    this.player.vx = dir.x * PLAYER_SPEED * speedMul;
    this.player.vy = dir.y * PLAYER_SPEED * speedMul;

    if (dir.x !== 0 || dir.y !== 0) {
      this.player.facingX = dir.x;
      this.player.facingY = dir.y;
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    const mapW = this.level.width * TILE_SIZE;
    const mapH = this.level.height * TILE_SIZE;
    const pad = PLAYER_SIZE;
    this.player.x = Math.max(pad, Math.min(mapW - pad, this.player.x));
    this.player.y = Math.max(pad, Math.min(mapH - pad, this.player.y));
  }

  /** 移动/按住 E 时自动割杂草 — 快节奏割草手感 */
  private updateMowing(): void {
    const moving = this.player.vx !== 0 || this.player.vy !== 0;
    const holdingE = this.input.isDown('e');

    if (moving) {
      this.mowWeedsInRadius(MOW_RADIUS);
    }
    if (holdingE) {
      this.mowWeedsInRadius(E_MOW_RADIUS);
    }
  }

  private mowWeedsInRadius(radius: number): void {
    const { tx: ptx, ty: pty } = tileAt(this.player.x, this.player.y);
    const tileRadius = Math.ceil(radius / TILE_SIZE) + 1;
    let cleared = 0;

    for (let ty = pty - tileRadius; ty <= pty + tileRadius; ty++) {
      for (let tx = ptx - tileRadius; tx <= ptx + tileRadius; tx++) {
        if (ty < 0 || ty >= this.grid.length || tx < 0 || tx >= this.grid[0].length) continue;
        const c = tileCenter(tx, ty);
        const dx = this.player.x - c.x;
        const dy = this.player.y - c.y;
        if (dx * dx + dy * dy > radius * radius) continue;

        const cell = this.grid[ty][tx];
        if (cell?.obstacle?.type === 'weed') {
          this.clearObstacle(tx, ty, cell, true, cell.obstacle.hasSeed);
          cleared++;
        }
      }
    }

    if (cleared > 0) {
      this.mowFlashTimer = 0.08;
      this.sfx.mow();
    }
  }

  /** 在玩家周围找最近可交互格子（不依赖朝向） */
  private findInteractTarget(): { tx: number; ty: number } | null {
    const { tx: ptx, ty: pty } = tileAt(this.player.x, this.player.y);
    const searchRadius = 2;
    let best: { tx: number; ty: number; priority: number; dist: number } | null = null;

    for (let ty = pty - searchRadius; ty <= pty + searchRadius; ty++) {
      for (let tx = ptx - searchRadius; tx <= ptx + searchRadius; tx++) {
        if (ty < 0 || ty >= this.grid.length || tx < 0 || tx >= this.grid[0].length) continue;

        const dist = this.distToTile(tx, ty);
        if (dist > TILE_SIZE * 1.45) continue;

        const priority = this.getInteractPriority(tx, ty);
        if (priority < 0) continue;

        if (
          !best ||
          priority > best.priority ||
          (priority === best.priority && dist < best.dist)
        ) {
          best = { tx, ty, priority, dist };
        }
      }
    }

    return best ? { tx: best.tx, ty: best.ty } : null;
  }

  private getInteractPriority(tx: number, ty: number): number {
    if (this.exitTile && this.exitTile.x === tx && this.exitTile.y === ty) return 100;

    const cell = this.grid[ty]?.[tx];
    if (!cell) return -1;

    if (cell.obstacle?.type === 'crate') return 90;
    if (cell.obstacle?.type === 'bush') return 80;
    if (cell.crop && this.isCropMature(cell.crop)) return 70;
    if (cell.obstacle?.type === 'weed') return 40;
    if (cell.ground === 'soil' && !cell.crop) return 30;

    return -1;
  }

  private isSpecialInteract(tx: number, ty: number): boolean {
    const p = this.getInteractPriority(tx, ty);
    return p >= 70; // 出口、木箱、灌木、成熟作物
  }

  private handleInteract(): void {
    const target = this.findInteractTarget();
    if (!target) {
      // 退而求其次：朝面向方向
      const face = this.getFacingTile();
      if (this.distToTile(face.tx, face.ty) <= TILE_SIZE * 1.45) {
        this.handleInteractAt(face.tx, face.ty);
        return;
      }
      this.showMsg('附近没有可交互的东西');
      return;
    }
    this.handleInteractAt(target.tx, target.ty);
  }

  private handleInteractAt(tx: number, ty: number): void {
    if (this.distToTile(tx, ty) > TILE_SIZE * 1.45) {
      this.showMsg('再靠近一点');
      return;
    }

    const cell = this.grid[ty]?.[tx];
    if (!cell) return;

    // 出口
    if (this.exitTile && this.exitTile.x === tx && this.exitTile.y === ty) {
      this.advanceLevel();
      return;
    }

    // 收获成熟作物
    if (cell.crop && this.isCropMature(cell.crop)) {
      const crop = CROPS[cell.crop.type];
      this.run.score += crop.score;
      this.run.harvestScore += crop.score;
      cell.crop = undefined;
      const c = tileCenter(tx, ty);
      this.sfx.pickup();
      this.addFloatingText(c.x, c.y, `+${crop.score}`, crop.matureColor);
      this.showMsg(`收获 ${crop.name}！+${crop.score} 分（${this.run.harvestScore}/${this.level.scoreTarget}）`);
      if (this.run.harvestScore >= this.level.scoreTarget && !this.run.victory) {
        this.onLevelScoreGoalMet();
      }
      return;
    }

    // 障碍清除
    if (cell.obstacle) {
      if (cell.obstacle.type === 'weed') {
        this.clearObstacle(tx, ty, cell, false, cell.obstacle.hasSeed);
      } else {
        this.hitObstacle(tx, ty, cell);
      }
      return;
    }

    // 播种
    if (cell.ground === 'soil' && !cell.crop) {
      this.run.showPlantPicker = true;
      this.run.plantTileX = tx;
      this.run.plantTileY = ty;
      return;
    }
  }

  private getFacingTile(): { tx: number; ty: number } {
    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    const ftx = tx + Math.round(this.player.facingX);
    const fty = ty + Math.round(this.player.facingY);
    return {
      tx: Math.max(0, Math.min(this.level.width - 1, ftx)),
      ty: Math.max(0, Math.min(this.level.height - 1, fty)),
    };
  }

  private distToTile(tx: number, ty: number): number {
    const c = tileCenter(tx, ty);
    const dx = this.player.x - c.x;
    const dy = this.player.y - c.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private hitObstacle(tx: number, ty: number, cell: Cell): void {
    const obs = cell.obstacle!;
    obs.hitsLeft--;

    if (obs.hitsLeft <= 0) {
      this.finishObstacleClear(tx, ty, cell, obs.type, false, obs.hasSeed);
    } else {
      this.showMsg(obs.type === 'bush' ? '灌木还需再按 E 清除 1 次' : '继续按 E');
    }
  }

  private clearObstacle(tx: number, ty: number, cell: Cell, silent: boolean, hasSeed?: boolean): void {
    const obs = cell.obstacle!;
    if (obs.type !== 'weed') return;
    this.finishObstacleClear(tx, ty, cell, obs.type, silent, hasSeed ?? obs.hasSeed);
  }

  private finishObstacleClear(
    tx: number,
    ty: number,
    cell: Cell,
    obsType: string,
    silent: boolean,
    hasSeed = false
  ): void {
    const isStoryCrate = cell.obstacle?.isStoryCrate;
    cell.obstacle = undefined;
    cell.ground = 'soil';
    this.run.obstaclesCleared++;
    this.obstaclesRemaining--;

    const c = tileCenter(tx, ty);

    if (obsType === 'weed') {
      if (hasSeed || (this.run.activeBuffs.has('lucky_weed') && Math.random() < 0.35)) {
        this.spawnSeedDrop(tx, ty);
        if (this.run.activeBuffs.has('lucky_weed') && hasSeed && Math.random() < 0.5) {
          this.spawnSeedDrop(tx, ty);
        }
      } else {
        this.spawnClearFx(c.x, c.y, false);
        if (!silent) this.sfx.noSeed();
      }
    } else if (obsType === 'bush') {
      this.spawnDrop(tx, ty, 'wood');
    } else if (obsType === 'crate') {
      this.triggerCrateEvent(c.x, c.y, isStoryCrate);
    }

    if (this.obstaclesRemaining <= 0) {
      this.ensureExit();
    }

    if (!silent && obsType !== 'weed') {
      this.showMsg(this.obstacleClearMsg(obsType, isStoryCrate));
    }
  }

  private obstacleClearMsg(type: string, isStoryCrate?: boolean): string {
    if (type === 'weed') return '发现种子！';
    if (type === 'bush') return '灌木已清除，获得木材！';
    if (isStoryCrate) return '剧情木箱打开，有人从箱里探出头来…';
    return '木箱打开，随机事件触发！';
  }

  private ensureExit(): void {
    if (!this.exitTile) this.spawnExit();
  }

  private spawnExit(): void {
    const ey = Math.floor(this.level.height / 2);
    const ex = this.level.width - 2;
    this.exitTile = { x: ex, y: ey };

    // 从地图中央到出口铺一条路，方便找到
    const sx = Math.floor(this.level.width / 2);
    for (let x = sx; x <= ex; x++) {
      const cell = this.grid[ey][x];
      cell.ground = 'path';
      if (cell.obstacle?.type === 'weed') {
        cell.obstacle = undefined;
      }
    }

    this.sfx.exitAppear();
    const ec = tileCenter(ex, ey);
    this.addFloatingText(ec.x, ec.y - 20, '→ 下一关', COLORS.exitGlow);
    this.spawnClearFx(ec.x, ec.y, true);
    this.showMsg('出口已开启！沿金色大路前往右侧 →', 5);
  }

  private spawnSeedDrop(tx: number, ty: number): void {
    const rarity = pickSeedRarity(this.level.seedRarities);
    this.addDrop(tx, ty, 'seed', rarity);
    const c = tileCenter(tx, ty);
    this.spawnClearFx(c.x, c.y, true);
    this.sfx.seedDrop(rarity);
    const label = rarity === 'rare' ? '✦ 稀有种子' : rarity === 'uncommon' ? '+ 种子' : '+ 种子';
    this.addFloatingText(c.x, c.y, label, SEED_RARITY_COLORS[rarity]);
  }

  private spawnDrop(tx: number, ty: number, type: DropType, rarity?: SeedRarity): void {
    this.addDrop(tx, ty, type, rarity);
    const c = tileCenter(tx, ty);
    if (type === 'wood') {
      this.sfx.woodDrop();
      this.addFloatingText(c.x, c.y, '+ 木材', COLORS.wood);
      this.spawnClearFx(c.x, c.y, true);
    }
  }

  private addDrop(tx: number, ty: number, type: DropType, rarity?: SeedRarity): void {
    const c = tileCenter(tx, ty);
    const angle = Math.random() * Math.PI * 2;
    this.drops.push({
      id: this.dropIdCounter++,
      x: c.x + Math.cos(angle) * 6,
      y: c.y + Math.sin(angle) * 6,
      type,
      rarity,
      spawnTime: performance.now(),
      popVy: 2.5 + Math.random() * 1.5,
    });
  }

  private spawnClearFx(x: number, y: number, isSeed: boolean): void {
    const colors = isSeed
      ? [COLORS.seedWeed, COLORS.seedCommon, '#fff']
      : [COLORS.grassDark, COLORS.weedLight, COLORS.soil];
    for (let i = 0; i < (isSeed ? 10 : 5); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        id: this.effectIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life,
        maxLife: life,
        color: colors[i % colors.length]!,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      id: this.effectIdCounter++,
      x,
      y,
      text,
      life: 1.2,
      color,
    });
  }

  private updateEffects(dt: number): void {
    this.exitPulseTime += dt;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.floatingTexts) {
      t.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((t) => t.life > 0);
  }

  private triggerCrateEvent(x: number, y: number, isStoryCrate?: boolean): void {
    this.spawnClearFx(x, y, true);
    const outcome = isStoryCrate
      ? rollStoryCrateOutcome(this.run, this.run.levelIndex)
      : rollCrateOutcome(this.run);

    if (outcome.type === 'card_picker') {
      this.run.cardOptions = outcome.options;
      this.run.showCardPicker = true;
      this.sfx.eventReveal();
      return;
    }

    outcome.apply?.();
    this.run.notice = { ...outcome.notice };
    if (this.run.harvestScore >= this.level.scoreTarget && !this.run.victory) {
      this.onLevelScoreGoalMet();
    }
    if (outcome.notice.kind === 'debuff' || outcome.notice.kind === 'junk') {
      this.sfx.eventBad();
    } else {
      this.sfx.eventReveal();
    }
  }

  private showNotice(notice: GameNotice): void {
    this.run.notice = { ...notice };
  }

  private handleCardPickerInput(): void {
    const pick = (i: number) => {
      const opt = this.run.cardOptions[i];
      if (opt) {
        const notice = applyCardChoice(this.run, opt);
        this.showNotice(notice);
        this.sfx.eventReveal();
      }
      this.run.showCardPicker = false;
    };
    if (this.isKeyJustPressed('1')) pick(0);
    if (this.isKeyJustPressed('2')) pick(1);
    if (this.isKeyJustPressed('3')) pick(2);
  }

  private handlePlantPickerInput(): void {
    const plant = (crop: CropType) => {
      const tx = this.run.plantTileX;
      const ty = this.run.plantTileY;
      const cell = this.grid[ty][tx];
      if (cell && cell.ground === 'soil' && !cell.crop && this.run.unlockedCrops.has(crop)) {
        cell.crop = { type: crop, plantedAt: performance.now() };
        this.run.cropsPlanted++;
        this.sfx.plant();
        this.showNotice({
          title: `🌱 种下${CROPS[crop].name}`,
          body: `等待成熟后按 E 收获，本关目标 ${this.level.scoreTarget} 分（当前 ${this.run.harvestScore}）`,
          kind: 'info',
          timer: 3,
        });
      }
      this.run.showPlantPicker = false;
    };

    if (this.isKeyJustPressed('1')) plant('wheat');
    if (this.isKeyJustPressed('2')) plant('tomato');
    if (this.isKeyJustPressed('3') && this.run.unlockedCrops.has('sunflower')) plant('sunflower');
    if (this.isKeyJustPressed('e')) this.run.showPlantPicker = false;
  }

  private isCropMature(crop: { type: CropType; plantedAt: number }): boolean {
    const cfg = CROPS[crop.type];
    const growTime = cfg.growTime * getGrowthMultiplier(this.run.activeBuffs, this.run.activeDebuffs);
    return (performance.now() - crop.plantedAt) / 1000 >= growTime;
  }

  private updateCrops(): void {
    // maturity checked on interact / render
  }

  private updatePickups(_dt: number): void {
    const range = getPickupRange(this.run.activeBuffs, this.run.activeDebuffs);
    this.drops = this.drops.filter((d) => {
      const dx = this.player.x - d.x;
      const dy = this.player.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        if (d.type === 'seed') {
          this.run.seedsCollected++;
          this.run.score += d.rarity === 'rare' ? 8 : d.rarity === 'uncommon' ? 4 : 2;
          this.sfx.pickup();
          this.spawnClearFx(d.x, d.y, true);
        } else if (d.type === 'wood') {
          this.run.wood++;
          this.sfx.pickup();
        }
        return false;
      }
      // 磁吸滑动
      if (dist < range * 2) {
        d.x += (dx / dist) * -2;
        d.y += (dy / dist) * -2;
      }
      return true;
    });
  }

  private onLevelScoreGoalMet(): void {
    this.ensureExit();
    if (this.run.levelIndex >= LEVELS.length - 1) {
      this.run.victory = true;
      this.run.runComplete = true;
      const survivalTime = (performance.now() - this.startTime) / 1000;
      this.bridge.reportGameOver({
        score: this.run.score,
        kills: this.run.obstaclesCleared,
        survivalTime: Math.floor(survivalTime),
        level: this.run.levelIndex + 1,
      });
      this.showNotice({
        title: '农场已盘活！',
        body: `收获分 ${this.run.harvestScore}，四月物语迎来新生。`,
        kind: 'buff',
        timer: 8,
      });
    } else {
      this.showNotice({
        title: '本关目标达成！',
        body: `收获 ${this.run.harvestScore}/${this.level.scoreTarget} 分。沿金色大路前往出口，进入下一区域。`,
        kind: 'info',
        timer: 5,
      });
    }
  }

  private advanceLevel(): void {
    const next = this.run.levelIndex + 1;
    if (next >= LEVELS.length) {
      this.run.victory = true;
      this.run.runComplete = true;
      return;
    }
    this.drops = [];
    this.loadLevel(next);
  }

  render(_alpha: number): void {
    this.renderer.clear(COLORS.sky);

    drawTileMap(
      this.renderer,
      this.camera,
      this.grid,
      this.exitTile,
      getGrowthMultiplier(this.run.activeBuffs, this.run.activeDebuffs)
    );
    drawDrops(this.renderer, this.camera, this.drops, performance.now());
    drawParticles(this.renderer, this.camera, this.particles);
    drawFloatingTexts(this.renderer, this.camera, this.floatingTexts);
    drawPlayer(
      this.renderer,
      this.camera,
      this.player.x,
      this.player.y,
      this.player.facingX,
      this.player.facingY,
      this.mowFlashTimer > 0
    );

    const survivalSec = (performance.now() - this.startTime) / 1000;
    drawHud(this.renderer, this.level, this.run, survivalSec);

    if (this.exitTile) {
      drawExitWaypoint(
        this.renderer,
        this.camera,
        this.player.x,
        this.player.y,
        this.exitTile,
        this.exitPulseTime
      );
    }

    if (this.run.showCardPicker) {
      drawCardPicker(this.renderer, this.run.cardOptions);
    }
    if (this.run.showPlantPicker) {
      drawPlantPicker(this.renderer, this.run.unlockedCrops);
    }
    drawEventNotice(this.renderer, this.run.notice);
    if (this.run.victory && this.run.runComplete) {
      drawOverlay(
        this.renderer,
        '农场已盘活！',
        `种植 ${this.run.cropsPlanted} 棵 · 分数 ${this.run.score} · 种子 ${this.run.seedsCollected}`
      );
    }
  }
}
