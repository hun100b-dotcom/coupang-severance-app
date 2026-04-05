// 개인정보 처리방침 페이지 — 개인정보보호법 제30조, 시행령 제31조 준수
// CATCH 앱: 소셜 로그인(카카오/구글), Supabase 데이터 저장, 채용정보 제공
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    // 배경: 흰색 (법적 문서 가독성 최우선)
    <div className="relative z-[1] min-h-screen bg-white px-4 py-8 pb-20">
      <div className="max-w-3xl mx-auto">

        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">뒤로가기</span>
        </button>

        {/* 타이틀 영역 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">개인정보 처리방침</h1>
          {/* 시행일 표시 */}
          <p className="text-sm text-gray-500">시행일: 2025년 1월 1일</p>
        </div>

        {/* 처리방침 서문 */}
        <p className="text-sm text-gray-600 leading-relaxed mb-8 bg-gray-50 rounded-xl p-4">
          CATCH(이하 "회사")는 개인정보보호법 제30조에 따라 정보주체의 개인정보를 보호하고
          이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을
          수립·공개합니다.
        </p>

        {/* 처리방침 조항 목록 — 전체 펼침 (스크롤) */}
        <div className="space-y-0">

          {/* 제1조: 수집하는 개인정보 항목 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제1조 (수집하는 개인정보 항목)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>

              {/* 필수 수집 항목 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">구분</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">항목</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">수집 방법</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">필수</td>
                      <td className="py-2 px-3">이메일 주소, 닉네임, 소셜 로그인 식별자(카카오 ID / 구글 UID)</td>
                      <td className="py-2 px-3">소셜 로그인(OAuth) 자동 수집</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">자동 수집</td>
                      <td className="py-2 px-3">서비스 이용 기록, 접속 로그, IP 주소, 쿠키(OAuth 세션 토큰)</td>
                      <td className="py-2 px-3">서비스 이용 중 자동 생성</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">선택</td>
                      <td className="py-2 px-3">마케팅 수신 동의 여부</td>
                      <td className="py-2 px-3">이용자 직접 입력</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-600 text-xs">
                * 회사는 민감정보(주민등록번호, 건강정보, 신용정보 등)를 수집하지 않습니다.
              </p>
            </div>
          </div>

          {/* 제2조: 개인정보 수집 및 이용 목적 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제2조 (개인정보 수집 및 이용 목적)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>
                회사는 수집한 개인정보를 다음 목적으로만 이용합니다. 목적이 변경될 경우
                개인정보보호법 제18조에 따라 별도 동의를 받습니다.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>회원 식별 및 인증:</strong> 소셜 로그인을 통한 본인 확인 및 서비스 접근 권한 관리</li>
                <li><strong>서비스 제공:</strong> 퇴직금·실업급여·주휴수당·연차수당 계산 결과 저장 및 조회</li>
                <li><strong>고객 지원:</strong> 1:1 문의 처리 및 응대</li>
                <li><strong>서비스 개선:</strong> 이용 통계 분석을 통한 서비스 품질 향상</li>
                <li><strong>공지 및 안내:</strong> 서비스 변경사항, 약관 개정 등 중요 공지 전달</li>
                <li><strong>마케팅 (선택 동의 시):</strong> 신규 기능, 채용정보 등 관련 정보 제공</li>
              </ul>
            </div>
          </div>

          {/* 제3조: 개인정보 보유 및 이용 기간 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제3조 (개인정보 보유 및 이용 기간)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>
                회사는 개인정보 수집 시 동의 받은 보유기간 내에서 처리하며, 해당 기간 경과 후
                지체 없이 파기합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">항목</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">보유 기간</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">회원 정보 (이메일, 닉네임, 소셜 ID)</td>
                      <td className="py-2 px-3">회원 탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">계산 이력 (퇴직금·실업급여 등)</td>
                      <td className="py-2 px-3">회원 탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">1:1 문의 내역</td>
                      <td className="py-2 px-3">회원 탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3">장기 미접속 계정 (3년 이상)</td>
                      <td className="py-2 px-3">최종 로그인 후 3년 경과 시 자동 파기</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">관련 법령상 보존 의무 정보</td>
                      <td className="py-2 px-3">각 법령에서 정한 기간 (예: 전자상거래법 5년)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 제4조: 개인정보 제3자 제공 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제4조 (개인정보 제3자 제공)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              {/* 원칙 강조 박스 */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="font-semibold text-blue-800 mb-1">원칙: 제3자 제공 없음</p>
                <p className="text-gray-700">
                  회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
                </p>
              </div>
              <p>다만, 다음 각 호의 경우에는 예외적으로 제공될 수 있습니다:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>법령에 따른 의무:</strong> 수사기관의 적법한 수사 요청, 법원의 명령 등
                  법령에서 규정된 절차와 방법에 따라 제공이 요구되는 경우
                </li>
                <li>
                  <strong>이용자 동의:</strong> 이용자가 사전에 제3자 제공에 명시적으로 동의한 경우
                </li>
              </ol>
              <p className="text-gray-600 text-xs">
                * 법령에 의한 제공 시 이용자에게 해당 사실을 법적으로 허용된 범위 내에서 통지합니다.
              </p>
            </div>
          </div>

          {/* 제5조: 개인정보 처리 위탁 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제5조 (개인정보 처리 위탁)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>
                회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
                위탁 계약 시 개인정보보호법 제26조에 따른 사항을 계약서에 명시합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">수탁자</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">소재 국가</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">위탁 업무</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 border-b border-gray-200">위탁 기간</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-gray-100">
                      {/* Supabase — 미국 서버 명시 (요구사항) */}
                      <td className="py-2 px-3 font-medium">Supabase Inc.</td>
                      <td className="py-2 px-3">미국 (AWS us-east-1)</td>
                      <td className="py-2 px-3">데이터베이스 호스팅, 인증(Auth) 서비스</td>
                      <td className="py-2 px-3">회원 탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">Vercel Inc.</td>
                      <td className="py-2 px-3">미국</td>
                      <td className="py-2 px-3">프론트엔드 웹 호스팅</td>
                      <td className="py-2 px-3">서비스 제공 기간</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Render Services Inc.</td>
                      <td className="py-2 px-3">미국 (싱가포르 리전)</td>
                      <td className="py-2 px-3">백엔드 API 서버 호스팅</td>
                      <td className="py-2 px-3">서비스 제공 기간</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600">
                * 위 수탁자들은 미국 소재 기업으로, 이용자의 개인정보가 미국 서버에 저장될 수 있습니다.
                개인정보보호법 제28조의8에 따라 국외 이전 사실을 고지합니다.
              </p>
            </div>
          </div>

          {/* 제6조: 이용자의 권리 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제6조 (이용자의 권리)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>
                이용자(정보주체)는 언제든지 다음의 개인정보 보호 관련 권리를 행사할 수 있습니다:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>열람 요구:</strong> 본인의 개인정보 처리 현황 열람 요청
                  (마이페이지 &gt; 계산이력에서 직접 확인 가능)
                </li>
                <li>
                  <strong>정정·삭제 요구:</strong> 부정확한 개인정보 정정 또는 삭제 요청
                  (회원 탈퇴 시 모든 개인정보 즉시 삭제)
                </li>
                <li>
                  <strong>처리 정지 요구:</strong> 특정 개인정보 처리 정지 요청
                </li>
                <li>
                  <strong>동의 철회:</strong> 마케팅 수신 동의 또는 서비스 이용 자체에 대한 동의 철회
                  (마이페이지 &gt; 회원 탈퇴)
                </li>
              </ul>
              <p>
                권리 행사는 서비스 내 마이페이지 또는 아래 개인정보 보호책임자에게 이메일로 요청할 수 있습니다.
                회사는 요청 접수 후 10일 이내에 처리 결과를 회신합니다.
              </p>
              <p className="text-xs text-gray-600">
                * 만 14세 미만 아동의 경우 법정대리인이 권리를 행사할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 제7조: 쿠키 및 자동 수집 정보 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제7조 (쿠키 및 자동 수집 정보)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>쿠키 사용 목적:</strong> 회사는 소셜 로그인(OAuth 2.0) 세션 유지를 위해
                  브라우저 로컬 스토리지에 Supabase 인증 토큰을 저장합니다. 별도의 광고 추적용
                  쿠키는 사용하지 않습니다.
                </li>
                <li>
                  <strong>소셜 로그인 제공자의 쿠키:</strong> 카카오·구글 OAuth 인증 과정에서
                  해당 플랫폼의 쿠키가 이용자의 기기에 저장될 수 있습니다. 이에 대해서는
                  각 플랫폼의 개인정보 처리방침을 확인하시기 바랍니다.
                </li>
                <li>
                  <strong>쿠키 거부 방법:</strong> 브라우저 설정에서 쿠키를 거부하거나 로컬 스토리지를
                  삭제할 수 있습니다. 단, 이 경우 로그인 상태가 유지되지 않아 서비스 일부 기능
                  이용이 제한될 수 있습니다.
                </li>
                <li>
                  <strong>접속 로그:</strong> 서비스 이용 중 IP 주소, 접속 시간, 이용 기록 등이
                  자동으로 기록됩니다. 이는 서비스 보안 및 이상 접속 탐지 목적으로만 활용됩니다.
                </li>
              </ol>
            </div>
          </div>

          {/* 제8조: 개인정보 보호책임자 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제8조 (개인정보 보호책임자)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-3">
              <p>
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 관련 불만 처리 및
                피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
              </p>
              {/* 보호책임자 정보 카드 */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-gray-800 space-y-1">
                  <span className="block"><strong>성명:</strong> 백종훈</span>
                  <span className="block"><strong>직책:</strong> 서비스 운영 책임자</span>
                  <span className="block">
                    <strong>이메일:</strong>{' '}
                    <a href="mailto:catchmasterdmin@gmail.com" className="text-blue-600 underline">
                      catchmasterdmin@gmail.com
                    </a>
                  </span>
                </p>
              </div>
              <p>
                개인정보 보호 관련 불만 또는 피해 구제를 위해 아래 기관에 도움을 요청할 수 있습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>개인정보침해신고센터: privacy.kisa.or.kr / 국번없이 118</li>
                <li>개인정보 분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
                <li>대검찰청 사이버수사과: www.spo.go.kr / 02-3480-3573</li>
                <li>경찰청 사이버안전국: cyberbureau.police.go.kr / 국번없이 182</li>
              </ul>
            </div>
          </div>

          {/* 제9조: 개인정보 안전성 확보 조치 */}
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              제9조 (개인정보 안전성 확보 조치)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>접근 제어:</strong> Supabase Row Level Security(RLS) 정책을 통해
                  이용자 본인의 데이터에만 접근 가능하도록 제한
                </li>
                <li><strong>전송 암호화:</strong> HTTPS(TLS 1.3) 암호화 통신으로 데이터 전송 보호</li>
                <li>
                  <strong>관리자 접근 감사:</strong> 관리자 페이지 접근 시 audit_logs 테이블에
                  접근 이력 자동 기록
                </li>
                <li><strong>최소 수집 원칙:</strong> 서비스 제공에 필요한 최소한의 개인정보만 수집</li>
              </ul>
            </div>
          </div>

          {/* 시행일 및 변경 안내 */}
          <div className="py-6">
            <h2 className="font-semibold text-gray-900 mb-3 text-base">
              부칙 (시행일)
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed space-y-2">
              <p>본 개인정보 처리방침은 <strong>2025년 1월 1일</strong>부터 시행됩니다.</p>
              <p>
                개인정보 처리방침이 변경되는 경우 서비스 공지사항을 통해 최소 7일 전에 안내합니다.
                이용자에게 불리한 변경의 경우 30일 전에 고지합니다.
              </p>
            </div>
          </div>

        </div>

        {/* 하단 문의처 안내 */}
        <div className="mt-4 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 leading-relaxed">
            개인정보 처리방침 관련 문의:{' '}
            <a href="mailto:catchmasterdmin@gmail.com" className="text-blue-600 underline">
              catchmasterdmin@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
