/**
 * 진단 리포트 상세 페이지 (/report/:id)
 * - reports 테이블에서 해당 id의 리포트를 불러와 표시합니다.
 * - 로그인 필요(ProtectedRoute로 보호).
 */

import { useEffect, useState } from 'react' // 데이터 요청과 상태 관리를 위해 React 훅을 가져옵니다.
import { useParams, useNavigate } from 'react-router-dom' // URL 파라미터와 페이지 이동을 위해 라우터 훅을 사용합니다.
import { ChevronLeft, FileText } from 'lucide-react' // 아이콘 컴포넌트를 가져옵니다.
import { supabase } from '../lib/supabase' // 공용 Supabase 클라이언트를 새 경로에서 가져옵니다.
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
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
        <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-[#8B95A1]">리포트 불러오는 중...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4">
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
    <div className="min-h-screen bg-[#F2F4F6] pb-8 relative z-10">
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="p-2 text-[#4E5968]"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#191F28] truncate">진단 리포트</h1>
        </div>
      </header>

      <div className="max-w-[460px] mx-auto px-4 pt-4">
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#191F28] truncate">{report.title || '쿠팡 진단 리포트'}</p>
              <p className="text-xs text-[#8B95A1]">
                {report.company_name && `${report.company_name} · `}
                {formatDate(report.created_at)} 진단 완료
              </p>
            </div>
          </div>

          {/* payload가 있으면 계산 결과 표시 */}
          {report.payload && (report.payload as SeverancePayload).severance ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-[#8B95A1] mb-2">예상 퇴직금 (세전)</p>
                <p className="text-2xl font-bold text-[#191F28] mb-1">{fmt(Math.round((report.payload as SeverancePayload).severance))}<span className="text-base font-medium ml-1">원</span></p>
                <div className="inline-flex items-center gap-2 mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    (report.payload as SeverancePayload).eligible
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {(report.payload as SeverancePayload).eligible ? '✓ 수급 가능' : '✗ 요건 미충족'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-blue-50/50 rounded-xl">
                  <p className="text-xs text-[#8B95A1] mb-1">평균 일당</p>
                  <p className="font-bold text-[#191F28]">{fmt(Math.round((report.payload as SeverancePayload).average_wage))}<span className="text-xs font-medium ml-1">원/일</span></p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl">
                  <p className="text-xs text-[#8B95A1] mb-1">근무일수</p>
                  <p className="font-bold text-[#191F28]">{(report.payload as SeverancePayload).work_days.toLocaleString()}<span className="text-xs font-medium ml-1">일</span></p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl">
                  <p className="text-xs text-[#8B95A1] mb-1">인정 근속기간</p>
                  <p className="font-bold text-[#191F28]">{(report.payload as SeverancePayload).qualifying_days}<span className="text-xs font-medium ml-1">일</span></p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl">
                  <p className="text-xs text-[#8B95A1] mb-1">적용 기준</p>
                  <p className="font-bold text-[#191F28] text-sm">365일</p>
                </div>
              </div>

              {(report.payload as SeverancePayload).eligibility_message && (
                <div className="p-3 bg-blue-50/50 rounded-xl mb-4">
                  <p className="text-xs text-[#8B95A1] font-medium mb-1">자격 판정</p>
                  <p className="text-sm text-[#191F28]">{(report.payload as SeverancePayload).eligibility_message}</p>
                </div>
              )}

              <p className="text-xs text-[#8B95A1] leading-relaxed mb-4">
                ※ 이 결과는 참고용입니다. 정확한 퇴직금은 회사 급여 기록과 노무사 상담을 통해 확인해 주세요.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#4E5968] mb-4">
              계산 데이터가 없습니다.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="w-full py-3 text-sm font-semibold text-[#3182F6] border border-[#3182F6]/30 rounded-xl hover:bg-blue-50/50"
          >
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
