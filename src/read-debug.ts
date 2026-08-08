import { getReadingSpeech } from './game/revival/readingSpeech'
import { SherpaWasmRecognizer } from './game/revival/speech/SherpaWasmRecognizer'
import {
  RevivalSpeechSession,
  type SpeechSessionState,
} from './game/revival/speech/RevivalSpeechSession'
import type { RecognitionResult } from './game/revival/speech/OfflineRecognizer'
import {
  SPEECH_TARGETS,
  acceptsRecognition,
  normalizeRecognition,
  type SpeechTarget,
} from './game/revival/speech/policy'

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing required element: ${selector}`)
  return found
}

const charactersEl = element<HTMLDivElement>('#characters')
const targetInfoEl = element<HTMLParagraphElement>('#target-info')
const statusEl = element<HTMLParagraphElement>('#status')
const progressEl = element<HTMLDivElement>('#progress')
const progressFillEl = element<HTMLDivElement>('#progress-fill')
const progressLabelEl = element<HTMLSpanElement>('#progress-label')
const recordButton = element<HTMLButtonElement>('#record')
const instructionButton = element<HTMLButtonElement>('#instruction')
const clearButton = element<HTMLButtonElement>('#clear')
const logEl = element<HTMLOListElement>('#log')

const stateLabels: Record<SpeechSessionState, string> = {
  idle: '空闲，可以开始录音',
  loading: '正在加载离线模型…',
  listening: '正在听…请说出目标字',
  success: '✅ 识别成功，与目标字匹配',
  incorrect: '❌ 识别到了其他内容',
  timeout: '⏱️ 等待超时（识别到内容但未完成）',
  silent: '🔇 没有听到声音',
  'low-confidence': '⚠️ 识别置信度过低',
  error: '💥 语音识别出错',
  disposed: '已停止',
}

const finishedStates: readonly SpeechSessionState[] = [
  'success',
  'incorrect',
  'timeout',
  'silent',
  'low-confidence',
  'error',
  'disposed',
]

let target: SpeechTarget = SPEECH_TARGETS[0]
let session: RevivalSpeechSession | undefined

function setStatus(message: string, kind = ''): void {
  statusEl.textContent = message
  statusEl.dataset.kind = kind
}

function renderCharacters(): void {
  charactersEl.replaceChildren()
  for (const speechTarget of SPEECH_TARGETS) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'character-button'
    item.textContent = speechTarget.character
    item.setAttribute('aria-label', `目标字 ${speechTarget.character}`)
    item.addEventListener('click', () => selectTarget(speechTarget))
    charactersEl.append(item)
  }
  selectTarget(SPEECH_TARGETS[0])
}

function selectTarget(next: SpeechTarget): void {
  target = next
  for (const button of charactersEl.querySelectorAll<HTMLButtonElement>(
    '.character-button',
  )) {
    button.classList.toggle('is-selected', button.textContent === target.character)
  }
  targetInfoEl.innerHTML = ''
  targetInfoEl.append(
    document.createTextNode('目标：'),
    Object.assign(document.createElement('strong'), {
      textContent: target.character,
    }),
    document.createTextNode(
      `（拼音 ${target.pronunciations.join(' / ')}）`,
    ),
  )
  void stopSession()
  setStatus('空闲，可以开始录音')
}

async function stopSession(): Promise<void> {
  const current = session
  session = undefined
  await current?.dispose().catch(() => undefined)
}

function appendResult(result: RecognitionResult, currentTarget: SpeechTarget): void {
  const accepted = acceptsRecognition(result, currentTarget)
  const row = document.createElement('li')
  row.className = accepted ? 'is-accepted' : 'is-rejected'

  const text = document.createElement('strong')
  text.textContent = result.text.trim() || '（空）'
  row.append(text)

  const details = document.createElement('small')
  details.textContent = [
    `时间 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
    `置信度 ${result.confidence}`,
    `final ${result.final}`,
    `归一化后 ${normalizeRecognition(result.text) || '（空）'}`,
    `是否匹配 ${accepted ? '是 ✓' : '否 ✗'}`,
  ].join(' · ')
  row.append(details)
  logEl.append(row)
  row.scrollIntoView({ block: 'nearest' })
}

async function startListening(): Promise<void> {
  await stopSession()
  recordButton.disabled = true
  progressEl.classList.add('is-hidden')
  progressFillEl.style.width = '0%'
  progressLabelEl.textContent = ''
  const currentTarget = target
  session = new RevivalSpeechSession(
    new SherpaWasmRecognizer(),
    currentTarget,
    (state) => {
      setStatus(stateLabels[state], state)
      if (finishedStates.includes(state)) recordButton.disabled = false
    },
    8_000,
    ({ loaded, total, phase }) => {
      progressEl.classList.remove('is-hidden')
      const percent = total === 0 ? 0 : Math.round((loaded / total) * 100)
      progressFillEl.style.width = `${percent}%`
      progressLabelEl.textContent =
        phase === 'downloading' ? `下载模型 ${percent}%` : `初始化模型 ${percent}%`
    },
    (result) => appendResult(result, currentTarget),
  )
  try {
    await session.start()
  } catch {
    setStatus('麦克风权限被拒绝或模型加载失败', 'error')
    recordButton.disabled = false
  }
}

recordButton.addEventListener('click', () => void startListening())
instructionButton.addEventListener('click', () => {
  const audio = new Audio(getReadingSpeech().asset)
  void audio.play().catch(() => setStatus('提示音播放失败，请检查音频资源', 'error'))
})
clearButton.addEventListener('click', () => logEl.replaceChildren())

renderCharacters()
