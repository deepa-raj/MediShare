/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16241F',
        teal: {
          50: '#EAF3F0',
          100: '#CFE4DC',
          200: '#9FC9B9',
          400: '#3D8C73',
          600: '#1F6F5C',
          700: '#175648',
          900: '#0F3B30',
        },
        sand: {
          50: '#FBFAF6',
          100: '#F4F2EA',
          200: '#E8E4D6',
        },
        amber: {
          400: '#E8A33D',
          500: '#D88E26',
        },
        coral: {
          400: '#D9684F',
          500: '#C24E36',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
