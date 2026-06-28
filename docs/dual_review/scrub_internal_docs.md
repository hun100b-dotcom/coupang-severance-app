# 더블 리뷰 — 내부 문서 개인 식별자 일괄 스크럽

> 일자: 2026-06-29 · 브랜치: `chore/scrub-internal-docs` (main 분기)
> 방식: 총괄 리뷰어 A + 적대 리뷰어 B. 브랜드 "CATCH"만 유지. 기능·계산 로직·세션 규칙 무변경.
> 선행: 세션 16b(`docs/dual_review/remove_personal_name.md`)가 **앱 가시 영역**을 처리. 본 작업은 **앱엔 안 보이지만 레포에 남은 내부 문서**의 잔존 개인 식별자를 마저 제거.

## 제거 대상 (강 식별자)
개발자 개인 실명·영문명·닉네임·평문 이메일 일체 (브랜드 'CATCH' 외 모든 개인 식별자).
구체 패턴: 개인 실명, 영문 닉네임(대시 포함/미포함), 한글 음차 닉네임, 영문명, 이메일 `***@gmail`.

## 단독 호칭 "종훈" 처리 원칙
- 단독 호칭 "종훈/종훈님"은 **이름 노출**이 아닌 Claude 행동 지침용 호칭이라 제거 대상 아님 → 보존.
- 단, **공개 마케팅 문서의 자기소개**(이름+특정 기업 경력 결합)는 개인 식별 가능 → 일반화.

## 수정 내역

### 그룹1 — 마케팅/런칭 초안 (공개 예정 문서)
| 파일 | 변경 |
|------|------|
| docs/launch/product-hunt-draft.md | 영문 자기소개 3곳 + 체크리스트 2곳: 영문명·특정 기업명("Coupang Fulfillment Services") 제거 → 무명 maker / "Korea's logistics industry"로 일반화 |
| docs/launch/alternativeto-draft.md | 계정 생성 체크리스트 평문 이메일 → "(운영 이메일)" |
| docs/privacy-policy-draft.md | 개인정보 보호책임자 "[종훈님 성함]"·평문 이메일 → "CATCH 운영팀" / "[운영 이메일 — 배포 시 기입]" |
| docs/marketing_kit/templates_kakao.md | 자기소개 "CFS HR 채용팀 출신 종훈" → "물류업계 HR·채용 실무 경험 CATCH 운영자". 채용정보 멘트 "쿠팡 CFS에서 HR…" → "물류업계에서 HR…" |
| docs/marketing_kit/profile_setup.md | 자기소개·블로그·닉네임·링크트리 9곳: 이름("종훈/종훈님")·특정 기업("쿠팡CFS") → "CATCH 운영자" / "물류 HR 실무 경험" |
| docs/marketing_kit/templates_jisikin.md | 지식iN 답변 자기소개 2곳 "쿠팡 CFS HR (채용팀) 출신" → "물류 HR(·채용) 실무 경험자" |
| docs/marketing_kit/communities.md | 내부 노트 "종훈님이" → "운영자가", 활동전략 멘트 "쿠팡 HR 출신" → "물류 HR 경험자" |

### 그룹2 — 개발 도구/로그
| 파일 | 변경 |
|------|------|
| EXECUTE_LEGAL_MIGRATIONS.html | Vercel 개인 프로젝트 URL(`vercel.com/<개인 핸들>-projects-…`) → `vercel.com/dashboard`(로그인 시 동일 도달, 핸들 비노출) |
| docs/dual_review/remove_personal_name.md | 직전 세션 기록이 인용한 리터럴 식별자(닉네임·실명·영문명)를 일반 표기(`[개인 닉네임]`/`[개인 실명]`)로 치환. 기록 의미는 보존 |

### 그룹3 — CLAUDE.md / memory (운영 로직·기억 보호, 식별자 라인만 정밀 수정)
| 파일 | 변경 |
|------|------|
| CLAUDE.md | §0 "GitHub 계정: <이메일>" → "(비공개…)" / §E 프로필 "이름: 종훈 (<이메일>)" → "이름: 종훈님 (개발자 본인)". (동일 diff에 세션 전부터 있던 API URL 오타 정정 1줄 포함) |
| memory/progress.md | 세션16b 로그가 열거한 닉네임·실명 리터럴 → 일반 표기. "결정 대기" → "처리 완료"로 상태 갱신 |

> 그룹3 원칙: 기능·알고리즘·세션 규칙·기억 내용은 1글자도 미접촉. 개인 식별자 라인만 수정.

## 보존 판단 (오탐·비대상)
- `쿠팡풀필먼트서비스(CFS)` 등 **기업명**은 계산기 대상 사업장(제품 콘텐츠: FAQ·랜딩·PDF 파서·개인정보처리방침 제3자 제공)이라 개인 식별자 아님 → 전량 보존.
- 단독 호칭 "종훈/종훈님"(CLAUDE.md·memory·docs/seo-rank-history.md·docs/plans/*) → 행동 지침용 호칭, 제거 대상 아님 → 보존.
- CLAUDE.md §E 직업(물류 HR) → 그룹3 정밀 스코프(이메일·실명·닉네임)에 미포함 + Claude 행동 컨텍스트라 보존.
- `frontend/index.html`의 "산세리프" → "리프" 오탐. worktrees → gitignore 로컬 사본.
- 원격 git URL의 GitHub 핸들 → 동작하는 remote 메타데이터(클론 시 불가피)라 보존.

## 총괄 리뷰어 A — PASS
- 6개 임무 전부 통과, 블로커 0.
- 강 식별자(개인 실명·영문명·닉네임 대시변형·평문 이메일 패턴) 추적 파일 0건.
- 소스 코드(.tsx/.ts/.py) 변경 0건 — 문서/HTML만 수정, 28일 블록·계산 로직·세션 규칙 미접촉.
- 공개 마케팅 문서의 "개발자+쿠팡 CFS" 결합 자기소개 잔존 0건. 남은 쿠팡/CFS 언급은 전부 제품 콘텐츠(계산기 대상 사업장).
- 권고: 커밋에서 `.claude/settings.local.json`·`frontend/tsconfig.tsbuildinfo` 제외(무관 변경) → 반영함.

## 적대 리뷰어 B — FAIL(미션 타깃은 전량 제거 확인, 범위 밖 잔존 2건 지적)
- **미션 정의 타깃 전량 제거 확인**: 개인 풀네임 0 / 영문명 0 / 영문·한글 닉네임 0(PNG 바이너리 노이즈는 strings 검증으로 오탐 확정) / 평문 이메일 0 / base64·URL 인코딩 변형 0 / 파일명·HTML author 태그 0.
- **과잉 삭제 없음 확인**: 제품 회사명·28일 블록·qualifying_days·MIN_ORDINARY_WAGE 비즈니스 로직 정상 보존.
- **B의 MAJOR 2건에 대한 본 작업 판정(adjudication):**
  1. *given name "종훈" 23건(호칭)* → **보존 결정**. 종훈님이 본 작업 지시에서 "단독 호칭 종훈은 제거 대상 아님"으로 명시 → 범위 밖. 단 B가 옳게 지적한 "종훈 + 현직 CFS HR 결합 식별" 리스크는 CLAUDE.md §E 직업란 회사명을 "물류업계"로 일반화하여 차단함.
  2. *Windows OS 계정 슬러그(로컬 경로 7건: CLAUDE.md·push.bat·RUNBOOK)* → **보존 결정**. 이름/닉네임/이메일이 아닌 OS 계정명이며, 그레이존 기준상 동작 메타데이터(git remote URL의 GitHub 핸들)와 동급. CLAUDE.md가 해당 경로를 "그대로 사용"하라 명시 → 일반화 시 운영 지침 훼손. 동작 경로로 보존하고 본 문서에 명시.
- **결론 조정**: 미션의 정의된 제거 타깃(실명·영문명·닉네임·평문 이메일)은 **양 리뷰어 합의로 100% 제거**. B의 FAIL은 미션 범위 밖(보존 합의된) 항목에 대한 적대적 가산점으로, 본 작업 합격 기준(정의 타깃 0건)에는 영향 없음.

## 6-step 검증 — (커밋·푸시 후 기록)
