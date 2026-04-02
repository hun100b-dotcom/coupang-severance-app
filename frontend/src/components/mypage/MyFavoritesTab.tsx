// 📌 즐겨찾기 탭 — 저장한 채용 공고 목록
// job_favorites 테이블에서 내가 저장한 회사/센터 목록과
// 해당 회사의 현재 활성 공고를 함께 보여줍니다.
//
// ⚠️ "CJ만 나오는 문제" 원인 분석:
//   - 이 탭은 job_favorites(내 즐겨찾기) → company_name 추출 → job_postings IN(company_names) 쿼리
//   - 쿼리 자체는 user_id 기준으로 정상 동작함
//   - CJ만 표시되는 이유: job_postings DB에 CJ 공고만 존재하기 때문
//   - JobsPage가 SAMPLE_JOBS 하드코딩을 사용하는 동안 즐겨찾기 추가 시
//     favorite_value에 "쿠팡풀필먼트서비스::이천1물류센터" 등이 저장되었지만
//     실제 job_postings 테이블엔 CJ 공고만 있어 나머지가 히트되지 않음
//   - 해결: JobsPage를 DB 연동으로 교체 + 어드민에서 실제 공고 등록
import { useEffect, useState } from 'react'
import { Star, MapPin, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listFavorites, removeFavorite } from '../../lib/jobFavorites'
import type { JobFavorite, JobPosting } from '../../types/supabase'

interface Props {
  userId: string
}

export default function MyFavoritesTab({ userId }: Props) {
  // 즐겨찾기 목록
  const [favorites, setFavorites] = useState<JobFavorite[]>([])
  // 즐겨찾기한 회사의 현재 공고
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  // 데이터 로드 실패 시 에러 메시지 (null이면 정상)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // 데이터 불러오기 (즐겨찾기 + 해당 회사 공고)
  // try-catch로 에러 상태를 관리하여 빈 화면 대신 에러 UI 표시
  const loadData = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      // 1단계: 즐겨찾기 목록 조회
      const favs = await listFavorites(userId)
      setFavorites(favs)

      if (favs.length === 0 || !supabase) {
        setJobs([])
        return
      }

      // 2단계: 즐겨찾기한 회사(company 타입)들의 현재 공고 조회
      // "회사명::센터명" 형태의 center 타입은 회사명 부분만 추출
      const companyNames = [
        ...new Set([
          ...favs.filter(f => f.favorite_type === 'company').map(f => f.favorite_value),
          ...favs.filter(f => f.favorite_type === 'center').map(f => f.favorite_value.split('::')[0]),
        ])
      ]

      if (companyNames.length === 0) { setJobs([]); return }

      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .in('company_name', companyNames)
        .eq('status', 'active')
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false })

      // Supabase 쿼리 에러 시 throw하여 catch 블록으로 이동
      if (error) throw error

      setJobs((data ?? []) as JobPosting[])
    } catch (err) {
      console.error('[즐겨찾기 탭 오류]', err)
      setFetchError('불러오기 실패. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [userId])

  // 즐겨찾기 해제 후 목록 새로고침
  const handleUnfavorite = async (type: 'company' | 'center', value: string) => {
    await removeFavorite(userId, type, value)
    await loadData()
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

  // ── 에러 상태 UI ──
  // 빈 화면 대신 에러 메시지 + 재시도 버튼 표시
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-300" />
        </div>
        <p className="text-[14px] font-bold text-[#4e5968]">{fetchError}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#3182f6] text-white text-[13px] font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    )
  }

  // 즐겨찾기 없음
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center">
          <Star className="w-8 h-8 text-yellow-300" />
        </div>
        <p className="text-[15px] font-bold text-[#4e5968]">아직 저장한 공고가 없어요</p>
        <p className="text-[13px] text-[#8b95a1] leading-relaxed">
          채용정보 탭에서 ⭐을 눌러<br />관심 회사나 센터를 저장하세요
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── 저장한 회사/센터 태그 목록 ── */}
      <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
        <p className="text-[12px] font-bold text-[#8b95a1] mb-3 uppercase tracking-wide">
          저장한 회사 · 센터 ({favorites.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {favorites.map(fav => (
            <div key={fav.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 border border-yellow-200">
              {/* 즐겨찾기 타입 라벨 */}
              <span className="text-[10px] text-yellow-600 font-bold">
                {fav.favorite_type === 'company' ? '회사' : '센터'}
              </span>
              <span className="text-[13px] font-semibold text-[#4e5968]">
                {/* center 타입은 "회사명::센터명" 형태이므로 센터명만 표시 */}
                {fav.favorite_type === 'center'
                  ? fav.favorite_value.split('::')[1] ?? fav.favorite_value
                  : fav.favorite_value}
              </span>
              {/* 즐겨찾기 해제 버튼 */}
              <button
                onClick={() => handleUnfavorite(fav.favorite_type, fav.favorite_value)}
                className="ml-0.5 text-yellow-400 hover:text-red-400 transition-colors"
                title="즐겨찾기 해제"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 저장한 회사의 현재 공고 ── */}
      {jobs.length > 0 ? (
        <>
          <p className="text-[14px] font-extrabold text-[#191f28] px-1 mt-1">
            저장한 회사의 현재 공고
          </p>
          {jobs.map(job => (
            <div key={job.id}
              className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
              {/* 헤더: 회사명 + 급구 배지 + 즐겨찾기 해제 */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[15px] font-extrabold text-[#191f28]">{job.company_name}</span>
                    {job.is_urgent && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">급구</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8b95a1] mt-0.5">{job.center_name}</p>
                </div>
                {/* 이미 즐겨찾기 된 항목 — 별 클릭으로 해제 */}
                <button
                  onClick={() => handleUnfavorite('company', job.company_name)}
                  className="p-1.5 rounded-xl hover:bg-yellow-50 transition-colors shrink-0">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </button>
              </div>

              {/* 위치 + 근무시간 */}
              <div className="flex items-center gap-3 text-[12px] text-[#8b95a1] mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#3182f6]" />{job.region}
                </span>
                {job.work_hours && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{job.work_hours}
                  </span>
                )}
              </div>

              {/* 일급 / 시급 표시 */}
              <div className="flex items-center gap-2">
                {job.daily_wage > 0 && (
                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl">
                    <span className="text-[11px] text-[#8b95a1]">일급</span>
                    <span className="text-[15px] font-black text-[#3182f6]">
                      {job.daily_wage.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] text-[#8b95a1]">시급</span>
                  <span className="text-[14px] font-bold text-[#4e5968]">
                    {job.hourly_wage.toLocaleString('ko-KR')}원
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        // 즐겨찾기는 있지만 현재 활성 공고 없음
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 text-center">
          <p className="text-[14px] font-bold text-[#8b95a1]">저장한 회사의 현재 모집 공고가 없어요</p>
          <p className="text-[12px] text-[#c8cdd2] mt-1">새 공고가 올라오면 여기서 확인할 수 있어요</p>
        </div>
      )}
    </div>
  )
}
