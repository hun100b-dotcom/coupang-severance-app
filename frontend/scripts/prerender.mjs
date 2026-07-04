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

// 라우트 HTML 을 dist/<route>/index.html 로 즉시 기록. cleanUrls 로 /route → /route/index.html 서빙.
let WRITTEN = 0
function writeRoute(route, html) {
  const outDir = route === '/' ? DIST : path.join(DIST, route)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  WRITTEN++
}

// ★워치독: 어떤 이유로든(크로미움 launch 행·네비게이션 무한대기 등) 스크립트가
//   끝나지 않아 Vercel 빌드가 멈추는 것을 방지. 제한 시간 초과 시 강제 종료(exit 0).
//   .unref() 로 정상 완료 시엔 이 타이머가 프로세스를 붙잡지 않는다.
const WATCHDOG_MS = 300000
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
        // ★CMS 배너 차단: 어드민 배너/팝업(공개 API /cms/banners)이 켜진 상태로 빌드하면
        //   긴급공지 띠·팝업 오버레이가 SEO 스냅샷에 박제될 수 있다(2026-07-04 리뷰어 B).
        //   프리렌더에서는 해당 요청만 차단해 배너 없는 청정 스냅샷을 보장한다.
        await page.setRequestInterception(true)
        page.on('request', req => {
          if (req.url().includes('/cms/banners')) req.abort().catch(() => {})
          else req.continue().catch(() => {})
        })
        // ★대기 전략: networkidle0(네트워크 완전정지 500ms)는 Supabase/폰트/카카오 등
        //   상시 연결 때문에 서버리스에서 라우트당 15~24s로 과도하게 느림 → 워치독 초과.
        //   'load'(문서 로드 완료) + 콘텐츠 셀렉터 대기 + 짧은 settle 로 라우트당 2~4s 로 단축.
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load', timeout: 20000 })
        // 콘텐츠 정착: #root 자식 + h1 등장 대기(best-effort) + helmet/모션 settle(짧게)
        await page.waitForSelector('#root > *', { timeout: 8000 }).catch(() => {})
        await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {})
        await new Promise(r => setTimeout(r, 600))
        // 중복 head 태그 제거 — 정적 index.html 기본값 + Helmet per-page 가 병존하므로
        //   per-page(마지막) 하나만 남긴다(canonical/description/og/twitter). title 은 Helmet이 이미 단일화.
        await page.evaluate((routeArg) => {
          const keepLast = (sel) => {
            const els = [...document.head.querySelectorAll(sel)]
            els.slice(0, -1).forEach(e => e.remove())
          }
          ;[
            'link[rel="canonical"]', 'meta[name="description"]',
            'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[property="og:image"]',
            'meta[name="twitter:title"]', 'meta[name="twitter:description"]', 'meta[name="twitter:image"]',
          ].forEach(keepLast)
          // ★비홈 라우트: 정적 index.html의 콘텐츠 스키마(FAQPage/HowTo=홈 랜딩 전용)를 제거.
          //   각 하위페이지는 자체 per-page 스키마(Helmet 주입, 컴팩트 JSON)를 가지므로
          //   홈 FAQ가 중복·불일치로 실리는 것을 막는다. 단 사이트공통(WebApplication/
          //   Organization/WebSite)은 어느 페이지에나 유효하므로 유지.
          //   구분법: 정적 블록은 index.html에서 pretty-print(줄바꿈 포함) / Helmet 주입분은 컴팩트(줄바꿈 없음).
          if (routeArg !== '/') {
            document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
              const txt = s.textContent || ''
              const isStatic = /\n/.test(txt) // 정적(pretty-print)만 대상, Helmet 컴팩트는 보존
              if (isStatic && /"@type":\s*"(FAQPage|HowTo)"/.test(txt)) s.remove()
            })
          }
        }, route).catch(() => {})
        const html = await page.content()
        const rootChildren = await page.evaluate(() => document.getElementById('root')?.childElementCount || 0)
        const title = await page.title()
        // ★즉시 기록: 워치독이 중간에 강제종료해도 이미 렌더된 라우트는 파일로 남는다
        //   (기존: 전체 렌더 후 일괄 기록 → 워치독이 루프 도중 죽이면 0개 기록되던 버그).
        writeRoute(route, html)
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

  // 파일 기록은 루프 안에서 라우트별 즉시 수행됨(writeRoute). 여기선 집계만.
  console.log(`[prerender] 완료 — ${WRITTEN}/${ROUTES.length} 라우트 정적화`)
}

main().catch(e => { console.warn('[prerender] ⚠️ 예외 — SPA로 진행:', e?.message || e) })
// 항상 성공 종료(프리렌더 실패가 배포를 막지 않게)
process.exitCode = 0
