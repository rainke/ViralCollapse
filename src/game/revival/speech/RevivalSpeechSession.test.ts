import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OfflineRecognizer, OfflineRecognizerCallbacks } from './OfflineRecognizer'
import { RevivalSpeechSession } from './RevivalSpeechSession'

class FakeRecognizer implements OfflineRecognizer {
  callbacks?: OfflineRecognizerCallbacks
  stop = vi.fn(async () => {})
  dispose = vi.fn(async () => {})
  async load(callbacks: OfflineRecognizerCallbacks): Promise<void> { this.callbacks = callbacks }
  async start(): Promise<void> {}
}

afterEach(() => vi.useRealTimers())

describe('RevivalSpeechSession', () => {
  it('times out silently and releases resources', async () => {
    vi.useFakeTimers()
    const recognizer = new FakeRecognizer()
    const states: string[] = []
    const session = new RevivalSpeechSession(recognizer, { character: '白', pronunciations: ['bai2'] }, (state) => states.push(state), 10)
    await session.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(states).toContain('silent')
    expect(recognizer.stop).toHaveBeenCalled()
    await session.dispose()
    expect(recognizer.dispose).toHaveBeenCalled()
  })

  it('isolates results from an old task generation', async () => {
    const recognizer = new FakeRecognizer()
    const states: string[] = []
    const session = new RevivalSpeechSession(recognizer, { character: '白', pronunciations: ['bai2'] }, (state) => states.push(state))
    await session.start()
    const oldResult = recognizer.callbacks?.onResult
    await session.dispose()
    oldResult?.({ text: '白', confidence: 1, final: true })
    expect(states.at(-1)).toBe('disposed')
  })
})
