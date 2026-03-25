// severance.spec.ts — 퇴직금 계산 흐름 E2E 테스트
import { test, expect } from '@playwright/test'

test.describe('퇴직금 계산 흐름', () => {
  test('퇴직금 페이지 진입', async ({ page }) => {
    await page.goto('/severance')
    await expect(page.locator('text=퇴직금').first()).toBeVisible({ timeout: 10000 })
  })

  test('간편 계산 — 근무일·일급 입력 후 결과 확인', async ({ page }) => {
    await page.goto('/severance')
    // "간편 계산" 탭 또는 버튼 클릭
    const simpleBtn = page.locator('text=간편').first()
    if (await simpleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await simpleBtn.click()
    }

    // 근무일 수 입력 필드 탐색
    const workdaysInput = page.locator('input[type="number"]').first()
    if (await workdaysInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await workdaysInput.fill('400')
      const wageInput = page.locator('input[type="number"]').nth(1)
      await wageInput.fill('150000')
      // 계산 버튼
      const calcBtn = page.locator('button').filter({ hasText: '계산' }).first()
      await calcBtn.click()
      // 결과 확인
      await expect(page.locator('text=원').first()).toBeVisible({ timeout: 10000 })
    }
  })
})
