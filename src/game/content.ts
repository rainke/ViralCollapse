export type EnemyType =
  | 'basic'
  | 'fast'
  | 'wobbly'
  | 'splitter'
  | 'tough'

export interface LevelConfig {
  id: number
  name: string
  subtitle: string
  cleanTarget: number
  spawnEvery: number
  enemySpeed: number
  tint: number
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
    cleanTarget: 18,
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
    cleanTarget: 26,
    spawnEvery: 760,
    enemySpeed: 108,
    tint: 0xd8e9ff,
    fact: {
      emoji: '🧼',
      title: '洗手有魔力',
      body: '认真洗手，可以把手上的脏东西冲走。',
    },
  },
  {
    id: 3,
    name: '免疫基地',
    subtitle: '集合抗体，准备迎战病毒王',
    cleanTarget: 34,
    spawnEvery: 620,
    enemySpeed: 132,
    tint: 0xe5dcff,
    fact: {
      emoji: '😴',
      title: '休息会充电',
      body: '好好吃饭和睡觉，身体小卫士更有精神。',
    },
  },
] as const

export function getLevel(level: number): LevelConfig {
  return LEVELS.find((item) => item.id === level) ?? LEVELS[0]
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

  if (randomValue >= 0.8) return 'tough'
  if (randomValue >= 0.62) return 'splitter'
  if (randomValue >= 0.42) return 'wobbly'
  if (randomValue >= 0.22) return 'fast'
  return 'basic'
}
