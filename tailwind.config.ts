import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx,html}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        archive: {
          50: '#f0f1f2',
          100: '#e2e4e6',
          200: '#c4c8cc',
          300: '#a7adb3',
          400: '#899199',
          500: '#6c7680',
          600: '#4e5a66',
          700: '#313f4d',
          800: '#1e2a35',
          850: '#17222c',
          900: '#111b24',
          950: '#0b131a',
        },
        accent: {
          teal: '#2dd4bf',
          gold: '#d4a853',
          red: '#e05a5a',
        },
      },
      fontFamily: {
        sans: [
          '"Microsoft YaHei"',
          '"PingFang SC"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        archive: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
