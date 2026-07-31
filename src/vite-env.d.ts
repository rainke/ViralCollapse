/// <reference types="vite/client" />

import type { HanziWriterAdapter } from './game/revival/handwriting'

declare global {
  interface Window {
    __viralHandwritingAdapter?: HanziWriterAdapter
  }
}
