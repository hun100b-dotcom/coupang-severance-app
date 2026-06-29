import { useCallback, useEffect, useState } from 'react'
import { getAdminInquiries, getTemplates } from '../../../lib/api'
import type { AdminInquiry, InquiryTemplate } from '../../../types/admin'
import InquiryTable from '../inquiries/InquiryTable'
import InquiryDetailPanel from '../inquiries/InquiryDetailPanel'
import BulkActionBar from '../inquiries/BulkActionBar'
import TemplateManager from '../inquiries/TemplateManager'
import { exportCsv } from '../../../utils/exportCsv'

const STATUSES = [
  { label: '전체', value: '' },
  { label: '대기', value: 'waiting' },
  { label: '검토', value: 'reviewing' },
  { label: '답변완료', value: 'answered' },
  { label: '종결', value: 'closed' },
]
const CATEGORIES = ['', '퇴직금/실업급여', '서류발급', '오류/버그', '기타']

export default function InquiriesMenu() {
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [templates, setTemplates] = useState<InquiryTemplate[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [activeInquiry, setActiveInquiry] = useState<AdminInquiry | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const loadInquiries = useCallback(async (): Promise<AdminInquiry[]> => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await getAdminInquiries({ page, limit: 20, status, category, search })
      const list = res.inquiries ?? []
      setInquiries(list)
      setTotal(res.total ?? 0)
      return list
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : String(e))
      return []
    } finally {
      setLoading(false)
    }
  }, [page, status, category, search])

  const loadTemplates = async () => {
    try {
      const res = await getTemplates()
      setTemplates(res.templates ?? [])
    } catch {
      // silent
    }
  }

  useEffect(() => { loadInquiries() }, [loadInquiries])
  useEffect(() => { loadTemplates() }, [])

  const handleToggle = (id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleToggleAll = () => {
    if (inquiries.every(i => selected.has(i.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(inquiries.map(i => i.id)))
    }
  }

  // 문의 쓰기(상태/답변) 성공 후: DB에서 재조회하여 화면을 진짜 DB 상태와 동기화.
  // 과거에는 낙관적 갱신만 했기에 DB 미반영 시 새로고침하면 원복됐다.
  const handleUpdated = async () => {
    const list = await loadInquiries()
    // 열려 있는 상세 패널도 최신 행으로 교체 (없어졌으면 그대로 유지)
    setActiveInquiry(prev => prev ? (list.find(i => i.id === prev.id) ?? prev) : prev)
  }

  const handleBulkDone = () => {
    setSelected(new Set())
    loadInquiries()
  }

  const handleExport = () => {
    exportCsv(inquiries.map(i => ({
      ID: i.id,
      이메일: i.user_email ?? '',
      카테고리: i.category,
      상태: i.status,
      내용: i.content,
      답변: i.answer ?? '',
      접수일시: i.created_at,
      답변일시: i.answered_at ?? '',
    })), `inquiries_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', position: 'relative' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Inquiries CRM</h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>전체 {total}건</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTemplates(s => !s)} style={outlineBtn}>
            {showTemplates ? '← 목록' : '📋 템플릿'}
          </button>
          <button onClick={handleExport} style={outlineBtn}>CSV</button>
          <button onClick={loadInquiries} style={outlineBtn}>↻</button>
        </div>
      </div>

      {showTemplates ? (
        <TemplateManager templates={templates} onRefresh={loadTemplates} />
      ) : (
        <>
          {/* 필터 바 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="내용 검색..."
              style={{
                flex: 1, minWidth: 140, background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '6px 12px', fontSize: '0.82rem', color: '#0f172a',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              style={selectStyle}
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1) }}
              style={selectStyle}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c || '전체 카테고리'}</option>)}
            </select>
          </div>

          {/* 일괄 액션 바 */}
          <BulkActionBar selectedIds={[...selected]} onDone={handleBulkDone} />

          {/* 에러 표시 */}
          {apiError && (
            <div style={{ background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, color: '#ff6b6b', fontSize: '0.82rem' }}>
              ⚠️ {apiError}
              {' '}
              {/* 에러 유형에 따라 다른 안내 메시지 표시 */}
              {(apiError.toLowerCase().includes('401') || apiError.toLowerCase().includes('403') || apiError.toLowerCase().includes('unauthorized') || apiError.toLowerCase().includes('token'))
                ? '— 관리자 토큰(VITE_ADMIN_SECRET)을 확인하세요.'
                : (apiError.toLowerCase().includes('network') || apiError.toLowerCase().includes('err_') || apiError.toLowerCase().includes('failed to fetch'))
                ? '— 백엔드 서버 연결 상태를 확인하세요.'
                : '— 잠시 후 다시 시도하거나 관리자에게 문의하세요.'}
            </div>
          )}

          {/* 테이블 */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '32px 0', fontSize: '0.85rem' }}>
                로딩 중...
              </p>
            ) : (
              <InquiryTable
                inquiries={inquiries}
                selected={selected}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onSelect={setActiveInquiry}
                activeId={activeInquiry?.id}
              />
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: p === page ? '#3182f6' : '#f1f5f9',
                  color: p === page ? '#fff' : '#64748b',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* 슬라이딩 상세 패널 */}
      {activeInquiry && (
        <InquiryDetailPanel
          // key: 다른 문의로 전환 시 패널을 강제 재마운트 → 답변 textarea가
          // 이전 문의 내용을 잔류시켜 엉뚱한 문의에 덮어쓰는 사고 방지
          key={activeInquiry.id}
          inquiry={activeInquiry}
          templates={templates}
          onClose={() => setActiveInquiry(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#f8fafc', color: '#475569',
  fontSize: '0.78rem', cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 8, padding: '6px 10px', fontSize: '0.82rem',
  color: '#475569', outline: 'none', cursor: 'pointer',
}
