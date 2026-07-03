// puppeteer 설정 (P1 프리렌더)
//   ★skipDownload: 설치 시 크로미움 자동 다운로드를 끈다.
//     - Vercel(Linux) 빌드: 프리렌더는 @sparticuz/chromium 을 쓰므로 puppeteer 번들 크로미움이 불필요.
//       설치 단계의 대용량 크로미움 다운로드(=Vercel install 실패 원인)를 제거해 빌드를 안정화한다.
//     - 로컬(Windows/Mac): 이미 캐시된 크로미움을 사용. 새 환경에선 `npx puppeteer browsers install chrome` 로 1회 설치.
//   cacheDirectory: 로컬 크로미움 캐시를 프로젝트 내부에 둔다.
const { join } = require('path')
module.exports = {
  skipDownload: true,
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
}
