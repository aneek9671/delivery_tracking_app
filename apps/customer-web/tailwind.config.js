/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#22c55e', 600: '#16a34a' },
        dark: { 300: '#a3a3a3', 400: '#737373', 700: '#404040', 800: '#262626', 900: '#171717' },
      },
    },
  },
  plugins: [],
}
