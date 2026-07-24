export type UpgradeId = 'rapid' | 'spread' | 'shield'

export interface GameState {
  hearts: number
  maxHearts: number
  score: number
  cleaned: number
  level: number
  invulnerableUntil: number
  upgrades: Record<UpgradeId, number>
}

export interface GameSave {
  version: 1
  muted: boolean
  bestScore: number
  bestStars: number
}

const DEFAULT_SAVE: GameSave = {
  version: 1,
  muted: false,
  bestScore: 0,
  bestStars: 0,
}

const UPGRADE_CAPS: Record<UpgradeId, number> = {
  rapid: 3,
  spread: 2,
  shield: 2,
}

export function createGameState(): GameState {
  return {
    hearts: 3,
    maxHearts: 3,
    score: 0,
    cleaned: 0,
    level: 1,
    invulnerableUntil: 0,
    upgrades: {
      rapid: 0,
      spread: 0,
      shield: 0,
    },
  }
}

export function applyDamage(state: GameState, now: number): GameState {
  if (now < state.invulnerableUntil || state.hearts === 0) {
    return state
  }

  return {
    ...state,
    hearts: Math.max(0, state.hearts - 1),
    invulnerableUntil: now + 1_200,
  }
}

export function recordVirusCleaned(
  state: GameState,
  points: number,
): GameState {
  return {
    ...state,
    cleaned: state.cleaned + 1,
    score: state.score + Math.max(0, points),
  }
}

export function revivePlayer(state: GameState, now: number): GameState {
  return {
    ...state,
    hearts: state.maxHearts,
    invulnerableUntil: now + 2_500,
  }
}

export function applyUpgrade(
  state: GameState,
  upgrade: UpgradeId,
): GameState {
  const nextLevel = Math.min(
    UPGRADE_CAPS[upgrade],
    state.upgrades[upgrade] + 1,
  )

  return {
    ...state,
    hearts:
      upgrade === 'shield'
        ? Math.min(state.maxHearts, state.hearts + 1)
        : state.hearts,
    upgrades: {
      ...state.upgrades,
      [upgrade]: nextLevel,
    },
  }
}

export function serializeSave(save: GameSave): string {
  return JSON.stringify(save)
}

export function deserializeSave(raw: string | null): GameSave {
  if (!raw) return { ...DEFAULT_SAVE }

  try {
    const parsed = JSON.parse(raw) as Partial<GameSave>
    if (parsed.version !== 1) return { ...DEFAULT_SAVE }

    return {
      version: 1,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : false,
      bestScore:
        typeof parsed.bestScore === 'number' && parsed.bestScore >= 0
          ? Math.floor(parsed.bestScore)
          : 0,
      bestStars:
        typeof parsed.bestStars === 'number'
          ? Math.min(3, Math.max(0, Math.floor(parsed.bestStars)))
          : 0,
    }
  } catch {
    return { ...DEFAULT_SAVE }
  }
}
