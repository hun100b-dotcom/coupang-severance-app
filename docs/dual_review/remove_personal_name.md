# 더블 리뷰 — 개인 실명·닉네임 앱 전역 제거

> 일자: 2026-06-28 · 브랜치: `chore/remove-personal-name` (main 분기, 백업 태그 `pre-redesign-2026-06-27`)
> 방식: 총괄 리뷰어 A + 적대 리뷰어 B. 브랜드는 "CATCH"만 유지. 기능·계산 로직 무변경.

## 제거 대상
LEAF-MASTER / LEAFMASTER / Leaf Master / 리프마스터 / 리프 마스터 / 개인 닉네임 Leaf / 백종훈 / 종훈 / Jonghun

## 수정 내역 (앱 가시 + 백엔드 응답 + 코드 주석)
| 파일 | 변경 |
|------|------|
| frontend/src/pages/Home.tsx:582 | `© 2026 CATCH by LEAF-MASTER. All rights reserved.` → `© 2026 CATCH. All rights reserved.` |
| frontend/src/pages/Intro.tsx:163 | 스플래시 하단 `by LEAF-MASTER` → `CATCH` |
| frontend/src/pages/PrivacyPolicy.tsx:326 | 개인정보 보호책임자 `성명: 백종훈` → `성명: CATCH 운영팀` |
| app.py:540 | Streamlit 푸터 `ⓒ 2026 LEAF-MASTER...` → `ⓒ 2026 CATCH...` |
| frontend/src/components/mypage/ProfileSection.tsx:38 | 주석의 `"종훈님"` 예시 → `특정 사람 이름` |

## 총괄 리뷰어 A — PASS
- 정규식 전역 검색: frontend/src 0건, app.py 0건, index.html(meta/title/OG/JSON-LD) 0건.
- 'Leaf' 단독도 frontend/src 0건(lucide Leaf 아이콘 import조차 없음 → 오탐 없음).
- 치환 자연스러움 전부 PASS. LandingV1~V5 푸터 모두 "© 2026 CATCH".
- 단순 문자열 치환 → 빌드/타입/로직 무영향, 28일 블록 등 핵심 로직 미접촉.

## 적대 리뷰어 B — 사용자 가시 영역 잔존: 없음
- 고위험 지점 전수 확인 클린: index.html meta author/og/twitter/JSON-LD(Organization·WebSite·FAQ·HowTo), SEO 랜딩·가이드 8개 author/publisher 구조화 데이터(전부 Organization name 'CATCH'), robots.txt/sitemap.xml/구글 인증/public 자산, backend/app/**.
- false positive 구분: `닉네임`=엔드유저 프로필 기능, `성명`=채용 지원서 필드 라벨, `자동 리프레시`=refresh 한글 — 모두 개인명 무관.
- 비가시 영역(미션 범위 밖, 보고만): CLAUDE.md·memory·docs/marketing_kit·docs/launch/product-hunt-draft.md(Jonghun)·docs/privacy-policy-draft.md 등. **레포 공개 시 별도 검토 필요** — 종훈님 결정 대기 항목.

## 검증
- `npm run build`: 통과(에러 0)
- 라이브 렌더 실측: 홈 푸터 "© 2026 CATCH. All rights reserved."(개인명 0), 개인정보처리방침 "성명: CATCH 운영팀"(개인명 0)
- 메인 트리 grep 잔존 0건(.claude/worktrees는 gitignore 로컬 사본이라 배포 무관)
- **최종: PASS → 커밋·배포**
