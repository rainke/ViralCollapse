import { describe, expect, it } from 'vitest'
import { LEVELS, getEnemyForLevel, getLevel } from './content'

describe('level content', () => {
  it('ships three increasingly challenging child-sized stages', () => {
    expect(LEVELS).toHaveLength(3)
    expect(LEVELS.map((level) => level.name)).toEqual([
      '鼻腔花园',
      '呼吸通道',
      '免疫基地',
    ])
    expect(LEVELS[1].enemySpeed).toBeGreaterThan(LEVELS[0].enemySpeed)
    expect(LEVELS[2].cleanTarget).toBeGreaterThan(LEVELS[1].cleanTarget)
  })

  it('keeps the science copy short and actionable', () => {
    for (const level of LEVELS) {
      expect(level.fact.title.length).toBeLessThanOrEqual(8)
      expect(level.fact.body.length).toBeLessThanOrEqual(40)
      expect(level.fact.emoji).toBeTruthy()
    }
  })

  it('falls back to the first level for invalid stage numbers', () => {
    expect(getLevel(99)).toBe(LEVELS[0])
  })

  it('offers five visually different virus types across the run', () => {
    const sampledTypes = new Set([
      getEnemyForLevel(1, 0.1),
      getEnemyForLevel(1, 0.95),
      getEnemyForLevel(2, 0.5),
      getEnemyForLevel(2, 0.95),
      getEnemyForLevel(3, 0.95),
    ])

    expect(sampledTypes).toEqual(
      new Set(['basic', 'wobbly', 'fast', 'splitter', 'tough']),
    )
  })
})
