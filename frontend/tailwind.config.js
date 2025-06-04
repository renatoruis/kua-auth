/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'east-bay': {
          50: '#f2f5fc',
          100: '#e2e9f7',
          200: '#ccd8f1',
          300: '#aac0e6',
          400: '#819fd9',
          500: '#6382ce',
          600: '#4f68c1',
          700: '#4557b0',
          800: '#3d4890',
          900: '#3a457e',
          950: '#242947',
        }
      },
      // Default Tailwind border-radius scale (sm, md, lg, xl, 2xl, 3xl, full) is generally good.
      // We can add specific ones if needed, but let's rely on defaults first.
    },
  },
  plugins: [],
} 