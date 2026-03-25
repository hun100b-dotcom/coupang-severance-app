// run_migration.mjs — Playwright로 Supabase SQL Editor에서 마이그레이션 실행
// Chrome 기존 프로필 사용 → GitHub 이미 로그인 상태면 자동 통과
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQL = readFileSync(join(__dirname, 'supabase/migrations/005_super_admin_setup.sql'), 'utf-8')
const PROJECT_ID = 'hmjxrqhcwjyfkvlcejfc'
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new`

// 임시 프로필 디렉토리 (기존 Chrome/Edge가 실행 중이어도 충돌 없음)
const TEMP_PROFILE = join(os.tmpdir(), 'playwright-supabase')

;(async () => {
  console.log('🚀 Playwright Chromium 실행 (새 프로필)...')
  console.log('   → Supabase 로그인 페이지가 열리면 GitHub 버튼을 클릭하세요.')
  console.log('   → GitHub에 이미 로그인되어 있으면 자동으로 통과됩니다.')

  const context = await chromium.launchPersistentContext(TEMP_PROFILE, {
    headless: false,
    slowMo: 150,
    viewport: { width: 1280, height: 900 },
  })

  const page = await context.newPage()

  console.log('🌐 Supabase SQL Editor로 이동...')
  await page.goto(SQL_EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

  // 로그인 페이지로 리다이렉트되면 GitHub 버튼 클릭
  await page.waitForTimeout(2000)
  const currentUrl = page.url()
  console.log('현재 URL:', currentUrl)

  if (currentUrl.includes('sign-in') || currentUrl.includes('login') || currentUrl.includes('auth')) {
    console.log('🔑 Supabase 로그인 페이지 — GitHub 버튼 클릭...')

    // "Continue with GitHub" 버튼 찾아 클릭
    const githubBtn = page.locator('button:has-text("GitHub"), a:has-text("GitHub"), [data-provider="github"]').first()
    if (await githubBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await githubBtn.click()
      console.log('✅ GitHub 버튼 클릭 — GitHub에 이미 로그인되어 있으면 자동 통과됩니다...')
    } else {
      console.log('⚠️  GitHub 버튼을 찾지 못했습니다. 브라우저에서 직접 로그인하세요.')
    }

    // SQL Editor 로드될 때까지 대기 (최대 3분)
    console.log('⏳ SQL Editor 로드 대기 중 (최대 3분)...')
    await page.waitForURL(`**/project/${PROJECT_ID}/sql/**`, { timeout: 180000 })
    console.log('✅ Supabase SQL Editor 진입!')
  }

  // SQL Editor 에디터 로드 대기
  console.log('📝 에디터 로딩 대기...')
  await page.waitForSelector('.cm-content', { timeout: 30000 })
  await page.waitForTimeout(1500)

  // 기존 내용 전체 선택 후 SQL 붙여넣기
  console.log('✏️  SQL 붙여넣는 중...')
  await page.click('.cm-content')
  await page.keyboard.press('Control+a')
  await page.waitForTimeout(300)
  // clipboard API로 붙여넣기 (긴 SQL 타이핑보다 빠름)
  await page.evaluate((sql) => navigator.clipboard.writeText(sql), SQL)
  await page.keyboard.press('Control+v')
  await page.waitForTimeout(1000)

  // Run 버튼 클릭 (Ctrl+Enter)
  console.log('▶️  SQL 실행 (Ctrl+Enter)...')
  await page.keyboard.press('Control+Enter')

  // 결과 대기
  await page.waitForTimeout(6000)

  // 스크린샷 저장
  const screenshotPath = join(__dirname, 'migration_result.png')
  await page.screenshot({ path: screenshotPath, fullPage: false })
  console.log('📸 스크린샷 저장:', screenshotPath)

  // 결과 텍스트 읽기 시도
  const successMsg = await page.textContent('[data-testid="sql-editor-result"], .results-panel').catch(() => null)
  if (successMsg) console.log('📊 결과:', successMsg.slice(0, 200))

  console.log('\n✅ 완료! 브라우저에서 결과를 확인하세요. 15초 후 자동으로 닫힙니다.')
  await page.waitForTimeout(15000)
  await context.close()
})()
