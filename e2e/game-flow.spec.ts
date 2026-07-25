import { expect, test } from '@playwright/test'

test('a child can start the game from the portrait home screen', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto('/')

  await expect(page).toHaveTitle(/病毒大扫除/)
  await expect(page.getByRole('button', { name: '开始净化' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始净化' })).toBeEnabled()
  await page.getByRole('button', { name: '开始净化' }).click()
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
  await page.getByRole('button', { name: '开始净化' }).click()

  await page.getByRole('button', { name: '暂停游戏' }).click()
  await expect(page.getByRole('heading', { name: '休息一下' })).toBeVisible()
  await page.getByRole('button', { name: '继续净化' }).click()
  await expect(page.getByRole('heading', { name: '休息一下' })).toBeHidden()
  await expect(page.locator('#game-canvas canvas')).toBeVisible()
})

test('player, bullets and viruses use real visible collision areas', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始净化' }).click()

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

  await expect(page.locator('#hearts')).toContainText('💙💙🤍')
})

test('boss stages use distinct book-inspired silhouettes and collision areas', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始净化' }).click()

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
      startLevel: (level: number) => void
    }

    scene.startLevel(3)
    const third = {
      texture: scene.boss.texture.key,
      bodyWidth: scene.boss.body.width,
    }
    scene.startLevel(6)
    const sixth = {
      texture: scene.boss.texture.key,
      bodyWidth: scene.boss.body.width,
    }
    return { third, sixth }
  })

  expect(bosses.third.texture).toBe('virus-ebola-boss')
  expect(bosses.sixth.texture).toBe('virus-corona-boss')
  expect(bosses.third.bodyWidth).toBeGreaterThan(80)
  expect(bosses.sixth.bodyWidth).toBeGreaterThan(80)
})

test('player death explodes before the revive dialog transitions in', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始净化' }).click()

  const deathState = await page.evaluate(() => {
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
        hearts: number
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

    scene.state.hearts = 1
    scene.state.invulnerableUntil = 0
    scene.spawnEnemy()
    scene.onPlayerHitsDanger(scene.player, scene.enemies.getChildren()[0])

    return {
      reviveHidden: document.querySelector('#modal')?.classList.contains('is-hidden'),
      explosionVisible: Boolean(
        scene.children.getByName('player-death-effect'),
      ),
    }
  })

  expect(deathState).toEqual({
    reviveHidden: true,
    explosionVisible: true,
  })

  const reviveHeading = page.getByRole('heading', {
    name: '小卫士充好电啦',
  })
  await expect(reviveHeading).toBeVisible({ timeout: 2_000 })

  const transitionDuration = await page.locator('#modal').evaluate((modal) =>
    Number.parseFloat(getComputedStyle(modal).transitionDuration),
  )
  expect(transitionDuration).toBeGreaterThan(0)
})
