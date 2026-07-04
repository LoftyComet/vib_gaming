/**
 * ============================================================
 * DashSystem — 空格键冲刺 / 闪避
 * ============================================================
 * 读取 InputManager，检测空格键触发冲刺
 * 冲刺时覆盖 Velocity（在 PlayerMovementSystem 之后、MovementSystem 之前运行）
 */
import { System, World, InputManager, Transform, Velocity, Health, Player } from '@vib/engine';
import { Dash } from '../components/Dash';

export class DashSystem extends System {
  private lastSpace = false;

  constructor(private input: InputManager) {
    super();
  }

  update(dt: number, world: World): void {
    const players = world.query(Transform, Velocity, Health, Player, Dash);
    if (players.length === 0) return;
    const [, transform, velocity, health, , dash] = players[0];

    // tick cooldown
    if (dash.cooldownTimer > 0) {
      dash.cooldownTimer = Math.max(0, dash.cooldownTimer - dt);
    }

    // check spacebar press (edge detection)
    const spaceDown = this.input.isDown(' ');
    const spacePressed = spaceDown && !this.lastSpace;
    this.lastSpace = spaceDown;

    if (!dash.isDashing) {
      if (spacePressed && dash.cooldownTimer <= 0) {
        // activate dash
        dash.isDashing = true;
        dash.timer = dash.duration;
        dash.trailPositions = [];

        // use current movement direction, or default to right
        const dir = this.input.getMovementDirection();
        if (dir.x !== 0 || dir.y !== 0) {
          dash.direction = { x: dir.x, y: dir.y };
        } else {
          // face last known direction from velocity
          const mag = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
          if (mag > 0) {
            dash.direction = { x: velocity.vx / mag, y: velocity.vy / mag };
          } else {
            dash.direction = { x: 1, y: 0 };
          }
        }

        world.events.emit('dashStarted', {});
      }
    }

    if (dash.isDashing) {
      dash.timer -= dt;

      // override velocity
      velocity.vx = dash.direction.x * dash.speed;
      velocity.vy = dash.direction.y * dash.speed;

      // invincibility during dash
      health.invincibleTimer = Math.max(health.invincibleTimer, dash.duration + 0.05);

      // record trail
      dash.trailPositions.push({
        x: transform.x,
        y: transform.y,
        alpha: 1,
      });
      // fade existing trails
      for (const t of dash.trailPositions) {
        t.alpha -= dt / dash.duration;
      }
      // cap trail count
      while (dash.trailPositions.length > dash.trailCount) {
        dash.trailPositions.shift();
      }

      // end dash
      if (dash.timer <= 0) {
        dash.isDashing = false;
        dash.cooldownTimer = dash.cooldown;
        world.events.emit('dashEnded', {});
      }
    }
  }
}
