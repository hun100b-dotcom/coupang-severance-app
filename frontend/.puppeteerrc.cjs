// puppeteer 크로미움 캐시를 프로젝트 내부에 둠 → Vercel 빌드에서 node_modules 캐시와 함께 재사용.
const { join } = require('path')
module.exports = { cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer') }
