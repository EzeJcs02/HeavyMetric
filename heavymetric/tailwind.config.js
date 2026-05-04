/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hm: {
          bg:       '#0c0e14',
          surface:  '#141720',
          surface2: '#1a1e2b',
          border:   '#252a38',
          accent:   '#f0a500',
          text:     '#dde1ec',
          muted:    '#5c6278',
          taller:   '#3b82f6',
          alq:      '#f0a500',
          ventas:   '#22c55e',
          danger:   '#ef4444',
        }
      },
      fontFamily: {
        sans:    ['Barlow', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
        display: ['Barlow', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:    '0 0 20px rgba(240,165,0,0.15)',
        'glow-sm': '0 0 10px rgba(240,165,0,0.1)',
        card:    '0 4px 24px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        pulse:     'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    }
  },
  plugins: [],
}
