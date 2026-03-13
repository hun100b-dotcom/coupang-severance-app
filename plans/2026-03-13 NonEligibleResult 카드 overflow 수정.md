# NonEligibleResult 카드 내부 콘텐츠 잘림 수정 플랜

## 목표
카드 안에 모든 내용(설명 문구, 버튼 2개)이 잘리지 않고 전부 보이도록 수정.

## 원인
- 카드 래퍼에 `overflow-hidden`이 적용되어 있음.
- 슬라이드 애니메이션을 위해 가로만 잘라야 하는데, `overflow-hidden`은 **가로·세로 모두** 잘라서 세로로 긴 콘텐츠(설명 문장, 버튼)가 잘림.

## 수정 방향

### 1. 카드 overflow·높이 조정
- **현재:** `relative overflow-hidden`
- **변경:** `relative overflow-x-hidden max-h-[85vh] overflow-y-auto`
- **효과:**
  - 가로만 잘라서 스텝 슬라이드가 한 칸만 보이게 함.
  - 세로는 카드 높이를 85vh 이내로 두고, 내용이 길면 카드 **안에서** 세로 스크롤되도록 해서 모든 내용이 카드 안에 들어감.

### 2. (선택) 슬라이드 트랙 래퍼
- 가로 클리핑을 슬라이드 트랙만 감싼 내부 래퍼에 `overflow-x-hidden`으로 두고, 카드 자체는 overflow 제거하는 방식도 가능.
- 우선 카드만 `overflow-x-hidden`으로 바꿔서 해결 시도.

### 3. 검증
- Step 1: D-Day 설명 문장 끝까지 보이는지, "이 날짜로 계산하기" / "처음으로 돌아가기" 두 버튼 모두 보이는지 확인.
- Step 2·3도 동일하게 카드 안에서 잘리지 않는지 확인.

## 적용 파일
- `frontend/src/components/non-eligible/NonEligibleResult.tsx`
- 변경: 카드 div의 className에서 `overflow-hidden` → `overflow-x-hidden max-h-[85vh] overflow-y-auto`
