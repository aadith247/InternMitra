/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        lavender: {
          50: '#f6f2ff',
          100: '#ede7fe',
          200: '#d9cffd',
          300: '#c0b0fb',
          400: '#a58af7',
          500: '#8b66f0',
          600: '#6f4bd4',
        },
        peach: {
          50: '#fff5ef',
          100: '#ffe9db',
          200: '#ffd4b8',
          300: '#ffb98a',
          400: '#ff9d61',
          500: '#ff8a45',
        },
        mint: {
          50: '#effdf6',
          100: '#d9faea',
          200: '#b5f4d6',
          300: '#84e9bb',
          400: '#51dca0',
          500: '#2ccf89',
        },
        cream: {
          50: '#fffaf0',
          100: '#fff3db',
        }
      }
    },
  },
  plugins: [],
}
