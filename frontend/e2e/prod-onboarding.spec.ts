import { test, expect } from '@playwright/test'

test('프로덕션 온보딩 페이지 로딩 상태 확인', async ({ page }) => {
  // 프로덕션 온보딩 페이지 접속 (미로그인 상태)
  await page.goto('https://catch-daily-worker.vercel.app/onboarding', { waitUntil: 'networkidle' })

  // 3초 대기
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'test-results/prod-onboarding-3s.png', fullPage: true })

  const url = page.url()
  const bodyText = await page.locator('body').textContent() ?? ''
  console.log('[온보딩 3초] URL:', url)
  console.log('[온보딩 3초] body:', bodyText.slice(0, 300))

  // 미로그인 → /login으로 리다이렉트되거나, "로딩 중"이 아닌 상태여야 함
  // "로딩 중..."에서 멈추면 안 됨
  const isStuckLoading = url.includes('/onboarding') && bodyText.includes('로딩 중')
  expect(isStuckLoading).toBeFalsy()
})

test('프로덕션 콜백 → 온보딩 플로우 시뮬레이션', async ({ page }) => {
  // 콜백 페이지 → 로그인 필요 → /login으로 이동 확인
  await page.goto('https://catch-daily-worker.vercel.app/auth/callback', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'test-results/prod-callback-2s.png', fullPage: true })

  const bodyText = await page.locator('body').textContent() ?? ''
  console.log('[콜백 2초] URL:', page.url(), '| body:', bodyText.slice(0, 200))

  // 처리 중 메시지가 표시되어야 함 (빈 화면이 아님)
  expect(bodyText.length).toBeGreaterThan(5)
})
