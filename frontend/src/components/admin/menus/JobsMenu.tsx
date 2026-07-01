// JobsMenu.tsx — Phase E 정리
// 이 파일은 Phase B~D 재구성으로 더 이상 사용되지 않습니다.
// AdminPage에서는 job_postings / applicants / confirmed / recruit_summary 로 분리됨.
// 하위 호환을 위해 파일 자체는 유지하되, 빈 컴포넌트로 대체합니다.

export default function JobsMenu() {
  return (
    <div className="text-a14" style={{ padding: 32, textAlign: 'center', color: '#64748b', }}>
      <div className="text-a30" style={{ marginBottom: 12 }}>💼</div>
      <p>채용공고 메뉴는 사이드바의 <strong style={{ color: '#fff' }}>채용 및 인원 관리</strong> 아코디언으로 이동됐습니다.</p>
      <p className="text-a13" style={{ marginTop: 8 }}>
        💼 채용공고 · 👥 지원자 · ✅ 확정인원 · 📈 Summary
      </p>
    </div>
  )
}
