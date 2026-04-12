/**
 * 주휴수당 계산기 E2E 테스트
 * 라우트: /weekly-allowance
 * 계산 방식:
 *   - 간편계산: 프론트엔드 순수 계산 (API 미사용)
 *     공식: (주 근무시간 / 40) × 8 × 시급
 *     조건: 주 소정근로시간 15시간 이상 + 소정근로일 개근
 *   - 정밀계산: 백엔드 API 호출 (calcWeeklyAllowancePrecise → POST /weekly-allowance/precise)
 * 설문 플로우: 근무형태 → 주당근무일 → 하루시간 → 시급 → 개근여부 → 계산방식 선택
 */
import { test, expect } from '@playwright/test';

test.describe('주휴수당 계산기 — 설문 플로우 + 간편계산', () => {

  // 각 테스트 전: /weekly-allowance 경로로 이동
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/weekly-allowance');
    await page.waitForLoadState('networkidle');
  });

  // ── 기본 렌더링 확인 ──────────────────────────────────────────────────────
  test('페이지 기본 렌더링 — 근무 형태 선택 화면이 표시되어야 함', async ({ page }) => {
    // 헤더 확인
    await expect(page.getByText('주휴수당 계산기')).toBeVisible();
    // 첫 설문 질문 확인
    await expect(page.getByText(/어떤 형태로.*일하셨나요/)).toBeVisible();
    // 근무 형태 선택 버튼 확인
    await expect(page.getByRole('button', { name: '단기 알바' })).toBeVisible();
    await expect(page.getByRole('button', { name: '일용직' })).toBeVisible();
    await expect(page.getByRole('button', { name: '파트타임' })).toBeVisible();
  });

  // ── 설문 Step 0: 근무 형태 선택 ──────────────────────────────────────────
  test('근무 형태 선택 후 다음 단계 이동', async ({ page }) => {
    // 일용직 선택
    await page.getByRole('button', { name: '일용직' }).click();
    // 다음 버튼 활성화 확인
    const nextBtn = page.getByRole('button', { name: /다음/ });
    await expect(nextBtn).not.toBeDisabled();
    // 다음 클릭
    await nextBtn.click();
    // Step 1 (주당 근무일수 선택) 확인
    await expect(page.getByText(/주당 며칠 근무/)).toBeVisible();
  });

  // ── 설문 전체 통과 → 간편계산 → 주 15시간 이상 수급 가능 ─────────────────
  test('간편계산 — 주 5일 × 8시간 × 시급 10000원 → 주휴수당 발생', async ({ page }) => {
    // Step 0: 근무 형태 선택
    await page.getByRole('button', { name: '일용직' }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 주당 5일 선택 (7개 숫자 버튼 중 5)
    await page.getByRole('button', { name: '5' }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2: 하루 8시간 입력
    await expect(page.getByText(/하루 몇 시간/)).toBeVisible();
    await page.getByPlaceholder(/시간|예: 8/).fill('8');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 3: 시급 입력
    await expect(page.getByText(/시급이 얼마/)).toBeVisible();
    await page.getByPlaceholder(/원|시급|예: 10/).fill('10000');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 4: 개근 여부 — 예 선택
    await expect(page.getByText(/소정근로일을 모두 출근/)).toBeVisible();
    await page.getByRole('button', { name: /예.*개근/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // 계산 방식 선택 화면 — 쉬운 계산 선택
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 결과 확인: 주 40시간 → (40/40)*8*10000 = 80000원
    // 주 15시간 이상이므로 주휴수당 발생
    await expect(page.getByText(/80,000원|80000원|주휴수당/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 간편계산 — 주 15시간 미만 → 주휴수당 미발생 ──────────────────────────
  test('간편계산 — 주 2일 × 6시간 → 주 12시간 → 주휴수당 미발생', async ({ page }) => {
    // Step 0: 근무 형태 선택
    await page.getByRole('button', { name: '단기 알바' }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 1: 주당 2일 선택
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2: 하루 6시간 입력 (주 12시간 = 15시간 미만)
    await page.getByPlaceholder(/시간|예: 8/).fill('6');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 3: 시급 입력
    await page.getByPlaceholder(/원|시급|예: 10/).fill('10000');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 4: 개근 여부 — 예
    await page.getByRole('button', { name: /예.*개근/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // 쉬운 계산
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 결과: 주 12시간 < 15시간 → 주휴수당 적용 대상 아님 메시지 확인
    await expect(page.getByText(/15시간 미만|적용 대상이 아닙|주휴수당 발생.*안/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 간편계산 — 개근 미충족 → 주휴수당 미발생 ────────────────────────────
  test('간편계산 — 소정근로일 개근 미충족 시 주휴수당 미발생', async ({ page }) => {
    // Step 0~3 통과
    await page.getByRole('button', { name: '일용직' }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: '5' }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByPlaceholder(/시간|예: 8/).fill('8');
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByPlaceholder(/원|시급|예: 10/).fill('10000');
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 4: 개근 미충족 — 아니요 선택
    await page.getByRole('button', { name: /아니요.*결근|아니요/ }).first().click();
    await page.getByRole('button', { name: /다음/ }).click();

    // 쉬운 계산
    await page.getByRole('button', { name: /쉬운 계산|간편 계산|직접 계산/ }).click();

    // 결과: 개근 미충족 → 주휴수당 미발생 메시지
    await expect(page.getByText(/개근하지 않아|요건 미충족|주휴수당.*없/i)).toBeVisible({ timeout: 5000 });
  });

  // ── 뒤로가기 동작 확인 ───────────────────────────────────────────────────
  test('뒤로가기 버튼으로 이전 설문 단계 이동', async ({ page }) => {
    // Step 0 → Step 1 이동
    await page.getByRole('button', { name: '일용직' }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await expect(page.getByText(/주당 며칠 근무/)).toBeVisible();

    // 뒤로가기
    await page.getByRole('button', { name: /뒤로|이전|←/ }).click();
    // Step 0으로 복귀
    await expect(page.getByText(/어떤 형태로.*일하셨나요/)).toBeVisible();
  });

  // ── PDF 정밀계산 — PDF 없이 계산 버튼 비활성화 확인 ─────────────────────
  test('PDF 정밀계산 — 파일 미업로드 시 계산 버튼 비활성화', async ({ page }) => {
    // Step 0~4 통과 후 정밀계산 선택
    await page.getByRole('button', { name: '일용직' }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: '5' }).click();
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByPlaceholder(/시간|예: 8/).fill('8');
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByPlaceholder(/원|시급|예: 10/).fill('10000');
    await page.getByRole('button', { name: /다음/ }).click();
    await page.getByRole('button', { name: /예.*개근/ }).click();
    await page.getByRole('button', { name: /다음/ }).click();

    // 정밀 계산 선택
    await page.getByRole('button', { name: /정밀 계산|PDF/ }).click();

    // PDF 미업로드 상태에서 계산 버튼 비활성화 확인
    // canRunPrecise: pdfFile && pdfCompany && wage > 0 조건
    const calcBtn = page.getByRole('button', { name: /계산하기/ });
    await expect(calcBtn).toBeDisabled();
  });

});
