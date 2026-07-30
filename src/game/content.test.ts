import { describe, expect, it } from 'vitest'
import {
  LEVELS,
  getEnemyForLevel,
  getLevel,
  getNextLevelId,
} from './content'

describe('level content', () => {
  it('ships ten chapter-one stages with boss fights at three and ten', () => {
    expect(LEVELS).toHaveLength(10)
    expect(LEVELS.map((level) => level.name)).toEqual([
      '鼻腔花园',
      '呼吸通道',
      '埃博拉峡谷',
      '细胞迷宫',
      '免疫长廊',
      '淋巴溪流',
      '白细胞工坊',
      '抗体星港',
      '免疫防线',
      '冠状王座',
    ])
    expect(
      LEVELS.filter((level) => level.mode === 'boss').map(
        (level) => level.id,
      ),
    ).toEqual([3, 10])
    expect(LEVELS[2].boss?.type).toBe('ebola')
    expect(LEVELS[9].boss?.type).toBe('corona')
  })

  it('keeps the science copy short and actionable', () => {
    for (const level of LEVELS) {
      expect(level.fact.title.length).toBeLessThanOrEqual(8)
      expect(level.fact.body.length).toBeLessThanOrEqual(40)
      expect(level.fact.emoji).toBeTruthy()
    }
  })

  it('reuses chapter content templates for later world levels', () => {
    expect(getLevel(99)).toBe(LEVELS[8])
    expect(getLevel(Number.NaN)).toBe(LEVELS[0])
  })

  it('advances through all ten stages and stops after the chapter boss', () => {
    expect(LEVELS.map((level) => getNextLevelId(level.id))).toEqual([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      null,
    ])
  })

  it('keeps every wave enemy table normalized to 100', () => {
    for (const level of LEVELS.filter((item) => item.mode === 'wave')) {
      expect(
        Object.values(level.enemyWeights).reduce(
          (total, weight) => total + weight,
          0,
        ),
      ).toBe(100)
    }
  })

  it('adds the four requested child-friendly facts', () => {
    expect(LEVELS.slice(5, 9).map((level) => level.fact.title)).toEqual([
      '喝水好帮手',
      '睡眠补能量',
      '运动有力量',
      '不舒服要说',
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
      getEnemyForLevel(9, 0.35),
      getEnemyForLevel(9, 0.48),
      getEnemyForLevel(9, 0.85),
      getEnemyForLevel(9, 0.95),
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
    [4, 0.4, 'wobbly'],
    [4, 0.54, 'splitter'],
    [4, 0.66, 'influenza'],
    [4, 0.78, 'adenovirus'],
    [4, 0.9, 'polyhedral'],
    [6, 0.01, 'basic'],
    [6, 0.09, 'fast'],
    [6, 0.21, 'wobbly'],
    [6, 0.31, 'splitter'],
    [6, 0.41, 'tough'],
    [6, 0.47, 'influenza'],
    [6, 0.59, 'adenovirus'],
    [6, 0.67, 'rabies'],
    [6, 0.79, 'pox'],
    [6, 0.87, 'polyhedral'],
    [6, 0.95, 'wideMouth'],
  ] as const)(
    'maps level %i at random value %f to %s',
    (level, randomValue, expected) => {
      expect(getEnemyForLevel(level, randomValue)).toBe(expected)
    },
  )
})
