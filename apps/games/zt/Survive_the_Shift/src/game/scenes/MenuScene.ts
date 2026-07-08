import Phaser from "phaser";
import { DIFFICULTIES, type DifficultyId } from "../config/difficulty";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/constants";

export class MenuScene extends Phaser.Scene {
  public constructor() {
    super("menu");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#172033");

    this.add
      .text(GAME_WIDTH / 2, 120, "活着下班", {
        color: "#f8fafc",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "72px",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        205,
        "亲手清空待办，稳住心态，18:00 冲进电梯",
        {
          color: "#cbd5e1",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: "24px"
        }
      )
      .setOrigin(0.5);

    const choices: DifficultyId[] = ["relaxed", "normal", "overtime"];
    choices.forEach((id, index) => {
      const difficulty = DIFFICULTIES[id];
      const button = this.add
        .text(GAME_WIDTH / 2, 320 + index * 86, difficulty.name, {
          align: "center",
          color: id === "normal" ? "#111827" : "#f8fafc",
          backgroundColor: id === "normal" ? "#fbbf24" : "#334155",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: "30px",
          fontStyle: "bold",
          fixedWidth: 360,
          padding: { x: 24, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      button.on("pointerover", () => button.setScale(1.04));
      button.on("pointerout", () => button.setScale(1));
      button.on("pointerdown", () => this.startGame(id));
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 74,
        "当前测试版：一局 3 分钟",
        {
          color: "#94a3b8",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: "18px"
        }
      )
      .setOrigin(0.5);

    this.input.keyboard!.once("keydown-ENTER", () =>
      this.startGame("normal")
    );
  }

  private startGame(difficulty: DifficultyId): void {
    this.scene.start("game", { difficulty });
  }
}
