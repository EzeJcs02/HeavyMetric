/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hm: {
          bg:       'var(--hm-bg)',
          surface:  'var(--hm-surface)',
          surface2: 'var(--hm-surface2)',
          border:   'var(--hm-border)',
          accent:   'var(--hm-accent)',
          text:     'var(--hm-text)',
          muted:    'var(--hm-muted)',
          green:    'var(--hm-green)',
          blue:     'var(--hm-blue)',
          red:      'var(--hm-red)',
          /* module accents */
          taller:   '#3B82F6',
          alq:      '#D97706',
          ventas:   '#10B981',
          danger:   '#DC2626',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'blink':   'blink 2.5s ease-in-out infinite',
      },
    }
  },
  plugins: [],
}
