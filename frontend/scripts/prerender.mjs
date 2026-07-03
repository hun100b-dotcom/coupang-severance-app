// ============================================================
// prerender.mjs — 빌드 후 정적 프리렌더 (P1 SEO)
//   목적: 순수 SPA라 크롤러가 빈 <body>(<div id=root>)만 받던 문제 해결.
//         빌드 산출물(dist)을 로컬 정적 서버로 띄우고 헤드리스 크롬으로 공개 SEO 라우트를
//         렌더 → 각 라우트의 "완성 HTML"(제목·H1·본문·per-page 메타·JSON-LD 포함)을
//         dist/<route>/index.html 로 저장한다. 앱 코드는 무변경(스냅샷 방식).
//   ⚠️ 실패해도 배포를 막지 않도록 exit 0 (프리렌더 실패 시 SPA로 graceful). 단 경고를 크게 남긴다.
//   ⚠️ 계산 로직·데이터 무관. 로그인/관리자/동적 라우트는 대상 제외.
// ============================================================
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '..', 'dist')
const PORT = 4321

// ★워치독: 어떤 이유로든(크로미움 launch 행·네비게이션 무한대기 등) 스크립트가
//   끝나지 않아 Vercel 빌드가 멈추는 것을 방지. 제한 시간 초과 시 강제 종료(exit 0).
//   .unref() 로 정상 완료 시엔 이 타이머가 프로세스를 붙잡지 않는다.
const WATCHDOG_MS = 150000
setTimeout(() => {
  console.warn(`[prerender] ⏱️ 워치독 ${WATCHDOG_MS}ms 초과 — 강제 종료(빌드 계속). SPA 폴백.`)
  process.exit(0)
}, WATCHDOG_MS).unref()

// 프리렌더 대상 — 공개·정적 SEO 콘텐츠 라우트만(인증/관리자/동적 제외)
const ROUTES = [
  '/',
  // 키워드 랜딩(6)
  '/coupang-severance-calculator',
  '/coupang-unemployment-calculator',
  '/day-worker-severance-guide',
  '/coupang-part-time-severance-method',
  '/daily-worker-severance-28days',
  '/coupang-cfs-severance-calculation',
  // 가이드(5)
  '/guide',
  '/guide/severance',
  '/guide/unemployment',
  '/guide/weekly-allowance',
  '/guide/annual-leave',
  // 계산기 진입(5) — 미인증 시 공개 콘텐츠 렌더(OnboardingGuard는 로그인+미온보딩만 리다이렉트)
  '/severance',
  '/unemployment',
  '/weekly-allowance',
  '/annual-leave',
  '/calculator',
]

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
}

// dist 를 서빙하는 초경량 정적 서버(의존성 없음). 파일 없으면 SPA fallback → index.html.
function startServer() {
  const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'))
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      let filePath = path.join(DIST, urlPath)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(fs.readFileSync(filePath))
        return
      }
      // 파일 없음 → SPA fallback(원본 index.html 셸). 클라이언트 라우팅이 해당 라우트를 렌더.
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(indexHtml)
    } catch (e) {
      res.writeHead(500); res.end('err')
    }
  })
  return new Promise(resolve => server.listen(PORT, () => resolve(server)))
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.warn('[prerender] dist/index.html 없음 — 건너뜀'); return
  }

  const server = await startServer()
  let browser
  const results = [] // { route, html }
  try {
    // 플랫폼 분기 launch:
    //   - Vercel/CI(Linux): puppeteer-core + @sparticuz/chromium(서버리스 호환 크로미움).
    //     번들 puppeteer 크로미움은 Vercel 빌드환경 공유라이브러리 부재로 실행 실패 →
    //     @sparticuz 는 필요한 라이브러리를 포함한 크로미움을 제공.
    //   - 로컬(Windows/Mac): puppeteer(풀) 번들 크로미움.
    if (process.platform === 'linux') {
      const puppeteerCore = (await import('puppeteer-core')).default
      const chromium = (await import('@sparticuz/chromium')).default
      const executablePath = await chromium.executablePath()
      browser = await puppeteerCore.launch({
        executablePath,
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: chromium.headless,
        defaultViewport: { width: 1280, height: 900 },
      })
      console.log('[prerender] chromium: @sparticuz (linux)')
    } else {
      const puppeteer = (await import('puppeteer')).default
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
      console.log('[prerender] chromium: puppeteer bundled (' + process.platform + ')')
    }
    for (const route of ROUTES) {
      try {
        const page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 900 })
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 })
        // 콘텐츠 정착: h1 또는 #root 자식 등장 대기(best-effort) + helmet/모션 settle
        await page.waitForSelector('#root > *', { timeout: 15000 }).catch(() => {})
        await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {})
        await new Promise(r => setTimeout(r, 1200))
        // 중복 head 태그 제거 — 정적 index.html 기본값 + Helmet per-page 가 병존하므로
        //   per-page(마지막) 하나만 남긴다(canonical/description/og/twitter). title 은 Helmet이 이미 단일화.
        await page.evaluate(() => {
          const keepLast = (sel) => {
            const els = [...document.head.querySelectorAll(sel)]
            els.slice(0, -1).forEach(e => e.remove())
          }
          ;[
            'link[rel="canonical"]', 'meta[name="description"]',
            'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]',
            'meta[name="twitter:title"]', 'meta[name="twitter:description"]', 'meta[name="twitter:image"]',
          ].forEach(keepLast)
        }).catch(() => {})
        const html = await page.content()
        results.push({ route, html })
        const rootChildren = await page.evaluate(() => document.getElementById('root')?.childElementCount || 0)
        const title = await page.title()
        console.log(`[prerender] ✓ ${route.padEnd(40)} rootChildren=${rootChildren} title="${title.slice(0, 40)}"`)
        await page.close()
      } catch (e) {
        console.warn(`[prerender] ⚠️ ${route} 실패(건너뜀):`, e.message)
      }
    }
  } catch (e) {
    console.warn('[prerender] ⚠️ 브라우저 실행 실패 — SPA로 진행:', e.message)
  } finally {
    if (browser) await browser.close().catch(() => {})
    server.close()
  }

  // 스냅샷을 파일로 기록(모든 렌더 완료 후 일괄 → 중간 간섭 방지)
  let written = 0
  for (const { route, html } of results) {
    const outDir = route === '/' ? DIST : path.join(DIST, route)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'index.html'), html)
    written++
  }
  console.log(`[prerender] 완료 — ${written}/${ROUTES.length} 라우트 정적화`)
}

main().catch(e => { console.warn('[prerender] ⚠️ 예외 — SPA로 진행:', e?.message || e) })
// 항상 성공 종료(프리렌더 실패가 배포를 막지 않게)
process.exitCode = 0
