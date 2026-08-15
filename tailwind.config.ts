import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        // Warm neutral scale: surfaces should read as paper, charcoal and lacquer—not blue UI chrome.
        archive: {
          50: '#f5f1e8',
          100: '#e8e0d2',
          200: '#d2c6b5',
          300: '#b3a590',
          400: '#8d806e',
          500: '#6d6254',
          600: '#514940',
          700: '#39342f',
          800: '#26231f',
          850: '#1b1917',
          900: '#141210',
          950: '#0b0a09',
        },
        accent: {
          violet: '#a4835d',
          teal: '#67ad9f',
          gold: '#c9a35a',
          red: '#cf7370',
        },
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', '"PingFang SC"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        archive: '10px',
        panel: '16px',
      },
      boxShadow: {
        panel: '0 18px 44px rgba(0, 0, 0, 0.28)',
        float: '0 16px 34px rgba(0, 0, 0, 0.38)',
        glow: '0 0 0 1px rgba(201, 163, 90, 0.16), 0 14px 30px rgba(45, 32, 16, 0.28)',
      },
      keyframes: {
        'soft-enter': {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ambient-pulse': {
          '0%, 100%': { opacity: '0.32' },
          '50%': { opacity: '0.52' },
        },
      },
      animation: {
        'soft-enter': 'soft-enter 240ms ease-out both',
        'ambient-pulse': 'ambient-pulse 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
