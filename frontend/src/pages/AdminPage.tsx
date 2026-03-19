// 관리자 전용 1:1 문의 관리 페이지입니다.
// 접근 조건: 로그인 + 이메일이 VITE_ADMIN_EMAIL 환경 변수와 일치해야 합니다.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GlassCard from '../components/GlassCard'
import { api } from '../lib/api'

// ── 타입 정의 ────────────────────────────────────────────
interface Inquiry {
  id: string
  user_id: string
  category: string
  content: string
  status: string          // 'waiting' | 'answered'
  answer: string | null
  created_at: string
  title?: string          // 문의 제목 (있을 수도 없을 수도 있음)
}

// 상태 필터 탭 종류
type FilterStatus = '전체' | '대기중' | '답변완료'

// ── 날짜 포맷 함수 ──────────────────────────────────────
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

// ── 카테고리 배지 색상 ──────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    '퇴직금/실업급여': 'rgba(49,130,246,0.12)',
    '서류발급':         'rgba(108,92,231,0.12)',
    '오류/버그':        'rgba(240,68,82,0.12)',
    '기타':             'rgba(100,100,100,0.10)',
  }
  const textMap: Record<string, string> = {
    '퇴직금/실업급여': '#3182f6',
    '서류발급':         '#6c5ce7',
    '오류/버그':        '#cc2233',
    '기타':             '#666',
  }
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: colorMap[category] ?? 'rgba(100,100,100,0.10)',
      color: textMap[category] ?? '#666',
    }}>
      {category}
    </span>
  )
}

// ── 상태 배지 ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isAnswered = status === 'answered' || status === '답변완료'
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: isAnswered ? 'rgba(0,196,140,0.12)' : 'rgba(255,168,0,0.12)',
      color: isAnswered ? '#00a876' : '#f08c00',
    }}>
      {isAnswered ? '✓ 답변완료' : '⏳ 대기중'}
    </span>
  )
}

// ── 문의 카드 (접기/펼치기 + 답변 작성) ────────────────
function InquiryCard({
  inquiry,
  adminSecret,
  onAnswered,
}: {
  inquiry: Inquiry
  adminSecret: string
  onAnswered: (id: string, answer: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [answerText, setAnswerText] = useState(inquiry.answer ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isAnswered = inquiry.status === 'answered' || inquiry.status === '답변완료'

  // 답변 제출 함수
  const handleSubmit = async () => {
    if (!answerText.trim()) {
      setError('답변 내용을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.patch(
        `/admin/inquiries/${inquiry.id}/answer`,
        { answer: answerText.trim() },
        { headers: { 'X-Admin-Token': adminSecret } },
      )
      onAnswered(inquiry.id, answerText.trim())
    } catch {
      setError('답변 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* 카드 헤더 — 클릭하면 펼치기/접기 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 배지 행 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <CategoryBadge category={inquiry.category} />
            <StatusBadge status={inquiry.status} />
          </div>
          {/* 내용 미리보기 */}
          <p style={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'var(--toss-text)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: open ? 'normal' : 'nowrap',
          }}>
            {inquiry.title ?? inquiry.content.slice(0, 60)}
          </p>
          {/* 날짜 + user_id */}
          <p style={{ fontSize: '0.75rem', color: 'var(--toss-text-3)' }}>
            {formatDate(inquiry.created_at)} · {inquiry.user_id.slice(0, 8)}…
          </p>
        </div>
        {/* 펼치기 화살표 */}
        <span style={{
          fontSize: '0.8rem',
          color: 'var(--toss-text-3)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          marginTop: 2,
        }}>▼</span>
      </div>

      {/* 펼쳐진 내용 영역 */}
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }} />

          {/* 문의 전체 내용 */}
          <div style={{
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.85rem',
            color: 'var(--toss-text)',
            lineHeight: 1.7,
            marginBottom: 14,
            whiteSpace: 'pre-wrap',
          }}>
            {inquiry.content}
          </div>

          {/* 기존 답변이 있으면 보여주기 */}
          {isAnswered && inquiry.answer && (
            <div style={{
              background: 'rgba(0,196,140,0.07)',
              border: '1px solid rgba(0,196,140,0.15)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: 'var(--toss-text)',
              lineHeight: 1.7,
              marginBottom: 14,
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00a876', marginBottom: 6 }}>
                ✓ 등록된 답변
              </p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{inquiry.answer}</p>
            </div>
          )}

          {/* 답변 작성 폼 */}
          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder="답변을 입력하세요..."
            rows={4}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: 'var(--toss-text)',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ fontSize: '0.8rem', color: '#cc2233', marginTop: 6 }}>{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '12px',
              background: submitting ? 'rgba(49,130,246,0.4)' : 'var(--toss-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '등록 중...' : isAnswered ? '답변 수정하기' : '답변 등록하기'}
          </button>
        </div>
      )}
    </div>
  )
}


// ── 메인 관리자 페이지 ──────────────────────────────────
export default function AdminPage() {
  const { user, isLoggedIn, loading, logout } = useAuth()
  const navigate = useNavigate()

  // 관리자 이메일: frontend/.env의 VITE_ADMIN_EMAIL과 일치해야 접근 가능
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL ?? ''
  // 관리자 시크릿: frontend/.env의 VITE_ADMIN_SECRET (백엔드 ADMIN_SECRET과 동일)
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET ?? ''

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('전체')
  const [searchText, setSearchText] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  // 관리자 여부 판단: 로그인 + 이메일 일치
  const isAdmin = isLoggedIn && !!user?.email && user.email === adminEmail

  // 로그인 상태 확인 후 비관리자이면 홈으로 이동
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/')
    }
  }, [loading, isAdmin, navigate])

  // 문의 목록 불러오기
  const fetchInquiries = useCallback(async () => {
    if (!isAdmin || !adminSecret) return
    setLoadingData(true)
    setFetchError('')
    try {
      const res = await api.get('/admin/inquiries', {
        headers: { 'X-Admin-Token': adminSecret },
      })
      setInquiries(res.data.inquiries ?? [])
    } catch {
      setFetchError('문의 목록을 불러오지 못했습니다. 환경 변수 설정을 확인해주세요.')
    } finally {
      setLoadingData(false)
    }
  }, [isAdmin, adminSecret])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  // 특정 문의에 답변이 등록되면 로컬 상태도 업데이트 (재요청 없이)
  const handleAnswered = (id: string, answer: string) => {
    setInquiries(prev =>
      prev.map(inq =>
        inq.id === id ? { ...inq, answer, status: 'answered' } : inq,
      ),
    )
  }

  // 상태 + 검색 필터 적용
  const filtered = inquiries.filter(inq => {
    const statusMatch =
      filterStatus === '전체' ? true :
      filterStatus === '대기중' ? (inq.status === 'waiting' || inq.status === '대기중') :
      (inq.status === 'answered' || inq.status === '답변완료')

    const searchMatch = searchText === '' ||
      inq.content.includes(searchText) ||
      (inq.title ?? '').includes(searchText) ||
      inq.category.includes(searchText)

    return statusMatch && searchMatch
  })

  // 통계 계산
  const totalCount    = inquiries.length
  const waitingCount  = inquiries.filter(i => i.status === 'waiting' || i.status === '대기중').length
  const answeredCount = inquiries.filter(i => i.status === 'answered' || i.status === '답변완료').length

  // 로딩 중이면 빈 화면
  if (loading) return null

  // 관리자 아니면 렌더링 안 함 (useEffect에서 navigate 처리)
  if (!isAdmin) return null

  return (
    <div style={{
      position: 'relative', zIndex: 1,
      minHeight: '100vh',
      padding: '24px 16px 56px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 640 }}>

        {/* ── 헤더 ───────────────────────────────────── */}
        <GlassCard className="p-6" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 4 }}>
                관리자 대시보드
              </p>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--toss-text)' }}>
                1:1 문의 관리
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={() => { logout(); navigate('/') }}
              style={{
                padding: '8px 14px',
                background: 'rgba(240,68,82,0.1)',
                color: '#cc2233',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </div>
        </GlassCard>

        {/* ── 통계 카드 ──────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: '전체 문의', value: totalCount, color: 'var(--toss-blue)' },
            { label: '대기중', value: waitingCount, color: '#f08c00' },
            { label: '답변완료', value: answeredCount, color: '#00a876' },
          ].map(stat => (
            <GlassCard key={stat.label} className="p-4" animate={false}>
              <p style={{ fontSize: '0.75rem', color: 'var(--toss-text-3)', marginBottom: 4 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>
                {stat.value}
              </p>
            </GlassCard>
          ))}
        </div>

        {/* ── 검색 + 필터 ────────────────────────────── */}
        <GlassCard className="p-4" style={{ marginBottom: 16 }} animate={false}>
          {/* 검색창 */}
          <input
            type="text"
            placeholder="문의 내용, 카테고리로 검색..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: '0.88rem',
              color: 'var(--toss-text)',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />

          {/* 상태 필터 탭 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['전체', '대기중', '답변완료'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterStatus === status
                    ? 'var(--toss-blue)'
                    : 'rgba(255,255,255,0.07)',
                  color: filterStatus === status ? '#fff' : 'var(--toss-text-3)',
                  transition: 'all 0.15s',
                }}
              >
                {status}
                {status === '대기중' && waitingCount > 0 && (
                  <span style={{
                    marginLeft: 5,
                    background: '#f08c00',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '1px 5px',
                    fontSize: '0.7rem',
                  }}>
                    {waitingCount}
                  </span>
                )}
              </button>
            ))}

            {/* 새로고침 버튼 */}
            <button
              onClick={fetchInquiries}
              style={{
                marginLeft: 'auto',
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.07)',
                color: 'var(--toss-text-3)',
              }}
            >
              🔄 새로고침
            </button>
          </div>
        </GlassCard>

        {/* ── 문의 목록 ──────────────────────────────── */}
        {fetchError ? (
          <GlassCard className="p-6" animate={false}>
            <p style={{ color: '#cc2233', fontSize: '0.88rem', textAlign: 'center' }}>
              ⚠️ {fetchError}
            </p>
            <p style={{ color: 'var(--toss-text-3)', fontSize: '0.8rem', textAlign: 'center', marginTop: 8 }}>
              backend/.env에 ADMIN_SECRET과 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는지 확인하세요.
            </p>
          </GlassCard>
        ) : loadingData ? (
          <GlassCard className="p-6" animate={false}>
            <p style={{ color: 'var(--toss-text-3)', textAlign: 'center' }}>불러오는 중...</p>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="p-6" animate={false}>
            <p style={{ color: 'var(--toss-text-3)', textAlign: 'center', fontSize: '0.88rem' }}>
              {searchText || filterStatus !== '전체'
                ? '검색 결과가 없습니다.'
                : '접수된 문의가 없습니다.'}
            </p>
          </GlassCard>
        ) : (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 10 }}>
              {filtered.length}건 표시 중
            </p>
            {filtered.map(inq => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                adminSecret={adminSecret}
                onAnswered={handleAnswered}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
