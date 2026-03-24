// MembersMenu.tsx — 회원 관리 메뉴
// ─────────────────────────────────────────────────────────────
// Supabase `profiles` 테이블과 `auth.users` 기반으로 가입 회원을 조회합니다.
//
// profiles 테이블: id(=auth.users.id), joined_at, marketing_agreement, updated_at
// auth.users는 직접 쿼리할 수 없으므로, profiles를 통해 조회합니다.
// 이메일/소셜 정보는 Supabase Admin API를 통해야 하나,
// 여기서는 profiles 테이블에 추가된 email, provider 컬럼을 활용합니다.
// (컬럼이 없을 경우 graceful 처리)
//
// SQL: supabase/migrations/005_profiles_extended.sql 참조

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 회원 타입 (profiles 테이블 기준) ──
interface MemberRow {
  id: string
  email: string | null        // profiles에 email 저장 시
  provider: string | null     // 소셜 로그인 제공자 (google, kakao 등)
  joined_at: string | null    // 입사일 (사용자가 입력한 값)
  marketing_agreement: boolean
  updated_at: string | null
  created_at: string          // 가입일
}

const PAGE_SIZE = 20 // 페이지당 표시 회원 수

export default function MembersMenu() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── 검색/필터 상태 ──
  const [searchEmail, setSearchEmail] = useState('')
  const [filterMarketing, setFilterMarketing] = useState<'' | 'true' | 'false'>('')

  // ── 페이지네이션 ──
  const [page, setPage] = useState(1)

  // ── 회원 목록 불러오기 ──
  const fetchMembers = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      // profiles 테이블에서 조회
      // email 컬럼이 없을 수 있으므로 select에서 graceful 처리
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // 이메일 검색 필터
      if (searchEmail.trim()) {
        query = query.ilike('email', `%${searchEmail.trim()}%`)
      }
      // 마케팅 동의 필터
      if (filterMarketing === 'true') {
        query = query.eq('marketing_agreement', true)
      } else if (filterMarketing === 'false') {
        query = query.eq('marketing_agreement', false)
      }

      // 페이지네이션
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      setMembers(data ?? [])
      setTotal(count ?? 0)
    } catch (err) {
      console.error('회원 목록 불러오기 실패:', err)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [searchEmail, filterMarketing, page])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // ── 날짜 포맷 ──
  function formatDate(iso: string | null) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  // ── 소셜 로그인 제공자 표시 ──
  function providerBadge(provider: string | null) {
    if (!provider) return null
    const colors: Record<string, string> = {
      google: '#ea4335',
      kakao: '#fee500',
      github: '#6e40c9',
    }
    const color = colors[provider.toLowerCase()] ?? '#3182f6'
    return (
      <span style={{
        fontSize: '0.68rem', fontWeight: 700,
        color: provider.toLowerCase() === 'kakao' ? '#3d1d1d' : '#fff',
        background: color,
        padding: '2px 7px', borderRadius: 999,
      }}>
        {provider}
      </span>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            회원 관리
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            profiles 테이블 기준 · 총 {total.toLocaleString()}명
          </p>
        </div>
        <button onClick={fetchMembers} style={{ ...outlineBtn, marginLeft: 'auto' }}>↻ 새로고침</button>
      </div>

      {/* ── 검색/필터 ── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* 이메일 검색 */}
        <input
          type="text"
          placeholder="이메일 검색..."
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setPage(1)}
          style={{ ...filterInput, flex: '1 1 200px' }}
        />
        {/* 마케팅 동의 필터 */}
        <select
          value={filterMarketing}
          onChange={e => { setFilterMarketing(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          style={{ ...filterInput, flex: '0 1 160px' }}
        >
          <option value="">마케팅 동의 전체</option>
          <option value="true">동의함</option>
          <option value="false">미동의</option>
        </select>
        {/* 검색 버튼 */}
        <button onClick={() => { setPage(1); fetchMembers() }} style={primaryBtn}>
          검색
        </button>
        {/* 초기화 */}
        <button
          onClick={() => { setSearchEmail(''); setFilterMarketing(''); setPage(1) }}
          style={outlineBtn}
        >
          초기화
        </button>
      </div>

      {/* ── 회원 목록 ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>
            로딩 중...
          </p>
        ) : members.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            조회된 회원이 없습니다.
          </p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div
              className="hidden md:grid"
              style={{
                gridTemplateColumns: '1fr 100px 120px 120px 80px',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.72rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              <span>이메일 / ID</span>
              <span>소셜</span>
              <span>가입일</span>
              <span>마지막 수정</span>
              <span>마케팅</span>
            </div>

            {members.map(member => (
              <div key={member.id}>
                {/* PC 행 */}
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '1fr 100px 120px 120px 80px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                      {member.email ?? '이메일 미등록'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                      {member.id.substring(0, 16)}...
                    </div>
                  </div>
                  <div>{providerBadge(member.provider)}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                    {formatDate(member.created_at)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                    {formatDate(member.updated_at)}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      color: member.marketing_agreement ? '#22c55e' : 'rgba(255,255,255,0.25)',
                    }}>
                      {member.marketing_agreement ? '● 동의' : '○ 미동의'}
                    </span>
                  </div>
                </div>

                {/* 모바일 카드 */}
                <div
                  className="md:hidden"
                  style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, wordBreak: 'break-all', flex: 1 }}>
                      {member.email ?? '이메일 미등록'}
                    </div>
                    {member.provider && (
                      <div style={{ marginLeft: 8, flexShrink: 0 }}>{providerBadge(member.provider)}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                    <span>가입: {formatDate(member.created_at)}</span>
                    <span style={{ color: member.marketing_agreement ? '#22c55e' : 'rgba(255,255,255,0.25)' }}>
                      마케팅 {member.marketing_agreement ? '동의' : '미동의'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...outlineBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            ← 이전
          </button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', padding: '7px 12px' }}>
            {page} / {totalPages} 페이지
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...outlineBtn, opacity: page === totalPages ? 0.4 : 1 }}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

// ── 공통 스타일 ──
const outlineBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8,
  border: 'none', background: '#3182f6', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
const filterInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#fff',
  fontSize: '0.82rem', outline: 'none',
}
