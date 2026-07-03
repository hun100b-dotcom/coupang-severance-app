// 어드민 — 지원자 관리 전용 메뉴 (Phase C)
// 기능: LMS형 필터(사업장/공고/근무일자/업무/사용자ID/사용자명), 상태변경, 대량 처리, CSV 내보내기
//
// 보안 재설계(🔴 지원자 PII):
//   과거에는 supabase.from('job_applications').select('*') + profiles 직접 조회로
//   지원자 인적사항(이름/생년월일/전화) + 회원명/이메일을 평문 통째로 받아와
//   화면에서만 일부(전화)를 가렸다(DevTools/Network 평문 노출 = 가짜 마스킹).
//   이제 ① 백엔드가 "마스킹된 데이터만" 내려보내고(getAdminApplications),
//        ② 평문은 슈퍼관리자가 회원관리와 '동일한 보안키'를 입력해 '해제 모드'에 들어간 뒤
//           각 행의 "보기"를 누를 때만 단건 reveal 엔드포인트로 받아온다(revealApplicant).
//   보안키는 서버에서 해시 비교하고, 누가/언제/어느 지원을 해제했는지 감사로그에 남는다.
//   ※ 상태변경(단건/일괄)·확정/거절 알림도 백엔드 service-role 경로로 통일(2026-07-04).
import { useEffect, useState, useCallback } from 'react'
import { UP, RADIUS, badge, btnSecondary } from '../shared/adminTheme'
import { PageHead } from '../ds/DSKit'
import { supabase } from '../../../lib/supabase'
import {
  getAdminApplications, revealApplicant,
  patchApplicationStatus, bulkApplicationStatus,
  type MaskedApplication, type RevealedApplicant,
} from '../../../lib/api'

// 상태별 한국어 레이블
const STATUS_LABEL: Record<string, string> = {
  applied:   '지원완료',
  reviewing: '검토중',
  confirmed: '출근확정',
  completed: '출근완료',
  cancelled: '취소',
  rejected:  '지원거절',
}

// 상태별 배지 톤 — badge() 헬퍼 tone으로 매핑(라벨/분기 로직은 동일)
//   확정/출근완료→green, 검토중→amber, 취소/종결→neutral, 거절→danger, 지원완료(기본)→brand
const statusTone = (status: string): 'brand' | 'green' | 'neutral' | 'danger' | 'amber' => {
  if (status === 'confirmed') return 'green'
  if (status === 'reviewing') return 'amber'
  if (status === 'completed') return 'neutral'
  if (status === 'cancelled') return 'neutral'
  if (status === 'rejected')  return 'danger'
  return 'brand'  // applied
}

// 공통 셀렉트/인풋 스타일 (라이트 모드)
const filterSelectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: `1px solid ${UP.hair}`,
  background: '#fff', color: UP.navy,
  fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
}
const filterInputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: `1px solid ${UP.hair}`,
  background: '#fff', color: UP.navy,
  fontSize: '0.82rem', outline: 'none',
  minWidth: 110,
}

export default function ApplicantsMenu() {
  // 지원자 목록 상태 (서버에서 마스킹되어 내려온 행)
  const [applicants, setApplicants] = useState<MaskedApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── 필터 상태 (모두 서버측 적용 — 평문 우회 차단) ──
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [jobFilter, setJobFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [shiftFilter, setShiftFilter] = useState('')   // 교대근무 (preferred_shift)
  const [taskFilter,  setTaskFilter]  = useState('')   // 업무 (applied_task)
  const [phoneFilter, setPhoneFilter] = useState('')   // 사용자ID (휴대폰번호) — 원본 컬럼 서버검색
  const [nameFilter,  setNameFilter]  = useState('')   // 사용자명 (성명) — 원본 컬럼 서버검색

  // 대량 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 상태 변경 진행 중 ID
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  // ── 마스킹 해제 상태 (회원관리와 동일 UX) ──
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')          // 감사로그 who
  const [unlockMode, setUnlockMode] = useState(false)
  const [revealKey, setRevealKey] = useState('')            // 메모리에만 보관(저장/표시 안 함)
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [unlockKeyInput, setUnlockKeyInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  // 행별 해제 결과 (application.id → 평문). 목록 갱신/재잠금 시 비운다.
  const [revealed, setRevealed] = useState<Record<string, RevealedApplicant>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)

  // 토스트 알림
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 공고 목록 (필터 드롭다운용 — 비PII)
  const [jobs, setJobs] = useState<{ id: string; company_name: string; center_name: string }[]>([])
  const [companies, setCompanies] = useState<string[]>([])

  // 현재 로그인 관리자 이메일 + 슈퍼관리자 여부 판정 (AdminPage 와 동일 규칙: DB 전용)
  //   ⚠️ 보안(2026-07-01): 하드코딩 이메일/VITE_ADMIN_EMAIL 단독 통과 제거.
  //     서버 판정(is_super_admin) 과 정합되도록 admin_accounts.role === 'super_admin'
  //     AND is_active=true 인 경우에만 슈퍼관리자로 인정합니다.
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase!.auth.getUser()
      const email = data.user?.email ?? ''
      setAdminEmail(email)
      if (!email) return
      // admin_accounts.role === 'super_admin' (활성) 만 슈퍼관리자 — DB 가 유일한 근거
      try {
        const { data: row } = await supabase!
          .from('admin_accounts')
          .select('role, is_active')
          .eq('email', email)
          .maybeSingle()  // 행 없을 때 406(PGRST116) 콘솔오염 방지
        if (row?.is_active && row.role === 'super_admin') setIsSuperAdmin(true)
      } catch { /* 슈퍼관리자 아님 */ }
    })()
  }, [])

  // 공고 목록 로드 (비PII — 필터 드롭다운용)
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase!
        .from('job_postings')
        .select('id, company_name, center_name')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
      const list = (data ?? []) as { id: string; company_name: string; center_name: string }[]
      setJobs(list)
      const uniqueCompanies = [...new Set(list.map(j => j.company_name).filter(Boolean))]
      setCompanies(uniqueCompanies)
    })()
  }, [])

  // 지원자 목록 로드 — 모든 필터를 백엔드(마스킹 경로)로 전달
  const fetchApplicants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminApplications({
        status: statusFilter,
        company: companyFilter,
        job_posting_id: jobFilter,
        shift: shiftFilter,
        task: taskFilter,
        name: nameFilter,
        phone: phoneFilter,
      })
      setApplicants(res.applications ?? [])
      setSelectedIds(new Set())
      // 새 목록을 받으면 이전 해제 결과는 무효화(다른 행/페이지로 새지 않게)
      setRevealed({})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '지원자 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [companyFilter, jobFilter, statusFilter, shiftFilter, taskFilter, phoneFilter, nameFilter])

  // 필터 변경 시 디바운스 후 조회(텍스트 입력 타이핑마다 호출 방지)
  useEffect(() => {
    const t = setTimeout(fetchApplicants, 300)
    return () => clearTimeout(t)
  }, [fetchApplicants])

  // 서버에서 이미 필터링된 목록 — 별칭만 유지(JSX 최소 변경)
  const displayApplicants = applicants

  // ── 마스킹 해제: 모드 진입 / 재잠금 / 단건 보기 ──
  function enterUnlockMode() {
    if (!unlockKeyInput.trim()) { setUnlockError('보안키를 입력하세요.'); return }
    setRevealKey(unlockKeyInput.trim())
    setUnlockMode(true)
    setShowUnlockDialog(false)
    setUnlockKeyInput('')
    setUnlockError('')
  }
  function lockAgain() {
    setUnlockMode(false)
    setRevealKey('')
    setRevealed({})
  }
  async function handleReveal(applicationId: string) {
    if (!revealKey) { setShowUnlockDialog(true); return }
    setRevealingId(applicationId)
    try {
      const data = await revealApplicant(applicationId, revealKey, adminEmail)
      setRevealed(prev => ({ ...prev, [applicationId]: data }))
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        setUnlockMode(false); setRevealKey('')
        setUnlockError('보안키가 일치하지 않습니다. 다시 입력하세요.')
        setShowUnlockDialog(true)
      } else if (status === 400) {
        setUnlockMode(false); setRevealKey('')
        alert('보안키가 설정되지 않았습니다. Settings → 개인정보 보안키에서 먼저 설정하세요.')
      } else {
        alert('해제 중 오류가 발생했습니다.')
      }
    } finally {
      setRevealingId(null)
    }
  }

  // 단건 상태 변경 — 백엔드 service-role 경로(RLS 무관 반영 + 알림 서버 발송)
  const handleUpdateStatus = async (
    appId: string,
    newStatus: 'reviewing' | 'confirmed' | 'completed' | 'cancelled' | 'rejected',
    workDate?: string
  ) => {
    if (updatingId) return
    setUpdatingId(appId)
    try {
      // 백엔드(service-role) 경로 — 과거 supabase 직접 update 는 관리자 UPDATE RLS 가
      // 깨져 있으면 0행 변경으로 기능 자체가 불능이었다. 백엔드는 RLS 무관하게 항상
      // 반영되고, 확정/거절 알림(notifications)도 서버에서 함께 발송한다.
      // 0행이면 서버가 404 를 던져 catch 로 떨어진다(거짓 성공 차단 유지).
      await patchApplicationStatus(appId, newStatus, workDate, adminEmail)

      await fetchApplicants()
      const msgs: Record<string, string> = {
        reviewing: '🔍 검토중으로 변경됐습니다.',
        confirmed: '✅ 출근 확정 처리됐습니다.',
        completed: '✅ 출근 완료로 변경됐습니다.',
        cancelled: '✅ 취소 처리됐습니다.',
        rejected:  '❌ 지원 거절 처리됐습니다.',
      }
      setToast({ msg: msgs[newStatus] ?? '✅ 상태 변경됐습니다.', type: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '상태 변경에 실패했습니다.'
      setToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  // 대량 상태 변경 (체크박스 선택 기반 — 기능 로직 불변)
  const handleBulkUpdate = async (newStatus: 'reviewing' | 'confirmed' | 'rejected') => {
    if (selectedIds.size === 0 || bulkUpdating) return
    if (!window.confirm(`선택된 ${selectedIds.size}명을 "${STATUS_LABEL[newStatus]}"로 변경할까요?`)) return

    setBulkUpdating(true)
    try {
      const ids = [...selectedIds]
      // 백엔드(service-role) 일괄 경로 — RLS 무관 반영 + 확정/거절 알림 서버 발송.
      // 0건 변경이면 서버 응답의 failed_ids 로 부분 실패를 그대로 표시한다.
      const res = await bulkApplicationStatus(ids, newStatus, adminEmail)
      const changed = res.updated
      if (changed === 0) {
        throw new Error('변경된 행이 없습니다 — 지원 내역을 확인하세요.')
      }
      const failedIds = res.failed_ids ?? []

      await fetchApplicants()  // 내부에서 selectedIds 를 비운다
      if (failedIds.length > 0) {
        setSelectedIds(new Set(failedIds))
        setToast({ msg: `⚠️ ${changed}/${ids.length}명만 변경됨 — 실패 ${failedIds.length}건을 다시 선택했습니다.`, type: 'error' })
      } else {
        setToast({ msg: `✅ ${changed}명 ${STATUS_LABEL[newStatus]} 처리됐습니다.`, type: 'success' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '대량 처리에 실패했습니다.'
      setToast({ msg: '❌ ' + msg, type: 'error' })
    } finally {
      setBulkUpdating(false)
    }
  }

  // 체크박스 전체 선택/해제 (현재 표시된 행 기준)
  const toggleSelectAll = () => {
    if (selectedIds.size === displayApplicants.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayApplicants.map(a => a.id)))
    }
  }

  // CSV 내보내기 — 보안상 '마스킹된' 인적사항만 내보낸다(평문 일괄 추출 금지).
  // 평문이 필요하면 해당 행의 "보기"(단건 reveal·감사기록)로 확인한다.
  // 대상: 제3자 제공 동의 + 인적사항 입력 건.
  const handleExportCsv = () => {
    const filtered = displayApplicants.filter(a => a.consent_third_party === true && a.has_applicant_info)
    if (filtered.length === 0) {
      alert('다운로드 가능한 지원자가 없습니다.\n(제3자 제공 동의 + 인적사항 입력 건만 포함됩니다)')
      return
    }
    const BOM = '﻿'
    const header = ['이름(마스킹)', '생년월일(마스킹)', '성별', '휴대폰(마스킹)', '공고', '센터', '지원일시', '상태']
    const rows = filtered.map(a => [
      a.applicant_name ?? '',     // 서버 마스킹: 김**
      a.applicant_birth ?? '',    // 서버 마스킹: 1990-**-**
      a.applicant_gender === 'male' ? '남' : a.applicant_gender === 'female' ? '여' : '',
      a.applicant_phone ?? '',    // 서버 마스킹: 010-****-5678
      a.job_postings?.company_name ?? '',
      a.job_postings?.center_name ?? '',
      a.applied_at ? new Date(a.applied_at).toLocaleString('ko-KR') : '',
      STATUS_LABEL[a.status] ?? a.status,
    ])
    const csv = BOM + [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `지원자_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 테이블 스타일 상수 (라이트 모드)
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: `1px solid ${UP.hairSoft}`,
    fontSize: '0.83rem', color: UP.body, verticalAlign: 'middle',
  }
  const thStyle: React.CSSProperties = {
    ...cellStyle, color: UP.sub, fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }
  const revealBtn: React.CSSProperties = {
    padding: '3px 8px', borderRadius: 7,
    border: '1px solid rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.08)', color: UP.green,
    fontSize: '0.66rem', cursor: 'pointer', fontWeight: 700, marginTop: 4,
  }

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1440, margin: '0 auto', position: 'relative' }}>
      {toast && (
        <div className="text-a14" style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, minWidth: 280, maxWidth: 420, padding: '12px 20px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(49,200,100,0.95)' : 'rgba(240,68,82,0.95)',
          color: '#fff', fontWeight: 700,
          boxShadow: '0 8px 32px rgba(16,24,40,0.18)', backdropFilter: 'blur(8px)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* 딥네이비 히어로 헤더 */}
      <PageHead
        icon="👥"
        title="지원자 관리"
        subtitle={`검토중 → 출근확정 순으로 처리하세요 · 총 ${displayApplicants.length}명`}
        actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* 마스킹 해제 토글 — 슈퍼관리자만 노출 */}
          {isSuperAdmin && (
            !unlockMode ? (
              <button
                onClick={() => { setUnlockError(''); setShowUnlockDialog(true) }}
                className="text-a13" style={{
                  padding: '7px 14px', borderRadius: 10,
                  border: '1px solid rgba(240,200,0,0.35)',
                  background: 'rgba(240,200,0,0.10)', color: UP.amber, cursor: 'pointer', fontWeight: 700,
                }}
              >
                🔒 마스킹 해제
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="text-a12" style={{
                  padding: '5px 12px', borderRadius: 10,
                  background: 'rgba(49,200,100,0.12)', border: '1px solid rgba(49,200,100,0.25)',
                  color: UP.green, fontWeight: 700,
                }}>
                  🔓 해제 모드 · 행별 보기 가능
                </span>
                <button onClick={lockAgain}
                  className="text-a12" style={{
                    padding: '5px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`,
                    background: UP.sunken, color: UP.sub, cursor: 'pointer', fontWeight: 600,
                  }}>
                  재잠금
                </button>
              </div>
            )
          )}
          <button onClick={handleExportCsv} style={{ ...btnSecondary }}>
            📥 CSV 다운로드
          </button>
        </div>
        }
      />

      {/* 마스킹 안내 */}
      {!unlockMode && (
        <div className="text-a12" style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(240,200,0,0.06)', border: '1px solid rgba(240,200,0,0.18)', color: UP.amber, lineHeight: 1.5,
        }}>
          🔒 개인정보(이름·생년월일·전화·회원명·이메일)는 서버에서 마스킹되어 전달됩니다(평문은 브라우저로 내려오지 않음).
          {isSuperAdmin
            ? <span style={{ color: UP.sub, marginLeft: 6 }}>· 보안키 입력 후 각 행의 "보기"로 단건 확인할 수 있습니다.</span>
            : <span style={{ color: UP.sub, marginLeft: 6 }}>· 평문 확인은 최고관리자 권한이 필요합니다.</span>}
        </div>
      )}

      {/* ── LMS형 필터 2행×3열 그리드 ── */}
      {/* 1행: [사업장][공고][교대] / 2행: [업무][사용자ID][사용자명] */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: 8,
      }}>

        {/* 1행 1열: 사업장 선택 */}
        <select
          value={companyFilter}
          onChange={e => { setCompanyFilter(e.target.value); setJobFilter('') }}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="all" style={{ background: '#fff' }}>사업장 전체</option>
          {companies.map(c => (
            <option key={c} value={c} style={{ background: '#fff' }}>{c}</option>
          ))}
        </select>

        {/* 1행 2열: 공고 선택 */}
        <select
          value={jobFilter}
          onChange={e => setJobFilter(e.target.value)}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="" style={{ background: '#fff' }}>공고 전체</option>
          {(companyFilter === 'all'
            ? jobs
            : jobs.filter(j => j.company_name === companyFilter)
          ).map(job => (
            <option key={job.id} value={job.id} style={{ background: '#fff' }}>
              {job.company_name} {job.center_name}
            </option>
          ))}
        </select>

        {/* 1행 3열: 교대근무 — preferred_shift select */}
        <select
          value={shiftFilter}
          onChange={e => setShiftFilter(e.target.value)}
          style={{ ...filterSelectStyle, width: '100%' }}
        >
          <option value="" style={{ background: '#fff' }}>교대 전체</option>
          <option value="morning"   style={{ background: '#fff' }}>오전(morning)</option>
          <option value="afternoon" style={{ background: '#fff' }}>오후(afternoon)</option>
          <option value="night"     style={{ background: '#fff' }}>야간(night)</option>
          <option value="any"       style={{ background: '#fff' }}>무관(any)</option>
        </select>

        {/* 2행 1열: 업무 — applied_task 검색 */}
        <input
          type="text"
          value={taskFilter}
          onChange={e => setTaskFilter(e.target.value)}
          placeholder="업무"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />

        {/* 2행 2열: 사용자ID — 휴대폰번호 검색 (서버측 원본 컬럼 검색) */}
        <input
          type="text"
          value={phoneFilter}
          onChange={e => setPhoneFilter(e.target.value)}
          placeholder="사용자ID(휴대폰)"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />

        {/* 2행 3열: 사용자명 — 성명 검색 (서버측 원본 컬럼 검색) */}
        <input
          type="text"
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          placeholder="사용자명"
          style={{ ...filterInputStyle, width: '100%', minWidth: 'unset' }}
        />
      </div>

      {/* 클라이언트 필터 초기화 버튼 (하단 배치) */}
      {(shiftFilter || taskFilter || phoneFilter || nameFilter) && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => { setShiftFilter(''); setTaskFilter(''); setPhoneFilter(''); setNameFilter('') }}
            className="text-a12" style={{
              padding: '5px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`,
              background: UP.sunken, color: UP.sub, cursor: 'pointer',
            }}
          >
            ✕ 초기화
          </button>
        </div>
      )}

      {/* 상태 필터 (pill 버튼) */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'applied', 'reviewing', 'confirmed', 'completed', 'cancelled', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="text-a12" style={{
              padding: '4px 12px', borderRadius: 999, border: 'none',
              background: statusFilter === s ? UP.brand : UP.hairSoft,
              color: statusFilter === s ? '#fff' : UP.sub, fontWeight: 600, cursor: 'pointer',
            }}>
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* 대량 처리 바 (1명 이상 선택 시 표시) */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(49,130,246,0.12)', border: '1px solid rgba(49,130,246,0.25)',
          flexWrap: 'wrap',
        }}>
          <span className="text-a13" style={{ fontWeight: 700, color: UP.brand }}>
            {selectedIds.size}명 선택됨
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleBulkUpdate('reviewing')} disabled={bulkUpdating}
              className="text-a13" style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(255,180,0,0.15)', color: UP.amber, fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              🔍 일괄 검토중
            </button>
            <button onClick={() => handleBulkUpdate('confirmed')} disabled={bulkUpdating}
              className="text-a13" style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(49,200,100,0.15)', color: UP.green, fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              ✅ 일괄 확정
            </button>
            <button onClick={() => handleBulkUpdate('rejected')} disabled={bulkUpdating}
              className="text-a13" style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(240,68,82,0.15)', color: UP.danger, fontWeight: 700, cursor: 'pointer',
                opacity: bulkUpdating ? 0.5 : 1,
              }}>
              ✕ 일괄 거절
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-a12" style={{
              marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: `1px solid ${UP.hair}`,
              background: UP.sunken, color: UP.sub, cursor: 'pointer',
            }}>
            선택 해제
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="text-a13" style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 12,
          color: UP.danger,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(null); fetchApplicants() }}
            className="text-a13" style={{ background: 'none', border: 'none', color: UP.danger, cursor: 'pointer', fontWeight: 700 }}>
            다시 시도 ↻
          </button>
        </div>
      )}

      {/* 지원자 테이블 */}
      {loading ? (
        <p className="text-a13" style={{ color: UP.caption, }}>불러오는 중...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: RADIUS.card, overflow: 'hidden', border: `1px solid ${UP.hair}` }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr style={{ background: UP.sunken, borderBottom: `1px solid ${UP.hair}` }}>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={displayApplicants.length > 0 && selectedIds.size === displayApplicants.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th style={thStyle}>지원자 정보</th>
                  <th style={thStyle}>인적사항</th>
                  <th style={thStyle}>공고</th>
                  <th style={{ ...thStyle, width: 80 }}>지원일</th>
                  <th style={{ ...thStyle, width: 90 }}>상태</th>
                  <th style={{ ...thStyle, width: 240 }}>상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {displayApplicants.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: UP.caption }}>
                      지원자가 없습니다.
                    </td>
                  </tr>
                )}
                {displayApplicants.map(app => {
                  const sTone = statusTone(app.status)
                  const isUpdating = updatingId === app.id
                  const isSelected = selectedIds.has(app.id)
                  const rev = revealed[app.id]
                  const canReveal = isSuperAdmin && unlockMode && !rev
                  const isRevealing = revealingId === app.id
                  // 표시값 — 해제된 행이면 평문, 아니면 서버 마스킹 값
                  const profileName = rev ? (rev.profile_name ?? '이름 없음') : (app.profiles?.full_name ?? '이름 없음')
                  const profileEmail = rev ? (rev.profile_email ?? '-') : (app.profiles?.email ?? '-')
                  const aName  = rev ? (rev.applicant_name ?? '') : (app.applicant_name ?? '')
                  const aBirth = rev ? (rev.applicant_birth ?? '') : (app.applicant_birth ?? '')
                  const aPhone = rev ? (rev.applicant_phone ?? '') : (app.applicant_phone ?? '')
                  const aGender = rev ? rev.applicant_gender : app.applicant_gender
                  return (
                    <tr key={app.id} style={{ background: isSelected ? 'rgba(49,130,246,0.06)' : undefined }}>
                      {/* 체크박스 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (next.has(app.id)) next.delete(app.id)
                              else next.add(app.id)
                              return next
                            })
                          }}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>

                      {/* 지원자 계정 정보 (회원명/이메일 — 마스킹) */}
                      <td style={cellStyle}>
                        <div className="text-a13" style={{ fontWeight: 600, }}>
                          {profileName}
                        </div>
                        <div className="text-a11" style={{ color: UP.sub, marginTop: 1 }}>
                          {profileEmail}
                        </div>
                        {/* 평문 보기 (해제 모드 + 슈퍼관리자) */}
                        {canReveal ? (
                          <button onClick={() => handleReveal(app.id)} disabled={isRevealing}
                            style={{ ...revealBtn, opacity: isRevealing ? 0.5 : 1 }}>
                            {isRevealing ? '확인 중…' : '👁 보기'}
                          </button>
                        ) : rev ? (
                          <div className="text-a10" style={{ color: UP.green, fontWeight: 700, marginTop: 4 }}>🔓 해제됨</div>
                        ) : null}
                      </td>

                      {/* 인적사항 (지원 폼에서 입력한 실제 정보 — 마스킹) */}
                      <td style={cellStyle}>
                        {app.has_applicant_info ? (
                          <>
                            <div className="text-a13" style={{ fontWeight: 700, color: UP.navy }}>
                              {aName}
                              <span className="text-a11" style={{ color: UP.sub, marginLeft: 4 }}>
                                {aGender === 'male' ? '남' : aGender === 'female' ? '여' : ''}
                              </span>
                            </div>
                            <div className="text-a11" style={{ color: UP.sub, marginTop: 1 }}>
                              {aBirth ? aBirth.slice(0, 10) : '-'}
                              {' · '}
                              {aPhone || '-'}
                            </div>
                          </>
                        ) : (
                          <span className="text-a12" style={{ color: UP.caption }}>미입력</span>
                        )}
                      </td>

                      {/* 공고 정보 */}
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{app.job_postings?.company_name ?? '-'}</div>
                        <div className="text-a11" style={{ color: UP.sub }}>
                          {app.job_postings?.center_name ?? ''}
                        </div>
                      </td>

                      {/* 지원일 */}
                      <td style={cellStyle}>
                        {new Date(app.applied_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </td>

                      {/* 현재 상태 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <span style={{ ...badge(sTone) }}>
                          {STATUS_LABEL[app.status] ?? app.status}
                        </span>
                        {/* 출근 예정일 표시 (확정 이후) */}
                        {app.work_date && (app.status === 'confirmed' || app.status === 'completed') && (
                          <div className="text-a10" style={{ color: UP.sub, marginTop: 2 }}>
                            {app.work_date}
                          </div>
                        )}
                      </td>

                      {/* 상태 변경 버튼 */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>

                          {/* applied → reviewing 또는 confirmed/rejected */}
                          {app.status === 'applied' && (
                            <>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'reviewing')}
                                className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(255,180,0,0.15)', color: UP.amber, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                🔍 검토
                              </button>
                              <button disabled={isUpdating}
                                onClick={() => {
                                  const today = new Date().toISOString().slice(0, 10)
                                  const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                  if (workDate !== null) handleUpdateStatus(app.id, 'confirmed', workDate)
                                }}
                                className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(49,200,100,0.15)', color: UP.green, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✓ 확정
                              </button>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(240,68,82,0.15)', color: UP.danger, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✕ 거절
                              </button>
                            </>
                          )}

                          {/* reviewing → confirmed/rejected */}
                          {app.status === 'reviewing' && (
                            <>
                              <button disabled={isUpdating}
                                onClick={() => {
                                  const today = new Date().toISOString().slice(0, 10)
                                  const workDate = window.prompt('출근 예정일 (YYYY-MM-DD)', today)
                                  if (workDate !== null) handleUpdateStatus(app.id, 'confirmed', workDate)
                                }}
                                className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(49,200,100,0.15)', color: UP.green, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✓ 확정
                              </button>
                              <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: 'rgba(240,68,82,0.15)', color: UP.danger, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                                ✕ 거절
                              </button>
                            </>
                          )}

                          {/* confirmed → completed */}
                          {app.status === 'confirmed' && (
                            <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'completed')}
                              className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: UP.hairSoft, color: UP.body, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                              출근완료
                            </button>
                          )}

                          {/* confirmed/reviewing → cancelled */}
                          {(app.status === 'confirmed' || app.status === 'reviewing') && (
                            <button disabled={isUpdating} onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                              className="text-a11" style={{ padding: '3px 9px', borderRadius: 7, border: 'none', background: UP.hairSoft, color: UP.sub, fontWeight: 600, cursor: 'pointer', opacity: isUpdating ? 0.5 : 1 }}>
                              취소
                            </button>
                          )}

                          {/* 최종 처리된 상태 표시 */}
                          {(app.status === 'completed' || app.status === 'cancelled' || app.status === 'rejected') && (
                            <span className="text-a11" style={{ color: UP.caption }}>처리완료</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 해제 모드 진입 다이얼로그 (회원관리와 동일 UX) */}
      {showUnlockDialog && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: 16,
          }}
          onClick={() => setShowUnlockDialog(false)}
        >
          <div
            style={{
              background: '#fff', border: `1px solid ${UP.hair}`,
              borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 400,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-a16" style={{ fontWeight: 800, color: UP.navy, marginBottom: 6 }}>🔐 개인정보 마스킹 해제</div>
            <p className="text-a13" style={{ color: UP.sub, marginBottom: 16, lineHeight: 1.5 }}>
              보안키를 입력하면 해제 모드로 전환됩니다. 이후 각 지원자 행의 "보기"를 누를 때마다
              해당 1건의 평문 정보가 서버에서 전송되며, 해제 기록은 감사로그에 남습니다.
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
              <button onClick={() => setShowUnlockDialog(false)}
                className="text-a13" style={{
                  flex: 1, padding: '9px 16px', borderRadius: 10, border: `1px solid ${UP.hair}`,
                  background: UP.sunken, color: UP.body, cursor: 'pointer', fontWeight: 600,
                }}>
                취소
              </button>
              <button onClick={enterUnlockMode}
                className="text-a13" style={{
                  flex: 1, padding: '9px 16px', borderRadius: 10, border: 'none',
                  background: UP.brand, color: '#fff', cursor: 'pointer', fontWeight: 700,
                }}>
                해제 모드 진입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
