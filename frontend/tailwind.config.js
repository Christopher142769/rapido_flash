/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        numbers: ['var(--font-numbers)', 'cursive'],
      },
      keyframes: {
        'rf-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'rf-pulse-border': {
          '0%, 100%': { borderColor: 'rgba(212, 124, 47, 0.45)' },
          '50%': { borderColor: 'rgba(212, 124, 47, 0.08)' },
        },
      },
      animation: {
        'rf-shake': 'rf-shake 0.45s ease-out 1',
        'rf-pulse-border': 'rf-pulse-border 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
