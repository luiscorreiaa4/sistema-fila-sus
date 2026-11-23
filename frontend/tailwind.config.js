/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        cobalt: {
          DEFAULT: '#1E6BFF',
          hover: '#1554D9',
          dark: '#0E4FD6',
          light: '#2575FF',
        },
        ice: {
          DEFAULT: '#EFF4FB',
          soft: '#F4F7FC',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '3xl': '1.5rem',
        '2.5xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(15, 23, 42, 0.08)',
        cobalt: '0 14px 32px -10px rgba(30, 107, 255, 0.35)',
        pill: '0 8px 24px -8px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
