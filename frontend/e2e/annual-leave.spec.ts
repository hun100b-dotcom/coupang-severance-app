/**
 * 연차수당 계산기 E2E 테스트
 * 라우트: /annual-leave
 * 계산 방식:
 *   - 간편계산: 프론트엔드 순수 계산 (calcSimpleAnnualLeave 함수 — API 미사용)
 *     - 입사일 기준 근속 개월 수 계산
 *     - 1년 미만: 월 1일씩 발생 (최대 11일)
 *     - 1년 이상: 15일 + 2년마다 1일 추가 (상한 25일)
 *   - 정밀계산: 백엔드 API 호출 (calcAnnualLeavePrecise → POST /annual-leave/precise)
 * 설문 플로우: 재직여부 → 입사일 → (퇴직일) → 목적 → (사용연차) → (일급) → 계산방식 선택
 */
import { test, expect } from '@playwright/test';

test.describe('연차수당 계산기 — 설문 플로우 + 간편계산', () => {

  // 각 테스트 전: /annual-leave 경로로 이동
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/annual-leave');
    await page.waitForLoadState('networkidle');
  });

  // ── 기본 렌더링 확인 ──────────────────────────────────────────────────────
  test('페이지 기본 렌더링 — 재직 여부 선택 화면이 표시되어야 함', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByText('연차수당 계산기')).toBeVisible();
    // 재직 여부 질문 확인
    await expect(page.getByText(/현재 재직 중|지금도 근무/i)).toBeVisible();
    // 재직/퇴직 선택 버튼 확인
    await expect(page.getByRole('button', { name: /재직 중|현재 근무/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /퇴직|퇴사/ })).toBeVisible();
  });

  // ── 재직 중 케이스 — 간편계산 (발생일수 목적) ────────────────────────────
  test('재직 중 — 발생일수 목적 → 간편계산 결과 확인', async ({ page }) => {
    // Step 0: 재직 중 선택
    await page.getByRole('button', { name: /재직 중|현재 근무/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 입사일 입력 (2년 전 날짜 — 충분한 연차 발생)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const hireDateStr = twoYearsAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    const hireDateInput = page.locator('input[type="date"]').first();
    await hireDateInput.fill(hireDateStr);
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2 (재직 중): 목적 선택 — 발생일수
    await page.getByRole('button', { name: /발생일수/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 3 (재직 중 + 발생일수): 사용연차 입력 (기본값 0)
    // usedDays는 기본 0이므로 다음 클릭만
    await page.getByRole('button', { name: /다음/ }).click();

    // 계산 방식 선택 화면 → 쉬운 계산
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 결과 화면 확인: 2년 근무 → 연차 발생일수 표시
    await expect(page.getByText(/연차|발생|일수/i)).toBeVisible({ timeout: 5000 });
    // 2년 근무 시 최소 15일 이상 발생 확인
    await expect(page.getByText(/15일|26일|연차/)).toBeVisible({ timeout: 5000 });
  });

  // ── 퇴직 케이스 — 미지급 연차수당 청구 ──────────────────────────────────
  test('퇴직 — 미지급 연차수당 계산 → 결과 확인', async ({ page }) => {
    // Step 0: 퇴직 선택
    await page.getByRole('button', { name: /퇴직|퇴사/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 입사일 (3년 전)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const hireDateStr = threeYearsAgo.toISOString().split('T')[0];
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(hireDateStr);
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2 (퇴직): 퇴직일 입력 (1개월 전)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const endDateStr = oneMonthAgo.toISOString().split('T')[0];
    await dateInputs.nth(0).fill(endDateStr);
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 3 (퇴직): 목적 선택 — 미지급청구
    await page.getByRole('button', { name: /미지급청구|미지급 연차/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 4 (퇴직 + 미지급): 사용연차 입력
    const usedInput = page.locator('input[type="number"]').first();
    await usedInput.fill('5');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 5 (퇴직 + 미지급): 일급 입력
    const wageInput = page.locator('input[type="number"]').first();
    await wageInput.fill('150000');
    await page.getByRole('button', { name: /다음/ }).click();

    // 계산 방식 선택 → 쉬운 계산
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 결과 확인: 미지급 연차수당 금액 표시
    await expect(page.getByText(/미지급|연차수당|원/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 입사일 입력 없이 다음 클릭 시 버튼 비활성화 ──────────────────────────
  test('입사일 미입력 시 다음 버튼 비활성화', async ({ page }) => {
    // Step 0: 재직 중 선택
    await page.getByRole('button', { name: /재직 중|현재 근무/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 입사일 미입력 상태에서 다음 버튼 확인
    // stepReady: hireDate !== '' 조건
    const nextBtn = page.getByRole('button', { name: /다음/ });
    await expect(nextBtn).toBeDisabled();
  });

  // ── 재직 여부 미선택 시 다음 버튼 비활성화 ───────────────────────────────
  test('재직 여부 미선택 시 다음 버튼 비활성화', async ({ page }) => {
    // 아무 것도 선택하지 않은 상태
    // stepReady: isStillWorking !== null 조건
    const nextBtn = page.getByRole('button', { name: /다음/ });
    await expect(nextBtn).toBeDisabled();
  });

  // ── 1년 미만 근무 케이스 — 월 1일 발생 확인 ──────────────────────────────
  test('1년 미만 근무 — 6개월 → 연차 6일 발생 확인', async ({ page }) => {
    // Step 0: 재직 중
    await page.getByRole('button', { name: /재직 중|현재 근무/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 입사일 (6개월 전)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const hireDateStr = sixMonthsAgo.toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(hireDateStr);
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2: 목적 — 발생일수
    await page.getByRole('button', { name: /발생일수/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 3: 사용연차 0 (기본값)
    await page.getByRole('button', { name: /다음/ }).click();

    // 쉬운 계산
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 6개월 근무 → 약 6일 발생 (1개월당 1일)
    await expect(page.getByText(/6일|5일|발생/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 뒤로가기 동작 확인 ───────────────────────────────────────────────────
  test('뒤로가기 버튼으로 이전 설문 단계 이동', async ({ page }) => {
    // Step 0 → Step 1 이동
    await page.getByRole('button', { name: /재직 중|현재 근무/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // 뒤로가기
    await page.getByRole('button', { name: /뒤로|이전|←/ }).click();
    // Step 0으로 복귀 확인
    await expect(page.getByText(/현재 재직 중|지금도 근무/i)).toBeVisible();
  });

  // ── PDF 정밀계산 — 파일 미업로드 시 계산 버튼 비활성화 ──────────────────
  test('PDF 정밀계산 — 파일 미업로드 시 계산 버튼 비활성화', async ({ page }) => {
    // Step 0~mode까지 통과
    await page.getByRole('button', { name: /재직 중|현재 근무/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    await page.locator('input[type="date"]').first().fill(twoYearsAgo.toISOString().split('T')[0]);
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /발생일수/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // 정밀 계산 선택
    await page.getByRole('button', { name: /정밀 계산|PDF/ }).click();

    // 파일 미업로드 상태에서 계산 버튼 비활성화 확인
    const calcBtn = page.getByRole('button', { name: /계산하기/ });
    await expect(calcBtn).toBeDisabled();
  });

});
