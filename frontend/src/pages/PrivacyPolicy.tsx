// 개인정보 처리방침 페이지 — 개인정보보호법 제30조 준수
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로 가기</span>
          </button>
          <h1 className="text-3xl font-bold text-[#191F28] mb-2">개인정보 처리방침</h1>
          <p className="text-sm text-gray-500">최종 수정일: 2026년 3월 27일</p>
        </div>

        {/* 본문 */}
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="text-gray-700 leading-relaxed">
              CATCH는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
              <li>퇴직금·실업급여·주휴수당·연차수당 계산 결과 저장</li>
              <li>1:1 문의 상담 제공</li>
              <li>서비스 이용 내역 조회 및 관리</li>
              <li>마케팅 정보 제공 (선택 동의 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">2. 개인정보의 처리 및 보유 기간</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              CATCH는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4">항목</th>
                    <th className="text-left py-2">보유 기간</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">회원 정보 (이메일, 이름, 생년월일, 핸드폰번호)</td>
                    <td className="py-2">회원 탈퇴 시까지</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">계산 결과 (퇴직금, 실업급여 등)</td>
                    <td className="py-2">회원 탈퇴 시까지</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">1:1 문의 내역</td>
                    <td className="py-2">회원 탈퇴 시까지</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">장기 미접속 회원 (3년)</td>
                    <td className="py-2">최종 로그인 후 3년 경과 시 자동 파기</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">3. 수집하는 개인정보의 항목</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>필수 항목:</strong> 이메일 (OAuth 자동 수집), 실명, 생년월일, 핸드폰번호</li>
              <li><strong>선택 항목:</strong> 마케팅 수신 동의 (SMS/이메일)</li>
              <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키 (OAuth 세션 관리용)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              CATCH는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만, 서비스 제공을 위해 다음의 경우 개인정보를 제공하고 있습니다.
            </p>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="font-semibold text-red-700 mb-2">⚠️ 제3자 제공 내역 (국외 이전)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200">
                    <th className="text-left py-2 pr-4">제공받는 자</th>
                    <th className="text-left py-2 pr-4">제공 목적</th>
                    <th className="text-left py-2 pr-4">제공 항목</th>
                    <th className="text-left py-2">보유 기간</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-red-100">
                    <td className="py-2 pr-4">Discord Inc. (미국)</td>
                    <td className="py-2 pr-4">관리자 실시간 알림</td>
                    <td className="py-2 pr-4">문의 ID만 전송 (개인정보 미전송)</td>
                    <td className="py-2">Discord 서버 로그 보관 기간</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-600 mt-2">
                * 2026년 3월 27일 이후: 개인정보보호법 제17조 준수를 위해 Discord로 이메일, 이름, 문의 내용을 전송하지 않고 문의 ID만 전송합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">5. 개인정보 처리의 위탁</h2>
            <div className="bg-gray-50 rounded-xl p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4">수탁자</th>
                    <th className="text-left py-2 pr-4">위탁 업무</th>
                    <th className="text-left py-2">위탁 기간</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">Supabase Inc. (미국)</td>
                    <td className="py-2 pr-4">데이터베이스 호스팅</td>
                    <td className="py-2">회원 탈퇴 시까지</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">Vercel Inc. (미국)</td>
                    <td className="py-2 pr-4">프론트엔드 호스팅</td>
                    <td className="py-2">서비스 제공 기간</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Render Services Inc. (미국)</td>
                    <td className="py-2 pr-4">백엔드 API 호스팅</td>
                    <td className="py-2">서비스 제공 기간</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">6. 정보주체의 권리·의무 및 행사 방법</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              정보주체는 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구 (마이페이지에서 직접 가능)</li>
              <li>개인정보 처리 정지 요구</li>
              <li>개인정보 제공 동의 철회 (회원 탈퇴)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              권리 행사 문의: <a href="mailto:catchmasterdmin@gmail.com" className="text-blue-500 underline">catchmasterdmin@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">7. 개인정보의 파기 절차 및 방법</h2>
            <p className="text-gray-700 leading-relaxed">
              CATCH는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
              <li><strong>파기 절차:</strong> 회원 탈퇴 또는 3년 미접속 시 자동 파기 프로세스 실행</li>
              <li><strong>파기 방법:</strong> DB 레코드 완전 삭제 (복구 불가능)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">8. 개인정보 보호책임자</h2>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-gray-700">
                <strong>담당자:</strong> CATCH 운영팀<br />
                <strong>이메일:</strong> <a href="mailto:catchmasterdmin@gmail.com" className="text-blue-500 underline">catchmasterdmin@gmail.com</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">9. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Supabase Row Level Security (RLS) 정책 적용</li>
              <li>HTTPS 암호화 통신</li>
              <li>관리자 접근 로그 기록 (audit_logs 테이블)</li>
              <li>개인정보 마스킹 처리 (관리자 페이지)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">10. 개인정보 자동 수집 장치의 설치·운영 및 거부</h2>
            <p className="text-gray-700 leading-relaxed">
              CATCH는 로컬 스토리지에 Supabase 인증 토큰만 저장하며, 별도의 쿠키를 사용하지 않습니다.
              OAuth 인증 시 카카오/구글의 세션 쿠키가 사용될 수 있습니다.
            </p>
          </section>

          <section className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              본 개인정보 처리방침은 2026년 3월 27일부터 적용됩니다.<br />
              개인정보 처리방침 변경 시 공지사항을 통해 안내드립니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
