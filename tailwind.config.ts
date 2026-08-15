import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        // Cold ink scale: readable blue-gray text and surfaces for the private game journal shell.
        archive: {
          50: '#f4f9fb',
          100: '#deebf0',
          200: '#c6d7df',
          300: '#a8bec8',
          400: '#8fa8b4',
          500: '#718a96',
          600: '#58717e',
          700: '#3d535f',
          800: '#263844',
          850: '#1a2731',
          900: '#111d27',
          950: '#0a1119',
        },
        accent: {
          violet: '#92b2c4',
          teal: '#70b7af',
          gold: '#a9c9da',
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
        glow: '0 0 0 1px rgba(169, 201, 218, 0.16), 0 14px 30px rgba(10, 20, 28, 0.28)',
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
