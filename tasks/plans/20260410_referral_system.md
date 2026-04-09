# 추천인 시스템 구축

> 작성일: 2026-04-10

## 요구사항

- [x] 사용자별 고유 추천 코드 생성 (6자리 영숫자, 대문자+숫자)
- [x] 추천 링크: `https://catch-daily-worker.vercel.app?ref=XXXXXX`
- [x] 추천 링크로 가입 시 추천인 기록 (referrer → referred 관계 저장)
- [x] 마이페이지 포인트 탭에 추천 현황 섹션 표시 (내 추천 코드, 추천한 사람 수, 복사 버튼)
- [x] Supabase DB: `user_referrals` 테이블 + `profiles.referral_code` 컬럼 마이그레이션
- [x] RLS 정책 (본인 데이터만 조회, 가입 시 INSERT 허용)
- [x] 중복 추천 방지 (referred_id UNIQUE 제약)

---

## 영향 범위

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/20260410_referral_system.sql` | 신규: user_referrals 테이블 + profiles.referral_code 컬럼 + RLS |
| `frontend/src/lib/referral.ts` | 신규: 추천 코드 생성/조회 유틸 함수 |
| `frontend/src/pages/auth/callback.tsx` | 수정: ?ref= 파라미터 감지 → localStorage 임시 저장 |
| `frontend/src/pages/Onboarding.tsx` | 수정: 온보딩 완료 시 localStorage에서 ref코드 읽어 DB 기록 |
| `frontend/src/components/mypage/MyRewardsTab.tsx` | 수정: 추천 현황 섹션 추가 (내 코드 + 추천 수 + 복사 버튼) |

---

## 구현 계획

### 1단계: Supabase 마이그레이션 (`20260410_referral_system.sql`)

```sql
-- profiles 테이블에 referral_code 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 코드 생성 함수 (6자리 영숫자 대문자)
CREATE OR REPLACE FUNCTION generate_referral_code() ...

-- user_referrals 테이블 생성
CREATE TABLE public.user_referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES auth.users(id),
  referred_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id),  -- 1인 1추천만 가능
  referral_code TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS 정책 추가
```

### 2단계: 추천 코드 유틸 (`frontend/src/lib/referral.ts`)

- `ensureReferralCode(userId)` — profiles에 코드 없으면 자동 생성 후 저장
- `saveReferral(referredId, refCode)` — 추천 관계 DB에 저장 (중복 무시)
- `getReferralStats(userId)` — 내 코드 + 추천한 사람 수 조회

### 3단계: URL `?ref=` 파라미터 처리 (`callback.tsx`)

```
URL: catch-daily-worker.vercel.app?ref=ABC123
 → OAuth 로그인 시작 전 ref 값을 localStorage['pending_ref_code']에 저장
 → 콜백 완료 후에도 계속 보존
```

- `Login.tsx`: 페이지 마운트 시 `?ref=` URL 파라미터 감지 → `localStorage.setItem('pending_ref_code', code)`

### 4단계: 온보딩 완료 시 추천 관계 저장 (`Onboarding.tsx`)

```
온보딩 완료(profiles 업데이트) → localStorage['pending_ref_code'] 읽기
 → saveReferral(userId, refCode) 호출
 → localStorage 클리어
```

### 5단계: 마이페이지 추천 현황 UI (`MyRewardsTab.tsx`)

```
[내 추천 링크]
┌─────────────────────────────────────────┐
│ 👥 친구 추천하기                          │
│ 내 코드: ABC123  [복사]                  │
│ 추천한 친구: 3명                         │
│ https://catch-daily-worker.vercel.app   │
│ ?ref=ABC123  [링크 복사]                │
└─────────────────────────────────────────┘
```

---

## 데이터 흐름

```
1. A가 추천 링크 공유: ?ref=ABC123
2. B가 링크 클릭 → Login 페이지에서 ref 파라미터 localStorage 저장
3. B가 카카오/구글 로그인 → OAuth 콜백 → 온보딩 이동
4. B가 온보딩 완료 → saveReferral(B.id, 'ABC123') 호출
5. user_referrals에 (referrer=A, referred=B, code='ABC123') INSERT
6. A의 마이페이지에서 추천 수 +1 확인
```

---

## 리스크

- **ref 파라미터 손실**: OAuth redirect 시 URL 파라미터가 소실될 수 있음 → Login 페이지 진입 즉시 localStorage에 저장하면 OAuth 흐름 전체에서 유지됨
- **중복 추천 방지**: `referred_id UNIQUE` 제약 + ON CONFLICT DO NOTHING으로 안전하게 처리
- **기존 사용자 코드**: 코드 없는 기존 사용자는 마이페이지 첫 접근 시 `ensureReferralCode()`가 자동 생성
- **코드 충돌**: UNIQUE 제약 + 충돌 시 재시도 로직으로 처리

---

## 검증 기준

- [ ] profiles 테이블에 referral_code 컬럼 존재 + UNIQUE 제약
- [ ] user_referrals 테이블 RLS: 본인 referrer_id만 SELECT, INSERT는 자신 referred_id만
- [ ] 마이페이지 포인트 탭에 추천 현황 섹션 렌더링
- [ ] 추천 코드 복사 버튼 클릭 시 클립보드에 링크 복사
- [ ] `?ref=` 파라미터 없는 일반 가입은 referral 저장 안 함 (정상)
- [ ] 이미 추천된 사용자가 재가입 시도해도 중복 INSERT 안 됨
- [ ] TypeScript 빌드 에러 없음
