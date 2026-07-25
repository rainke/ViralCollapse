import { describe, expect, it } from 'vitest'
import {
  HITBOXES,
  getScaledCircle,
  projectileTravelPerFrame,
} from './collision'

describe('sprite hitboxes', () => {
  it('converts source-image hitboxes into useful world-space circles', () => {
    const player = getScaledCircle(HITBOXES.player, 96)
    const basicVirus = getScaledCircle(HITBOXES.basic, 68)
    const influenza = getScaledCircle(HITBOXES.influenza, 78)
    const adenovirus = getScaledCircle(HITBOXES.adenovirus, 84)
    const rabies = getScaledCircle(HITBOXES.rabies, 72)
    const pox = getScaledCircle(HITBOXES.pox, 82)
    const polyhedral = getScaledCircle(HITBOXES.polyhedral, 88)
    const wideMouth = getScaledCircle(HITBOXES.wideMouth, 80)
    const ebolaBoss = getScaledCircle(HITBOXES.ebolaBoss, 220)
    const coronaBoss = getScaledCircle(HITBOXES.coronaBoss, 205)

    expect(player.radius).toBeGreaterThanOrEqual(22)
    expect(basicVirus.radius).toBeGreaterThanOrEqual(21)
    expect(influenza.radius).toBeGreaterThanOrEqual(22)
    expect(adenovirus.radius).toBeGreaterThanOrEqual(24)
    expect(rabies.radius).toBeGreaterThanOrEqual(19)
    expect(pox.radius).toBeGreaterThanOrEqual(23)
    expect(polyhedral.radius).toBeGreaterThanOrEqual(25)
    expect(wideMouth.radius).toBeGreaterThanOrEqual(21)
    expect(ebolaBoss.radius).toBeGreaterThanOrEqual(58)
    expect(coronaBoss.radius).toBeGreaterThanOrEqual(68)
  })

  it('keeps visual overlap small before player and virus collide', () => {
    const player = getScaledCircle(HITBOXES.player, 96)
    const virus = getScaledCircle(HITBOXES.basic, 68)

    expect(player.radius + virus.radius).toBeGreaterThanOrEqual(44)
  })

  it('makes a virus wider than one frame of bullet travel', () => {
    const virus = getScaledCircle(HITBOXES.basic, 68)
    const bulletTravel = projectileTravelPerFrame(470, 60)

    expect(virus.radius * 2).toBeGreaterThan(bulletTravel * 4)
  })

  it('keeps every circular hitbox centered inside the source texture', () => {
    for (const hitbox of Object.values(HITBOXES)) {
      expect(hitbox.centerX - hitbox.radius).toBeGreaterThanOrEqual(0)
      expect(hitbox.centerY - hitbox.radius).toBeGreaterThanOrEqual(0)
      expect(hitbox.centerX + hitbox.radius).toBeLessThanOrEqual(1024)
      expect(hitbox.centerY + hitbox.radius).toBeLessThanOrEqual(1536)
    }
  })
})
