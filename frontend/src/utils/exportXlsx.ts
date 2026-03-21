/**
 * XLSX 다운로드 유틸 — xlsx 라이브러리 사용 (npm install xlsx)
 */
import * as XLSX from 'xlsx'

export function exportXlsx(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
