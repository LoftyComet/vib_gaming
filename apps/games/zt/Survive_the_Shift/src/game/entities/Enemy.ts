import Phaser from "phaser";
import { ENEMIES, type EnemyKind } from "../config/content";

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public readonly kind: EnemyKind;
  public readonly damage: number;
  public readonly xpValue: number;
  public readonly backlogOnHit: number;
  public readonly isBoss: boolean;
  private health: number;
  private readonly maxHealth: number;
  private moveSpeed: number;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: EnemyKind,
    speedMultiplier = 1
  ) {
    const definition = ENEMIES[kind];
    super(scene, x, y, definition.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.kind = kind;
    this.health = definition.health;
    this.maxHealth = definition.health;
    this.damage = definition.damage;
    this.xpValue = definition.xp;
    this.backlogOnHit = definition.backlogOnHit;
    this.isBoss = definition.boss ?? false;
    this.moveSpeed = definition.speed * speedMultiplier;
    this.setCircle(definition.radius);
    this.setDepth(5);
  }

  public chase(target: Phaser.GameObjects.Components.Transform): void {
    this.scene.physics.moveToObject(this, target, this.moveSpeed);
  }

  public applyDamage(amount: number): boolean {
    this.health -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => {
      if (this.active) {
        this.clearTint();
      }
    });
    return this.health <= 0;
  }

  public getHealth(): number {
    return Math.max(0, this.health);
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }
}
