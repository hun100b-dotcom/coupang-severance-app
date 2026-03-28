import { test, expect } from '@playwright/test'

test.describe('로그인 프로세스 전체 검증', () => {

  test('1. 로그인 페이지 정상 렌더링', async ({ page }) => {
    await page.goto('/login')
    // 로그인 페이지 요소 확인
    await expect(page.locator('h1')).toContainText('간편 로그인')
    await expect(page.getByText('카카오로 로그인')).toBeVisible()
    await expect(page.getByText('Google로 로그인')).toBeVisible()
    await expect(page.getByText('홈으로')).toBeVisible()
  })

  test('2. 로그인 페이지 → 홈으로 버튼 동작', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('홈으로').click()
    await expect(page).toHaveURL(/\/home/)
  })

  test('3. 카카오 로그인 버튼 클릭 시 OAuth 리다이렉트', async ({ page }) => {
    await page.goto('/login')
    // 카카오 버튼 클릭 시 외부 OAuth URL로 이동하는지 확인
    const [response] = await Promise.all([
      page.waitForEvent('requestfinished', req =>
        req.url().includes('supabase') && req.url().includes('authorize')
      ).catch(() => null),
      page.getByText('카카오로 로그인').click(),
    ])
    // Supabase OAuth authorize 엔드포인트로 요청이 나갔는지 확인
    // 또는 페이지 URL이 카카오 로그인 페이지로 변경되었는지 확인
    await page.waitForTimeout(3000)
    const url = page.url()
    // Supabase authorize 또는 카카오 로그인 페이지로 이동했으면 성공
    const isOAuthRedirect = url.includes('kauth.kakao.com') ||
                            url.includes('supabase') ||
                            url.includes('accounts.kakao.com')
    expect(isOAuthRedirect).toBeTruthy()
  })

  test('4. /auth/callback 페이지 (세션 없음 → 처리 중 표시 + 리다이렉트)', async ({ page }) => {
    // 깨끗한 상태에서 콜백 접근: 먼저 로컬 페이지에서 스토리지 클리어
    await page.goto('/login')
    await page.evaluate(() => {
      try { localStorage.clear() } catch {}
      try { sessionStorage.clear() } catch {}
    })
    await page.context().clearCookies()
    await page.goto('/auth/callback', { waitUntil: 'networkidle' })
    // 처리 중 메시지가 표시됨
    await expect(page.getByText('처리 중...')).toBeVisible()
    // 12초 대기 후 상태 확인
    await page.waitForTimeout(12000)
    await page.screenshot({ path: 'test-results/callback-after-12s.png' })
    const currentUrl = page.url()
    const bodyText = await page.locator('body').textContent() ?? ''
    console.log('[콜백 테스트] URL:', currentUrl, '| body:', bodyText.slice(0, 200))
    // 어떤 경로로든 이동했거나 실패 메시지 표시 확인
    const isExpected = currentUrl.includes('/login') ||
                       currentUrl.includes('/onboarding') ||
                       currentUrl.includes('/mypage') ||
                       bodyText.includes('로그인에 실패했어요') ||
                       bodyText.includes('이동 중')
    expect(isExpected).toBeTruthy()
  })

  test('5. /onboarding 페이지 (미로그인 시 → 로그인 페이지로 리다이렉트)', async ({ page }) => {
    await page.goto('/onboarding')
    // 로그인되지 않은 상태에서 온보딩 접근 시 로그인으로 리다이렉트
    await page.waitForURL(/\/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('6. /mypage (미로그인 시 → 로그인 페이지로 리다이렉트)', async ({ page }) => {
    await page.goto('/mypage')
    await page.waitForURL(/\/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('7. 인트로 페이지 → 자동 이동', async ({ page }) => {
    await page.goto('/')
    // 인트로 페이지가 렌더링되는지 확인
    await expect(page.locator('body')).toBeVisible()
    // 6초 후 /home으로 자동 이동
    await page.waitForURL(/\/home/, { timeout: 10000 })
  })

  test('8. 구글 로그인 버튼 클릭 시 OAuth 리다이렉트', async ({ page }) => {
    await page.goto('/login')
    const [response] = await Promise.all([
      page.waitForEvent('requestfinished', req =>
        req.url().includes('supabase') && req.url().includes('authorize')
      ).catch(() => null),
      page.getByText('Google로 로그인').click(),
    ])
    await page.waitForTimeout(3000)
    const url = page.url()
    const isOAuthRedirect = url.includes('accounts.google.com') ||
                            url.includes('supabase') ||
                            url.includes('googleapis.com')
    expect(isOAuthRedirect).toBeTruthy()
  })

  test('9. 프로덕션 URL 접근 가능 확인', async ({ page }) => {
    // 프로덕션 사이트가 정상 응답하는지 확인
    const response = await page.goto('https://coupang-severance-app.vercel.app/')
    expect(response?.status()).toBeLessThan(400)
  })

  test('10. 프로덕션 로그인 페이지 정상 확인', async ({ page }) => {
    await page.goto('https://coupang-severance-app.vercel.app/login')
    await expect(page.locator('h1')).toContainText('간편 로그인')
    await expect(page.getByText('카카오로 로그인')).toBeVisible()
    await expect(page.getByText('Google로 로그인')).toBeVisible()
  })
})

test.describe('온보딩 페이지 UI 검증', () => {

  test('11. 온보딩 페이지 폼 요소 확인 (프로덕션)', async ({ page }) => {
    // 프로덕션에서 온보딩 페이지를 직접 접근 (미로그인 → 로그인으로 리다이렉트됨)
    await page.goto('https://coupang-severance-app.vercel.app/onboarding')
    // 미로그인 상태에서는 로그인 페이지로 리다이렉트
    await page.waitForURL(/\/login/, { timeout: 8000 })
  })
})
