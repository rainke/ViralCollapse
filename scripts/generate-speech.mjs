import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BAILIAN_GENERATION_ENDPOINT,
  BAILIAN_VOICE_CLONE_ENDPOINT,
  buildClonePayload,
  buildSpeechPayload,
  getAudioMimeType,
  getMissingSpeech,
} from './bailian-speech.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourcePath = resolve(root, process.env.BAILIAN_SOURCE_PATH ?? 'source.mp3')
const manifestPaths = [
  resolve(root, 'assets/speech-manifest.json'),
  resolve(root, 'assets/quiz-speech-manifest.json'),
]
const apiKey = process.env.BAILIAN_API_KEY
const voiceName = process.env.BAILIAN_VOICE_NAME ?? 'ViralGuard'

async function requestJson(url, payload, action) {
  if (!apiKey) {
    throw new Error('BAILIAN_API_KEY is required')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.code) {
    const message = body.message ?? `HTTP ${response.status}`
    const code = body.code ? ` (${body.code})` : ''
    throw new Error(`${action} failed${code}: ${message}`)
  }

  return body
}

async function cloneVoice() {
  const source = await readFile(sourcePath)
  const body = await requestJson(
    BAILIAN_VOICE_CLONE_ENDPOINT,
    buildClonePayload(
      voiceName,
      source.toString('base64'),
      getAudioMimeType(sourcePath),
    ),
    'Voice clone',
  )
  const voice = body.output?.voice

  if (!voice || typeof voice !== 'string') {
    throw new Error('Voice clone response contained no voice')
  }

  return voice
}

async function synthesizeSpeech(speech, voice) {
  const body = await requestJson(
    BAILIAN_GENERATION_ENDPOINT,
    buildSpeechPayload(voice, speech.text),
    `Speech generation for ${speech.asset}`,
  )
  const audioUrl = body.output?.audio?.url
  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new Error(`Speech generation for ${speech.asset} contained no audio URL`)
  }

  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(
      `Downloading ${speech.asset} failed: HTTP ${audioResponse.status}`,
    )
  }
  const outputPath = resolve(root, 'public', speech.asset.replace(/^\//, ''))
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, Buffer.from(await audioResponse.arrayBuffer()))
  console.log(`Generated ${speech.asset}`)
}

async function getExistingAssets(speech) {
  const results = await Promise.all(
    speech.map(async (item) => {
      const outputPath = resolve(root, 'public', item.asset.replace(/^\//, ''))

      try {
        await access(outputPath)
        return item.asset
      } catch {
        return undefined
      }
    }),
  )

  return new Set(results.filter((asset) => asset !== undefined))
}

async function main() {
  const manifest = (await Promise.all(
    manifestPaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
  )).flat()
  const missingSpeech = getMissingSpeech(
    manifest,
    await getExistingAssets(manifest),
  )

  if (missingSpeech.length === 0) {
    console.log('All speech assets already exist; nothing to generate')
    return
  }

  console.log('Cloning voice with Bailian')
  const voice = await cloneVoice()
  console.log(`Voice cloned as ${voice}`)

  for (const speech of missingSpeech) {
    await synthesizeSpeech(speech, voice)
  }
}

await main()
