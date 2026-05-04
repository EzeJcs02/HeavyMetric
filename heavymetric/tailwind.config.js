/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hm: {
          bg: '#0f1117',
          surface: '#181c26',
          surface2: '#1e2330',
          border: '#2a2f3d',
          accent: '#e8a020',
          text: '#e2e4ec',
          muted: '#6b7280',
          taller: '#3b82f6',
          alq: '#e8a020',
          ventas: '#22c55e',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Barlow', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      }
    }
  },
  plugins: [],
}
