/**
 * UIManager — UI 状态机
 * States: 'title' → 'playing' → 'paused' / 'gameover'
 */
import { CanvasRenderer, InputManager } from '@vib/engine';
import { drawTitleScreen, updateTitleScreen } from './TitleScreen';
import { drawPauseMenu } from './PauseMenu';

export type GameScreen = 'title' | 'playing' | 'paused' | 'gameover';

export class UIManager {
  public screen: GameScreen = 'title';
  private lastEscape = false;
  private lastSpace = false;

  constructor(
    private renderer: CanvasRenderer,
    private input: InputManager,
  ) {}

  update(): GameScreen {
    const escDown = this.input.isDown('Escape');
    const escPressed = escDown && !this.lastEscape;
    this.lastEscape = escDown;

    const spaceDown = this.input.isDown(' ');
    const spacePressed = spaceDown && !this.lastSpace;
    this.lastSpace = spaceDown;

    switch (this.screen) {
      case 'title':
        if (updateTitleScreen() || spacePressed) {
          this.screen = 'playing';
          return 'playing';
        }
        break;
      case 'playing':
        if (escPressed) {
          this.screen = 'paused';
          return 'paused';
        }
        break;
      case 'paused':
        if (escPressed) {
          this.screen = 'playing';
        }
        break;
      case 'gameover':
        // handled by GameScene
        break;
    }
    return this.screen;
  }

  render(): void {
    switch (this.screen) {
      case 'title':
        drawTitleScreen(this.renderer);
        break;
      case 'paused':
        drawPauseMenu(this.renderer);
        break;
    }
  }

  setGameOver(): void {
    this.screen = 'gameover';
  }

  restart(): void {
    this.screen = 'playing';
  }
}
