import { describe, expect, it } from 'vitest'
import {
  BAILIAN_GENERATION_ENDPOINT,
  BAILIAN_VOICE_CLONE_ENDPOINT,
  buildClonePayload,
  buildSpeechPayload,
  getAudioMimeType,
} from '../../scripts/bailian-speech.mjs'

describe('Bailian speech requests', () => {
  it('creates a Qwen voice clone from the local MP3 as a data URL', () => {
    expect(buildClonePayload('ViralCollapseGuardian', 'c291cmNl')).toEqual({
      model: 'qwen-voice-enrollment',
      input: {
        action: 'create',
        target_model: 'qwen3-tts-vc-2026-01-22',
        preferred_name: 'ViralCollapseGuardian',
        audio: { data: 'data:audio/mpeg;base64,c291cmNl' },
        language: 'zh',
      },
    })
    expect(BAILIAN_VOICE_CLONE_ENDPOINT).toBe(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization',
    )
  })

  it('synthesizes speech with the cloned Qwen voice', () => {
    expect(buildSpeechPayload('cloned-voice', '洗手有魔力。')).toEqual({
      model: 'qwen3-tts-vc-2026-01-22',
      input: {
        text: '洗手有魔力。',
        voice: 'cloned-voice',
        language_type: 'Chinese',
      },
    })
    expect(BAILIAN_GENERATION_ENDPOINT).toBe(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    )
  })

  it('uses the correct data URL MIME type for supported clone samples', () => {
    expect(getAudioMimeType('source.mp3')).toBe('audio/mpeg')
    expect(getAudioMimeType('source.m4a')).toBe('audio/mp4')
    expect(getAudioMimeType('source.wav')).toBe('audio/wav')
  })
})
