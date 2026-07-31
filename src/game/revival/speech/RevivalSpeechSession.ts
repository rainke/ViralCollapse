import type { OfflineRecognizer, RecognitionResult } from './OfflineRecognizer'
import type { LoadProgress } from './OfflineRecognizer'
import { acceptsRecognition, type SpeechTarget } from './policy'

export type SpeechSessionState =
  | 'idle' | 'loading' | 'listening' | 'success' | 'incorrect'
  | 'timeout' | 'silent' | 'low-confidence' | 'error' | 'disposed'

export class RevivalSpeechSession {
  private generation = 0
  private timer?: ReturnType<typeof setTimeout>
  private heardResult = false
  state: SpeechSessionState = 'idle'

  constructor(
    private readonly recognizer: OfflineRecognizer,
    private readonly target: SpeechTarget,
    private readonly onState: (state: SpeechSessionState) => void,
    private readonly timeoutMs = 8_000,
    private readonly onProgress?: (progress: LoadProgress) => void,
  ) {}

  async start(): Promise<void> {
    const generation = ++this.generation
    this.setState('loading')
    await this.recognizer.load({
      onResult: (result) => this.receive(result, generation),
      onProgress: this.onProgress,
      onError: () => this.setState('error'),
    })
    if (generation !== this.generation) return
    this.heardResult = false
    await this.recognizer.start()
    this.setState('listening')
    this.timer = setTimeout(() => {
      if (generation !== this.generation) return
      this.setState(this.heardResult ? 'timeout' : 'silent')
      void this.recognizer.stop()
    }, this.timeoutMs)
  }

  async dispose(): Promise<void> {
    ++this.generation
    if (this.timer !== undefined) clearTimeout(this.timer)
    await this.recognizer.stop()
    await this.recognizer.dispose()
    this.setState('disposed')
  }

  private receive(result: RecognitionResult, generation: number): void {
    if (generation !== this.generation || !result.final) return
    this.heardResult = true
    if (result.confidence < 0.72) this.setState('low-confidence')
    else this.setState(acceptsRecognition(result, this.target) ? 'success' : 'incorrect')
    if (this.state === 'success') void this.disposeAfterSuccess()
  }

  private async disposeAfterSuccess(): Promise<void> {
    if (this.timer !== undefined) clearTimeout(this.timer)
    await this.recognizer.stop()
  }

  private setState(state: SpeechSessionState): void {
    this.state = state
    this.onState(state)
  }
}
