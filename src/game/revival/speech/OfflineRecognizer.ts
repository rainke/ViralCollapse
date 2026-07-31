export interface RecognitionResult {
  text: string
  confidence: number
  final: boolean
}

export interface LoadProgress {
  loaded: number
  total: number
  phase: 'downloading' | 'initializing'
}

export interface OfflineRecognizerCallbacks {
  onResult: (result: RecognitionResult) => void
  onProgress?: (progress: LoadProgress) => void
  onError?: (error: Error) => void
}

export interface OfflineRecognizer {
  load(callbacks: OfflineRecognizerCallbacks): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  dispose(): Promise<void>
}
