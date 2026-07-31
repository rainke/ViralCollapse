import Phaser from 'phaser'
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

const SAVE_KEY = 'viral-collapse-save'

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing required element: ${selector}`)
  return found
}

class SoundSynth {
  private context?: AudioContext
  private speech?: HTMLAudioElement
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
    this.speech = new Audio(asset)
    void this.speech.play().catch(() => {})
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.speech?.pause()
  }
}

const sound = new SoundSynth()
let save: GameSave = deserializeSave(localStorage.getItem(SAVE_KEY))
sound.muted = save.muted

const home = element<HTMLElement>('#home-screen')
const startButton = element<HTMLButtonElement>('#start-button')
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

window.addEventListener('viral:ready', () => {
  gameReady = true
  startButton.disabled = false
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
  { character: '手', reading: 'shou', options: ['手', '口', '目'] },
  { character: '心', reading: 'xin', options: ['火', '心', '木'] },
  { character: '水', reading: 'shui', options: ['山', '田', '水'] },
]

function showRevive(detail: {
  restart?: boolean
  challenge: RevivalChallenge
}): void {
  destroyRevivalChallenge?.()
  const challengeId = detail.challenge.id
  const word = revivalWords[
    (scene().getWorldLevel() + detail.challenge.id.length) % revivalWords.length
  ]
  let active = true
  let stream: MediaStream | undefined
  let recognition: { stop: () => void } | undefined
  destroyRevivalChallenge = () => {
    active = false
    recognition?.stop()
    stream?.getTracks().forEach((track) => track.stop())
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
  const showChoice = () => {
    modalTitle.textContent = '选出正确的汉字'
    modalBody.textContent = `请找到“${word.character}”字，答错可以再试。`
    const choices = word.options.map((option) =>
      button(option, 'challenge-button', () => {
        if (option === word.character) succeed()
        else retry('还差一点，再选一次吧！')
      }),
    )
    modalActions.replaceChildren(...choices, status)
  }
  modalIcon.textContent = '💙'
  modalKicker.textContent = detail.restart ? '完成任务后重试' : '完成任务后复活'
  if (detail.challenge.type === 'choice') {
    showChoice()
  } else if (detail.challenge.type === 'writing') {
    modalTitle.textContent = '写出看到的汉字'
    modalBody.textContent = `请输入这个字：${word.character}（可以重复尝试）`
    const input = document.createElement('input')
    input.className = 'challenge-input'
    input.setAttribute('aria-label', '写汉字')
    input.autocomplete = 'off'
    const submit = button('检查答案', 'primary-button', () => {
      if (input.value.trim() === word.character) succeed()
      else retry('再看仔细一点，可以重新写。')
    })
    modalActions.replaceChildren(input, submit, status)
  } else {
    modalTitle.textContent = '读出这个汉字'
    modalBody.textContent = `请读出：${word.character}（可以重复尝试）`
    const SpeechRecognition = (window as Window & {
      SpeechRecognition?: new () => {
        lang: string
        start: () => void
        stop: () => void
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void
        onerror: () => void
      }
      webkitSpeechRecognition?: new () => {
        lang: string
        start: () => void
        stop: () => void
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void
        onerror: () => void
      }
    }).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      retry('麦克风不可用，已切换到选择题。')
      showChoice()
    } else {
      const listen = button('开始朗读', 'primary-button', async () => {
        try {
          stream ??= await navigator.mediaDevices.getUserMedia({ audio: true })
          if (!active) return
          const speech = new SpeechRecognition()
          recognition = speech
          speech.lang = 'zh-CN'
          speech.onresult = (event: {
            results: ArrayLike<{ 0: { transcript: string } }>
          }) => {
            const transcript = event.results[0][0].transcript
            if (transcript.includes(word.character) || transcript.toLowerCase().includes(word.reading)) succeed()
            else retry('没有听清，可以再读一次。')
          }
          speech.onerror = () => retry('没有听清，可以再读一次。')
          speech.start()
        } catch {
          showChoice()
          retry('麦克风不可用，已切换到选择题。')
        }
      })
      modalActions.replaceChildren(listen, status)
    }
  }
  showModal()
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
  if (destroyRevivalChallenge) {
    hideModal()
    scene().cancelRevivalChallenge()
    return
  }
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
