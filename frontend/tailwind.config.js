/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
      borderRadius: {
        card: '20px',
        btn:  '12px',
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
      },
    },
  },
  plugins: [],
}
