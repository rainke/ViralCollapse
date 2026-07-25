import Phaser from 'phaser'
import './styles.css'
import { GameScene } from './game/GameScene'
import {
  deserializeSave,
  serializeSave,
  type GameSave,
  type UpgradeId,
} from './game/model'

const SAVE_KEY = 'viral-collapse-save'

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing required element: ${selector}`)
  return found
}

class SoundSynth {
  private context?: AudioContext
  muted = false

  unlock(): void {
    this.context ??= new AudioContext()
    void this.context.resume()
  }

  play(kind: string, quiet = false): void {
    if (this.muted) return
    this.unlock()
    if (!this.context) return

    const presets: Record<string, [number, number, number]> = {
      start: [440, 700, 0.24],
      pop: [680, 860, 0.04],
      clean: [520, 960, 0.1],
      hit: [180, 95, 0.18],
      death: [220, 60, 0.48],
      power: [480, 1_020, 0.28],
      level: [440, 880, 0.38],
      boss: [160, 120, 0.08],
      win: [520, 1_100, 0.7],
    }
    const [from, to, duration] = presets[kind] ?? presets.pop
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type =
      kind === 'hit' || kind === 'death' || kind === 'boss'
        ? 'triangle'
        : 'sine'
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
  element('#best-score').textContent = `最高分 ${save.bestScore}`
}

function setMuted(muted: boolean): void {
  sound.muted = muted
  persistSave({ muted })
  updateSoundLabels()
}

function showToast(message: string, duration = 1_700): void {
  toast.textContent = message
  toast.classList.remove('is-hidden')
  window.setTimeout(() => toast.classList.add('is-hidden'), duration)
}

function hideModal(): void {
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

function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

function showLevelComplete(detail: {
  level: number
  fact: { emoji: string; title: string; body: string }
  bossNext: boolean
}): void {
  modalIcon.textContent = detail.fact.emoji
  modalKicker.textContent = `第 ${detail.level} 关完成 · 小知识`
  modalTitle.textContent = detail.fact.title
  modalBody.textContent = detail.fact.body
  modalActions.replaceChildren()

  const speakButton = button('🔊 听一听', 'speak-button', () =>
    speak(`${detail.fact.title}。${detail.fact.body}`),
  )
  const grid = document.createElement('div')
  grid.className = 'upgrade-grid'
  const upgrades: Array<{
    id: UpgradeId
    icon: string
    title: string
    caption: string
  }> = [
    { id: 'rapid', icon: '⚡', title: '快速抗体', caption: '发射更快' },
    { id: 'spread', icon: '🔱', title: '扩散抗体', caption: '更多泡泡' },
    { id: 'shield', icon: '💙', title: '能量护盾', caption: '恢复爱心' },
  ]

  for (const upgrade of upgrades) {
    const item = button('', 'upgrade-button', () => {
      hideModal()
      scene().chooseUpgrade(upgrade.id)
    })
    item.innerHTML = `<span>${upgrade.icon}</span>${upgrade.title}<small>${upgrade.caption}</small>`
    grid.append(item)
  }
  modalActions.append(speakButton, grid)
  showModal()
  if (detail.bossNext) showToast('选一个升级，然后挑战病毒王！', 2_400)
}

function showRevive(): void {
  modalIcon.textContent = '💙'
  modalKicker.textContent = '别担心'
  modalTitle.textContent = '小卫士充好电啦'
  modalBody.textContent = '休息一下，再勇敢地继续出发！'
  modalActions.replaceChildren(
    button('能量满满，继续！', 'primary-button', () => {
      hideModal()
      scene().revive()
    }),
  )
  showModal()
}

function showVictory(detail: {
  score: number
  stars: number
  cleaned: number
}): void {
  const bestScore = Math.max(save.bestScore, detail.score)
  const bestStars = Math.max(save.bestStars, detail.stars)
  persistSave({ bestScore, bestStars })
  modalIcon.textContent = '🏆'
  modalKicker.textContent = '任务完成'
  modalTitle.textContent = '身体恢复活力！'
  modalBody.innerHTML = `${'⭐'.repeat(detail.stars)}<br>获得 ${detail.score} 分`
  modalActions.replaceChildren(
    button('再玩一次', 'primary-button', () => {
      hideModal()
      scene().begin()
    }),
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
  scene().begin()
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
  pausePanel.classList.add('is-hidden')
  scene().begin()
})

element('#home-sound').addEventListener('click', () => setMuted(!sound.muted))
element('#pause-sound').addEventListener('click', () => setMuted(!sound.muted))

window.addEventListener('blur', () => {
  if (!home.classList.contains('is-hidden') || !modal.classList.contains('is-hidden')) {
    return
  }
  if (scene().togglePause(true)) pausePanel.classList.remove('is-hidden')
})

window.addEventListener('viral:hud', ((event: CustomEvent) => {
  const detail = event.detail as {
    hearts: number
    maxHearts: number
    score: number
    level: number
    levelName: string
    progress: number
    weaponLevel: number
    boss?: boolean
  }
  element('#hearts').textContent =
    '💙'.repeat(detail.hearts) + '🤍'.repeat(detail.maxHearts - detail.hearts)
  element('#score').textContent = String(detail.score)
  element('#stage-number').textContent = detail.boss
    ? '最终挑战'
    : `第 ${detail.level} 关`
  element('#stage-name').textContent = detail.levelName
  element<HTMLElement>('#progress-fill').style.width =
    `${Math.round(detail.progress * 100)}%`
  element('#power-label').textContent = `抗体 Lv.${detail.weaponLevel}`
}) as EventListener)

window.addEventListener('viral:levelComplete', ((event: CustomEvent) =>
  showLevelComplete(event.detail)) as EventListener)
window.addEventListener('viral:revive', showRevive)
window.addEventListener('viral:victory', ((event: CustomEvent) =>
  showVictory(event.detail)) as EventListener)
window.addEventListener('viral:toast', ((event: CustomEvent) =>
  showToast(event.detail.message)) as EventListener)
window.addEventListener('viral:sound', ((event: CustomEvent) =>
  sound.play(event.detail.kind, event.detail.quiet)) as EventListener)

updateSoundLabels()
persistSave({})
