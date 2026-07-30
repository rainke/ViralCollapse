import type { BossType, EnemyType } from './content'

export interface LevelPosition {
  worldLevel: number
  chapter: number
  stage: number
  battleLevel: number
}

export interface UpgradeLevels {
  damage?: number
  rapid?: number
  spread?: number
  health?: number
  critical?: number
  guard?: number
}

export interface EnemyArchetype {
  health: number
  damage: number
  points: number
  speed: number
}

export const ENEMY_ARCHETYPES: Record<EnemyType, EnemyArchetype> = {
  basic: { health: 10, damage: 14, points: 10, speed: 1 },
  fast: { health: 8, damage: 10, points: 18, speed: 1.65 },
  wobbly: { health: 18, damage: 16, points: 22, speed: 0.92 },
  splitter: { health: 22, damage: 16, points: 28, speed: 0.86 },
  tough: { health: 40, damage: 24, points: 40, speed: 0.72 },
  influenza: { health: 20, damage: 16, points: 30, speed: 1.04 },
  adenovirus: { health: 40, damage: 22, points: 44, speed: 0.76 },
  rabies: { health: 12, damage: 14, points: 24, speed: 1.35 },
  pox: { health: 30, damage: 20, points: 34, speed: 0.78 },
  polyhedral: { health: 35, damage: 22, points: 38, speed: 0.82 },
  wideMouth: { health: 42, damage: 24, points: 46, speed: 0.7 },
}

const BOSS_HEALTH: Record<BossType, number> = {
  ebola: 1_100,
  corona: 3_200,
}

function clampWorldLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.min(100, Math.max(1, Math.floor(level)))
}

function roundTo5(value: number): number {
  return Math.round(value / 5) * 5
}

export function getLevelPosition(level: number): LevelPosition {
  const worldLevel = clampWorldLevel(level)
  const chapter = Math.floor((worldLevel - 1) / 10) + 1
  const stage = ((worldLevel - 1) % 10) + 1
  return { worldLevel, chapter, stage, battleLevel: stage }
}

export function getOffenseMultiplier(level: number): number {
  const { chapter, stage } = getLevelPosition(level)
  return 1.18 ** (chapter - 1) * (1 + 0.05 * (stage - 1))
}

export function getDefenseMultiplier(level: number): number {
  const { chapter, stage } = getLevelPosition(level)
  return 1.12 ** (chapter - 1) * (1 + 0.04 * (stage - 1))
}

export function getLevelStats(level: number): {
  cleanTarget: number
  spawnEvery: number
  scoreMultiplier: number
} {
  const { chapter, stage } = getLevelPosition(level)
  return {
    cleanTarget: 42 + 2 * (stage - 1) + 2 * (chapter - 1),
    spawnEvery: Math.max(
      520,
      920 - 25 * (stage - 1) - 18 * (chapter - 1),
    ),
    scoreMultiplier:
      1 + 0.25 * (chapter - 1) + 0.03 * (stage - 1),
  }
}

export function getPlayerStats(
  level: number,
  upgrades: UpgradeLevels,
): {
  damage: number
  maxHealth: number
  criticalChance: number
  criticalMultiplier: number
  damageReduction: number
} {
  const damageLevel = upgrades.damage ?? 0
  const healthLevel = upgrades.health ?? 0
  return {
    damage: Math.round(
      10 * getOffenseMultiplier(level) * (1 + damageLevel * 0.18),
    ),
    maxHealth: roundTo5(
      100 * getDefenseMultiplier(level) * (1 + healthLevel * 0.15),
    ),
    criticalChance: Math.min(0.4, (upgrades.critical ?? 0) * 0.1),
    criticalMultiplier: 1.75,
    damageReduction: Math.min(0.32, (upgrades.guard ?? 0) * 0.08),
  }
}

export function getEnemyStats(
  level: number,
  type: EnemyType,
): EnemyArchetype {
  const archetype = ENEMY_ARCHETYPES[type]
  const { chapter, stage } = getLevelPosition(level)
  const speedScale = Math.min(
    1.55,
    1 + 0.025 * (stage - 1) + 0.035 * (chapter - 1),
  )
  return {
    health: Math.round(archetype.health * getOffenseMultiplier(level)),
    damage: Math.round(archetype.damage * getDefenseMultiplier(level)),
    points: Math.round(
      archetype.points * getLevelStats(level).scoreMultiplier,
    ),
    speed: Math.min(240, 90 * archetype.speed * speedScale),
  }
}

export function getBossStats(
  level: number,
  type: BossType,
): {
  health: number
  damage: number
  fireEveryMin: number
  projectileSpeed: number
  projectileSpeedMax: number
  shotStages: readonly [1, 3, 5]
} {
  const { chapter, stage } = getLevelPosition(level)
  return {
    health: Math.round(BOSS_HEALTH[type] * getOffenseMultiplier(level)),
    damage: Math.round(14 * getDefenseMultiplier(level)),
    fireEveryMin: 650,
    projectileSpeed: Math.min(
      240,
      135 + 7 * (stage - 1) + 9 * (chapter - 1),
    ),
    projectileSpeedMax: 240,
    shotStages: [1, 3, 5],
  }
}
