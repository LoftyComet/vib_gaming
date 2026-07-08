/**
 * ============================================================
 * 游戏主场景 — 在这里组装你的游戏！
 * ============================================================
 * 这是你主要修改的文件：
 *   - 添加自定义武器类型
 *   - 添加自定义敌人行为
 *   - 添加升级选择界面
 *   - 添加特效和音效
 *
 * Query 模式：world.query() 返回元组数组 [entity, comp1, comp2, ...]
 *   使用数组解构: for (const [entity, transform, velocity] of results)
 */

import {
  Scene,
  InputManager,
  CanvasRenderer,
  Camera,
  PortalBridge,
  Transform,
  Velocity,
  Health,
  Collider,
  Weapon,
  Player,
  Enemy,
  Experience,
  Sprite,
  Pickup,
  Orbital,
  FlameWeapon,
  ChainWeapon,
  MovementSystem,
  PlayerMovementSystem,
  AutoAttackSystem,
  ProjectileSystem,
  LifetimeSystem,
  EnemyAISystem,
  EnemySpawnSystem,
  CollisionSystem,
  XPSystem,
  RenderSystem,
  OrbitalSystem,
  FlameThrowerSystem,
  ChainLightningSystem,
  setupDamageHandler,
  type WaveConfig,
} from '@vib/engine';
import {
  GAME_CONFIG,
  PLAYER_CONFIG,
  DEFAULT_WEAPON,
  XP_CONFIG,
  WAVES,
  pickRandomUpgrades,
  WEAPON_DEFS,
  type UpgradeDef,
  type WeaponDef,
} from '../config';

export class MyGameScene extends Scene {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private input: InputManager;
  private bridge: PortalBridge;

  // 实体引用
  private playerId = 0;
  private xpSystem: XPSystem | null = null;

  // UI 状态
  private score = 0;
  private kills = 0;
  private gameOver = false;
  private startTime = 0;
  private showUpgradeMenu = false;
  private currentChoices: UpgradeDef[] = [];
  private takenUpgrades = new Map<string, number>();
  private xpMultiplier = 1.0;
  private paused = false;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.camera = new Camera(0, 0, 1.2); // zoom 1.2x
    this.input = new InputManager(canvas);
    this.bridge = new PortalBridge();
    this.startTime = performance.now();
  }

  enter(): void {
    console.log('🎬 场景开始！');

    // ============ 创建玩家 ============
    this.playerId = this.world.createEntity();
    this.world.addComponent(this.playerId, new Transform(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2));
    this.world.addComponent(this.playerId, new Velocity(0, 0));
    this.world.addComponent(this.playerId, new Health(PLAYER_CONFIG.maxHealth, PLAYER_CONFIG.maxHealth));
    this.world.addComponent(this.playerId, new Player(PLAYER_CONFIG.speed));
    this.world.addComponent(this.playerId, new Sprite(PLAYER_CONFIG.size, PLAYER_CONFIG.size, PLAYER_CONFIG.color));
    this.world.addComponent(this.playerId, new Collider(14, 14, 8));

    // ============ 添加初始武器 ============
    this.addWeaponToPlayer(WEAPON_DEFS.magicBolt);

    // ============ 添加经验组件 ============
    this.world.addComponent(
      this.playerId,
      new Experience(0, XP_CONFIG.baseXP, 1)
    );

    // ============ 注册系统 ============
    // 输入 → 玩家移动
    this.world.addSystem(new PlayerMovementSystem(this.input));
    // 移动所有实体
    this.world.addSystem(new MovementSystem());
    // 敌人 AI
    this.world.addSystem(new EnemyAISystem());
    // 环绕武器
    this.world.addSystem(new OrbitalSystem());
    // 火焰喷射
    this.world.addSystem(new FlameThrowerSystem());
    // 连锁闪电
    this.world.addSystem(new ChainLightningSystem());
    // 自动攻击（投射物武器）
    this.world.addSystem(new AutoAttackSystem());
    // 弹射生命周期
    this.world.addSystem(new ProjectileSystem());
    this.world.addSystem(new LifetimeSystem());
    // 碰撞检测
    this.world.addSystem(new CollisionSystem());
    // XP 收集和升级
    this.xpSystem = new XPSystem(
      (lvl) => Math.floor(XP_CONFIG.baseXP * Math.pow(XP_CONFIG.growthFactor, lvl - 1)),
      (level) => this.onLevelUp(level)
    );
    this.world.addSystem(this.xpSystem);

    // 伤害处理（监听碰撞事件）
    setupDamageHandler(this.world);
    this.setupEventHandlers();

    // ============ 创建敌人波次 ============
    const ws: WaveConfig[] = WAVES.map((w: any) => ({
      enemyConfig: {
        health: w.health,
        speed: w.speed,
        damage: w.damage,
        xpValue: w.xpValue,
        color: w.color,
        size: w.size,
        enemyType: w.enemyType,
        shootCooldown: w.shootCooldown,
        projectileSpeed: w.projectileSpeed,
        chargeCooldown: w.chargeCooldown,
        chargeSpeed: w.chargeSpeed,
        splitsOnDeath: w.splitsOnDeath,
        splitCount: w.splitCount,
      },
      count: w.count,
      interval: w.interval,
      startTime: w.startTime,
    }));
    this.world.addSystem(new EnemySpawnSystem(ws));

    // ============ 渲染系统 ============
    this.world.addSystem(new RenderSystem(this.renderer, this.camera));

    // ============ 监听 Portal 命令 ============
    this.bridge.onCommand((cmd) => {
      if (cmd.type === 'PAUSE') this.togglePause();
      if (cmd.type === 'RESTART') this.restart();
    });
  }

  private setupEventHandlers(): void {
    // 击杀敌人 → 掉落 XP 宝石 + 加分 + 坦克分裂
    this.world.events.on('enemyKilled', (data: unknown) => {
      const { enemy: enemyId, xpValue, position } = data as { enemy: number; xpValue: number; position: Transform };
      this.kills++;
      this.score += Math.floor(xpValue * 10);

      // 掉落 XP 宝石
      if (this.xpSystem && position) {
        this.xpSystem.spawnXP(this.world, position.x, position.y, xpValue);
      }

      // 坦克分裂
      const enemyComp = this.world.getComponent(enemyId, Enemy);
      if (enemyComp && enemyComp.splitsOnDeath && enemyComp.splitCount > 0) {
        for (let i = 0; i < enemyComp.splitCount; i++) {
          const splitEntity = this.world.createEntity();
          const offsetX = (Math.random() - 0.5) * 30;
          const offsetY = (Math.random() - 0.5) * 30;
          this.world.addComponent(splitEntity, new Transform(position.x + offsetX, position.y + offsetY));
          this.world.addComponent(splitEntity, new Velocity(0, 0));
          this.world.addComponent(splitEntity, new Health(20, 20));
          this.world.addComponent(splitEntity, new Enemy(5, 5, 100, 'chaser'));
          this.world.addComponent(splitEntity, new Sprite(10, 10, enemyComp.xpValue ? '#c084fc' : '#c084fc'));
          this.world.addComponent(splitEntity, new Collider(8, 8, 5));
        }
      }
    });

    // 玩家受伤
    this.world.events.on('playerHit', (data: unknown) => {
      const { damage } = data as { damage: number };
      console.log(`💔 受到 ${damage} 点伤害`);
      this.checkGameOver();
    });

    // 升级事件
    this.world.events.on('levelUp', (data: unknown) => {
      const { level } = data as { level: number };
      console.log(`⬆️ 升级！等级 ${level}`);
      this.openUpgradeMenu();
    });

    // XP 收集 (带经验加成)
    this.world.events.on('xpCollected', (data: unknown) => {
      const { amount } = data as { amount: number };
      this.score += Math.floor(amount);
    });
  }

  // ============ 武器管理 ============

  private addWeaponToPlayer(def: WeaponDef): void {
    if (def.type === 'projectile') {
      // 投射物武器 — 使用 Weapon 组件
      const wpn = new Weapon(
        def.cooldown,
        def.range,
        def.damage,
        def.projectileSpeed,
        def.projectileCount,
        def.spreadAngle,
        def.pierce
      );
      wpn.weaponType = 'projectile';
      this.world.addComponent(this.playerId, wpn);
    } else if (def.type === 'orbit') {
      // 环绕武器 — 创建环绕球实体
      const bladeCount = def.bladeCount ?? 2;
      const orbitRadius = def.orbitRadius ?? 65;
      const orbitSpeed = def.orbitSpeed ?? 3.5;
      for (let i = 0; i < bladeCount; i++) {
        const angle = (Math.PI * 2 * i) / bladeCount;
        const bladeEntity = this.world.createEntity();
        this.world.addComponent(bladeEntity, new Transform(
          GAME_CONFIG.width / 2 + Math.cos(angle) * orbitRadius,
          GAME_CONFIG.height / 2 + Math.sin(angle) * orbitRadius
        ));
        this.world.addComponent(bladeEntity, new Orbital(
          angle, orbitRadius, orbitSpeed, def.damage, def.pierce, this.playerId
        ));
        this.world.addComponent(bladeEntity, new Sprite(def.size, def.size, def.color));
        this.world.addComponent(bladeEntity, new Collider(def.size, def.size, def.size / 2));
      }
      // 同时添加 Weapon 标记组件（用于升级系统检测和伤害/冷却修改）
      const markerWpn = new Weapon(def.cooldown, 0, def.damage, 0, 0, 0, 0);
      markerWpn.weaponType = 'orbit';
      this.world.addComponent(this.playerId, markerWpn);
    } else if (def.type === 'flame') {
      // 火焰喷射武器
      const flame = new FlameWeapon(
        def.cooldown, def.range, def.damage,
        def.coneAngle ?? 0.6, def.color
      );
      this.world.addComponent(this.playerId, flame);
      // 同时添加 Weapon 标记组件
      const markerWpn = new Weapon(def.cooldown, 0, def.damage, 0, 0, 0, 0);
      markerWpn.weaponType = 'flame';
      this.world.addComponent(this.playerId, markerWpn);
    } else if (def.type === 'chain') {
      // 连锁闪电武器
      const chain = new ChainWeapon(
        def.cooldown, def.range, def.damage,
        def.chainCount ?? 4, def.chainRange ?? 130, def.color
      );
      this.world.addComponent(this.playerId, chain);
      // 同时添加 Weapon 标记组件
      const markerWpn = new Weapon(def.cooldown, 0, def.damage, 0, 0, 0, 0);
      markerWpn.weaponType = 'chain';
      this.world.addComponent(this.playerId, markerWpn);
    }
  }

  private getPlayerWeapons(): Weapon[] {
    const weapons: Weapon[] = [];
    // 查询所有 Weapon 组件（同一个 entity 可能有多个）
    const allWeapons = this.world.query(Weapon);
    for (const [entity, weapon] of allWeapons) {
      if (entity === this.playerId) {
        weapons.push(weapon);
      }
    }
    return weapons;
  }

  // ============ 升级系统 ============

  private onLevelUp(_level: number): void {
    // 不再自动应用升级 — 由 openUpgradeMenu 处理
  }

  private openUpgradeMenu(): void {
    this.showUpgradeMenu = true;
    this.paused = true;

    // 随机抽取 3 个升级选项
    this.currentChoices = pickRandomUpgrades(this.takenUpgrades, 3);

    // 键盘选择监听
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const idx = parseInt(e.key) - 1;
        if (idx < this.currentChoices.length) {
          this.selectUpgrade(idx);
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private selectUpgrade(index: number): void {
    if (index < 0 || index >= this.currentChoices.length) return;

    const choice = this.currentChoices[index];
    const currentLevel = this.takenUpgrades.get(choice.id) ?? 0;
    this.takenUpgrades.set(choice.id, currentLevel + 1);

    this.applyUpgrade(choice);
    this.closeUpgradeMenu();
  }

  private applyUpgrade(upgrade: UpgradeDef): void {
    switch (upgrade.effectType) {
      case 'damage': {
        const val = upgrade.value ?? 0.2;
        for (const wpn of this.getPlayerWeapons()) {
          wpn.damage = Math.round(wpn.damage * (1 + val));
        }
        // 同步更新火焰武器
        const flame = this.world.getComponent(this.playerId, FlameWeapon);
        if (flame) flame.damage = Math.round(flame.damage * (1 + val));
        // 同步更新连锁武器
        const chain = this.world.getComponent(this.playerId, ChainWeapon);
        if (chain) chain.damage = Math.round(chain.damage * (1 + val));
        // 同步更新环绕球
        for (const [, , orbital] of this.world.query(Transform, Orbital)) {
          if (orbital.ownerId === this.playerId) {
            orbital.damage = Math.round(orbital.damage * (1 + val));
          }
        }
        break;
      }
      case 'speed': {
        const val = upgrade.value ?? 0.15;
        const player = this.world.getComponent(this.playerId, Player);
        if (player) player.speed *= (1 + val);
        break;
      }
      case 'maxHealth': {
        const val = upgrade.value ?? 25;
        const health = this.world.getComponent(this.playerId, Health);
        if (health) {
          health.max += val;
          health.current += val; // 同时恢复
        }
        break;
      }
      case 'cooldown': {
        const val = upgrade.value ?? 0.1;
        for (const wpn of this.getPlayerWeapons()) {
          wpn.cooldown = Math.max(0.05, wpn.cooldown * (1 - val));
        }
        const flame = this.world.getComponent(this.playerId, FlameWeapon);
        if (flame) flame.cooldown = Math.max(0.02, flame.cooldown * (1 - val));
        const chain = this.world.getComponent(this.playerId, ChainWeapon);
        if (chain) chain.cooldown = Math.max(0.1, chain.cooldown * (1 - val));
        break;
      }
      case 'range': {
        const val = upgrade.value ?? 0.15;
        for (const wpn of this.getPlayerWeapons()) {
          if (wpn.range > 0) wpn.range *= (1 + val);
        }
        break;
      }
      case 'pierce': {
        const val = upgrade.value ?? 1;
        for (const wpn of this.getPlayerWeapons()) {
          wpn.pierce += val;
        }
        break;
      }
      case 'projectileCount': {
        const val = upgrade.value ?? 1;
        for (const wpn of this.getPlayerWeapons()) {
          wpn.projectileCount += val;
        }
        break;
      }
      case 'xpGain': {
        this.xpMultiplier *= (1 + (upgrade.value ?? 0.2));
        break;
      }
      case 'heal': {
        const val = upgrade.value ?? 0.3;
        const health = this.world.getComponent(this.playerId, Health);
        if (health) {
          health.heal(Math.floor(health.max * val));
        }
        break;
      }
      case 'shield': {
        // 全屏消灭 — 清除所有敌人
        const enemies = this.world.query(Transform, Enemy);
        for (const [entity] of enemies) {
          this.world.removeEntity(entity);
          this.kills++;
          this.score += 5;
        }
        break;
      }
      case 'weapon': {
        // 解锁新武器
        const weaponId = upgrade.weaponId;
        if (weaponId && WEAPON_DEFS[weaponId]) {
          this.addWeaponToPlayer(WEAPON_DEFS[weaponId]);
        }
        break;
      }
    }
    console.log(`✅ 已选择升级: ${upgrade.name} (${upgrade.rarity})`);
  }

  private closeUpgradeMenu(): void {
    this.showUpgradeMenu = false;
    this.paused = false;
    this.currentChoices = [];

    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }

  // ============ 暂停 ============

  private togglePause(): void {
    this.paused = !this.paused;
    console.log(this.paused ? '⏸️ 暂停' : '▶️ 继续');
  }

  // ============ 游戏结束 ============

  private checkGameOver(): void {
    const health = this.world.getComponent(this.playerId, Health);
    if (!health || !health.alive) {
      this.gameOver = true;
      this.paused = true;
      const survivalTime = (performance.now() - this.startTime) / 1000;
      console.log(`💀 游戏结束！分数: ${this.score}, 击杀: ${this.kills}`);

      // 通知 Portal
      this.bridge.reportGameOver({
        score: this.score,
        kills: this.kills,
        survivalTime: Math.floor(survivalTime),
        level: this.world.getComponent(this.playerId, Experience)?.level ?? 1,
      });
    }
  }

  private restart(): void {
    this.score = 0;
    this.kills = 0;
    this.gameOver = false;
    this.paused = false;
    this.showUpgradeMenu = false;
    this.currentChoices = [];
    this.takenUpgrades.clear();
    this.xpMultiplier = 1.0;
    this.startTime = performance.now();
    this.closeUpgradeMenu();
    this.world.clear();
    this.enter();
  }

  // ============ 每帧更新 ============
  update(dt: number): void {
    if (this.gameOver) return;
    if (this.paused) return; // 升级菜单或暂停时跳过

    // 更新 ECS 系统
    this.world.update(dt);

    // 相机跟随玩家
    const playerTransform = this.world.getComponent(this.playerId, Transform);
    if (playerTransform) {
      this.camera.lookAt(playerTransform.x, playerTransform.y);
      this.camera.update(dt);
    }

    // 向 Portal 报告实时分数
    const survivalTime = (performance.now() - this.startTime) / 1000;
    this.bridge.reportScore({
      score: this.score,
      kills: this.kills,
      survivalTime: Math.floor(survivalTime),
      level: this.world.getComponent(this.playerId, Experience)?.level ?? 1,
    });

    // 检查玩家死亡
    this.checkGameOver();
  }

  // ============ 渲染 ============
  render(_alpha: number): void {
    // 清屏
    this.renderer.clear('#1a1a2e');

    // 绘制网格背景
    this.drawGrid();

    // 绘制武器特效（在实体之上，HUD之下）
    this.drawFlameCone();
    this.drawChainLightning();

    // HUD
    this.drawHUD();

    // 升级菜单
    if (this.showUpgradeMenu) {
      this.drawUpgradeMenu();
    }

    // 暂停覆盖层
    if (this.paused && !this.showUpgradeMenu) {
      this.drawPauseOverlay();
    }

    // 游戏结束覆盖层
    if (this.gameOver) {
      this.drawGameOverOverlay();
    }
  }

  private drawFlameCone(): void {
    const flame = this.world.getComponent(this.playerId, FlameWeapon);
    if (!flame) return;

    const playerTransform = this.world.getComponent(this.playerId, Transform);
    if (!playerTransform) return;

    // 找最近敌人确定瞄准方向
    let aimAngle = 0;
    let nearestDist = Infinity;
    for (const [, enemyTransform] of this.world.query(Transform, Enemy)) {
      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist <= flame.range) {
        nearestDist = dist;
        aimAngle = Math.atan2(dy, dx);
      }
    }
    if (nearestDist === Infinity) return;

    const ctx = this.renderer.ctx;
    const halfCone = flame.coneAngle / 2;

    // 绘制锥形（摄影机空间）
    const screen = this.camera.worldToScreen(playerTransform.x, playerTransform.y, this.renderer.width, this.renderer.height);
    const rangeScreen = flame.range * this.camera.zoom;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = flame.color;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.arc(screen.x, screen.y, rangeScreen, aimAngle - halfCone, aimAngle + halfCone);
    ctx.closePath();
    ctx.fill();

    // 锥形边框
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = flame.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawChainLightning(): void {
    const chain = this.world.getComponent(this.playerId, ChainWeapon);
    if (!chain || chain.chainTargets.length < 2) return;

    const ctx = this.renderer.ctx;
    const targets = chain.chainTargets;

    ctx.save();
    ctx.strokeStyle = chain.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = chain.color;
    ctx.shadowBlur = 8;

    for (let i = 1; i < targets.length; i++) {
      const from = this.camera.worldToScreen(targets[i - 1].x, targets[i - 1].y, this.renderer.width, this.renderer.height);
      const to = this.camera.worldToScreen(targets[i].x, targets[i].y, this.renderer.width, this.renderer.height);

      // 绘制锯齿状闪电
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const segments = 4;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const jitter = (s < segments) ? (Math.random() - 0.5) * 20 : 0;
        const midX = from.x + dx * t + jitter;
        const midY = from.y + dy * t + jitter;
        ctx.lineTo(midX, midY);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawGrid(): void {
    const gridSize = 100;
    const bounds = this.camera.getVisibleBounds(this.renderer.width, this.renderer.height);
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const startY = Math.floor(bounds.top / gridSize) * gridSize;

    this.renderer.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.renderer.ctx.lineWidth = 0.5;

    for (let x = startX; x <= bounds.right; x += gridSize) {
      const screen = this.camera.worldToScreen(x, 0, this.renderer.width, this.renderer.height);
      this.renderer.ctx.beginPath();
      this.renderer.ctx.moveTo(screen.x, 0);
      this.renderer.ctx.lineTo(screen.x, this.renderer.height);
      this.renderer.ctx.stroke();
    }
    for (let y = startY; y <= bounds.bottom; y += gridSize) {
      const screen = this.camera.worldToScreen(0, y, this.renderer.width, this.renderer.height);
      this.renderer.ctx.beginPath();
      this.renderer.ctx.moveTo(0, screen.y);
      this.renderer.ctx.lineTo(this.renderer.width, screen.y);
      this.renderer.ctx.stroke();
    }
  }

  private drawHUD(): void {
    const exp = this.world.getComponent(this.playerId, Experience);
    const health = this.world.getComponent(this.playerId, Health);
    const survivalTime = (performance.now() - this.startTime) / 1000;
    const mins = Math.floor(survivalTime / 60);
    const secs = Math.floor(survivalTime % 60);

    // 顶部 HUD
    this.renderer.drawText(
      `⏱ ${mins}:${secs.toString().padStart(2, '0')}`,
      10, 24,
      '#9ca3af', 14
    );
    this.renderer.drawText(
      `💰 ${this.score.toLocaleString()}`,
      this.renderer.width / 2, 24,
      '#fbbf24', 18, 'center'
    );
    this.renderer.drawText(
      `💀 ${this.kills}`,
      this.renderer.width - 10, 24,
      '#ef4444', 14, 'right'
    );

    // 经验条
    if (exp) {
      const barX = 10;
      const barY = this.renderer.height - 30;
      const barW = 200;
      const barH = 16;

      this.renderer.ctx.fillStyle = '#1f2937';
      this.renderer.ctx.fillRect(barX, barY, barW, barH);
      this.renderer.ctx.fillStyle = '#4ade80';
      this.renderer.ctx.fillRect(barX, barY, barW * exp.ratio, barH);
      this.renderer.ctx.strokeStyle = '#374151';
      this.renderer.ctx.strokeRect(barX, barY, barW, barH);

      this.renderer.drawText(
        `Lv.${exp.level}  ${exp.current}/${exp.toNextLevel} XP`,
        barX + barW / 2, barY + 12,
        '#fff', 10, 'center'
      );
    }

    // 血量
    if (health) {
      this.renderer.drawText(
        `❤️ ${Math.ceil(health.current)}/${health.max}`,
        10, this.renderer.height - 40,
        '#f87171', 12
      );
    }

    // 敌人数量
    this.renderer.drawText(
      `👾 ${this.world.entityCount - 1}`,
      this.renderer.width - 10, this.renderer.height - 40,
      '#9ca3af', 12, 'right'
    );
  }

  private drawUpgradeMenu(): void {
    const ctx = this.renderer.ctx;
    const W = this.renderer.width;
    const H = this.renderer.height;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    // 标题
    this.renderer.drawText('⬆️ 选择升级！', W / 2, 80, '#fbbf24', 24, 'center');
    this.renderer.drawText('按 1 / 2 / 3 或点击卡片选择', W / 2, 108, '#9ca3af', 13, 'center');

    // 3 张卡片
    const cardW = 200;
    const cardH = 180;
    const gap = 24;
    const totalW = cardW * 3 + gap * 2;
    const startX = (W - totalW) / 2;
    const cardY = 145;

    // 稀有度颜色
    const rarityColors: Record<string, { border: string; glow: string }> = {
      common: { border: '#6b7280', glow: 'rgba(107,114,128,0.3)' },
      rare: { border: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
      epic: { border: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
    };
    const rarityLabels: Record<string, string> = {
      common: '普通', rare: '稀有', epic: '史诗',
    };

    // 存储卡片位置用于点击检测
    const cardRects: { x: number; y: number; w: number; h: number }[] = [];

    for (let i = 0; i < this.currentChoices.length; i++) {
      const choice = this.currentChoices[i];
      const cx = startX + i * (cardW + gap);
      const cy = cardY;
      cardRects.push({ x: cx, y: cy, w: cardW, h: cardH });

      const colors = rarityColors[choice.rarity] || rarityColors.common;

      // 卡片背景
      ctx.fillStyle = '#1f2937';
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      this.roundRect(cx, cy, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // 发光效果（稀有/史诗）
      if (choice.rarity !== 'common') {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;
        this.roundRect(cx, cy, cardW, cardH, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 编号标签
      const keyLabel = `[${i + 1}]`;
      this.renderer.drawText(keyLabel, cx + 14, cy + 24, colors.border, 12);

      // 稀有度标签
      this.renderer.drawText(
        rarityLabels[choice.rarity] || '',
        cx + cardW - 14, cy + 24,
        colors.border, 11, 'right'
      );

      // 图标
      this.renderer.drawText(choice.icon, cx + cardW / 2, cy + 65, '#fff', 36, 'center');

      // 名称
      this.renderer.drawText(choice.name, cx + cardW / 2, cy + 95, '#fff', 16, 'center');

      // 描述
      this.renderer.drawText(choice.description, cx + cardW / 2, cy + 118, '#9ca3af', 11, 'center');

      // 当前等级提示
      const currentLvl = this.takenUpgrades.get(choice.id) ?? 0;
      if (currentLvl > 0 && choice.maxLevel > 0) {
        this.renderer.drawText(
          `当前等级: ${currentLvl}/${choice.maxLevel}`,
          cx + cardW / 2, cy + 145,
          '#6b7280', 10, 'center'
        );
      } else if (choice.maxLevel === 0) {
        this.renderer.drawText(
          '可重复选择',
          cx + cardW / 2, cy + 145,
          '#6b7280', 10, 'center'
        );
      }
    }

    // 点击选择监听
    if (!this.clickHandler) {
      this.clickHandler = (e: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        for (let i = 0; i < cardRects.length; i++) {
          const r = cardRects[i];
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            this.selectUpgrade(i);
            return;
          }
        }
      };
      this.canvas.addEventListener('click', this.clickHandler);
    }
  }

  // 圆角矩形辅助
  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.renderer.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawPauseOverlay(): void {
    const ctx = this.renderer.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
    this.renderer.drawText('⏸️ 暂停中', this.renderer.width / 2, this.renderer.height / 2, '#fff', 28, 'center');
  }

  private drawGameOverOverlay(): void {
    const ctx = this.renderer.ctx;
    const W = this.renderer.width;
    const H = this.renderer.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, W, H);

    this.renderer.drawText('💀 游戏结束', W / 2, H / 2 - 60, '#ef4444', 36, 'center');
    this.renderer.drawText(`最终分数: ${this.score.toLocaleString()}`, W / 2, H / 2 - 10, '#fbbf24', 20, 'center');
    this.renderer.drawText(`击杀: ${this.kills}`, W / 2, H / 2 + 25, '#fff', 16, 'center');

    const exp = this.world.getComponent(this.playerId, Experience);
    if (exp) {
      this.renderer.drawText(`等级: ${exp.level}`, W / 2, H / 2 + 55, '#fff', 16, 'center');
    }

    this.renderer.drawText('点击重新开始', W / 2, H / 2 + 100, '#9ca3af', 14, 'center');

    // 点击重新开始
    const restartHandler = () => {
      this.canvas.removeEventListener('click', restartHandler);
      this.restart();
    };
    this.canvas.addEventListener('click', restartHandler, { once: true });
  }
}
