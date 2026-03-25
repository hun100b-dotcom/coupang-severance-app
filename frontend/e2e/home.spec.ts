// home.spec.ts — 홈 화면 E2E 테스트
import { test, expect } from '@playwright/test'

test.describe('홈 화면', () => {
  test('홈 페이지 진입 및 기본 UI 렌더링', async ({ page }) => {
    await page.goto('/home')
    // 메인 CTA 버튼 (퇴직금 계산) 확인
    await expect(page.locator('text=퇴직금').first()).toBeVisible({ timeout: 10000 })
  })

  test('하단 네비게이션 존재 확인', async ({ page }) => {
    await page.goto('/home')
    // BottomNav: 홈, 마이페이지 등 탭이 있어야 함
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('인트로 → 홈 리다이렉트', async ({ page }) => {
    await page.goto('/')
    // Intro 스플래시 후 /home으로 이동 (타임아웃 넉넉히)
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 })
  })
})
