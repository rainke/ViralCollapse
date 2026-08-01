import quizSpeechManifest from '../../../assets/quiz-speech-manifest.json'

export interface HandwritingSpeech {
  id: string
  text: string
  asset: string
}

export const HANDWRITING_SPEECH: readonly HandwritingSpeech[] =
  quizSpeechManifest.filter((speech) => speech.id.startsWith('writing:'))

const handwritingSpeechById = new Map(
  HANDWRITING_SPEECH.map((speech) => [speech.id, speech]),
)

const speechKeyByCharacter: Readonly<Record<string, string>> = {
  手: 'hand',
  心: 'heart',
  水: 'water',
}

function getHandwritingSpeech(id: string): HandwritingSpeech {
  const speech = handwritingSpeechById.get(id)
  if (!speech) throw new Error(`Missing generated handwriting speech: ${id}`)
  return speech
}

function getSpeechKey(character: string): string {
  const key = speechKeyByCharacter[character]
  if (!key) throw new Error(`Missing handwriting speech key: ${character}`)
  return key
}

export function getHandwritingSpeechSequence(
  character: string,
): HandwritingSpeech[] {
  const key = getSpeechKey(character)
  return [
    getHandwritingSpeech(`writing:${key}:instruction`),
    getHandwritingSpeech(`writing:${key}:introduction`),
  ]
}

export function getHandwritingFeedbackSpeech(
  character: string,
): HandwritingSpeech {
  return getHandwritingSpeech(`writing:${getSpeechKey(character)}:feedback`)
}
