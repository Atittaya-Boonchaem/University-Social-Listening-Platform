/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        up: {
          dark: '#1e0936',
          sidebar: '#2d0c52',
          sidebarHover: '#3b126b',
          primary: '#5b1f9c',
          accent: '#8b38eb',
          light: '#f3e8ff',
          surface: '#f8fafc',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Prompt', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
