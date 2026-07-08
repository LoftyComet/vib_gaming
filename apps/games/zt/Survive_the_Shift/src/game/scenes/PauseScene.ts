import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants";

export class PauseScene extends Phaser.Scene {
  public constructor() {
    super("pause");
  }

  public create(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f172a, 0.72)
      .setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45, "暂停摸鱼中", {
        color: "#f8fafc",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "50px",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, "继续游戏", {
        color: "#111827",
        backgroundColor: "#fbbf24",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "25px",
        fontStyle: "bold",
        padding: { x: 24, y: 12 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.resumeGame());

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 125, "退出本局", {
        color: "#f8fafc",
        backgroundColor: "#991b1b",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "21px",
        fontStyle: "bold",
        padding: { x: 24, y: 11 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.quitToMenu());

    this.input.keyboard!.once("keydown-ESC", () => this.resumeGame());
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume("game");
  }

  private quitToMenu(): void {
    this.scene.stop("game");
    this.scene.stop("ui");
    this.scene.start("menu");
  }
}
