export type QuizOptions =
  | readonly [QuizOption, QuizOption]
  | readonly [QuizOption, QuizOption, QuizOption]
  | readonly [QuizOption, QuizOption, QuizOption, QuizOption]

export interface QuizOption {
  id: string
  label: string
}

export interface QuizDifficulty {
  minWorldLevel: number
  maxWorldLevel: number
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: QuizOptions
  correctOptionId: string
  explanation: string
  difficulty: QuizDifficulty
}

export interface QuizAnswerResult {
  correct: boolean
  explanation: string
}

export type RandomSource = () => number

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'nose-blocks-dust',
    prompt: '鼻毛和黏液能帮我们做什么？',
    options: [
      { id: 'block-dust', label: '挡住灰尘和小坏蛋' },
      { id: 'make-noise', label: '让声音变得更大' },
      { id: 'change-color', label: '让鼻子改变颜色' },
    ],
    correctOptionId: 'block-dust',
    explanation: '鼻毛和黏液会帮助挡住灰尘和小坏蛋。',
    difficulty: { minWorldLevel: 1, maxWorldLevel: 100 },
  },
  {
    id: 'nose-guard-location',
    prompt: '鼻毛和黏液是哪位身体小卫士？',
    options: [
      { id: 'in-nose', label: '鼻子小卫士' },
      { id: 'in-feet', label: '脚丫小卫士' },
      { id: 'in-hair', label: '头发小卫士' },
    ],
    correctOptionId: 'in-nose',
    explanation: '鼻毛和黏液住在鼻子里，帮助挡住灰尘和小坏蛋。',
    difficulty: { minWorldLevel: 1, maxWorldLevel: 100 },
  },
  {
    id: 'hand-washing',
    prompt: '认真洗手有什么帮助？',
    options: [
      { id: 'wash-away', label: '把手上的脏东西冲走' },
      { id: 'run-faster', label: '马上跑得更快' },
      { id: 'grow-taller', label: '马上长得更高' },
    ],
    correctOptionId: 'wash-away',
    explanation: '认真洗手，可以把手上的脏东西冲走。',
    difficulty: { minWorldLevel: 2, maxWorldLevel: 100 },
  },
  {
    id: 'virus-shapes',
    prompt: '病毒的外形都一模一样吗？',
    options: [
      { id: 'different', label: '不是，病毒外形很多样' },
      { id: 'same', label: '是的，全部一模一样' },
    ],
    correctOptionId: 'different',
    explanation: '病毒外形很多样，弯弯长长的也可能是病毒。',
    difficulty: { minWorldLevel: 3, maxWorldLevel: 100 },
  },
  {
    id: 'fresh-air',
    prompt: '怎样能让房间里的空气更舒服？',
    options: [
      { id: 'ventilate', label: '开窗让新鲜空气流动' },
      { id: 'close-window', label: '一直紧闭门窗' },
      { id: 'hide', label: '躲进被子里' },
    ],
    correctOptionId: 'ventilate',
    explanation: '让新鲜空气流动，房间会更舒服。',
    difficulty: { minWorldLevel: 4, maxWorldLevel: 100 },
  },
  {
    id: 'cover-cough',
    prompt: '咳嗽或打喷嚏时应该怎么做？',
    options: [
      { id: 'cover', label: '用纸巾或手肘遮住口鼻' },
      { id: 'nothing', label: '什么也不用做' },
      { id: 'hands', label: '对着手掌咳嗽' },
    ],
    correctOptionId: 'cover',
    explanation: '咳嗽或打喷嚏时，用纸巾或手肘遮住口鼻。',
    difficulty: { minWorldLevel: 5, maxWorldLevel: 100 },
  },
  {
    id: 'drink-water',
    prompt: '每天记得喝水，是为了什么？',
    options: [
      { id: 'body-work', label: '让身体舒服地工作' },
      { id: 'skip-sleep', label: '以后不需要睡觉' },
      { id: 'never-eat', label: '以后不需要吃饭' },
    ],
    correctOptionId: 'body-work',
    explanation: '每天记得喝水，让身体舒服地工作。',
    difficulty: { minWorldLevel: 6, maxWorldLevel: 100 },
  },
  {
    id: 'sleep-energy',
    prompt: '早点睡、好好休息会怎样？',
    options: [
      { id: 'restore', label: '身体会补充能量' },
      { id: 'weaken', label: '身体会马上变弱' },
    ],
    correctOptionId: 'restore',
    explanation: '早点睡好好休息，身体会补充能量。',
    difficulty: { minWorldLevel: 7, maxWorldLevel: 100 },
  },
  {
    id: 'exercise-strength',
    prompt: '跑跑跳跳做运动有什么帮助？',
    options: [
      { id: 'strength', label: '身体会更有力量' },
      { id: 'no-water', label: '从此不需要喝水' },
      { id: 'no-rest', label: '从此不需要休息' },
    ],
    correctOptionId: 'strength',
    explanation: '跑跑跳跳做运动，身体会更有力量。',
    difficulty: { minWorldLevel: 8, maxWorldLevel: 100 },
  },
  {
    id: 'tell-adult',
    prompt: '身体不舒服时应该怎么做？',
    options: [
      { id: 'tell', label: '及时告诉信任的大人' },
      { id: 'hide', label: '一直藏着不说' },
    ],
    correctOptionId: 'tell',
    explanation: '身体不舒服时，要及时告诉信任的大人。',
    difficulty: { minWorldLevel: 9, maxWorldLevel: 100 },
  },
  {
    id: 'vaccine-practice',
    prompt: '疫苗会怎样帮助身体？',
    options: [
      { id: 'practice', label: '提前练习怎样保护自己' },
      { id: 'replace-sleep', label: '代替每天睡觉' },
      { id: 'change-shape', label: '把身体变成另一种形状' },
    ],
    correctOptionId: 'practice',
    explanation: '疫苗会帮助身体提前练习怎样保护自己。',
    difficulty: { minWorldLevel: 10, maxWorldLevel: 100 },
  },
] as const

function randomIndex(length: number, random: RandomSource): number {
  const value = random()
  const normalized = Number.isFinite(value)
    ? Math.min(0.999999999, Math.max(0, value))
    : 0
  return Math.floor(normalized * length)
}

export function getQuestionsForWorld(
  worldLevel: number,
  questions: readonly QuizQuestion[] = QUIZ_QUESTIONS,
): QuizQuestion[] {
  return questions.filter(({ difficulty }) =>
    worldLevel >= difficulty.minWorldLevel &&
    worldLevel <= difficulty.maxWorldLevel,
  )
}

export function shuffleQuizOptions(
  question: QuizQuestion,
  random: RandomSource = Math.random,
): QuizQuestion {
  const options = [...question.options]
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random)
    const swap = options[index]
    options[index] = options[swapIndex]
    options[swapIndex] = swap
  }
  return { ...question, options: options as unknown as QuizOptions }
}

export function selectQuizQuestion(
  worldLevel: number,
  previousQuestionId?: string,
  random: RandomSource = Math.random,
  questions: readonly QuizQuestion[] = QUIZ_QUESTIONS,
): QuizQuestion | null {
  const eligible = getQuestionsForWorld(worldLevel, questions)
  const withoutPrevious = eligible.filter(({ id }) => id !== previousQuestionId)
  const choices = withoutPrevious.length > 0 ? withoutPrevious : eligible
  if (choices.length === 0) return null
  return shuffleQuizOptions(choices[randomIndex(choices.length, random)], random)
}

export function checkQuizAnswer(
  question: QuizQuestion,
  optionId: string,
): QuizAnswerResult {
  return {
    correct: optionId === question.correctOptionId,
    explanation: question.explanation,
  }
}
