import { getPlayerStats } from './balance'

export type RevivalChallengeType = 'choice' | 'writing'
export type RevivalChallengeStatus = 'pending' | 'completed' | 'consumed'

export interface RevivalChallenge {
  id: string
  type: RevivalChallengeType
  status: RevivalChallengeStatus
}

export function startRevivalChallenge(
  type: RevivalChallengeType,
  id: string,
): RevivalChallenge {
  return { id, type, status: 'pending' }
}

export function completeRevivalChallenge(
  challenge: RevivalChallenge,
  successful: boolean,
  consume = false,
): RevivalChallenge {
  if (challenge.status === 'consumed' || !successful) return challenge
  if (consume && challenge.status === 'completed') {
    return { ...challenge, status: 'consumed' }
  }
  return challenge.status === 'pending'
    ? { ...challenge, status: 'completed' }
    : challenge
}

export function canRevive(
  challenge: RevivalChallenge | undefined,
  instanceId: string,
): boolean {
  return challenge?.id === instanceId && challenge.status === 'completed'
}

export type UpgradeId =
  | 'damage'
  | 'rapid'
  | 'spread'
  | 'health'
  | 'critical'
  | 'guard'
  | 'split'
  | 'pierce'
  | 'blast'

export type UpgradeState = Record<UpgradeId, number>

export interface GameState {
  health: number
  maxHealth: number
  score: number
  cleaned: number
  worldLevel: number
  battleLevel: number
  invulnerableUntil: number
  upgrades: UpgradeState
  deaths: number
  reviveUsed: boolean
  levelStartScore: number
  runSeed: number
  pendingUpgrades?: UpgradeId[]
  rapidBoostUntil: number
  damageImmunityCharges: number
}

export interface ChapterRecord {
  bestScore: number
  bestStars: number
}

export interface RunSave {
  chapter: number
  worldLevel: number
  health: number
  maxHealth: number
  battleLevel: number
  upgrades: UpgradeState
  score: number
  deaths: number
  runSeed: number
  pendingUpgrades?: UpgradeId[]
}

export interface GameSave {
  version: 2
  muted: boolean
  highestCompletedLevel: number
  chapters: Record<number, ChapterRecord>
  run?: RunSave
}

const DEFAULT_SAVE: GameSave = {
  version: 2,
  muted: false,
  highestCompletedLevel: 0,
  chapters: {},
}

export const UPGRADE_CAPS: Record<UpgradeId, number> = {
  damage: 6,
  rapid: 6,
  spread: 3,
  health: 5,
  critical: 5,
  guard: 5,
  split: 4,
  pierce: 4,
  blast: 4,
}

const EMPTY_UPGRADES: UpgradeState = {
  damage: 0,
  rapid: 0,
  spread: 0,
  health: 0,
  critical: 0,
  guard: 0,
  split: 0,
  pierce: 0,
  blast: 0,
}

export function createGameState(
  worldLevel = 1,
  runSeed = 1,
): GameState {
  const player = getPlayerStats(worldLevel, EMPTY_UPGRADES)
  return {
    health: player.maxHealth,
    maxHealth: player.maxHealth,
    score: 0,
    cleaned: 0,
    worldLevel,
    battleLevel: ((worldLevel - 1) % 10) + 1,
    invulnerableUntil: 0,
    upgrades: { ...EMPTY_UPGRADES },
    deaths: 0,
    reviveUsed: false,
    levelStartScore: 0,
    runSeed,
    rapidBoostUntil: 0,
    damageImmunityCharges: 0,
  }
}

export function applyDamage(
  state: GameState,
  damage: number,
  now: number,
): GameState {
  if (now < state.invulnerableUntil || state.health === 0) {
    return state
  }
  if (state.damageImmunityCharges > 0) {
    return {
      ...state,
      damageImmunityCharges: state.damageImmunityCharges - 1,
      invulnerableUntil: now + 1_200,
    }
  }

  return {
    ...state,
    health: Math.max(
      0,
      state.health -
        Math.max(
          0,
          Math.round(damage * (1 - state.upgrades.guard * 0.08)),
        ),
    ),
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

export function shouldDropSkillFragment(randomValue: number): boolean {
  return randomValue < 0.05
}

export function revivePlayer(state: GameState, now: number): GameState {
  return {
    ...state,
    health: Math.round(state.maxHealth * 0.6),
    invulnerableUntil: now + 2_500,
    deaths: state.deaths + 1,
    reviveUsed: true,
  }
}

export function restartCurrentLevel(state: GameState): GameState {
  return {
    ...state,
    health: state.maxHealth,
    score: state.levelStartScore,
    cleaned: 0,
    invulnerableUntil: 0,
    deaths: state.deaths + 1,
    reviveUsed: false,
    rapidBoostUntil: 0,
    damageImmunityCharges: 0,
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

  const nextState = {
    ...state,
    upgrades: {
      ...state.upgrades,
      [upgrade]: nextLevel,
    },
  }
  if (upgrade !== 'health' || nextLevel === state.upgrades.health) {
    return nextState
  }

  const maxHealth = getPlayerStats(
    state.worldLevel,
    nextState.upgrades,
  ).maxHealth
  return {
    ...nextState,
    maxHealth,
    health: Math.min(
      maxHealth,
      state.health + Math.round(maxHealth * 0.25),
    ),
  }
}

export function getPlayerCombatStats(state: GameState): ReturnType<
  typeof getPlayerStats
> {
  return getPlayerStats(state.worldLevel, state.upgrades)
}

export function getFireInterval(state: GameState, now = 0): number {
  const upgradeInterval = Math.max(
    240,
    390 * 0.91 ** state.upgrades.rapid,
  )
  return now < state.rapidBoostUntil
    ? Math.max(240, upgradeInterval * 0.72)
    : upgradeInterval
}

export function getBulletPattern(
  state: GameState,
): Array<{ angle: number; damageMultiplier: number }> {
  if (state.upgrades.spread >= 3) {
    return [-24, -12, 0, 12, 24].map((angle) => ({
      angle,
      damageMultiplier: 0.5,
    }))
  }
  if (state.upgrades.spread === 1) {
    return [
      { angle: -9, damageMultiplier: 0.7 },
      { angle: 9, damageMultiplier: 0.7 },
    ]
  }
  if (state.upgrades.spread >= 2) {
    return [
      { angle: -16, damageMultiplier: 0.6 },
      { angle: 0, damageMultiplier: 0.6 },
      { angle: 16, damageMultiplier: 0.6 },
    ]
  }
  return [{ angle: 0, damageMultiplier: 1 }]
}

export function calculateBulletDamage(
  state: GameState,
  damageMultiplier: number,
  critical: boolean,
): number {
  const stats = getPlayerCombatStats(state)
  return Math.max(
    1,
    Math.round(
      stats.damage *
        damageMultiplier *
        (critical ? stats.criticalMultiplier : 1),
    ),
  )
}

export function getSplitProjectiles(
  state: GameState,
  parentDamage: number,
  random: () => number = Math.random,
): Array<{ angle: number; damage: number }> {
  const count = state.upgrades.split === 0
    ? 0
    : state.upgrades.split + 1
  return Array.from({ length: count }, () => ({
    angle: Math.round(random() * 360) % 360,
    damage: Math.max(1, Math.round(parentDamage * 0.5)),
  }))
}

export function getProjectilePierceCount(state: GameState): number {
  return state.upgrades.pierce
}

export function getVirusExplosionRadius(state: GameState): number {
  const level = state.upgrades.blast
  return level === 0 ? 0 : 60 + level * 25
}

function seededOrder(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items]
  const random = seededOrder(seed)
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function chooseUpgradeOptions(
  upgrades: UpgradeState,
  seed: number,
): UpgradeId[] {
  const available = (Object.keys(UPGRADE_CAPS) as UpgradeId[]).filter(
    (id) => upgrades[id] < UPGRADE_CAPS[id],
  )
  const offense = available.filter((id) =>
    [
      'damage',
      'rapid',
      'spread',
      'critical',
      'split',
      'pierce',
      'blast',
    ].includes(id),
  )
  const defense = available.filter((id) =>
    ['health', 'guard'].includes(id),
  )
  const options: UpgradeId[] = []
  if (offense.length > 0) options.push(shuffled(offense, seed)[0])
  if (defense.length > 0) options.push(shuffled(defense, seed + 1)[0])
  for (const id of shuffled(available, seed + 2)) {
    if (!options.includes(id)) options.push(id)
    if (options.length === 3) break
  }
  return options
}

export function advanceToLevel(
  state: GameState,
  worldLevel: number,
): GameState {
  const maxHealth = getPlayerStats(worldLevel, state.upgrades).maxHealth
  return {
    ...state,
    worldLevel,
    battleLevel: ((worldLevel - 1) % 10) + 1,
    maxHealth,
    health: Math.min(
      maxHealth,
      state.health + Math.round(maxHealth * 0.2),
    ),
    cleaned: 0,
    levelStartScore: state.score,
    reviveUsed: false,
    pendingUpgrades: undefined,
  }
}

export function healPlayer(state: GameState, ratio = 0.2): GameState {
  return {
    ...state,
    health: Math.min(
      state.maxHealth,
      state.health + Math.round(state.maxHealth * ratio),
    ),
  }
}

export function getChapterStars(deaths: number): number {
  if (deaths === 0) return 3
  return deaths <= 2 ? 2 : 1
}

export function serializeSave(save: GameSave): string {
  return JSON.stringify(save)
}

export function deserializeSave(raw: string | null): GameSave {
  if (!raw) return { ...DEFAULT_SAVE }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.version === 1) {
      const bestScore = safeInteger(parsed.bestScore)
      const bestStars = Math.min(3, safeInteger(parsed.bestStars))
      return {
        version: 2,
        muted: parsed.muted === true,
        highestCompletedLevel: 0,
        chapters:
          bestScore > 0 || bestStars > 0
            ? { 1: { bestScore, bestStars } }
            : {},
      }
    }
    if (parsed.version !== 2) return { ...DEFAULT_SAVE }

    return {
      version: 2,
      muted: parsed.muted === true,
      highestCompletedLevel: Math.min(
        100,
        safeInteger(parsed.highestCompletedLevel),
      ),
      chapters: sanitizeChapters(parsed.chapters),
      ...(isRunSave(parsed.run) ? { run: parsed.run } : {}),
    }
  } catch {
    return { ...DEFAULT_SAVE }
  }
}

function safeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0
}

function sanitizeChapters(value: unknown): Record<number, ChapterRecord> {
  if (!value || typeof value !== 'object') return {}
  const chapters: Record<number, ChapterRecord> = {}
  for (const [key, record] of Object.entries(value)) {
    const chapter = Number(key)
    if (
      Number.isInteger(chapter) &&
      chapter >= 1 &&
      chapter <= 10 &&
      record &&
      typeof record === 'object'
    ) {
      const fields = record as Record<string, unknown>
      chapters[chapter] = {
        bestScore: safeInteger(fields.bestScore),
        bestStars: Math.min(3, safeInteger(fields.bestStars)),
      }
    }
  }
  return chapters
}

function isRunSave(value: unknown): value is RunSave {
  if (!value || typeof value !== 'object') return false
  const run = value as Record<string, unknown>
  return (
    typeof run.chapter === 'number' &&
    typeof run.worldLevel === 'number' &&
    typeof run.health === 'number' &&
    typeof run.maxHealth === 'number' &&
    typeof run.battleLevel === 'number' &&
    typeof run.score === 'number' &&
    typeof run.deaths === 'number' &&
    typeof run.runSeed === 'number' &&
    Boolean(run.upgrades)
  )
}
