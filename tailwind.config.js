/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F2A44',
        glacier: '#2B6CB0',
        teal: {
          DEFAULT: '#0E9AA7',
          // Darker teal for text on white (passes WCAG AA for normal text).
          dark: '#0B7285',
        },
        // Merged with Tailwind's default sky palette.
        sky: { accent: '#38BDF8' },
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
      backgroundImage: {
        // Teal-to-sky-blue accent used for underlines, buttons and highlights.
        accent: 'linear-gradient(90deg, #0E9AA7 0%, #38BDF8 100%)',
      },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
    },
  },
  plugins: [],
}
