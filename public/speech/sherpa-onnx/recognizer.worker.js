const assetBase = '/speech/sherpa-onnx/'
let runtimeReady = false
let loadRequested = false
let loaded = false
let recognizer
let stream

self.Module = {
  locateFile(path) {
    return `${assetBase}${path}`
  },
  setStatus(status) {
    const match = status.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/)
    if (!match) return
    self.postMessage({
      type: 'progress',
      phase: 'downloading',
      loaded: Number(match[1]),
      total: Number(match[2]),
    })
  },
  onRuntimeInitialized() {
    runtimeReady = true
    initializeRecognizer()
  },
}

function postError(error) {
  self.postMessage({
    type: 'error',
    message: error instanceof Error ? error.message : '离线语音模型初始化失败',
  })
}

function initializeRecognizer() {
  if (!runtimeReady || !loadRequested || loaded) return
  try {
    self.postMessage({ type: 'progress', phase: 'initializing', loaded: 0, total: 1 })
    recognizer = new OfflineRecognizer({
      modelConfig: {
        debug: 0,
        tokens: './tokens.txt',
        paraformer: { model: './paraformer.onnx' },
      },
    }, self.Module)
    loaded = true
    self.postMessage({ type: 'progress', phase: 'initializing', loaded: 1, total: 1 })
    self.postMessage({ type: 'ready' })
  } catch (error) {
    postError(error)
  }
}

function recognize() {
  if (!stream || !recognizer) return
  const activeStream = stream
  stream = undefined
  try {
    recognizer.decode(activeStream)
    const result = recognizer.getResult(activeStream)
    activeStream.free()
    if (result.text.trim()) {
      self.postMessage({
        type: 'result',
        result: { text: result.text, confidence: 1, final: true },
      })
    }
  } catch (error) {
    activeStream.free()
    postError(error)
  }
}

self.onmessage = ({ data }) => {
  if (data.type === 'load') {
    loadRequested = true
    initializeRecognizer()
  } else if (data.type === 'start' && loaded) {
    stream = recognizer.createStream()
  } else if (data.type === 'audio' && stream) {
    stream.acceptWaveform(data.sampleRate, data.samples)
  } else if (data.type === 'stop') {
    recognize()
  } else if (data.type === 'dispose') {
    stream?.free()
    recognizer?.free()
    stream = undefined
    recognizer = undefined
    self.close()
  }
}

importScripts(
  `${assetBase}sherpa-onnx-asr.js`,
  `${assetBase}sherpa-onnx-wasm-main-vad-asr.js`,
)
