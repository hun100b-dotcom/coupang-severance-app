// ============================================================
// exportXlsx: 데이터를 .xlsx 엑셀 파일로 내보내는 유틸 함수
// xlsx 패키지(SheetJS)를 활용해 브라우저에서 직접 파일을 생성합니다.
// 어드민 대시보드 각 탭의 다운로드 버튼에서 사용합니다.
// ============================================================

import * as XLSX from 'xlsx'

/**
 * 데이터 배열을 .xlsx 파일로 내보냅니다.
 * @param data - 행 데이터 배열 (객체의 키가 열 헤더가 됩니다)
 * @param filename - 저장될 파일명 (.xlsx 확장자 자동 추가됨)
 */
export function exportXlsx(data: Record<string, unknown>[], filename: string) {
  // 데이터 배열 → 워크시트(Sheet) 변환
  const ws = XLSX.utils.json_to_sheet(data)

  // 새 워크북(Workbook) 생성
  const wb = XLSX.utils.book_new()

  // 워크시트를 워크북의 'Sheet1' 탭으로 추가
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // 브라우저에서 파일 다운로드 실행
  // .xlsx 확장자를 붙여 저장합니다.
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
