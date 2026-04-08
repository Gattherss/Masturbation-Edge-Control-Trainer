/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stim: '#16a34a',
        rest: '#f97316',
        baseline: '#6366f1'
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'stripe': 'stripe 1s linear infinite',
      },
      keyframes: {
        stripe: {
          '0%': { backgroundPosition: '1rem 0' },
          '100%': { backgroundPosition: '0 0' },
        }
      }
    }
  },
  plugins: []
};
