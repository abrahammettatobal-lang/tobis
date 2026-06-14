/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#121212',
        card: '#1E1E1E',
        accent: '#00E676',
        accentBlue: '#00B0FF',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      animation: {
        pulseLive: 'pulseLive 1.4s ease-in-out infinite',
        goalFlash: 'goalFlash 0.8s ease-out',
      },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        goalFlash: {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 230, 118, 0.7)' },
          '100%': { boxShadow: '0 0 0 16px rgba(0, 230, 118, 0)' },
        },
      },
    },
  },
  plugins: [],
};
