/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B2A3F',
        glacier: '#2B6CB0',
        teal: {
          DEFAULT: '#0E8C99',
          // Darker teal for text on white (passes WCAG AA for normal text).
          dark: '#0A6670',
        },
        // Merged with Tailwind's default sky palette.
        sky: { accent: '#38BDF8' },
        bg: '#F4F8FA',
        card: '#FFFFFF',
        ink: '#0B2A3F',
        status: {
          safe: '#157A3E',
          boil: '#9A4A06',
          nodrink: '#A61B1B',
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
