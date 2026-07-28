export const BAILIAN_VOICE_CLONE_ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/customization'
export const BAILIAN_GENERATION_ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

const MODEL = 'qwen3-tts-vc-2026-01-22'

export function buildClonePayload(preferredName, sourceAudioBase64) {
  return {
    model: 'qwen-voice-enrollment',
    input: {
      action: 'create',
      target_model: MODEL,
      preferred_name: preferredName,
      audio: { data: `data:audio/mpeg;base64,${sourceAudioBase64}` },
      language: 'zh',
    },
  }
}

export function buildSpeechPayload(voice, text) {
  return {
    model: MODEL,
    input: {
      text,
      voice,
      language_type: 'Chinese',
    },
    parameters: { format: 'mp3' },
  }
}
