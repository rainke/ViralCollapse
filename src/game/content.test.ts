import { describe, expect, it } from 'vitest'
import {
  LEVELS,
  getEnemyForLevel,
  getLevel,
  getNextLevelId,
} from './content'

describe('level content', () => {
  it('ships six child-sized stages with boss fights at three and six', () => {
    expect(LEVELS).toHaveLength(6)
    expect(LEVELS.map((level) => level.name)).toEqual([
      '鼻腔花园',
      '呼吸通道',
      '埃博拉峡谷',
      '细胞迷宫',
      '免疫长廊',
      '冠状王座',
    ])
    expect(
      LEVELS.filter((level) => level.mode === 'boss').map(
        (level) => level.id,
      ),
    ).toEqual([3, 6])
    expect(LEVELS[2].boss?.type).toBe('ebola')
    expect(LEVELS[5].boss?.type).toBe('corona')
    expect(LEVELS[1].enemySpeed).toBeGreaterThan(LEVELS[0].enemySpeed)
    expect(LEVELS[4].cleanTarget).toBeGreaterThan(LEVELS[3].cleanTarget)
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

  it('advances through all six stages and stops after the final boss', () => {
    expect(LEVELS.map((level) => getNextLevelId(level.id))).toEqual([
      2,
      3,
      4,
      5,
      6,
      null,
    ])
  })

  it('offers eleven recognizable virus silhouettes across the run', () => {
    const sampledTypes = new Set([
      getEnemyForLevel(1, 0.1),
      getEnemyForLevel(1, 0.95),
      getEnemyForLevel(2, 0.3),
      getEnemyForLevel(2, 0.6),
      getEnemyForLevel(2, 0.75),
      getEnemyForLevel(2, 0.95),
      getEnemyForLevel(4, 0.45),
      getEnemyForLevel(4, 0.82),
      getEnemyForLevel(4, 0.95),
      getEnemyForLevel(5, 0.85),
      getEnemyForLevel(5, 0.95),
    ])

    expect(sampledTypes).toEqual(
      new Set([
        'basic',
        'wobbly',
        'fast',
        'splitter',
        'tough',
        'influenza',
        'adenovirus',
        'rabies',
        'pox',
        'polyhedral',
        'wideMouth',
      ]),
    )
  })

  it.each([
    [1, 0.1, 'basic'],
    [1, 0.72, 'wobbly'],
    [2, 0.1, 'basic'],
    [2, 0.22, 'fast'],
    [2, 0.4, 'wobbly'],
    [2, 0.56, 'splitter'],
    [2, 0.72, 'rabies'],
    [2, 0.88, 'pox'],
    [4, 0.1, 'basic'],
    [4, 0.22, 'fast'],
    [4, 0.4, 'influenza'],
    [4, 0.54, 'wobbly'],
    [4, 0.66, 'splitter'],
    [4, 0.78, 'adenovirus'],
    [4, 0.9, 'polyhedral'],
    [5, 0.1, 'basic'],
    [5, 0.11, 'fast'],
    [5, 0.2, 'wobbly'],
    [5, 0.29, 'splitter'],
    [5, 0.38, 'rabies'],
    [5, 0.47, 'pox'],
    [5, 0.56, 'influenza'],
    [5, 0.65, 'adenovirus'],
    [5, 0.74, 'polyhedral'],
    [5, 0.83, 'tough'],
    [5, 0.92, 'wideMouth'],
  ] as const)(
    'maps level %i at random value %f to %s',
    (level, randomValue, expected) => {
      expect(getEnemyForLevel(level, randomValue)).toBe(expected)
    },
  )
})
