// 어드민 — 확정인원 관리 메뉴 (Phase D-1)
// 출근확정 상태 지원자 목록 + 출근 예정일 관리 + 사업장별 현황
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 확정 지원자 한 행의 타입 ──
interface ConfirmedRow {
  id: string
  user_id: string
  job_posting_id: string
  status: 'confirmed' | 'completed'
  applied_at: string
  work_date: string | null
  work_confirmed_at: string | null
  applicant_name: string | null
  applicant_birth: string | null
  applicant_gender: 'male' | 'female' | null
  applicant_phone: string | null
  job_postings?: { company_name: string; center_name: string; region: string } | null
  profiles?: { full_name: string | null; email: string | null } | null
}

// 휴대폰 번호 마스킹
function maskPhone(phone: string): string {
  const nums = phone.replace(/\D/g, '')
  if (nums.length < 10) return phone
  return `${nums.slice(0, 3)}-****-${nums.slice(-4)}`
}

export default function ConfirmedMenu() {
  const [rows, setRows] = useState<ConfirmedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 필터 상태
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState<string>('')  // 출근 예정일 기준 필터

  // 수정 중인 work_date (행 ID → 값)
  const [editingWorkDate, setEditingWorkDate] = useState<string | null>(null)
  const [editWorkDateVal, setEditWorkDateVal] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // 토스트
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 사업장 목록
  const [companies, setCompanies] = useState<string[]>([])

  // 확정인원 로드 (confirmed + completed 상태)
  const fetchRows = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('job_applications')
        .select('*, job_postings(company_name, center_name, region)')
        .order('work_date', { ascending: true, nullsFirst: false })

      // 상태 필터
      if (statusFilter === 'all') {
        query = query.in('status', ['confirmed', 'completed'])
      } else {
        query = query.eq('status', statusFilter)
      }

      // 출근 예정일 필터
      if (dateFilter) query = query.eq('work_date', dateFilter)

      const { data, error } = await query
      if (error) throw error
      const list = (data ?? []) as ConfirmedRow[]

      // profiles 별도 조회 + 병합
      const userIds = [...new Set(list.map(r => r.user_id))]
      if (userIds.length > 0 && supabase) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        const profileMap = Object.fromEntries(
          (profileData ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p])
        )
        list.forEach(r => { r.profiles = profileMap[r.user_id] ?? null })
      }

      setRows(list)

      // 사업장 목록 추출
      const uniqueCompanies = [...new Set(
        list.map(r => r.job_postings?.company_name).filter(Boolean) as string[]
      )]
      setCompanies(uniqueCompanies)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '확정인원을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFilter])

  useEffect(() => { fetchRows() }, [fetchRows])

  // 출근 예정일 수정 저장
  const handleSaveWorkDate = async (id: string) => {
    if (!supabase) return
    setSavingId(id)
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ work_date: editWorkDateVal || null })
        .eq('id', id)
      if (error) throw error
      setEditingWorkDate(null)
      await fetchRows()
      setToast({ msg: '✅ 출근 예정일이 수정됐습니다.', type: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '수정에 실패했습니다.'
      setToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  // 출근완료 처리 (confirmed → completed)
  const handleMarkCompleted = async (id: string) => {
    if (!supabase) return
    setSavingId(id)
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: 'completed' })
        .eq('id', id)
      if (error) throw error
      await fetchRows()
      setToast({ msg: '✅ 출근완료 처리됐습니다.', type: 'success' })
    } catch (err) {
      setToast({ msg: '❌ 처리 실패', type: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  // CSV 내보내기 (확정인원 전용)
  const handleExportCsv = () => {
    const filtered = companyFilter === 'all'
      ? rows
      : rows.filter(r => r.job_postings?.company_name === companyFilter)
    if (filtered.length === 0) { alert('내보낼 확정인원이 없습니다.'); return }

    const BOM = '\uFEFF'
    const header = ['이름', '성별', '생년월일', '휴대폰', '회사', '센터', '지역', '출근예정일', '상태']
    const csvRows = filtered.map(r => [
      r.applicant_name ?? r.profiles?.full_name ?? '',
      r.applicant_gender === 'male' ? '남' : r.applicant_gender === 'female' ? '여' : '',
      r.applicant_birth ?? '',
      r.applicant_phone ? maskPhone(r.applicant_phone) : '',
      r.job_postings?.company_name ?? '',
      r.job_postings?.center_name ?? '',
      r.job_postings?.region ?? '',
      r.work_date ?? '',
      r.status === 'confirmed' ? '출근확정' : '출근완료',
    ])
    const csv = BOM + [header, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `확정인원_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 사업장별 현황 집계
  const companyStats = (() => {
    const map: Record<string, { company: string; confirmed: number; completed: number; dates: Set<string> }> = {}
    rows.forEach(r => {
      const key = r.job_postings?.company_name ?? '기타'
      if (!map[key]) map[key] = { company: key, confirmed: 0, completed: 0, dates: new Set() }
      if (r.status === 'confirmed') map[key].confirmed++
      else if (r.status === 'completed') map[key].completed++
      if (r.work_date) map[key].dates.add(r.work_date)
    })
    return Object.values(map)
  })()

  // 화면에 표시할 목록 (사업장 필터 적용)
  const displayRows = companyFilter === 'all'
    ? rows
    : rows.filter(r => r.job_postings?.company_name === companyFilter)

  // 테이블 스타일
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', verticalAlign: 'middle',
  }
  const thStyle: React.CSSProperties = {
    ...cellStyle, color: 'rgba(255,255,255,0.4)', fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: 280, maxWidth: 420, padding: '12px 20px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
          color: '#fff', fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>✅ 확정인원 관리</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            출근 확정된 인원 현황을 관리합니다. 총 {rows.length}명
          </p>
        </div>
        <button onClick={handleExportCsv}
          style={{
            padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(49,200,100,0.1)', color: '#3fc878',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
          📥 CSV 내보내기
        </button>
      </div>

      {/* 사업장별 현황 요약 카드 */}
      {companyStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {companyStats.map(stat => (
            <div key={stat.company} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '16px 18px',
              cursor: 'pointer',
              outline: companyFilter === stat.company ? '2px solid #3182f6' : '2px solid transparent',
              transition: 'outline 0.15s',
            }}
              onClick={() => setCompanyFilter(companyFilter === stat.company ? 'all' : stat.company)}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: 10 }}>{stat.company}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3fc878', lineHeight: 1 }}>{stat.confirmed}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>출근확정</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{stat.completed}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>출근완료</div>
                </div>
              </div>
              {stat.dates.size > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                  출근일: {[...stat.dates].sort().join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 필터 바 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 사업장 필터 */}
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#1a1a2e', color: '#fff', /* 불투명 배경: option 텍스트 가시성 확보 */
            fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
          }}>
          <option value="all" style={{ background: '#1a1a2e', color: '#fff' }}>전체 사업장</option>
          {companies.map(c => <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>)}
        </select>

        {/* 상태 필터 */}
        {([
          { value: 'all' as const, label: '전체' },
          { value: 'confirmed' as const, label: '출근확정' },
          { value: 'completed' as const, label: '출근완료' },
        ]).map(opt => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: '5px 14px', borderRadius: 999, border: 'none',
              background: statusFilter === opt.value ? '#3182f6' : 'rgba(255,255,255,0.08)',
              color: statusFilter === opt.value ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
            {opt.label}
          </button>
        ))}

        {/* 출근 예정일 필터 */}
        <input
          type="text"
          value={dateFilter}
          onChange={e => {
            // 숫자 자동 포맷 YYYY-MM-DD
            const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
            let fmt = digits
            if (digits.length > 6) fmt = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
            else if (digits.length > 4) fmt = `${digits.slice(0, 4)}-${digits.slice(4)}`
            setDateFilter(fmt)
          }}
          placeholder="📅 날짜 필터 (예: 2026-04-20)"
          maxLength={10}
          style={{
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: '#fff',
            fontSize: '0.78rem', outline: 'none', minWidth: 180,
          }}
        />
        {dateFilter && (
          <button onClick={() => setDateFilter('')}
            style={{
              padding: '5px 10px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem', cursor: 'pointer',
            }}>
            ✕ 날짜 해제
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          color: '#ff6b6b', fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(null); fetchRows() }}
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            다시 시도 ↻
          </button>
        </div>
      )}

      {/* 확정인원 테이블 */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : displayRows.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
          확정 인원이 없습니다.
        </p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={thStyle}>이름</th>
                  <th style={thStyle}>인적사항</th>
                  <th style={thStyle}>사업장</th>
                  <th style={{ ...thStyle, width: 150 }}>출근 예정일</th>
                  <th style={{ ...thStyle, width: 80 }}>상태</th>
                  <th style={{ ...thStyle, width: 100 }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(row => {
                  const isEditing = editingWorkDate === row.id
                  const isSaving  = savingId === row.id
                  return (
                    <tr key={row.id}>
                      {/* 이름 */}
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {row.applicant_name ?? row.profiles?.full_name ?? '이름 없음'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                          {row.profiles?.email ?? '-'}
                        </div>
                      </td>

                      {/* 인적사항 */}
                      <td style={cellStyle}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          {row.applicant_gender === 'male' ? '남' : row.applicant_gender === 'female' ? '여' : '-'}
                          {row.applicant_birth ? ` · ${row.applicant_birth.slice(0, 10)}` : ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                          {row.applicant_phone ? maskPhone(row.applicant_phone) : '-'}
                        </div>
                      </td>

                      {/* 사업장 */}
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{row.job_postings?.company_name ?? '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                          {row.job_postings?.center_name ?? ''}
                          {row.job_postings?.region ? ` · ${row.job_postings.region}` : ''}
                        </div>
                      </td>

                      {/* 출근 예정일 (인라인 수정) */}
                      <td style={cellStyle}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editWorkDateVal}
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                                let fmt = digits
                                if (digits.length > 6) fmt = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
                                else if (digits.length > 4) fmt = `${digits.slice(0, 4)}-${digits.slice(4)}`
                                setEditWorkDateVal(fmt)
                              }}
                              maxLength={10}
                              placeholder="YYYY-MM-DD"
                              autoFocus
                              style={{
                                padding: '4px 8px', borderRadius: 6, width: 100,
                                border: '1px solid rgba(49,130,246,0.5)',
                                background: 'rgba(49,130,246,0.08)', color: '#fff',
                                fontSize: '0.78rem', outline: 'none',
                              }}
                            />
                            <button onClick={() => handleSaveWorkDate(row.id)} disabled={isSaving}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}>
                              저장
                            </button>
                            <button onClick={() => setEditingWorkDate(null)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', cursor: 'pointer' }}>
                              취소
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: row.work_date ? 700 : 400, color: row.work_date ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                              {row.work_date ?? '미정'}
                            </span>
                            {row.status === 'confirmed' && (
                              <button
                                onClick={() => {
                                  setEditingWorkDate(row.id)
                                  setEditWorkDateVal(row.work_date ?? '')
                                }}
                                style={{
                                  padding: '2px 7px', borderRadius: 6, border: 'none',
                                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)',
                                  fontSize: '0.68rem', cursor: 'pointer',
                                }}>
                                ✏️
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 상태 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                          background: row.status === 'confirmed' ? 'rgba(49,200,100,0.18)' : 'rgba(255,255,255,0.08)',
                          color: row.status === 'confirmed' ? '#3fc878' : 'rgba(255,255,255,0.5)',
                        }}>
                          {row.status === 'confirmed' ? '출근확정' : '출근완료'}
                        </span>
                      </td>

                      {/* 처리 버튼 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        {row.status === 'confirmed' ? (
                          <button disabled={isSaving} onClick={() => handleMarkCompleted(row.id)}
                            style={{
                              padding: '4px 12px', borderRadius: 8, border: 'none',
                              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              opacity: isSaving ? 0.5 : 1,
                            }}>
                            출근완료
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>처리완료</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
