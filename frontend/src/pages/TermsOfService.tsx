// 서비스 이용약관 페이지 — 정보통신망법 제32조의2 준수
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-[#191F28] mb-2">서비스 이용약관</h1>
          <p className="text-sm text-gray-500">최종 수정일: 2026년 3월 27일</p>
        </div>

        {/* 본문 */}
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 CATCH(이하 "서비스")가 제공하는 퇴직금·실업급여·주휴수당·연차수당 계산 서비스의 이용과 관련하여
              서비스 제공자와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>"서비스"</strong>란 CATCH가 제공하는 퇴직금·실업급여·주휴수당·연차수당 계산 서비스를 의미합니다.</li>
              <li><strong>"이용자"</strong>란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
              <li><strong>"회원"</strong>이란 소셜 로그인(카카오/구글)을 통해 회원가입을 완료한 자를 말합니다.</li>
              <li><strong>"계산 결과"</strong>란 서비스가 제공하는 퇴직금·실업급여·주휴수당·연차수당 예상 금액을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.</li>
              <li>서비스는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경되는 경우 서비스는 변경사항을 최소 7일 전에 공지사항을 통해 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제4조 (서비스의 제공)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">서비스는 다음의 기능을 제공합니다:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>퇴직금 예상 금액 계산 (근로복지공단 PDF 업로드 또는 수동 입력)</li>
              <li>실업급여 적격성 확인 및 예상 금액 계산</li>
              <li>주휴수당 예상 금액 계산</li>
              <li>연차수당 예상 금액 계산</li>
              <li>계산 결과 저장 및 조회 (회원 전용)</li>
              <li>1:1 문의 상담 (회원 전용)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제5조 (서비스의 중단)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              서비스는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>시스템 점검, 보수, 교체 등의 사유로 서비스 제공이 곤란한 경우</li>
              <li>정전, 제반 설비의 장애, 이용량 폭주 등으로 정상적인 서비스 이용에 지장이 있는 경우</li>
              <li>기타 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제6조 (회원가입)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>회원가입은 소셜 로그인(카카오/구글)을 통해 이루어집니다.</li>
              <li>만 18세 이상의 이용자만 회원가입이 가능합니다.</li>
              <li>회원가입 시 실명, 생년월일, 핸드폰번호를 입력해야 합니다.</li>
              <li>타인의 정보를 도용하거나 허위 정보를 입력한 경우 회원 자격이 박탈될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제7조 (회원 탈퇴 및 자격 상실)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>회원은 언제든지 마이페이지를 통해 회원 탈퇴를 요청할 수 있습니다.</li>
              <li>회원 탈퇴 시 모든 개인정보 및 계산 결과가 즉시 삭제되며, 복구할 수 없습니다.</li>
              <li>서비스는 다음 각 호의 경우 회원 자격을 제한 또는 정지시킬 수 있습니다:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>타인의 정보를 도용한 경우</li>
                  <li>서비스 운영을 고의로 방해한 경우</li>
                  <li>허위 정보를 입력한 경우</li>
                  <li>기타 관련 법령 또는 본 약관을 위반한 경우</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제8조 (계산 결과의 정확성 및 면책)</h2>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <p className="font-semibold text-yellow-800 mb-2">⚠️ 중요 안내</p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>본 서비스의 퇴직금·실업급여·주휴수당·연차수당 계산 결과는 <strong>참고용</strong>이며, 실제 지급액과 차이가 있을 수 있습니다.</li>
                <li>계산 결과는 사용자가 입력한 정보 및 업로드한 PDF의 정확성에 따라 달라질 수 있습니다.</li>
                <li>실제 퇴직금·실업급여 등의 수급 여부 및 금액은 근로복지공단, 고용노동부 등 공공기관의 최종 판단에 따릅니다.</li>
                <li>서비스는 계산 결과의 정확성에 대해 법적 책임을 지지 않으며, 계산 결과로 인해 발생한 모든 손해에 대해 책임지지 않습니다.</li>
                <li>법적 분쟁이 발생한 경우 반드시 노무사, 변호사 등 전문가의 상담을 받으시기 바랍니다.</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제9조 (개인정보 보호)</h2>
            <p className="text-gray-700 leading-relaxed">
              서비스는 이용자의 개인정보를 보호하기 위하여 개인정보보호법 및 정보통신망법 등 관련 법령을 준수합니다.
              자세한 내용은 <a href="/terms/privacy" className="text-blue-500 underline">개인정보 처리방침</a>을 참조하시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제10조 (저작권 및 지식재산권)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>서비스가 제공하는 모든 콘텐츠(텍스트, 이미지, 로고 등)의 저작권은 서비스에 귀속됩니다.</li>
              <li>이용자는 서비스가 제공하는 콘텐츠를 서비스 제공자의 사전 동의 없이 복제, 배포, 전송, 판매할 수 없습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#191F28] mb-3">제11조 (분쟁 해결 및 관할 법원)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>서비스 이용과 관련하여 발생한 분쟁에 대해 서비스와 이용자는 성실히 협의하여 해결합니다.</li>
              <li>협의가 이루어지지 않을 경우, 대한민국 법률을 준거법으로 하며, 서울중앙지방법원을 관할 법원으로 합니다.</li>
            </ol>
          </section>

          <section className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              본 약관은 2026년 3월 27일부터 적용됩니다.<br />
              약관 변경 시 공지사항을 통해 안내드립니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
