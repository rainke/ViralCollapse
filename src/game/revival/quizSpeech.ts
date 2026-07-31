import quizSpeechManifest from '../../../assets/quiz-speech-manifest.json'
import type { QuizQuestion } from './quiz'

export interface QuizSpeech {
  id: string
  text: string
  asset: string
}

export const QUIZ_SPEECH: readonly QuizSpeech[] = quizSpeechManifest
const quizSpeechById = new Map(QUIZ_SPEECH.map((speech) => [speech.id, speech]))

function getQuizSpeech(id: string): QuizSpeech {
  const speech = quizSpeechById.get(id)
  if (!speech) throw new Error(`Missing generated quiz speech: ${id}`)
  return speech
}

export function getQuizSpeechSequence(question: QuizQuestion): QuizSpeech[] {
  return [
    getQuizSpeech(`question:${question.id}`),
    ...question.options.flatMap((option, index) => [
      getQuizSpeech(`marker:${String.fromCharCode(97 + index)}`),
      getQuizSpeech(`option:${question.id}:${option.id}`),
    ]),
  ]
}

export function getQuizFeedbackSpeech(correct: boolean): QuizSpeech {
  return getQuizSpeech(`feedback:${correct ? 'correct' : 'wrong'}`)
}
