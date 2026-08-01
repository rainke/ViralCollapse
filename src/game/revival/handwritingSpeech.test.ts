import { describe, expect, it } from 'vitest'
import {
  HANDWRITING_SPEECH,
  getHandwritingFeedbackSpeech,
  getHandwritingSpeechSequence,
} from './handwritingSpeech'

describe('generated handwriting speech', () => {
  it('introduces every handwriting revival character before the child writes', () => {
    expect(getHandwritingSpeechSequence('手')).toEqual([
      {
        id: 'writing:hand:instruction',
        text: '书写挑战开始。请按照笔顺，完整写出“手”字。',
        asset: '/assets/generated/speech/handwriting/instruction-hand.wav',
      },
      {
        id: 'writing:hand:introduction',
        text: '“手”字像张开的手掌。勤洗小手，帮身体挡住脏东西。',
        asset: '/assets/generated/speech/handwriting/introduction-hand.wav',
      },
    ])
    expect(getHandwritingSpeechSequence('心').map((speech) => speech.id)).toEqual([
      'writing:heart:instruction',
      'writing:heart:introduction',
    ])
    expect(getHandwritingSpeechSequence('水').map((speech) => speech.id)).toEqual([
      'writing:water:instruction',
      'writing:water:introduction',
    ])
  })

  it('plays character-specific encouragement after a completed writing task', () => {
    expect(getHandwritingFeedbackSpeech('水')).toEqual({
      id: 'writing:water:feedback',
      text: '太棒了！你完整写出了“水”字，复活能量充满啦！',
      asset: '/assets/generated/speech/handwriting/feedback-water.wav',
    })
  })

  it('uses a unique generated asset for every handwriting speech entry', () => {
    const assets = HANDWRITING_SPEECH.map((speech) => speech.asset)

    expect(new Set(assets).size).toBe(assets.length)
  })
})
