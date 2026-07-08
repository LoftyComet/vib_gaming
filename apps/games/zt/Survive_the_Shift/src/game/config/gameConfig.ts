import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { BootScene } from "../scenes/BootScene";
import { GameScene } from "../scenes/GameScene";
import { MenuScene } from "../scenes/MenuScene";
import { PauseScene } from "../scenes/PauseScene";
import { UIScene } from "../scenes/UIScene";

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#e9e2d0",
    pixelArt: false,
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
      BootScene,
      MenuScene,
      GameScene,
      UIScene,
      PauseScene
    ]
  };
}
