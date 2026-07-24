import { describe, expect, it } from 'vitest'
import {
  applyDamage,
  applyUpgrade,
  createGameState,
  deserializeSave,
  recordVirusCleaned,
  revivePlayer,
  serializeSave,
} from './model'

describe('game state', () => {
  it('starts a gentle run with three hearts and no score', () => {
    const state = createGameState()

    expect(state).toMatchObject({
      hearts: 3,
      maxHearts: 3,
      score: 0,
      cleaned: 0,
      level: 1,
      invulnerableUntil: 0,
    })
  })

  it('ignores repeated damage during the grace period', () => {
    const firstHit = applyDamage(createGameState(), 1_000)
    const repeatedHit = applyDamage(firstHit, 1_500)

    expect(firstHit.hearts).toBe(2)
    expect(firstHit.invulnerableUntil).toBe(2_200)
    expect(repeatedHit).toEqual(firstHit)
  })

  it('accepts damage after the grace period and never drops below zero', () => {
    let state = createGameState()
    state = applyDamage(state, 0)
    state = applyDamage(state, 1_200)
    state = applyDamage(state, 2_400)
    state = applyDamage(state, 3_600)

    expect(state.hearts).toBe(0)
  })

  it('counts cleaned viruses and scores by enemy value', () => {
    const state = recordVirusCleaned(createGameState(), 25)

    expect(state.cleaned).toBe(1)
    expect(state.score).toBe(25)
  })

  it('restores all hearts on an encouraging revive without losing progress', () => {
    const damaged = {
      ...recordVirusCleaned(applyDamage(createGameState(), 0), 25),
      hearts: 0,
    }
    const revived = revivePlayer(damaged, 5_000)

    expect(revived.hearts).toBe(3)
    expect(revived.score).toBe(25)
    expect(revived.cleaned).toBe(1)
    expect(revived.invulnerableUntil).toBe(7_500)
  })
})

describe('upgrades', () => {
  it('applies rapid, spread and shield upgrades with safe caps', () => {
    let state = createGameState()

    for (let index = 0; index < 5; index += 1) {
      state = applyUpgrade(state, 'rapid')
      state = applyUpgrade(state, 'spread')
      state = applyUpgrade(state, 'shield')
    }

    expect(state.upgrades).toEqual({
      rapid: 3,
      spread: 2,
      shield: 2,
    })
    expect(state.hearts).toBe(state.maxHearts)
  })
})

describe('save data', () => {
  it('round trips safe settings and best results', () => {
    const encoded = serializeSave({
      version: 1,
      muted: true,
      bestScore: 420,
      bestStars: 3,
    })

    expect(deserializeSave(encoded)).toEqual({
      version: 1,
      muted: true,
      bestScore: 420,
      bestStars: 3,
    })
  })

  it('falls back for corrupt or incompatible saves', () => {
    expect(deserializeSave('not json')).toEqual({
      version: 1,
      muted: false,
      bestScore: 0,
      bestStars: 0,
    })
    expect(deserializeSave('{"version":99}').bestScore).toBe(0)
  })

  it('sanitizes untrusted values', () => {
    const save = deserializeSave(
      '{"version":1,"muted":"yes","bestScore":-4,"bestStars":9}',
    )

    expect(save).toEqual({
      version: 1,
      muted: false,
      bestScore: 0,
      bestStars: 3,
    })
  })
})
