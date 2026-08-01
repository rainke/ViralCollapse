import { describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    BlendModes: { MULTIPLY: 0 },
    Scene: class Scene {},
  },
}))

import { GameScene } from './GameScene'

describe('GameScene background', () => {
  it('scrolls the seamless micro-world texture without stretching it', () => {
    const scene = new GameScene() as unknown as {
      textures: { get: ReturnType<typeof vi.fn> }
      add: { image: ReturnType<typeof vi.fn>; tileSprite: ReturnType<typeof vi.fn> }
      createBackground: () => void
    }
    const background = {
      setScale: vi.fn().mockReturnThis(),
      setTileScale: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
    }
    const source = { width: 941, height: 1672 }
    scene.textures = { get: vi.fn(() => ({ getSourceImage: () => source })) }
    scene.add = {
      image: vi.fn(() => background),
      tileSprite: vi.fn(() => background),
    }

    scene.createBackground()

    expect(scene.add.tileSprite).toHaveBeenCalledWith(
      195,
      422,
      390,
      844,
      'micro-world',
    )
    expect(background.setTileScale).toHaveBeenCalledWith(0.66)
    expect(scene.add.image).not.toHaveBeenCalled()
  })
})
