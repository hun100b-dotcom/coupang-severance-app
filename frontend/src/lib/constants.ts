export const COMPANIES = ['쿠팡', '마켓컬리', 'CJ대한통운', '기타'] as const
export type Company = typeof COMPANIES[number]

export const INTRO_COPIES = [
  '쿠팡·컬리 근무자라면\n놓친 돈이 있는지 확인하세요.',
  '연차·주휴수당까지\n꼼꼼하게 챙겨드릴게요.',
  '실업급여 자격 확인,\n일용직도 가능한지 지금 바로 체크!',
  '4대 보험료 떼고\n내가 받을 실제 금액은?',
  '숨어있는 내 퇴직금,\n지금 바로 찾아보세요.',
] as const

export const fmt = (n: number) =>
  n.toLocaleString('ko-KR') + '원'

export const fmtShort = (n: number) => {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`
  if (n >= 1_0000) return `${Math.floor(n / 1_0000)}만원`
  return fmt(n)
}
