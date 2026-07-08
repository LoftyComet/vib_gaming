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
import { Scene, InputManager, CanvasRenderer, Camera, PortalBridge, Transform, Velocity, Health, Collider, Weapon, Player, Experience, Sprite, MovementSystem, PlayerMovementSystem, AutoAttackSystem, ProjectileSystem, LifetimeSystem, EnemyAISystem, EnemySpawnSystem, CollisionSystem, XPSystem, RenderSystem, setupDamageHandler, } from '@vib/engine';
import { GAME_CONFIG, PLAYER_CONFIG, DEFAULT_WEAPON, XP_CONFIG, WAVES } from '../config';
export class MyGameScene extends Scene {
    canvas;
    renderer;
    camera;
    input;
    bridge;
    // 实体引用
    playerId = 0;
    xpSystem = null;
    // UI 状态
    score = 0;
    kills = 0;
    gameOver = false;
    startTime = 0;
    showUpgradeMenu = false;
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.renderer = new CanvasRenderer(canvas);
        this.camera = new Camera(0, 0, 1.2); // zoom 1.2x
        this.input = new InputManager(canvas);
        this.bridge = new PortalBridge();
        this.startTime = performance.now();
    }
    enter() {
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
        this.world.addComponent(this.playerId, new Weapon(DEFAULT_WEAPON.cooldown, DEFAULT_WEAPON.range, DEFAULT_WEAPON.damage, DEFAULT_WEAPON.projectileSpeed, DEFAULT_WEAPON.projectileCount, 0, // spread
        DEFAULT_WEAPON.pierce));
        // ============ 添加经验组件 ============
        this.world.addComponent(this.playerId, new Experience(0, XP_CONFIG.baseXP, 1));
        // ============ 注册系统 ============
        // 输入 → 玩家移动
        this.world.addSystem(new PlayerMovementSystem(this.input));
        // 移动所有实体
        this.world.addSystem(new MovementSystem());
        // 敌人 AI
        this.world.addSystem(new EnemyAISystem());
        // 自动攻击
        this.world.addSystem(new AutoAttackSystem());
        // 弹射生命周期
        this.world.addSystem(new ProjectileSystem());
        this.world.addSystem(new LifetimeSystem());
        // 碰撞检测
        this.world.addSystem(new CollisionSystem());
        // XP 收集和升级
        this.xpSystem = new XPSystem((lvl) => Math.floor(XP_CONFIG.baseXP * Math.pow(XP_CONFIG.growthFactor, lvl - 1)), (level) => this.onLevelUp(level));
        this.world.addSystem(this.xpSystem);
        // 伤害处理（监听碰撞事件）
        setupDamageHandler(this.world);
        this.setupEventHandlers();
        // ============ 创建敌人波次 ============
        const ws = WAVES.map((w) => ({
            enemyConfig: {
                health: w.health,
                speed: w.speed,
                damage: w.damage,
                xpValue: w.xpValue,
                color: w.color,
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
            if (cmd.type === 'PAUSE')
                console.log('⏸️ 暂停');
            if (cmd.type === 'RESTART')
                this.restart();
        });
    }
    setupEventHandlers() {
        // 击杀敌人 → 掉落 XP 宝石 + 加分
        this.world.events.on('enemyKilled', (data) => {
            const { xpValue, position } = data;
            this.kills++;
            this.score += xpValue * 10;
            // 掉落 XP 宝石
            if (this.xpSystem && position) {
                this.xpSystem.spawnXP(this.world, position.x, position.y, xpValue);
            }
        });
        // 玩家受伤
        this.world.events.on('playerHit', (data) => {
            const { damage } = data;
            console.log(`💔 受到 ${damage} 点伤害`);
            this.checkGameOver();
        });
        // 升级事件
        this.world.events.on('levelUp', (data) => {
            const { level } = data;
            console.log(`⬆️ 升级！等级 ${level}`);
            this.showUpgradeMenu = true;
        });
        // XP 收集
        this.world.events.on('xpCollected', (data) => {
            const { amount } = data;
            this.score += amount;
        });
    }
    onLevelUp(level) {
        // 每级提升武器属性
        const weapon = this.world.getComponent(this.playerId, Weapon);
        if (!weapon)
            return;
        // 每3级增加弹射数量
        if (level % 3 === 0) {
            weapon.projectileCount++;
        }
        // 每5级减少冷却时间
        if (level % 5 === 0) {
            weapon.cooldown = Math.max(0.2, weapon.cooldown * 0.85);
        }
        // 每级增加伤害
        weapon.damage += 2;
        // 恢复一些血量
        const health = this.world.getComponent(this.playerId, Health);
        if (health) {
            health.heal(10);
        }
    }
    checkGameOver() {
        const health = this.world.getComponent(this.playerId, Health);
        if (!health || !health.alive) {
            this.gameOver = true;
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
    restart() {
        this.score = 0;
        this.kills = 0;
        this.gameOver = false;
        this.startTime = performance.now();
        this.world.clear();
        this.enter();
    }
    // ============ 每帧更新 ============
    update(dt) {
        if (this.gameOver)
            return;
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
    render(_alpha) {
        // 清屏
        this.renderer.clear('#1a1a2e');
        // 绘制网格背景
        this.drawGrid();
        // HUD
        this.drawHUD();
        // 升级菜单
        if (this.showUpgradeMenu) {
            this.drawUpgradeMenu();
        }
    }
    drawGrid() {
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
    drawHUD() {
        const exp = this.world.getComponent(this.playerId, Experience);
        const health = this.world.getComponent(this.playerId, Health);
        const survivalTime = (performance.now() - this.startTime) / 1000;
        const mins = Math.floor(survivalTime / 60);
        const secs = Math.floor(survivalTime % 60);
        // 顶部 HUD
        this.renderer.drawText(`⏱ ${mins}:${secs.toString().padStart(2, '0')}`, 10, 24, '#9ca3af', 14);
        this.renderer.drawText(`💰 ${this.score.toLocaleString()}`, this.renderer.width / 2, 24, '#fbbf24', 18, 'center');
        this.renderer.drawText(`💀 ${this.kills}`, this.renderer.width - 10, 24, '#ef4444', 14, 'right');
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
            this.renderer.drawText(`Lv.${exp.level}  ${exp.current}/${exp.toNextLevel} XP`, barX + barW / 2, barY + 12, '#fff', 10, 'center');
        }
        // 血量
        if (health) {
            this.renderer.drawText(`❤️ ${Math.ceil(health.current)}/${health.max}`, 10, this.renderer.height - 40, '#f87171', 12);
        }
        // 敌人数量
        this.renderer.drawText(`👾 ${this.world.entityCount - 1}`, this.renderer.width - 10, this.renderer.height - 40, '#9ca3af', 12, 'right');
    }
    drawUpgradeMenu() {
        // 简单遮罩
        this.renderer.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.renderer.ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);
        const cx = this.renderer.width / 2;
        const cy = this.renderer.height / 2;
        this.renderer.drawText('⬆️ 升级！点击选择升级', cx, cy - 40, '#fbbf24', 20, 'center');
        this.renderer.drawText('（升级已自动应用：伤害+2，血量恢复）', cx, cy, '#9ca3af', 14, 'center');
        this.renderer.drawText('点击任意位置继续', cx, cy + 40, '#9ca3af', 12, 'center');
        // 点击关闭
        const handler = () => {
            this.showUpgradeMenu = false;
            this.canvas.removeEventListener('click', handler);
        };
        this.canvas.addEventListener('click', handler, { once: true });
    }
}
//# sourceMappingURL=GameScene.js.map