import speechManifest from '../../assets/speech-manifest.json'

export interface FactSpeech {
  level: number
  text: string
  asset: string
}

export const FACT_SPEECH: readonly FactSpeech[] = speechManifest

export function getFactSpeech(level: number): FactSpeech | undefined {
  return FACT_SPEECH.find((item) => item.level === level)
}
