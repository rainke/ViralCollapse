import { describe, expect, it } from 'vitest'
import { LEVELS } from './content'
import { FACT_SPEECH } from './speech'

describe('generated fact speech', () => {
  it('maps every level fact to one generated audio asset', () => {
    expect(FACT_SPEECH).toHaveLength(LEVELS.length)

    for (const level of LEVELS) {
      const speech = FACT_SPEECH.find((item) => item.level === level.id)

      expect(speech).toEqual({
        level: level.id,
        text: `${level.fact.title}。${level.fact.body}`,
        asset: `/assets/generated/speech/fact-${level.id}.wav`,
      })
    }
  })

  it('uses a unique audio asset for each fact', () => {
    const assets = FACT_SPEECH.map((item) => item.asset)

    expect(new Set(assets).size).toBe(assets.length)
  })
})
