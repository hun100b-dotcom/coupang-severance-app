export const COMPANIES = ['쿠팡', '마켓컬리', 'CJ대한통운', '기타'] as const
export type Company = typeof COMPANIES[number]

export const INTRO_COPIES = [
  '쿠팡·컬리 근무자라면\n놓친 돈이 있는지 CATCH 하세요.',
  '연차·주휴수당까지\nCATCH에서 꼼꼼하게.',
  '실업급여 자격, 일용직도\n가능한지 지금 바로 확인!',
  '4대 보험료 공제 후\n나의 진짜 수령액은?',
  '숨어있는 내 퇴직금,\n지금 바로 CATCH 하세요.',
] as const

export const fmt = (n: number) =>
  n.toLocaleString('ko-KR') + '원'

export const fmtShort = (n: number) => {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (n >= 1_0000) return `${Math.floor(n / 1_0000)}만원`
  return fmt(n)
}
