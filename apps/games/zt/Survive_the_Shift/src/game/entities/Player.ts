import Phaser from "phaser";
import {
  DASH_COOLDOWN_MS,
  DASH_DURATION_MS,
  DASH_SPEED,
  PLAYER_SPEED
} from "../config/constants";

export class Player extends Phaser.Physics.Arcade.Sprite {
  private dashUntil = 0;
  private dashReadyAt = 0;
  private lastDirection = new Phaser.Math.Vector2(1, 0);

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "debug-player");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(18);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
  }

  public updateMovement(
    now: number,
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>
  ): void {
    this.setPosition(
      Phaser.Math.Clamp(this.x, 22, this.scene.scale.width - 22),
      Phaser.Math.Clamp(this.y, 22, this.scene.scale.height - 22)
    );

    if (now < this.dashUntil) {
      return;
    }

    const horizontal =
      Number(cursors.right.isDown || wasd.right.isDown) -
      Number(cursors.left.isDown || wasd.left.isDown);
    const vertical =
      Number(cursors.down.isDown || wasd.down.isDown) -
      Number(cursors.up.isDown || wasd.up.isDown);

    const direction = new Phaser.Math.Vector2(horizontal, vertical);
    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.lastDirection.copy(direction);
      direction.scale(PLAYER_SPEED);
    }

    this.setVelocity(direction.x, direction.y);
  }

  public tryDash(now: number): boolean {
    if (now < this.dashReadyAt) {
      return false;
    }

    this.dashUntil = now + DASH_DURATION_MS;
    this.dashReadyAt = now + DASH_COOLDOWN_MS;
    this.setVelocity(
      this.lastDirection.x * DASH_SPEED,
      this.lastDirection.y * DASH_SPEED
    );
    this.setTint(0x93c5fd);
    this.scene.time.delayedCall(DASH_DURATION_MS, () => this.clearTint());
    return true;
  }

  public isDashing(now: number): boolean {
    return now < this.dashUntil;
  }

  public getDashReadyAt(): number {
    return this.dashReadyAt;
  }
}
