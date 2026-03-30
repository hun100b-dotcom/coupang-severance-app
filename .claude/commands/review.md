# Review — Opus 리뷰어 수동 호출

현재 변경사항에 대해 reviewer 에이전트를 호출하여 품질 검증을 수행합니다.

## 실행 방법

1. `git diff --stat` 으로 변경 파일 확인
2. reviewer 에이전트 호출 (TIER 자동 결정)
3. 결과 보고

## 사용 예시
- `/review` — 현재 unstaged/staged 변경사항 전체 검증
- `/review HEAD~1` — 마지막 커밋 검증

$ARGUMENTS 가 있으면 해당 범위로, 없으면 현재 working tree 변경사항을 검증합니다.
