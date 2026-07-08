import Phaser from "phaser";
import {
  DASH_COOLDOWN_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
  WORKDAY_DURATION_MS
} from "../config/constants";
import { WEAPONS, type WeaponId } from "../config/content";
import { xpRequiredForLevel, type SessionState } from "../core/session";

export class UIScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private timeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private defeatText!: Phaser.GameObjects.Text;
  private centerMessage!: Phaser.GameObjects.Text;
  private weaponTooltip!: Phaser.GameObjects.Text;
  private ragePrompt!: Phaser.GameObjects.Text;
  private breakStatus!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private exitButton!: Phaser.GameObjects.Text;
  private hoveredWeapon?: WeaponId;

  public constructor() {
    super("ui");
  }

  public create(): void {
    this.graphics = this.add.graphics().setDepth(100);

    this.timeText = this.add
      .text(GAME_WIDTH / 2, 22, "", {
        color: "#111827",
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.levelText = this.add
      .text(24, GAME_HEIGHT - 32, "", {
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold"
      })
      .setDepth(101);

    this.defeatText = this.add
      .text(GAME_WIDTH - 24, 22, "", {
        color: "#111827",
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold"
      })
      .setOrigin(1, 0)
      .setDepth(101);

    this.pauseButton = this.add
      .text(GAME_WIDTH - 24, 55, "Ⅱ", {
        color: "#f8fafc",
        backgroundColor: "#0f172acc",
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        padding: { x: 11, y: 6 }
      })
      .setOrigin(1, 0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () =>
        this.pauseButton.setBackgroundColor("#2563eb")
      )
      .on("pointerout", () =>
        this.pauseButton.setBackgroundColor("#0f172a")
      )
      .on("pointerdown", () => this.pauseGame());

    this.exitButton = this.add
      .text(GAME_WIDTH - 78, 55, "退出", {
        color: "#f8fafc",
        backgroundColor: "#7f1d1dcc",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "15px",
        fontStyle: "bold",
        padding: { x: 10, y: 9 }
      })
      .setOrigin(1, 0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () =>
        this.exitButton.setBackgroundColor("#dc2626")
      )
      .on("pointerout", () =>
        this.exitButton.setBackgroundColor("#7f1d1d")
      )
      .on("pointerdown", () => this.quitToMenu());

    ["心态", "待办", "怒气"].forEach((label, index) => {
      this.add
        .text(24, 20 + index * 25, label, {
          color: "#111827",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: "15px",
          fontStyle: "bold"
        })
        .setDepth(101);
    });

    this.createWeaponInteraction();

    this.add
      .text(GAME_WIDTH - 308, GAME_HEIGHT - 31, "Shift", {
        color: "#111827",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold"
      })
      .setDepth(101);

    this.centerMessage = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
        align: "center",
        color: "#111827",
        backgroundColor: "#fff7edee",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "38px",
        fontStyle: "bold",
        padding: { x: 28, y: 20 }
      })
      .setOrigin(0.5)
      .setDepth(105)
      .setVisible(false);

    this.ragePrompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 105, "SPACE  拍桌", {
        color: "#111827",
        backgroundColor: "#facc15ee",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "24px",
        fontStyle: "bold",
        padding: { x: 18, y: 9 }
      })
      .setOrigin(0.5)
      .setDepth(104)
      .setVisible(false);

    this.breakStatus = this.add
      .text(24, 105, "摸鱼中  心态↑  怒气↑  待办↑↑", {
        color: "#075985",
        backgroundColor: "#e0f2feee",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "15px",
        fontStyle: "bold",
        padding: { x: 10, y: 6 }
      })
      .setDepth(102)
      .setVisible(false);
  }

  public update(): void {
    const session = this.registry.get("session") as SessionState | undefined;
    if (!session) {
      return;
    }

    this.graphics.clear();
    this.drawStatusBars(session);
    this.drawTime(session);
    this.drawExperience(session);
    this.drawWeapons(session);
    this.drawDash(session);
    this.drawBoss(session);

    this.defeatText.setText(`击杀 ${session.defeats}`);
    this.levelText.setText(`Lv.${session.level}`);
    this.pauseButton.setVisible(
      session.phase === "combat" || session.phase === "evacuation"
    );
    this.exitButton.setVisible(
      session.phase === "combat" || session.phase === "evacuation"
    );
    this.updateRagePrompt(session);
    this.breakStatus.setVisible(session.inBreakZone);
    this.updateWeaponTooltip(session);
    this.updateCenterMessage(session);
  }

  private drawStatusBars(session: SessionState): void {
    const x = 76;
    const width = 190;
    const height = 14;
    const rows = [
      {
        y: 22,
        ratio: session.mindset / 100,
        color: session.mindset > 35 ? 0x22c55e : 0xef4444,
      },
      {
        y: 47,
        ratio: session.backlog / 100,
        color: 0xf97316,
      },
      {
        y: 72,
        ratio: session.rage / 100,
        color: 0xfacc15,
      }
    ];

    rows.forEach((row, index) => {
      if (index === 2 && row.ratio >= 1) {
        const pulse = 0.25 + (Math.sin(this.time.now * 0.012) + 1) * 0.15;
        this.graphics.fillStyle(0xfacc15, pulse);
        this.graphics.fillRoundedRect(x - 5, row.y - 5, width + 10, height + 10, 10);
      }
      this.graphics.fillStyle(0x111827, 0.18);
      this.graphics.fillRoundedRect(x, row.y, width, height, 7);
      this.graphics.fillStyle(row.color, 0.95);
      this.graphics.fillRoundedRect(
        x,
        row.y,
        width * Phaser.Math.Clamp(row.ratio, 0, 1),
        height,
        7
      );
    });
  }

  private drawTime(session: SessionState): void {
    const progress = Phaser.Math.Clamp(
      session.elapsedMs / WORKDAY_DURATION_MS,
      0,
      1
    );
    const totalMinutes = 9 * 60 + Math.floor(progress * 9 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    this.timeText.setText(
      `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`
    );

    const width = 310;
    const x = (GAME_WIDTH - width) / 2;
    this.graphics.fillStyle(0x111827, 0.18);
    this.graphics.fillRoundedRect(x, 55, width, 10, 5);
    this.graphics.fillStyle(0x2563eb, 0.95);
    this.graphics.fillRoundedRect(x, 55, width * progress, 10, 5);
  }

  private drawExperience(session: SessionState): void {
    const required = xpRequiredForLevel(session.level);
    const ratio = Phaser.Math.Clamp(session.xp / required, 0, 1);
    const x = 74;
    const y = GAME_HEIGHT - 22;
    const width = 500;
    this.graphics.fillStyle(0x111827, 0.28);
    this.graphics.fillRoundedRect(x, y, width, 10, 5);
    this.graphics.fillStyle(0x38bdf8, 1);
    this.graphics.fillRoundedRect(x, y, width * ratio, 10, 5);
  }

  private drawWeapons(session: SessionState): void {
    const ids: WeaponId[] = ["keyboard", "coffee", "shredder"];
    ids.forEach((id, index) => {
      const x = GAME_WIDTH - 238 + index * 76;
      const y = GAME_HEIGHT - 88;
      const unlocked = session.weapons[id] > 0;
      const active = session.activeWeapon === id;

      this.graphics.fillStyle(
        active ? 0x1e3a8a : unlocked ? 0x1f2937 : 0x94a3b8,
        unlocked ? 0.9 : 0.58
      );
      this.graphics.fillRoundedRect(x, y, 64, 52, 8);
      this.graphics.lineStyle(
        active ? 3 : 1,
        active ? 0x93c5fd : 0x64748b,
        1
      );
      this.graphics.strokeRoundedRect(x, y, 64, 52, 8);
      this.drawWeaponIcon(id, x + 32, y + 22, unlocked, active);

      for (let level = 0; level < 3; level += 1) {
        this.graphics.fillStyle(
          level < session.weapons[id] ? 0x60a5fa : 0x475569,
          1
        );
        this.graphics.fillCircle(x + 12 + level * 10, y + 44, 3);
      }
    });
  }

  private drawWeaponIcon(
    id: WeaponId,
    x: number,
    y: number,
    unlocked: boolean,
    active: boolean
  ): void {
    this.graphics.fillStyle(
      unlocked ? (active ? 0xffffff : 0xe2e8f0) : 0x64748b,
      1
    );
    if (id === "keyboard") {
      this.graphics.fillRoundedRect(x - 16, y - 9, 32, 20, 4);
      this.graphics.fillStyle(0x111827, 0.65);
      for (let key = 0; key < 4; key += 1) {
        this.graphics.fillRect(x - 12 + key * 7, y - 5, 4, 4);
        this.graphics.fillRect(x - 12 + key * 7, y + 2, 4, 4);
      }
    } else if (id === "coffee") {
      this.graphics.fillCircle(x, y, 13);
      this.graphics.lineStyle(
        4,
        unlocked ? (active ? 0xffffff : 0xe2e8f0) : 0x64748b,
        1
      );
      this.graphics.strokeCircle(x, y, 14);
    } else {
      this.graphics.fillTriangle(x, y - 16, x + 16, y + 13, x - 16, y + 13);
    }
  }

  private drawDash(session: SessionState): void {
    const x = GAME_WIDTH - 258;
    const y = GAME_HEIGHT - 24;
    const remaining = Math.max(0, session.dashReadyAt - this.time.now);
    const ratio = 1 - remaining / DASH_COOLDOWN_MS;
    this.graphics.fillStyle(0x111827, 0.25);
    this.graphics.fillRoundedRect(x, y, 72, 8, 4);
    this.graphics.fillStyle(0x38bdf8, 1);
    this.graphics.fillRoundedRect(
      x,
      y,
      72 * Phaser.Math.Clamp(ratio, 0, 1),
      8,
      4
    );
  }

  private createWeaponInteraction(): void {
    const ids: WeaponId[] = ["keyboard", "coffee", "shredder"];
    const labels = ["[1] 键盘", "[2] 咖啡", "[3] 粉碎机"];
    ids.forEach((id, index) => {
      const x = GAME_WIDTH - 238 + index * 76;
      const y = GAME_HEIGHT - 88;
      this.add
        .text(x + 32, y + 57, labels[index], {
          color: "#111827",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: "12px",
          fontStyle: "bold"
        })
        .setOrigin(0.5, 0)
        .setDepth(101);
      this.add
        .zone(x + 32, y + 31, 68, 70)
        .setInteractive({ useHandCursor: false })
        .on("pointerover", () => {
          this.hoveredWeapon = id;
        })
        .on("pointerout", () => {
          if (this.hoveredWeapon === id) {
            this.hoveredWeapon = undefined;
          }
        });
    });

    this.weaponTooltip = this.add
      .text(GAME_WIDTH - 22, GAME_HEIGHT - 132, "", {
        align: "right",
        color: "#f8fafc",
        backgroundColor: "#0f172ae6",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: "15px",
        padding: { x: 12, y: 9 },
        wordWrap: { width: 300 }
      })
      .setOrigin(1, 1)
      .setDepth(110)
      .setVisible(false);
  }

  private updateWeaponTooltip(session: SessionState): void {
    if (!this.hoveredWeapon) {
      this.weaponTooltip.setVisible(false);
      return;
    }
    const id = this.hoveredWeapon;
    const level = session.weapons[id];
    this.weaponTooltip
      .setText(
        level > 0
          ? `${WEAPONS[id].name}  Lv.${level}\n${WEAPONS[id].description}`
          : `${WEAPONS[id].name}\n未解锁`
      )
      .setVisible(true);
  }

  private updateRagePrompt(session: SessionState): void {
    const ready = session.rage >= 100;
    this.ragePrompt.setVisible(ready);
    if (!ready) {
      return;
    }
    const pulse = (Math.sin(this.time.now * 0.012) + 1) / 2;
    this.ragePrompt.setScale(1 + pulse * 0.08);
    this.ragePrompt.setAlpha(0.72 + pulse * 0.28);
  }

  private pauseGame(): void {
    if (
      !this.scene.isActive("game") ||
      this.scene.isActive("pause")
    ) {
      return;
    }
    this.scene.pause("game");
    this.scene.launch("pause");
  }

  private quitToMenu(): void {
    this.scene.stop("pause");
    this.scene.stop("game");
    this.scene.start("menu");
  }

  private drawBoss(session: SessionState): void {
    if (!session.bossSpawned || session.bossDefeated) {
      return;
    }
    const ratio =
      session.bossMaxHealth > 0
        ? session.bossHealth / session.bossMaxHealth
        : 0;
    const width = 420;
    const x = (GAME_WIDTH - width) / 2;
    this.graphics.fillStyle(0x111827, 0.35);
    this.graphics.fillRoundedRect(x, 76, width, 15, 7);
    this.graphics.fillStyle(0x7c3aed, 1);
    this.graphics.fillRoundedRect(
      x,
      76,
      width * Phaser.Math.Clamp(ratio, 0, 1),
      15,
      7
    );
  }

  private updateCenterMessage(session: SessionState): void {
    if (session.phase === "evacuation") {
      this.centerMessage
        .setText(`→  ${Math.round(session.evacuationProgress * 100)}%`)
        .setVisible(true);
    } else if (session.phase === "won") {
      this.centerMessage
        .setText("成功下班！\n\nR 再来一局｜M 菜单")
        .setVisible(true);
    } else if (session.phase === "lost") {
      this.centerMessage
        .setText(`${session.resultReason ?? "失败"}\n\nR 重试｜M 菜单`)
        .setVisible(true);
    } else if (
      session.elapsedMs >= WORKDAY_DURATION_MS &&
      !session.bossDefeated
    ) {
      this.centerMessage.setText("18:00").setVisible(true);
    } else {
      this.centerMessage.setVisible(false);
    }
  }
}
