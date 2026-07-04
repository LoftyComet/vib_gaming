/**
 * ============================================================
 * CustomRenderer — 自定义渲染（机甲、机器人、星空、武器特效）
 * ============================================================
 */
import { CanvasRenderer, Camera, InputManager, World, Transform, Enemy, Sprite, Health } from '@vib/engine';
import { Boss } from '../components/Boss';
import { Dash } from '../components/Dash';
import { PowerUp } from '../components/PowerUp';
import { FlameWeapon } from '../components/FlameWeapon';
import { ChainWeapon } from '../components/ChainWeapon';
import { OrbitWeapon } from '../components/OrbitWeapon';

export interface Star {
  x: number;
  y: number;
  r: number;
  b: number;
}

export function createStars(count: number, width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5 + 0.5,
      b: Math.random() * 0.5 + 0.3,
    });
  }
  return stars;
}

export function drawStars(renderer: CanvasRenderer, stars: Star[]): void {
  for (const s of stars) {
    renderer.ctx.fillStyle = `rgba(255,255,255,${s.b})`;
    renderer.ctx.beginPath();
    renderer.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    renderer.ctx.fill();
  }
}

export function drawMecha(
  renderer: CanvasRenderer,
  world: World,
  playerId: number,
  camera: Camera,
  input: InputManager,
  playerSize: number,
): void {
  const pt = world.getComponent(playerId, Transform);
  if (!pt) return;
  const sc = camera.worldToScreen(pt.x, pt.y, renderer.width, renderer.height);
  const R = playerSize * camera.zoom;

  // glow
  renderer.ctx.fillStyle = 'rgba(0,212,255,0.25)';
  renderer.ctx.beginPath();
  renderer.ctx.arc(sc.x, sc.y, R * 1.8, 0, Math.PI * 2);
  renderer.ctx.fill();

  // body
  renderer.ctx.fillStyle = '#00d4ff';
  renderer.ctx.beginPath();
  renderer.ctx.arc(sc.x, sc.y, R, 0, Math.PI * 2);
  renderer.ctx.fill();

  // highlight
  renderer.ctx.fillStyle = '#fff';
  renderer.ctx.beginPath();
  renderer.ctx.arc(sc.x - R * 0.2, sc.y - R * 0.2, R * 0.35, 0, Math.PI * 2);
  renderer.ctx.fill();

  // engine flames
  const dir = input.getMovementDirection();
  if (dir.x !== 0 || dir.y !== 0) {
    const a = Math.atan2(dir.y, dir.x);
    const fx = sc.x - Math.cos(a) * R;
    const fy = sc.y - Math.sin(a) * R;
    for (const side of [-1, 1]) {
      const sx = fx + Math.cos(a + side * Math.PI / 2) * R * 0.5;
      const sy = fy + Math.sin(a + side * Math.PI / 2) * R * 0.5;
      renderer.ctx.fillStyle = '#ff6b35';
      renderer.ctx.beginPath();
      renderer.ctx.arc(
        sx - Math.cos(a) * (6 + Math.random() * 5),
        sy - Math.sin(a) * (6 + Math.random() * 5),
        2 + Math.random() * 1.5,
        0,
        Math.PI * 2,
      );
      renderer.ctx.fill();
    }
  }
}

export function drawPowerUps(renderer: CanvasRenderer, world: World, camera: Camera): void {
  const powerUps = world.query(Transform, Sprite, PowerUp);
  for (const [, transform, sprite, powerUp] of powerUps) {
    const sc = camera.worldToScreen(transform.x, transform.y, renderer.width, renderer.height);
    const R = (sprite.width * camera.zoom) / 2;

    // glow
    renderer.ctx.fillStyle = powerUp.color.replace(')', ',0.3)').replace('rgb', 'rgba');
    if (powerUp.color.startsWith('#')) {
      const r = parseInt(powerUp.color.slice(1, 3), 16);
      const g = parseInt(powerUp.color.slice(3, 5), 16);
      const b = parseInt(powerUp.color.slice(5, 7), 16);
      renderer.ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
    }
    renderer.ctx.beginPath();
    renderer.ctx.arc(sc.x, sc.y, R * 2.5, 0, Math.PI * 2);
    renderer.ctx.fill();

    // diamond shape
    renderer.ctx.fillStyle = powerUp.color;
    renderer.ctx.save();
    renderer.ctx.translate(sc.x, sc.y);
    renderer.ctx.rotate(performance.now() / 1000 * 2);
    renderer.ctx.fillRect(-R, -R, R * 2, R * 2);
    renderer.ctx.restore();

    // label
    const label = powerUp.powerUpType === 'magnet' ? '🧲' :
      powerUp.powerUpType === 'shield' ? '🛡️' :
      powerUp.powerUpType === 'speed' ? '⚡' :
      powerUp.powerUpType === 'damage' ? '💥' : '❤️';
    renderer.drawText(label, sc.x, sc.y - R * 3, powerUp.color, 10, 'center');
  }
}

export function drawFlameCone(renderer: CanvasRenderer, world: World, camera: Camera): void {
  const players = world.query(Transform, FlameWeapon);
  if (players.length === 0) return;
  const [, pt, fw] = players[0];
  const sc = camera.worldToScreen(pt.x, pt.y, renderer.width, renderer.height);

  const enemies = world.query(Transform, Enemy);
  let aimAngle = 0;
  let nearestDist = Infinity;
  for (const [, et] of enemies) {
    const dx = et.x - pt.x;
    const dy = et.y - pt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) { nearestDist = dist; aimAngle = Math.atan2(dy, dx); }
  }

  const rangePx = fw.range * camera.zoom;
  const halfCone = fw.coneAngle / 2;

  renderer.ctx.fillStyle = 'rgba(255,68,68,0.15)';
  renderer.ctx.beginPath();
  renderer.ctx.moveTo(sc.x, sc.y);
  renderer.ctx.arc(sc.x, sc.y, rangePx, aimAngle - halfCone, aimAngle + halfCone);
  renderer.ctx.closePath();
  renderer.ctx.fill();

  renderer.ctx.strokeStyle = 'rgba(255,100,50,0.4)';
  renderer.ctx.lineWidth = 2;
  renderer.ctx.stroke();
}

export function drawLightningBolts(
  renderer: CanvasRenderer, world: World, camera: Camera,
  boltChains: { x: number; y: number }[][],
): void {
  for (const chain of boltChains) {
    if (chain.length < 2) continue;
    for (let i = 0; i < chain.length - 1; i++) {
      const from = camera.worldToScreen(chain[i].x, chain[i].y, renderer.width, renderer.height);
      const to = camera.worldToScreen(chain[i + 1].x, chain[i + 1].y, renderer.width, renderer.height);
      // draw jagged bolt
      renderer.ctx.strokeStyle = '#ffff00';
      renderer.ctx.lineWidth = 2;
      renderer.ctx.beginPath();
      renderer.ctx.moveTo(from.x, from.y);
      const midX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 30;
      const midY = (from.y + to.y) / 2 + (Math.random() - 0.5) * 30;
      renderer.ctx.lineTo(midX, midY);
      renderer.ctx.lineTo(to.x, to.y);
      renderer.ctx.stroke();
      // glow
      renderer.ctx.strokeStyle = 'rgba(255,255,200,0.3)';
      renderer.ctx.lineWidth = 5;
      renderer.ctx.stroke();
    }
  }
}

export function drawOrbitBlades(renderer: CanvasRenderer, world: World, camera: Camera): void {
  const players = world.query(Transform, OrbitWeapon);
  if (players.length === 0) return;
  const [, , ow] = players[0];

  for (const bladeId of ow.bladeEntities) {
    const bt = world.getComponent(bladeId, Transform);
    if (!bt) continue;
    const sc = camera.worldToScreen(bt.x, bt.y, renderer.width, renderer.height);
    const R = 6 * camera.zoom;

    // glow
    renderer.ctx.fillStyle = 'rgba(200,200,200,0.3)';
    renderer.ctx.beginPath();
    renderer.ctx.arc(sc.x, sc.y, R * 2, 0, Math.PI * 2);
    renderer.ctx.fill();

    // blade (rotating diamond)
    renderer.ctx.fillStyle = ow.color;
    renderer.ctx.save();
    renderer.ctx.translate(sc.x, sc.y);
    renderer.ctx.rotate(performance.now() / 1000 * 5);
    renderer.ctx.beginPath();
    renderer.ctx.moveTo(0, -R);
    renderer.ctx.lineTo(R * 0.6, 0);
    renderer.ctx.lineTo(0, R);
    renderer.ctx.lineTo(-R * 0.6, 0);
    renderer.ctx.closePath();
    renderer.ctx.fill();
    renderer.ctx.strokeStyle = '#fff';
    renderer.ctx.lineWidth = 1;
    renderer.ctx.stroke();
    renderer.ctx.restore();
  }
}



export function drawBosses(renderer: CanvasRenderer, world: World, camera: Camera): void {
  const bosses = world.query(Transform, Sprite, Health, Boss);
  for (const [, transform, sprite, health, boss] of bosses) {
    const sc = camera.worldToScreen(transform.x, transform.y, renderer.width, renderer.height);
    const R = (sprite.width * camera.zoom) / 2;

    // aura glow
    const glowColor = boss.phase === 2 ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,0,0.2)';
    renderer.ctx.fillStyle = glowColor;
    renderer.ctx.beginPath();
    renderer.ctx.arc(sc.x, sc.y, R * 1.5, 0, Math.PI * 2);
    renderer.ctx.fill();

    // body
    renderer.ctx.fillStyle = sprite.color;
    renderer.ctx.fillRect(sc.x - R, sc.y - R, R * 2, R * 2);
    renderer.ctx.strokeStyle = boss.phase === 2 ? '#ff0000' : '#ffff00';
    renderer.ctx.lineWidth = 2;
    renderer.ctx.strokeRect(sc.x - R, sc.y - R, R * 2, R * 2);

    // boss-type specific decorations
    switch (boss.bossType) {
      case 'charger': {
        // shield spikes
        renderer.ctx.strokeStyle = '#fca5a5';
        renderer.ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6;
          renderer.ctx.beginPath();
          renderer.ctx.moveTo(sc.x + Math.cos(a) * R, sc.y + Math.sin(a) * R);
          renderer.ctx.lineTo(sc.x + Math.cos(a) * R * 1.5, sc.y + Math.sin(a) * R * 1.5);
          renderer.ctx.stroke();
        }
        break;
      }
      case 'mortar': {
        // cannon barrels
        renderer.ctx.fillStyle = '#fbbf24';
        renderer.ctx.fillRect(sc.x - R * 0.7, sc.y - R * 1.5, R * 0.4, R * 0.8);
        renderer.ctx.fillRect(sc.x + R * 0.3, sc.y - R * 1.5, R * 0.4, R * 0.8);
        break;
      }
      case 'summoner': {
        // orbiting dots
        const t = performance.now() / 1000;
        for (let i = 0; i < 4; i++) {
          const a = t * 1.5 + (Math.PI * 2 * i) / 4;
          const dx = Math.cos(a) * R * 1.6;
          const dy = Math.sin(a) * R * 1.6;
          renderer.ctx.fillStyle = '#c4b5fd';
          renderer.ctx.beginPath();
          renderer.ctx.arc(sc.x + dx, sc.y + dy, 4, 0, Math.PI * 2);
          renderer.ctx.fill();
        }
        break;
      }
    }

    // red eyes (bigger)
    const er = R * 0.25;
    renderer.ctx.fillStyle = '#ff0000';
    renderer.ctx.fillRect(sc.x - R * 0.5 - er, sc.y - R * 0.2 - er, er * 2, er * 2);
    renderer.ctx.fillRect(sc.x + R * 0.5 - er, sc.y - R * 0.2 - er, er * 2, er * 2);

    // boss health bar (always visible, above head)
    const barW = R * 2.5;
    const barH = 4;
    const barY = sc.y - R * 1.9;
    renderer.ctx.fillStyle = '#1f2937';
    renderer.ctx.fillRect(sc.x - barW / 2, barY, barW, barH);
    const hpRatio = health.current / health.max;
    const hpColor = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#ef4444';
    renderer.ctx.fillStyle = hpColor;
    renderer.ctx.fillRect(sc.x - barW / 2, barY, barW * hpRatio, barH);

    // boss name
    const name = boss.bossType === 'charger' ? '⚡冲锋者' : boss.bossType === 'mortar' ? '💣迫击炮' : '👾召唤师';
    renderer.drawText(name, sc.x, barY - 8, sprite.color, 9, 'center');
  }
}

export function drawDashTrail(
  renderer: CanvasRenderer,
  world: World,
  playerId: number,
  camera: Camera,
  playerColor: string,
): void {
  const dash = world.getComponent(playerId, Dash);
  if (!dash || !dash.isDashing) return;
  for (const trail of dash.trailPositions) {
    const sc = camera.worldToScreen(trail.x, trail.y, renderer.width, renderer.height);
    if (trail.alpha <= 0) continue;
    renderer.ctx.fillStyle = playerColor.replace(')', `,${trail.alpha * 0.5})`).replace('rgb', 'rgba');
    if (playerColor.startsWith('#')) {
      // hex color → rgba
      const r = parseInt(playerColor.slice(1, 3), 16);
      const g = parseInt(playerColor.slice(3, 5), 16);
      const b = parseInt(playerColor.slice(5, 7), 16);
      renderer.ctx.fillStyle = `rgba(${r},${g},${b},${trail.alpha * 0.4})`;
    }
    renderer.ctx.beginPath();
    const R = 8 * camera.zoom;
    renderer.ctx.arc(sc.x, sc.y, R, 0, Math.PI * 2);
    renderer.ctx.fill();
  }
}

export function drawRobots(renderer: CanvasRenderer, world: World, camera: Camera): void {
  const enemies = world.query(Transform, Enemy, Sprite);
  for (const [entity, transform, , sprite] of enemies) {
    // skip bosses — they have their own rendering
    if (world.hasComponent(entity, Boss)) continue;
    const sc = camera.worldToScreen(transform.x, transform.y, renderer.width, renderer.height);
    const R = (sprite.width * camera.zoom) / 2;

    // body
    renderer.ctx.fillStyle = sprite.color;
    renderer.ctx.fillRect(sc.x - R, sc.y - R, R * 2, R * 2);
    renderer.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    renderer.ctx.strokeRect(sc.x - R, sc.y - R, R * 2, R * 2);

    // red eyes
    const er = R * 0.2;
    renderer.ctx.fillStyle = '#ff0000';
    renderer.ctx.fillRect(sc.x - R * 0.5 - er, sc.y - R * 0.3 - er, er * 2, er * 2);
    renderer.ctx.fillRect(sc.x + R * 0.5 - er, sc.y - R * 0.3 - er, er * 2, er * 2);

    // antenna
    renderer.ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    renderer.ctx.beginPath();
    renderer.ctx.moveTo(sc.x, sc.y - R);
    renderer.ctx.lineTo(sc.x, sc.y - R * 1.8);
    renderer.ctx.stroke();
    renderer.ctx.fillStyle = '#ff0000';
    renderer.ctx.beginPath();
    renderer.ctx.arc(sc.x, sc.y - R * 1.8, 1.5, 0, Math.PI * 2);
    renderer.ctx.fill();
  }
}
