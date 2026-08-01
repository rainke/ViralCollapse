import { describe, expect, it } from 'vitest'
import {
  READING_SPEECH,
  getReadingSpeech,
} from './readingSpeech'

describe('generated reading speech', () => {
  it('guides the child without saying the target character', () => {
    const speech = getReadingSpeech()

    expect(speech).toEqual({
      id: 'reading:instruction',
      text: '请读出屏幕上的汉字。点击麦克风开始录音。',
      asset: '/assets/generated/speech/reading/instruction.wav',
    })
    expect(speech.text).not.toMatch(/[手心水]/)
  })

  it('uses one reusable prompt for every reading challenge', () => {
    expect(READING_SPEECH).toHaveLength(1)
  })
})
