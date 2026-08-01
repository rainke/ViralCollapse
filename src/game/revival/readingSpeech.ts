import quizSpeechManifest from '../../../assets/quiz-speech-manifest.json'

export interface ReadingSpeech {
  id: string
  text: string
  asset: string
}

export const READING_SPEECH: readonly ReadingSpeech[] =
  quizSpeechManifest.filter((speech) => speech.id.startsWith('reading:'))

export function getReadingSpeech(): ReadingSpeech {
  const speech = READING_SPEECH[0]
  if (!speech) throw new Error('Missing generated reading speech')
  return speech
}
