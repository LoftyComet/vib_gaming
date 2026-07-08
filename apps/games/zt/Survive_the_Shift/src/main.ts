import Phaser from "phaser";
import "./styles.css";
import { createGameConfig } from "./game/config/gameConfig";

const game = new Phaser.Game(createGameConfig("game-container"));

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
