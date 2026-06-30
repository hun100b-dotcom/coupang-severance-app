/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 작은 폰(≥400px)부터 탭 라벨 등 노출 — 320~399px는 아이콘만(aria-label로 접근성 보장)
      screens: {
        xs: '400px',
      },
      colors: {
        // ─────────────────────────────────────────────
        // 🎨 디자인 토큰 (2026 리디자인 — Phase 0)
        //   블루 메인 · 그린(채용 전용) 보조 · 회색 중립
        //   "무지개색 금지" 규칙에 따라 퍼플/인디고/앰버 등은 토큰에서 제외
        // ─────────────────────────────────────────────
        // 브랜드 블루 (메인 컬러)
        brand: {
          DEFAULT: '#3182F6', // 기본 토스 블루
          strong:  '#1B64DA', // 진한 블루 (hover/active, 텍스트 위 대비 강화)
          bg:      '#EAF2FE', // 아주 연한 블루 배경 (칩/배지/섹션 강조)
          50:      '#F4F8FF',
          100:     '#EAF2FE',
          200:     '#C7DDFC',
          500:     '#3182F6',
          600:     '#1B64DA',
          700:     '#1751B5',
        },
        // 채용 전용 그린 (보조 컬러 — 채용 섹션·CTA에만 사용)
        accent: {
          DEFAULT: '#06BE7B',
          strong:  '#05A56C',
          bg:      '#E6F8F1',
          600:     '#05A56C',
          700:     '#047857', // 흰 배경 텍스트·녹색 버튼 흰텍스트 AA 통과용 진한 녹색
        },
        // 중립 회색 (텍스트·보더·배경)
        ink: {
          900: '#191F28', // 본문 헤딩 (가장 진함)
          800: '#333D4B',
          700: '#4E5968', // 본문 보조 텍스트
          600: '#6B7684',
          500: '#8B95A1', // 캡션/플레이스홀더
          400: '#B0B8C1', // 비활성
        },
        line:  '#E5E8EB',  // 보더 기본
        page:  '#F7F9FC',  // 페이지 배경 (거의 흰색)
        // ─────────────────────────────────────────────
        // 🟦 업비트풍 토큰 (Phase 3 전역화 — Home.tsx 로컬 UP 객체 승격)
        //   값 출처: upbit.com/home 라이브 실측 (docs/design/upbit_home_analysis.md)
        //   ※ body/page/green은 업비트 원색이 아니라 CATCH 잉크·청회색 톤과 통일한 절충값(AA 충족).
        //   기존 brand/ink/line/page 토큰은 그대로 두고(하위호환), 업비트 위계는 up.* 로 별도 제공.
        //   사용 예: text-up-sub, bg-up-page, border-up-hair
        // ─────────────────────────────────────────────
        up: {
          page:    '#EEF1F5', // 페이지 배경(옅은 청회색)
          surface: '#FFFFFF', // 카드/면
          sunken:  '#F2F5FA', // 구획/표 헤더 배경
          navy:    '#1A2434', // 헤딩(남색 잉크)
          body:    '#333D4B', // 본문
          sub:     '#565D6A', // 보조 텍스트 (AA 6.7:1)
          caption: '#8E929B', // 캡션/날짜 (비필수만)
          hair:    '#E1E4EA', // 헤어라인 보더
          brand:   '#3182F6', // 포인트 블루
          strong:  '#1B64DA', // 주 CTA·금액 강조 (AA 5.4:1)
          green:   '#047857', // 채용(AA용 진한 그린)
          danger:  '#F04452', // 긴급 전용
        },
        // 의미색 (상태 표시)
        success: '#06BE7B',
        warning: '#F59E0B',
        danger:  '#F04452',
        // ─── 기존 toss.* (하위호환 — 절대 삭제 금지) ───
        toss: {
          blue:      '#3182f6',
          blueHover: '#2b73db',
          blueLight: '#e8f1ff',
          green:     '#00c48c',
          red:       '#f04452',
          text:      '#2c2926',
          textSec:   '#5c5752',
          textTer:   '#7a756e',
          bg:        '#f2f4f6',
          border:    '#e8e4de',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // ── 콘텐츠 컨테이너 폭 토큰 (Phase 3 업스케일: 1080→1280) ──
      //   max-w-content = 데스크톱 와이드 콘텐츠 폭(홈에서 검증된 1280)
      //   max-w-content-narrow = 폼/리포트 등 읽기 흐름용
      maxWidth: {
        content: '1280px',
        'content-narrow': '720px',
      },
      borderRadius: {
        // 8pt 그리드 기반 radius 스케일
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        pill: '9999px',
        // 기존 유지 (하위호환)
        card: '20px',
        btn:  '12px',
      },
      boxShadow: {
        // 은은한 카드 그림자 (섹션 카드)
        card:  '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)',
        // 플로팅 카드 — 깊이감 강조 (히어로 결과 카드 등)
        float: '0 8px 24px rgba(49,130,246,0.10), 0 20px 48px rgba(16,24,40,0.10)',
      },
      backdropBlur: {
        glass: '25px',
      },
      animation: {
        'gradient-slow': 'gradientShift 20s ease infinite',
        'mesh-flow':    'meshFlow 20s ease infinite',
        'bubble-1':     'bubble1 18s ease-in-out infinite',
        'bubble-2':     'bubble2 22s ease-in-out infinite',
        'bubble-3':     'bubble3 26s ease-in-out infinite',
        'bubble-4':     'bubble4 15s ease-in-out infinite',
        'slide-up':     'slideUpFade 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':      'fadeIn 0.4s ease forwards',
        'spin-ring':    'spinRing 1.2s linear infinite',
        'pulse-dot':    'pulseDot 1.4s ease-in-out infinite',
        'page-enter':   'pageEnter 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'shimmer':      'shimmer 2s ease-in-out infinite',
        'marquee':      'marquee-scroll 30s linear infinite',
        'marquee-ticker': 'marquee-ticker 8s linear infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        meshFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        bubble1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(60px, -80px) scale(1.1)' },
          '66%':      { transform: 'translate(-40px, 50px) scale(0.95)' },
        },
        bubble2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '40%':      { transform: 'translate(-70px, 60px) scale(1.05)' },
          '80%':      { transform: 'translate(50px, -40px) scale(0.9)' },
        },
        bubble3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(80px, 70px) scale(1.15)' },
        },
        bubble4: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '60%':      { transform: 'translate(-50px, -60px) scale(1.08)' },
        },
        slideUpFade: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        spinRing: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%':      { opacity: '1',   transform: 'scale(1)' },
        },
        pageEnter: {
          from: { opacity: '0', transform: 'translateX(24px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateX(0)   scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // 마키 배너: 오른쪽에서 왼쪽으로 흘러가는 애니메이션
        'marquee-scroll': {
          '0%':   { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        // seamless 뉴스티커 마키 (텍스트 2번 복사 후 -50% 이동)
        'marquee-ticker': {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
