import { describe, expect, it } from 'vitest'
import { QUIZ_QUESTIONS, shuffleQuizOptions } from './quiz'
import {
  QUIZ_SPEECH,
  getQuizFeedbackSpeech,
  getQuizSpeechSequence,
} from './quizSpeech'

describe('generated quiz speech', () => {
  it('maps every question and option to generated audio in display order', () => {
    for (const question of QUIZ_QUESTIONS) {
      const sequence = getQuizSpeechSequence(question)
      const expectedText = [
        `请听题。${question.prompt}`,
        ...question.options.flatMap((option, index) => [
          `${String.fromCharCode(65 + index)}，`,
          option.label,
        ]),
      ]

      expect(sequence.map((speech) => speech.text)).toEqual(expectedText)
      expect(sequence[0].asset).toBe(
        `/assets/generated/speech/quiz/question-${question.id}.wav`,
      )
      question.options.forEach((option, index) => {
        expect(sequence[index * 2 + 2].asset).toBe(
          `/assets/generated/speech/quiz/option-${question.id}-${option.id}.wav`,
        )
      })
    }
  })

  it('follows shuffled option order without changing generated option audio', () => {
    const question = QUIZ_QUESTIONS[0]
    const shuffled = shuffleQuizOptions(question, () => 0)

    expect(getQuizSpeechSequence(shuffled).map((speech) => speech.text)).toEqual([
      `请听题。${question.prompt}`,
      'A，',
      question.options[1].label,
      'B，',
      question.options[2].label,
      'C，',
      question.options[0].label,
    ])
  })

  it('provides distinct generated encouragement for both answer results', () => {
    expect(getQuizFeedbackSpeech(true)).toEqual({
      id: 'feedback:correct',
      text: '太棒了，答对啦！',
      asset: '/assets/generated/speech/quiz/feedback-correct.wav',
    })
    expect(getQuizFeedbackSpeech(false)).toEqual({
      id: 'feedback:wrong',
      text: '没关系，再想一想，你一定可以的。',
      asset: '/assets/generated/speech/quiz/feedback-wrong.wav',
    })
  })

  it('uses one unique output asset for every generated speech entry', () => {
    const assets = QUIZ_SPEECH.map((speech) => speech.asset)

    expect(new Set(assets).size).toBe(assets.length)
  })
})
