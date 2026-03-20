interface Props {
  lines?: number
  className?: string
}

export default function SkeletonCard({ lines = 3, className = '' }: Props) {
  return (
    <div className={`rounded-[32px] p-6 bg-white/50 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-gradient-to-r from-gray-200/50 via-gray-100/50 to-gray-200/50 bg-[length:200%_100%] animate-shimmer mb-3 last:mb-0"
          style={{ width: i === lines - 1 ? '60%' : i === 0 ? '80%' : '100%' }}
        />
      ))}
    </div>
  )
}
