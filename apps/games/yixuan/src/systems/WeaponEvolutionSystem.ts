/**
 * ============================================================
 * WeaponEvolutionSystem — 监听升级事件，检查武器进化条件
 * ============================================================
 */
import { System, World } from '@vib/engine';
import { WeaponLevel } from '../components/WeaponLevel';
import { EVO_RECIPES } from '../weapons/evolution';

export class WeaponEvolutionSystem extends System {
  private pendingEvo: { sources: [string, string]; result: string } | null = null;

  update(_dt: number, world: World): void {
    // check evolution eligibility on each frame
    // (we'll trigger check via levelUp event in GameScene)
  }

  /**
   * Check if the player has a valid evolution combo.
   * Returns the recipe if found, null otherwise.
   */
  checkEvo(world: World, playerEntity: number, weaponLevel: WeaponLevel): { sources: [string, string]; result: string } | null {
    for (const recipe of EVO_RECIPES) {
      const [a, b] = recipe.sources;
      if (
        weaponLevel.getLevel(a) >= recipe.maxLevel &&
        weaponLevel.getLevel(b) >= recipe.maxLevel
      ) {
        this.pendingEvo = { sources: recipe.sources, result: recipe.result };
        return this.pendingEvo;
      }
    }
    this.pendingEvo = null;
    return null;
  }

  getPendingEvo(): { sources: [string, string]; result: string } | null {
    return this.pendingEvo;
  }

  clearPending(): void {
    this.pendingEvo = null;
  }
}
