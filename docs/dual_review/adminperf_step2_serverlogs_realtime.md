# 더블리뷰 — 어드민 성능 FIX 스텝2 (ServerLogs Realtime 재구독 churn 제거)

> 변경: `frontend/src/components/admin/menus/ServerLogsMenu.tsx` — system_logs Realtime 구독 useEffect 의존성이 `[isLive, sysPage, sysTypeFilter]`라 필터/페이지를 바꿀 때마다 WebSocket 채널을 파기·재구독(churn)하던 것을, `sysPageRef`/`sysTypeFilterRef`로 최신값을 읽어 구독을 `[isLive]`에서만 1회 생성/해제하도록 전환.

## 판정 표

| 항목 | 리뷰어 A (5축) | 리뷰어 B (적대 7시나리오) |
|---|---|---|
| 판정 | **PASS** | **PASS** |
| 코드 | ref 패턴 정확(초기화+동기화 effect+콜백 ref.current), deps [isLive] 축소, 죽은코드 0, tsc 통과 | 시나리오1 stale closure 잔존 0 REFUTED |
| UX 4상태 | 실시간 prepend·하이라이트·LIVE 토글·cleanup 보존 | 시나리오3 2페이지 오삽입 방지(sysPageRef===1) REFUTED |
| 회귀 | loadSysLogs 별도 경로로 목록 갱신 유지, stale closure 해소 | 시나리오5 필터 A→B 정합 REFUTED |
| 누수 | — | 시나리오4 구독 on/off 짝맞춤, churn↓로 누수 위험 감소 REFUTED |
| 디자인/UI | 스타일 변경 0 | 시나리오7 tsc exit 0 |

## 합의 / 이견
- **합의**: ref로 stale closure를 정확히 우회, 구독 deps 축소로 채널 churn·누수 위험을 오히려 낮춤. 실시간 삽입 동작·페이지 가드·필터 정합·타입 안전성 모두 유지. BLOCKER/MAJOR/MINOR 0.
- **이견/스코프 밖**: 하이라이트 `setTimeout(3초)` 언마운트 clear 부재는 **기존 동작**이며 이번 변경과 무관(양 리뷰어 동일 판단, 스코프 밖).

## 최종결정
**[배포 진행]** — 쌍방 PASS, npm run build(tsc+프리렌더 17/17) 통과.
