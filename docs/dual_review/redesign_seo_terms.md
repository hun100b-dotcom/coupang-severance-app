# 검증 기록 — SEO 키워드 랜딩 6종 + 약관 2종 (보너스)

- 브랜치: `redesign/web-layout` · 색: 블루 + 그린(채용) + 회색 + 의미색. amber=warning 의미색 허용
- 대상: `/coupang-severance-calculator` `/coupang-unemployment-calculator` `/day-worker-severance-guide` `/coupang-part-time-severance-method` `/daily-worker-severance-28days` `/coupang-cfs-severance-calculation` + `/privacy-policy` `/terms-of-service`
- 작성일: 2026-06-28 · **판정: PASS (셀프 풀검증)** · tsc 0

## 1. 진단 결과
- 8페이지 중 무지개 위반은 **CoupangPartTimeSeverance 1곳뿐**: 히어로 그라데 `from-[#3182f6] to-[#7c3aed]`(보라) + 아이콘 `text-purple-500`
- 나머지 7페이지: 히어로가 블루(#1a6ff4→#3182f6)·네이비(#1a1a2e/#0f172a)·그레이(#333D4B)·그린(#0f8456→#12a769, 실업급여 SEO) 등 **전부 인팔레트**. amber 박스는 소멸시효/주의 **warning 의미색**(허용). PrivacyPolicy 무지개 0

## 2. 수정
- CoupangPartTimeSeverance: `to-[#7c3aed]`→`to-[#1d4ed8]`(딥블루), `text-purple-500`→`text-brand`

## 3. 실측 (Playwright 320/1280)
- 8페이지 전부 무지개 클래스 **0**, inline 보라 hex **0**, 가로 오버플로 **0**, 본문 정상 렌더, tsc 0

## 4. 남은 개선점(비차단)
- `/coupang-unemployment-calculator` 히어로가 그린(#0f8456→#12a769) — 그린은 인팔레트이나 가이드 그룹핑(실업급여=블루)과는 불일치. SEO 페이지 독립 아이덴티티로 판단해 유지. 추후 그룹 색 통일 시 블루 전환 검토 가능
