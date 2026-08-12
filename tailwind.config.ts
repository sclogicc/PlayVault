import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        archive: {
          50: '#f4f7fb',
          100: '#e8edf5',
          200: '#cdd6e3',
          300: '#aab7c7',
          400: '#8593a5',
          500: '#67758a',
          600: '#4b596d',
          700: '#303c4e',
          800: '#1d2735',
          850: '#151e2b',
          900: '#0d1621',
          950: '#080e16',
        },
        accent: {
          violet: '#8b5cf6',
          teal: '#35d5c5',
          gold: '#e5b55b',
          red: '#f06b78',
        },
      },
      fontFamily: {
        sans: [
          '"Microsoft YaHei"',
          '"PingFang SC"',
          'Inter',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        archive: '12px',
        panel: '20px',
      },
      boxShadow: {
        panel: '0 20px 50px rgba(0, 0, 0, 0.22)',
        float: '0 18px 36px rgba(2, 8, 23, 0.42)',
        glow: '0 0 0 1px rgba(139, 92, 246, 0.18), 0 16px 32px rgba(76, 29, 149, 0.22)',
      },
      keyframes: {
        'soft-enter': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ambient-pulse': {
          '0%, 100%': { opacity: '0.42' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'soft-enter': 'soft-enter 260ms ease-out both',
        'ambient-pulse': 'ambient-pulse 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
