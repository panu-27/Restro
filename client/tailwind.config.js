/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        arche: {
          bg: '#FFFFFF',
          text: '#0F172A',
          gray: '#64748B',
          orange: {
            light: '#FF8C6B', // Primary Light
            deep: '#FF5A36',  // Primary Deep
          },
          accent: '#FFB89A'
        }
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        dmsans: ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
