import { describe, expect, it } from 'vitest'
import {
  ENEMY_ARCHETYPES,
  getBossStats,
  getEnemyStats,
  getLevelPosition,
  getLevelStats,
  getPlayerStats,
} from './balance'

describe('campaign balance', () => {
  it.each([
    [1, 1, 1, 10, 100],
    [10, 1, 10, 15, 135],
    [50, 5, 10, 28, 215],
    [100, 10, 10, 64, 375],
  ])(
    'anchors world level %i to chapter %i stage %i, damage %i and health %i',
    (level, chapter, stage, damage, maxHealth) => {
      expect(getLevelPosition(level)).toEqual({
        worldLevel: level,
        chapter,
        stage,
        battleLevel: stage,
      })
      expect(getPlayerStats(level, {})).toMatchObject({
        damage,
        maxHealth,
      })
    },
  )

  it('clamps campaign lookup to the supported 100 levels', () => {
    expect(getLevelPosition(0).worldLevel).toBe(1)
    expect(getLevelPosition(101).worldLevel).toBe(100)
    expect(getLevelPosition(Number.NaN).worldLevel).toBe(1)
  })

  it('applies target, spawn, speed and score formulas with their caps', () => {
    expect(getLevelStats(1)).toMatchObject({
      cleanTarget: 43,
      spawnEvery: 460,
      scoreMultiplier: 1,
    })
    expect(getLevelStats(100)).toMatchObject({
      cleanTarget: 79,
      spawnEvery: 266.5,
      scoreMultiplier: 3.52,
    })
    expect(getEnemyStats(100, 'fast').speed).toBeCloseTo(228.69)
    expect(getEnemyStats(100, 'wideMouth').speed).toBeCloseTo(97.02)
    expect(getEnemyStats(100, 'basic').speed).toBeLessThanOrEqual(240)
  })

  it('keeps archetype health, damage and score data separate from content', () => {
    expect(Object.keys(ENEMY_ARCHETYPES)).toHaveLength(11)
    expect(ENEMY_ARCHETYPES.basic).toEqual({
      health: 10,
      damage: 14,
      points: 10,
      speed: 1,
    })
    expect(ENEMY_ARCHETYPES.wideMouth).toMatchObject({
      health: 42,
      damage: 24,
      points: 46,
    })
  })

  it('keeps basic enemy shots-to-kill stable throughout the campaign', () => {
    for (const level of [1, 10, 50, 100]) {
      const enemy = getEnemyStats(level, 'basic')
      const player = getPlayerStats(level, {})
      expect(Math.ceil(enemy.health / player.damage)).toBe(1)
    }
  })

  it('keeps basic hits-to-defeat in the intended survivability range', () => {
    for (const level of [1, 10, 50, 100]) {
      const enemy = getEnemyStats(level, 'basic')
      const player = getPlayerStats(level, {})
      expect(Math.ceil(player.maxHealth / enemy.damage)).toBeGreaterThanOrEqual(
        7,
      )
      expect(Math.ceil(player.maxHealth / enemy.damage)).toBeLessThanOrEqual(8)
    }
  })

  it('keeps normal spawn windows near the compressed combat duration', () => {
    for (const level of [1, 9, 41, 99]) {
      const stats = getLevelStats(level)
      const seconds = (stats.cleanTarget * stats.spawnEvery) / 1_000
      expect(seconds).toBeGreaterThanOrEqual(19)
      expect(seconds).toBeLessThanOrEqual(23)
    }
  })

  it('scales bosses while capping their bullet pressure', () => {
    expect(getBossStats(3, 'ebola')).toMatchObject({
      health: 1_210,
      damage: 15,
    })
    expect(getBossStats(10, 'corona')).toMatchObject({
      health: 4_640,
      fireEveryMin: 650,
      projectileSpeedMax: 240,
      shotStages: [1, 3, 5],
    })
    expect(getBossStats(100, 'corona').projectileSpeed).toBe(240)
  })
})
