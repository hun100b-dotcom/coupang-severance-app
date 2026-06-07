# MCP 토큰 자동 설정 스크립트
# PowerShell에서 실행: .\setup_mcp_tokens.ps1

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "           MCP 토큰 자동 설정 스크립트" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$mcpConfigPath = "$env:USERPROFILE\.claude\mcp.json"

# mcp.json 파일 읽기
if (-not (Test-Path $mcpConfigPath)) {
    Write-Host "ERROR: mcp.json 파일을 찾을 수 없습니다: $mcpConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] mcp.json 파일 로드 중..." -ForegroundColor Green
$mcpConfig = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json

# Notion Token 입력
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "NOTION MCP 설정" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "1. https://www.notion.so/my-integrations 접속" -ForegroundColor White
Write-Host "2. 'New Integration' 클릭" -ForegroundColor White
Write-Host "3. Name: CATCH Development, Workspace 선택" -ForegroundColor White
Write-Host "4. 생성된 'Internal Integration Secret' 복사" -ForegroundColor White
Write-Host ""

$notionToken = Read-Host "Notion Integration Token (secret_...)"

if ($notionToken -and $notionToken.StartsWith("secret_")) {
    $mcpConfig.mcpServers.notion.env.NOTION_API_KEY = $notionToken
    Write-Host "[OK] Notion 토큰 설정 완료!" -ForegroundColor Green
} else {
    Write-Host "[SKIP] Notion 토큰을 입력하지 않았거나 형식이 올바르지 않습니다." -ForegroundColor Yellow
}

# GitHub Token 입력
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "GITHUB MCP 설정" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "1. https://github.com/settings/tokens/new 접속" -ForegroundColor White
Write-Host "2. 'Generate new token (classic)' 선택" -ForegroundColor White
Write-Host "3. Scopes: repo, workflow, read:org 체크" -ForegroundColor White
Write-Host "4. 생성된 토큰 복사 (ghp_...)" -ForegroundColor White
Write-Host ""

$githubToken = Read-Host "GitHub Personal Access Token (ghp_...)"

if ($githubToken -and $githubToken.StartsWith("ghp_")) {
    $mcpConfig.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN = $githubToken
    Write-Host "[OK] GitHub 토큰 설정 완료!" -ForegroundColor Green
} else {
    Write-Host "[SKIP] GitHub 토큰을 입력하지 않았거나 형식이 올바르지 않습니다." -ForegroundColor Yellow
}

# mcp.json 저장
Write-Host ""
Write-Host "[2/3] mcp.json 파일 저장 중..." -ForegroundColor Green

# JSON 백업
$backupPath = "$mcpConfigPath.backup"
Copy-Item $mcpConfigPath $backupPath -Force
Write-Host "   백업 생성: $backupPath" -ForegroundColor Gray

# JSON 저장 (들여쓰기 포함)
$mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
Write-Host "   mcp.json 업데이트 완료!" -ForegroundColor Green

# Vercel 인증 안내
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "VERCEL MCP 설정" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "Vercel은 CLI 인증이 필요합니다." -ForegroundColor White
Write-Host "다음 명령어를 실행하세요:" -ForegroundColor White
Write-Host ""
Write-Host "  npx vercel login" -ForegroundColor Cyan
Write-Host ""

$runVercelLogin = Read-Host "지금 Vercel 인증을 실행하시겠습니까? (y/n)"

if ($runVercelLogin -eq "y" -or $runVercelLogin -eq "Y") {
    Write-Host ""
    Write-Host "[3/3] Vercel 인증 실행 중..." -ForegroundColor Green
    npx vercel login
} else {
    Write-Host "[SKIP] Vercel 인증을 나중에 실행하세요: npx vercel login" -ForegroundColor Yellow
}

# 완료
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "           MCP 토큰 설정 완료!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. VSCode에서 Ctrl+Shift+P" -ForegroundColor White
Write-Host "  2. 'Reload Window' 실행" -ForegroundColor White
Write-Host "  3. Claude Code 재시작" -ForegroundColor White
Write-Host ""
Write-Host "테스트 명령어:" -ForegroundColor Cyan
Write-Host "  - 'Notion CATCH 개발 태스크에서 진행 중인 작업 보여줘'" -ForegroundColor White
Write-Host "  - 'GitHub에서 최근 커밋 5개 보여줘'" -ForegroundColor White
Write-Host "  - 'Supabase profiles 테이블 구조 보여줘'" -ForegroundColor White
Write-Host ""
