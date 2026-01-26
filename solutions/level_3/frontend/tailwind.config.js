/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#0ff',
          red: '#ff003c',
          yellow: '#fcee0a',
          green: '#00ff41',
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'lock-pick': 'bounce 0.5s infinite',
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #0ff, 0 0 10px #0ff, 0 0 20px #0ff',
        'neon-red': '0 0 5px #f00, 0 0 10px #f00, 0 0 20px #f00',
      }
    },
  },
  plugins: [],
}
