import { test, expect } from '@playwright/test'

test.describe('프로덕션 사이트 직접 확인', () => {

  test('홈 페이지 스크린샷 + 콘텐츠 확인', async ({ page }) => {
    await page.goto('https://catch-daily-worker.vercel.app/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/prod-home.png', fullPage: true })
    const bodyText = await page.locator('body').textContent()
    console.log('[홈] URL:', page.url())
    console.log('[홈] body 200자:', bodyText?.slice(0, 300))
    // 콘솔 에러 수집
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.waitForTimeout(1000)
    if (errors.length) console.log('[홈] 콘솔 에러:', errors.join('\n'))
  })

  test('마이페이지 스크린샷 + 리다이렉트 확인', async ({ page }) => {
    await page.goto('https://catch-daily-worker.vercel.app/mypage', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/prod-mypage.png', fullPage: true })
    const url = page.url()
    const bodyText = await page.locator('body').textContent()
    console.log('[마이페이지] URL:', url)
    console.log('[마이페이지] body 200자:', bodyText?.slice(0, 300))
  })

  test('로그인 페이지 스크린샷 + 버튼 확인', async ({ page }) => {
    await page.goto('https://catch-daily-worker.vercel.app/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/prod-login.png', fullPage: true })
    const bodyText = await page.locator('body').textContent()
    console.log('[로그인] URL:', page.url())
    console.log('[로그인] body:', bodyText?.slice(0, 300))
    // 버튼 존재 확인
    const kakaoBtn = await page.getByText('카카오로 로그인').isVisible().catch(() => false)
    const googleBtn = await page.getByText('Google로 로그인').isVisible().catch(() => false)
    console.log('[로그인] 카카오 버튼:', kakaoBtn, '| 구글 버튼:', googleBtn)
  })

  test('BottomNav 로그인/마이페이지 버튼 확인', async ({ page }) => {
    await page.goto('https://catch-daily-worker.vercel.app/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    // BottomNav의 모든 링크/버튼 텍스트 수집
    const bottomNav = page.locator('nav').last()
    const navText = await bottomNav.textContent().catch(() => 'nav 못찾음')
    console.log('[BottomNav] 텍스트:', navText)
    // 모든 a 태그 href 수집
    const links = await page.locator('nav a').all()
    for (const link of links) {
      const href = await link.getAttribute('href')
      const text = await link.textContent()
      console.log(`  링크: "${text?.trim()}" → ${href}`)
    }
  })
})
