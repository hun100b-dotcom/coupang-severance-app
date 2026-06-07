# GSC — Google Search Console 색인 요청 관리

$ARGUMENTS 에 오늘 작업 내용을 입력하세요. (예: "/unemployment 요청 완료", "색인 현황 업데이트", "오늘 요청할 URL 알려줘")

## ⚠️ 필수: 작업 전 상태 파일 읽기

**반드시 아래 2개 파일을 먼저 읽고 시작하세요. 건너뛰기 절대 금지.**

1. `tasks/gsc-state.json` — 기계가 읽는 상태 파일 (어떤 URL이 요청됐고, 뭐가 남았는지)
2. `docs/gsc-index-tracking.md` — 사람이 읽는 추적 문서 (작업 일지, 우선순위)

## 실행 순서

### 1단계: 현재 상태 파악
- `tasks/gsc-state.json` 읽기
- `next_priority` 배열에서 다음 요청할 URL 확인
- `urls` 배열에서 각 URL의 `status` 확인
- 이미 `requested` 또는 `indexed` 상태인 URL은 절대 다시 요청하지 않음

### 2단계: $ARGUMENTS 처리

**"요청 완료" 류 입력 시:**
- `tasks/gsc-state.json` 업데이트:
  - 해당 URL의 `requested` 날짜 기입
  - `status`를 `"requested"`로 변경
  - `manual_request_count` +1
  - `next_priority`에서 해당 URL 제거
  - `log` 배열에 오늘 작업 추가
  - `last_updated` 갱신
- `docs/gsc-index-tracking.md` 업데이트:
  - 전체 URL 현황 테이블에서 해당 URL 행 업데이트
  - 작업 일지에 오늘 날짜 항목 추가/업데이트
  - 다음 요청 우선순위 목록 업데이트

**"색인 완료 확인" 류 입력 시:**
- 해당 URL의 `status`를 `"indexed"`로 변경
- `indexed_count` +1, `not_indexed_count` -1
- 양쪽 파일 모두 업데이트

**"현황 알려줘" 류 입력 시:**
- 상태 파일 기반으로 현황 요약 출력
- 다음 요청할 URL 안내

### 3단계: 결과 보고
- 변경 내용 1줄 요약
- 다음에 요청할 URL과 우선순위 안내
- ⚠️ 주의사항 있으면 알림 (할당량, sitemap 불일치 등)

## 상태(status) 값 정의
- `not_indexed`: GSC에서 "발견됨 - 현재 색인 생성되지 않음" 상태
- `requested`: 수동 색인 요청 완료 (아직 색인 반영 안 됨)
- `indexed`: Google 색인 완료 확인
- `unknown`: GSC에서 상태 미확인 (미색인 목록에도 없음)

## 규칙
- **두 파일(json + md) 항상 동시에 업데이트** — 한쪽만 바꾸면 다음에 꼬임
- **이미 요청한 URL 재요청 금지** — `requested` 필드가 null이 아니면 건너뜀
- **날짜는 항상 절대 날짜** (YYYY-MM-DD) 사용
- **sitemap.xml이 변경되면** `tasks/gsc-state.json`의 `urls` 배열도 동기화
