export type EnemyType =
  | 'basic'
  | 'fast'
  | 'wobbly'
  | 'splitter'
  | 'tough'
  | 'influenza'
  | 'adenovirus'

export type BossType = 'ebola' | 'corona'

export interface BossConfig {
  type: BossType
  name: string
  texture: string
  health: number
  points: number
  displaySize: readonly [number, number]
}

export interface LevelConfig {
  id: number
  name: string
  subtitle: string
  mode: 'wave' | 'boss'
  cleanTarget: number
  spawnEvery: number
  enemySpeed: number
  tint: number
  boss?: BossConfig
  fact: {
    emoji: string
    title: string
    body: string
  }
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: 1,
    name: '鼻腔花园',
    subtitle: '黏液泡泡会挡住坏家伙',
    mode: 'wave',
    cleanTarget: 14,
    spawnEvery: 950,
    enemySpeed: 82,
    tint: 0xffd5dc,
    fact: {
      emoji: '🫧',
      title: '鼻子小卫士',
      body: '鼻毛和黏液会帮助挡住灰尘和小坏蛋。',
    },
  },
  {
    id: 2,
    name: '呼吸通道',
    subtitle: '追上飞快的病毒泡泡',
    mode: 'wave',
    cleanTarget: 18,
    spawnEvery: 820,
    enemySpeed: 104,
    tint: 0xd8e9ff,
    fact: {
      emoji: '🧼',
      title: '洗手有魔力',
      body: '认真洗手，可以把手上的脏东西冲走。',
    },
  },
  {
    id: 3,
    name: '埃博拉峡谷',
    subtitle: '小心会扭弯的长长病毒',
    mode: 'boss',
    cleanTarget: 0,
    spawnEvery: 0,
    enemySpeed: 0,
    tint: 0xefdcff,
    boss: {
      type: 'ebola',
      name: '埃博拉弯弯王',
      texture: 'virus-ebola-boss',
      health: 34,
      points: 600,
      displaySize: [220, 330],
    },
    fact: {
      emoji: '🔎',
      title: '形状会不同',
      body: '病毒外形很多样，弯弯长长的也可能是病毒。',
    },
  },
  {
    id: 4,
    name: '细胞迷宫',
    subtitle: '认出放射刺球和绿色多面体',
    mode: 'wave',
    cleanTarget: 24,
    spawnEvery: 720,
    enemySpeed: 118,
    tint: 0xd7f4ff,
    fact: {
      emoji: '🪟',
      title: '开窗多通风',
      body: '让新鲜空气流动，房间会更舒服。',
    },
  },
  {
    id: 5,
    name: '免疫长廊',
    subtitle: '病毒变多了，保持冷静',
    mode: 'wave',
    cleanTarget: 30,
    spawnEvery: 610,
    enemySpeed: 134,
    tint: 0xffe0d1,
    fact: {
      emoji: '🤧',
      title: '咳嗽要遮挡',
      body: '咳嗽或打喷嚏时，用纸巾或手肘遮住口鼻。',
    },
  },
  {
    id: 6,
    name: '冠状王座',
    subtitle: '迎战带冠状突起的最终病毒王',
    mode: 'boss',
    cleanTarget: 0,
    spawnEvery: 0,
    enemySpeed: 0,
    tint: 0xd9c9ff,
    boss: {
      type: 'corona',
      name: '冠状病毒王',
      texture: 'virus-corona-boss',
      health: 52,
      points: 1_000,
      displaySize: [205, 308],
    },
    fact: {
      emoji: '🛡️',
      title: '疫苗小盾牌',
      body: '疫苗会帮助身体提前练习怎样保护自己。',
    },
  },
] as const

export function getLevel(level: number): LevelConfig {
  return LEVELS.find((item) => item.id === level) ?? LEVELS[0]
}

export function getNextLevelId(level: number): number | null {
  return LEVELS.find((item) => item.id > level)?.id ?? null
}

export function getEnemyForLevel(
  level: number,
  randomValue: number,
): EnemyType {
  if (level === 1) return randomValue >= 0.72 ? 'wobbly' : 'basic'
  if (level === 2) {
    if (randomValue >= 0.82) return 'splitter'
    if (randomValue >= 0.62) return 'wobbly'
    if (randomValue >= 0.38) return 'fast'
    return 'basic'
  }

  if (level === 4) {
    if (randomValue >= 0.86) return 'adenovirus'
    if (randomValue >= 0.72) return 'splitter'
    if (randomValue >= 0.56) return 'wobbly'
    if (randomValue >= 0.38) return 'influenza'
    if (randomValue >= 0.2) return 'fast'
    return 'basic'
  }

  if (randomValue >= 0.88) return 'tough'
  if (randomValue >= 0.74) return 'adenovirus'
  if (randomValue >= 0.58) return 'influenza'
  if (randomValue >= 0.42) return 'splitter'
  if (randomValue >= 0.26) return 'wobbly'
  if (randomValue >= 0.12) return 'fast'
  return 'basic'
}
