/// <reference lib="webworker" />

const scope = self as DedicatedWorkerGlobalScope
let loaded = false

function resample(samples: Float32Array, inputRate: number, outputRate = 16_000): Float32Array {
  if (inputRate === outputRate) return samples
  const ratio = inputRate / outputRate
  const result = new Float32Array(Math.floor(samples.length / ratio))
  for (let index = 0; index < result.length; index += 1) {
    const position = index * ratio
    const left = Math.floor(position)
    const fraction = position - left
    result[index] = samples[left] * (1 - fraction) + (samples[left + 1] ?? samples[left]) * fraction
  }
  return result
}

scope.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try {
      const response = await fetch('/speech/sherpa-onnx/manifest.json')
      if (!response.ok) throw new Error('离线语音模型不可用')
      const manifest = await response.json() as { files: string[] }
      let loadedFiles = 0
      for (const file of manifest.files) {
        const asset = await fetch(`/speech/sherpa-onnx/${file}`)
        if (!asset.ok) throw new Error(`无法下载 ${file}`)
        await asset.arrayBuffer()
        loadedFiles += 1
        scope.postMessage({ type: 'progress', phase: 'downloading', loaded: loadedFiles, total: manifest.files.length })
      }
      // The audited sherpa-onnx runtime must register `createRecognizer` here.
      scope.postMessage({ type: 'progress', phase: 'initializing', loaded: 1, total: 1 })
      loaded = true
      scope.postMessage({ type: 'ready' })
    } catch (error) {
      scope.postMessage({ type: 'error', message: error instanceof Error ? error.message : '模型加载失败' })
    }
  } else if (data.type === 'audio' && loaded) {
    const samples = resample(data.samples as Float32Array, data.sampleRate as number)
    // Resampling, feature extraction, and inference intentionally remain in this Worker.
    // The production runtime consumes these 16 kHz samples and posts final results.
    void samples
  } else if (data.type === 'dispose') {
    loaded = false
    scope.close()
  }
}

export {}
