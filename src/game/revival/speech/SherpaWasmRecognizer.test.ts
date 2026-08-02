import { afterEach, describe, expect, it, vi } from 'vitest'
import { SherpaWasmRecognizer } from './SherpaWasmRecognizer'

class FakeWorker {
  static instance?: FakeWorker
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  constructor(
    readonly scriptUrl: string | URL,
    readonly options?: WorkerOptions,
  ) {
    FakeWorker.instance = this
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('SherpaWasmRecognizer', () => {
  it('loads the installed classic sherpa runtime worker', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const getUserMedia = vi.fn(async () => ({ getTracks: () => [] } as unknown as MediaStream))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    const recognizer = new SherpaWasmRecognizer()
    const loading = recognizer.load({ onResult: vi.fn() })

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    expect(FakeWorker.instance?.scriptUrl).toBe('/speech/sherpa-onnx/recognizer.worker.js')
    expect(FakeWorker.instance?.options).toBeUndefined()

    FakeWorker.instance?.onmessage?.({ data: { type: 'ready' } } as MessageEvent)
    await expect(loading).resolves.toBeUndefined()
  })
})
