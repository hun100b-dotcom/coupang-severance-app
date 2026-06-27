// PDF 소스 선택기 — "저장된 PDF에서 선택" / "새로 업로드" + 저장 팝업
// 기존 onPdfSelect(file: File) 인터페이스 그대로 유지
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Upload, Loader2, X, Check, FolderOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { CalcInputCard, type AccentColor } from './CalcLayout'
import {
  listSavedPdfs, uploadPdf, downloadPdf, formatFileSize, MAX_PDFS,
} from '../../lib/pdfStorage'
import type { SavedPdf } from '../../types/supabase'

// ── accent 색상 맵 — 계산기 허브 그룹과 일치(blue&sky→브랜드 블루 / amber&emerald→그린) ──
const ACCENT_CLASSES = {
  blue:    { bg: 'bg-brand', text: 'text-brand', light: 'bg-brand-bg', border: 'border-brand-200' },
  sky:     { bg: 'bg-brand', text: 'text-brand', light: 'bg-brand-bg', border: 'border-brand-200' },
  amber:   { bg: 'bg-accent', text: 'text-[#047857]', light: 'bg-accent-bg', border: 'border-accent/30' },
  emerald: { bg: 'bg-accent', text: 'text-[#047857]', light: 'bg-accent-bg', border: 'border-accent/30' },
} as const

interface PdfSourceSelectorProps {
  /** 파일 선택 완료 시 호출 — 기존 onPdfSelect와 동일한 인터페이스 */
  onFileSelect: (file: File) => void
  accentColor: AccentColor
  /** 현재 선택된 파일 (외부 상태) */
  currentFile?: File | null
}

export default function PdfSourceSelector({
  onFileSelect, accentColor, currentFile,
}: PdfSourceSelectorProps) {
  const { user, isLoggedIn } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const a = ACCENT_CLASSES[accentColor]

  // 저장된 PDF 목록
  const [savedPdfs, setSavedPdfs] = useState<SavedPdf[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState<string | null>(null)
  // 다운로드 실패 에러 메시지
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // 탭: 'saved' | 'upload'
  const [tab, setTab] = useState<'saved' | 'upload'>('upload')

  // 저장 팝업
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // 로그인 + 마운트 시 저장 목록 로드
  useEffect(() => {
    if (!isLoggedIn || !user) return
    setLoadingList(true)
    listSavedPdfs(user.id).then(list => {
      setSavedPdfs(list)
      // 저장된 PDF가 있으면 saved 탭을 기본으로
      if (list.length > 0) setTab('saved')
      setLoadingList(false)
    })
  }, [isLoggedIn, user])

  // ── 새 파일 업로드 핸들러 ──
  const handleNewFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    // 파일을 즉시 전달 (기존 로직 불변)
    onFileSelect(f)
    // 로그인 사용자에게 저장 팝업 표시
    if (isLoggedIn && user) {
      setPendingFile(f)
      setSaveResult(null)
      setShowSavePopup(true)
    }
  }

  // ── 저장된 PDF 선택 → 다운로드 → File 전달 ──
  const handleSelectSaved = async (pdf: SavedPdf) => {
    setDownloadError(null) // 이전 에러 초기화
    setLoadingDownload(pdf.id)
    const file = await downloadPdf(pdf)
    setLoadingDownload(null)
    if (file) {
      onFileSelect(file)
    } else {
      // 다운로드 실패 시 사용자에게 명확한 에러 표시
      // (Storage 파일 손상, 인증 만료, 네트워크 오류 등)
      setDownloadError(
        `'${pdf.file_name}' 파일을 불러오지 못했어요.\n저장 목록에서 삭제 후 다시 업로드해 주세요.`
      )
    }
  }

  // ── PDF 저장 실행 ──
  const handleSave = async () => {
    if (!pendingFile || !user) return
    setSavingPdf(true)
    const result = await uploadPdf(pendingFile, user.id)
    setSavingPdf(false)
    if (result.success) {
      setSaveResult({ ok: true, msg: '저장했어요!' })
      // 목록 갱신
      const updated = await listSavedPdfs(user.id)
      setSavedPdfs(updated)
      setTimeout(() => setShowSavePopup(false), 1200)
    } else {
      setSaveResult({ ok: false, msg: result.error ?? '저장에 실패했어요' })
    }
  }

  // ── 비로그인: 기존 드롭존만 ──
  if (!isLoggedIn) {
    return (
      <div>
        <div
          className={`dropzone ${currentFile ? 'active' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          {currentFile ? (
            <>
              <div className="text-3xl mb-2">✅</div>
              <p className={`font-bold ${a.text}`}>{currentFile.name}</p>
              <p className="text-[12px] text-[#8b95a1] mt-1">다른 파일로 교체하려면 클릭하세요</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">📤</div>
              <p className="font-bold text-[#191f28]">여기를 클릭해서 PDF 업로드</p>
              <p className="text-[12px] text-[#8b95a1] mt-1">PDF 파일만 가능해요</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleNewFile}
          />
        </div>
      </div>
    )
  }

  // ── 로그인: 탭 UI ──
  return (
    <div className="flex flex-col gap-3">
      {/* 탭 선택 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('saved')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'saved'
              ? `${a.bg} text-white shadow-md`
              : 'bg-white text-ink-600 border border-line'
          }`}>
          <FolderOpen className="w-3.5 h-3.5" />
          저장된 PDF {savedPdfs.length > 0 && `(${savedPdfs.length})`}
        </button>
        <button type="button" onClick={() => setTab('upload')}
          className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'upload'
              ? `${a.bg} text-white shadow-md`
              : 'bg-white text-ink-600 border border-line'
          }`}>
          <Upload className="w-3.5 h-3.5" />
          새로 업로드
        </button>
      </div>

      {/* ─── 저장된 PDF 탭 ─── */}
      {tab === 'saved' && (
        <CalcInputCard>
          {loadingList ? (
            <div className="flex items-center justify-center py-6 gap-2 text-[#8b95a1]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">불러오는 중…</span>
            </div>
          ) : savedPdfs.length === 0 ? (
            <div className="text-center py-6">
              <FolderOpen className="w-8 h-8 text-[#c8cdd2] mx-auto mb-2" />
              <p className="text-[13px] text-[#8b95a1]">저장된 PDF가 없어요</p>
              <p className="text-[12px] text-[#c8cdd2] mt-1">새로 업로드하면 저장할 수 있어요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {savedPdfs.map(pdf => (
                <button key={pdf.id} type="button"
                  onClick={() => handleSelectSaved(pdf)}
                  disabled={loadingDownload === pdf.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    loadingDownload === pdf.id
                      ? `${a.light} ${a.border} border`
                      : `bg-white border border-line hover:bg-[#F7F9FC] active:scale-[0.98]`
                  }`}>
                  <FileText className={`w-5 h-5 shrink-0 ${a.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#191f28] truncate">
                      {pdf.file_name}
                    </p>
                    <p className="text-[11px] text-[#8b95a1]">
                      {formatFileSize(pdf.file_size)} · {new Date(pdf.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  {loadingDownload === pdf.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#8b95a1] shrink-0" />
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.light} ${a.text}`}>
                      선택
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CalcInputCard>
      )}

      {/* ─── 새로 업로드 탭 ─── */}
      {tab === 'upload' && (
        <div>
          <div
            className={`dropzone ${currentFile ? 'active' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            {currentFile ? (
              <>
                <div className="text-3xl mb-2">✅</div>
                <p className={`font-bold ${a.text}`}>{currentFile.name}</p>
                <p className="text-[12px] text-[#8b95a1] mt-1">다른 파일로 교체하려면 클릭하세요</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">📤</div>
                <p className="font-bold text-[#191f28]">여기를 클릭해서 PDF 업로드</p>
                <p className="text-[12px] text-[#8b95a1] mt-1">PDF 파일만 가능해요</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleNewFile}
            />
          </div>
        </div>
      )}

      {/* ─── 다운로드 실패 에러 메시지 ─── */}
      {downloadError && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-danger/[0.08] border border-danger/20">
          <span className="text-danger text-[13px] leading-snug whitespace-pre-line">{downloadError}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="shrink-0 text-danger/50 hover:text-danger ml-auto"
            aria-label="에러 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── PDF 저장 팝업 (바텀시트) — portal로 body 렌더(BottomNav 위 표시) ─── */}
      {createPortal(
      <AnimatePresence>
        {showSavePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
            onClick={() => !savingPdf && setShowSavePopup(false)}
          >
            <motion.div
              initial={{ y: 200, opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0.6 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-[460px] bg-white rounded-t-xl sm:rounded-xl p-6 pb-8 shadow-float"
              onClick={e => e.stopPropagation()}
            >
              {/* 핸들 바 */}
              <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5 sm:hidden" />

              {saveResult ? (
                // 결과 표시
                <div className="text-center py-2">
                  <div className={`w-12 h-12 rounded-full ${saveResult.ok ? 'bg-accent-bg' : 'bg-danger/10'} flex items-center justify-center mx-auto mb-3`}>
                    {saveResult.ok
                      ? <Check className="w-6 h-6 text-[#047857]" />
                      : <X className="w-6 h-6 text-danger" />
                    }
                  </div>
                  <p className="text-[15px] font-bold text-ink-900">{saveResult.msg}</p>
                </div>
              ) : (
                // 저장 확인
                <>
                  <div className="text-center mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${a.light} flex items-center justify-center mx-auto mb-3`}>
                      <FileText className={`w-6 h-6 ${a.text}`} />
                    </div>
                    <p className="text-[17px] font-extrabold text-[#191f28]">이 PDF를 저장해둘까요?</p>
                    <p className="text-[13px] text-[#8b95a1] mt-1.5">
                      저장하면 다음에 다른 계산기에서도 바로 사용할 수 있어요
                    </p>
                    {pendingFile && (
                      <p className="text-[12px] text-[#c8cdd2] mt-1">
                        {pendingFile.name} ({formatFileSize(pendingFile.size)})
                      </p>
                    )}
                    {savedPdfs.length >= MAX_PDFS && (
                      <p className="text-[12px] text-danger mt-2 font-semibold">
                        저장 공간이 꽉 찼어요 ({MAX_PDFS}개). 마이페이지에서 기존 PDF를 삭제해 주세요.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button type="button"
                      onClick={() => setShowSavePopup(false)}
                      className="flex-1 min-h-[48px] rounded-lg text-[14px] font-semibold text-ink-600 bg-[#F2F4F6] hover:bg-line transition-all active:scale-[0.98]">
                      괜찮아요
                    </button>
                    <button type="button"
                      onClick={handleSave}
                      disabled={savingPdf || savedPdfs.length >= MAX_PDFS}
                      className={`flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                        savedPdfs.length >= MAX_PDFS
                          ? 'bg-gray-300 cursor-not-allowed'
                          : `${a.bg} shadow-lg hover:opacity-90`
                      }`}>
                      {savingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {savingPdf ? '저장 중…' : '저장할게요'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  )
}
