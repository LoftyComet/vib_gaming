// Core
export { GameLoop } from './core/GameLoop';
export { Scene } from './core/Scene';
export { InputManager } from './core/InputManager';
export { EventBus } from './core/EventBus';

// ECS
export { World } from './ecs/World';
export type { Entity } from './ecs/Entity';
export type { Component, ComponentConstructor } from './ecs/Component';
export { System } from './ecs/System';

// Math
export { Vector2 } from './math/Vector2';
export { Rect } from './math/Rect';

// Physics
export { checkAABB, checkCircle, checkCircleAABB } from './physics/Collision';

// Render
export { CanvasRenderer } from './render/CanvasRenderer';
export { Camera } from './render/Camera';

// Bridge
export { PortalBridge } from './bridge/PortalBridge';

// Systems
export { MovementSystem } from './systems/MovementSystem';
export { PlayerMovementSystem } from './systems/PlayerMovementSystem';
export { AutoAttackSystem } from './systems/AutoAttackSystem';
export { ProjectileSystem, LifetimeSystem } from './systems/ProjectileSystem';
export { EnemyAISystem } from './systems/EnemyAISystem';
export { EnemySpawnSystem } from './systems/EnemySpawnSystem';
export type { WaveConfig } from './systems/EnemySpawnSystem';
export { CollisionSystem } from './systems/CollisionSystem';
export { DamageSystem, setupDamageHandler } from './systems/DamageSystem';
export { XPSystem } from './systems/XPSystem';
export { RenderSystem } from './systems/RenderSystem';
export { OrbitalSystem } from './systems/OrbitalSystem';
export { FlameThrowerSystem } from './systems/FlameThrowerSystem';
export { ChainLightningSystem } from './systems/ChainLightningSystem';

// Components
export { Transform } from './components/Transform';
export { Velocity } from './components/Velocity';
export { Health } from './components/Health';
export { Collider } from './components/Collider';
export { Weapon } from './components/Weapon';
export { Projectile } from './components/Projectile';
export { Enemy } from './components/Enemy';
export { Player } from './components/Player';
export { Experience } from './components/Experience';
export { Sprite } from './components/Sprite';
export { Lifetime } from './components/Lifetime';
export { Pickup } from './components/Pickup';
export { Orbital } from './components/Orbital';
export { FlameWeapon } from './components/FlameWeapon';
export { ChainWeapon } from './components/ChainWeapon';
