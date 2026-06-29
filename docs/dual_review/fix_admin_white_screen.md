# 더블 리뷰 — /admin 비로그인 하얀 화면 근본 수정

- 날짜: 2026-06-29 (세션 18)
- 대상 파일: `frontend/src/pages/AdminPage.tsx` (1파일, 2개 useEffect 수정)
- 분류: 버그 수정 (사전 존재 잠복 버그, /plan 면제 대상)

## 1. 증상
비로그인(또는 게스트) 사용자가 `/admin` 진입 시 **영구 하얀 화면**. 리다이렉트도 발생하지 않음. 콘솔 에러 없음(조용한 null 렌더).

## 2. 근본 원인 (증거로 확정)
`AdminPage.tsx`의 관리자 확인 `useEffect`가
```
if (loading || !isLoggedIn || !user?.email) return
```
로 비로그인 시 그냥 빠져나가 `adminChecked`를 **영원히 false**로 남김.
→ 렌더 가드 `if (loading || !adminChecked) return null` 에서 화면이 null(=하얀 화면)로 정지.
→ 리다이렉트 effect `if (adminChecked && !isAdmin) navigate('/home')` 도 `adminChecked`가 false라 **영원히 발동 못함**.

### 인과 교차검증
- 이 패턴은 오래된 커밋 **a5ffa53**("DB 기반 관리자 권한 체크")에서 도입된 **사전 존재 버그**.
- 최근 커밋(fc19a38 마키/게스트, 571d6af 스크럽, 리디자인 등)은 AdminPage 인증 로직을 **전혀 건드리지 않음**(`git log -L` 확인).
- 최근 추가된 **게스트 모드**(로그인 없이 앱 사용)가 비로그인 상태로 `/admin` 도달을 쉽게 만들어 잠복 버그를 노출시킴. 이전 세션들이 "admin을 렌더 안 해봤다"는 기록과 일치.

## 3. 로컬 재현/검증 (preview MCP, dev 5173)
| 상태 | 수정 전 | 수정 후 |
|------|---------|---------|
| 비로그인 /admin | path `/admin` 유지, body 비어있음(하얀 화면) | `/login` 리다이렉트, 콘텐츠 렌더 ✅ |
| 가짜 슈퍼어드민 세션 /admin | 어드민 UI 정상 렌더 | 어드민 UI 정상 렌더(사이드바+슈퍼관리자 뱃지) ✅ 회귀 없음 |
| 비로그인 경로 신규 콘솔 에러 | — | 0건(JWT 에러는 가짜세션 테스트 잔재, 개수 불변으로 확인) |
| npm run build (tsc 포함) | 통과 | 통과 ✅ |

## 4. 수정 내용
1. 인증 effect: `loading` 가드와 비로그인 분기를 분리. 비로그인/게스트 settled 상태에서 `setAdminChecked(true)` 호출 → 리다이렉트 effect가 발동하도록.
2. 리다이렉트 effect: 비로그인 → `/login`(관리자 로그인 유도), 로그인-비관리자 → `/home`. `replace:true`로 뒤로가기 루프 차단. 의존성 배열에 `isLoggedIn` 추가.

## 5. 더블 리뷰 결과
### A — 총괄 리뷰어: **PASS**
- 근본 원인(adminChecked 영구 false) 제거 확인. 리다이렉트 루프·의존성 누락·회귀 없음.
- MINOR(비차단): 게스트를 `/login`으로 보내는 것은 의도된 설계(주석 명시), 루프 없음. 수정 불필요.

### B — 적대적 리뷰어: **PASS**
- 7개 공격 포인트(루프/1프레임 null/로그아웃 stale/email 없는 OAuth/loading 전환/딥링크 새로고침/게스트) 전부에서 CRITICAL/HIGH 재현 실패.
- 1프레임 null 렌더·logout 비동기는 LOW 수준의 의도된 동작. deps에 `isLoggedIn` 추가가 핵심이며 올바름.
- 교차검증: AuthContext.tsx, App.tsx(HomeGuard), Login.tsx.

## 6. 결론
A·B 모두 PASS, 블로커/치명 결함 0. 계산 로직(28일 블록 등) 무변경.
