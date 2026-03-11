import { FileText, Monitor, MousePointerClick, Download, CircleAlert, CheckCircle, X, ChevronRight } from 'lucide-react'

export interface PdfGuideProps {
  onClose: () => void
}

export default function PdfGuide({ onClose }: PdfGuideProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      {/* 가이드 모달 컨테이너 */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* 헤더 */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm flex justify-between items-center px-6 py-5 border-b border-gray-50 z-10">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">근로내역서 발급 가이드</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="p-6 space-y-8">
          
          {/* Step 1 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">1. 토탈서비스 접속 및 로그인</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                PC 또는 모바일에서 <span className="font-semibold text-blue-600">근로복지공단 토탈서비스</span>에 접속 후, 카카오/네이버 등 간편인증으로 개인 로그인을 해주세요.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">2. 발급 메뉴 이동</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                상단 메뉴 <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">증명원 신청/발급</span> ➔ 좌측 <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">증명원 신청/발급</span> ➔ 화면에서 <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">고용·산재보험 자격 이력 내역서</span> 를 클릭하세요.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4 relative">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center z-10">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-blue-50/50 p-4 rounded-2xl w-full border border-blue-100">
              <h3 className="text-base font-bold text-blue-900 mb-1 flex items-center">
                3. &apos;고용/일용&apos; 선택 및 기간 설정 <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded-full uppercase tracking-wider">중요</span>
              </h3>
              <p className="text-sm text-blue-800/80 leading-relaxed mb-3">
                보험구분 <span className="font-bold text-blue-600">고용</span>, 조회구분 <span className="font-bold text-blue-600">일용</span>을 선택하고 <strong>[조회]</strong>를 누르세요. 하단의 &apos;출력할 근로년월&apos;을 <span className="font-bold text-blue-600 border-b border-blue-600">최대한 과거부터 현재까지</span> 길게 설정해 주세요.
              </p>
              <div className="flex items-start space-x-1.5 text-xs text-blue-600 bg-white/60 p-2.5 rounded-xl border border-blue-100/50">
                <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="font-medium">과거 내역이 모두 포함되어야 숨은 퇴직금을 1원도 놓치지 않고 100% 찾아낼 수 있습니다!</p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">4. PDF 파일로 저장</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                화면 우측 상단의 [🖨️ 인쇄] 아이콘 또는 하단 버튼을 누른 후, 인쇄 창이 뜨면 대상을 <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">PDF로 저장</span>으로 변경하고 저장해 주세요.
              </p>
            </div>
          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 sticky bottom-0">
          <button 
            type="button"
            onClick={() => window.open('https://total.comwel.or.kr', '_blank')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <span>근로복지공단 바로가기</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
