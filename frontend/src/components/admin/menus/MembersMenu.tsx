// MembersMenu.tsx — 회원 관리 (개인정보 마스킹 + 보안키 언마스킹)
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

interface MemberRow {
  id: string
  email: string | null
  display_name: string | null
  full_name: string | null
  birthdate: string | null
  phone_number: string | null
  provider: string | null
  joined_at: string | null
  marketing_agreement: boolean
  updated_at: string | null
  created_at: string
}

interface Props {
  isSuperAdmin: boolean
}

const PAGE_SIZE = 20

// 이메일 마스킹: a***@gmail.com
function maskEmail(email: string | null): string {
  if (!email) return '이메일 미등록'
  const atIdx = email.indexOf('@')
  if (atIdx <= 0) return '****'
  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx)
  const visible = local.slice(0, Math.min(2, local.length))
  const masked = '*'.repeat(Math.max(3, local.length - visible.length))
  return `${visible}${masked}${domain}`
}

// UUID 마스킹
function maskId(id: string): string {
  return id.slice(0, 8) + '****-****-****-' + id.slice(-4)
}

// 이름 마스킹: 홍길동 → 홍*동
function maskName(name: string | null): string {
  if (!name) return '미등록'
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

// 생년월일 마스킹: 1990-01-01 → 1990-**-**
function maskBirthdate(date: string | null): string {
  if (!date) return '미등록'
  const parts = date.split('-')
  if (parts.length !== 3) return '****-**-**'
  return `${parts[0]}-**-**`
}

// 핸드폰 마스킹: 010-1234-5678 → 010-****-5678
function maskPhone(phone: string | null): string {
  if (!phone) return '미등록'
  const parts = phone.split('-')
  if (parts.length !== 3) return '***-****-****'
  return `${parts[0]}-****-${parts[2]}`
}

export default function MembersMenu({ isSuperAdmin }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [searchEmail, setSearchEmail] = useState('')
  const [filterMarketing, setFilterMarketing] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  // 마스킹 해제 상태
  const [unmasked, setUnmasked] = useState(false)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [unlockKey, setUnlockKey] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchEmail.trim()) query = query.ilike('email', `%${searchEmail.trim()}%`)
      if (filterMarketing === 'true') query = query.eq('marketing_agreement', true)
      else if (filterMarketing === 'false') query = query.eq('marketing_agreement', false)

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

  // 마스킹 해제 시도
  async function handleUnmask() {
    if (!supabase) return
    if (!unlockKey.trim()) { setUnlockError('보안키를 입력하세요.'); return }
    setUnlockLoading(true)
    setUnlockError('')
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'member_unmask_key')
        .single()

      const storedKey = data?.value ?? ''
      if (!storedKey) {
        setUnlockError('보안키가 설정되지 않았습니다. Settings → 개인정보 보안키에서 설정하세요.')
        return
      }
      if (unlockKey === storedKey) {
        setUnmasked(true)
        setShowUnlockDialog(false)
        setUnlockKey('')
      } else {
        setUnlockError('보안키가 일치하지 않습니다.')
      }
    } catch {
      setUnlockError('보안키 확인 중 오류가 발생했습니다.')
    } finally {
      setUnlockLoading(false)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }


  function providerBadge(provider: string | null) {
    if (!provider) return null
    const colors: Record<string, string> = {
      google: '#ea4335', kakao: '#fee500', github: '#6e40c9',
    }
    const color = colors[provider.toLowerCase()] ?? '#3182f6'
    return (
      <span style={{
        fontSize: '0.68rem', fontWeight: 700,
        color: provider.toLowerCase() === 'kakao' ? '#3d1d1d' : '#fff',
        background: color, padding: '2px 7px', borderRadius: 999,
      }}>
        {provider}
      </span>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>회원 관리</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            profiles 테이블 · 총 {total.toLocaleString()}명 로그인 회원
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* 마스킹 상태 표시 + 해제 버튼 */}
          {!unmasked ? (
            <button
              onClick={() => setShowUnlockDialog(true)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid rgba(240,200,0,0.3)',
                background: 'rgba(240,200,0,0.08)', color: '#f0c800',
                fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700,
              }}
            >
              🔒 마스킹 해제
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 8,
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#22c55e', fontSize: '0.78rem', fontWeight: 700,
              }}>
                🔓 마스킹 해제됨
              </span>
              <button
                onClick={() => { setUnmasked(false); setUnlockKey('') }}
                style={{ ...outlineBtn, fontSize: '0.75rem', padding: '5px 10px' }}
              >
                재잠금
              </button>
            </div>
          )}
          <button onClick={fetchMembers} style={outlineBtn}>↻ 새로고침</button>
        </div>
      </div>

      {/* 마스킹 해제 주의 안내 */}
      {!unmasked && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(240,200,0,0.06)', border: '1px solid rgba(240,200,0,0.15)',
          fontSize: '0.78rem', color: 'rgba(255,220,50,0.8)', lineHeight: 1.5,
        }}>
          🔒 개인정보 보호를 위해 이메일/ID가 마스킹 처리됩니다. 보안키 입력 시 전체 정보를 확인할 수 있습니다.
          {isSuperAdmin && <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 6 }}>· 보안키는 Settings → 개인정보 보안키에서 설정</span>}
        </div>
      )}

      {/* 검색/필터 */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14,
        padding: '12px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <input
          type="text" placeholder="이메일 검색..."
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setPage(1)}
          style={{ ...filterInput, flex: '1 1 180px' }}
        />
        <select
          value={filterMarketing}
          onChange={e => { setFilterMarketing(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          style={{ ...filterInput, flex: '0 1 150px' }}
        >
          <option value="">마케팅 동의 전체</option>
          <option value="true">동의함</option>
          <option value="false">미동의</option>
        </select>
        <button onClick={() => { setPage(1); fetchMembers() }} style={btnPrimary}>검색</button>
        <button onClick={() => { setSearchEmail(''); setFilterMarketing(''); setPage(1) }} style={outlineBtn}>초기화</button>
      </div>

      {/* 회원 목록 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>로딩 중...</p>
        ) : members.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            조회된 회원이 없습니다.
          </p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '1.5fr 90px 90px 110px 100px 80px 80px',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.7rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>이메일 / ID</span>
              <span>이름</span>
              <span>생년월일</span>
              <span>핸드폰</span>
              <span>소셜</span>
              <span>가입일</span>
              <span>마케팅</span>
            </div>

            {members.map(member => {
              const emailDisplay = unmasked ? (member.email ?? '이메일 미등록') : maskEmail(member.email)
              const idDisplay = unmasked ? member.id : maskId(member.id)
              const nameDisplay = unmasked ? (member.full_name ?? '미등록') : maskName(member.full_name)
              const birthdateDisplay = unmasked ? (member.birthdate ?? '미등록') : maskBirthdate(member.birthdate)
              const phoneDisplay = unmasked ? (member.phone_number ?? '미등록') : maskPhone(member.phone_number)

              return (
                <div key={member.id}>
                  {/* PC 행 */}
                  <div className="hidden md:grid" style={{
                    gridTemplateColumns: '1.5fr 90px 90px 110px 100px 80px 80px',
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                        {emailDisplay}
                      </div>
                      <div style={{
                        fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)',
                        fontFamily: 'monospace', marginTop: 1,
                      }}>
                        {idDisplay}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      {nameDisplay}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      {birthdateDisplay}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      {phoneDisplay}
                    </div>
                    <div>{providerBadge(member.provider)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                      {formatDate(member.created_at)}
                    </div>
                    <div>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        color: member.marketing_agreement ? '#22c55e' : 'rgba(255,255,255,0.25)',
                      }}>
                        {member.marketing_agreement ? '● ' : '○ '}
                      </span>
                    </div>
                  </div>

                  {/* 모바일 카드 */}
                  <div className="md:hidden" style={{
                    padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        fontSize: '0.83rem', color: '#fff', fontWeight: 600,
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {emailDisplay}
                      </div>
                      {member.provider && <div style={{ flexShrink: 0 }}>{providerBadge(member.provider)}</div>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginBottom: 6 }}>
                      {idDisplay}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                      <span>👤 {nameDisplay}</span>
                      <span>🎂 {birthdateDisplay}</span>
                      <span>📱 {phoneDisplay}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                      <span>가입: {formatDate(member.created_at)}</span>
                      <span style={{ color: member.marketing_agreement ? '#22c55e' : 'rgba(255,255,255,0.25)' }}>
                        마케팅 {member.marketing_agreement ? '동의' : '미동의'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...outlineBtn, opacity: page === 1 ? 0.4 : 1 }}>← 이전</button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', padding: '7px 12px' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...outlineBtn, opacity: page === totalPages ? 0.4 : 1 }}>다음 →</button>
        </div>
      )}

      {/* 마스킹 해제 다이얼로그 */}
      {showUnlockDialog && (
        <div style={overlayStyle} onClick={() => setShowUnlockDialog(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>🔐 개인정보 마스킹 해제</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
              슈퍼 관리자가 설정한 보안키를 입력하면 회원 이메일과 ID 전체를 확인할 수 있습니다.
            </p>
            <input
              type="password"
              placeholder="보안키 입력..."
              value={unlockKey}
              onChange={e => { setUnlockKey(e.target.value); setUnlockError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUnmask()}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: unlockError ? '1px solid #f04052' : '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.07)', color: '#fff',
                fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                marginBottom: unlockError ? 6 : 16,
              }}
            />
            {unlockError && (
              <p style={{ fontSize: '0.78rem', color: '#f04052', marginBottom: 12 }}>{unlockError}</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUnlockDialog(false)} style={{ ...outlineBtn, flex: 1 }}>취소</button>
              <button onClick={handleUnmask} disabled={unlockLoading} style={{ ...btnPrimary, flex: 1 }}>
                {unlockLoading ? '확인 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
}
const btnPrimary: React.CSSProperties = {
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
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 300, padding: 16,
}
const modalStyle: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20, padding: '28px 24px',
  width: '100%', maxWidth: 400,
}
