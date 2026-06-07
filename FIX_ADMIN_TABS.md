# 🔧 CATCH 어드민 페이지 탭 정상화 가이드

## 📋 문제 상황

현재 어드민 페이지(`https://catch-daily-worker.vercel.app/admin`)에서 일부 탭만 표시되고 있습니다.

**원인**: `admin_accounts` 테이블이 비어있어 슈퍼 관리자 계정이 등록되지 않음

## ✅ 해결 방법

### Step 1: Supabase SQL Editor 열기

아래 링크를 클릭하여 Supabase SQL Editor를 새 탭에서 엽니다:

👉 **https://supabase.com/dashboard/project/hmjxrqhcwjyfkvlcejfc/sql/new**

(Google 계정으로 로그인 필요)

---

### Step 2: SQL 복사 & 실행

아래 SQL을 전체 복사한 후, SQL Editor에 붙여넣고 **RUN** 버튼을 클릭하세요:

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CATCH Admin Accounts Setup
-- 어드민 페이지 탭 정상화를 위한 DB 설정
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. 슈퍼 관리자 계정 등록
INSERT INTO public.admin_accounts (email, role, display_name, is_active)
VALUES ('catchmasterdmin@gmail.com', 'super_admin', '최고 관리자', true)
ON CONFLICT (email) DO UPDATE
  SET role = 'super_admin',
      is_active = true,
      updated_at = now();

-- 2. permission_levels 설정 (커스텀 권한 시스템)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'permission_levels',
  '{"super_admin":{"label":"슈퍼 관리자","color":"#f04040","permissions":{"dashboard":true,"target":true,"inquiries":true,"notices":true,"members":true,"accounts":true,"settings":true,"audit_logs":true,"server_logs":true}},"admin":{"label":"관리자","color":"#3182f6","permissions":{"dashboard":true,"target":true,"inquiries":true,"notices":true,"members":true,"accounts":false,"settings":false,"audit_logs":false,"server_logs":false}},"viewer":{"label":"뷰어","color":"#6b7280","permissions":{"dashboard":true,"target":false,"inquiries":true,"notices":false,"members":false,"accounts":false,"settings":false,"audit_logs":false,"server_logs":false}}}',
  '관리자 권한 레벨 정의 (JSON) — Settings 탭에서 관리'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();

-- 3. member_unmask_key 설정 (회원 개인정보 마스킹 해제 키)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'member_unmask_key',
  '',
  '회원 개인정보 마스킹 해제 보안키 — 슈퍼 관리자만 설정/조회 가능'
)
ON CONFLICT (key) DO NOTHING;

-- 4. is_super_admin() 함수 업데이트
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    auth.email() = 'catchmasterdmin@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.admin_accounts
      WHERE email = auth.email()
        AND role = 'super_admin'
        AND is_active = true
    );
$$;

-- 5. admin_accounts role 제약 완화 (커스텀 역할 지원)
ALTER TABLE public.admin_accounts
  DROP CONSTRAINT IF EXISTS admin_accounts_role_check;
ALTER TABLE public.admin_accounts
  ADD CONSTRAINT admin_accounts_role_notempty CHECK (char_length(trim(role)) > 0);

-- 6. system_settings RLS 정책 설정 (모든 사용자 읽기 허용)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_public" ON public.system_settings;
CREATE POLICY "system_settings_select_public"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_settings_write_admin" ON public.system_settings;
CREATE POLICY "system_settings_write_admin"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 완료!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 확인 쿼리 (선택사항)
SELECT
  email,
  role,
  display_name,
  is_active,
  created_at
FROM public.admin_accounts
ORDER BY created_at DESC;
```

---

### Step 3: 실행 결과 확인

SQL 실행 후 아래와 같은 결과가 표시되어야 합니다:

```
email                        | role        | display_name  | is_active | created_at
----------------------------|-------------|---------------|-----------|------------------
catchmasterdmin@gmail.com   | super_admin | 최고 관리자    | true      | 2026-03-27 ...
```

---

### Step 4: 어드민 페이지 새로고침

1. **catchmasterdmin@gmail.com** 계정으로 로그인
2. https://catch-daily-worker.vercel.app/admin 접속
3. **Ctrl+Shift+R** (강제 새로고침)

---

## 🎯 기대 효과

SQL 실행 후 다음 탭들이 **모두** 표시되어야 합니다:

### 일반 관리자 탭 (모든 관리자)
- ✅ **Dashboard** — 서비스 핵심 지표
- ✅ **Target** — 광고게재
- ✅ **Inquiries** — 1:1 문의 관리
- ✅ **공지사항 (Notices)** — 공지사항 CMS
- ✅ **회원 관리 (Members)** — 회원 목록 및 태그

### 슈퍼 관리자 전용 탭 (catchmasterdmin@gmail.com만)
- 🔴 **관리자 계정 (Accounts)** — 관리자 계정 추가/수정/삭제
- 🔴 **Settings** — 시스템 설정 (권한 레벨, 마스킹 키 등)
- 🔴 **Audit Logs** — 관리자 행동 감사 로그
- 🔴 **Server Logs** — 배포 이력 및 시스템 로그

---

## 🔍 트러블슈팅

### 문제 1: SQL 실행 시 권한 오류

**에러**: `permission denied for table admin_accounts`

**해결**: Supabase Dashboard에서 **Owner** 권한이 있는 계정으로 로그인했는지 확인

---

### 문제 2: 탭이 여전히 보이지 않음

**체크리스트**:
1. ✅ SQL이 모두 성공적으로 실행되었는가?
2. ✅ `admin_accounts` 테이블에 `catchmasterdmin@gmail.com` 계정이 등록되었는가?
3. ✅ 어드민 페이지에서 로그아웃 후 재로그인했는가?
4. ✅ 브라우저 캐시를 완전히 지웠는가? (Ctrl+Shift+Delete)

---

### 문제 3: 일부 탭만 보임 (Accounts, Settings 등 누락)

**원인**: 일반 관리자 계정으로 로그인함

**해결**: **catchmasterdmin@gmail.com** 계정으로 로그인 필요 (슈퍼 관리자 전용 탭)

---

## 📌 참고 사항

### 권한 레벨 시스템

| 역할 | Dashboard | Target | Inquiries | Notices | Members | Accounts | Settings | Audit Logs | Server Logs |
|------|-----------|--------|-----------|---------|---------|----------|----------|------------|-------------|
| **슈퍼 관리자** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **관리자** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **뷰어** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 추가 관리자 등록 방법

슈퍼 관리자 로그인 후:
1. **Accounts** 탭 이동
2. **+ 계정 추가** 버튼 클릭
3. 이메일, 권한 레벨 입력 후 저장

---

## ✅ 완료 확인

아래 체크리스트를 모두 확인하세요:

- [ ] Supabase SQL Editor에서 SQL 실행 완료
- [ ] `admin_accounts` 테이블에 슈퍼 관리자 계정 등록 확인
- [ ] `system_settings` 테이블에 `permission_levels`, `member_unmask_key` 키 등록 확인
- [ ] catchmasterdmin@gmail.com 계정으로 로그인
- [ ] 어드민 페이지에서 모든 9개 탭 표시 확인
- [ ] 슈퍼 관리자 전용 탭 (Accounts, Settings, Audit Logs, Server Logs) 접근 가능 확인

---

**문서 작성일**: 2026-03-27
**마이그레이션 파일**: `supabase/migrations/005_super_admin_setup.sql`
