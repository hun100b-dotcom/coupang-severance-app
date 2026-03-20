export default function AnimatedBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="liquid-blob blob-1" />
      <div className="liquid-blob blob-2" />
      <div className="liquid-blob blob-3" />
      <div className="liquid-blob blob-4" />
      <div className="liquid-blob blob-5" />
      {/* noise texture overlay for Apple-style grain */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />
      {/* top vignette for soft edge */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
      {/* bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
    </div>
  )
}
