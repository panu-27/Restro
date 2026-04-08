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
          blue: {
            light: '#38BDF8', // Engineered
            deep: '#0EA5E9',  // Complexity
          },
          accent: '#7DD3FC'
        }
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
