/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F2A44',
        glacier: '#2B6CB0',
        teal: '#0E9AA7',
        bg: '#F7F9FB',
        card: '#FFFFFF',
        ink: '#1A202C',
        status: {
          safe: '#15803D',
          boil: '#B45309',
          nodrink: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Canadian Aboriginal"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 18px body minimum
        base: ['1.125rem', { lineHeight: '1.6' }],
        sm: ['1.125rem', { lineHeight: '1.5' }],
        lg: ['1.25rem', { lineHeight: '1.5' }],
      },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
    },
  },
  plugins: [],
}
