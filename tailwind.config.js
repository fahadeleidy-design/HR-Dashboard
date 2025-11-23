/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee5e5',
          200: '#fed0cf',
          300: '#fcada9',
          400: '#f97a72',
          500: '#f15a4f',
          600: '#de3f33',
          700: '#bb2e23',
          800: '#9b2a21',
          900: '#802822',
        },
      },
    },
  },
  plugins: [],
}
