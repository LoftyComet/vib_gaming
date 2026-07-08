import Phaser from "phaser";
import { createSessionState } from "../core/session";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("boot");
  }

  public create(): void {
    this.createDebugTextures();
    this.registry.set("session", createSessionState());
    this.scene.start("menu");
  }

  private createDebugTextures(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x2563eb);
    graphics.fillCircle(20, 20, 18);
    graphics.generateTexture("debug-player", 40, 40);
    graphics.clear();

    graphics.fillStyle(0xef4444);
    graphics.fillCircle(15, 15, 13);
    graphics.generateTexture("enemy-notification", 30, 30);
    graphics.clear();

    graphics.fillStyle(0xf97316);
    graphics.fillRoundedRect(0, 0, 38, 34, 7);
    graphics.generateTexture("enemy-requirement", 38, 34);
    graphics.clear();

    graphics.fillStyle(0x16a34a);
    graphics.fillRoundedRect(0, 0, 48, 48, 5);
    graphics.generateTexture("enemy-spreadsheet", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x7c3aed);
    graphics.fillRoundedRect(0, 0, 84, 84, 18);
    graphics.generateTexture("enemy-final-request", 84, 84);
    graphics.clear();

    graphics.fillStyle(0xfbbf24);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture("debug-projectile", 12, 12);
    graphics.clear();

    graphics.fillStyle(0x78350f);
    graphics.fillRect(0, 0, 24, 10);
    graphics.generateTexture("debug-shredder", 24, 10);
    graphics.clear();

    graphics.fillStyle(0xfbbf24);
    graphics.fillRoundedRect(2, 8, 44, 30, 7);
    graphics.fillStyle(0x78350f);
    for (let x = 8; x <= 36; x += 9) {
      graphics.fillRect(x, 14, 5, 5);
      graphics.fillRect(x, 24, 5, 5);
    }
    graphics.generateTexture("reward-keyboard", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x92400e);
    graphics.fillCircle(24, 25, 17);
    graphics.lineStyle(5, 0xf59e0b);
    graphics.strokeCircle(24, 25, 18);
    graphics.generateTexture("reward-coffee", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x7c3aed);
    graphics.fillTriangle(24, 2, 46, 42, 2, 42);
    graphics.fillStyle(0xf5f3ff);
    graphics.fillRect(20, 13, 8, 22);
    graphics.generateTexture("reward-shredder", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x22c55e);
    graphics.fillCircle(24, 24, 22);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(19, 9, 10, 30);
    graphics.fillRect(9, 19, 30, 10);
    graphics.generateTexture("reward-mindset", 48, 48);
    graphics.clear();

    graphics.fillStyle(0x22c55e);
    graphics.fillRoundedRect(0, 0, 84, 112, 12);
    graphics.generateTexture("debug-elevator", 84, 112);
    graphics.destroy();
  }
}
