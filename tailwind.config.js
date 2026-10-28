/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tecni: {
          navy: '#0F2C59',
          dark: '#003366',
          primary: '#0B4F82',
          hover: '#083D66',
          light: '#DCEEF7',
          sky: '#4A90C9',
          bg: '#EEF4F9',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Outfit', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
