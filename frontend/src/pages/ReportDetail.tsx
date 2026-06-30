/**
 * 진단 리포트 상세 페이지 (/report/:id)
 * - reports 테이블에서 해당 id의 리포트를 불러와 표시합니다.
 * - 로그인 필요(ProtectedRoute로 보호).
 */

import { useEffect, useState } from 'react' // 데이터 요청과 상태 관리를 위해 React 훅을 가져옵니다.
import { useParams, useNavigate } from 'react-router-dom' // URL 파라미터와 페이지 이동을 위해 라우터 훅을 사용합니다.
import { ChevronLeft, FileText } from 'lucide-react' // 아이콘 컴포넌트를 가져옵니다.
import Container from '../components/ui/Container'
import { supabase } from '../lib/supabase' // 공용 Supabase 클라이언트를 새 경로에서 가져옵니다.
import { logAccess } from '../lib/accessLog' // 접근 로그 기록
import type { ReportRow, SeverancePayload } from '../types/supabase' // 리포트 타입 정의를 가져옵니다.

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!id || !client) {
      setLoading(false)
      if (!client) setError('Supabase가 설정되지 않았습니다.')
      return
    }

    const fetchReport = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await client
          .from('reports')
          .select('*')
          .eq('id', id)
          .single()
        if (err) throw err
        setReport(data as ReportRow)

        // 접근 로그 기록 (계산 결과 조회)
        logAccess('view_report', id)
      } catch (e) {
        setError('리포트를 불러오지 못했어요.')
        setReport(null)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id])

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    } catch {
      return iso
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-[#8B95A1]">리포트 불러오는 중...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="relative z-[1] min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <p className="text-[#191F28] font-medium">{error ?? '존재하지 않는 리포트입니다.'}</p>
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="mt-4 text-sm text-[#3182F6] font-medium"
        >
          마이페이지로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="relative z-[1] min-h-screen pb-8">
      <header className="sticky top-14 z-40 bg-page/85 backdrop-blur-md border-b border-line">
        <Container size="narrow" className="h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-md text-ink-700 hover:bg-[#F2F4F6] transition-colors"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-extrabold text-up-navy truncate">진단 리포트</h1>
        </Container>
      </header>

      <Container size="narrow" className="pt-4">
        <div className="bg-white rounded-xl shadow-card border border-up-hair p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-brand-bg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink-900 truncate">{report.title || '쿠팡 진단 리포트'}</p>
              <p className="text-xs text-ink-700 truncate">
                {report.company_name && `${report.company_name} · `}
                {formatDate(report.created_at)} 진단 완료
              </p>
            </div>
          </div>

          {/* payload가 있으면 계산 결과 표시 */}
          {report.payload && (report.payload as SeverancePayload).severance ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-ink-700 mb-2">예상 퇴직금 (세전)</p>
                <p className="text-[clamp(26px,7vw,38px)] font-mono font-black text-brand-strong mb-1 tracking-tight tabular-nums break-keep leading-none">{fmt(Math.round((report.payload as SeverancePayload).severance))}<span className="text-base font-bold ml-1">원</span></p>
                <div className="inline-flex items-center gap-2 mt-2">
                  <span className={`inline-block px-3 py-1 rounded-pill text-xs font-bold ${
                    (report.payload as SeverancePayload).eligible
                      ? 'bg-accent-bg text-[#047857]'
                      : 'bg-danger/10 text-danger'
                  }`}>
                    {(report.payload as SeverancePayload).eligible ? '✓ 수급 가능' : '✗ 요건 미충족'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-brand-bg rounded-md min-w-0">
                  <p className="text-xs text-ink-700 mb-1">평균 일당</p>
                  <p className="font-bold text-ink-900 tabular-nums">{fmt(Math.round((report.payload as SeverancePayload).average_wage))}<span className="text-xs font-medium ml-1">원/일</span></p>
                </div>
                <div className="p-3 bg-brand-bg rounded-md min-w-0">
                  <p className="text-xs text-ink-700 mb-1">근무일수</p>
                  <p className="font-bold text-ink-900 tabular-nums">{(report.payload as SeverancePayload).work_days.toLocaleString()}<span className="text-xs font-medium ml-1">일</span></p>
                </div>
                <div className="p-3 bg-brand-bg rounded-md min-w-0">
                  <p className="text-xs text-ink-700 mb-1">인정 근속기간</p>
                  <p className="font-bold text-ink-900 tabular-nums">{(report.payload as SeverancePayload).qualifying_days}<span className="text-xs font-medium ml-1">일</span></p>
                </div>
                <div className="p-3 bg-brand-bg rounded-md min-w-0">
                  <p className="text-xs text-ink-700 mb-1">적용 기준</p>
                  <p className="font-bold text-ink-900 text-sm">365일</p>
                </div>
              </div>

              {(report.payload as SeverancePayload).eligibility_message && (
                <div className="p-3 bg-[#F7F9FC] border border-up-hair rounded-md mb-4">
                  <p className="text-xs text-ink-700 font-medium mb-1">자격 판정</p>
                  <p className="text-sm text-ink-900 break-keep">{(report.payload as SeverancePayload).eligibility_message}</p>
                </div>
              )}

              <p className="text-xs text-ink-700 leading-relaxed mb-4 break-keep">
                ※ 이 결과는 참고용입니다. 정확한 퇴직금은 회사 급여 기록과 노무사 상담을 통해 확인해 주세요.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-700 mb-4">
              계산 데이터가 없습니다.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="w-full min-h-[48px] text-sm font-semibold text-brand-strong border border-brand-200 rounded-md hover:bg-brand-bg transition-colors"
          >
            마이페이지로 돌아가기
          </button>
        </div>
      </Container>
    </div>
  )
}
