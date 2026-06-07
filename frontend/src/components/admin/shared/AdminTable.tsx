// 어드민 공용 테이블 — 라이트 스타일 (head: slate-50, hover: blue-50, border: slate-200)
import { ReactNode } from 'react'

export interface ColDef<T = Record<string, unknown>> {
  key: string
  label: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (row: T, i: number) => ReactNode
}

interface Props<T = Record<string, unknown>> {
  cols: ColDef<T>[]
  rows: T[]
  keyField?: string       // row 고유 키 필드명 (기본: 'id')
  emptyText?: string
  loading?: boolean
}

export default function AdminTable<T extends Record<string, unknown>>({
  cols, rows, keyField = 'id', emptyText = '데이터가 없습니다.', loading = false,
}: Props<T>) {
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          {/* 헤더 */}
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {cols.map(col => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 14px',
                    textAlign: col.align ?? 'left',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* 바디 */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={String(row[keyField] ?? i)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  {cols.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 14px',
                        textAlign: col.align ?? 'left',
                        fontSize: '0.82rem',
                        color: '#334155',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
