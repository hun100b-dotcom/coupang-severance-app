// ============================================================
// CalcFeedback: 계산기 결과 화면 하단 피드백/문의 폼 (4개 계산기 공용)
// - 비침습적: 결과를 가리지 않게 결과 아래 카드로 표시.
// - 제출 후 "감사합니다" 상태. 세션당 계산기별 1회 제출(중복 방지).
// - 저장: calc_feedback 테이블(anon insert 허용). 로그인 시 user_id 연결.
// ============================================================
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// 계산기 종류(4종) — DB calc_type 값과 일치
export type CalcType = 'severance' | 'unemployment' | 'weekly' | 'annual'

const SESSION_KEY = 'catch_session_id'          // useVisitorTracking 과 동일 세션 키 재사용
const doneKey = (t: CalcType) => `catch_feedback_${t}`  // 세션당 계산기별 제출 여부

function getSessionId(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

export default function CalcFeedback({ calcType }: { calcType: CalcType }) {
  const { user } = useAuth()
  // 이미 이번 세션에 이 계산기 피드백을 냈으면 처음부터 완료 상태로
  const already = (() => { try { return !!sessionStorage.getItem(doneKey(calcType)) } catch { return false } })()

  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [hasError, setHasError] = useState<boolean | null>(null)
  const [errorDetail, setErrorDetail] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>(already ? 'done' : 'idle')

  const canSubmit = helpful !== null || hasError !== null || message.trim() !== ''

  const submit = async () => {
    if (state === 'saving') return
    if (!canSubmit) { setState('error'); return }
    setState('saving')
    try {
      if (!supabase) throw new Error('no client')
      const { error } = await supabase.from('calc_feedback').insert({
        calc_type: calcType,
        helpful,
        has_error: hasError === true,
        error_detail: hasError === true ? (errorDetail.trim() || null) : null,
        message: message.trim() || null,
        email: email.trim() || null,
        user_id: user?.id ?? null,
        session_id: getSessionId(),
      })
      if (error) throw error
      try { sessionStorage.setItem(doneKey(calcType), '1') } catch { /* 무시 */ }
      setState('done')
    } catch {
      setState('error')
    }
  }

  // ── 제출 완료 상태 ──
  if (state === 'done') {
    return (
      <div className="mt-4 rounded-2xl border border-line bg-white p-5 text-center">
        <div className="text-2xl mb-1">🙏</div>
        <p className="text-base font-bold text-ink-900">감사합니다!</p>
        <p className="text-sm text-ink-600 mt-1">소중한 의견이 일용직 권리 증진에 큰 힘이 됩니다.</p>
      </div>
    )
  }

  const YesNo = ({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) => (
    <div className="flex gap-2">
      {[{ v: true, label: '예' }, { v: false, label: '아니오' }].map(o => (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            value === o.v
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-ink-700 border-line hover:border-brand'
          }`}
        >{o.label}</button>
      ))}
    </div>
  )

  return (
    <div className="mt-4 rounded-2xl border border-line bg-white p-5">
      {/* 안내 문구(종훈님 지정) */}
      <p className="text-base font-extrabold text-ink-900">일용직 권리 증진을 위해 사이트에 도움을 주세요</p>
      <p className="text-sm text-ink-600 mt-1 mb-4">피드백이나 문의를 무엇이든 해주세요.</p>

      {/* ① 도움 여부 */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-ink-800 mb-1.5">이 계산기가 도움이 됐나요?</p>
        <YesNo value={helpful} onChange={setHelpful} />
      </div>

      {/* ② 오류 여부 */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-ink-800 mb-1.5">계산 중 오류가 있었나요?</p>
        <YesNo value={hasError} onChange={setHasError} />
        {hasError === true && (
          <input
            type="text"
            value={errorDetail}
            onChange={e => setErrorDetail(e.target.value)}
            placeholder="어디서 어떤 오류가 있었나요? (선택)"
            className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand"
            maxLength={500}
          />
        )}
      </div>

      {/* ③ 자유 의견/문의 */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-ink-800 mb-1.5">자유 의견·문의 <span className="font-normal text-ink-500">(선택)</span></p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="개선 아이디어, 궁금한 점 무엇이든 남겨주세요."
          rows={3}
          className="w-full rounded-xl border border-line px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand resize-none"
          maxLength={1000}
        />
      </div>

      {/* ④ 이메일(선택) */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink-800 mb-1.5">연락받을 이메일 <span className="font-normal text-ink-500">(선택)</span></p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="답변이 필요하면 입력해주세요."
          className="w-full rounded-xl border border-line px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand"
          maxLength={200}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-500 mb-2">
          {canSubmit ? '전송에 실패했어요. 잠시 후 다시 시도해주세요.' : '한 가지 이상 응답해주세요.'}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={state === 'saving'}
        className="w-full py-3 rounded-xl bg-brand text-white text-sm font-bold disabled:opacity-60"
      >
        {state === 'saving' ? '보내는 중…' : '의견 보내기'}
      </button>
    </div>
  )
}
