interface Props {
  message?: string
}

export default function LoadingOverlay({ message = '데이터를 분석 중이에요' }: Props) {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-7 bg-white/70 backdrop-blur-xl animate-[fadeIn_0.3s_ease]">
      {/* 브랜디드 로더 */}
      <div className="relative w-20 h-20">
        {/* 외부 링 */}
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent"
          style={{
            borderTopColor: '#3182F6',
            borderRightColor: 'rgba(49,130,246,0.3)',
            animation: 'spinRing 1.1s linear infinite',
          }}
        />
        {/* 내부 링 (반대 방향) */}
        <div
          className="absolute inset-2 rounded-full border-[2px] border-transparent"
          style={{
            borderBottomColor: 'rgba(49,130,246,0.5)',
            borderLeftColor: 'rgba(49,130,246,0.15)',
            animation: 'spinRing 0.8s linear infinite reverse',
          }}
        />
        {/* 중앙 로고 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/catch-logo.png" alt="" className="w-8 h-8 object-contain" />
        </div>
        {/* 글로우 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 30px rgba(49,130,246,0.12)',
            animation: 'pulseDot 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* 텍스트 */}
      <div className="text-center">
        <p className="text-lg font-extrabold text-[#191F28] tracking-tight mb-2">
          {message}
        </p>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#3182F6]"
              style={{
                animation: 'pulseDot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
