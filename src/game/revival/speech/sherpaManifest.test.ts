import { describe, expect, it } from 'vitest'
import { getSherpaModelFiles } from './sherpaManifest'

describe('getSherpaModelFiles', () => {
  it('rejects an empty model manifest instead of reporting the recognizer ready', () => {
    expect(() => getSherpaModelFiles([])).toThrow('离线语音模型未安装')
  })

  it('returns the files required to initialize an installed model', () => {
    expect(getSherpaModelFiles(['sherpa-onnx-wasm-main.wasm', 'model.onnx']))
      .toEqual(['sherpa-onnx-wasm-main.wasm', 'model.onnx'])
  })
})
