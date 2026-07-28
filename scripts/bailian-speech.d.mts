export const BAILIAN_VOICE_CLONE_ENDPOINT: string
export const BAILIAN_GENERATION_ENDPOINT: string

export function buildClonePayload(
  preferredName: string,
  sourceAudioBase64: string,
): Record<string, unknown>

export function buildSpeechPayload(
  voice: string,
  text: string,
): Record<string, unknown>
