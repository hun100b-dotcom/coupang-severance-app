import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonthDays = startWeekday
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const dates: Date[] = []

  for (let i = prevMonthDays - 1; i >= 0; i -= 1) {
    dates.push(new Date(year, month - 1, daysInPrevMonth - i))
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    dates.push(new Date(year, month, d))
  }

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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

export default function NonEligibleResult({ reason, onRestart }: Props) {
  const navigate = useNavigate()

  const today = useMemo(() => new Date(), [])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ kakao: 'idle', google: 'idle' })
  const [skipLogin, setSkipLogin] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dDayDate = useMemo(() => {
    if (!selectedDate) return null
    const d = new Date(selectedDate)
    d.setFullYear(d.getFullYear() + 1)
    return d
  }, [selectedDate])

  const calendarDates = useMemo(
    () => buildDateGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  )

  useEffect(() => {
    if (
      dDayDate
      && (authStatus.kakao === 'success' || authStatus.google === 'success' || skipLogin)
    ) {
      const timer = setTimeout(() => {
        setStep(3)
      }, 1200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [dDayDate, authStatus.kakao, authStatus.google, skipLogin])

  const handleSelectCalendarDate = (date: Date) => {
    setSelectedDate(date)
    setErrorMessage(null)
    setCalendarOpen(false)
  }

  const handleMonthChange = (delta: number) => {
    const base = new Date(calendarYear, calendarMonth + delta, 1)
    setCalendarYear(base.getFullYear())
    setCalendarMonth(base.getMonth())
  }

  const handleLoginMock = (provider: Provider) => {
    setAuthStatus(prev => ({ ...prev, [provider]: 'loading' }))

    setTimeout(() => {
      setAuthStatus(prev => ({ ...prev, [provider]: 'success' }))
    }, 1500)
  }

  const handleNextStep = () => {
    if (!selectedDate) {
      setErrorMessage('첫 출근일을 먼저 선택해 주세요.')
      return
    }
    setStep(2)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px]">
        <div className="flex justify-center gap-2 mb-3">
          {[1, 2, 3].map(i => (
            <span
              key={i}
              className={`
                w-2.5 h-2.5 rounded-full transition
                ${step === i ? 'bg-toss-blue scale-110' : 'bg-slate-300'}
              `}
            />
          ))}
        </div>

        <GlassCard animate={false} className="bg-transparent shadow-none page-enter">
          <div
            className="
              bg-white/95
              backdrop-blur-xl
              rounded-[32px]
              shadow-[0_20px_60px_rgba(49,130,246,0.12)]
              px-6 py-7 md:px-8 md:py-8
              relative overflow-x-hidden max-h-[85vh] overflow-y-auto
            "
          >
            <motion.div
              className="flex w-[300%]"
              animate={{ x: `-${(step - 1) * 100}%` }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="flex-0 w-full flex-shrink-0">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold mb-3">
                    <span>진단 결과</span>
                  </div>

                  <h2 className="text-[26px] leading-[1.3] font-extrabold tracking-tight text-[#191F28] mb-2">
                    아직은 퇴직금을 받기에는{' '}
                    <span className="text-toss-blue">조금 이른 상태예요</span>
                  </h2>
                  <p className="text-[13px] text-[#4E5968] mb-6">
                    {reason}
                  </p>

                  <div>
                    <p className="text-[13px] font-semibold text-[#191F28] mb-2">
                      첫 출근일을 알려주세요
                    </p>

                    <button
                      type="button"
                      onClick={() => setCalendarOpen(true)}
                      className="
                        w-full flex items-center justify-between
                        px-4 py-3
                        rounded-2xl
                        bg-[#F9FAFB]
                        border border-gray-100
                        text-[14px]
                        hover:bg-gray-50
                        transition
                      "
                    >
                      <span className={selectedDate ? 'text-[#191F28]' : 'text-[#9CA3AF]'}>
                        {selectedDate ? formatDate(selectedDate) : '날짜를 선택해 주세요'}
                      </span>
                      <span className="text-[#A0AEC0] text-lg">📅</span>
                    </button>
                    {errorMessage && (
                      <p className="mt-1 text-[11px] text-red-500">
                        {errorMessage}
                      </p>
                    )}
                    <p className="mt-2 text-[12px] text-[#8B95A1]">
                      첫 출근일부터 1년이 되는 날을 기준으로, 계속근로 1년과 4주 평균 15시간 이상 근무 요건을 함께 살펴볼 수 있어요.
                    </p>

                    <div className="mt-5 flex flex-col gap-2">
                      <PrimaryButton
                        onClick={handleNextStep}
                        className="w-full"
                      >
                        이 날짜로 계산하기
                      </PrimaryButton>
                      <SecondaryButton onClick={onRestart}>
                        처음으로 돌아가기
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-0 w-full flex-shrink-0">
                <div className="px-2 sm:px-3 md:px-4">
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold mb-3">
                      <span>D-Day 계산</span>
                    </div>
                    <h2 className="text-[26px] leading-[1.3] font-extrabold tracking-tight text-[#191F28] mb-2">
                      첫 출근일 기준 <span className="text-toss-blue">1년 D-Day</span> 에요
                    </h2>
                    <p className="text-[13px] text-[#4E5968]">
                      퇴직금은 계속근로기간 1년 이상, 4주 평균 15시간 이상 근무해야 받을 수 있어요.
                      이 D-Day 전후로 근무 시간과 계약 상태를 한 번 더 점검해 보시면 좋아요.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-[#e8f1ff] to-[#f4f7ff] px-4 py-3 mb-5">
                    <p className="text-[12px] text-[#8B95A1] mb-1">첫 출근일</p>
                    <p className="text-[15px] font-semibold text-[#191F28] mb-3">
                      {formatDate(selectedDate)}
                    </p>
                    <p className="text-[12px] text-[#8B95A1] mb-1">첫 출근일 기준 1년이 되는 날</p>
                    <p className="text-[22px] font-extrabold text-toss-blue font-sans tracking-tight">
                      {formatDate(dDayDate)}
                    </p>
                  </div>

                  <div className="mb-5">
                    <p className="text-[13px] text-[#4E5968] mb-3">
                      이 날짜를 놓치지 않도록, 간편 로그인으로 알림을 받아보세요.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoginMock('kakao')}
                        disabled={authStatus.kakao === 'loading'}
                        className="
                          w-full h-12 rounded-full
                          bg-[#FEE500] text-[#191600]
                          flex items-center justify-center gap-2
                          text-[14px] font-semibold
                          shadow-sm
                        "
                      >
                        <span className="w-5 h-5 rounded-md bg-[#191600] text-[#FEE500] flex items-center justify-center text-[11px] font-bold">
                          K
                        </span>
                        <span>
                          {authStatus.kakao === 'loading'
                            ? '카카오 로그인 처리 중...'
                            : '카카오로 로그인하고 알림받기'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoginMock('google')}
                        disabled={authStatus.google === 'loading'}
                        className="
                          w-full h-12 rounded-full
                          bg-white text-[#191F28]
                          border border-gray-200
                          flex items-center justify-center gap-2
                          text-[14px] font-semibold
                        "
                      >
                        <span className="w-5 h-5 rounded-md border border-gray-300 flex items-center justify-center text-[11px] font-bold">
                          G
                        </span>
                        <span>
                          {authStatus.google === 'loading'
                            ? 'Google 로그인 처리 중...'
                            : 'Google로 로그인하고 알림받기'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSkipLogin(true)
                          setStep(3)
                        }}
                        className="mt-1 text-[12px] text-[#8B95A1] underline self-center"
                      >
                        로그인은 나중에 할게요
                      </button>
                    </div>
                  </div>

                  {(authStatus.kakao === 'success' || authStatus.google === 'success') && (
                    <div className="mt-1 px-3 py-2 rounded-full bg-[rgba(0,196,140,0.08)] text-[#00a876] text-[12px] font-semibold text-center">
                      알림 신청이 완료되었어요. 잠시 후 혜택 안내로 이동합니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-0 w-full flex-shrink-0">
                <div className="px-2 sm:px-3 md:px-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold mb-3">
                    <span>다른 혜택</span>
                  </div>
                  <h2 className="text-[26px] leading-[1.3] font-extrabold tracking-tight text-[#191F28] mb-2">
                    지금은 비대상자여도
                    <br />
                    놓치지 말아야 할 혜택이 있어요
                  </h2>
                  <p className="text-[13px] text-[#4E5968] mb-5">
                    퇴직금 외에도 근로장려금, 긴급복지 등 다양한 지원 제도가 있어요.
                  </p>

                  <div className="flex flex-col gap-3 mb-5">
                    <div className="rounded-2xl bg-[rgba(232,241,255,0.8)] border border-[rgba(148,163,184,0.35)] px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#191F28] mb-1">근로장려금(EITC)</p>
                      <p className="text-[12px] text-[#8B95A1] mt-1">
                        소득이 일정 기준 이하인 근로자에게 연 1회 현금으로 지급되는 제도예요.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[rgba(240,249,255,0.85)] border border-[rgba(148,163,184,0.35)] px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#191F28] mb-1">긴급복지지원</p>
                      <p className="text-[12px] text-[#8B95A1] mt-1">
                        갑작스러운 소득 상실로 생계가 어려울 때, 생계·주거비 등을 일시적으로 지원받을 수 있어요.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[rgba(243,244,246,0.9)] border border-[rgba(148,163,184,0.35)] px-4 py-3">
                      <p className="text-[13px] font-semibold text-[#191F28] mb-1">지자체 청년·근로자 지원</p>
                      <p className="text-[12px] text-[#8B95A1] mt-1">
                        거주 지역의 청년·근로자 대상 지원금을 함께 확인해 보세요.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    <PrimaryButton onClick={onRestart}>
                      다시 조건 계산하기
                    </PrimaryButton>
                    <SecondaryButton onClick={() => navigate('/')}>
                      ← 메인 화면으로
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </GlassCard>
      </div>

      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.45)] backdrop-blur-[4px] flex items-end justify-center"
            onClick={() => setCalendarOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="
                w-full max-w-[460px]
                bg-white/96 backdrop-blur-2xl
                rounded-t-[24px]
                shadow-[0_-18px_40px_rgba(15,23,42,0.28)]
                px-4 pt-3 pb-4
              "
            >
              <div
                className="
                  w-10 h-1 rounded-full
                  bg-slate-400
                  mx-auto mb-3
                "
              />

              <div
                className="
                  flex items-center justify-between
                  mb-2
                "
              >
                <button
                  type="button"
                  onClick={() => handleMonthChange(-1)}
                  className="
                    border-none bg-none cursor-pointer
                    text-xl text-slate-600 p-2
                  "
                >
                  ‹
                </button>
                <span
                  className="
                    text-sm font-bold text-[#191F28]
                  "
                >
                  {calendarYear}.{`${calendarMonth + 1}`.padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => handleMonthChange(1)}
                  className="
                    border-none bg-none cursor-pointer
                    text-xl text-slate-600 p-2
                  "
                >
                  ›
                </button>
              </div>

              <div
                className="
                  grid grid-cols-7 gap-1
                  text-center text-[11px] text-[#8B95A1]
                  mb-2
                "
              >
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              <div
                className="
                  grid grid-cols-7 gap-1
                "
              >
                {calendarDates.map(date => {
                  const inMonth = date.getMonth() === calendarMonth
                  const isToday = isSameDay(date, today)
                  const isSelected = selectedDate && isSameDay(date, selectedDate)

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => handleSelectCalendarDate(date)}
                      className={`
                        h-9 flex items-center justify-center rounded-full text-[11px]
                        ${isSelected ? 'bg-toss-blue text-white' :
                          !inMonth ? 'text-slate-300' : 'text-[#191F28] hover:bg-slate-100'}
                        relative cursor-pointer
                      `}
                    >
                      {isToday && !isSelected && (
                        <span
                          className="
                            absolute inset-1
                            rounded-full border border-[rgba(59,130,246,0.5)]
                          "
                        />
                      )}
                      <span>{date.getDate()}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

