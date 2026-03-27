# Supabase 데이터베이스 스키마

> 원본: CLAUDE.md 245-259줄 (15줄) — 데이터 무결성 100% 보장

---

## 테이블 요약

| 테이블 | 용도 |
|---|---|
| `profiles` | 사용자 프로필 (id, email, display_name, marketing_sms, marketing_email, marketing_phone) |
| `reports` | 계산 결과 (user_id, title, company_name, payload JSONB) |
| `inquiries` | 1:1 문의 (category, content, status, answer) |
| `click_counter` | 단일 행 누적 카운터 (total, severance, unemployment) |
| `inquiry_templates` | 관리자 답변 매크로 |
| `system_settings` | Key-Value 시스템 설정 |
| `audit_logs` | 관리자 행동 감사 로그 |
| `blocked_ips` | IP 차단 목록 |
| `user_tags` | 사용자 자동 태그 |
| `user_access_logs` | 사용자 접근 로그 (개인정보 안전성 확보조치 제7조) |
| `notices` | 공지사항 (content, is_active, priority) — Home 배너·/notices 페이지 표시 |

## 마이그레이션

모든 마이그레이션은 `supabase/migrations/` 디렉토리에 있습니다:

- `005_super_admin_setup.sql` — 슈퍼어드민 시스템
- `007_marketing_consent_separation.sql` — 마케팅 동의 3채널 분리
- `008_user_access_logs.sql` — 사용자 접근 로그

Supabase SQL Editor에서 순서대로 실행하세요.

---

**참조**: [CLAUDE.md](../CLAUDE.md) | [아키텍처](./architecture.md) | [MCP 가이드](./mcp-guide.md)
