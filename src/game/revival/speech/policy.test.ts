import { describe, expect, it } from 'vitest'
import { acceptsRecognition, normalizeRecognition } from './policy'

describe('speech policy', () => {
  it('normalizes width, punctuation, whitespace, numbers, and common traditional text', () => {
    expect(normalizeRecognition(' 聽，一！ ')).toBe('听1')
  })

  it('requires an exact target and confidence threshold instead of a substring', () => {
    const target = { character: '白', pronunciations: ['bai2'] }
    expect(acceptsRecognition({ text: '白', confidence: 0.72 }, target)).toBe(true)
    expect(acceptsRecognition({ text: '小白', confidence: 0.99 }, target)).toBe(false)
    expect(acceptsRecognition({ text: '白', confidence: 0.71 }, target)).toBe(false)
  })

  it('applies the explicit pronunciation and tone rule when pronunciation exists', () => {
    const target = { character: '白', pronunciations: ['bai2'] }
    expect(acceptsRecognition({ text: '白', confidence: 0.9, pronunciation: 'bai2' }, target)).toBe(true)
    expect(acceptsRecognition({ text: '白', confidence: 0.9, pronunciation: 'bai3' }, target)).toBe(false)
  })
})
