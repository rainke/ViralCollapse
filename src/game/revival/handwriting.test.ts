import { describe, expect, it, vi } from 'vitest'
import {
  HandwritingQuiz,
  createHandwritingTask,
  type HanziWriterAdapter,
  type WriterInstance,
} from './handwriting'

function setup() {
  const quizzes: Array<Parameters<WriterInstance['quiz']>[0]> = []
  const cancelQuiz = vi.fn()
  const adapter: HanziWriterAdapter = {
    create: vi.fn(() => ({
      quiz: (callbacks: Parameters<WriterInstance['quiz']>[0]) => {
        quizzes.push(callbacks)
      },
      cancelQuiz,
    })),
  }
  const callbacks = {
    onComplete: vi.fn(),
    onMistake: vi.fn(),
    onLoadError: vi.fn(),
  }
  return { quiz: new HandwritingQuiz(adapter), adapter, quizzes, cancelQuiz, callbacks }
}

describe('HandwritingQuiz', () => {
  it('only passes after the writer reports the whole quiz complete', () => {
    const { quiz, quizzes, callbacks } = setup()
    const task = createHandwritingTask(() => 0)
    quiz.start({} as HTMLElement, task, callbacks)

    quizzes[0].onMistake()
    expect(callbacks.onComplete).not.toHaveBeenCalled()
    quizzes[0].onComplete()
    expect(callbacks.onComplete).toHaveBeenCalledOnce()
    expect(quizzes[0].markStrokeCorrectAfterMisses).toBe(false)
  })

  it('reset starts over without passing', () => {
    const { quiz, quizzes, cancelQuiz, callbacks } = setup()
    const task = createHandwritingTask(() => 0)
    const target = {} as HTMLElement
    quiz.start(target, task, callbacks)
    quiz.reset(target, task, callbacks)

    expect(cancelQuiz).toHaveBeenCalledOnce()
    expect(quizzes).toHaveLength(2)
    expect(callbacks.onComplete).not.toHaveBeenCalled()
  })

  it('ignores callbacks from an expired instance', () => {
    const { quiz, quizzes, callbacks } = setup()
    quiz.start({} as HTMLElement, createHandwritingTask(() => 0), callbacks)
    quiz.start({} as HTMLElement, createHandwritingTask(() => 0.5), callbacks)

    quizzes[0].onComplete()
    quizzes[0].onMistake()
    expect(callbacks.onComplete).not.toHaveBeenCalled()
    expect(callbacks.onMistake).not.toHaveBeenCalled()
    quizzes[1].onComplete()
    expect(callbacks.onComplete).toHaveBeenCalledOnce()
  })
})
