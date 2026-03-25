// navigation.spec.ts — 페이지 네비게이션 E2E 테스트
import { test, expect } from '@playwright/test'

test.describe('페이지 네비게이션', () => {
  test('실업급여 페이지 진입', async ({ page }) => {
    await page.goto('/unemployment')
    await expect(page.locator('text=실업급여').first()).toBeVisible({ timeout: 10000 })
  })

  test('주휴수당 페이지 진입', async ({ page }) => {
    await page.goto('/weekly-allowance')
    await expect(page.locator('text=주휴').first()).toBeVisible({ timeout: 10000 })
  })

  test('연차수당 페이지 진입', async ({ page }) => {
    await page.goto('/annual-leave')
    await expect(page.locator('text=연차').first()).toBeVisible({ timeout: 10000 })
  })

  test('404 — 존재하지 않는 경로에서도 홈 컨텐츠 렌더링', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz')
    // App.tsx의 * → <Home /> 렌더링 (URL 변경 없이 홈 콘텐츠 표시)
    await expect(page.locator('text=퇴직금').first()).toBeVisible({ timeout: 10000 })
  })
})
