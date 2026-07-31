import HanziWriter from 'hanzi-writer'

export type RetryPolicy = {
  showHintAfterMisses: number
  unlimitedAttempts: true
  completeEveryStroke: true
}

export type HandwritingTask = {
  character: string
  instanceId: string
  retryPolicy: RetryPolicy
}

export type QuizCallbacks = {
  onComplete: () => void
  onMistake: () => void
  onLoadError: () => void
}

export type WriterInstance = {
  quiz: (callbacks: {
    showHintAfterMisses: number
    markStrokeCorrectAfterMisses: false
    onComplete: () => void
    onMistake: () => void
  }) => void | Promise<unknown>
  cancelQuiz: () => void
}

export type HanziWriterAdapter = {
  create: (
    target: HTMLElement,
    character: string,
    options: {
      width: number
      height: number
      onLoadCharDataError: () => void
    },
  ) => WriterInstance
}

// Short, familiar words connected to health, bodies, and the game's world.
export const handwritingCharacters = ['人', '口', '手', '心', '水', '火', '气', '生'] as const

export const hanziWriterAdapter: HanziWriterAdapter = {
  create(target, character, options) {
    return HanziWriter.create(target, character, {
      ...options,
      padding: 12,
      showCharacter: false,
      showOutline: true,
      outlineColor: '#c9c2e8',
      drawingColor: '#49358e',
      highlightColor: '#ff8a65',
      highlightCompleteColor: '#36b987',
      drawingWidth: 8,
      leniency: 1.15,
      acceptBackwardsStrokes: false,
    })
  },
}

let nextInstanceId = 1

export function createHandwritingTask(random = Math.random): HandwritingTask {
  const index = Math.floor(random() * handwritingCharacters.length)
  return {
    character: handwritingCharacters[Math.min(index, handwritingCharacters.length - 1)],
    instanceId: `handwriting-${nextInstanceId++}`,
    retryPolicy: {
      showHintAfterMisses: 2,
      unlimitedAttempts: true,
      completeEveryStroke: true,
    },
  }
}

export class HandwritingQuiz {
  private writer?: WriterInstance
  private activeInstanceId?: string
  private generation = 0

  constructor(private readonly adapter: HanziWriterAdapter) {}

  start(
    target: HTMLElement,
    task: HandwritingTask,
    callbacks: QuizCallbacks,
  ): void {
    this.destroy()
    const activeInstanceId = `${task.instanceId}:${++this.generation}`
    this.activeInstanceId = activeInstanceId
    const isCurrent = () => this.activeInstanceId === activeInstanceId
    try {
      this.writer = this.adapter.create(target, task.character, {
        width: 240,
        height: 240,
        onLoadCharDataError: () => {
          if (isCurrent()) callbacks.onLoadError()
        },
      })
      void Promise.resolve(this.writer.quiz({
        showHintAfterMisses: task.retryPolicy.showHintAfterMisses,
        markStrokeCorrectAfterMisses: false,
        onMistake: () => {
          if (isCurrent()) callbacks.onMistake()
        },
        onComplete: () => {
          if (!isCurrent()) return
          this.activeInstanceId = undefined
          callbacks.onComplete()
        },
      })).catch(() => {
        if (isCurrent()) callbacks.onLoadError()
      })
    } catch {
      if (isCurrent()) callbacks.onLoadError()
    }
  }

  reset(target: HTMLElement, task: HandwritingTask, callbacks: QuizCallbacks): void {
    this.start(target, task, callbacks)
  }

  destroy(): void {
    this.activeInstanceId = undefined
    this.writer?.cancelQuiz()
    this.writer = undefined
  }
}
