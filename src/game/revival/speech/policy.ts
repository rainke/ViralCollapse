export interface SpeechTarget {
  character: string
  pronunciations: readonly string[]
}

export const SPEECH_TARGETS: readonly SpeechTarget[] = [
  { character: '手', pronunciations: ['shou3'] },
  { character: '心', pronunciations: ['xin1'] },
  { character: '白', pronunciations: ['bai2'] },
  { character: '火', pronunciations: ['huo3'] },
  { character: '木', pronunciations: ['mu4'] },
  { character: '水', pronunciations: ['shui3'] },
]

const traditionalToSimplified: Record<string, string> = {
  兒: '儿', 體: '体', 語: '语', 說: '说', 聽: '听',
}

const chineseNumbers: Record<string, string> = {
  零: '0', 一: '1', 二: '2', 两: '2', 兩: '2', 三: '3', 四: '4',
  五: '5', 六: '6', 七: '7', 八: '8', 九: '9',
}

export function normalizeRecognition(value: string): string {
  return [...value.normalize('NFKC')]
    .map((character) => traditionalToSimplified[character] ?? chineseNumbers[character] ?? character)
    .join('')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\p{P}\p{S}\s]/gu, '')
}

export function acceptsRecognition(
  result: { text: string; confidence: number; pronunciation?: string },
  target: SpeechTarget,
  minimumConfidence = 0.72,
): boolean {
  if (result.confidence < minimumConfidence) return false
  const text = normalizeRecognition(result.text)
  if (!text.includes(normalizeRecognition(target.character))) return false
  if (!result.pronunciation) return true
  return target.pronunciations.includes(result.pronunciation.toLowerCase())
}
