import type {
  OfflineRecognizer,
  OfflineRecognizerCallbacks,
  RecognitionResult,
} from './OfflineRecognizer'

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'progress'; loaded: number; total: number; phase: 'downloading' | 'initializing' }
  | { type: 'result'; result: RecognitionResult }
  | { type: 'error'; message: string }

export class SherpaWasmRecognizer implements OfflineRecognizer {
  private worker?: Worker
  private stream?: MediaStream
  private context?: AudioContext
  private source?: MediaStreamAudioSourceNode
  private processor?: ScriptProcessorNode
  private ready?: Promise<void>

  async load(callbacks: OfflineRecognizerCallbacks): Promise<void> {
    if (this.ready) return this.ready
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
    } catch (error) {
      const microphoneError = error instanceof Error ? error : new Error('Microphone unavailable')
      callbacks.onError?.(microphoneError)
      throw microphoneError
    }
    this.worker = new Worker('/speech/sherpa-onnx/recognizer.worker.js')
    this.ready = new Promise((resolve, reject) => {
      if (!this.worker) return reject(new Error('Worker unavailable'))
      this.worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        if (data.type === 'ready') resolve()
        else if (data.type === 'progress') callbacks.onProgress?.(data)
        else if (data.type === 'result') callbacks.onResult(data.result)
        else if (data.type === 'error') {
          const error = new Error(data.message)
          callbacks.onError?.(error)
          reject(error)
        }
      }
      this.worker.onerror = () => reject(new Error('Offline speech worker failed'))
      this.worker.postMessage({ type: 'load' })
    })
    return this.ready
  }

  async start(): Promise<void> {
    if (!this.worker || !this.stream) throw new Error('Recognizer is not loaded')
    this.context = new AudioContext()
    this.source = this.context.createMediaStreamSource(this.stream)
    this.processor = this.context.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (event) => {
      const samples = event.inputBuffer.getChannelData(0).slice()
      this.worker?.postMessage({ type: 'audio', samples, sampleRate: this.context?.sampleRate }, [samples.buffer])
    }
    this.source.connect(this.processor)
    this.processor.connect(this.context.destination)
    this.worker.postMessage({ type: 'start' })
  }

  async stop(): Promise<void> {
    this.worker?.postMessage({ type: 'stop' })
    this.processor?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    await this.context?.close()
    this.stream = undefined
    this.context = undefined
    this.processor = undefined
    this.source = undefined
  }

  async dispose(): Promise<void> {
    await this.stop()
    this.worker?.postMessage({ type: 'dispose' })
    this.worker?.terminate()
    this.worker = undefined
    this.ready = undefined
  }
}
