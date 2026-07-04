/**
 * ============================================================
 * Mecha Survival — 机甲割草游戏主场景（协调器）
 * ============================================================
 */
import {
  Scene, InputManager, CanvasRenderer, Camera, PortalBridge,
  Transform, Health, Weapon, Experience,
  PlayerMovementSystem, MovementSystem, AutoAttackSystem,
  ProjectileSystem, LifetimeSystem, EnemyAISystem,
  EnemySpawnSystem, CollisionSystem, XPSystem, RenderSystem,
  setupDamageHandler,
} from '@vib/engine';
import {
  GAME_CONFIG, PLAYER_CONFIG, XP_CONFIG, BOSS_WAVES, WEAPONS, EXTRA_WEAPONS,
} from '../config';
import { FlameWeapon } from '../components/FlameWeapon';
import { ChainWeapon } from '../components/ChainWeapon';
import { OrbitWeapon } from '../components/OrbitWeapon';
import { WeaponLevel } from '../components/WeaponLevel';
import {
  createPlayer, applyWeapon, getWeaponList, getExtraWeapons, getDefaultWeaponIndex,
  xpForLevel, buildWaveConfigs, onComponentAdded, spawnXPGem,
  createPowerUpEntity, type WeaponDef,
} from '../entities/factories';
import {
  createStars, drawStars, drawMecha, drawRobots, drawBosses, drawDashTrail, drawPowerUps,
  drawFlameCone, drawLightningBolts, drawOrbitBlades, type Star,
} from '../render/CustomRenderer';
import { drawHUD, drawGameOver } from '../ui/HUD';
import { UIManager } from '../ui/UIManager';
import { setupTitleClick } from '../ui/TitleScreen';
import { AudioManager } from '../audio/AudioManager';
import { ContactDamageSystem } from '../systems/ContactDamageSystem';
import { BossAISystem } from '../systems/BossAISystem';
import { BossSpawnSystem } from '../systems/BossSpawnSystem';
import { DashSystem } from '../systems/DashSystem';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { BuffSystem } from '../systems/BuffSystem';
import { FlameThrowerSystem } from '../systems/FlameThrowerSystem';
import { ChainLightningSystem } from '../systems/ChainLightningSystem';
import { OrbitWeaponSystem } from '../systems/OrbitWeaponSystem';
import { WeaponEvolutionSystem } from '../systems/WeaponEvolutionSystem';
import { EVOLVED_WEAPONS } from '../weapons/evolution';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ParticleRenderSystem } from '../systems/ParticleRenderSystem';
import { ScreenShakeSystem } from '../systems/ScreenShakeSystem';
import { DamageNumberSystem } from '../systems/DamageNumberSystem';
import { spawnParticleExplosion } from '../entities/factories';

export class GameScene extends Scene {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private input: InputManager;
  private bridge: PortalBridge;

  private playerId = 0;
  private xpSystem: XPSystem | null = null;
  private bossSpawnSystem: BossSpawnSystem | null = null;
  private chainLightningSystem: ChainLightningSystem | null = null;
  private evoSystem: WeaponEvolutionSystem | null = null;
  private particleRenderSystem: ParticleRenderSystem | null = null;
  private screenShakeSystem: ScreenShakeSystem | null = null;
  private damageNumberSystem: DamageNumberSystem | null = null;
  private uiManager: UIManager;
  private audio: AudioManager;

  // weapons
  private weapons: WeaponDef[];
  private currentWeapon = 0;
  private switchCooldown = 0;
  private lastWeaponKeys = new Set<string>();

  // state
  private score = 0;
  private kills = 0;
  private gameOver = false;
  private startTime = 0;

  // visuals
  private stars: Star[] = [];

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.camera = new Camera(0, 0, 1.2);
    this.input = new InputManager(canvas);
    this.bridge = new PortalBridge();
    this.weapons = [...getWeaponList(), ...getExtraWeapons()];
    this.currentWeapon = getDefaultWeaponIndex();
    this.startTime = performance.now();
    this.stars = createStars(120, GAME_CONFIG.width, GAME_CONFIG.height);
    this.uiManager = new UIManager(this.renderer, this.input);
    this.audio = new AudioManager();
    setupTitleClick(this.canvas);
    // init audio on first click
    this.canvas.addEventListener('click', () => this.audio.init(), { once: true });
    document.addEventListener('keydown', () => this.audio.init(), { once: true });
  }

  // ======================== lifecycle ========================

  enter(): void {
    console.log('🤖 机甲启动！');

    this.playerId = createPlayer(this.world);
    applyWeapon(this.world, this.playerId, this.weapons[this.currentWeapon]);

    // systems — order matters
    this.world.addSystem(new PlayerMovementSystem(this.input));
    this.world.addSystem(new DashSystem(this.input)); // after PlayerMovement, before Movement
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new EnemyAISystem());
    this.world.addSystem(new BossAISystem());  // after EnemyAI, overrides boss velocity
    this.world.addSystem(new AutoAttackSystem());
    this.world.addSystem(new FlameThrowerSystem());
    this.chainLightningSystem = new ChainLightningSystem();
    this.world.addSystem(this.chainLightningSystem);
    this.world.addSystem(new OrbitWeaponSystem());
    this.world.addSystem(new ProjectileSystem());
    this.world.addSystem(new ParticleSystem());
    this.world.addSystem(new LifetimeSystem());
    this.world.addSystem(new CollisionSystem());

    const contactSystem = new ContactDamageSystem();
    this.world.addSystem(contactSystem);
    contactSystem.setup(this.world);

    this.xpSystem = new XPSystem(
      (lvl) => xpForLevel(lvl),
      (level) => this.onLevelUp(level),
    );
    this.world.addSystem(this.xpSystem);
    setupDamageHandler(this.world);
    this.setupEvents();

    this.world.addSystem(new PowerUpSystem());
    this.world.addSystem(new BuffSystem());
    this.evoSystem = new WeaponEvolutionSystem();
    this.world.addSystem(this.evoSystem);
    this.world.addSystem(new EnemySpawnSystem(buildWaveConfigs()));
    this.bossSpawnSystem = new BossSpawnSystem(BOSS_WAVES);
    this.world.addSystem(this.bossSpawnSystem);
    this.world.addSystem(new RenderSystem(this.renderer, this.camera));

    // visual effects
    this.particleRenderSystem = new ParticleRenderSystem(this.renderer, this.camera);
    this.world.addSystem(this.particleRenderSystem);
    this.screenShakeSystem = new ScreenShakeSystem(this.camera);
    this.world.addSystem(this.screenShakeSystem);
    this.damageNumberSystem = new DamageNumberSystem(this.renderer, this.camera);
    this.damageNumberSystem.setup(this.world);
    this.world.addSystem(this.damageNumberSystem);

    this.bridge.onCommand((cmd) => {
      if (cmd.type === 'RESTART') this.restart();
    });
  }

  // ======================== events ========================

  private setupEvents(): void {
    const cw = () => this.weapons[this.currentWeapon];

    this.world.events.on('componentAdded', (data: unknown) => {
      const d = data as { entity: number; component: unknown };
      const w = cw();
      onComponentAdded(this.world, d, w.color, w.size);
    });

    this.world.events.on('enemyKilled', (data: unknown) => {
      const d = data as { enemy: number; xpValue: number; position: Transform };
      this.kills++;
      this.score += d.xpValue * 10;
      if (this.xpSystem && d.position) {
        this.xpSystem.spawnXP(this.world, d.position.x, d.position.y, d.xpValue);
      }
      // random power-up drop (15% chance)
      this.tryDropPowerUp(d.position?.x ?? 0, d.position?.y ?? 0);
      // particle explosion
      if (d.position) {
        const enemyColor = (d as any).color ?? '#ff4444';
        spawnParticleExplosion(this.world, d.position.x, d.position.y, enemyColor, 8);
      }
    });

    this.world.events.on('playerHit', (data: unknown) => {
      const d = data as { damage: number };
      console.log(`💥 ${d.damage} 伤害`);
      this.checkGameOver();
    });

    this.world.events.on('levelUp', (data: unknown) => {
      const d = data as { level: number };
      console.log(`⬆️ 等级 ${d.level} · ${this.weapons[this.currentWeapon].name}`);
    });

    this.world.events.on('xpCollected', (data: unknown) => {
      const d = data as { amount: number };
      this.score += d.amount;
    });

    this.world.events.on('bossSpawned', () => {
      this.screenShakeSystem?.trigger(8, 0.4);
      this.damageNumberSystem?.spawn(0, 0, 0); // no-op but could show "BOSS" text
    });

    this.world.events.on('playerHit', () => {
      this.screenShakeSystem?.trigger(3, 0.15);
      this.audio.playPlayerHit();
    });

    // audio hooks
    this.world.events.on('enemyKilled', () => this.audio.playEnemyDeath());
    this.world.events.on('levelUp', () => this.audio.playLevelUp());
    this.world.events.on('bossSpawned', () => this.audio.playBossSpawn());
    this.world.events.on('dashStarted', () => this.audio.playDash());
    this.world.events.on('powerUpCollected', () => this.audio.playPickup());
    this.world.events.on('evolutionReady', () => this.audio.playEvolution());
  }

  // ======================== weapon switching ========================

  private checkWeaponSwitch(): void {
    this.switchCooldown = Math.max(0, this.switchCooldown - 1 / 60);
    if (this.switchCooldown > 0) return;

    for (let i = 0; i < this.weapons.length; i++) {
      const key = this.weapons[i].key;
      const isDown = this.input.isDown(key);
      const wasDown = this.lastWeaponKeys.has(key);
      // edge-detect: only trigger on initial press
      if (isDown && !wasDown) {
        if (i !== this.currentWeapon) {
          console.log(`🔫 切换武器: ${this.weapons[this.currentWeapon].name} → ${this.weapons[i].name} (按下了 ${key} 键)`);
          this.switchWeapon(i);
          this.switchCooldown = 0.3;
        }
        break;
      }
    }

    // Update lastWeaponKeys for next frame
    this.lastWeaponKeys.clear();
    for (const w of this.weapons) {
      if (this.input.isDown(w.key)) {
        this.lastWeaponKeys.add(w.key);
      }
    }
  }

  private switchWeapon(idx: number): void {
    this.currentWeapon = idx;
    applyWeapon(this.world, this.playerId, this.weapons[idx]);
    console.log(`🔫 切换: ${this.weapons[idx].name}`);
  }

  // ======================== level up ========================

  private onLevelUp(level: number): void {
    const wl = this.world.getComponent(this.playerId, WeaponLevel);
    const currentWep = this.weapons[this.currentWeapon];
    const wepKey = this.getWeaponKey(currentWep);

    // track weapon level
    if (wl && wepKey) {
      wl.incrementLevel(wepKey);
    }

    // upgrade projectile weapon
    const wp = this.world.getComponent(this.playerId, Weapon);
    if (wp) {
      if (level % 4 === 0) wp.projectileCount++;
      if (level % 6 === 0) wp.cooldown = Math.max(0.1, wp.cooldown * 0.85);
      wp.damage = Math.floor(wp.damage * 1.08);
    }
    // upgrade flame weapon
    const fw = this.world.getComponent(this.playerId, FlameWeapon);
    if (fw) {
      if (level % 6 === 0) fw.cooldown = Math.max(0.03, fw.cooldown * 0.85);
      fw.damage = Math.floor(fw.damage * 1.08);
    }
    // upgrade chain weapon
    const cw = this.world.getComponent(this.playerId, ChainWeapon);
    if (cw) {
      if (level % 6 === 0) cw.cooldown = Math.max(0.3, cw.cooldown * 0.85);
      cw.damage = Math.floor(cw.damage * 1.08);
    }
    // upgrade orbit weapon
    const ow = this.world.getComponent(this.playerId, OrbitWeapon);
    if (ow) {
      if (level % 6 === 0) ow.cooldown = Math.max(0.15, ow.cooldown * 0.85);
      ow.damage = Math.floor(ow.damage * 1.08);
    }

    // check evolution
    if (wl && this.evoSystem) {
      const evo = this.evoSystem.checkEvo(this.world, this.playerId, wl);
      if (evo) {
        this.applyEvolution(evo.result);
        this.world.events.emit('evolutionReady', { result: evo.result });
      }
    }

    const hp = this.world.getComponent(this.playerId, Health);
    if (hp) hp.heal(8);
  }

  private getWeaponKey(wep: WeaponDef): string | null {
    const allWeapons = { ...WEAPONS, ...EXTRA_WEAPONS };
    for (const [key, val] of Object.entries(allWeapons)) {
      if (val.name === wep.name) return key;
    }
    return null;
  }

  private applyEvolution(resultKey: string): void {
    const evoDef = EVOLVED_WEAPONS[resultKey];
    if (!evoDef) return;
    const wl = this.world.getComponent(this.playerId, WeaponLevel);
    if (wl) wl.evolvedWeapon = resultKey;

    const w: WeaponDef = {
      name: evoDef.name,
      key: this.weapons[this.currentWeapon].key,
      type: evoDef.type,
      cooldown: evoDef.cooldown,
      range: evoDef.range,
      damage: evoDef.damage,
      projectileSpeed: evoDef.projectileSpeed,
      projectileCount: evoDef.projectileCount,
      spreadAngle: evoDef.spreadAngle,
      pierce: evoDef.pierce,
      color: evoDef.color,
      size: evoDef.size,
      desc: evoDef.desc,
      coneAngle: evoDef.coneAngle,
      chainCount: evoDef.chainCount,
      chainRange: evoDef.chainRange,
      orbitRadius: evoDef.orbitRadius,
      orbitSpeed: evoDef.orbitSpeed,
      bladeCount: evoDef.bladeCount,
    };
    this.weapons[this.currentWeapon] = w;
    applyWeapon(this.world, this.playerId, w);
    console.log(`⭐ 武器进化: ${evoDef.name}!`);
    this.screenShakeSystem?.trigger(10, 0.5);
    spawnParticleExplosion(
      this.world,
      this.world.getComponent(this.playerId, Transform)?.x ?? 0,
      this.world.getComponent(this.playerId, Transform)?.y ?? 0,
      evoDef.color, 25,
    );
  }

  // ======================== game over / restart ========================

  private checkGameOver(): void {
    const hp = this.world.getComponent(this.playerId, Health);
    if (!hp || !hp.alive) {
      this.gameOver = true;
      this.uiManager.setGameOver();
      const st = (performance.now() - this.startTime) / 1000;
      this.bridge.reportGameOver({
        score: this.score,
        kills: this.kills,
        survivalTime: Math.floor(st),
        level: this.world.getComponent(this.playerId, Experience)?.level ?? 1,
      } as { score: number; kills: number; survivalTime: number; level: number });
    }
  }

  private restart(): void {
    this.score = 0;
    this.kills = 0;
    this.gameOver = false;
    this.startTime = performance.now();
    this.currentWeapon = getDefaultWeaponIndex();
    this.bossSpawnSystem?.reset();
    this.world.clear();
    this.enter();
  }

  // ======================== power-up drops ========================

  private tryDropPowerUp(x: number, y: number): void {
    if (Math.random() > 0.15) return;
    const types = ['magnet', 'shield', 'speed', 'damage', 'heal'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    const configs: Record<string, { value: number; duration: number; color: string }> = {
      magnet: { value: 2.5, duration: 8, color: '#4ade80' },
      shield: { value: 1, duration: 5, color: '#60a5fa' },
      speed: { value: 1.5, duration: 6, color: '#fbbf24' },
      damage: { value: 2, duration: 8, color: '#ef4444' },
      heal: { value: 30, duration: 0, color: '#f472b6' },
    };
    const cfg = configs[type];
    createPowerUpEntity(this.world, x, y, type, cfg.value, cfg.duration, cfg.color);
  }

  // ======================== main loop ========================

  update(dt: number): void {
    // UI state routing
    const screen = this.uiManager.update();
    if (screen === 'title' || screen === 'paused') {
      return;
    }

    // start music on first gameplay frame
    if (!this.gameOver) {
      this.audio.init();
    }

    if (this.gameOver) return;
    this.renderer.clear('#0a0a1a');
    drawStars(this.renderer, this.stars);
    this.checkWeaponSwitch();
    this.world.update(dt);

    const pt = this.world.getComponent(this.playerId, Transform);
    if (pt) {
      this.camera.lookAt(pt.x, pt.y);
      this.camera.update(dt);
    }

    const st = (performance.now() - this.startTime) / 1000;
    this.bridge.reportScore({
      score: this.score,
      kills: this.kills,
      survivalTime: Math.floor(st),
      level: this.world.getComponent(this.playerId, Experience)?.level ?? 1,
    } as { score: number; kills: number; survivalTime: number; level: number });
    this.checkGameOver();
  }

  // ======================== render overlays ========================

  render(_alpha: number): void {
    const screen = this.uiManager.screen;

    if (screen === 'title') {
      this.uiManager.render();
      return;
    }

    if (screen === 'playing' || screen === 'gameover') {
      drawMecha(this.renderer, this.world, this.playerId, this.camera, this.input, PLAYER_CONFIG.size);
      drawDashTrail(this.renderer, this.world, this.playerId, this.camera, PLAYER_CONFIG.color);
      drawRobots(this.renderer, this.world, this.camera);
      drawBosses(this.renderer, this.world, this.camera);
      drawPowerUps(this.renderer, this.world, this.camera);
      drawFlameCone(this.renderer, this.world, this.camera);
      drawLightningBolts(this.renderer, this.world, this.camera, this.chainLightningSystem?.getBoltChains() ?? []);
      drawOrbitBlades(this.renderer, this.world, this.camera);
      this.damageNumberSystem?.render();
      drawHUD(this.renderer, this.world, this.playerId, this.weapons, this.currentWeapon, this.startTime, this.score, this.kills);
    }

    if (screen === 'paused') {
      // render game underneath + pause overlay
      drawMecha(this.renderer, this.world, this.playerId, this.camera, this.input, PLAYER_CONFIG.size);
      drawRobots(this.renderer, this.world, this.camera);
      drawBosses(this.renderer, this.world, this.camera);
      drawPowerUps(this.renderer, this.world, this.camera);
      drawFlameCone(this.renderer, this.world, this.camera);
      drawLightningBolts(this.renderer, this.world, this.camera, this.chainLightningSystem?.getBoltChains() ?? []);
      drawOrbitBlades(this.renderer, this.world, this.camera);
      this.damageNumberSystem?.render();
      drawHUD(this.renderer, this.world, this.playerId, this.weapons, this.currentWeapon, this.startTime, this.score, this.kills);
      this.uiManager.render();
    }

    if (this.gameOver && screen === 'gameover') {
      const exp = this.world.getComponent(this.playerId, Experience);
      drawGameOver(this.renderer, this.score, this.kills, this.startTime, exp?.level ?? 1, () => {
        this.uiManager.restart();
        this.restart();
      });
    }
  }
}
