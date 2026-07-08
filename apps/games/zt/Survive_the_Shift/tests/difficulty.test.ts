import { describe, expect, it } from "vitest";
import {
  WEAPONS,
  getCoffeeStats,
  getKeyboardStats,
  getShredderDamage
} from "../src/game/config/content";
import { getDifficulty } from "../src/game/config/difficulty";
import {
  createSessionState,
  increaseBacklog,
  xpRequiredForLevel
} from "../src/game/core/session";
import {
  applyUpgrade,
  getUpgradeOptions
} from "../src/game/core/upgrades";

describe("difficulty configuration", () => {
  it("keeps normal work at the baseline", () => {
    const normal = getDifficulty("normal");
    expect(normal.spawnRateMultiplier).toBe(1);
    expect(normal.enemySpeedMultiplier).toBe(1);
    expect(normal.enemyDamageMultiplier).toBe(1);
  });

  it("makes relaxed work gentler than normal work", () => {
    const relaxed = getDifficulty("relaxed");
    expect(relaxed.spawnRateMultiplier).toBeLessThan(1);
    expect(relaxed.enemyDamageMultiplier).toBeLessThan(1);
  });
});

describe("session helpers", () => {
  it("creates a clean normal session", () => {
    const state = createSessionState();
    expect(state.phase).toBe("combat");
    expect(state.difficulty).toBe("normal");
    expect(state.mindset).toBe(100);
  });

  it("increases the experience requirement by level", () => {
    expect(xpRequiredForLevel(2)).toBeGreaterThan(xpRequiredForLevel(1));
  });

  it("makes the break zone trade recovery for faster backlog growth", () => {
    const normalGrowth = increaseBacklog(0, 10, 20, 1, false);
    const breakZoneGrowth = increaseBacklog(0, 10, 20, 1, true);
    expect(breakZoneGrowth).toBeGreaterThan(normalGrowth);
  });
});

describe("upgrade choices", () => {
  it("offers three distinct choices", () => {
    const state = createSessionState();
    const options = getUpgradeOptions(state, () => 0.5);
    expect(options).toHaveLength(3);
    expect(new Set(options.map((option) => option.id)).size).toBe(3);
  });

  it("keeps all three weapon slots and disables max-level rewards", () => {
    const state = createSessionState();
    state.weapons.keyboard = WEAPONS.keyboard.maxLevel;
    const options = getUpgradeOptions(state, () => 0.5);
    expect(options).toHaveLength(3);
    expect(
      options.find((option) => option.id === "keyboard")?.disabled
    ).toBe(true);
  });

  it("applies a weapon upgrade and switches to a newly unlocked weapon", () => {
    const state = createSessionState();
    const message = applyUpgrade(state, "coffee");
    expect(state.weapons.coffee).toBe(1);
    expect(state.activeWeapon).toBe("coffee");
    expect(message).toContain("Lv.1");
  });

});

describe("weapon level effects", () => {
  it("caps every weapon at three levels", () => {
    expect(
      Object.values(WEAPONS).every((weapon) => weapon.maxLevel === 3)
    ).toBe(true);
  });

  it("adds keyboard projectiles at higher levels", () => {
    expect(getKeyboardStats(1).projectileCount).toBe(1);
    expect(getKeyboardStats(2).projectileCount).toBe(2);
    expect(getKeyboardStats(3).projectileCount).toBe(4);
    expect(getKeyboardStats(3).cooldownMs).toBeLessThan(
      getKeyboardStats(1).cooldownMs
    );
  });

  it("increases coffee range and damage", () => {
    expect(getCoffeeStats(5).radius).toBeGreaterThan(
      getCoffeeStats(1).radius
    );
    expect(getCoffeeStats(5).damage).toBeGreaterThan(
      getCoffeeStats(1).damage
    );
  });
});

describe("file shredder", () => {
  it("only reaches full normal-enemy clear at level three", () => {
    expect(getShredderDamage(1, false)).toBe(4);
    expect(getShredderDamage(2, false)).toBe(12);
    expect(getShredderDamage(3, false)).toBe(
      Number.POSITIVE_INFINITY
    );
  });

  it("deals increasing burst damage to bosses", () => {
    expect(getShredderDamage(3, true)).toBeGreaterThan(
      getShredderDamage(1, true)
    );
  });
});
