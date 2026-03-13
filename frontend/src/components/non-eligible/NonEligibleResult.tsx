import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../GlassCard'
import { PrimaryButton, SecondaryButton } from '../Button'

type Provider = 'kakao' | 'google'

interface Props {
  reason: string
  onRestart: () => void
}

interface AuthStatus {
  kakao: 'idle' | 'loading' | 'success' | 'error'
  google: 'idle' | 'loading' | 'success' | 'error'
}

function buildDateGrid(year: number, month: number): Date[] {
  // month: 0-11
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonthDays = startWeekday
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const dates: Date[] = []

  // 이전 달
  for (let i = prevMonthDays - 1; i >= 0; i -= 1) {
    dates.push(new Date(year, month - 1, daysInPrevMonth - i))
  }
  // 이번 달
  for (let d = 1; d <= daysInMonth; d += 1) {
    dates.push(new Date(year, month, d))
  }
  // 다음 달 (42칸 채우기)
  while (dates.length < 42) {
    const last = dates[dates.length - 1]
    dates.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }
  return dates
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

export default function NonEligibleResult({ reason, onRestart }: Props) {
  const navigate = useNavigate()

  const today = useMemo(() => new Date(), [])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [firstWorkDate, setFirstWorkDate] = useState<Date | null>(null)
  const [dateInput, setDateInput] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()) // 0-11
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ kakao: 'idle', google: 'idle' })
  const [skipLogin, setSkipLogin] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dDayDate = useMemo(() => {
    if (!firstWorkDate) return null
    const d = new Date(firstWorkDate)
    d.setFullYear(d.getFullYear() + 1)
    return d
  }, [firstWorkDate])

  const calendarDates = useMemo(
    () => buildDateGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  )

  useEffect(() => {
    if (dDayDate && (authStatus.kakao === 'success' || authStatus.google === 'success' || skipLogin)) {
      const timer = setTimeout(() => {
        setStep(3)
      }, 1200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [dDayDate, authStatus.kakao, authStatus.google, skipLogin])

  const firstWorkDateValid = !!firstWorkDate

  const handleDateInputChange = (val: string) => {
    setDateInput(val)
    if (!val) {
      setFirstWorkDate(null)
      setSelectedDate(null)
      setErrorMessage(null)
      return
    }
    const parsed = parseDate(val)
    if (!parsed) {
      setErrorMessage('YYYY-MM-DD 형식으로 입력해 주세요.')
      return
    }
    setErrorMessage(null)
    setFirstWorkDate(parsed)
    setSelectedDate(parsed)
    setCalendarYear(parsed.getFullYear())
    setCalendarMonth(parsed.getMonth())
  }

  const handleSelectCalendarDate = (date: Date) => {
    setSelectedDate(date)
    setFirstWorkDate(date)
    setDateInput(formatDate(date))
    setErrorMessage(null)
    setCalendarOpen(false)
  }

  const handleMonthChange = (delta: number) => {
    const base = new Date(calendarYear, calendarMonth + delta, 1)
    setCalendarYear(base.getFullYear())
    setCalendarMonth(base.getMonth())
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()

  const handleLoginMock = (provider: Provider) => {
    setAuthStatus(prev => ({ ...prev, [provider]: 'loading' }))

    // TODO: 실제 OAuth 연동 시 주석 해제
    // const { data, error } = await supabase.auth.signInWithOAuth({
    //   provider: 'kakao' | 'google',
    //   options: {
    //     redirectTo: `${window.location.origin}/auth/callback`,
    //   },
    // })

    setTimeout(() => {
      setAuthStatus(prev => ({ ...prev, [provider]: 'success' }))
    }, 1500)
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          {[1, 2, 3].map(i => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '999px',
                background: i === step ? 'var(--toss-blue)' : 'rgba(148,163,184,0.6)',
                transform: i === step ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <GlassCard className="p-6 md:p-8" animate>
          <div
            style={{
              display: 'flex',
              width: '300%',
              transform: `translateX(-${(step - 1) * 100}%)`,
              transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {/* STEP 1 */}
            <div style={{ width: '100%', flexShrink: 0 }}>
              <div style={{ marginBottom: 18 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(49,130,246,0.08)',
                    color: 'var(--toss-blue)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <span>진단 결과</span>
                </span>
              </div>

              <h2
                className="heading-md"
                style={{
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}
              >
                아직은 실업급여 받기가{' '}
                <span style={{ color: 'var(--toss-blue)' }}>조금 이른 상태예요</span>
              </h2>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--toss-text-2)',
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                {reason}
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--toss-text)',
                    marginBottom: 8,
                  }}
                >
                  첫 출근일을 알려주세요
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD (예: 2023-06-01)"
                    value={dateInput}
                    onChange={e => handleDateInputChange(e.target.value)}
                    style={{
                      flex: 1,
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 12,
                      border: '1px solid var(--toss-border, #e5e7eb)',
                      background: 'rgba(249,250,251,0.9)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(true)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid var(--toss-border, #e5e7eb)',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      cursor: 'pointer',
                    }}
                  >
                    📅
                  </button>
                </div>
                {errorMessage && (
                  <p style={{ marginTop: 6, fontSize: '0.8rem', color: '#dc2626' }}>{errorMessage}</p>
                )}
                <p style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--toss-text-3)' }}>
                  첫 출근일 기준으로 1년이 되는 날을 계산해 드릴게요.
                </p>
              </div>

              <PrimaryButton
                disabled={!firstWorkDateValid}
                onClick={() => setStep(2)}
              >
                다음으로
              </PrimaryButton>
              <SecondaryButton
                style={{ marginTop: 10 }}
                onClick={onRestart}
              >
                처음으로 돌아가기
              </SecondaryButton>
            </div>

            {/* STEP 2 */}
            <div style={{ width: '100%', flexShrink: 0, paddingLeft: 24, paddingRight: 24 }}>
              <h2 className="heading-md" style={{ marginBottom: 10 }}>
                첫 출근일 기준 <span style={{ color: 'var(--toss-blue)' }}>1년 D-Day</span> 에요
              </h2>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--toss-text-2)',
                  marginBottom: 18,
                }}
              >
                이 날짜 전후로 다시 한 번 자격을 확인하면, 실업급여 수급 가능성이 크게 올라가요.
              </p>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #e8f1ff, #f4f7ff)',
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--toss-text-3)',
                    marginBottom: 6,
                  }}
                >
                  첫 출근일
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {formatDate(firstWorkDate)}
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--toss-text-3)',
                    marginBottom: 4,
                  }}
                >
                  첫 출근일 기준 1년이 되는 날
                </p>
                <p
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    color: 'var(--toss-blue)',
                    fontFamily: "'Inter', 'Pretendard', sans-serif",
                  }}
                >
                  {formatDate(dDayDate)}
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--toss-text-2)',
                    marginBottom: 10,
                  }}
                >
                  이 날짜를 놓치지 않도록, 간편 로그인으로 알림을 받아보세요.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleLoginMock('kakao')}
                    disabled={authStatus.kakao === 'loading'}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 999,
                      border: 'none',
                      background: '#FEE500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: '#191600',
                        color: '#FEE500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                      }}
                    >
                      K
                    </span>
                    <span>
                      {authStatus.kakao === 'loading' ? '카카오 로그인 처리 중...' : '카카오로 로그인하고 알림받기'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoginMock('google')}
                    disabled={authStatus.google === 'loading'}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 999,
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                      }}
                    >
                      G
                    </span>
                    <span>
                      {authStatus.google === 'loading' ? 'Google 로그인 처리 중...' : 'Google로 로그인하고 알림받기'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSkipLogin(true)
                      setStep(3)
                    }}
                    style={{
                      marginTop: 2,
                      background: 'none',
                      border: 'none',
                      color: 'var(--toss-text-3)',
                      fontSize: '0.8rem',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      alignSelf: 'center',
                    }}
                  >
                    로그인은 나중에 할게요
                  </button>
                </div>
              </div>

              {(authStatus.kakao === 'success' || authStatus.google === 'success') && (
                <div
                  style={{
                    marginTop: 4,
                    padding: '8px 10px',
                    borderRadius: 999,
                    background: 'rgba(0,196,140,0.08)',
                    color: '#00a876',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  알림 신청이 완료되었어요. 잠시 후 혜택 안내로 이동합니다.
                </div>
              )}
            </div>

            {/* STEP 3 */}
            <div style={{ width: '100%', flexShrink: 0, paddingLeft: 24 }}>
              <h2 className="heading-md" style={{ marginBottom: 10 }}>
                지금은 비대상자여도
                <br />
                놓치지 말아야 할 혜택이 있어요
              </h2>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--toss-text-2)',
                  marginBottom: 18,
                  lineHeight: 1.6,
                }}
              >
                실업급여 외에도 근로장려금, 긴급복지 등 다양한 지원 제도가 있어요.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: 'rgba(232,241,255,0.8)',
                    border: '1px solid rgba(148,163,184,0.35)',
                  }}
                >
                  <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--toss-text)' }}>근로장려금(EITC)</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>
                    소득이 일정 기준 이하인 근로자에게 연 1회 현금으로 지급되는 제도예요.
                  </p>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: 'rgba(240,249,255,0.85)',
                    border: '1px solid rgba(148,163,184,0.35)',
                  }}
                >
                  <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--toss-text)' }}>긴급복지지원</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>
                    갑작스러운 소득 상실로 생계가 어려울 때, 생계·주거비 등을 일시적으로 지원받을 수 있어요.
                  </p>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: 'rgba(243,244,246,0.9)',
                    border: '1px solid rgba(148,163,184,0.35)',
                  }}
                >
                  <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--toss-text)' }}>지자체 청년·근로자 지원</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginTop: 4 }}>
                    거주 지역의 청년·근로자 대상 지원금을 함께 확인해 보세요.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PrimaryButton onClick={onRestart}>
                  다시 조건 계산하기
                </PrimaryButton>
                <SecondaryButton onClick={() => navigate('/')}>
                  ← 메인 화면으로
                </SecondaryButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Calendar bottom sheet */}
      {calendarOpen && (
        <div
          onClick={() => setCalendarOpen(false)}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="presentation"
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(18px)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: '0 -18px 40px rgba(15,23,42,0.28)',
              padding: '14px 16px 18px',
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: 'rgba(148,163,184,0.6)',
                margin: '0 auto 10px',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--toss-text)',
                }}
              >
                {calendarYear}.{`${calendarMonth + 1}`.padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ›
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: 4,
                marginBottom: 4,
                fontSize: '0.7rem',
                color: 'var(--toss-text-3)',
                textAlign: 'center',
              }}
            >
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: 4,
              }}
            >
              {calendarDates.map(date => {
                const inMonth = date.getMonth() === calendarMonth
                const isToday = isSameDay(date, today)
                const isSelected = selectedDate && isSameDay(date, selectedDate)

                let color = 'var(--toss-text)'
                if (!inMonth) color = 'rgba(148,163,184,0.7)'

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleSelectCalendarDate(date)}
                    style={{
                      height: 36,
                      borderRadius: 999,
                      border: 'none',
                      background: isSelected ? 'var(--toss-blue)' : 'transparent',
                      color: isSelected ? '#ffffff' : color,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {isToday && !isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 4,
                          borderRadius: 999,
                          border: '1px solid rgba(59,130,246,0.5)',
                        }}
                      />
                    )}
                    <span>{date.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

