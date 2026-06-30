import { useCallback, useEffect, useState } from 'react'
import { UP } from '../shared/adminTheme'
import {
  getAdminInquiries, getTemplates,
  patchInquiryStatus, patchInquiryAnswer, bulkInquiryStatus,
} from '../../../lib/api'
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
  // 선택된 문의 id 집합. id 타입(string|number) 혼재로 인한 has() 미스매치를
  // 막기 위해 항상 String 으로 정규화해 저장/조회한다.
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
    const key = String(id)
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleToggleAll = () => {
    if (inquiries.length > 0 && inquiries.every(i => selected.has(String(i.id)))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(inquiries.map(i => String(i.id))))
    }
  }

  // ───────────────────────────────────────────────────────────────
  // 낙관적 업데이트(optimistic update) — 체감 속도의 핵심
  //
  // 과거: 클릭 → 백엔드(Render 싱가포르) await → 전체목록 refetch await
  //        → 콜드스타트 + 왕복 + 재조회를 '기다린 뒤'에야 화면 변경 = 느림
  // 현재: 클릭 → 즉시 UI 반영(낙관적) → 백그라운드로 persist
  //        → 성공: 그대로 유지(전체 refetch 안 함, 블로킹 제거)
  //        → 실패: 직전 상태로 롤백 + 에러를 throw (자식이 토스트 표시)
  //
  // 핵심 주의: '가짜 성공'을 만들지 않는다. await 한 persist 가 실제로
  //           실패하면 반드시 롤백한다. (즉시 반응 + 정직함 동시 확보)
  // ───────────────────────────────────────────────────────────────

  // 단건 상태 변경 (상세 패널의 대기중/검토중/답변완료/종결 버튼)
  const handleStatusChange = useCallback(async (id: string | number, status: string) => {
    // 1) 해당 항목의 '직전 status'만 스냅샷 (전체 리스트가 아니라 id 한정)
    const prevStatus = inquiries.find(i => i.id === id)?.status
    // 2) 즉시 UI 반영 (목록 + 열린 상세 패널)
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    setActiveInquiry(prev => prev && prev.id === id ? { ...prev, status } : prev)
    try {
      // 3) 백그라운드 persist (await 하되 UI는 이미 바뀐 상태)
      await patchInquiryStatus(id, status)
    } catch (e) {
      // 4) 실패 → 해당 id만 직전 status로 함수형 롤백.
      //    (리스트 통째 덮어쓰기가 아니므로, 그 사이 일어난 다른 낙관적 변경을 보존)
      if (prevStatus !== undefined) {
        setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: prevStatus } : i))
        setActiveInquiry(prev => prev && prev.id === id ? { ...prev, status: prevStatus } : prev)
      }
      throw e
    }
  }, [inquiries])

  // 답변 저장 (성공 시 백엔드가 status='answered' + answered_at 기록)
  const handleSaveAnswer = useCallback(async (id: string | number, answer: string) => {
    // 직전 항목 스냅샷 (롤백용) — id 한정
    const prev = inquiries.find(i => i.id === id)
    // 백엔드가 기록하는 answered_at 을 낙관적으로도 채워, 저장 직후 CSV 등에서
    // '답변일시'가 빈 값으로 나가는 불일치를 막는다 (백엔드 UTC와 수 ms 차이뿐).
    const nowIso = new Date().toISOString()
    // 낙관적: 답변 + 상태(answered) + 답변일시 즉시 반영
    setInquiries(list => list.map(i => i.id === id ? { ...i, answer, status: 'answered', answered_at: nowIso } : i))
    setActiveInquiry(a => a && a.id === id ? { ...a, answer, status: 'answered', answered_at: nowIso } : a)
    try {
      await patchInquiryAnswer(id, answer)
    } catch (e) {
      // 실패 → 해당 id만 직전 값(답변/상태/답변일시)으로 함수형 롤백
      if (prev) {
        setInquiries(list => list.map(i => i.id === id ? { ...i, answer: prev.answer, status: prev.status, answered_at: prev.answered_at } : i))
        setActiveInquiry(a => a && a.id === id ? { ...a, answer: prev.answer, status: prev.status, answered_at: prev.answered_at } : a)
      }
      throw e
    }
  }, [inquiries])

  // 일괄 상태 변경 (BulkActionBar). 부분 실패 시 실패분만 원복.
  const handleBulkStatus = useCallback(async (
    ids: Array<string | number>, status: string,
  ): Promise<{ failedCount: number }> => {
    const idSet = new Set(ids.map(String))
    // 롤백용: id → 직전 status 스냅샷
    const snapshot = new Map(inquiries.map(i => [String(i.id), i.status]))
    // 낙관적: 선택된 모든 행 즉시 변경
    setInquiries(prev => prev.map(i => idSet.has(String(i.id)) ? { ...i, status } : i))
    setActiveInquiry(prev => prev && idSet.has(String(prev.id)) ? { ...prev, status } : prev)
    try {
      const res = await bulkInquiryStatus(ids, status)
      const failed = (res?.failed_ids as Array<string | number> | undefined) ?? []
      if (failed.length > 0) {
        // 실패분만 직전 상태로 원복 (성공분은 낙관적 변경 유지)
        const failedSet = new Set(failed.map(String))
        setInquiries(prev => prev.map(i =>
          failedSet.has(String(i.id)) ? { ...i, status: snapshot.get(String(i.id)) ?? i.status } : i))
        return { failedCount: failed.length }
      }
      return { failedCount: 0 }
    } catch (e) {
      // 전체 롤백
      setInquiries(prev => prev.map(i =>
        idSet.has(String(i.id)) ? { ...i, status: snapshot.get(String(i.id)) ?? i.status } : i))
      throw e
    }
  }, [inquiries])

  // 일괄 성공 후: 선택 해제만 (전체 refetch 하지 않음 — 낙관적 반영으로 충분)
  const handleBulkDone = () => {
    setSelected(new Set())
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
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: UP.navy, margin: 0 }}>Inquiries CRM</h2>
          <p style={{ fontSize: '0.78rem', color: UP.sub, marginTop: 2 }}>전체 {total}건</p>
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
                flex: 1, minWidth: 140, background: UP.sunken,
                border: `1px solid ${UP.hair}`, borderRadius: 8,
                padding: '6px 12px', fontSize: '0.82rem', color: UP.navy,
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

          {/* 일괄 액션 바 — 낙관적 일괄 변경은 부모가 수행(onBulkStatus) */}
          <BulkActionBar selectedIds={[...selected]} onBulkStatus={handleBulkStatus} onDone={handleBulkDone} />

          {/* 에러 표시 */}
          {apiError && (
            <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 10, padding: '14px 18px', marginBottom: 12, color: UP.danger, fontSize: '0.82rem' }}>
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
            border: `1px solid ${UP.hair}`,
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: UP.sub, padding: '32px 0', fontSize: '0.85rem' }}>
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
                  background: p === page ? UP.brand : UP.hairSoft,
                  color: p === page ? '#fff' : UP.sub,
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
          onStatusChange={handleStatusChange}
          onSaveAnswer={handleSaveAnswer}
        />
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: `1px solid ${UP.hair}`,
  background: UP.sunken, color: UP.body,
  fontSize: '0.78rem', cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  background: UP.sunken, border: `1px solid ${UP.hair}`,
  borderRadius: 8, padding: '6px 10px', fontSize: '0.82rem',
  color: UP.body, outline: 'none', cursor: 'pointer',
}
