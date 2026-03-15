import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Mail,
  ChevronDown,
  Search,
  Sparkles,
  Send,
  ChevronLeft,
  CheckCircle2,
  Lock,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getURL } from '../utils/getUrl'

type View = 'main' | 'login' | 'form' | 'success' | 'history'

interface InquiryRow {
  id: string
  user_id: string
  category: string
  content: string
  status: string
  created_at: string
  answer: string | null
}

interface CustomerServiceProps {
  isOpen: boolean
  onClose: () => void
}

const categories = ['전체', '퇴직금', '서류발급', '실업급여', '이용방법']
const inquiryCategories = ['퇴직금/실업급여', '서류발급', '오류/버그', '기타']

const faqs = [
  { category: '퇴직금', q: '퇴직금은 언제 입금되나요?', a: '법적으로 퇴직일(마지막 근무일)로부터 14일 이내에 지급하는 것이 원칙입니다. 지연될 경우 지연 이자가 발생할 수 있습니다.' },
  { category: '서류발급', q: '일용근로내역서는 어디서 뽑나요?', a: "근로복지공단 '고용·산재보험 토탈서비스'에 접속하신 후, [증명원 신청/발급] 메뉴에서 무료로 PDF 발급이 가능합니다." },
  { category: '실업급여', q: '실업급여와 퇴직금을 동시에 받을 수 있나요?', a: '네, 가능합니다. 두 제도는 목적과 요건이 완전히 별개이므로, 각 제도의 요건만 충족하신다면 정상적으로 수령하실 수 있습니다.' },
  { category: '이용방법', q: 'PDF 분석이 실패했다고 나와요.', a: '비밀번호가 걸려있는 PDF이거나, 근로복지공단 원본 파일이 아닐 경우 분석이 어렵습니다. 원본을 다시 다운로드 받아주세요.' },
]

function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

export default function CustomerService({ isOpen, onClose }: CustomerServiceProps) {
  const [currentView, setCurrentView] = useState<View>('main')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')
  const [isAnimating, setIsAnimating] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquiryCategory, setInquiryCategory] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [inquiryHistory, setInquiryHistory] = useState<InquiryRow[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [openHistoryItem, setOpenHistoryItem] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) setIsAnimating(true)
  }, [isOpen])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      setIsAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !isOpen) return
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session?.user)).catch(() => {})
  }, [isOpen])

  const fetchInquiryHistory = useCallback(async () => {
    if (!supabase) {
      setInquiryHistory([])
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setInquiryHistory([])
      return
    }
    setIsLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setInquiryHistory((data as InquiryRow[]) ?? [])
    } catch {
      setInquiryHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && currentView === 'history') fetchInquiryHistory()
  }, [isLoggedIn, currentView, fetchInquiryHistory])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
      setCurrentView('main')
      setInquiryText('')
      setInquiryCategory('')
      setSearchQuery('')
      setOpenFaq(null)
      setOpenHistoryItem(null)
    }, 350)
  }

  const handleInquiryClick = () => {
    if (!isLoggedIn) setCurrentView('login')
    else setCurrentView('form')
  }

  const handleHistoryClick = () => {
    if (!isLoggedIn) setCurrentView('login')
    else setCurrentView('history')
  }

  const handleOAuthLogin = async (provider: 'kakao' | 'google') => {
    if (!supabase) {
      alert('로그인 설정이 되어 있지 않습니다.')
      setIsAuthLoading(false)
      return
    }
    setIsAuthLoading(true)
    try {
      const redirectTo = `${getURL()}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
      if (error) {
        alert(`로그인 오류: ${error.message}`)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert(`로그인 중 오류: ${message}`)
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleSubmitInquiry = async () => {
    if (!inquiryText.trim() || !inquiryCategory) return
    if (!supabase) {
      setCurrentView('form')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCurrentView('login')
      return
    }
    try {
      const { error } = await supabase.from('inquiries').insert([
        { user_id: user.id, category: inquiryCategory, content: inquiryText.trim(), status: '대기중' },
      ])
      if (error) throw error
      setInquiryText('')
      setInquiryCategory('')
      setCurrentView('success')
    } catch {
      setCurrentView('form')
    }
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchSearch = faq.q.includes(searchQuery) || faq.a.includes(searchQuery)
    const matchCategory = activeCategory === '전체' || faq.category === activeCategory
    return matchSearch && matchCategory
  })

  const headerTitle =
    currentView === 'form'
      ? '1:1 문의 남기기'
      : currentView === 'login'
        ? '로그인 안내'
        : currentView === 'history'
          ? '내 문의 내역'
          : currentView === 'success'
            ? '문의 접수 완료'
            : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center sm:px-4 sm:pb-4 px-0 pb-0 font-sans">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-all duration-[400ms] ease-out ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden
      />
      <div
        className={`relative w-full max-w-md bg-[#F9FAFB] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col h-[85vh] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-50 scale-95'}`}
      >
        <div className="pt-4 pb-3 flex flex-col items-center bg-white/95 backdrop-blur-2xl sticky top-0 z-30 border-b border-gray-100 shrink-0">
          <div className="w-12 h-1.5 bg-gray-200/80 rounded-full mb-4" />
          <div className="w-full px-5 flex justify-between items-center mb-1 h-14">
            {currentView === 'main' ? (
              <div className="flex flex-col ml-1">
                <span className="text-[#3182F6] font-extrabold text-[12px] mb-0.5 flex items-center gap-1.5 tracking-wide">
                  <img src="/catch-logo.png" alt="" className="w-5 h-5 object-contain" />
                  <span>CATCH SUPPORT</span>
                </span>
                <h2 className="text-[24px] font-extrabold tracking-tight text-[#191F28] leading-[1.2]">
                  무엇을 도와드릴까요?
                </h2>
              </div>
            ) : (
              <div className="flex items-center gap-1 -ml-1">
                {currentView !== 'success' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('main')}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6 text-[#191F28]" />
                  </button>
                )}
                <h2 className="text-[20px] font-extrabold tracking-tight text-[#191F28] ml-1">
                  {headerTitle}
                </h2>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2.5 bg-gray-50 hover:bg-gray-200 rounded-full text-gray-500 transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F9FAFB] relative flex flex-col w-full min-h-0">
          {currentView === 'main' && (
            <div className="flex-1 flex flex-col px-5 pb-12 pt-5">
              <div className="mb-6 sticky top-0 z-20 bg-[#F9FAFB] pb-2 -mx-5 px-5">
                <div className="relative mb-4 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400 group-focus-within:text-[#3182F6] transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="궁금한 내용을 검색해보세요"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white text-[#191F28] font-bold text-[15px] tracking-tight rounded-[20px] pl-11 pr-10 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 focus:outline-none focus:border-[#3182F6]/30 focus:shadow-[0_4px_20px_rgba(49,130,246,0.1)] transition-all placeholder:text-gray-400 placeholder:font-medium font-sans"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors">
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-full text-[14px] font-bold tracking-tight transition-all active:scale-95 font-sans ${
                        activeCategory === cat ? 'bg-[#191F28] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <button
                  type="button"
                  onClick={handleInquiryClick}
                  className="bg-white hover:bg-gray-50 transition-colors border border-gray-100 rounded-[20px] p-5 flex flex-col items-start active:scale-[0.97] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  <div className="bg-blue-50 w-10 h-10 rounded-[12px] flex items-center justify-center mb-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-[15px] font-extrabold text-[#191F28] tracking-tight font-sans">1:1 문의 남기기</h4>
                  <p className="text-[12px] text-gray-500 font-medium tracking-tight mt-1 font-sans">궁금한 점 물어보기</p>
                </button>
                <button
                  type="button"
                  onClick={handleHistoryClick}
                  className="bg-white hover:bg-gray-50 transition-colors border border-gray-100 rounded-[20px] p-5 flex flex-col items-start active:scale-[0.97] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  <div className="bg-gray-100 w-10 h-10 rounded-[12px] flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                  </div>
                  <h4 className="text-[15px] font-extrabold text-[#191F28] tracking-tight font-sans">내 문의 내역</h4>
                  <p className="text-[12px] text-gray-500 font-medium tracking-tight mt-1 font-sans">답변 확인하기</p>
                </button>
              </div>

              <div>
                <h3 className="text-[17px] font-extrabold text-[#191F28] tracking-tight mb-4 px-1 font-sans">가장 많이 찾는 질문</h3>
                <div className="space-y-3">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq, index) => {
                      const isOpenFaq = openFaq === index
                      return (
                        <div
                          key={faq.q}
                          className="animate-staggered-fade"
                          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                        >
                          <div className={`rounded-[24px] overflow-hidden transition-all duration-400 ${isOpenFaq ? 'bg-white border-[1.5px] border-[#3182F6] shadow-[0_8px_30px_rgba(49,130,246,0.12)]' : 'bg-white border border-gray-100 hover:border-blue-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]'}`}>
                            <button
                              type="button"
                              onClick={() => setOpenFaq(isOpenFaq ? null : index)}
                              className="w-full flex items-start justify-between p-5 text-left"
                            >
                              <div className="flex flex-col pr-4">
                                <span className="text-[12px] font-extrabold text-[#3182F6] tracking-tight mb-1.5 font-sans">{faq.category}</span>
                                <span className={`font-bold text-[16px] leading-[1.4] tracking-tight transition-colors font-sans ${isOpenFaq ? 'text-[#191F28]' : 'text-[#333D4B]'}`}>{faq.q}</span>
                              </div>
                              <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-400 shrink-0 ${isOpenFaq ? 'bg-[#3182F6] rotate-180 shadow-md shadow-blue-500/30' : 'bg-gray-50'}`}>
                                <ChevronDown className={`w-5 h-5 transition-colors ${isOpenFaq ? 'text-white' : 'text-gray-400'}`} />
                              </div>
                            </button>
                            <div className={`grid transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpenFaq ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className="overflow-hidden">
                                <div className="px-5 pb-6 pt-0">
                                  <div className="w-full h-[1px] bg-gray-100 mb-4" />
                                  <p className="text-[15px] text-[#4E5968] leading-[1.6] font-medium tracking-tight font-sans">{faq.a}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-14 text-center flex flex-col items-center justify-center bg-white rounded-[28px] border border-gray-100 shadow-sm">
                      <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-[16px] font-extrabold text-[#191F28] tracking-tight font-sans">앗, 검색 결과가 없어요</p>
                      <p className="text-[14px] text-gray-500 mt-1.5 font-medium tracking-tight font-sans">다른 단어로 검색하시거나 문의를 남겨주세요.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'login' && (
            <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-0 text-center pb-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[22px] font-extrabold text-[#191F28] tracking-tight mb-2 font-sans">로그인이 필요한 서비스예요</h3>
              <p className="text-[14px] text-gray-500 font-medium leading-relaxed tracking-tight px-4 mb-10 font-sans">
                문의하신 내용에 대해 정확한 안내를 드리기 위해<br />
                로그인 후 이용해 주시길 부탁드립니다.
              </p>
              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('kakao')}
                  disabled={isAuthLoading}
                  className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#191F28] font-bold py-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-sans"
                >
                  {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-[16px] tracking-tight">카카오로 3초만에 시작하기</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isAuthLoading}
                  className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-sans"
                >
                  {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-[16px] tracking-tight">Google로 안전하게 시작하기</span>}
                </button>
              </div>
              <button type="button" onClick={() => setCurrentView('main')} className="mt-8 text-gray-400 font-bold text-[14px] underline underline-offset-4 hover:text-gray-600 transition-colors font-sans">
                다음에 할게요
              </button>
            </div>
          )}

          {currentView === 'history' && (
            <div className="flex-1 flex flex-col px-5 pt-6 pb-8 min-h-0">
              {isLoadingHistory ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-gray-500 font-bold font-sans">내역을 불러오는 중입니다...</p>
                </div>
              ) : inquiryHistory.length > 0 ? (
                <div className="space-y-4">
                  {inquiryHistory.map(item => {
                    const isItemOpen = openHistoryItem === item.id
                    return (
                      <div key={item.id} className={`bg-white rounded-[20px] overflow-hidden transition-all border font-sans ${isItemOpen ? 'border-blue-200 shadow-md' : 'border-gray-100 shadow-sm'}`}>
                        <button
                          type="button"
                          onClick={() => setOpenHistoryItem(isItemOpen ? null : item.id)}
                          className="w-full p-5 text-left flex flex-col"
                        >
                          <div className="flex justify-between items-center w-full mb-2">
                            <span className="text-[12px] font-bold text-gray-500">{formatCreatedAt(item.created_at)}</span>
                            {item.status === '답변완료' ? (
                              <span className="flex items-center gap-1 text-[12px] font-extrabold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                <CheckCircle className="w-3 h-3" />
                                <span>답변완료</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[12px] font-extrabold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3" />
                                <span>답변 대기중</span>
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-start">
                            <p className={`font-bold text-[15px] pr-4 leading-snug tracking-tight ${isItemOpen ? 'text-[#191F28]' : 'text-[#4E5968] line-clamp-1'}`}>
                              <span className="text-blue-500 mr-1.5">[{item.category}]</span>
                              {item.content}
                            </p>
                            <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isItemOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        <div className={`grid transition-all duration-300 ease-in-out ${isItemOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <div className="px-5 pb-5 pt-0">
                              <div className="w-full h-[1px] bg-gray-100 mb-4" />
                              {item.answer ? (
                                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-gray-100">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="font-extrabold text-[13px] text-blue-600">CATCH 팀의 답변</span>
                                  </div>
                                  <p className="text-[14px] text-[#4E5968] leading-relaxed font-medium tracking-tight">{item.answer}</p>
                                </div>
                              ) : (
                                <p className="text-[14px] text-gray-500 text-center py-4">담당자가 내용을 확인하고 있어요.<br />조금만 기다려 주세요!</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center pb-10">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-[18px] font-extrabold text-[#191F28] tracking-tight mb-2 font-sans">아직 남기신 문의가 없어요</h3>
                  <p className="text-[14px] text-gray-500 font-medium tracking-tight mb-8 font-sans">궁금한 점이나 불편한 점이 있으시다면<br />언제든 1:1 문의를 남겨주세요.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentView('form')}
                    className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-full shadow-sm hover:bg-gray-50 transition-colors active:scale-95 font-sans"
                  >
                    1:1 문의 남기러 가기
                  </button>
                </div>
              )}
            </div>
          )}

          {currentView === 'form' && (
            <div className="flex-1 flex flex-col px-5 pt-6 pb-8 min-h-0">
              <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100 mb-6 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-[#191F28] text-[15px] tracking-tight mb-1 font-sans">정확한 답변을 위해 분류를 선택해주세요</h4>
                  <p className="text-[13px] text-gray-600 font-medium leading-relaxed tracking-tight font-sans">문의하신 내용은 [내 문의 내역]에서 확인 가능하며, 답변이 등록되면 알림을 보내드립니다.</p>
                </div>
              </div>
              <div className="mb-6">
                <label className="text-[15px] font-extrabold text-[#191F28] mb-3 px-1 tracking-tight block font-sans">문의 유형 <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2 px-1">
                  {inquiryCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setInquiryCategory(cat)}
                      className={`px-4 py-2.5 rounded-xl text-[14px] font-bold tracking-tight transition-all active:scale-95 font-sans ${
                        inquiryCategory === cat ? 'bg-[#191F28] text-white shadow-md border border-[#191F28]' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-[160px]">
                <label className="text-[15px] font-extrabold text-[#191F28] mb-3 px-1 tracking-tight block font-sans">문의 내용 <span className="text-red-500">*</span></label>
                <textarea
                  value={inquiryText}
                  onChange={e => setInquiryText(e.target.value)}
                  placeholder="불편한 점이나 궁금한 점을 상세히 적어주세요."
                  className="flex-1 min-h-[140px] w-full bg-white border border-gray-200 rounded-[20px] p-5 text-[15px] font-medium text-[#191F28] placeholder:text-gray-400 focus:outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 transition-all resize-none shadow-sm font-sans"
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitInquiry}
                disabled={!inquiryText.trim() || !inquiryCategory}
                className={`mt-6 w-full py-[18px] rounded-[20px] font-bold text-[17px] tracking-tight flex items-center justify-center gap-2 transition-all duration-300 font-sans ${
                  inquiryText.trim() && inquiryCategory
                    ? 'bg-[#3182F6] text-white shadow-[0_8px_20px_rgba(49,130,246,0.25)] hover:bg-[#1b64da] active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <span>문의 접수하기</span>
                <Send className={`w-4 h-4 ${inquiryText.trim() && inquiryCategory ? 'text-white' : 'text-gray-400'}`} />
              </button>
            </div>
          )}

          {currentView === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center px-5 min-h-0 text-center pb-10">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full blur-xl scale-150" aria-hidden />
                <CheckCircle2 className="w-20 h-20 text-green-500 relative z-10" />
              </div>
              <h3 className="text-[24px] font-extrabold text-[#191F28] tracking-tight mb-2 font-sans">접수가 완료되었어요</h3>
              <p className="text-[15px] text-gray-500 font-medium leading-relaxed tracking-tight px-4 font-sans">
                답변이 완료되면 푸시 알림을 보내드릴게요.<br />
                진행 상황은 [내 문의 내역]에서 확인 가능해요.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('history')}
                className="mt-10 w-full py-[18px] bg-gray-100 hover:bg-gray-200 text-[#191F28] rounded-[20px] font-bold text-[17px] tracking-tight transition-all active:scale-[0.98] font-sans"
              >
                내 문의 내역 확인하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
