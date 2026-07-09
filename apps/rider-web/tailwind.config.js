/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#a855f7', 600: '#9333ea' },
        dark: { 300: '#a3a3a3', 400: '#737373', 700: '#404040', 800: '#262626', 900: '#171717' },
      },
    },
  },
  plugins: [],
}
