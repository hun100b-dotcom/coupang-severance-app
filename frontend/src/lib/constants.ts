export const COMPANIES = ['쿠팡', '마켓컬리', 'CJ대한통운', '기타'] as const
export type Company = typeof COMPANIES[number]

export const INTRO_COPIES = [
  '내 퇴직금,\n얼마인지 알고 싶어',
  '1분이면\n퇴직금 계산 완료',
  '일용직도\n퇴직금 받을 수 있어',
] as const

export const fmt = (n: number) =>
  n.toLocaleString('ko-KR') + '원'

export const fmtShort = (n: number) => {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (n >= 1_0000) return `${Math.floor(n / 1_0000)}만원`
  return fmt(n)
}
