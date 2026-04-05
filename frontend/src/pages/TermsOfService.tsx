// 서비스 이용약관 페이지 — 정보통신망법 제32조의2, 전자상거래법 준수
// CATCH 앱 특성(무료 계산기, 소셜 로그인, Supabase 저장, 채용정보)을 반영한 한국 IT 표준 약관
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// 약관 조항 타입 — 제목과 내용(ReactNode)으로 구성
interface TermsSection {
  id: string         // 조항 번호 (예: "제1조")
  title: string      // 조항 제목
  content: ReactNode // 조항 내용 (JSX)
}

export default function TermsOfServicePage() {
  const navigate = useNavigate()

  // 약관 조항 데이터 — 한국 IT 서비스 표준 구조 (10개 조항)
  const sections: TermsSection[] = [
    {
      id: '제1조',
      title: '서비스 소개 및 목적',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <p>
            CATCH는 물류·유통 업계 일용직 근로자를 위한 퇴직금·실업급여 계산 및 채용정보 제공 서비스입니다.
          </p>
        </div>
      ),
    },
    {
      id: '제2조',
      title: '이용계약의 체결',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              이용계약은 이용자가 본 약관에 동의하고 서비스 회원가입을 완료한 시점에 성립합니다.
              단, 비회원도 계산기 기능을 제한적으로 이용할 수 있습니다.
            </li>
            <li>
              회원가입은 카카오 또는 구글 소셜 로그인(OAuth 2.0)을 통해서만 이루어집니다.
              별도의 아이디·비밀번호 회원가입은 지원하지 않습니다.
            </li>
            <li>
              이용자는 만 14세 이상이어야 하며, 만 14세 미만 아동은 회원가입이 불가합니다.
              법정대리인의 동의 없이 회원가입한 경우 서비스는 해당 계정을 삭제할 수 있습니다.
            </li>
            <li>
              회원가입 시 소셜 로그인 제공자(카카오/구글)로부터 이메일 주소와 닉네임이 자동으로
              수집됩니다. 이에 동의하지 않을 경우 소셜 로그인 자체를 중단하시기 바랍니다.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: '제3조',
      title: '서비스 이용',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <p>서비스는 다음의 기능을 무료로 제공합니다:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>퇴직금 계산:</strong> 근로복지공단 PDF 업로드를 통한 정밀계산 및 수동 입력을 통한
              간편계산. 28일 역산 블록 알고리즘 기반으로 적격 근무일수를 산출합니다.
            </li>
            <li>
              <strong>실업급여 계산:</strong> 이직 사유·근무 기간·임금 정보를 바탕으로 실업급여
              수급 적격성 및 예상 급여액을 계산합니다.
            </li>
            <li><strong>주휴수당 계산:</strong> 주 소정근로시간을 기반으로 주휴수당 예상액을 계산합니다.</li>
            <li><strong>연차수당 계산:</strong> 근무 기간 및 출근율을 기반으로 연차수당 예상액을 계산합니다.</li>
            <li><strong>채용정보 조회:</strong> 일용직 근로자 대상 단기 알바 채용 공고를 제공합니다.</li>
            <li><strong>계산 이력 저장·조회:</strong> 회원에 한해 계산 결과를 저장하고 언제든지 조회할 수 있습니다.</li>
            <li><strong>1:1 문의:</strong> 회원은 서비스 이용 관련 문의를 제출할 수 있습니다.</li>
          </ul>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            서비스는 사전 통보 없이 기능을 추가하거나 변경할 수 있습니다. 중요 변경사항은 공지사항을 통해 안내합니다.
          </p>
        </div>
      ),
    },
    {
      id: '제4조',
      title: '회원의 의무',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <p>이용자는 다음 각 호의 행위를 해서는 안 됩니다:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>타인의 계정 정보를 도용하거나 타인을 사칭하는 행위</li>
            <li>서비스의 운영을 고의적으로 방해하거나 서버에 과도한 부하를 발생시키는 행위</li>
            <li>서비스를 통해 수집한 채용정보 등을 무단으로 복제·배포하거나 상업적으로 이용하는 행위</li>
            <li>허위 정보를 입력하여 계산 결과를 악용하거나 타인에게 오해를 유발하는 행위</li>
            <li>서비스의 소스코드, 알고리즘, 데이터베이스를 무단으로 크롤링·스크래핑하는 행위</li>
            <li>관련 법령(개인정보보호법, 정보통신망법 등)을 위반하는 행위</li>
            <li>기타 서비스의 정상적인 운영을 저해하는 일체의 행위</li>
          </ol>
          <p>
            위반 시 서비스는 사전 통보 없이 해당 계정을 정지 또는 삭제할 수 있으며,
            관련 법령에 따라 법적 조치를 취할 수 있습니다.
          </p>
        </div>
      ),
    },
    {
      id: '제5조',
      title: '서비스 제공의 중단',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <p>서비스는 다음 각 호의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>시스템 점검, 보수, 교체 등 정기·비정기 유지보수 작업</li>
            <li>정전, 서버 장애, 네트워크 이상, 이용량 폭주 등으로 정상적인 서비스가 곤란한 경우</li>
            <li>
              호스팅 제공업체(Vercel, Render, Supabase)의 장애 또는 정책 변경으로 서비스 유지가
              어려운 경우
            </li>
            <li>천재지변, 전쟁, 테러, 코로나19 등 국가비상사태 등 불가항력적 사유</li>
            <li>관련 법령의 변경으로 서비스 일부 기능의 제공이 불가능해진 경우</li>
          </ol>
          <p>
            서비스 중단이 예정된 경우 사전에 공지사항을 통해 안내합니다. 다만, 불가피한 사유로
            사전 공지가 어려울 수 있으며, 이로 인한 손해에 대해 서비스는 고의·중과실이 없는 한
            책임을 지지 않습니다.
          </p>
        </div>
      ),
    },
    {
      id: '제6조',
      title: '정보의 정확성',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              이용자는 서비스 이용 시 정확한 정보를 입력할 의무가 있습니다. 부정확한 정보 입력으로
              인해 발생한 오계산 결과에 대해 서비스는 책임을 지지 않습니다.
            </li>
            <li>
              근로복지공단 PDF 업로드 기능 이용 시, 이용자가 업로드하는 PDF 파일의 진위 여부 및
              정확성을 서비스가 보장하지 않습니다.
            </li>
            <li>
              채용정보는 제휴 사업체 또는 외부 채용 데이터 제공자로부터 수집되며, 게시된 채용정보의
              정확성(임금, 근무지, 근무 조건 등)은 원래 게시 사업체에 책임이 있습니다.
            </li>
            <li>
              서비스는 노동관계법령의 개정사항을 최신으로 반영하기 위해 노력하나, 법령 개정과 서비스
              업데이트 사이에 시간 차이가 발생할 수 있습니다.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: '제7조',
      title: '책임의 한계',
      content: (
        <div className="space-y-3">
          {/* 핵심 면책 조항 — 시각적으로 강조 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-3 text-base">
              ⚠️ 중요: 계산 결과의 법적 효력에 관한 고지
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-gray-800 leading-relaxed">
              <li>
                <strong>
                  본 서비스의 모든 계산 결과(퇴직금·실업급여·주휴수당·연차수당 예상액)는
                  순수한 참고용 정보이며, 어떠한 법적 효력도 갖지 않습니다.
                </strong>
              </li>
              <li>
                실제 수급 여부 및 지급 금액은 근로복지공단, 고용노동부 등 관할 공공기관의 최종
                심사 및 결정에 따르며, 본 서비스의 계산 결과와 상이할 수 있습니다.
              </li>
              <li>
                계산 결과를 법적 분쟁, 소송, 행정 심판 등의 근거 자료로 사용하는 행위에 대해
                서비스는 어떠한 책임도 지지 않습니다.
              </li>
              <li>
                노동 관련 법적 분쟁이 발생한 경우, 반드시 공인노무사, 변호사 등 전문가의
                상담을 받으시기 바랍니다.
              </li>
            </ol>
          </div>
          <div className="text-gray-800 leading-relaxed space-y-2">
            <p>그 외 다음 각 호의 경우 서비스는 법적 책임을 부담하지 않습니다:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>이용자가 게재한 정보, 자료, 사실 등의 신뢰도·정확성 등으로 인해 발생한 손해</li>
              <li>이용자 상호 간 또는 이용자와 제3자 간의 분쟁으로 인한 손해</li>
              <li>서비스 제공의 중단·장애로 인한 손해 (고의·중과실 없는 경우에 한함)</li>
              <li>무료 서비스 이용으로 인한 기대이익 손실</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: '제8조',
      title: '지식재산권',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              서비스가 제공하는 모든 콘텐츠(텍스트, 이미지, 로고, UI 디자인, 계산 알고리즘 등)의
              저작권 및 지식재산권은 서비스 운영자에게 귀속됩니다.
            </li>
            <li>
              이용자는 서비스 제공자의 사전 서면 동의 없이 서비스 콘텐츠를 복제, 배포, 전송,
              전시, 출판, 판매, 방송하거나 2차적 저작물로 작성할 수 없습니다.
            </li>
            <li>
              다만, 이용자 자신이 서비스를 통해 생성한 계산 결과(PDF 저장본 포함)에 대해서는
              이용자에게 권리가 있습니다.
            </li>
            <li>
              서비스에 게시된 채용정보의 저작권은 해당 정보를 제공한 사업체 또는 채용 플랫폼에
              귀속됩니다.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: '제9조',
      title: '분쟁해결',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              서비스 이용과 관련하여 서비스와 이용자 사이에 분쟁이 발생한 경우, 양측은 원만한
              해결을 위해 성실히 협의합니다. 문의는 서비스 내 1:1 문의를 이용 바랍니다.
            </li>
            <li>
              협의가 이루어지지 않을 경우, 대한민국 법률을 준거법으로 하며, 소송의 관할은
              서울중앙지방법원으로 합니다.
            </li>
            <li>
              개인정보 관련 분쟁은 개인정보 분쟁조정위원회(1833-6972) 또는 개인정보침해신고센터
              (privacy.kisa.or.kr)에 조정을 신청할 수 있습니다.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: '제10조',
      title: '약관의 변경',
      content: (
        <div className="space-y-3 text-gray-800 leading-relaxed">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              서비스는 필요한 경우 관련 법령에 위배되지 않는 범위 내에서 본 약관을 개정할 수 있습니다.
            </li>
            <li>
              약관 개정 시 적용일자 및 개정 사유를 명시하여 현행 약관과 함께 서비스 공지사항에
              최소 7일 전부터 공지합니다. 다만, 이용자에게 불리한 내용의 변경은 30일 전부터 공지합니다.
            </li>
            <li>
              이용자는 약관 변경에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.
              변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하면 약관 변경에 동의한 것으로 간주합니다.
            </li>
            <li>
              변경된 약관은 공지 후 효력 발생일부터 적용되며, 그 이전에 이미 체결된 이용계약에는
              변경 이전 약관이 적용됩니다.
            </li>
          </ol>
        </div>
      ),
    },
  ]

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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">서비스 이용약관</h1>
          {/* 시행일 표시 */}
          <p className="text-sm text-gray-500">시행일: 2026년 4월 5일</p>
        </div>

        {/* 약관 서문 */}
        <p className="text-sm text-gray-600 leading-relaxed mb-8 bg-gray-50 rounded-xl p-4">
          CATCH(이하 "회사")는 일용직 근로자의 퇴직금·실업급여·주휴수당·연차수당 계산 및
          채용정보 제공 서비스를 운영합니다. 본 약관은 회사와 이용자 간의 서비스 이용에 관한
          기본적인 사항을 규정합니다. 서비스 이용 전 반드시 본 약관을 확인하시기 바랍니다.
        </p>

        {/* 약관 조항 목록 — 전체 펼침 (스크롤) */}
        <div className="space-y-0">
          {sections.map((section, index) => (
            <div
              key={section.id}
              // 조항 구분선 — 마지막 항목 제외
              className={`py-6 ${index < sections.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              {/* 조항 제목 */}
              <h2 className="font-semibold text-gray-900 mb-3 text-base">
                {section.id} ({section.title})
              </h2>
              {/* 조항 내용 */}
              <div className="text-sm leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 시행일 안내 */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 leading-relaxed">
            본 약관은 <strong>2026년 4월 5일</strong>부터 시행됩니다.<br />
            이전 버전의 약관은 서비스 내 공지사항에서 확인할 수 있습니다.
          </p>
        </div>

      </div>
    </div>
  )
}
