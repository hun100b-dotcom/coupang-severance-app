// MembersMenu.tsx — 회원 관리 (서버측 마스킹 + 단건 평문 해제)
//
// 보안 재설계(🔴#4):
//   과거에는 supabase.from('profiles').select('*')로 회원 PII(이름/이메일/전화/생년월일)를
//   평문 통째로 받아와 화면에서만 별표로 가렸다(DevTools/Network로 무력화 = 가짜 마스킹).
//   이제 ① 백엔드가 "마스킹된 데이터만" 내려보내고(getAdminMembers),
//        ② 평문은 슈퍼관리자가 보안키를 입력해 "해제 모드"에 들어간 뒤
//           각 행의 "보기"를 누를 때만 단건 reveal 엔드포인트로 받아온다(revealMember).
//   보안키는 서버에서 해시 비교하고, 누가/언제/어느 회원을 해제했는지 감사로그에 남는다.
import { useState, useEffect, useCallback } from 'react'
import { UP, RADIUS, btnPrimary, btnSecondary, badge } from '../shared/adminTheme'
import { supabase } from '../../../lib/supabase'
import {
  getAdminMembers, revealMember, type MaskedMember, type RevealedMember,
} from '../../../lib/api'

interface Props {
  isSuperAdmin: boolean
}

const PAGE_SIZE = 20

// UUID 표시용 마스킹 (id는 직접 식별 PII가 아닌 내부 키 — 표시할 때만 가린다)
function maskId(id: string): string {
  if (!id || id.length < 12) return '****'
  return id.slice(0, 8) + '****-****-****-' + id.slice(-4)
}

export default function MembersMenu({ isSuperAdmin }: Props) {
  const [members, setMembers] = useState<MaskedMember[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [searchEmail, setSearchEmail] = useState('')
  const [filterMarketing, setFilterMarketing] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  // 해제 모드 상태 — 보안키는 메모리에만 보관(저장/표시 안 함)
  const [unlockMode, setUnlockMode] = useState(false)
  const [revealKey, setRevealKey] = useState('')
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [unlockKeyInput, setUnlockKeyInput] = useState('')
  const [unlockError, setUnlockError] = useState('')

  // 행별 해제 결과 (member.id → 평문). 페이지를 떠나거나 재잠금하면 비운다.
  const [revealed, setRevealed] = useState<Record<string, RevealedMember>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState('')

  // 현재 로그인 관리자 이메일 (감사로그 who)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? ''))
  }, [])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await getAdminMembers({
        page,
        limit: PAGE_SIZE,
        search: searchEmail.trim(),
        marketing: filterMarketing,
      })
      setMembers(res.members ?? [])
      setTotal(res.total ?? 0)
      // 새 목록을 받으면 이전 해제 결과는 무효화(다른 행/페이지로 새지 않게)
      setRevealed({})
    } catch (err) {
      console.error('회원 목록 불러오기 실패:', err)
      setMembers([])
      setLoadError('회원 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [searchEmail, filterMarketing, page])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // 해제 모드 진입 — 보안키 입력만 받고, 평문은 아직 받지 않는다(행별 보기에서 단건 호출).
  function enterUnlockMode() {
    if (!unlockKeyInput.trim()) { setUnlockError('보안키를 입력하세요.'); return }
    setRevealKey(unlockKeyInput.trim())
    setUnlockMode(true)
    setShowUnlockDialog(false)
    setUnlockKeyInput('')
    setUnlockError('')
  }

  // 재잠금 — 키와 해제 결과를 모두 폐기
  function lockAgain() {
    setUnlockMode(false)
    setRevealKey('')
    setRevealed({})
  }

  // 단건 평문 해제 — "보기" 클릭 시 그 행만 서버에 요청
  async function handleReveal(memberId: string) {
    if (!revealKey) { setShowUnlockDialog(true); return }
    setRevealingId(memberId)
    try {
      const data = await revealMember(memberId, revealKey, adminEmail)
      setRevealed(prev => ({ ...prev, [memberId]: data }))
    } catch (err) {
      // 403(키 불일치) 등 → 해제 모드 해제하고 다시 키 입력 유도
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        setUnlockMode(false)
        setRevealKey('')
        setUnlockError('보안키가 일치하지 않습니다. 다시 입력하세요.')
        setShowUnlockDialog(true)
      } else if (status === 400) {
        setUnlockMode(false)
        setRevealKey('')
        alert('보안키가 설정되지 않았습니다. Settings → 개인정보 보안키에서 먼저 설정하세요.')
      } else {
        alert('해제 중 오류가 발생했습니다.')
      }
    } finally {
      setRevealingId(null)
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  function providerBadge(provider: string | null) {
    if (!provider) return null
    // OAuth 공급자 브랜드 정체성색 — 로그인 수단 식별용(구글 빨강·카카오 노랑·깃허브 보라).
    //   (P5) 테마 팔레트 대상 아님: 토큰화하면 공급자 구분이 사라지므로 브랜드 원색을 의도적으로 유지.
    const colors: Record<string, string> = {
      google: '#ea4335', kakao: '#fee500', github: '#6e40c9',
    }
    const color = colors[provider.toLowerCase()] ?? UP.brand
    return (
      <span className="text-a11" style={{ fontWeight: 700,
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
          <h2 className="text-a18" style={{ fontWeight: 800, color: UP.navy, margin: 0 }}>회원 관리</h2>
          <p className="text-a12" style={{ color: UP.sub, marginTop: 2 }}>
            profiles 테이블 · 총 {total.toLocaleString()}명 로그인 회원
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* 해제 모드 토글 — 슈퍼관리자만 노출 (권한 없으면 마스킹만 가능) */}
          {isSuperAdmin && (
            !unlockMode ? (
              <button
                onClick={() => { setUnlockError(''); setShowUnlockDialog(true) }}
                className="text-a13" style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: '1px solid rgba(240,200,0,0.3)',
                  background: 'rgba(240,200,0,0.08)', color: UP.amber, cursor: 'pointer', fontWeight: 700,
                }}
              >
                🔒 마스킹 해제
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="text-a12" style={{
                  padding: '4px 12px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  color: UP.green, fontWeight: 700,
                }}>
                  🔓 해제 모드 · 행별 보기 가능
                </span>
                <button
                  onClick={lockAgain}
                  className="text-a12" style={{ ...btnSecondary, padding: '5px 10px' }}
                >
                  재잠금
                </button>
              </div>
            )
          )}
          <button onClick={fetchMembers} style={btnSecondary}>↻ 새로고침</button>
        </div>
      </div>

      {/* 마스킹 안내 */}
      {!unlockMode && (
        <div className="text-a12" style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(240,200,0,0.06)', border: '1px solid rgba(240,200,0,0.15)', color: 'rgba(255,220,50,0.8)', lineHeight: 1.5,
        }}>
          🔒 개인정보는 서버에서 마스킹되어 전달됩니다(평문은 브라우저로 내려오지 않음).
          {isSuperAdmin
            ? <span style={{ color: UP.sub, marginLeft: 6 }}>· 보안키 입력 후 각 행의 "보기"로 단건 확인할 수 있습니다.</span>
            : <span style={{ color: UP.sub, marginLeft: 6 }}>· 평문 확인은 최고관리자 권한이 필요합니다.</span>}
        </div>
      )}

      {/* 검색/필터 */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14,
        padding: '12px', borderRadius: 12,
        background: '#fff', border: `1px solid ${UP.hair}`,
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
        <button onClick={() => { setSearchEmail(''); setFilterMarketing(''); setPage(1) }} style={btnSecondary}>초기화</button>
      </div>

      {/* 회원 목록 */}
      <div style={{
        background: '#fff',
        border: `1px solid ${UP.hair}`,
        borderRadius: RADIUS.card, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: UP.sub, padding: '32px 0' }}>로딩 중...</p>
        ) : loadError ? (
          <p className="text-a13" style={{ textAlign: 'center', color: UP.danger, padding: '32px 0', }}>
            {loadError}
          </p>
        ) : members.length === 0 ? (
          <p className="text-a13" style={{ textAlign: 'center', color: UP.sub, padding: '32px 0', }}>
            조회된 회원이 없습니다.
          </p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div className="hidden md:grid text-a11" style={{
              gridTemplateColumns: '1.5fr 90px 90px 110px 80px 80px 70px 60px 70px',
              padding: '10px 16px',
              borderBottom: `1px solid ${UP.hairSoft}`, fontWeight: 700,
              color: UP.caption,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>이메일 / ID</span>
              <span>이름</span>
              <span>생년월일</span>
              <span>핸드폰</span>
              <span>소셜</span>
              <span>가입일</span>
              <span>온보딩</span>
              <span>마케팅</span>
              <span>{isSuperAdmin ? '평문' : ''}</span>
            </div>

            {members.map(member => {
              const rev = revealed[member.id]
              // 해제된 행이면 reveal 응답(평문), 아니면 서버가 보낸 마스킹 값
              const emailDisplay = rev ? (rev.email ?? '이메일 미등록') : member.email
              const idDisplay = rev ? member.id : maskId(member.id)
              const nameDisplay = rev ? (rev.full_name ?? '미등록') : member.full_name
              const birthdateDisplay = rev ? (rev.birthdate ?? '미등록') : member.birthdate
              const phoneDisplay = rev ? (rev.phone_number ?? '미등록') : member.phone_number
              const canReveal = isSuperAdmin && unlockMode && !rev
              const isRevealing = revealingId === member.id

              return (
                <div key={member.id}>
                  {/* PC 행 */}
                  <div className="hidden md:grid" style={{
                    gridTemplateColumns: '1.5fr 90px 90px 110px 80px 80px 70px 60px 70px',
                    padding: '11px 16px',
                    borderBottom: `1px solid ${UP.hairSoft}`,
                    alignItems: 'center',
                  }}>
                    <div>
                      <div className="text-a13" style={{ color: UP.navy, fontWeight: 600 }}>
                        {emailDisplay}
                      </div>
                      <div className="text-a11" style={{ color: UP.caption,
                        fontFamily: 'monospace', marginTop: 1,
                      }}>
                        {idDisplay}
                      </div>
                    </div>
                    <div className="text-a12" style={{ color: UP.body, fontWeight: 600 }}>
                      {nameDisplay}
                    </div>
                    <div className="text-a12" style={{ color: UP.sub }}>
                      {birthdateDisplay}
                    </div>
                    <div className="text-a12" style={{ color: UP.sub }}>
                      {phoneDisplay}
                    </div>
                    <div>{providerBadge(member.provider)}</div>
                    <div className="text-a12" style={{ color: UP.sub }}>
                      {formatDate(member.created_at)}
                    </div>
                    <div>
                      <span style={badge(member.onboarding_completed ? 'green' : 'neutral')}>
                        {member.onboarding_completed ? '완료' : '미완'}
                      </span>
                    </div>
                    <div>
                      {(() => {
                        const hasMarketing = member.marketing_sms || member.marketing_email || member.marketing_phone
                        return (
                          <span className="text-a11" style={{ fontWeight: 700,
                            color: hasMarketing ? UP.green : UP.caption,
                          }}>
                            {hasMarketing ? '● ' : '○ '}
                          </span>
                        )
                      })()}
                    </div>
                    {/* 평문 보기 (해제 모드 + 슈퍼관리자) */}
                    <div>
                      {canReveal ? (
                        <button onClick={() => handleReveal(member.id)} disabled={isRevealing}
                          style={{ ...revealBtn, opacity: isRevealing ? 0.5 : 1 }}>
                          {isRevealing ? '…' : '👁 보기'}
                        </button>
                      ) : rev ? (
                        <span className="text-a10" style={{ color: UP.green, fontWeight: 700 }}>🔓 해제됨</span>
                      ) : null}
                    </div>
                  </div>

                  {/* 모바일 카드 */}
                  <div className="md:hidden" style={{
                    padding: '12px 14px', borderBottom: `1px solid ${UP.hairSoft}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div className="text-a13" style={{ color: UP.navy, fontWeight: 600,
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {emailDisplay}
                      </div>
                      {member.provider && <div style={{ flexShrink: 0 }}>{providerBadge(member.provider)}</div>}
                    </div>
                    <div className="text-a11" style={{ color: UP.caption, fontFamily: 'monospace', marginBottom: 6 }}>
                      {idDisplay}
                    </div>
                    <div className="text-a11" style={{ display: 'flex', flexDirection: 'column', gap: 3, color: UP.sub }}>
                      <span>👤 {nameDisplay}</span>
                      <span>🎂 {birthdateDisplay}</span>
                      <span>📱 {phoneDisplay}</span>
                    </div>
                    <div className="text-a11" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: UP.sub, marginTop: 6 }}>
                      <span>가입: {formatDate(member.created_at)}</span>
                      <span style={{
                        color: member.onboarding_completed ? UP.green : UP.caption,
                      }}>
                        온보딩 {member.onboarding_completed ? '완료' : '미완'}
                      </span>
                      <span style={{
                        color: (member.marketing_sms || member.marketing_email || member.marketing_phone)
                          ? UP.green : UP.caption,
                      }}>
                        마케팅 {(member.marketing_sms || member.marketing_email || member.marketing_phone) ? '동의' : '미동의'}
                      </span>
                    </div>
                    {canReveal && (
                      <button onClick={() => handleReveal(member.id)} disabled={isRevealing}
                        style={{ ...revealBtn, marginTop: 8, opacity: isRevealing ? 0.5 : 1 }}>
                        {isRevealing ? '확인 중…' : '👁 평문 보기'}
                      </button>
                    )}
                    {rev && <div className="text-a10" style={{ color: UP.green, fontWeight: 700, marginTop: 6 }}>🔓 해제됨</div>}
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnSecondary, opacity: page === 1 ? 0.4 : 1 }}>← 이전</button>
          <span className="text-a13" style={{ color: UP.sub, padding: '7px 12px' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...btnSecondary, opacity: page === totalPages ? 0.4 : 1 }}>다음 →</button>
        </div>
      )}

      {/* 해제 모드 진입 다이얼로그 */}
      {showUnlockDialog && (
        <div style={overlayStyle} onClick={() => setShowUnlockDialog(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div className="text-a16" style={{ fontWeight: 800, color: UP.navy, marginBottom: 6 }}>🔐 개인정보 마스킹 해제</div>
            <p className="text-a13" style={{ color: UP.sub, marginBottom: 16, lineHeight: 1.5 }}>
              보안키를 입력하면 해제 모드로 전환됩니다. 이후 각 회원 행의 "보기"를 누를 때마다
              해당 1명의 평문 정보가 서버에서 전송되며, 해제 기록은 감사로그에 남습니다.
            </p>
            <input
              type="password"
              placeholder="보안키 입력..."
              value={unlockKeyInput}
              onChange={e => { setUnlockKeyInput(e.target.value); setUnlockError('') }}
              onKeyDown={e => e.key === 'Enter' && enterUnlockMode()}
              autoFocus
              className="text-a14" style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: unlockError ? `1px solid ${UP.danger}` : `1px solid ${UP.hair}`,
                background: '#fff', color: UP.navy, outline: 'none', boxSizing: 'border-box',
                marginBottom: unlockError ? 6 : 16,
              }}
            />
            {unlockError && (
              <p className="text-a12" style={{ color: UP.danger, marginBottom: 12 }}>{unlockError}</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUnlockDialog(false)} style={{ ...btnSecondary, flex: 1 }}>취소</button>
              <button onClick={enterUnlockMode} style={{ ...btnPrimary, flex: 1 }}>해제 모드 진입</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const revealBtn: React.CSSProperties = {
  padding: '4px 9px', borderRadius: 7,
  border: '1px solid rgba(34,197,94,0.3)',
  background: 'rgba(34,197,94,0.08)', color: UP.green,
  fontSize: '0.66rem', cursor: 'pointer', fontWeight: 700,
}
const filterInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${UP.hair}`,
  background: '#fff', color: UP.navy,
  fontSize: '0.82rem', outline: 'none',
}
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 300, padding: 16,
}
const modalStyle: React.CSSProperties = {
  background: '#fff', border: `1px solid ${UP.hair}`,
  borderRadius: 16, padding: '28px 24px',
  width: '100%', maxWidth: 400,
}
