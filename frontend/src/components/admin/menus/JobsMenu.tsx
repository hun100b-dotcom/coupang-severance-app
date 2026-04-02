// 관리자 — 채용공고 관리 메뉴
// 공고 목록 테이블 + 추가/수정 모달 + 삭제(soft delete) + 긴급 토글
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import type { JobPosting } from '../../../types/supabase'

interface JobForm {
  company_name: string
  center_name: string
  region: string
  headcount: number
  hourly_wage: number
  work_hours: string
  description: string
  contact_phone: string
  external_link: string
  is_urgent: boolean
  expires_at: string
}

const defaultForm: JobForm = {
  company_name: '', center_name: '', region: '',
  headcount: 0, hourly_wage: 0, work_hours: '',
  description: '', contact_phone: '', external_link: '',
  is_urgent: false, expires_at: '',
}

export default function JobsMenu() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<JobForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  // 필터: 전체/active/expired/deleted
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchJobs = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    let query = supabase.from('job_postings').select('*').order('created_at', { ascending: false })
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setJobs((data ?? []) as JobPosting[])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    // 초기 데이터 로드
    fetchJobs()

    // job_postings 테이블 Realtime 구독 — INSERT/UPDATE/DELETE 모두 감지
    // Supabase 대시보드에서 job_postings 테이블 Realtime이 활성화되어 있어야 합니다.
    const channel = supabase!
      .channel('jobs-postings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_postings' },
        (_payload) => {
          // 채용공고 변경 감지 시 목록 자동 갱신
          fetchJobs()
        }
      )
      .subscribe()

    // 컴포넌트 언마운트 시 구독 해제 (메모리 누수 방지)
    return () => {
      supabase!.removeChannel(channel)
    }
  }, [fetchJobs])

  // 새 공고 추가 모달 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  // 수정 모달 열기
  const openEdit = (job: JobPosting) => {
    setEditTarget(job)
    setForm({
      company_name: job.company_name,
      center_name: job.center_name,
      region: job.region,
      headcount: job.headcount,
      hourly_wage: job.hourly_wage,
      work_hours: job.work_hours,
      description: job.description,
      contact_phone: job.contact_phone,
      external_link: job.external_link,
      is_urgent: job.is_urgent,
      expires_at: job.expires_at ?? '',
    })
    setModalOpen(true)
  }

  // 저장 (생성 또는 수정)
  const handleSave = async () => {
    if (!supabase || !form.company_name.trim() || !form.region.trim()) return
    setSaving(true)
    const payload = {
      company_name: form.company_name.trim(),
      center_name: form.center_name.trim(),
      region: form.region.trim(),
      headcount: form.headcount,
      hourly_wage: form.hourly_wage,
      work_hours: form.work_hours.trim(),
      description: form.description.trim(),
      contact_phone: form.contact_phone.trim(),
      external_link: form.external_link.trim(),
      is_urgent: form.is_urgent,
      expires_at: form.expires_at || null,
    }
    if (editTarget) {
      await supabase.from('job_postings').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('job_postings').insert({ ...payload, created_by: user?.id ?? null })
    }
    setSaving(false)
    setModalOpen(false)
    fetchJobs()
  }

  // 긴급 토글
  const handleToggleUrgent = async (job: JobPosting) => {
    if (!supabase) return
    await supabase.from('job_postings')
      .update({ is_urgent: !job.is_urgent })
      .eq('id', job.id)
    fetchJobs()
  }

  // 삭제 (soft delete → status = 'deleted')
  const handleDelete = async (job: JobPosting) => {
    if (!window.confirm(`"${job.company_name} ${job.center_name}" 공고를 삭제할까요?`)) return
    if (!supabase) return
    await supabase.from('job_postings')
      .update({ status: 'deleted' })
      .eq('id', job.id)
    fetchJobs()
  }

  // 시급 포맷 (12000 → "12,000원")
  const fmtWage = (w: number) => w.toLocaleString('ko-KR') + '원'

  // ── 스타일 ──
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.83rem',
    color: 'rgba(255,255,255,0.75)',
    verticalAlign: 'middle',
  }
  const thStyle: React.CSSProperties = {
    ...cellStyle,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '0.88rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }
  const labelSpan: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.45)',
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>💼 채용공고 관리</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
            채용정보 피드에 노출되는 공고를 관리합니다. ({jobs.length}건)
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: '8px 18px', borderRadius: 10, border: 'none',
          background: '#3182f6', color: '#fff', fontWeight: 700,
          fontSize: '0.85rem', cursor: 'pointer',
        }}>
          + 새 공고 추가
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'active', 'expired', 'deleted'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none',
            background: statusFilter === s ? '#3182f6' : 'rgba(255,255,255,0.08)',
            color: statusFilter === s ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
          }}>
            {s === 'all' ? '전체' : s === 'active' ? '활성' : s === 'expired' ? '만료' : '삭제됨'}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={{ ...thStyle, width: 60 }}>긴급</th>
                  <th style={thStyle}>회사</th>
                  <th style={thStyle}>센터</th>
                  <th style={thStyle}>지역</th>
                  <th style={{ ...thStyle, width: 80 }}>시급</th>
                  <th style={{ ...thStyle, width: 50 }}>인원</th>
                  <th style={{ ...thStyle, width: 90 }}>마감일</th>
                  <th style={{ ...thStyle, width: 60 }}>상태</th>
                  <th style={{ ...thStyle, width: 130 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                      공고가 없습니다.
                    </td>
                  </tr>
                )}
                {jobs.map(job => (
                  <tr key={job.id} style={{ transition: 'background 0.15s' }}>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button onClick={() => handleToggleUrgent(job)} style={{
                        padding: '3px 10px', borderRadius: 999, border: 'none',
                        background: job.is_urgent ? 'rgba(240,68,82,0.18)' : 'rgba(255,255,255,0.08)',
                        color: job.is_urgent ? '#f04452' : 'rgba(255,255,255,0.35)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      }}>
                        {job.is_urgent ? '급구' : '-'}
                      </button>
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{job.company_name}</td>
                    <td style={cellStyle}>{job.center_name}</td>
                    <td style={cellStyle}>{job.region}</td>
                    <td style={{ ...cellStyle, color: '#3182f6', fontWeight: 700 }}>{fmtWage(job.hourly_wage)}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{job.headcount}명</td>
                    <td style={cellStyle}>{job.expires_at ?? '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                        background: job.status === 'active' ? 'rgba(49,200,100,0.18)' : job.status === 'expired' ? 'rgba(255,180,0,0.18)' : 'rgba(255,255,255,0.08)',
                        color: job.status === 'active' ? '#3fc878' : job.status === 'expired' ? '#ffb400' : 'rgba(255,255,255,0.35)',
                      }}>
                        {job.status === 'active' ? '활성' : job.status === 'expired' ? '만료' : '삭제'}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button onClick={() => openEdit(job)} style={{
                        marginRight: 6, padding: '3px 10px', borderRadius: 8, border: 'none',
                        background: 'rgba(49,130,246,0.15)', color: '#3182f6',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      }}>수정</button>
                      {job.status !== 'deleted' && (
                        <button onClick={() => handleDelete(job)} style={{
                          padding: '3px 10px', borderRadius: 8, border: 'none',
                          background: 'rgba(240,68,82,0.12)', color: '#f04452',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}>삭제</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 추가/수정 모달 ── */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16162a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: 28, width: '100%', maxWidth: 560,
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800 }}>
              {editTarget ? '공고 수정' : '새 공고 추가'}
            </h3>

            {/* 회사명 + 센터명 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>회사명 *</span>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="쿠팡" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>센터명</span>
                <input value={form.center_name} onChange={e => setForm(f => ({ ...f, center_name: e.target.value }))}
                  placeholder="이천1물류센터" style={inputStyle} />
              </label>
            </div>

            {/* 지역 */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelSpan}>지역 *</span>
              <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder="경기 이천" style={inputStyle} />
            </label>

            {/* 시급 + 인원 + 근무시간 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>시급 (원)</span>
                <input type="number" value={form.hourly_wage || ''} onChange={e => setForm(f => ({ ...f, hourly_wage: parseInt(e.target.value) || 0 }))}
                  placeholder="12000" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>모집인원</span>
                <input type="number" value={form.headcount || ''} onChange={e => setForm(f => ({ ...f, headcount: parseInt(e.target.value) || 0 }))}
                  placeholder="20" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>근무시간</span>
                <input value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))}
                  placeholder="09:00~18:00" style={inputStyle} />
              </label>
            </div>

            {/* 상세 내용 */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelSpan}>상세 내용</span>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="근무 조건, 복리후생 등" style={{ ...inputStyle, resize: 'vertical' as const }} />
            </label>

            {/* 연락처 + 외부링크 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>연락처</span>
                <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  placeholder="010-1234-5678" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>외부 링크</span>
                <input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                  placeholder="https://..." style={inputStyle} />
              </label>
            </div>

            {/* 마감일 + 긴급 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
              <label style={{ flex: 1 }}>
                <span style={labelSpan}>마감일</span>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={labelSpan}>긴급</span>
                <div onClick={() => setForm(f => ({ ...f, is_urgent: !f.is_urgent }))} style={{
                  width: 44, height: 26, borderRadius: 999,
                  background: form.is_urgent ? '#f04452' : 'rgba(255,255,255,0.12)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: form.is_urgent ? 21 : 3, transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}>취소</button>
              <button onClick={handleSave}
                disabled={saving || !form.company_name.trim() || !form.region.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 10, border: 'none',
                  background: saving || !form.company_name.trim() || !form.region.trim()
                    ? 'rgba(49,130,246,0.3)' : '#3182f6',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
