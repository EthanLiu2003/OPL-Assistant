/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Ported from Lovable prototype palette; treat as provisional until design spec lands.
        opl: {
          bg: '#111118',
          surface: '#1e1e2a',
          border: '#1e1e2a',
          text: '#c8c8d0',
          textStrong: '#e8e8f0',
          muted: '#666680',
          accent: '#e05050',
          accentHover: '#c94040',
          info: '#60a5fa',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
