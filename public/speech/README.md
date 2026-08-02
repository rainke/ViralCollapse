# Offline speech assets

This directory contains the pinned sherpa-onnx WebAssembly runtime and the
offline Paraformer-small Chinese/English model. It must not contain generated
art.

## Installed asset

- Source: `sherpa-onnx-wasm-simd-1.12.35-vad-asr-zh_en-paraformer_small.tar.bz2`
  from <https://github.com/k2-fsa/sherpa-onnx/releases/tag/v1.12.35>
- Engine: sherpa-onnx 1.12.35, Apache-2.0
- Model: Paraformer-small Chinese/English, based on
  <https://www.modelscope.cn/models/crazyant/speech_paraformer_asr_nat-zh-cn-16k-common-vocab8358-onnx>
  (the upstream model metadata declares no licence)
- Compressed transfer size: 80,311,362 bytes
- Extracted runtime size: about 92 MB

| File | SHA-256 |
| --- | --- |
| `sherpa-onnx-asr.js` | `d51ae8e8b756ee5e53423ffada0c9702973f154f561aca7984fe0b12f4060178` |
| `sherpa-onnx-wasm-main-vad-asr.js` | `a6bfefd1fdebde5a89705e5cd091e565f9443f07a912a2ca08d19d3ce0f3590c` |
| `sherpa-onnx-wasm-main-vad-asr.wasm` | `ba5f9e8d8e20c8f2d24968fe111947401caa0323604a84e78697b9f69f90badb` |
| `sherpa-onnx-wasm-main-vad-asr.data` | `9b89b7afaf5375704e758e85e88955abab381f81c466b24ecc7320b24d81b80f` |

The current `manifest.json` selects this asset. On the development host, the
Pixel 7 Playwright profile initialized the model in about 8 seconds. Peak
memory, initialization time, and accuracy on the actual lowest-spec target
phone are unverified; complete that audit before releasing the game publicly.
