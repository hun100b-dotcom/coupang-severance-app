// admin.spec.ts — 관리자 페이지 접근 제한 E2E 테스트
import { test, expect } from '@playwright/test'

test.describe('어드민 접근 제한', () => {
  test('비로그인 상태에서 /admin 접근 시 /home으로 리다이렉트', async ({ page }) => {
    await page.goto('/admin')
    // 비로그인이므로 홈으로 이동되어야 함
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 })
  })
})

test.describe('어드민 UI 구조', () => {
  // 실제 로그인은 OAuth 필요하므로 UI 구조 테스트는 생략하고 리다이렉트만 확인
  test('/admin URL이 존재하고 응답함', async ({ page }) => {
    const response = await page.goto('/admin')
    // SPA이므로 200 OK (index.html 반환)
    expect(response?.status()).toBe(200)
  })
})
