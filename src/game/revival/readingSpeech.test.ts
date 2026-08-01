import { describe, expect, it } from 'vitest'
import {
  READING_SPEECH,
  getReadingSpeech,
} from './readingSpeech'

describe('generated reading speech', () => {
  it('introduces the target character and microphone action', () => {
    expect(getReadingSpeech('手')).toEqual({
      id: 'reading:hand:instruction',
      text: '请读出“手”字。点击麦克风开始录音。',
      asset: '/assets/generated/speech/reading/instruction-hand.wav',
    })
    expect(getReadingSpeech('心').id).toBe('reading:heart:instruction')
    expect(getReadingSpeech('水').id).toBe('reading:water:instruction')
  })

  it('uses a unique generated asset for every reading prompt', () => {
    const assets = READING_SPEECH.map((speech) => speech.asset)

    expect(new Set(assets).size).toBe(assets.length)
  })
})
