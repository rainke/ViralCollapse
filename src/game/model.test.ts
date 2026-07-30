import { describe, expect, it } from 'vitest'
import {
  advanceToLevel,
  applyDamage,
  applyUpgrade,
  calculateBulletDamage,
  chooseUpgradeOptions,
  createGameState,
  deserializeSave,
  getBulletPattern,
  getChapterStars,
  getFireInterval,
  getPlayerCombatStats,
  getProjectilePierceCount,
  getSplitProjectiles,
  healPlayer,
  restartCurrentLevel,
  recordVirusCleaned,
  revivePlayer,
  serializeSave,
  shouldDropSkillFragment,
  type UpgradeId,
} from './model'

describe('game state', () => {
  it('starts a chapter at battle level one with scaled health', () => {
    const state = createGameState()

    expect(state).toMatchObject({
      health: 100,
      maxHealth: 100,
      score: 0,
      cleaned: 0,
      worldLevel: 1,
      battleLevel: 1,
      invulnerableUntil: 0,
      deaths: 0,
      reviveUsed: false,
    })
  })

  it('applies actual damage and ignores repeated hits during grace', () => {
    const firstHit = applyDamage(createGameState(), 14, 1_000)
    const repeatedHit = applyDamage(firstHit, 14, 1_500)

    expect(firstHit.health).toBe(86)
    expect(firstHit.invulnerableUntil).toBe(2_200)
    expect(repeatedHit).toEqual(firstHit)
  })

  it('applies damage reduction and never drops below zero', () => {
    const state = {
      ...createGameState(),
      health: 10,
      upgrades: { ...createGameState().upgrades, guard: 2 },
    }
    expect(applyDamage(state, 20, 0).health).toBe(0)
  })

  it('consumes a bubble immunity charge before health', () => {
    const shielded = {
      ...createGameState(),
      damageImmunityCharges: 1,
    }
    const hit = applyDamage(shielded, 99, 0)

    expect(hit.health).toBe(100)
    expect(hit.damageImmunityCharges).toBe(0)
  })

  it('counts cleaned viruses and scores by enemy value', () => {
    const state = recordVirusCleaned(createGameState(), 25)

    expect(state.cleaned).toBe(1)
    expect(state.score).toBe(25)
  })

  it('drops a skill fragment for exactly the lowest 10% of rolls', () => {
    expect(shouldDropSkillFragment(0)).toBe(true)
    expect(shouldDropSkillFragment(0.099_999)).toBe(true)
    expect(shouldDropSkillFragment(0.1)).toBe(false)
    expect(shouldDropSkillFragment(0.999_999)).toBe(false)
  })

  it('offers one in-place revive at 60% health, then restarts the checkpoint', () => {
    const damaged = {
      ...recordVirusCleaned(createGameState(), 25),
      health: 0,
    }
    const revived = revivePlayer(damaged, 5_000)

    expect(revived.health).toBe(60)
    expect(revived.score).toBe(25)
    expect(revived.cleaned).toBe(1)
    expect(revived.invulnerableUntil).toBe(7_500)
    expect(revived.reviveUsed).toBe(true)
    expect(revived.deaths).toBe(1)

    const restarted = restartCurrentLevel({
      ...revived,
      health: 0,
      score: 90,
      cleaned: 12,
      levelStartScore: 25,
    })
    expect(restarted).toMatchObject({
      health: 100,
      score: 25,
      cleaned: 0,
      deaths: 2,
      reviveUsed: false,
    })
  })
})

describe('upgrades', () => {
  it('applies all eight routes with safe caps', () => {
    let state = createGameState()

    for (let index = 0; index < 8; index += 1) {
      state = applyUpgrade(state, 'damage')
      state = applyUpgrade(state, 'rapid')
      state = applyUpgrade(state, 'spread')
      state = applyUpgrade(state, 'health')
      state = applyUpgrade(state, 'critical')
      state = applyUpgrade(state, 'guard')
      state = applyUpgrade(state, 'split')
      state = applyUpgrade(state, 'pierce')
    }

    expect(state.upgrades).toEqual({
      damage: 5,
      rapid: 5,
      spread: 2,
      health: 4,
      critical: 4,
      guard: 4,
      split: 3,
      pierce: 3,
    })
  })

  it('calculates damage, fire rate, spread, critical and healing effects', () => {
    let state = createGameState()
    state = applyUpgrade(state, 'damage')
    state = applyUpgrade(state, 'rapid')
    state = applyUpgrade(state, 'spread')
    state = applyUpgrade({ ...state, health: 50 }, 'health')
    state = applyUpgrade(state, 'critical')

    expect(getPlayerCombatStats(state)).toMatchObject({
      damage: 12,
      criticalChance: 0.1,
      criticalMultiplier: 1.75,
      damageReduction: 0,
    })
    expect(getFireInterval(state)).toBeCloseTo(354.9)
    expect(getBulletPattern(state)).toEqual([
      { angle: -9, damageMultiplier: 0.7 },
      { angle: 9, damageMultiplier: 0.7 },
    ])
    expect(state.maxHealth).toBe(115)
    expect(state.health).toBe(79)
    expect(calculateBulletDamage(state, 0.7, false)).toBe(8)
    expect(calculateBulletDamage(state, 0.7, true)).toBe(15)
  })

  it('uses three 60% shots at spread two and floors tiny damage to one', () => {
    const state = {
      ...createGameState(),
      upgrades: { ...createGameState().upgrades, spread: 2 },
    }

    expect(getBulletPattern(state)).toEqual([
      { angle: -16, damageMultiplier: 0.6 },
      { angle: 0, damageMultiplier: 0.6 },
      { angle: 16, damageMultiplier: 0.6 },
    ])
    expect(calculateBulletDamage(state, 0.001, false)).toBe(1)
  })

  it('creates more random-direction split antibodies at each level', () => {
    const randomValues = [0, 0.25, 0.5, 0.75]
    let randomIndex = 0
    const random = () => randomValues[randomIndex++]
    const state = {
      ...createGameState(),
      upgrades: { ...createGameState().upgrades, split: 3 },
    }

    expect(getSplitProjectiles(state, 11, random)).toEqual([
      { angle: 0, damage: 6 },
      { angle: 90, damage: 6 },
      { angle: 180, damage: 6 },
      { angle: 270, damage: 6 },
    ])
    expect(
      getSplitProjectiles(
        {
          ...state,
          upgrades: { ...state.upgrades, split: 0 },
        },
        11,
        random,
      ),
    ).toEqual([])
  })

  it('increases additional virus penetrations with pierce level', () => {
    const state = createGameState()

    expect(getProjectilePierceCount(state)).toBe(0)
    expect(
      getProjectilePierceCount({
        ...state,
        upgrades: { ...state.upgrades, pierce: 3 },
      }),
    ).toBe(3)
  })

  it('raises max health and heals 20% when battle level advances', () => {
    const state = {
      ...createGameState(),
      health: 20,
      score: 45,
      cleaned: 10,
      reviveUsed: true,
      pendingUpgrades: ['damage', 'health', 'rapid'] as UpgradeId[],
    }
    const next = advanceToLevel(state, 2)

    expect(next).toMatchObject({
      worldLevel: 2,
      battleLevel: 2,
      maxHealth: 105,
      health: 41,
      cleaned: 0,
      levelStartScore: 45,
      reviveUsed: false,
      pendingUpgrades: undefined,
    })
    expect(healPlayer({ ...next, health: 100 }).health).toBe(105)
  })

  it('draws three stable distinct options with offense and defense', () => {
    const state = createGameState()
    const first = chooseUpgradeOptions(state.upgrades, 12345)
    const again = chooseUpgradeOptions(state.upgrades, 12345)

    expect(first).toEqual(again)
    expect(new Set(first).size).toBe(3)
    expect(first.some((id) => ['damage', 'rapid', 'spread', 'critical'].includes(id))).toBe(true)
    expect(first.some((id) => ['health', 'guard'].includes(id))).toBe(true)
  })

  it('never offers capped routes', () => {
    const upgrades = {
      ...createGameState().upgrades,
      damage: 5,
      health: 4,
    }
    const options = chooseUpgradeOptions(upgrades, 8)

    expect(options).not.toContain('damage')
    expect(options).not.toContain('health')
  })

  it('rates chapters by deaths rather than damage taken', () => {
    expect(getChapterStars(0)).toBe(3)
    expect(getChapterStars(1)).toBe(2)
    expect(getChapterStars(2)).toBe(2)
    expect(getChapterStars(3)).toBe(1)
  })
})

describe('save data', () => {
  it('round trips v2 settings, chapter records and run checkpoint', () => {
    const encoded = serializeSave({
      version: 2,
      muted: true,
      highestCompletedLevel: 12,
      chapters: { 1: { bestScore: 420, bestStars: 3 } },
      run: {
        chapter: 2,
        worldLevel: 12,
        health: 118,
        maxHealth: 130,
        battleLevel: 2,
        upgrades: createGameState().upgrades,
        score: 80,
        deaths: 1,
        runSeed: 77,
        pendingUpgrades: ['damage', 'health', 'rapid'],
      },
    })

    expect(deserializeSave(encoded)).toEqual(JSON.parse(encoded))
  })

  it('falls back for corrupt saves', () => {
    expect(deserializeSave('not json')).toEqual({
      version: 2,
      muted: false,
      highestCompletedLevel: 0,
      chapters: {},
    })
  })

  it('migrates v1 settings and score into chapter one without old build data', () => {
    const save = deserializeSave(
      '{"version":1,"muted":true,"bestScore":420,"bestStars":3}',
    )

    expect(save).toEqual({
      version: 2,
      muted: true,
      highestCompletedLevel: 0,
      chapters: { 1: { bestScore: 420, bestStars: 3 } },
    })
  })
})
