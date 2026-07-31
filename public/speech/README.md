# Offline speech assets

This directory is reserved for the pinned sherpa-onnx WASM runtime, Mandarin
streaming model, tokens, and their checksums. It must not contain generated art.

The empty manifest deliberately prevents shipping an unaudited model. Before
adding binaries, record the exact engine/model version, upstream license,
SHA-256 hashes, compressed transfer size, peak memory, initialization time, and
accuracy measured on the real lowest-spec target phone. Update `version` only
after that gate passes.
