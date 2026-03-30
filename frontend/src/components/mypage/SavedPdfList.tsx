// 마이페이지 — 내 PDF 관리 섹션
// 저장된 PDF 목록 표시 + 삭제 기능
import { useState, useEffect } from 'react'
import { FileText, Trash2, Loader2, FolderOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { listSavedPdfs, deletePdf, formatFileSize, MAX_PDFS } from '../../lib/pdfStorage'
import type { SavedPdf } from '../../types/supabase'

export default function SavedPdfList() {
  const { user } = useAuth()
  const [pdfs, setPdfs] = useState<SavedPdf[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // 목록 로드
  useEffect(() => {
    if (!user) return
    setLoading(true)
    listSavedPdfs(user.id).then(list => {
      setPdfs(list)
      setLoading(false)
    })
  }, [user])

  // PDF 삭제
  const handleDelete = async (pdf: SavedPdf) => {
    if (!confirm(`"${pdf.file_name}"을 삭제할까요?`)) return
    setDeleting(pdf.id)
    const ok = await deletePdf(pdf)
    if (ok) {
      setPdfs(prev => prev.filter(p => p.id !== pdf.id))
    }
    setDeleting(null)
  }

  if (!user) return null

  return (
    <div className="w-full">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-[16px] font-extrabold text-[#191f28]">내 PDF 관리</h3>
        </div>
        <span className="text-[11px] text-[#8b95a1] font-semibold">
          {pdfs.length}/{MAX_PDFS}개
        </span>
      </div>

      {/* 내용 */}
      <div className="rounded-[20px] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-[#8b95a1]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">불러오는 중…</span>
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FolderOpen className="w-10 h-10 text-[#d1d5db] mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-[#8b95a1]">저장된 PDF가 없어요</p>
            <p className="text-[12px] text-[#c8cdd2] mt-1">
              계산기에서 PDF를 업로드하면 저장할 수 있어요
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/50">
            {pdfs.map(pdf => (
              <div key={pdf.id}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/50 transition-colors">
                {/* 아이콘 */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#191f28] truncate">
                    {pdf.file_name}
                  </p>
                  <p className="text-[11px] text-[#8b95a1]">
                    {formatFileSize(pdf.file_size)} · {new Date(pdf.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {/* 삭제 버튼 */}
                <button type="button"
                  onClick={() => handleDelete(pdf)}
                  disabled={deleting === pdf.id}
                  className="p-2 rounded-xl text-[#c8cdd2] hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 shrink-0">
                  {deleting === pdf.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
