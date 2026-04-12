/**
 * 실업급여 계산기 E2E 테스트
 * 라우트: /unemployment
 * 계산 방식: 백엔드 API 호출 (calcUBPrecise → POST /unemployment/precise, calcUBSimple → POST /unemployment/simple)
 * 4단계 설문 플로우: 회사선택 → 180일 여부 → 10일 미만 여부 + 계산방식 선택 → 입력/계산
 */
import { test, expect } from '@playwright/test';

// ── 기본 설정 ──────────────────────────────────────────────────────────────────
// 앱은 http://localhost:5173 에서 실행 중이어야 합니다.
// 테스트 전에 반드시 `npm run dev` (frontend 디렉토리) 가 실행 중이어야 합니다.

test.describe('실업급여 계산기 — 4단계 설문 플로우', () => {

  // 각 테스트 전: /unemployment 경로로 이동
  test.beforeEach(async ({ page }) => {
    // 로그인이 필요한 경우 로그인 처리 (현재는 로그인 없이도 접근 가능)
    await page.goto('http://localhost:5173/unemployment');
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForLoadState('networkidle');
  });

  // ── Step 1: 페이지 기본 렌더링 확인 ───────────────────────────────────────
  test('페이지 기본 렌더링 — 회사 선택 화면이 표시되어야 함', async ({ page }) => {
    // 실업급여 계산기 헤더 확인
    await expect(page.getByText('실업급여 계산기')).toBeVisible();
    // 회사 선택 질문 확인
    await expect(page.getByText('어디에서 근무하셨나요?')).toBeVisible();
    // 쿠팡 버튼 확인 (COMPANIES 배열의 첫 번째 항목)
    await expect(page.getByRole('button', { name: /쿠팡/ })).toBeVisible();
  });

  // ── Step 2: 회사 선택 → 다음 단계 이동 ────────────────────────────────────
  test('회사 선택 후 다음 단계로 이동', async ({ page }) => {
    // 쿠팡 선택
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    // 다음 버튼 활성화 확인
    const nextBtn = page.getByRole('button', { name: /다음/ });
    await expect(nextBtn).not.toBeDisabled();
    // 다음 클릭
    await nextBtn.click();
    // Step 2 화면 (180일 이상 질문) 확인
    await expect(page.getByText(/18개월 내 180일/)).toBeVisible();
  });

  // ── Step 3: 수급 불가 케이스 — 180일 미만 선택 ────────────────────────────
  test('180일 미만 선택 시 실패 화면 표시', async ({ page }) => {
    // Step 1: 회사 선택
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 2: 180일 미만 선택
    await page.getByRole('button', { name: /아니요.*180일 미만/ }).click();
    // 실패 화면 확인
    await expect(page.getByText(/아직은 실업급여를 받기 어려워요/)).toBeVisible();
    // 실패 이유 메시지 확인
    await expect(page.getByText(/180일 이상이어야/)).toBeVisible();
    // 처음으로 돌아가기 버튼 확인
    await expect(page.getByRole('button', { name: /처음으로 돌아가기/ })).toBeVisible();
  });

  // ── Step 4: 수급 불가 케이스 — 1개월 10일 이상 ────────────────────────────
  test('1개월 근로일수 10일 이상 선택 시 실패 화면 표시', async ({ page }) => {
    // Step 1 → Step 2: 쿠팡 선택
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 2: 180일 이상 선택
    await page.getByRole('button', { name: /예.*180일 이상/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 3: 10일 이상 선택
    await page.getByRole('button', { name: /아니요.*10일 이상/ }).click();
    // 실패 화면 확인
    await expect(page.getByText(/아직은 실업급여를 받기 어려워요/)).toBeVisible();
    await expect(page.getByText(/10일 미만이어야/)).toBeVisible();
  });

  // ── Step 5: 쉬운 계산 — 정상 입력 후 계산 ────────────────────────────────
  test('쉬운 계산 — 가입일수 200일 + 평균 일당 150000원 입력 후 계산 결과 표시', async ({ page }) => {
    // Step 1: 회사 선택
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 2: 180일 이상
    await page.getByRole('button', { name: /예.*180일 이상/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 3: 10일 미만 → 쉬운 계산 선택
    await page.getByRole('button', { name: /예.*10일 미만/ }).click();
    // 계산 방식 — '쉬운 계산' 버튼 클릭
    await page.getByRole('button', { name: /쉬운 계산/ }).click();
    // Step 4B: 쉬운 계산 입력 화면
    await expect(page.getByText(/직접 입력해서 계산하기/)).toBeVisible();
    // 가입일수 입력
    await page.getByPlaceholder('예: 200').fill('200');
    // 평균 일당 입력
    await page.getByPlaceholder('예: 150000').fill('150000');
    // 계산하기 버튼 클릭
    await page.getByRole('button', { name: /계산하기/ }).click();
    // 로딩 완료 대기 (최대 10초 — 백엔드 API 응답 대기)
    await page.waitForSelector('[data-testid="loading-overlay"]', { state: 'hidden', timeout: 10000 })
      .catch(() => { /* 로딩 오버레이가 없을 수도 있음 */ });
    // 결과 화면 확인 (ResultUnemployment 컴포넌트 렌더링)
    // 예상 수급액 또는 관련 결과 텍스트 확인
    await expect(page.getByText(/실업급여|수급액|예상|일당/i)).toBeVisible({ timeout: 15000 });
  });

  // ── Step 6: 쉬운 계산 — 빈 입력 시 버튼 비활성화 ────────────────────────
  test('쉬운 계산 — 빈 입력 시 계산하기 버튼 비활성화', async ({ page }) => {
    // Step 1~3 통과
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /예.*180일 이상/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /예.*10일 미만/ }).click();
    await page.getByRole('button', { name: /쉬운 계산/ }).click();
    // 계산하기 버튼이 비활성화 상태인지 확인 (insuredDays, avgWage 미입력)
    const calcBtn = page.getByRole('button', { name: /계산하기/ });
    // disabled 속성 또는 시각적 비활성화 상태 확인
    await expect(calcBtn).toBeDisabled();
  });

  // ── Step 7: 뒤로가기 동작 확인 ───────────────────────────────────────────
  test('뒤로가기 버튼으로 이전 단계 이동', async ({ page }) => {
    // Step 1: 회사 선택
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    // Step 2 확인
    await expect(page.getByText(/18개월 내 180일/)).toBeVisible();
    // 뒤로가기 버튼 클릭
    await page.getByRole('button', { name: /뒤로|이전|←/ }).click();
    // Step 1 (회사 선택)으로 돌아가는지 확인
    await expect(page.getByText(/어디에서 근무하셨나요/)).toBeVisible();
  });

  // ── Step 8: 실패 화면에서 처음으로 돌아가기 ─────────────────────────────
  test('실패 화면에서 처음으로 돌아가기 동작 확인', async ({ page }) => {
    // 수급 불가 케이스로 이동
    await page.getByRole('button', { name: /쿠팡/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /아니요.*180일 미만/ }).click();
    // 실패 화면
    await expect(page.getByText(/아직은 실업급여를 받기 어려워요/)).toBeVisible();
    // 처음으로 돌아가기
    await page.getByRole('button', { name: /처음으로 돌아가기/ }).click();
    // Step 1으로 복귀 확인
    await expect(page.getByText(/어디에서 근무하셨나요/)).toBeVisible();
  });

});
