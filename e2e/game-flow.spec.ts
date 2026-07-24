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
