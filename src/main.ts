import Phaser from 'phaser'
import packageMetadata from '../package.json'
import './styles.css'
import { GameScene } from './game/GameScene'
import {
  createGameState,
  deserializeSave,
  serializeSave,
  type GameSave,
  type RevivalChallenge,
  type RunSave,
  type UpgradeId,
} from './game/model'
import { getFactSpeech } from './game/speech'
import {
  HandwritingQuiz,
  createHandwritingTask,
  handwritingCharacters,
  hanziWriterAdapter,
  type HandwritingTask,
  type QuizCallbacks,
} from './game/revival/handwriting'
import {
  checkQuizAnswer,
  selectQuizQuestion,
  type QuizQuestion,
} from './game/revival/quiz'
import { SherpaWasmRecognizer } from './game/revival/speech/SherpaWasmRecognizer'
import { RevivalSpeechSession } from './game/revival/speech/RevivalSpeechSession'
import { SPEECH_TARGETS } from './game/revival/speech/policy'

const SAVE_KEY = 'viral-collapse-save'

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing required element: ${selector}`)
  return found
}

class SoundSynth {
  private context?: AudioContext
  private speech?: HTMLAudioElement
  private utterance?: SpeechSynthesisUtterance
  muted = false

  unlock(): void {
    this.context ??= new AudioContext()
    void this.context.resume()
  }

  play(kind: string, quiet = false): void {
    if (this.muted) return
    this.unlock()
    if (!this.context) return
    if (kind === 'death') {
      this.playDeath()
      return
    }

    const presets: Record<string, [number, number, number]> = {
      start: [440, 700, 0.24],
      pop: [680, 860, 0.04],
      clean: [520, 960, 0.1],
      hit: [180, 95, 0.18],
      power: [480, 1_020, 0.28],
      level: [440, 880, 0.38],
      boss: [160, 120, 0.08],
      win: [520, 1_100, 0.7],
    }
    const [from, to, duration] = presets[kind] ?? presets.pop
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type =
      kind === 'hit' || kind === 'boss' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(from, this.context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, to),
      this.context.currentTime + duration,
    )
    gain.gain.setValueAtTime(quiet ? 0.012 : 0.045, this.context.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + duration,
    )
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start()
    oscillator.stop(this.context.currentTime + duration)
  }

  private playDeath(): void {
    if (!this.context) return
    const now = this.context.currentTime
    const voices: Array<
      [number, number, number, number, number, OscillatorType]
    > = [
      [260, 70, 0.88, 0, 0.05, 'triangle'],
      [110, 42, 0.7, 0.12, 0.026, 'sawtooth'],
      [740, 180, 0.46, 0.32, 0.022, 'sine'],
    ]

    for (const [from, to, duration, delay, volume, type] of voices) {
      const start = now + delay
      const stop = start + duration
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(from, start)
      oscillator.frequency.exponentialRampToValueAtTime(to, stop)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.0001, stop)
      oscillator.connect(gain).connect(this.context.destination)
      oscillator.start(start)
      oscillator.stop(stop)
    }
  }

  playSpeech(asset: string): void {
    if (this.muted) return
    this.speech?.pause()
    window.speechSynthesis?.cancel()
    this.utterance = undefined
    this.speech = new Audio(asset)
    void this.speech.play().catch(() => {})
  }

  speakText(text: string): void {
    if (
      this.muted ||
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) return
    this.speech?.pause()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.88
    utterance.pitch = 1.08
    utterance.onend = () => {
      if (this.utterance === utterance) this.utterance = undefined
    }
    this.utterance = utterance
    window.speechSynthesis.speak(utterance)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (!muted) return
    this.speech?.pause()
    window.speechSynthesis?.cancel()
    this.utterance = undefined
  }
}

const sound = new SoundSynth()
element('#game-version').textContent = `v${packageMetadata.version}`
let save: GameSave = deserializeSave(localStorage.getItem(SAVE_KEY))
sound.muted = save.muted

const home = element<HTMLElement>('#home-screen')
const startButton = element<HTMLButtonElement>('#start-button')
const homeRestartButton = element<HTMLButtonElement>('#home-restart-button')
const hud = element<HTMLElement>('#hud')
const tutorial = element<HTMLElement>('#tutorial')
const toast = element<HTMLElement>('#toast')
const modal = element<HTMLElement>('#modal')
const pausePanel = element<HTMLElement>('#pause-panel')
const modalIcon = element<HTMLElement>('#modal-icon')
const modalKicker = element<HTMLElement>('#modal-kicker')
const modalTitle = element<HTMLElement>('#modal-title')
const modalBody = element<HTMLElement>('#modal-body')
const modalActions = element<HTMLElement>('#modal-actions')
let gameReady = false
let destroyRevivalChallenge: (() => void) | undefined
const handwritingQuiz = new HandwritingQuiz(
  window.__viralHandwritingAdapter ?? hanziWriterAdapter,
)
let previousReviveQuestionId: string | undefined

window.addEventListener('viral:ready', () => {
  gameReady = true
  startButton.disabled = false
  homeRestartButton.disabled = false
})

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  width: 390,
  height: 844,
  parent: 'game-canvas',
  transparent: false,
  backgroundColor: '#21194f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
})

if (import.meta.env.DEV) {
  Object.assign(window, { __viralGame: game })
}

function scene(): GameScene {
  return game.scene.getScene('game') as GameScene
}

function updateSoundLabels(): void {
  const label = sound.muted ? '🔇 声音关' : '🔊 声音开'
  element<HTMLButtonElement>('#home-sound').textContent = label
  element<HTMLButtonElement>('#pause-sound').textContent = label
}

function persistSave(patch: Partial<GameSave>): void {
  save = { ...save, ...patch }
  localStorage.setItem(SAVE_KEY, serializeSave(save))
  const bestScore = Math.max(
    0,
    ...Object.values(save.chapters).map((record) => record.bestScore),
  )
  element('#best-score').textContent = `最高分 ${bestScore}`
  updateStartLabel()
}

function nextWorldLevel(): number {
  if (save.run) return save.run.worldLevel
  return Math.min(100, save.highestCompletedLevel + 1)
}

function updateStartLabel(): void {
  const level = nextWorldLevel()
  startButton.textContent =
    level === 1 ? '开始第一章' : `继续第 ${level} 关`
  homeRestartButton.hidden = level === 1
}

function createRun(worldLevel: number): RunSave {
  const state = createGameState(
    worldLevel,
    crypto.getRandomValues(new Uint32Array(1))[0],
  )
  return {
    chapter: Math.floor((worldLevel - 1) / 10) + 1,
    worldLevel,
    health: state.health,
    maxHealth: state.maxHealth,
    battleLevel: state.battleLevel,
    upgrades: state.upgrades,
    score: 0,
    deaths: 0,
    runSeed: state.runSeed,
  }
}

function setMuted(muted: boolean): void {
  sound.setMuted(muted)
  persistSave({ muted })
  updateSoundLabels()
}

function showToast(message: string, duration = 1_700): void {
  toast.textContent = message
  toast.classList.remove('is-hidden')
  window.setTimeout(() => toast.classList.add('is-hidden'), duration)
}

function hideModal(): void {
  destroyRevivalChallenge?.()
  destroyRevivalChallenge = undefined
  handwritingQuiz.destroy()
  modal.classList.add('is-hidden')
  modal.classList.remove('is-entering')
  modalActions.replaceChildren()
}

function showModal(): void {
  modal.classList.add('is-entering')
  modal.classList.remove('is-hidden')
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => modal.classList.remove('is-entering'))
  })
}

function button(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const item = document.createElement('button')
  item.type = 'button'
  item.className = className
  item.textContent = label
  item.addEventListener('click', onClick)
  return item
}

const upgrades: Record<UpgradeId, {
  id: UpgradeId
  icon: string
  title: string
  caption: string
}> = {
  damage: { id: 'damage', icon: '💥', title: '抗体强化', caption: '伤害 +18%' },
  rapid: { id: 'rapid', icon: '⚡', title: '快速抗体', caption: '发射更快' },
  spread: { id: 'spread', icon: '🔱', title: '扩散抗体', caption: '更多泡泡' },
  health: { id: 'health', icon: '💙', title: '生命成长', caption: '上限 +15%' },
  critical: { id: 'critical', icon: '🎯', title: '精准暴击', caption: '暴击 +10%' },
  guard: { id: 'guard', icon: '🛡️', title: '坚固护盾', caption: '伤害 -8%' },
  split: { id: 'split', icon: '✨', title: '抗体分裂', caption: '命中产生更多子抗体' },
  pierce: { id: 'pierce', icon: '🧬', title: '抗体穿透', caption: '穿透更多病毒' },
}

function createUpgradeGrid(options: UpgradeId[]): HTMLElement {
  const grid = document.createElement('div')
  grid.className = 'upgrade-grid'
  for (const upgradeId of options) {
    const upgrade = upgrades[upgradeId]
    const item = button('', 'upgrade-button', () => {
      hideModal()
      scene().chooseUpgrade(upgrade.id)
    })
    item.innerHTML = `<span>${upgrade.icon}</span>${upgrade.title}<small>${upgrade.caption}</small>`
    grid.append(item)
  }
  return grid
}

function speak(level: number): void {
  const speech = getFactSpeech(level)
  if (speech) sound.playSpeech(speech.asset)
}

function showLevelComplete(detail: {
  level: number
  fact: { emoji: string; title: string; body: string }
  bossNext: boolean
  options: UpgradeId[]
}): void {
  modalIcon.textContent = detail.fact.emoji
  modalKicker.textContent = `第 ${detail.level} 关完成 · 小知识`
  modalTitle.textContent = detail.fact.title
  modalBody.textContent = detail.fact.body
  modalActions.replaceChildren()

  const speakButton = button('🔊 听一听', 'speak-button', () =>
    speak(detail.level),
  )
  modalActions.append(speakButton, createUpgradeGrid(detail.options))
  showModal()
  if (detail.bossNext) showToast('选一个升级，然后挑战病毒王！', 2_400)
}

function showSkillFragment(detail: { options: UpgradeId[] }): void {
  modalIcon.textContent = '💎'
  modalKicker.textContent = '稀有掉落'
  modalTitle.textContent = '捡到技能碎片！'
  modalBody.textContent = '选择一项技能，立刻强化小卫士。'
  modalActions.replaceChildren(createUpgradeGrid(detail.options))
  showModal()
}

const revivalWords = [
  { character: '手', reading: 'shou' },
  { character: '心', reading: 'xin' },
  { character: '水', reading: 'shui' },
]

function showRevive(detail: {
  restart?: boolean
  challenge: RevivalChallenge
}): void {
  destroyRevivalChallenge?.()
  handwritingQuiz.destroy()
  const challengeId = detail.challenge.id
  const word = revivalWords[
    (scene().getWorldLevel() + detail.challenge.id.length) % revivalWords.length
  ]
  let active = true
  let speechSession: RevivalSpeechSession | undefined
  destroyRevivalChallenge = () => {
    active = false
    handwritingQuiz.destroy()
    void speechSession?.dispose()
    speechSession = undefined
  }
  const succeed = () => {
    if (!active || !scene().completeRevivalChallenge(challengeId, true)) return
    if (!scene().revive(challengeId)) return
    hideModal()
  }
  const status = document.createElement('p')
  status.className = 'challenge-status'
  status.setAttribute('aria-live', 'polite')
  const retry = (message: string) => {
    status.textContent = message
  }
  const showHealthQuiz = () => {
    modalTitle.textContent = '健康知识小问答'
    const worldLevel = save.run?.worldLevel ?? nextWorldLevel()
    const question = selectQuizQuestion(worldLevel, previousReviveQuestionId)
    if (!question) {
      modalBody.textContent = '暂时没有适合本关的题目，可以安全继续。'
      modalActions.replaceChildren(
        button('继续挑战', 'primary-button', succeed),
      )
      return
    }
    previousReviveQuestionId = question.id
    renderReviveQuestion(question, succeed)
  }
  modalIcon.textContent = '💙'
  modalKicker.textContent = detail.restart ? '完成任务后重试' : '完成任务后复活'
  if (detail.challenge.type === 'choice') {
    showHealthQuiz()
  } else if (detail.challenge.type === 'writing') {
    modalTitle.textContent = '写出看到的汉字'
    modalBody.textContent = '按照笔顺写完目标字，才能为小卫士充满能量。'
    const task = {
      ...createHandwritingTask(),
      character: word.character,
    }
    showHandwritingTask(task, succeed)
  } else {
    modalTitle.textContent = '读出这个汉字'
    const target = SPEECH_TARGETS.find(
      (item) => item.character === word.character,
    )
    modalBody.textContent = `请读出：${word.character}。麦克风只用于本机离线识别，音频不会上传；点开始后才会请求权限。`
    const fallback = button('改做选择题', 'secondary-button', () => {
      void speechSession?.dispose()
      speechSession = undefined
      showHealthQuiz()
    })
    const listen = button('开始离线语音', 'primary-button', () => {
      if (
        !target ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof Worker === 'undefined'
      ) {
        showHealthQuiz()
        return
      }
      listen.disabled = true
      speechSession = new RevivalSpeechSession(
        new SherpaWasmRecognizer(),
        target,
        (state) => {
          const labels = {
            idle: '准备好后开始语音任务', loading: '正在下载并初始化离线模型…',
            listening: '正在听…', success: '念对啦！正在复活…', incorrect: '没有念对，请重试。',
            timeout: '等待超时，请重试。', silent: '没有听到声音，请重试。',
            'low-confidence': '听得不够清楚，请重试。', error: '语音不可用，请改做选择题。',
            disposed: '语音任务已结束。',
          }
          retry(labels[state])
          if (state === 'success') succeed()
          if (['incorrect', 'timeout', 'silent', 'low-confidence', 'error'].includes(state)) {
            listen.disabled = false
            listen.textContent = '重试语音'
          }
        },
        8_000,
        ({ loaded, total, phase }) => {
          const percent = total === 0 ? 0 : Math.round((loaded / total) * 100)
          retry(phase === 'downloading'
            ? `正在下载离线模型… ${percent}%`
            : `正在初始化离线模型… ${percent}%`)
        },
      )
      void speechSession.start().catch(() => {
        retry('权限被拒绝或模型加载失败，请改做选择题。')
        listen.disabled = false
      })
    })
    modalActions.replaceChildren(listen, fallback, status)
  }
  showModal()
}

function renderReviveQuestion(
  question: QuizQuestion,
  onComplete: () => void,
): void {
  const optionMarkers = ['A', 'B', 'C', 'D']
  const narration = [
    `请听题。${question.prompt}`,
    ...question.options.map(
      (option, index) => `${optionMarkers[index]}，${option.label}`,
    ),
  ].join('。') + '。'
  modalBody.textContent = question.prompt
  const group = document.createElement('fieldset')
  group.className = 'quiz-options'
  const legend = document.createElement('legend')
  legend.className = 'visually-hidden'
  legend.textContent = '选择一个答案'
  group.append(legend)

  const feedback = document.createElement('p')
  feedback.className = 'quiz-feedback'
  feedback.setAttribute('aria-live', 'polite')

  const optionButtons = question.options.map((option, index) => {
    const optionButton = button('', 'quiz-option', () => {
      if (group.disabled) return
      group.disabled = true
      const result = checkQuizAnswer(question, option.id)
      optionButton.classList.add(result.correct ? 'is-correct' : 'is-wrong')
      feedback.classList.add(result.correct ? 'is-correct' : 'is-wrong')
      if (result.correct) {
        feedback.textContent = '答对啦！复活能量已充满。'
        sound.speakText('太棒了，答对啦！')
        window.setTimeout(onComplete, 450)
        return
      }

      feedback.textContent = `再想一想：${result.explanation}`
      sound.speakText('没关系，再想一想，你一定可以的。')
      const retryButton = button(
        '再试一次',
        'secondary-button quiz-retry',
        () => {
          feedback.textContent = ''
          feedback.className = 'quiz-feedback'
          optionButtons.forEach((item) => item.classList.remove('is-wrong'))
          group.disabled = false
          optionButtons[0]?.focus()
          retryButton.remove()
          changeButton.remove()
        },
      )
      const changeButton = button(
        '换一道题',
        'text-button quiz-change',
        () => {
          const next = selectQuizQuestion(
            save.run?.worldLevel ?? nextWorldLevel(),
            question.id,
          )
          if (next) {
            previousReviveQuestionId = next.id
            renderReviveQuestion(next, onComplete)
          }
        },
      )
      modalActions.append(retryButton, changeButton)
    })
    const marker = document.createElement('span')
    marker.className = 'quiz-option-marker'
    marker.setAttribute('aria-hidden', 'true')
    marker.textContent = optionMarkers[index]
    const label = document.createElement('span')
    label.className = 'quiz-option-label'
    label.textContent = option.label
    optionButton.append(marker, label)
    optionButton.setAttribute(
      'aria-label',
      `${optionMarkers[index]}，${option.label}`,
    )
    optionButton.dataset.optionId = option.id
    group.append(optionButton)
    return optionButton
  })

  modalActions.replaceChildren(group, feedback)
  sound.speakText(narration)
}

function showChoiceFallback(
  task: HandwritingTask,
  onComplete: () => void,
): void {
  handwritingQuiz.destroy()
  modalBody.textContent = '写字数据暂时没有到达，请选出刚才的目标字。'
  const status = document.createElement('p')
  status.className = 'handwriting-status'
  status.setAttribute('role', 'status')
  status.textContent = '请选择正确的字。'
  const choices = [
    task.character,
    ...handwritingCharacters.filter((character) => character !== task.character).slice(0, 2),
  ]
  const choiceGrid = document.createElement('div')
  choiceGrid.className = 'handwriting-choices'
  for (const character of choices) {
    choiceGrid.append(button(character, 'secondary-button', () => {
      if (character === task.character) {
        onComplete()
      } else {
        status.textContent = '再看一看目标字，然后重新选择吧。'
      }
    }))
  }
  modalActions.replaceChildren(status, choiceGrid)
}

function showHandwritingTask(
  task: HandwritingTask,
  onComplete: () => void,
): void {
  const prompt = document.createElement('p')
  prompt.className = 'handwriting-prompt'
  prompt.innerHTML = `目标字：<strong>${task.character}</strong>`
  const canvas = document.createElement('div')
  canvas.className = 'handwriting-canvas'
  canvas.dataset.instanceId = task.instanceId
  canvas.setAttribute('aria-label', `书写汉字${task.character}`)
  const status = document.createElement('p')
  status.className = 'handwriting-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.textContent = '请从第一笔开始，完整写完这个字。'
  let failed = false
  const callbacks: QuizCallbacks = {
    onComplete,
    onMistake: () => {
      canvas.classList.remove('has-mistake')
      void canvas.offsetWidth
      canvas.classList.add('has-mistake')
      status.textContent = '这一笔差一点，再试一次吧！提示不会代替你写完。'
    },
    onLoadError: () => {
      if (failed) return
      failed = true
      showChoiceFallback(task, onComplete)
    },
  }
  const resetButton = button('重新书写', 'secondary-button handwriting-reset', () => {
    status.textContent = '已清空，请重新完整写一遍。'
    canvas.classList.remove('has-mistake')
    canvas.replaceChildren()
    handwritingQuiz.reset(canvas, task, callbacks)
  })
  modalActions.replaceChildren(prompt, canvas, resetButton, status)
  handwritingQuiz.start(canvas, task, callbacks)
}

function showVictory(detail: {
  score: number
  stars: number
  cleaned: number
  chapter: number
  completedLevel: number
}): void {
  const previous = save.chapters[detail.chapter]
  persistSave({
    highestCompletedLevel: Math.max(
      save.highestCompletedLevel,
      detail.completedLevel,
    ),
    chapters: {
      ...save.chapters,
      [detail.chapter]: {
        bestScore: Math.max(previous?.bestScore ?? 0, detail.score),
        bestStars: Math.max(previous?.bestStars ?? 0, detail.stars),
      },
    },
    run: undefined,
  })
  modalIcon.textContent = '🏆'
  modalKicker.textContent = `第 ${detail.chapter} 章完成`
  modalTitle.textContent =
    detail.completedLevel >= 100 ? '百关全部净化！' : '身体恢复活力！'
  modalBody.innerHTML = `${'⭐'.repeat(detail.stars)}<br>获得 ${detail.score} 分`
  modalActions.replaceChildren(
    button(
      detail.completedLevel >= 100 ? '再玩第一章' : '开始下一章',
      'primary-button',
      () => {
        hideModal()
        const level =
          detail.completedLevel >= 100 ? 1 : detail.completedLevel + 1
        scene().begin(createRun(level))
      },
    ),
    button('回到首页', 'secondary-button', () => {
      hideModal()
      hud.classList.add('is-hidden')
      home.classList.remove('is-hidden')
    }),
  )
  showModal()
}

startButton.addEventListener('click', () => {
  if (!gameReady) return
  sound.unlock()
  home.classList.add('is-hidden')
  hud.classList.remove('is-hidden')
  tutorial.classList.remove('is-hidden')
  scene().begin(save.run ?? createRun(nextWorldLevel()))
  window.setTimeout(() => tutorial.classList.add('is-hidden'), 3_200)
})

homeRestartButton.addEventListener('click', () => {
  if (!gameReady) return
  const run = createRun(1)
  persistSave({ run })
  sound.unlock()
  home.classList.add('is-hidden')
  hud.classList.remove('is-hidden')
  tutorial.classList.remove('is-hidden')
  scene().begin(run)
  window.setTimeout(() => tutorial.classList.add('is-hidden'), 3_200)
})

element('#pause-button').addEventListener('click', () => {
  if (scene().togglePause(true)) pausePanel.classList.remove('is-hidden')
})

element('#resume-button').addEventListener('click', () => {
  pausePanel.classList.add('is-hidden')
  scene().togglePause(false)
})

element('#restart-button').addEventListener('click', () => {
  hideModal()
  scene().cancelRevivalChallenge()
  pausePanel.classList.add('is-hidden')
  const chapterStart =
    Math.floor((nextWorldLevel() - 1) / 10) * 10 + 1
  const run = createRun(chapterStart)
  persistSave({ run })
  scene().begin(run)
})

element('#home-sound').addEventListener('click', () => setMuted(!sound.muted))
element('#pause-sound').addEventListener('click', () => setMuted(!sound.muted))

window.addEventListener('blur', () => {
  if (destroyRevivalChallenge) return
  if (!home.classList.contains('is-hidden') || !modal.classList.contains('is-hidden')) {
    return
  }
  if (scene().togglePause(true)) pausePanel.classList.remove('is-hidden')
})

window.addEventListener('pagehide', () => {
  hideModal()
  scene().cancelRevivalChallenge()
})

window.addEventListener('viral:reviveCancelled', ((event: CustomEvent) => {
  if (destroyRevivalChallenge && event.detail.id) hideModal()
}) as EventListener)

window.addEventListener('viral:hud', ((event: CustomEvent) => {
  const detail = event.detail as {
    health: number
    maxHealth: number
    score: number
    level: number
    battleLevel: number
    levelName: string
    progress: number
    damage: number
    boss?: boolean
  }
  element('#health-value').textContent =
    `${detail.health}/${detail.maxHealth}`
  element<HTMLElement>('#health-fill').style.width =
    `${Math.round((detail.health / detail.maxHealth) * 100)}%`
  element('#score').textContent = String(detail.score)
  element('#stage-number').textContent = detail.boss
    ? `第 ${detail.level} 关 · BOSS`
    : `第 ${detail.level} 关`
  element('#stage-name').textContent = detail.levelName
  element<HTMLElement>('#progress-fill').style.width =
    `${Math.round(detail.progress * 100)}%`
  element('#power-label').textContent =
    `战斗 Lv.${detail.battleLevel} · 攻击 ${detail.damage}`
}) as EventListener)

window.addEventListener('viral:levelComplete', ((event: CustomEvent) =>
  showLevelComplete(event.detail)) as EventListener)
window.addEventListener('viral:skillFragment', ((event: CustomEvent) =>
  showSkillFragment(event.detail)) as EventListener)
window.addEventListener('viral:revive', ((event: CustomEvent) =>
  showRevive(event.detail)) as EventListener)
window.addEventListener('viral:checkpoint', ((event: CustomEvent) =>
  persistSave({ run: event.detail })) as EventListener)
window.addEventListener('viral:victory', ((event: CustomEvent) =>
  showVictory(event.detail)) as EventListener)
window.addEventListener('viral:toast', ((event: CustomEvent) =>
  showToast(event.detail.message)) as EventListener)
window.addEventListener('viral:sound', ((event: CustomEvent) =>
  sound.play(event.detail.kind, event.detail.quiet)) as EventListener)

updateSoundLabels()
persistSave({})
