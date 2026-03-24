import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'
import type { Notice } from '../types/supabase'

interface Props {
  notices: Notice[]
}

export default function NoticesBanner({ notices }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    if (notices.length < 2) return
    const timer = setInterval(() => {
      setCurrentIdx(i => (i + 1) % notices.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [notices.length])

  if (notices.length === 0) return null

  const current = notices[currentIdx]

  return (
    <div className="mx-3 my-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      <Megaphone className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div className="flex-1 overflow-hidden min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current.id}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-700 truncate"
          >
            {current.content}
          </motion.p>
        </AnimatePresence>
      </div>
      {notices.length >= 2 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {notices.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                i === currentIdx ? 'bg-blue-500 w-3' : 'bg-blue-200'
              }`}
              aria-label={`공지 ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
