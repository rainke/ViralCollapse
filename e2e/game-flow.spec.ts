import { expect, test } from '@playwright/test'

test('microphone permission blur keeps the speech task open', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => {
          window.dispatchEvent(new Event('blur'))
          const context = new AudioContext()
          const oscillator = context.createOscillator()
          const destination = context.createMediaStreamDestination()
          oscillator.connect(destination)
          oscillator.start()
          return destination.stream
        },
      },
    })
  })
  await page.goto('/')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('viral:revive', {
      detail: {
        restart: false,
        challenge: { id: 'permission-blur', type: 'reading', status: 'pending' },
      },
    }))
  })

  await page.getByRole('button', { name: '开始离线语音' }).click()

  await expect(page.locator('.challenge-status')).toHaveText('正在听…')
  await expect(page.getByRole('heading', { name: '读出这个汉字' })).toBeVisible()
  await expect(page.getByRole('button', { name: '改做选择题' })).toBeVisible()
})

test('permission denial offers a required fallback task', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
    })
  })
  await page.goto('/')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('viral:revive', {
      detail: {
        restart: false,
        challenge: { id: 'permission-denied', type: 'reading', status: 'pending' },
      },
    }))
  })
  await expect(page.getByText(/音频不会上传/)).toBeVisible()
  await page.getByRole('button', { name: '开始离线语音' }).click()
  await expect(page.getByRole('button', { name: '改做选择题' })).toBeVisible()
  await page.getByRole('button', { name: '改做选择题' }).click()
  await expect(page.getByRole('heading', { name: '健康知识小问答' })).toBeVisible()
  await expect(page.locator('.quiz-option')).toHaveCount(3)
})

test('choice questions play generated audio and label answers for pre-readers', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const played: string[] = []
    const synthesized: string[] = []
    class TestAudio extends EventTarget {
      constructor(readonly src: string) {
        super()
      }

      pause() {}

      play() {
        played.push(this.src)
        queueMicrotask(() => this.dispatchEvent(new Event('ended')))
        return Promise.resolve()
      }
    }
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: TestAudio,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => {},
        speak: (utterance: { text: string }) => synthesized.push(utterance.text),
      },
    })
    Object.assign(window, {
      __playedQuizAudio: played,
      __synthesizedQuizText: synthesized,
    })
  })
  await page.goto('/')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('viral:revive', {
      detail: {
        restart: false,
        challenge: { id: 'spoken-choice', type: 'choice', status: 'pending' },
      },
    }))
  })

  const options = page.locator('.quiz-option')
  await expect(options).toHaveText([/^A/, /^B/, /^C/])
  const optionIds = await options.evaluateAll((buttons) =>
    buttons.map((item) => (item as HTMLElement).dataset.optionId),
  )
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __playedQuizAudio: string[] }).__playedQuizAudio.length,
  )).toBe(7)
  const played = await page.evaluate(() =>
    (window as Window & { __playedQuizAudio: string[] }).__playedQuizAudio,
  )
  const questionId = played[0].match(/question-(.+)\.wav$/)?.[1]
  expect(questionId).toBeTruthy()
  expect(played).toEqual([
    `/assets/generated/speech/quiz/question-${questionId}.wav`,
    '/assets/generated/speech/quiz/marker-a.wav',
    `/assets/generated/speech/quiz/option-${questionId}-${optionIds[0]}.wav`,
    '/assets/generated/speech/quiz/marker-b.wav',
    `/assets/generated/speech/quiz/option-${questionId}-${optionIds[1]}.wav`,
    '/assets/generated/speech/quiz/marker-c.wav',
    `/assets/generated/speech/quiz/option-${questionId}-${optionIds[2]}.wav`,
  ])
  expect(await page.evaluate(() =>
    (window as Window & { __synthesizedQuizText: string[] })
      .__synthesizedQuizText,
  )).toEqual([])

  const correctAnswerSelector = [
    '[data-option-id="block-dust"]',
    '[data-option-id="in-nose"]',
  ].join(', ')
  await page.locator(`.quiz-option:not(${correctAnswerSelector})`).first().click()
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __playedQuizAudio: string[] }).__playedQuizAudio.at(-1),
  )).toBe('/assets/generated/speech/quiz/feedback-wrong.wav')

  await page.getByRole('button', { name: '再试一次' }).click()
  await page.locator(correctAnswerSelector).click()
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __playedQuizAudio: string[] }).__playedQuizAudio.at(-1),
  )).toBe('/assets/generated/speech/quiz/feedback-correct.wav')
})

test('a child can start the game from the portrait home screen', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')

  await expect(page).toHaveTitle(/病毒大扫除/)
  await expect(page.getByText('v1.0.0', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始第一章' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始第一章' })).toBeEnabled()
  await page.getByRole('button', { name: '开始第一章' }).click()
  await expect(page.locator('#game-canvas canvas')).toBeVisible()
  await expect(page.getByText('拖动小卫士')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('the page prevents accidental touch gestures during play', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none')
  await expect(page.locator('body')).toHaveCSS('touch-action', 'none')
})

test('pause and resume keep the child in the same run', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  await page.getByRole('button', { name: '暂停游戏' }).click()
  await expect(page.getByRole('heading', { name: '休息一下' })).toBeVisible()
  await page.getByRole('button', { name: '继续净化' }).click()
  await expect(page.getByRole('heading', { name: '休息一下' })).toBeHidden()
  await expect(page.locator('#game-canvas canvas')).toBeVisible()
})

test('listen plays the generated cloned-voice fact audio', async ({ page }) => {
  await page.goto('/')

  const preloadedSpeech = page.locator('link[rel="preload"][as="audio"]')
  await expect(preloadedSpeech).toHaveCount(10)
  await expect(preloadedSpeech.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).resolves.toEqual([
    '/assets/generated/speech/fact-1.wav',
    '/assets/generated/speech/fact-2.wav',
    '/assets/generated/speech/fact-3.wav',
    '/assets/generated/speech/fact-4.wav',
    '/assets/generated/speech/fact-5.wav',
    '/assets/generated/speech/fact-6.wav',
    '/assets/generated/speech/fact-7.wav',
    '/assets/generated/speech/fact-8.wav',
    '/assets/generated/speech/fact-9.wav',
    '/assets/generated/speech/fact-10.wav',
  ])

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('viral:levelComplete', {
        detail: {
          level: 1,
          fact: {
            emoji: '🫧',
            title: '鼻子小卫士',
            body: '鼻毛和黏液会帮助挡住灰尘和小坏蛋。',
          },
          bossNext: false,
          options: ['damage', 'health', 'rapid'],
        },
      }),
    )
  })

  await page.getByRole('button', { name: '听一听' }).click()
})

test('player, bullets and viruses use real visible collision areas', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const bodySizes = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      player: { body: { width: number } }
      enemies: {
        getChildren: () => Array<{
          body: { width: number; setVelocity: (x: number, y: number) => void }
          x: number
          y: number
          setData: (key: string, value: number) => void
        }>
      }
      spawnEnemy: () => void
    }
    scene.spawnEnemy()
    const enemy = scene.enemies.getChildren()[0]

    return {
      player: scene.player.body.width,
      enemy: enemy.body.width,
    }
  })

  expect(bodySizes.player).toBeGreaterThan(40)
  expect(bodySizes.enemy).toBeGreaterThan(40)

  await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    const scene = game?.scene.getScene('game') as {
      player: { x: number; y: number }
      enemies: {
        getChildren: () => Array<{
          body: { setVelocity: (x: number, y: number) => void }
          x: number
          y: number
          setData: (key: string, value: number) => void
        }>
      }
    }
    const enemy = scene.enemies.getChildren()[0]
    enemy.x = scene.player.x
    enemy.y = scene.player.y
    enemy.setData('originX', scene.player.x)
    enemy.setData('amplitude', 0)
    enemy.body.setVelocity(0, 0)
  })

  await expect(page.locator('#health-value')).toContainText('86/100')
})

test('book-inspired viruses use distinct silhouettes and collision areas', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const bosses = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      boss: {
        body: { width: number }
        texture: { key: string }
      }
      enemies: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => Array<{
          body: { width: number }
          texture: { key: string }
        }>
      }
      spawnEnemy: () => void
      startLevel: (level: number) => void
    }

    scene.startLevel(3)
    const third = {
      texture: scene.boss.texture.key,
      bodyWidth: scene.boss.body.width,
    }
    scene.startLevel(10)
    const tenth = {
      texture: scene.boss.texture.key,
      bodyWidth: scene.boss.body.width,
    }
    const originalRandom = Math.random
    const spawnAt = (level: number, randomValue: number) => {
      scene.enemies.clear(true, true)
      scene.startLevel(level)
      Math.random = () => randomValue
      scene.spawnEnemy()
      const enemy = scene.enemies.getChildren()[0]
      return {
        texture: enemy.texture.key,
        bodyWidth: enemy.body.width,
      }
    }
    const influenza = spawnAt(4, 0.66)
    const adenovirus = spawnAt(4, 0.8)
    const rabies = spawnAt(2, 0.75)
    const pox = spawnAt(2, 0.9)
    const polyhedral = spawnAt(4, 0.95)
    const wideMouth = spawnAt(5, 0.95)
    Math.random = originalRandom
    return {
      third,
      tenth,
      influenza,
      adenovirus,
      rabies,
      pox,
      polyhedral,
      wideMouth,
    }
  })

  expect(bosses.third.texture).toBe('virus-ebola-boss')
  expect(bosses.tenth.texture).toBe('virus-corona-boss')
  expect(bosses.influenza.texture).toBe('virus-influenza')
  expect(bosses.adenovirus.texture).toBe('virus-adenovirus')
  expect(bosses.rabies.texture).toBe('virus-rabies')
  expect(bosses.pox.texture).toBe('virus-pox')
  expect(bosses.polyhedral.texture).toBe('virus-polyhedral')
  expect(bosses.wideMouth.texture).toBe('virus-wide-mouth')
  expect(bosses.third.bodyWidth).toBeGreaterThan(80)
  expect(bosses.tenth.bodyWidth).toBeGreaterThan(80)
  expect(bosses.influenza.bodyWidth).toBeGreaterThan(40)
  expect(bosses.adenovirus.bodyWidth).toBeGreaterThan(40)
  expect(bosses.rabies.bodyWidth).toBeGreaterThan(36)
  expect(bosses.pox.bodyWidth).toBeGreaterThan(40)
  expect(bosses.polyhedral.bodyWidth).toBeGreaterThan(46)
  expect(bosses.wideMouth.bodyWidth).toBeGreaterThan(40)
})

test('player death explodes before the revive dialog transitions in', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const oscillatorStarts: number[] = []
    Object.assign(window, { __viralOscillatorStarts: oscillatorStarts })
    const originalStart = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (when = 0): void {
      oscillatorStarts.push(when)
      originalStart.call(this, when)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()
  await page.waitForFunction(() => '__viralGame' in window)

  const deathState = await page.evaluate(() => {
    const oscillatorStarts = (
      window as Window & { __viralOscillatorStarts?: number[] }
    ).__viralOscillatorStarts
    if (!oscillatorStarts) throw new Error('Missing oscillator tracking')
    oscillatorStarts.length = 0

    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      state: {
        health: number
        invulnerableUntil: number
      }
      player: unknown
      enemies: {
        getChildren: () => unknown[]
      }
      children: {
        getByName: (name: string) => unknown
      }
      spawnEnemy: () => void
      onPlayerHitsDanger: (player: unknown, danger: unknown) => void
    }

    scene.state.health = 1
    scene.state.invulnerableUntil = 0
    scene.spawnEnemy()
    scene.onPlayerHitsDanger(scene.player, scene.enemies.getChildren()[0])

    return {
      reviveHidden: document.querySelector('#modal')?.classList.contains('is-hidden'),
      explosionVisible: Boolean(
        scene.children.getByName('player-death-effect'),
      ),
      deathSoundVoices: oscillatorStarts.length,
      deathSoundSpan:
        Math.max(...oscillatorStarts) - Math.min(...oscillatorStarts),
    }
  })

  expect(deathState).toMatchObject({
    reviveHidden: true,
    explosionVisible: true,
    deathSoundVoices: 3,
  })
  expect(deathState.deathSoundSpan).toBeCloseTo(0.32)

  const reviveHeading = page.getByRole('heading', {
    name: '写出看到的汉字',
  })
  await expect(reviveHeading).toBeVisible({ timeout: 2_000 })

  const transitionDuration = await page.locator('#modal').evaluate((modal) =>
    Number.parseFloat(getComputedStyle(modal).transitionDuration),
  )
  expect(transitionDuration).toBeGreaterThan(0)
})

test('handwriting revive uses adapter completion, mistakes, fallback, and cleanup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    type QuizCallbacks = {
      onComplete: () => void
      onMistake: () => void
    }
    const quizzes: QuizCallbacks[] = []
    const state = { cancels: 0, failLoad: false }
    Object.assign(window, {
      __handwritingTest: { quizzes, state },
      __viralHandwritingAdapter: {
        create: (
          _target: HTMLElement,
          _character: string,
          options: { onLoadCharDataError: () => void },
        ) => {
          if (state.failLoad) queueMicrotask(options.onLoadCharDataError)
          return {
            quiz: (callbacks: QuizCallbacks) => quizzes.push(callbacks),
            cancelQuiz: () => state.cancels++,
          }
        },
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      state: { health: number; invulnerableUntil: number }
      player: unknown
      enemies: { getChildren: () => unknown[] }
      spawnEnemy: () => void
      onPlayerHitsDanger: (player: unknown, danger: unknown) => void
    }
    scene.state.health = 1
    scene.state.invulnerableUntil = 0
    scene.spawnEnemy()
    scene.onPlayerHitsDanger(scene.player, scene.enemies.getChildren().at(-1))
  })
  const canvas = page.locator('.handwriting-canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveCSS('touch-action', 'none')

  await page.evaluate(() => {
    const testState = (window as Window & {
      __handwritingTest: { quizzes: Array<{ onMistake: () => void }> }
    }).__handwritingTest
    testState.quizzes[0].onMistake()
  })
  await expect(page.getByRole('status')).toContainText('再试一次')
  await expect(page.locator('#modal')).toBeVisible()

  await page.getByRole('button', { name: '重新书写' }).click()
  await expect(page.getByRole('status')).toContainText('重新完整写一遍')
  await page.evaluate(() => {
    const testState = (window as Window & {
      __handwritingTest: {
        quizzes: Array<{ onComplete: () => void }>
        state: { cancels: number; failLoad: boolean }
      }
    }).__handwritingTest
    // The callback from the discarded first writer must not revive the player.
    testState.quizzes[0].onComplete()
  })
  await expect(page.locator('#modal')).toBeVisible()
  await page.evaluate(() => {
    const testState = (window as Window & {
      __handwritingTest: { quizzes: Array<{ onComplete: () => void }> }
    }).__handwritingTest
    testState.quizzes[1].onComplete()
  })
  await expect(page.locator('#modal')).toBeHidden()

  await page.evaluate(() => {
    const testState = (window as Window & {
      __handwritingTest: { state: { failLoad: boolean } }
    }).__handwritingTest
    testState.state.failLoad = true
    window.dispatchEvent(new CustomEvent('viral:revive', {
      detail: {
        restart: false,
        challenge: {
          id: 'handwriting-fallback',
          type: 'writing',
          status: 'pending',
        },
      },
    }))
  })
  await expect(page.getByText('写字数据暂时没有到达')).toBeVisible()
  await expect(page.locator('.handwriting-canvas')).toHaveCount(0)
  const cleanup = await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    return (window as Window & {
      __handwritingTest: { state: { cancels: number } }
    }).__handwritingTest.state.cancels
  })
  expect(cleanup).toBeGreaterThanOrEqual(3)
  await expect(page.locator('#modal-actions')).toBeEmpty()
})

test('HUD shows numeric health and a seeded three-choice upgrade', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  await expect(page.locator('#health-value')).toHaveText('100/100')
  await expect(page.locator('#power-label')).toHaveText(
    '战斗 Lv.1 · 攻击 10',
  )

  await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      state: { pendingUpgrades?: string[] }
    }
    scene.state.pendingUpgrades = ['damage', 'health', 'rapid']
    window.dispatchEvent(
      new CustomEvent('viral:levelComplete', {
        detail: {
          level: 1,
          fact: {
            emoji: '🫧',
            title: '鼻子小卫士',
            body: '鼻毛和黏液会帮助挡住灰尘和小坏蛋。',
          },
          bossNext: false,
          options: scene.state.pendingUpgrades,
        },
      }),
    )
  })

  const options = page.locator('.upgrade-button')
  await expect(options).toHaveCount(3)
  await expect(options).toContainText([
    '抗体强化伤害 +18%',
    '生命成长上限 +15%',
    '快速抗体发射更快',
  ])
  await options.filter({ hasText: '抗体强化' }).click()
  await expect(page.locator('#power-label')).toHaveText(
    '战斗 Lv.2 · 攻击 12',
  )
})

test('a killed virus can drop a skill fragment that upgrades the current fight', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const drop = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    type GameObject = {
      active: boolean
      x: number
      y: number
      getData: (key: string) => unknown
      setData: (key: string, value: unknown) => void
    }
    const scene = game.scene.getScene('game') as {
      state: {
        cleaned: number
        worldLevel: number
      }
      player: { x: number; y: number }
      enemies: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      bullets: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      powerups: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      spawnEnemy: () => void
      fireAntibodies: () => void
      onBulletHitsEnemy: (bullet: GameObject, enemy: GameObject) => void
      onCollectPowerup: (player: unknown, powerup: GameObject) => void
    }

    scene.enemies.clear(true, true)
    scene.bullets.clear(true, true)
    scene.powerups.clear(true, true)
    const originalRandom = Math.random
    Math.random = () => 0.049
    scene.spawnEnemy()
    scene.fireAntibodies()
    const enemy = scene.enemies.getChildren().find((item) => item.active)
    const bullet = scene.bullets.getChildren().find((item) => item.active)
    if (!enemy || !bullet) throw new Error('Missing combat objects')
    enemy.setData('health', 1)
    scene.onBulletHitsEnemy(bullet, enemy)
    Math.random = originalRandom

    const fragment = scene.powerups
      .getChildren()
      .find((item) => item.active && item.getData('kind') === 'skill')
    if (!fragment) {
      return {
        kinds: scene.powerups
          .getChildren()
          .filter((item) => item.active)
          .map((item) => item.getData('kind')),
      }
    }
    fragment.x = scene.player.x
    fragment.y = scene.player.y
    scene.onCollectPowerup(scene.player, fragment)
    return {
      kinds: ['skill'],
      cleaned: scene.state.cleaned,
      worldLevel: scene.state.worldLevel,
    }
  })

  expect(drop).toMatchObject({
    kinds: ['skill'],
    cleaned: 1,
    worldLevel: 1,
  })
  await expect(
    page.getByRole('heading', { name: '捡到技能碎片！' }),
  ).toBeVisible()
  const options = page.locator('.upgrade-button')
  await expect(options).toHaveCount(3)
  await options.first().click()

  const resumed = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      state: {
        cleaned: number
        worldLevel: number
        pendingUpgrades?: string[]
      }
      transitioning: boolean
      physics: { world: { isPaused: boolean } }
    }
    return {
      cleaned: scene.state.cleaned,
      worldLevel: scene.state.worldLevel,
      pendingUpgrades: scene.state.pendingUpgrades,
      transitioning: scene.transitioning,
      physicsPaused: scene.physics.world.isPaused,
    }
  })

  expect(resumed).toEqual({
    cleaned: 1,
    worldLevel: 1,
    pendingUpgrades: undefined,
    transitioning: false,
    physicsPaused: false,
  })
})

test('skill fragments do not stack while one is still on screen', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const activeFragments = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    type GameObject = {
      active: boolean
      getData: (key: string) => unknown
    }
    const scene = game.scene.getScene('game') as {
      powerups: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      maybeDropSkillFragment: (x: number, y: number) => void
    }

    scene.powerups.clear(true, true)
    const originalRandom = Math.random
    Math.random = () => 0.049
    scene.maybeDropSkillFragment(120, 240)
    scene.maybeDropSkillFragment(270, 240)
    Math.random = originalRandom

    return scene.powerups
      .getChildren()
      .filter(
        (item) => item.active && item.getData('kind') === 'skill',
      ).length
  })

  expect(activeFragments).toBe(1)
})

test('split and pierce combine on every antibody hit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const result = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    type Projectile = {
      active: boolean
      angle: number
      body: { velocity: { x: number; y: number } }
      texture: { key: string }
      getData: (key: string) => unknown
    }
    const scene = game.scene.getScene('game') as {
      state: {
        upgrades: Record<string, number>
      }
      bullets: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => Projectile[]
      }
      enemies: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => unknown[]
      }
      textures: {
        getPixel: (
          x: number,
          y: number,
          key: string,
        ) => { red: number; green: number; blue: number; alpha: number } | null
      }
      fireAntibodies: () => void
      spawnEnemy: () => void
      onBulletHitsEnemy: (bullet: unknown, enemy: unknown) => void
    }
    scene.bullets.clear(true, true)
    scene.enemies.clear(true, true)
    scene.state.upgrades.split = 2
    scene.state.upgrades.pierce = 1
    scene.fireAntibodies()
    const parent = scene.bullets.getChildren().find(
      (bullet) => bullet.active,
    )
    if (!parent) throw new Error('Missing fired antibody')

    scene.spawnEnemy()
    scene.spawnEnemy()
    const [firstEnemy, secondEnemy] = scene.enemies.getChildren()
    scene.onBulletHitsEnemy(parent, firstEnemy)
    const firstChildren = scene.bullets.getChildren().filter(
      (bullet) => bullet.active && bullet.getData('splitChild') === true,
    )
    const parentAfterFirst = parent.active
    scene.onBulletHitsEnemy(parent, firstEnemy)
    const duplicateChildCount = scene.bullets.getChildren().filter(
      (bullet) => bullet.active && bullet.getData('splitChild') === true,
    ).length
    scene.onBulletHitsEnemy(parent, secondEnemy)
    const childrenAfterSecond = scene.bullets.getChildren().filter(
      (bullet) => bullet.active && bullet.getData('splitChild') === true,
    )
    const angleDelta = (left: number, right: number) =>
      Math.abs(((left - right + 180) % 360 + 360) % 360 - 180)
    const childTextureKeys = Array.from(
      new Set(childrenAfterSecond.map((bullet) => bullet.texture.key)),
    )
    const childTextureKey = childTextureKeys[0]
    if (!childTextureKey) throw new Error('Missing split antibody texture')
    const childPixel = scene.textures.getPixel(10, 13, childTextureKey)
    if (!childPixel) throw new Error('Missing split antibody center pixel')

    return {
      parentAfterFirst,
      parentAfterSecond: parent.active,
      firstChildCount: firstChildren.length,
      duplicateChildCount,
      secondChildCount: childrenAfterSecond.length,
      childTextureKeys,
      childCenterColor: [
        childPixel.red,
        childPixel.green,
        childPixel.blue,
        childPixel.alpha,
      ],
      childrenFollowMovement: childrenAfterSecond.every((bullet) => {
        const movementAngle =
          Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x) *
          (180 / Math.PI)
        const visualForwardAngle = bullet.angle - 90
        return angleDelta(visualForwardAngle, movementAngle) < 0.01
      }),
    }
  })

  expect(result).toEqual({
    parentAfterFirst: true,
    parentAfterSecond: false,
    firstChildCount: 3,
    duplicateChildCount: 3,
    secondChildCount: 6,
    childTextureKeys: ['antibody-split'],
    childCenterColor: [255, 159, 67, 255],
    childrenFollowMovement: true,
  })
})

test('virus blast chains nearby kills but split antibodies do not trigger it', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()

  const result = await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    type GameObject = {
      active: boolean
      x: number
      y: number
      getData: (key: string) => unknown
      setData: (key: string, value: unknown) => void
    }
    const scene = game.scene.getScene('game') as {
      state: {
        cleaned: number
        upgrades: Record<string, number>
      }
      enemies: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      bullets: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
        getChildren: () => GameObject[]
      }
      powerups: {
        clear: (removeFromScene: boolean, destroyChild: boolean) => void
      }
      spawnEnemy: () => void
      fireAntibodies: () => void
      onBulletHitsEnemy: (bullet: GameObject, enemy: GameObject) => void
    }

    scene.enemies.clear(true, true)
    scene.bullets.clear(true, true)
    scene.powerups.clear(true, true)
    scene.state.upgrades.blast = 2
    scene.state.upgrades.split = 0

    scene.spawnEnemy()
    scene.spawnEnemy()
    scene.spawnEnemy()
    const [first, nearby, far] = scene.enemies.getChildren()
    first.x = 100
    first.y = 260
    nearby.x = 205
    nearby.y = 260
    far.x = 250
    far.y = 420
    first.setData('health', 1)
    nearby.setData('health', 1)
    far.setData('health', 1)

    scene.fireAntibodies()
    const parent = scene.bullets.getChildren().find((item) => item.active)
    if (!parent) throw new Error('Missing parent antibody')
    scene.onBulletHitsEnemy(parent, first)
    const chainResult = {
      firstActive: first.active,
      nearbyActive: nearby.active,
      farActive: far.active,
      cleaned: scene.state.cleaned,
    }

    scene.enemies.clear(true, true)
    scene.bullets.clear(true, true)
    scene.spawnEnemy()
    scene.spawnEnemy()
    const [splitVictim, splitNeighbor] = scene.enemies.getChildren()
    splitVictim.x = 100
    splitVictim.y = 260
    splitNeighbor.x = 120
    splitNeighbor.y = 260
    splitVictim.setData('health', 1)
    splitNeighbor.setData('health', 1)

    scene.fireAntibodies()
    const splitChild = scene.bullets.getChildren().find((item) => item.active)
    if (!splitChild) throw new Error('Missing split antibody')
    splitChild.setData('splitChild', true)
    scene.onBulletHitsEnemy(splitChild, splitVictim)

    return {
      chainResult,
      splitVictimActive: splitVictim.active,
      splitNeighborActive: splitNeighbor.active,
      cleaned: scene.state.cleaned,
    }
  })

  expect(result).toEqual({
    chainResult: {
      firstActive: false,
      nearbyActive: false,
      farActive: true,
      cleaned: 2,
    },
    splitVictimActive: false,
    splitNeighborActive: true,
    cleaned: 3,
  })
})

test('saved chapter checkpoint continues from its world level', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'viral-collapse-save',
      JSON.stringify({
        version: 2,
        muted: false,
        highestCompletedLevel: 6,
        chapters: {},
        run: {
          chapter: 1,
          worldLevel: 7,
          health: 80,
          maxHealth: 130,
          battleLevel: 7,
          upgrades: {
            damage: 1,
            rapid: 1,
            spread: 0,
            health: 1,
            critical: 0,
            guard: 0,
          },
          score: 300,
          deaths: 1,
          runSeed: 77,
          pendingUpgrades: ['critical', 'health', 'rapid'],
        },
      }),
    )
  })
  await page.goto('/')

  await page.getByRole('button', { name: '继续第 7 关' }).click()
  await expect(page.locator('#stage-number')).toHaveText('第 7 关')
  await expect(page.locator('#health-value')).toHaveText('80/130')
  await expect(page.locator('#power-label')).toContainText('战斗 Lv.7')
  await expect(page.locator('.upgrade-button')).toContainText([
    '精准暴击暴击 +10%',
    '生命成长上限 +15%',
    '快速抗体发射更快',
  ])
})

test('saved progress can be restarted from the first level', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'viral-collapse-save',
      JSON.stringify({
        version: 2,
        muted: false,
        highestCompletedLevel: 6,
        chapters: {},
        run: {
          chapter: 1,
          worldLevel: 7,
          health: 80,
          maxHealth: 130,
          battleLevel: 7,
          upgrades: {
            damage: 1,
            rapid: 1,
            spread: 0,
            health: 1,
            critical: 0,
            guard: 0,
          },
          score: 300,
          deaths: 1,
          runSeed: 77,
        },
      }),
    )
  })
  await page.goto('/')

  await page.getByRole('button', { name: '从第 1 关开始' }).click()
  await expect(page.locator('#stage-number')).toHaveText('第 1 关')
  await expect(page.locator('#health-value')).toHaveText('100/100')
  await expect(page.locator('#score')).toHaveText('0')
  await expect(page.locator('#power-label')).toContainText('战斗 Lv.1')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = localStorage.getItem('viral-collapse-save')
        return stored ? JSON.parse(stored).run.worldLevel : undefined
      }),
    )
    .toBe(1)
})

test('one free revive is followed by a full-health level restart', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const quizzes: Array<{ onComplete: () => void }> = []
    Object.assign(window, {
      __reviveQuizzes: quizzes,
      __viralHandwritingAdapter: {
        create: () => ({
          quiz: (callbacks: { onComplete: () => void }) => quizzes.push(callbacks),
          cancelQuiz: () => {},
        }),
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()
  await page.waitForFunction(() => '__viralGame' in window)

  const defeat = async () => {
    await page.evaluate(() => {
      const game = (
        window as Window & {
          __viralGame?: {
            scene: { getScene: (key: string) => unknown }
          }
        }
      ).__viralGame
      if (!game) throw new Error('Missing development game handle')
      const scene = game.scene.getScene('game') as {
        state: { health: number; invulnerableUntil: number }
        player: unknown
        enemies: { getChildren: () => unknown[] }
        spawnEnemy: () => void
        onPlayerHitsDanger: (player: unknown, danger: unknown) => void
      }
      scene.state.health = 1
      scene.state.invulnerableUntil = 0
      scene.spawnEnemy()
      const danger = scene.enemies.getChildren().at(-1)
      scene.onPlayerHitsDanger(scene.player, danger)
    })
  }

  await defeat()
  await expect(
    page.getByRole('heading', { name: '写出看到的汉字' }),
  ).toBeVisible()
  await expect(page.locator('#health-value')).toHaveText('0/100')
  await page.evaluate(() => {
    (window as Window & { __reviveQuizzes: Array<{ onComplete: () => void }> })
      .__reviveQuizzes.at(-1)?.onComplete()
  })
  await expect(page.locator('#health-value')).toHaveText('60/100')

  await defeat()
  await expect(
    page.getByRole('heading', { name: '读出这个汉字' }),
  ).toBeVisible()
  await expect(page.locator('#health-value')).toHaveText('0/100')
  await page.getByRole('button', { name: '改做选择题' }).click()
  await expect(
    page.getByRole('heading', { name: '健康知识小问答' }),
  ).toBeVisible()
  const correctAnswerSelector = [
    '[data-option-id="block-dust"]',
    '[data-option-id="in-nose"]',
  ].join(', ')
  const wrongAnswer = page.locator(
    `.quiz-option:not(${correctAnswerSelector})`,
  ).first()
  await wrongAnswer.click()
  await expect(page.locator('.quiz-feedback')).toContainText('再想一想')
  await expect(page.locator('#health-value')).toHaveText('0/100')

  await page.getByRole('button', { name: '再试一次' }).click()
  await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: { scene: { getScene: (key: string) => unknown } }
        __reviveCalls?: number
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      revive: (instanceId: string) => boolean
    }
    const originalRevive = scene.revive.bind(scene)
    scene.revive = (instanceId: string) => {
      const trackedWindow = window as Window & { __reviveCalls?: number }
      trackedWindow.__reviveCalls = (trackedWindow.__reviveCalls ?? 0) + 1
      return originalRevive(instanceId)
    }
    const answer = document.querySelector<HTMLButtonElement>(
      '[data-option-id="block-dust"], [data-option-id="in-nose"]',
    )
    answer?.click()
    answer?.click()
  })
  await expect(page.locator('#health-value')).toHaveText('100/100')
  await expect.poll(() => page.evaluate(() =>
    (window as Window & { __reviveCalls?: number }).__reviveCalls,
  )).toBe(1)
  await expect(page.locator('#score')).toHaveText('0')
})

test('level ten completes the chapter with death-based stars', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始第一章' }).click()
  await page.evaluate(() => {
    const game = (
      window as Window & {
        __viralGame?: {
          scene: { getScene: (key: string) => unknown }
        }
      }
    ).__viralGame
    if (!game) throw new Error('Missing development game handle')
    const scene = game.scene.getScene('game') as {
      state: {
        worldLevel: number
        battleLevel: number
        score: number
        deaths: number
      }
      finishRun: () => void
    }
    scene.state.worldLevel = 10
    scene.state.battleLevel = 10
    scene.state.score = 1_234
    scene.state.deaths = 1
    scene.finishRun()
  })

  await expect(page.getByText('第 1 章完成')).toBeVisible()
  await expect(page.locator('#modal-body')).toContainText('⭐⭐')
  await expect(page.locator('#modal-body')).toContainText('1234')
  await expect(
    page.getByRole('button', { name: '开始下一章' }),
  ).toBeVisible()
})
