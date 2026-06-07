import { test, expect } from '@playwright/test'

test.describe('Admin Settings Tab Fix', () => {
  test('Check and fix super admin access', async ({ page }) => {
    // 1. 로그인 페이지로 이동
    await page.goto('http://localhost:5173/login')
    await page.waitForLoadState('networkidle')

    console.log('✅ 로그인 페이지 접속')

    // 2. 현재 로그인 상태 확인
    await page.goto('http://localhost:5173/admin')
    await page.waitForTimeout(2000)

    // 3. 사이드바에서 메뉴 개수 확인
    const menuItems = await page.locator('aside button').count()
    console.log(`📋 현재 표시된 메뉴 개수: ${menuItems}`)

    // 4. Settings 탭 존재 여부 확인
    const settingsTab = page.locator('aside button', { hasText: 'Settings' })
    const settingsExists = await settingsTab.count() > 0
    console.log(`⚙️  Settings 탭 존재: ${settingsExists}`)

    // 5. 현재 역할 배지 확인
    const roleBadge = await page.locator('div:has-text("✦")').first().textContent()
    console.log(`👤 현재 역할: ${roleBadge}`)

    // 6. 메뉴 목록 출력
    const menus = await page.locator('aside button span').allTextContents()
    console.log('📌 표시된 메뉴:', menus.filter(m => m.trim()))

    // 7. 스크린샷 저장
    await page.screenshot({ path: 'admin-current-state.png', fullPage: true })
    console.log('📸 스크린샷 저장: admin-current-state.png')
  })
})
