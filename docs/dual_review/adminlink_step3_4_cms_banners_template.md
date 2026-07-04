# 듀얼리뷰 — 어드민 연동 전수조사 STEP3+4 (CMS 배너/팝업 사용자 실연동 + 템플릿 use_count)

> 2026-07-04. 빌더: Claude(Fable 5) / 리뷰어 A(5축) + B(적대) 독립 에이전트.

## 변경 요약

**STEP3 — CMS 배너/팝업 실연동** (기존: 소비처 0곳 = "저장 즉시 홈 반영" 거짓 약속 위젯)
| 파일 | 변경 |
|---|---|
| `backend/app/api/common.py` | 신설 공개 `GET /api/cms/banners` — 4키 화이트리스트 재구성(타 키 누수 차단), 60초 캐시, 실패 시 배너 OFF 안전 저하 |
| `frontend/src/components/CmsBanners.tsx` (신규) | AnnouncementBar(홈 노란 띠, warning 의미색) + PopupBanner(body 포털, "오늘 하루 보지 않기" 24h) + useCmsBanners |
| `frontend/src/pages/Home.tsx` | main 최상단 배너 2종 삽입 (순수 추가 8줄) |
| `frontend/scripts/prerender.mjs` | /cms/banners 요청 차단 — 배너 ON 상태 빌드 시 SEO 스냅샷 오염 예방 (B-가 반영) |
| `frontend/.../CmsSettings.tsx` | "즉시 반영"→"약 1분 내 반영" 카피 정정 (B-⑥ 반영) |

**STEP4 — 템플릿 use_count 실연동** (백엔드 라우트 존재·프론트 미호출로 항상 0)
| 파일 | 변경 |
|---|---|
| `frontend/.../InquiryDetailPanel.tsx` | 템플릿 적용 시 markTemplateUsed 호출(실패 무해) |

## E2E 실측 (로컬 dev 5173 + 로컬 백엔드 8000, 게스트 모드)

- 플래그 ON 시: `/home`에 노란 띠 렌더(`role=status`, bg #FFFBEB, "📢 Test") + 팝업 렌더 확인
- "오늘 하루 보지 않기" 클릭 → localStorage 24h 기록 → 팝업 소멸 → **새로고침 후에도 억제 유지 + 띠는 유지**
- 콘솔 에러 0. 검증 후 라이브 플래그 false 원복(테스트 문구 노출 방지)
- 빌드: tsc 0에러, 프리렌더 17/17, dist/index.html 배너 마크업 0건(청정)

## 판정표

| 항목 | 리뷰어 A (5축) | 리뷰어 B (적대) |
|---|---|---|
| 판정 | **조건부 PASS** (블로커 0) | **조건부 PASS** (배포 차단급 0) |
| 디자인 | amber=warning 의미색 규칙 부합, 모달 CTA #1B64DA=--up-strong 일치 | — |
| UI/UX | 44px 터치타깃, break-words/min-w-0, role/aria, 미표시 3조건 처리 | — |
| 회귀 | Home 기존 로직 무손상, dist 'Test' 0건 실측, TopNav 겹침 없음 | — |
| B공격 | — | 4키 화이트리스트 누수 불가 · localStorage try/catch 크래시 불가 · 무한리렌더 불가 · z-스택 정상 · 콜드 시 홈 비블로킹 |

**[A/B 공통 지적 → 전부 반영]**
1. common.py `async def`+동기 httpx = 이벤트 루프 최대 7초 블로킹 → **sync def(스레드풀 위임)로 수정**
2. 프리렌더 배너 오염 경로 → **request interception 차단 추가**, 재빌드로 17/17+청정 재실측
3. "즉시 반영" 과장 카피 → "약 1분 내"로 정정
4. localStorage NaN 영구숨김 엣지 → Number.isFinite 가드 / text-[15px] override 표기 혼재 → 15.5px 통일

**[합의]** 쌍방 조건부 PASS → 지적 반영 후 게이트 재통과. 이견 없음.
**[비차단 잔여]** 팝업 포커스 트랩·ESC 닫기 없음(기존 모달들과 동급 수준) · use_count 비원자 증가(내부 참고 통계라 수용).
**[최종결정: 커밋·배포 진행]**
