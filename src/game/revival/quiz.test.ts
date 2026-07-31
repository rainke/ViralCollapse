import { describe, expect, it } from 'vitest'
import {
  QUIZ_QUESTIONS,
  checkQuizAnswer,
  getQuestionsForWorld,
  selectQuizQuestion,
  shuffleQuizOptions,
  type QuizQuestion,
} from './quiz'

const question: QuizQuestion = {
  id: 'test-question',
  prompt: '应该选哪一个？',
  options: [
    { id: 'yes', label: '正确选项' },
    { id: 'no', label: '错误选项' },
  ],
  correctOptionId: 'yes',
  explanation: '这是测试解释。',
  difficulty: { minWorldLevel: 2, maxWorldLevel: 4 },
}

describe('revival quiz', () => {
  it('filters questions to the current world difficulty', () => {
    expect(getQuestionsForWorld(1, [question])).toEqual([])
    expect(getQuestionsForWorld(3, [question])).toEqual([question])
    expect(getQuestionsForWorld(5, [question])).toEqual([])
    expect(getQuestionsForWorld(2, QUIZ_QUESTIONS).length).toBeGreaterThan(0)
  })

  it('shuffles options without changing the correct answer identity', () => {
    const shuffled = shuffleQuizOptions(question, () => 0)

    expect(shuffled.options.map((option) => option.id)).toEqual(['no', 'yes'])
    expect(shuffled.correctOptionId).toBe('yes')
    expect(checkQuizAnswer(shuffled, 'yes').correct).toBe(true)
  })

  it('checks correct and incorrect option IDs', () => {
    expect(checkQuizAnswer(question, 'yes')).toEqual({
      correct: true,
      explanation: question.explanation,
    })
    expect(checkQuizAnswer(question, 'no')).toEqual({
      correct: false,
      explanation: question.explanation,
    })
  })

  it('returns null for an empty pool and avoids the previous question', () => {
    expect(selectQuizQuestion(3, undefined, () => 0, [])).toBeNull()
    const first = selectQuizQuestion(10, undefined, () => 0)
    const next = selectQuizQuestion(10, first?.id, () => 0)

    expect(first).not.toBeNull()
    expect(next?.id).not.toBe(first?.id)
  })
})
