/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Junio 8 Café look (matches junio8 website): sharp, editorial corners.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '3px',
      md: '3px',
      lg: '4px',
      xl: '4px',
      '2xl': '6px',
      '3xl': '8px',
      full: '9999px',
    },
    extend: {
      colors: {
        // Fox orange (website --fox #e2611f / --fox-strong #b5441a).
        // 500 is darkened so white text on it passes WCAG AA.
        brand: {
          50: '#fdf4ec',
          100: '#fbe5d3',
          200: '#f5c6a2',
          300: '#ee9f6c',
          400: '#e2611f',
          500: '#c84f1b',
          600: '#b5441a',
          700: '#8f3514',
          800: '#6e3d12',
          900: '#55300f',
          950: '#2e1907',
        },
        // Warm neutrals: cream #f4efe8, stone #cbc8b8, ink-soft #4a4540, ink #141414.
        // Overrides Tailwind's cool slate so every existing slate-* class picks up the café palette.
        slate: {
          50: '#f4efe8',
          100: '#ece6dc',
          200: '#ddd6ca',
          300: '#cbc8b8',
          400: '#a39d92',
          500: '#7a736b',
          600: '#4a4540',
          700: '#36322e',
          800: '#262321',
          900: '#1c1a18',
          950: '#141414',
        },
        // Caramel (website --caramel #93571d / --caramel-light #d9a06a) in place of yellow amber.
        amber: {
          50: '#faf3ea',
          100: '#f3e3cd',
          200: '#e8c9a0',
          300: '#d9a06a',
          400: '#c9894e',
          500: '#b0723a',
          600: '#93571d',
          700: '#7a4718',
          800: '#6e3d12',
          900: '#4f2c0d',
          950: '#2c1807',
        },
        paper: '#faf8f4',
      },
      fontFamily: {
        sans: ['Jost', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Times New Roman"', 'serif'],
      },
      animation: {
        'bounce-subtle': 'bounceSubtle 2s infinite ease-in-out',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-3%)' },
          '50%': { transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
