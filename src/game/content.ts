export type EnemyType =
  | 'basic'
  | 'fast'
  | 'wobbly'
  | 'splitter'
  | 'tough'
  | 'influenza'
  | 'adenovirus'
  | 'rabies'
  | 'pox'
  | 'polyhedral'
  | 'wideMouth'

export type BossType = 'ebola' | 'corona'

export interface BossConfig {
  type: BossType
  name: string
  texture: string
  points: number
  displaySize: readonly [number, number]
}

export type EnemyWeights = Record<EnemyType, number>

export interface LevelConfig {
  id: number
  name: string
  subtitle: string
  mode: 'wave' | 'boss'
  enemyWeights: EnemyWeights
  tint: number
  boss?: BossConfig
  fact: {
    emoji: string
    title: string
    body: string
  }
}

const none: EnemyWeights = {
  basic: 0,
  fast: 0,
  wobbly: 0,
  splitter: 0,
  tough: 0,
  influenza: 0,
  adenovirus: 0,
  rabies: 0,
  pox: 0,
  polyhedral: 0,
  wideMouth: 0,
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: 1,
    name: '鼻腔花园',
    subtitle: '黏液泡泡会挡住坏家伙',
    mode: 'wave',
    enemyWeights: { ...none, basic: 72, wobbly: 28 },
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
    enemyWeights: {
      ...none,
      basic: 22,
      fast: 18,
      wobbly: 16,
      splitter: 16,
      rabies: 16,
      pox: 12,
    },
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
    enemyWeights: { ...none },
    tint: 0xefdcff,
    boss: {
      type: 'ebola',
      name: '埃博拉弯弯王',
      texture: 'virus-ebola-boss',
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
    enemyWeights: {
      ...none,
      basic: 22,
      fast: 18,
      influenza: 14,
      wobbly: 12,
      splitter: 12,
      adenovirus: 12,
      polyhedral: 10,
    },
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
    enemyWeights: {
      basic: 10,
      fast: 9,
      wobbly: 9,
      splitter: 9,
      tough: 9,
      influenza: 9,
      adenovirus: 9,
      rabies: 9,
      pox: 9,
      polyhedral: 9,
      wideMouth: 9,
    },
    tint: 0xffe0d1,
    fact: {
      emoji: '🤧',
      title: '咳嗽要遮挡',
      body: '咳嗽或打喷嚏时，用纸巾或手肘遮住口鼻。',
    },
  },
  {
    id: 6,
    name: '淋巴溪流',
    subtitle: '顺着清亮溪流继续巡逻',
    mode: 'wave',
    enemyWeights: {
      basic: 8,
      fast: 12,
      wobbly: 10,
      splitter: 10,
      tough: 6,
      influenza: 12,
      adenovirus: 8,
      rabies: 12,
      pox: 8,
      polyhedral: 8,
      wideMouth: 6,
    },
    tint: 0xcff5ee,
    fact: {
      emoji: '🥤',
      title: '喝水好帮手',
      body: '每天记得喝水，让身体舒服地工作。',
    },
  },
  {
    id: 7,
    name: '白细胞工坊',
    subtitle: '和白细胞伙伴一起守护',
    mode: 'wave',
    enemyWeights: {
      basic: 5,
      fast: 8,
      wobbly: 8,
      splitter: 10,
      tough: 10,
      influenza: 10,
      adenovirus: 12,
      rabies: 8,
      pox: 12,
      polyhedral: 10,
      wideMouth: 7,
    },
    tint: 0xffeed1,
    fact: {
      emoji: '😴',
      title: '睡眠补能量',
      body: '早点睡好好休息，身体会补充能量。',
    },
  },
  {
    id: 8,
    name: '抗体星港',
    subtitle: '让抗体泡泡装满星港',
    mode: 'wave',
    enemyWeights: {
      basic: 5,
      fast: 8,
      wobbly: 8,
      splitter: 14,
      tough: 12,
      influenza: 8,
      adenovirus: 12,
      rabies: 6,
      pox: 10,
      polyhedral: 10,
      wideMouth: 7,
    },
    tint: 0xdcd7ff,
    fact: {
      emoji: '🏃',
      title: '运动有力量',
      body: '跑跑跳跳做运动，身体会更有力量。',
    },
  },
  {
    id: 9,
    name: '免疫防线',
    subtitle: '最后一道防线要守稳',
    mode: 'wave',
    enemyWeights: {
      basic: 4,
      fast: 8,
      wobbly: 7,
      splitter: 12,
      tough: 14,
      influenza: 8,
      adenovirus: 12,
      rabies: 7,
      pox: 10,
      polyhedral: 11,
      wideMouth: 7,
    },
    tint: 0xffd9e8,
    fact: {
      emoji: '🙋',
      title: '不舒服要说',
      body: '身体不舒服时，要及时告诉信任的大人。',
    },
  },
  {
    id: 10,
    name: '冠状王座',
    subtitle: '迎战带冠状突起的最终病毒王',
    mode: 'boss',
    enemyWeights: { ...none },
    tint: 0xd9c9ff,
    boss: {
      type: 'corona',
      name: '冠状病毒王',
      texture: 'virus-corona-boss',
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
  const stage = Number.isFinite(level)
    ? ((Math.max(1, Math.floor(level)) - 1) % 10) + 1
    : 1
  return LEVELS[stage - 1]
}

export function getNextLevelId(level: number): number | null {
  return level >= 10 ? null : Math.max(1, Math.floor(level)) + 1
}

export function getEnemyForLevel(
  level: number,
  randomValue: number,
): EnemyType {
  const weights = getLevel(level).enemyWeights
  const normalized = Math.min(0.999999, Math.max(0, randomValue)) * 100
  let cumulative = 0
  for (const type of Object.keys(weights) as EnemyType[]) {
    cumulative += weights[type]
    if (normalized < cumulative) return type
  }
  return 'basic'
}
