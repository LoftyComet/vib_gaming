import Phaser from "phaser";
import {
  BASE_ENEMY_SPAWN_MS,
  BASE_PROJECTILE_SPEED,
  ELEVATOR_OPEN_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEALTH_PACK_FADE_MS,
  HEALTH_PACK_HEAL,
  HEALTH_PACK_LIFETIME_MS,
  HEALTH_PACK_SPAWN_MS,
  PLAYER_INVULNERABILITY_MS,
  RAGE_CLEAR_DURATION_MS,
  WEAPON_REWARD_INTERVAL_MS,
  WORKDAY_DURATION_MS
} from "../config/constants";
import {
  getCoffeeStats,
  getKeyboardStats,
  getShredderStats,
  type EnemyKind,
  type WeaponId
} from "../config/content";
import {
  getDifficulty,
  type DifficultyId
} from "../config/difficulty";
import {
  createSessionState,
  increaseBacklog,
  xpRequiredForLevel,
  type SessionState
} from "../core/session";
import {
  applyUpgrade,
  getUpgradeOptions,
  type UpgradeId,
  type UpgradeOption
} from "../core/upgrades";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";

interface GameSceneData {
  difficulty?: DifficultyId;
}

interface CoffeeZone {
  circle: Phaser.GameObjects.Arc;
  radius: number;
  damage: number;
  expiresAt: number;
  nextTickAt: number;
}

export class GameScene extends Phaser.Scene {
  private difficultyId: DifficultyId = "normal";
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private rewards!: Phaser.Physics.Arcade.Group;
  private healthPacks!: Phaser.Physics.Arcade.Group;
  private desks!: Phaser.Physics.Arcade.StaticGroup;
  private deskBounds: Phaser.Geom.Rectangle[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<
    "up" | "down" | "left" | "right",
    Phaser.Input.Keyboard.Key
  >;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private weaponKeys!: Record<WeaponId, Phaser.Input.Keyboard.Key>;
  private resultRestartKey!: Phaser.Input.Keyboard.Key;
  private resultMenuKey!: Phaser.Input.Keyboard.Key;
  private elapsedMs = 0;
  private lastHitAt = Number.NEGATIVE_INFINITY;
  private evacuationStarted = false;
  private elevator?: Phaser.Physics.Arcade.Image;
  private elevatorEnteredAt?: number;
  private breakZone!: Phaser.Geom.Rectangle;
  private weaponReadyAt: Record<WeaponId, number> = {
    keyboard: 0,
    coffee: 0,
    shredder: 0
  };
  private coffeeZones: CoffeeZone[] = [];
  private rewardSetActive = false;
  private nextWeaponRewardAt = 0;
  private rageClearUntil = 0;

  public constructor() {
    super("game");
  }

  public init(data: GameSceneData): void {
    this.difficultyId = data.difficulty ?? this.difficultyId;
  }

  public create(): void {
    const session = createSessionState(this.difficultyId);
    const difficulty = getDifficulty(session.difficulty);
    this.registry.set("session", session);
    this.elapsedMs = 0;
    this.evacuationStarted = false;
    this.elevator = undefined;
    this.elevatorEnteredAt = undefined;
    this.coffeeZones = [];
    this.rewardSetActive = false;
    this.nextWeaponRewardAt = 0;
    this.rageClearUntil = 0;
    this.weaponReadyAt = { keyboard: 0, coffee: 0, shredder: 0 };

    this.physics.world.resume();
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor("#e9e2d0");
    this.createDeskObstacles();
    this.createBreakZone();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.rewards = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.healthPacks = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.createInputs();
    this.input.setDefaultCursor("crosshair");
    this.createTimers(difficulty.spawnRateMultiplier);
    this.createCollisions();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop("pause");
    });

    if (!this.scene.isActive("ui")) {
      this.scene.launch("ui");
    }
  }

  public update(time: number, delta: number): void {
    const session = this.getSession();

    if (session.phase === "won" || session.phase === "lost") {
      this.player.setVelocity(0);
      this.handleResultInput(session);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
      this.scene.launch("pause");
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.dashKey)) {
      if (this.player.tryDash(time)) {
        session.dashReadyAt = this.player.getDashReadyAt();
      }
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space!) &&
      session.rage >= 100
    ) {
      this.releaseRage();
    }

    this.player.updateMovement(time, this.cursors, this.wasd);
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      if (time < this.rageClearUntil) {
        enemy.setVelocity(0);
      } else {
        enemy.chase(this.player);
      }
    });

    this.elapsedMs += delta;
    session.elapsedMs = this.elapsedMs;
    this.updateBreakZone(session, delta);
    this.handleWeaponSwitch(session);
    this.handleManualAttack(time, session);
    this.updateCoffeeZones(time);
    this.updateHealthPacks(time);
    this.checkRewardProximity();
    this.checkLevelUp();
    this.updateBossAndEvacuation(time, session);
  }

  private createInputs(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    const keys = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.wasd = {
      up: keys.W,
      down: keys.S,
      left: keys.A,
      right: keys.D
    };
    this.dashKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    );
    this.pauseKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.attackKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.J
    );
    this.weaponKeys = {
      keyboard: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.ONE
      ),
      coffee: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.TWO
      ),
      shredder: this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.THREE
      )
    };
    this.resultRestartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );
    this.resultMenuKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.M
    );
  }

  private createTimers(spawnRateMultiplier: number): void {
    this.time.addEvent({
      delay: BASE_ENEMY_SPAWN_MS / spawnRateMultiplier,
      loop: true,
      callback: () => this.spawnEnemy()
    });
    this.time.delayedCall(12 * 1000, () => {
      this.spawnHealthPack();
      this.time.addEvent({
        delay: HEALTH_PACK_SPAWN_MS,
        loop: true,
        callback: () => this.spawnHealthPack()
      });
    });
  }

  private createCollisions(): void {
    this.physics.add.collider(this.player, this.desks);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (projectileObject, enemyObject) => {
        const projectile =
          projectileObject as Phaser.Physics.Arcade.Sprite;
        const enemy = enemyObject as Enemy;
        if (!projectile.active || !enemy.active) {
          return;
        }

        const damage = projectile.getData("damage") as number;
        const penetration = projectile.getData("penetration") as number;
        this.damageEnemy(enemy, damage);

        if (penetration <= 0) {
          projectile.destroy();
        } else {
          projectile.setData("penetration", penetration - 1);
        }
      }
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_playerObject, enemyObject) => {
        this.damagePlayer(enemyObject as Enemy);
      }
    );

    this.physics.add.overlap(
      this.player,
      this.rewards,
      (_playerObject, rewardObject) => {
        this.collectReward(
          rewardObject as Phaser.Physics.Arcade.Sprite
        );
      }
    );

    this.physics.add.overlap(
      this.player,
      this.healthPacks,
      (_playerObject, healthPackObject) => {
        this.collectHealthPack(
          healthPackObject as Phaser.Physics.Arcade.Sprite
        );
      }
    );
  }

  private spawnEnemy(forcedKind?: EnemyKind): void {
    const session = this.getSession();
    if (
      session.phase === "won" ||
      session.phase === "lost" ||
      this.time.now < this.rageClearUntil
    ) {
      return;
    }

    const progress = Math.min(this.elapsedMs / WORKDAY_DURATION_MS, 1);
    const kind = forcedKind ?? this.pickEnemyKind(progress);
    const difficulty = getDifficulty(session.difficulty);
    const position = this.randomEdgePosition();
    const enemy = new Enemy(
      this,
      position.x,
      position.y,
      kind,
      difficulty.enemySpeedMultiplier
    );
    this.enemies.add(enemy);
    if (kind === "final-request") {
      session.bossHealth = enemy.getHealth();
      session.bossMaxHealth = enemy.getMaxHealth();
    }
  }

  private pickEnemyKind(progress: number): EnemyKind {
    const roll = Math.random();
    if (progress < 0.3) {
      return roll < 0.78 ? "notification" : "requirement";
    }
    if (progress < 0.65) {
      return roll < 0.55
        ? "notification"
        : roll < 0.88
          ? "requirement"
          : "spreadsheet";
    }
    return roll < 0.4
      ? "notification"
      : roll < 0.73
        ? "requirement"
        : "spreadsheet";
  }

  private randomEdgePosition(): Phaser.Math.Vector2 {
    const edge = Phaser.Math.Between(0, 3);
    const margin = 24;
    if (edge === 0) {
      return new Phaser.Math.Vector2(
        Phaser.Math.Between(margin, GAME_WIDTH - margin),
        margin
      );
    }
    if (edge === 1) {
      return new Phaser.Math.Vector2(
        GAME_WIDTH - margin,
        Phaser.Math.Between(margin, GAME_HEIGHT - margin)
      );
    }
    if (edge === 2) {
      return new Phaser.Math.Vector2(
        Phaser.Math.Between(margin, GAME_WIDTH - margin),
        GAME_HEIGHT - margin
      );
    }
    return new Phaser.Math.Vector2(
      margin,
      Phaser.Math.Between(margin, GAME_HEIGHT - margin)
    );
  }

  private handleWeaponSwitch(session: SessionState): void {
    (Object.keys(this.weaponKeys) as WeaponId[]).forEach((id) => {
      if (
        Phaser.Input.Keyboard.JustDown(this.weaponKeys[id]) &&
        session.weapons[id] > 0
      ) {
        session.activeWeapon = id;
      }
    });
  }

  private handleManualAttack(time: number, session: SessionState): void {
    const wantsToAttack =
      this.input.activePointer.isDown || this.attackKey.isDown;
    const weaponId = session.activeWeapon;
    const level = session.weapons[weaponId];
    if (
      !wantsToAttack ||
      level <= 0 ||
      time < this.weaponReadyAt[weaponId]
    ) {
      return;
    }

    if (weaponId === "keyboard") {
      this.fireKeyboard(level);
    } else if (weaponId === "coffee") {
      this.spillCoffee(level, time);
    } else {
      this.swingShredder(level);
    }

    const cooldownMs =
      weaponId === "keyboard"
        ? getKeyboardStats(level).cooldownMs
        : weaponId === "coffee"
          ? getCoffeeStats(level).cooldownMs
          : getShredderStats(level).cooldownMs;
    this.weaponReadyAt[weaponId] = time + cooldownMs;
  }

  private fireKeyboard(level: number): void {
    const pointer = this.input.activePointer;
    const stats = getKeyboardStats(level);
    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY
    );

    for (let index = 0; index < stats.projectileCount; index += 1) {
      const offset =
        (index - (stats.projectileCount - 1) / 2) * 0.12;
      const angle = baseAngle + offset;
      const projectile = this.physics.add.sprite(
        this.player.x,
        this.player.y,
        "debug-projectile"
      );
      projectile.setDepth(8);
      projectile.setData("damage", stats.damage);
      projectile.setData("penetration", stats.penetration);
      this.projectiles.add(projectile);
      this.physics.velocityFromRotation(
        angle,
        BASE_PROJECTILE_SPEED + level * 35,
        projectile.body!.velocity
      );
      projectile.setRotation(angle);
      this.time.delayedCall(1500, () => {
        if (projectile.active) {
          projectile.destroy();
        }
      });
    }
  }

  private spillCoffee(level: number, time: number): void {
    const pointer = this.input.activePointer;
    const x = Phaser.Math.Clamp(pointer.worldX, 30, GAME_WIDTH - 30);
    const y = Phaser.Math.Clamp(pointer.worldY, 30, GAME_HEIGHT - 30);
    const stats = getCoffeeStats(level);
    const circle = this.add
      .circle(x, y, stats.radius, 0x92400e, 0.34)
      .setStrokeStyle(3, 0xf59e0b, 0.8)
      .setDepth(1);

    this.coffeeZones.push({
      circle,
      radius: stats.radius,
      damage: stats.damage,
      expiresAt: time + stats.durationMs,
      nextTickAt: time
    });
  }

  private updateCoffeeZones(time: number): void {
    this.coffeeZones = this.coffeeZones.filter((zone) => {
      if (time >= zone.expiresAt) {
        zone.circle.destroy();
        return false;
      }
      if (time >= zone.nextTickAt) {
        zone.nextTickAt = time + 480;
        this.getActiveEnemies().forEach((enemy) => {
          if (
            Phaser.Math.Distance.Between(
              zone.circle.x,
              zone.circle.y,
              enemy.x,
              enemy.y
            ) <= zone.radius
          ) {
            this.damageEnemy(enemy, zone.damage);
          }
        });
      }
      return true;
    });
  }

  private swingShredder(level: number): void {
    const stats = getShredderStats(level);
    const radius = stats.radius;
    const bladeCount = stats.bladeCount;
    const container = this.add.container(this.player.x, this.player.y);
    container.setDepth(9);
    for (let index = 0; index < bladeCount; index += 1) {
      const angle = (Math.PI * 2 * index) / bladeCount;
      const blade = this.add.image(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        "debug-shredder"
      );
      blade.setRotation(angle);
      container.add(blade);
    }

    const shockwave = this.add
      .circle(this.player.x, this.player.y, 24, 0xfbbf24, 0.18)
      .setStrokeStyle(7, 0xf59e0b, 0.9)
      .setDepth(8);
    shockwave.setScale(0.25);
    this.tweens.add({
      targets: shockwave,
      scale: radius / 24,
      alpha: 0,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => shockwave.destroy()
    });
    this.cameras.main.shake(190, 0.008 + level * 0.001);
    this.cameras.main.flash(90, 251, 191, 36);

    this.getActiveEnemies().forEach((enemy) => {
      if (
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          enemy.x,
          enemy.y
        ) <=
        radius + 28
      ) {
        this.damageEnemy(
          enemy,
          enemy.isBoss ? stats.bossDamage : stats.damage
        );
      }
    });

    this.tweens.add({
      targets: container,
      angle: 360,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => {
        container.destroy(true);
      }
    });
  }

  private getActiveEnemies(): Enemy[] {
    return this.enemies
      .getChildren()
      .filter((child) => child.active)
      .map((child) => child as Enemy);
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    if (!enemy.active) {
      return;
    }
    const defeated = enemy.applyDamage(amount);
    if (enemy.isBoss) {
      this.getSession().bossHealth = enemy.getHealth();
    }
    if (!defeated) {
      return;
    }
    this.defeatEnemy(enemy);
  }

  private defeatEnemy(
    enemy: Enemy,
    suppressSecondaryEffects = false
  ): void {
    const kind = enemy.kind;
    const x = enemy.x;
    const y = enemy.y;
    const session = this.getSession();
    session.defeats += 1;
    session.xp += enemy.xpValue;
    if (!suppressSecondaryEffects) {
      session.rage = Math.min(
        100,
        session.rage + (enemy.isBoss ? 25 : 3)
      );
    }

    if (kind === "requirement") {
      session.backlog = Math.max(0, session.backlog - 0.8);
    } else if (kind === "spreadsheet") {
      session.backlog = Math.max(0, session.backlog - 1.8);
    } else if (kind === "final-request") {
      session.bossDefeated = true;
      session.backlog = Math.max(0, session.backlog - 20);
    }

    enemy.destroy();
    if (kind === "requirement" && !suppressSecondaryEffects) {
      this.spawnChildNotification(x - 10, y);
      this.spawnChildNotification(x + 10, y);
    }
    this.checkLevelUp();
  }

  private spawnChildNotification(x: number, y: number): void {
    const difficulty = getDifficulty(this.getSession().difficulty);
    const enemy = new Enemy(
      this,
      x,
      y,
      "notification",
      difficulty.enemySpeedMultiplier
    );
    this.enemies.add(enemy);
  }

  private checkLevelUp(): void {
    const session = this.getSession();
    const required = xpRequiredForLevel(session.level);
    if (
      session.xp < required ||
      this.rewardSetActive ||
      this.time.now < this.nextWeaponRewardAt
    ) {
      return;
    }

    const options = getUpgradeOptions(session);
    if (options.every((option) => option.disabled)) {
      return;
    }
    session.xp -= required;
    session.level += 1;
    this.nextWeaponRewardAt =
      this.time.now + WEAPON_REWARD_INTERVAL_MS;
    this.spawnRewardChoices(options);
  }

  private spawnRewardChoices(options: UpgradeOption[]): void {
    this.rewardSetActive = true;
    const baseAngle = -Math.PI / 2;
    const radius = 215;

    options.forEach((option, index) => {
      const angle = baseAngle + (Math.PI * 2 * index) / options.length;
      const preferredX = Phaser.Math.Clamp(
        this.player.x + Math.cos(angle) * radius,
        70,
        GAME_WIDTH - 70
      );
      const preferredY = Phaser.Math.Clamp(
        this.player.y + Math.sin(angle) * radius,
        100,
        GAME_HEIGHT - 80
      );
      const position = this.findOpenPosition(preferredX, preferredY, 42);
      const texture = `reward-${option.id}`;
      const reward = this.physics.add.sprite(
        position.x,
        position.y,
        texture
      );
      reward.setData("upgradeId", option.id);
      reward.setData("disabled", option.disabled);
      reward.setDepth(12);
      if (option.disabled) {
        reward.setTint(0x94a3b8);
        reward.setAlpha(0.45);
      }
      this.rewards.add(reward);
      if (!option.disabled) {
        this.tweens.add({
          targets: reward,
          scale: { from: 0.96, to: 1.1 },
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        });
      }
    });

    this.cameras.main.flash(100, 34, 197, 94);
  }

  private collectReward(
    reward: Phaser.Physics.Arcade.Sprite
  ): void {
    if (!reward.active || !this.rewardSetActive) {
      return;
    }
    if (reward.getData("disabled") as boolean) {
      return;
    }
    const id = reward.getData("upgradeId") as UpgradeId;
    const session = this.getSession();
    applyUpgrade(session, id);
    this.rewardSetActive = false;
    const remainingRewards = [...this.rewards.getChildren()];
    remainingRewards.forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      this.tweens.killTweensOf(sprite);
    });
    this.rewards.clear(true, true);
    this.cameras.main.flash(140, 250, 204, 21);
    this.cameras.main.shake(90, 0.003);
    this.time.delayedCall(220, () => this.checkLevelUp());
  }

  private spawnHealthPack(): void {
    const session = this.getSession();
    if (
      session.phase === "won" ||
      session.phase === "lost" ||
      this.healthPacks.countActive(true) >= 2
    ) {
      return;
    }

    const position = this.findOpenPosition(
      Phaser.Math.Between(90, GAME_WIDTH - 90),
      Phaser.Math.Between(110, GAME_HEIGHT - 90),
      38
    );
    const healthPack = this.physics.add.sprite(
      position.x,
      position.y,
      "reward-mindset"
    );
    healthPack.setDepth(11);
    healthPack.setData("fadeAt", this.time.now + HEALTH_PACK_LIFETIME_MS - HEALTH_PACK_FADE_MS);
    healthPack.setData("expiresAt", this.time.now + HEALTH_PACK_LIFETIME_MS);
    this.healthPacks.add(healthPack);
  }

  private updateHealthPacks(time: number): void {
    this.healthPacks.getChildren().forEach((child) => {
      const healthPack = child as Phaser.Physics.Arcade.Sprite;
      const fadeAt = healthPack.getData("fadeAt") as number;
      const expiresAt = healthPack.getData("expiresAt") as number;
      if (time >= expiresAt) {
        healthPack.destroy();
        return;
      }
      if (time < fadeAt) {
        return;
      }

      const remainingRatio = Phaser.Math.Clamp(
        (expiresAt - time) / HEALTH_PACK_FADE_MS,
        0,
        1
      );
      const blink = 0.65 + Math.sin(time * 0.025) * 0.25;
      healthPack.setAlpha((0.18 + remainingRatio * 0.82) * blink);
      healthPack.setTint(0xd1fae5);
    });
  }

  private collectHealthPack(
    healthPack: Phaser.Physics.Arcade.Sprite
  ): void {
    const session = this.getSession();
    if (!healthPack.active || session.mindset >= 100) {
      return;
    }

    session.mindset = Math.min(
      100,
      session.mindset + HEALTH_PACK_HEAL
    );
    healthPack.destroy();
    this.cameras.main.flash(110, 34, 197, 94);
  }

  private checkRewardProximity(): void {
    if (!this.rewardSetActive) {
      return;
    }
    const reward = this.rewards
      .getChildren()
      .map((child) => child as Phaser.Physics.Arcade.Sprite)
      .find(
        (candidate) =>
          candidate.active &&
          !(candidate.getData("disabled") as boolean) &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            candidate.x,
            candidate.y
          ) <= 48
      );
    if (reward) {
      this.collectReward(reward);
    }
  }

  private damagePlayer(enemy: Enemy): void {
    const now = this.time.now;
    if (
      !enemy.active ||
      now < this.rageClearUntil ||
      this.player.isDashing(now) ||
      now - this.lastHitAt < PLAYER_INVULNERABILITY_MS
    ) {
      return;
    }

    this.lastHitAt = now;
    const session = this.getSession();
    const difficulty = getDifficulty(session.difficulty);
    session.mindset = Math.max(
      0,
      session.mindset -
        Math.round(enemy.damage * difficulty.enemyDamageMultiplier)
    );
    session.backlog = Math.min(
      100,
      session.backlog + enemy.backlogOnHit
    );
    session.rage = Math.min(100, session.rage + 10);

    this.cameras.main.shake(100, 0.004);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(100, () => this.player.clearTint());

    if (session.mindset <= 0) {
      this.lose("心态归零，精神崩溃");
    } else if (session.backlog >= 100) {
      this.lose("待办爆满，进入无限加班");
    }
  }

  private releaseRage(): void {
    const session = this.getSession();
    session.rage = 0;
    this.rageClearUntil = this.time.now + RAGE_CLEAR_DURATION_MS;

    const desk = this.add
      .rectangle(
        this.player.x,
        this.player.y + 18,
        170,
        78,
        0x92400e,
        0.95
      )
      .setDepth(30)
      .setScale(0.15);
    const shockwave = this.add
      .circle(this.player.x, this.player.y, 24, 0xfacc15, 0.22)
      .setStrokeStyle(10, 0xfbbf24, 1)
      .setDepth(29);

    this.tweens.add({
      targets: desk,
      scaleX: 1,
      scaleY: 1,
      angle: -8,
      duration: 180,
      yoyo: true,
      hold: 90,
      onComplete: () => desk.destroy()
    });
    this.tweens.add({
      targets: shockwave,
      scale: 38,
      alpha: 0,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => shockwave.destroy()
    });
    this.cameras.main.flash(220, 251, 191, 36);
    this.cameras.main.shake(520, 0.014);
    this.projectiles.clear(true, true);
    this.getActiveEnemies().forEach((enemy) => {
      if (enemy.isBoss) {
        this.damageEnemy(enemy, 30);
      } else {
        this.defeatEnemy(enemy, true);
      }
    });
    session.rage = 0;
  }

  private updateBreakZone(session: SessionState, delta: number): void {
    const inBreakZone = this.breakZone.contains(
      this.player.x,
      this.player.y
    );
    session.inBreakZone = inBreakZone;
    const deltaSeconds = delta / 1000;
    const difficulty = getDifficulty(session.difficulty);

    session.backlog = increaseBacklog(
      session.backlog,
      deltaSeconds,
      this.enemies.getLength(),
      difficulty.backlogMultiplier,
      inBreakZone
    );
    if (inBreakZone) {
      session.mindset = Math.min(
        100,
        session.mindset + 5.5 * deltaSeconds
      );
      session.rage = Math.min(100, session.rage + 4 * deltaSeconds);
    }
    if (session.backlog >= 100) {
      this.lose("待办爆满，进入无限加班");
    }
  }

  private updateBossAndEvacuation(
    time: number,
    session: SessionState
  ): void {
    const progress = this.elapsedMs / WORKDAY_DURATION_MS;
    if (progress >= 0.7 && !session.bossSpawned) {
      session.bossSpawned = true;
      this.spawnEnemy("final-request");
      this.cameras.main.flash(280, 124, 58, 237);
    }

    if (
      this.elapsedMs >= WORKDAY_DURATION_MS &&
      session.bossDefeated &&
      !this.evacuationStarted
    ) {
      this.startEvacuation();
    }

    if (session.phase !== "evacuation" || !this.elevator) {
      return;
    }

    const inElevator =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.elevator.x,
        this.elevator.y
      ) < 64;
    if (!inElevator) {
      this.elevatorEnteredAt = undefined;
      session.evacuationProgress = 0;
      return;
    }

    this.elevatorEnteredAt ??= time;
    session.evacuationProgress = Phaser.Math.Clamp(
      (time - this.elevatorEnteredAt) / ELEVATOR_OPEN_MS,
      0,
      1
    );
    if (session.evacuationProgress >= 1) {
      this.win();
    }
  }

  private startEvacuation(): void {
    this.evacuationStarted = true;
    const session = this.getSession();
    session.phase = "evacuation";
    this.elevator = this.physics.add.staticImage(
      GAME_WIDTH - 70,
      GAME_HEIGHT / 2,
      "debug-elevator"
    );
    this.elevator.setDepth(2);
  }

  private win(): void {
    const session = this.getSession();
    session.phase = "won";
    session.resultReason = "成功进入电梯，准点下班";
    this.player.setVelocity(0);
    this.physics.pause();
  }

  private lose(reason: string): void {
    const session = this.getSession();
    if (session.phase === "lost") {
      return;
    }
    session.phase = "lost";
    session.resultReason = reason;
    this.player.setVelocity(0);
    this.physics.pause();
  }

  private handleResultInput(session: SessionState): void {
    if (Phaser.Input.Keyboard.JustDown(this.resultRestartKey)) {
      this.scene.restart({ difficulty: session.difficulty });
    } else if (Phaser.Input.Keyboard.JustDown(this.resultMenuKey)) {
      this.scene.stop("ui");
      this.scene.start("menu");
    }
  }

  private createBreakZone(): void {
    this.breakZone = new Phaser.Geom.Rectangle(
      38,
      GAME_HEIGHT - 150,
      230,
      112
    );
    this.add
      .rectangle(
        this.breakZone.centerX,
        this.breakZone.centerY,
        this.breakZone.width,
        this.breakZone.height,
        0x0ea5e9,
        0.16
      )
      .setStrokeStyle(3, 0x0284c7, 0.7)
      .setDepth(0);
    this.add
      .circle(this.breakZone.centerX, this.breakZone.centerY, 22, 0x0284c7, 0.7)
      .setDepth(0);
    this.add
      .rectangle(
        this.breakZone.centerX,
        this.breakZone.centerY,
        22,
        28,
        0xe0f2fe
      )
      .setDepth(0);
    this.add
      .text(
        this.breakZone.centerX,
        this.breakZone.centerY + 35,
        "摸鱼区\n心态/怒气 ↑  待办 ↑↑",
        {
          align: "center",
        color: "#075985",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "15px",
        fontStyle: "bold"
        }
      )
      .setOrigin(0.5)
      .setDepth(0);
  }

  private createDeskObstacles(): void {
    this.desks = this.physics.add.staticGroup();
    this.deskBounds = [];
    const columns = [220, 480, 740, 1000];
    const rows = [190, 455];

    rows.forEach((y) => {
      columns.forEach((x) => {
        const desk = this.add
          .rectangle(x, y, 144, 66, 0xcbbda4, 1)
          .setStrokeStyle(3, 0x8f8069, 0.9)
          .setDepth(2);
        this.desks.add(desk);
        this.deskBounds.push(
          new Phaser.Geom.Rectangle(x - 72, y - 33, 144, 66)
        );

        this.add
          .rectangle(x, y - 8, 48, 24, 0x64748b, 0.9)
          .setStrokeStyle(2, 0x334155, 0.8)
          .setDepth(3);
        this.add
          .rectangle(x, y + 18, 28, 6, 0x8f8069, 0.9)
          .setDepth(3);
      });
    });
  }

  private findOpenPosition(
    preferredX: number,
    preferredY: number,
    padding: number
  ): Phaser.Math.Vector2 {
    const isOpen = (x: number, y: number): boolean =>
      !this.deskBounds.some((bounds) =>
        new Phaser.Geom.Rectangle(
          bounds.x - padding,
          bounds.y - padding,
          bounds.width + padding * 2,
          bounds.height + padding * 2
        ).contains(x, y)
      );

    if (isOpen(preferredX, preferredY)) {
      return new Phaser.Math.Vector2(preferredX, preferredY);
    }

    for (let ring = 1; ring <= 8; ring += 1) {
      for (let step = 0; step < 16; step += 1) {
        const angle = (Math.PI * 2 * step) / 16;
        const distance = ring * 28;
        const x = Phaser.Math.Clamp(
          preferredX + Math.cos(angle) * distance,
          60,
          GAME_WIDTH - 60
        );
        const y = Phaser.Math.Clamp(
          preferredY + Math.sin(angle) * distance,
          90,
          GAME_HEIGHT - 70
        );
        if (isOpen(x, y)) {
          return new Phaser.Math.Vector2(x, y);
        }
      }
    }

    return new Phaser.Math.Vector2(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2
    );
  }

  private getSession(): SessionState {
    return this.registry.get("session") as SessionState;
  }
}
