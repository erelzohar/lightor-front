/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          light: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
          // Contrast-guaranteed variants for TEXT roles (LT-060): primary
          // nudged by useTheme until it clears 4.5:1 on its background.
          readable: 'rgb(var(--color-primary-readable) / <alpha-value>)',
          'dark-readable': 'rgb(var(--color-primary-dark-readable) / <alpha-value>)',
        },
        // Text sitting ON a primary fill (solid/gradient buttons).
        'on-primary': {
          DEFAULT: 'rgb(var(--color-on-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-on-primary-dark) / <alpha-value>)',
        },
        light: {
          bg: 'rgb(var(--color-light-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-light-surface) / <alpha-value>)',
          gray: 'rgb(var(--color-light-gray) / <alpha-value>)',
          text: 'rgb(var(--color-light-text) / <alpha-value>)',
        },
        dark: {
          bg: 'rgb(var(--color-dark-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-dark-surface) / <alpha-value>)',
          gray: 'rgb(var(--color-dark-gray) / <alpha-value>)',
          text: 'rgb(var(--color-dark-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Raleway', 'sans-serif'],
      },
      borderRadius: {
        'design': 'var(--radius)',
        'design-sm': 'calc(var(--radius) / 2)',
        'design-lg': 'calc(var(--radius) * 1.5)',
        // For rectangular media/cards: tracks --radius but never goes pill.
        'design-card': 'var(--radius-card)',
        // For a tall box beside the form's fields - a list of suggestions, a
        // dropdown's options, a note (LT-686): design-sm on every shape, but
        // never a pill. Half of 9999px is still a full oval, which cut the
        // first letters of a row and Google's logo.
        'design-box': 'min(calc(var(--radius) / 2), 1rem)',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
      },
    },
  },
  plugins: [],
};
