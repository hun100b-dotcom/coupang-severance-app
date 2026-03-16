/**
 * 진단 리포트 상세 페이지 (/report/:id)
 * - reports 테이블에서 해당 id의 리포트를 불러와 표시합니다.
 * - 로그인 필요(ProtectedRoute로 보호).
 */

import { useEffect, useState } from 'react' // 데이터 요청과 상태 관리를 위해 React 훅을 가져옵니다.
import { useParams, useNavigate } from 'react-router-dom' // URL 파라미터와 페이지 이동을 위해 라우터 훅을 사용합니다.
import { ChevronLeft, FileText } from 'lucide-react' // 아이콘 컴포넌트를 가져옵니다.
import { supabase } from '../lib/supabase' // 공용 Supabase 클라이언트를 새 경로에서 가져옵니다.
import type { ReportRow } from '../types/supabase' // 리포트 타입 정의를 가져옵니다.

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
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-5">
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
          <p className="text-sm text-[#4E5968]">
            이 리포트는 마이페이지의 「내 진단 리포트」에서 확인한 항목의 상세 화면입니다.
            추후 상세 분석 내용을 여기에 표시할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="mt-4 w-full py-3 text-sm font-semibold text-[#3182F6] border border-[#3182F6]/30 rounded-xl hover:bg-blue-50/50"
          >
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
